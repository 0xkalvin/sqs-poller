const { EventEmitter } = require('events')

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

  async _receiveMessage() {
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

      throw error
    }
  }

  async _deleteMessage(receiptHandle) {
    try {
      const deleteCommand = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle
      })

      await this.sqsClient.send(deleteCommand)
    } catch (error) {
      this.logger.error({
        message: error.message,
        stack: error.stack
      })

      throw error
    }
  }

  async _processMessage(eachMessage, message) {
    try {
      await eachMessage(message)
    } catch (error) {
      this.logger.error({
        message: error.message,
        stack: error.stack
      })

      throw error
    }
  }

  async poll() {
    if (!this.isRunning) {
      return
    }

    try {
      const messages = await this._receiveMessage()

      this.numberOfInFligthMessages += messages.length

      const promises = messages.map(async (message) => {
        await this._processMessage(this.eachMessage, message)

        await this._deleteMessage(message.ReceiptHandle)

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
    } finally {
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
