const { AsyncLocalStorage } = require('async_hooks')
const { once } = require('events')

const sinon = require('sinon')
const { test } = require('tap')

const { Poller } = require('../../../index')
const {
  kEachBatch,
  kEachMessage,
  kIsRunning,
  kPoll
} = require('../../../lib/symbols')

test('should invoke receiveMessage 1 time, whereas eachMessage & deleteMessage 4 times', async (t) => {
  const sqsClient = {
    deleteMessage: sinon.stub().resolves(),
    receiveMessage: sinon.stub().resolves({
      Messages: [
        {
          Id: 1
        },
        {
          Id: 2
        },
        {
          Id: 3
        },
        {
          Id: 4
        }
      ]
    })
  }

  const poller = new Poller({
    queueUrl: 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue',
    pollingTimeout: 1,
    sqsClient: sqsClient
  })

  const eachMessageMock = sinon.stub().resolves()
  poller[kEachMessage] = eachMessageMock
  poller[kIsRunning] = true

  const clock = sinon.useFakeTimers()

  await poller[kPoll]()

  t.equal(sqsClient.receiveMessage.callCount, 1)
  t.equal(eachMessageMock.callCount, 4)
  t.equal(sqsClient.deleteMessage.callCount, 4)

  clock.restore()

  t.end()
})

test('should invoke receiveMessage, eachBatch and deleteMessage one time', async (t) => {
  const sqsClient = {
    deleteMessageBatch: sinon.stub().resolves(),
    receiveMessage: sinon.stub().resolves({
      Messages: [
        {
          Id: 1
        },
        {
          Id: 2
        },
        {
          Id: 3
        },
        {
          Id: 4
        }
      ]
    })
  }

  const poller = new Poller({
    queueUrl: 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue',
    pollingTimeout: 1,
    sqsClient: sqsClient
  })

  const eachBatchMock = sinon.stub().resolves()
  poller[kEachBatch] = eachBatchMock
  poller[kIsRunning] = true

  const clock = sinon.useFakeTimers()

  await poller[kPoll]()

  t.equal(sqsClient.receiveMessage.callCount, 1)
  t.equal(eachBatchMock.callCount, 1)
  t.equal(sqsClient.deleteMessageBatch.callCount, 1)

  clock.restore()

  t.end()
})

test('should emit error if receiveMessage rejects', async (t) => {
  const error = new Error('Receive failed')
  const sqsClient = {
    deleteMessage: sinon.stub().resolves(),
    receiveMessage: sinon.stub().rejects(error)
  }

  const poller = new Poller({
    queueUrl: 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue',
    pollingTimeout: 1,
    sqsClient: sqsClient
  })

  const eachMessageMock = sinon.stub().resolves()
  poller[kEachMessage] = eachMessageMock
  poller[kIsRunning] = true

  const clock = sinon.useFakeTimers()

  const promise = once(poller, 'error')

  await poller[kPoll]()

  const result = await promise

  t.equal(sqsClient.receiveMessage.callCount, 1)
  t.equal(eachMessageMock.callCount, 0)
  t.equal(sqsClient.deleteMessage.callCount, 0)
  t.equal(result[0], error)

  clock.restore()

  t.end()
})

test('should not break async context after poll call', (t) => {
  const sqsClient = {
    deleteMessage: sinon.stub().resolves(),
    receiveMessage: sinon.stub().resolves({
      Messages: [
        {
          Id: 1
        },
        {
          Id: 2
        }
      ]
    })
  }

  const storage = new AsyncLocalStorage()

  const poller = new Poller({
    queueUrl: 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue',
    pollingTimeout: 1,
    sqsClient: sqsClient
  })

  const eachMessageMock = sinon.stub().resolves()
  poller[kEachMessage] = eachMessageMock
  poller[kIsRunning] = true

  const clock = sinon.useFakeTimers()

  storage.run({}, () => {
    const store = storage.getStore()

    poller[kPoll]().then(() => {
      t.equal(storage.getStore(), store)
      t.equal(sqsClient.receiveMessage.callCount, 1)
      t.equal(eachMessageMock.callCount, 2)
      t.equal(sqsClient.deleteMessage.callCount, 2)

      clock.restore()

      t.end()
    })
  })
})
