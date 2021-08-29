const { test } = require('tap')

const { Poller } = require('../../index')

test('Poller constructor sets required options properly and defaults optional fields', (t) => {
  const poller = new Poller({
    queueUrl: 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue',
    sqsClient: {}
  })

  const fields = Reflect.ownKeys(poller).slice(4);

  t.equal(poller[fields[0]], 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue')
  t.same(poller[fields[1]], {})
  t.equal(poller[fields[2]], 10)
  t.same(poller[fields[3]], ['All'])
  t.equal(poller[fields[4]], 0)
  t.equal(poller[fields[5]], 5000)
  t.equal(poller[fields[6]], 20)
  t.equal(poller[fields[7]], 10)
  t.equal(poller[fields[8]], false)
  t.equal(poller[fields[9]], null)
  t.equal(poller[fields[10]], 0)
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
    waitTimeSeconds: 1,
  })

  const fields = Reflect.ownKeys(poller).slice(4);

  t.equal(poller[fields[0]], 'https://sqs.us-east-2.amazonaws.com/0000000/test-queue')
  t.same(poller[fields[1]], {})
  t.equal(poller[fields[2]], 5)
  t.same(poller[fields[3]], ['Foo'])
  t.equal(poller[fields[4]], 10)
  t.equal(poller[fields[5]], 30000)
  t.equal(poller[fields[6]], 30)
  t.equal(poller[fields[7]], 1)
  t.equal(poller[fields[8]], false)
  t.equal(poller[fields[9]], null)
  t.equal(poller[fields[10]], 0)
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
      maxNumberOfMessages: {},
    })
  }, new Error('invalid maxNumberOfMessages'))

  t.end()
})
