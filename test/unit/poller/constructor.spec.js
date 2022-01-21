const { test } = require('tap')

const { Poller } = require('../../../index')

test('Poller constructor sets required options properly and defaults optional fields', (t) => {
  const sqsClient = {}
  const poller = new Poller({
    queueUrl: 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue',
    sqsClient
  })

  const [
    kQueueUrl,
    kSQSClient,
    kMaxNumberOfMessages,
    kMessageAttributeNames,
    kPollingTimeout,
    kShutdownTimeout,
    kVisibilityTimeout,
    kWaitTimeSeconds,
    kIsRunning,
    kEachMessage,
    kBeforePoll,
    kNumberOfInFligthMessages,
    kLastMessagesCount
  ] = Reflect.ownKeys(poller).slice(4)

  t.equal(poller[kQueueUrl], 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue')
  t.same(poller[kSQSClient], sqsClient)
  t.equal(poller[kMaxNumberOfMessages], 10)
  t.same(poller[kMessageAttributeNames], ['All'])
  t.equal(poller[kPollingTimeout], 0)
  t.equal(poller[kShutdownTimeout], 5000)
  t.equal(poller[kVisibilityTimeout], 20)
  t.equal(poller[kWaitTimeSeconds], 10)
  t.equal(poller[kIsRunning], false)
  t.equal(poller[kEachMessage], null)
  t.equal(poller[kBeforePoll], null)
  t.equal(poller[kNumberOfInFligthMessages], 0)
  t.equal(poller[kLastMessagesCount], 0)
  t.end()
})

test('Poller constructor sets optional options properly', (t) => {
  const poller = new Poller({
    queueUrl: 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue',
    sqsClient: {},
    maxNumberOfMessages: 5,
    messageAttributeNames: ['Foo'],
    pollingTimeout: 10,
    shutdownTimeout: 30000,
    visibilityTimeout: 30,
    waitTimeSeconds: 1
  })

  const [
    kQueueUrl,
    kSQSClient,
    kMaxNumberOfMessages,
    kMessageAttributeNames,
    kPollingTimeout,
    kShutdownTimeout,
    kVisibilityTimeout,
    kWaitTimeSeconds,
    kIsRunning,
    kEachMessage,
    kBeforePoll,
    kNumberOfInFligthMessages,
    kLastMessagesCount
  ] = Reflect.ownKeys(poller).slice(4)

  t.equal(poller[kQueueUrl], 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue')
  t.same(poller[kSQSClient], {})
  t.equal(poller[kMaxNumberOfMessages], 5)
  t.same(poller[kMessageAttributeNames], ['Foo'])
  t.equal(poller[kPollingTimeout], 10)
  t.equal(poller[kShutdownTimeout], 30000)
  t.equal(poller[kVisibilityTimeout], 30)
  t.equal(poller[kWaitTimeSeconds], 1)
  t.equal(poller[kIsRunning], false)
  t.equal(poller[kEachMessage], null)
  t.equal(poller[kBeforePoll], null)
  t.equal(poller[kNumberOfInFligthMessages], 0)
  t.equal(poller[kLastMessagesCount], 0)
  t.end()
})

test('Poller constructor throws if missing the sqsClient field', (t) => {
  t.throws(function () {
    new Poller({
      queueUrl: 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue'
    })
  }, new Error('sqsClient is a required option'))

  t.end()
})

test('Poller constructor throws if maxNumberOfMessages is not an integer', (t) => {
  t.throws(function () {
    new Poller({
      queueUrl: 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue',
      sqsClient: {},
      maxNumberOfMessages: {}
    })
  }, new Error('invalid maxNumberOfMessages'))

  t.end()
})
