# sqs-poller

A complete SQS poller implementation to make message processing easier, written on top of [Amazon SDK V3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/index.html).

## Installation
```sh
npm i --save sqs-poller
```

## Usage

```javascript
const { SQS } = require('@aws-sdk/client-sqs')
const { Poller } = require('sqs-poller')

const sqs = new SQS({
  endpoint: 'your sqs endpoint',
  region: 'your sqs region',
})

const poller = new Poller({
  queueUrl: 'your sqs endpoint + queue name',
  sqsClient: sqs,
})

poller.start({
  eachMessage: async (message) => {
    await doSomethingWithMessage(message)
  },
  // or
  eachBatch: async function (messages) {
    await doSomethingWithBatch(messages)
  }
})

poller.on('error', console.error)
```

## API Reference
- [new Poller ([options])](#new-poller-options)
- [poller.start (options)](#pollerstart-options)
- [poller.stop () : Promise<any>](#pollerstop---promiseany)

## new Poller ([options])

- options `<object>`
  - `queueUrl` `<string>` The complete URL for the queue, consisting of your AWS SQS endpoint + queue name. *Required*.
  -  `sqsClient` `<sqsClient>` Instance of the sqsClient class provided by [AWS SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/classes/sqsclient.html). *Required*.
  - `messageAttributeNames` `<string | QueueAttributeName >` The names of the message attributes. *Optional*.
  - `maxNumberOfMessages` `<number>` The maximum number of messages to return. *Optional*. __Default__: `10`
  - `visibilityTimeout` `<number>` The duration (in seconds) that the received messages are hidden from subsequent retrieve requests after being retrieved by a ReceiveMessage request. *Optional*. __Default__: `20`
  - `waitTimeSeconds` `<number>` The duration (in seconds) for which the call waits for a message to arrive in the queue before returning. *Optional*. __Default__: `10`
  - `pollingTimeout` `<number>` The interval (in miliseconds) between a finished poll call and the next one. *Optional*. __Default__: `1`
  - `shutdownTimeout` `<number>` The duration (in miliseconds) for which the poller should wait for in flight messages before stopping it *Optional*. __Default__: `5000`


Create a new Poller class instance.

## poller.start (options)

- `options` `<object>`
  - `eachMessage` `<Function>` `(message) => Promise<any>` The handler to process one message at a time. Either `eachMessage` or `eachBatch` must be passed. If both are available, the `eachMessage` handler will be used. *Conditionally Required*
  - `eachBatch` `<Function>` `(message) => Promise<any>` The handler to process a message batch (up to ten messages) at a time. It is required if `eachMessage` is not passed. *Conditionally Required*
  - `beforePoll` `<Function>` `(message) => Promise<any>` The optional handler executed before performing a receiveMessage call. It can be used in scenarios where a business rule needs to be verified before polling new messages, such as rate limiting. *Optional*

Start message processing by passing a handler for each message.

## poller.stop () : Promise<any>

Stop message processing, waiting for in-fligth messages to be finished before resolving the promise. It can be used for proper graceful shutdown as following.
```javascript
process.once('SIGTERM', async (signal) => {
  await poller.stop()

  console.log('Poller has stopped')

  process.exit(0)
})
```
