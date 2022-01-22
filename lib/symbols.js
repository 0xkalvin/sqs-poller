const kQueueUrl = Symbol('kQueueUrl')
const kSQSClient = Symbol('kSQSClient')

const kMaxNumberOfMessages = Symbol('kMaxNumberOfMessages')
const kMessageAttributeNames = Symbol('kMessageAttributeNames')
const kPollingTimeout = Symbol('kPollingTimeout')
const kShutdownTimeout = Symbol('kShutdownTimeout')
const kVisibilityTimeout = Symbol('kVisibilityTimeout')
const kWaitTimeSeconds = Symbol('kWaitTimeSeconds')

const kBeforePoll = Symbol('kBeforePoll')
const kEachBatch = Symbol('kEachBatch')
const kEachMessage = Symbol('kEachMessage')
const kIsRunning = Symbol('kIsRunning')
const kLastMessagesCount = Symbol('kLastMessagesCount')
const kNumberOfInFligthMessages = Symbol('kNumberOfInFligthMessages')

const kDeleteMessage = Symbol('kDeleteMessage')
const kDeleteBatch = Symbol('kDeleteBatch')
const kPoll = Symbol('kPoll')
const kReceiveMessage = Symbol('kReceiveMessage')

module.exports = {
  kQueueUrl,
  kSQSClient,
  kMaxNumberOfMessages,
  kMessageAttributeNames,
  kPollingTimeout,
  kShutdownTimeout,
  kVisibilityTimeout,
  kWaitTimeSeconds,
  kBeforePoll,
  kLastMessagesCount,
  kEachMessage,
  kIsRunning,
  kNumberOfInFligthMessages,
  kDeleteMessage,
  kPoll,
  kReceiveMessage,
  kEachBatch,
  kDeleteBatch
}
