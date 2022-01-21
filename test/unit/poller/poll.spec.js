const sinon = require('sinon')
const { once } = require('events')
const { test } = require('tap')

const { Poller } = require('../../../index')
const { kEachMessage, kIsRunning, kPoll } = require('../../../lib/symbols')

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
