const { EventEmitter } = require('events')
const {
  FORMAT_TEXT_MAP,
  globalTracer,
  Reference,
  REFERENCE_CHILD_OF,
  REFERENCE_FOLLOWS_FROM,
  Tags,
} = require('opentracing')

const {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient
} = require('@aws-sdk/client-sqs')

const makeLogger = require('./logger')

class Poller extends EventEmitter {
  constructor(options) {
    super()

    if (!(this instanceof Poller)) {
      return new Poller(options)
    }

    options = options || {}
    this._validateOptions(options)

    this.endpoint = options.endpoint
    this.queueUrl = options.queueUrl
    this.region = options.region
    this.sqsClient = options.sqsClient || new SQSClient({
      endpoint: this.endpoint,
      region: this.region,
    })

    this.messageAttributeNames = options.messageAttributeNames || ['All']
    this.maxNumberOfMessages = options.maxNumberOfMessages || 10
    this.visibilityTimeout = options.visibilityTimeout || 20
    this.waitTimeSeconds = options.waitTimeSeconds || 10

    this.pollingTimeout = options.pollingTimeout || 1
    this.shutdownTimeout = options.shutdownTimeout || 5000

    this.logger = options.logger || makeLogger(this.logLevel)
    this.logLevel = options.logLevel || 'nothing'

    this.tracer = options.tracer || globalTracer()
    this.traceHeaderName = '_trace' || options.traceHeaderName

    this.isRunning = false
    this.numberOfInFligthMessages = 0

    this.eachMessage = null
  }

  _validateOptions(options) {
    const requiredFields = [
      'endpoint',
      'region',
      'queueUrl'
    ]

    requiredFields.forEach((field) => {
      if (!options[field]) {
        throw new Error(`${field} is a required option`)
      }
    })

    if (options.sqsClient && !(options.sqsClient instanceof SQSClient)) {
      throw new Error('invalid sqsClient')
    }
  }

  _extractFollowsFromSpan(message) {
    if (message &&
      message.MessageAttributes &&
      message.MessageAttributes[this.traceHeaderName] &&
      message.MessageAttributes[this.traceHeaderName].StringValue
    ) {
      return this.tracer.extract(
        FORMAT_TEXT_MAP,
        message.MessageAttributes[this.traceHeaderName].StringValue
      )
    }

    return null
  }

  async _receiveMessage(context) {
    const { parentSpan } = context

    const receiveSpan = this.tracer.startSpan('sqs.receiveMessage', {
      childOf: parentSpan
    })

    try {
      const receiveMessagesCommand = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: this.maxNumberOfMessages,
        MessageAttributeNames: this.messageAttributeNames,
        VisibilityTimeout: this.visibilityTimeout,
        WaitTimeSeconds: this.waitTimeSeconds
      })

      const { Messages = [] } = await this.sqsClient.send(receiveMessagesCommand)

      return Messages
    } catch (error) {
      this.logger.error({
        message: error.message,
        stack: error.stack
      })

      receiveSpan.setTag(Tags.SAMPLING_PRIORITY, 1)
      receiveSpan.setTag(Tags.ERROR, true)

      receiveSpan.log({ event: 'error', message: error.message })

      throw error
    } finally {
      receiveSpan.finish()
    }
  }

  async _processMessage(context, eachMessage, message) {
    const { parentSpan } = context

    const followsFromSpan = this._extractFollowsFromSpan(message)
    const followsFromReference = followsFromSpan ? [
      new Reference(REFERENCE_FOLLOWS_FROM, followsFromSpan)
    ] : []

    const processSpan = this.tracer.startSpan('poller.processMessage', {
      references: [
        new Reference(REFERENCE_CHILD_OF, parentSpan),
        ...followsFromReference,
      ]
    })

    try {
      await eachMessage(message)
    } catch (error) {
      this.logger.error({
        message: error.message,
        stack: error.stack
      })

      processSpan.setTag(Tags.SAMPLING_PRIORITY, 1)
      processSpan.setTag(Tags.ERROR, true)

      processSpan.log({ event: 'error', message: error.message })

      throw error
    } finally {
      processSpan.finish()
    }

    const deleteSpan = this.tracer.startSpan('sqs.deleteMessage', {
      references: [
        new Reference(REFERENCE_CHILD_OF, parentSpan),
        ...followsFromReference,
      ]
    })

    try {
      const deleteCommand = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: message.ReceiptHandle
      })

      await this.sqsClient.send(deleteCommand)
    } catch (error) {
      this.logger.error({
        message: error.message,
        stack: error.stack
      })

      deleteSpan.setTag(Tags.SAMPLING_PRIORITY, 1)
      deleteSpan.setTag(Tags.ERROR, true)

      deleteSpan.log({ event: 'error', message: error.message })

      throw error
    } finally {
      deleteSpan.finish()
    }
  }

  async poll() {
    if (!this.isRunning) {
      return
    }

    const context = {}

    const pollSpan = this.tracer.startSpan('poller.poll')
    context.parentSpan = pollSpan

    try {
      const messages = await this._receiveMessage(context)

      this.numberOfInFligthMessages += messages.length

      const promises = messages.map(async (message) => {
        await this._processMessage(context, this.eachMessage, message)

        this.numberOfInFligthMessages -= 1
      })

      const promisesResult = await Promise.allSettled(promises)

      promisesResult.forEach((promise) => {
        if (promise.status === 'rejected') {
          this.emit('error', promise.reason)
        }
      })
    } catch (error) {
      this.emit('error', error)

      pollSpan.setTag(Tags.SAMPLING_PRIORITY, 1)
      pollSpan.setTag(Tags.ERROR, true)

      pollSpan.log({ event: 'error', message: error.message })
    } finally {
      pollSpan.finish()

      setTimeout(() => {
        this.poll()
      }, this.pollingTimeout)
    }
  }

  start(options) {
    this.isRunning = true
    this.eachMessage = options.eachMessage

    return this.poll()
  }

  stop() {
    this.isRunning = false

    return Promise.race([
      new Promise((resolve) => {
        setTimeout(() => {
          resolve()
        }, this.shutdownTimeout)
      }),
      new Promise((resolve) => {
        setInterval(() => {
          if (this.numberOfInFligthMessages === 0) {
            resolve()
          }
        }, 1000)
      })
    ])
  }

  getNumberOfInFligthMessages() {
    return this.numberOfInFligthMessages
  }

  resume() {
    this.isRunning = true

    return this.poll()
  }
}

module.exports = Poller
