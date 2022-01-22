const sinon = require('sinon')
const { test } = require('tap')

const { Poller } = require('../../../index')
const { kPoll } = require('../../../lib/symbols')

test('should call poll method and set fields properly after starting poller', (t) => {
  const poller = new Poller({
    queueUrl: 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue',
    sqsClient: {}
  })

  const pollStub = sinon.stub(Poller.prototype, kPoll)

  const eachMessage = sinon.stub()
  const beforePoll = sinon.stub()

  poller.start({
    eachMessage: eachMessage,
    beforePoll: beforePoll
  })

  const fields = Reflect.ownKeys(poller).slice(4)

  t.equal(poller[fields[8]], true)
  t.equal(poller[fields[9]], eachMessage)
  t.equal(poller[fields[10]], beforePoll)
  t.equal(pollStub.callCount, 1)

  t.end()
})

test('should throw if eachMessage and eachBatch are not passed', (t) => {
  const poller = new Poller({
    queueUrl: 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue',
    sqsClient: {}
  })

  t.throws(function () {
    poller.start()
  }, new Error('eachMessage or eachBatch is required'))

  const fields = Reflect.ownKeys(poller).slice(4)

  t.equal(poller[fields[8]], false)
  t.equal(poller[fields[9]], null)

  t.end()
})

test('should throw if eachMessage is not a function', (t) => {
  const poller = new Poller({
    queueUrl: 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue',
    sqsClient: {}
  })

  t.throws(function () {
    poller.start({
      eachMessage: {}
    })
  }, new Error('eachMessage must be a function'))

  const fields = Reflect.ownKeys(poller).slice(4)

  t.equal(poller[fields[8]], false)
  t.equal(poller[fields[9]], null)

  t.end()
})

test('should throw if beforePoll is not a function', (t) => {
  const poller = new Poller({
    queueUrl: 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue',
    sqsClient: {}
  })

  t.throws(function () {
    poller.start({
      eachMessage: () => { },
      beforePoll: {}
    })
  }, new Error('beforePoll must be a function'))

  const fields = Reflect.ownKeys(poller).slice(4)

  t.equal(poller[fields[8]], false)
  t.equal(poller[fields[9]], null)

  t.end()
})

test('should throw if eachBatch is not a function', (t) => {
  const poller = new Poller({
    queueUrl: 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue',
    sqsClient: {}
  })

  t.throws(function () {
    poller.start({
      eachBatch: {}
    })
  }, new Error('eachBatch must be a function'))

  const fields = Reflect.ownKeys(poller).slice(4)

  t.equal(poller[fields[8]], false)
  t.equal(poller[fields[9]], null)

  t.end()
})
