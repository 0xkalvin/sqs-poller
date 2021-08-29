const sinon = require('sinon')
const { test } = require('tap')

const { Poller } = require('../../index')
const { kPoll } = require('../../lib/symbols')

test('should call poll method and set fields properly after starting poller', (t) => {
  const poller = new Poller({
    queueUrl: 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue',
    sqsClient: {
      deleteMessage: sinon.stub().resolves(),
      receiveMessage: sinon.stub().resolves()
    }
  })

  const pollStub = sinon.stub(Poller.prototype, kPoll).callsFake(async () => {
    return {}
  })

  const eachMessage = sinon.stub()

  poller.start({
    eachMessage: eachMessage,
  })

  const fields = Reflect.ownKeys(poller).slice(4);

  t.equal(poller[fields[8]], true)
  t.equal(poller[fields[9]], eachMessage)
  t.equal(pollStub.callCount, 1)

  t.end()
})

test('should throw if eachMessage is not passed and not set fields', (t) => {
  const poller = new Poller({
    queueUrl: 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue',
    sqsClient: {
      deleteMessage: sinon.stub().resolves(),
      receiveMessage: sinon.stub().resolves()
    }
  })

  t.throws(function () {
    poller.start()
  }, new Error('eachMessage is a required option'))

  const fields = Reflect.ownKeys(poller).slice(4);

  t.equal(poller[fields[8]], false)
  t.equal(poller[fields[9]], null)

  t.end()
})
