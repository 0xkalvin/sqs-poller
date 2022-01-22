const { EventEmitter } = require('events')

const {
  kQueueUrl,
  kSQSClient,
  kMaxNumberOfMessages,
  kMessageAttributeNames,
  kPollingTimeout,
  kShutdownTimeout,
  kVisibilityTimeout,
  kWaitTimeSeconds,
  kEachMessage,
  kIsRunning,
  kNumberOfInFligthMessages,
  kDeleteMessage,
  kPoll,
  kReceiveMessage,
  kBeforePoll,
  kLastMessagesCount,
  kEachBatch,
  kDeleteBatch
} = require('./symbols')

class Poller extends EventEmitter {
  constructor (inputOptions) {
    super()

    const options = inputOptions || {}

    const {
      queueUrl,
      sqsClient,
      maxNumberOfMessages = null,
      messageAttributeNames = null,
      pollingTimeout = null,
      shutdownTimeout = null,
      visibilityTimeout = null,
      waitTimeSeconds = null
    } = options

    if (!queueUrl) {
      throw new Error('queueUrl is a required option')
    }

    if (!sqsClient) {
      throw new Error('sqsClient is a required option')
    }

    if (maxNumberOfMessages != null && !Number.isInteger(maxNumberOfMessages)) {
      throw new Error('invalid maxNumberOfMessages')
    }

    if (messageAttributeNames != null && !Array.isArray(messageAttributeNames)) {
      throw new Error('invalid messageAttributeNames')
    }

    if (pollingTimeout != null && !Number.isInteger(pollingTimeout)) {
      throw new Error('invalid pollingTimeout')
    }

    if (shutdownTimeout != null && !Number.isInteger(shutdownTimeout)) {
      throw new Error('invalid shutdownTimeout')
    }

    if (visibilityTimeout != null && !Number.isInteger(visibilityTimeout)) {
      throw new Error('invalid visibilityTimeout')
    }

    if (waitTimeSeconds != null && !Number.isInteger(waitTimeSeconds)) {
      throw new Error('invalid waitTimeSeconds')
    }

    this[kQueueUrl] = queueUrl
    this[kSQSClient] = sqsClient

    this[kMaxNumberOfMessages] = maxNumberOfMessages || 10
    this[kMessageAttributeNames] = messageAttributeNames || ['All']
    this[kPollingTimeout] = pollingTimeout || 0
    this[kShutdownTimeout] = shutdownTimeout || 5000
    this[kVisibilityTimeout] = visibilityTimeout || 20
    this[kWaitTimeSeconds] = waitTimeSeconds || 10

    this[kIsRunning] = false
    this[kEachMessage] = null
    this[kBeforePoll] = null
    this[kNumberOfInFligthMessages] = 0
    this[kLastMessagesCount] = 0
  }

  async [kReceiveMessage] () {
    const { Messages = [] } = await this[kSQSClient].receiveMessage({
      QueueUrl: this[kQueueUrl],
      MaxNumberOfMessages: this[kMaxNumberOfMessages],
      MessageAttributeNames: this[kMessageAttributeNames],
      VisibilityTimeout: this[kVisibilityTimeout],
      WaitTimeSeconds: this[kWaitTimeSeconds]
    })

    this[kLastMessagesCount] = Messages.length

    return Messages
  }

  async [kDeleteMessage] (receiptHandle) {
    await this[kSQSClient].deleteMessage({
      QueueUrl: this[kQueueUrl],
      ReceiptHandle: receiptHandle
    })
  }

  async [kDeleteBatch] (messages) {
    const entries = messages.map(({ MessageId, ReceiptHandle }) => ({
      Id: MessageId,
      ReceiptHandle
    }))

    await this[kSQSClient].deleteMessageBatch({
      QueueUrl: this[kQueueUrl],
      Entries: entries
    })
  }

  async [kPoll] () {
    if (!this[kIsRunning]) {
      return
    }

    if (this[kBeforePoll]) {
      try {
        await this[kBeforePoll]()
      } catch (error) {
        this.emit('error', error)

        return
      }
    }

    try {
      const messages = await this[kReceiveMessage]()

      this[kNumberOfInFligthMessages] += messages.length

      if (this[kEachMessage]) {
        const promises = messages.map(async (message) => {
          await this[kEachMessage](message)

          await this[kDeleteMessage](message.ReceiptHandle)

          this[kNumberOfInFligthMessages] -= 1
        })

        const promisesResult = await Promise.allSettled(promises)

        promisesResult.forEach((promise) => {
          if (promise.status === 'rejected') {
            this.emit('error', promise.reason)
          }
        })
      } else {
        await this[kEachBatch](messages)

        await this[kDeleteBatch](messages)

        this[kNumberOfInFligthMessages] -= messages.length
      }
    } catch (error) {
      this.emit('error', error)
    } finally {
      if (this[kPollingTimeout] === 0) {
        process.nextTick(() => {
          this[kPoll]()
        })
      } else {
        setTimeout(() => {
          this[kPoll]()
        }, this[kPollingTimeout])
      }
    }
  }

  start (inputOptions) {
    const options = inputOptions || {}

    const {
      beforePoll,
      eachBatch,
      eachMessage
    } = options

    if (!eachMessage && !eachBatch) {
      throw new Error('eachMessage or eachBatch is required')
    }

    if (eachMessage && typeof eachMessage !== 'function') {
      throw new Error('eachMessage must be a function')
    }

    if (eachBatch && typeof eachBatch !== 'function') {
      throw new Error('eachBatch must be a function')
    }

    if (beforePoll && typeof beforePoll !== 'function') {
      throw new Error('beforePoll must be a function')
    }

    this[kIsRunning] = true
    this[kEachBatch] = eachBatch
    this[kEachMessage] = eachMessage
    this[kBeforePoll] = beforePoll

    return this[kPoll]()
  }

  stop () {
    if (!this[kIsRunning]) {
      return null
    }

    this[kIsRunning] = false

    return Promise.race([
      new Promise((resolve) => {
        setTimeout(() => {
          resolve()
        }, this[kShutdownTimeout])
      }),
      new Promise((resolve) => {
        setInterval(() => {
          if (this[kNumberOfInFligthMessages] === 0) {
            resolve()
          }
        }, 1000)
      })
    ])
  }

  get numberOfInFligthMessages () {
    return this[kNumberOfInFligthMessages]
  }

  get isRunning () {
    return this[kIsRunning]
  }

  get lastMessagesCount () {
    return this[kLastMessagesCount]
  }

  resume () {
    this[kIsRunning] = true

    return this[kPoll]()
  }
}

module.exports = Poller
