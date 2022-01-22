const { SQS } = require('@aws-sdk/client-sqs')
const { Poller } = require('sqs-poller')

const sqsEndpoint = 'http://localhost:9324'
const sqsRegion = 'us-east-1'
const queueURL = `${sqsEndpoint}/queue/foo-queue`

const sqs = new SQS({
  endpoint: sqsEndpoint,
  region: sqsRegion,
})

const poller = new Poller({
  queueUrl: queueURL,
  sqsClient: sqs
})

// Send 10000 messages to sqs queue
function sendMessages() {
  const entries = Array(10).fill(0).map((_, index) => ({
    MessageBody: JSON.stringify({ foo: 'bar' }),
    Id: index,
  }))

  const promises = Array(1000).fill(0).map(() => sqs.sendMessageBatch({
    QueueUrl: queueURL,
    Entries: entries
  }))

  return Promise.all(promises)
}

async function run() {
  await sendMessages()

  let counter = 1

  poller.start({
    eachMessage: async function (message) {
      console.log(`Message ${counter} -> id ${message.MessageId}`);
      counter++
    },

    // or
    eachBatch: async function (messages) {
      messages.forEach((message) => {
        console.log(`Message ${counter} -> id ${message.MessageId}`);
        counter++
      })
    }
  })

  poller.on('error', (error) => {
    console.error("Error -> ", error);
  })
}

run()
