const { SQS } = require('@aws-sdk/client-sqs')
const diagnosticsChannel = require('diagnostics_channel')

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

// Send 100 messages to sqs queue
function sendMessages() {
  const entries = Array(10).fill(0).map((_, index) => ({
    MessageBody: JSON.stringify({ foo: 'bar' }),
    Id: index,
  }))

  const promises = Array(10).fill(0).map(() => sqs.sendMessageBatch({
    QueueUrl: queueURL,
    Entries: entries
  }))

  return Promise.all(promises)
}

async function run() {
  await sendMessages()

  poller.start({
    eachMessage: async function (message) {
      return message
    },
  })

  let counter = 1

  diagnosticsChannel.channel('sqspoller:poller:eachMessage:start').subscribe(({ message }) => {
    console.log(`Message ${counter}, id ${message.MessageId} - start`);
    message.counter = counter
    counter++
  })

  diagnosticsChannel.channel('sqspoller:poller:eachMessage:end').subscribe(({ message }) => {
    console.log(`Message ${message.counter}, id ${message.MessageId} - end`);
  })

  diagnosticsChannel.channel('sqspoller:poller:eachMessage:error').subscribe(({ message, error }) => {
    console.log(`Message ${message.counter}, id ${message.MessageId} - error`, error);
  })
}

run()
