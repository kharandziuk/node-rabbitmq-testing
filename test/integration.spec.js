const QUEUE_NAME = 'MainQueue'
const amqp = require('amqplib')
const { expect } = require('chai')


const initialize = async function(connection) {
  const channel = await connection.createChannel()
  await channel.assertQueue(QUEUE_NAME, {durable: true, autoDelete: false})
  return {
    sendToQueue: function(queue, content) {
      content = Buffer.from(content)
      return channel.sendToQueue(queue, content)
    },
    consumeN: (QUEUE_NAME, num=1) => {
      const messages = []
      let tag = null
      return new Promise((resolve) => {
        tag = channel.consume(QUEUE_NAME, function(msg) {
          messages.push(msg.content.toString())
          if (messages.length === num) {
            resolve(messages)
          }
        })
      })
      .then(() => tag)
      .then(({consumerTag}) => channel.cancel(consumerTag))
      .then(() => messages)
    },
    tearDown: async () => {
      await channel.close()
      await connection.close()
    }
  }
}

describe('server', () => {
  let utils
  before(async () => {
    const connection = await amqp.connect('amqp://localhost')
    utils = await initialize(connection)
  })
  after(async () => {
    await utils.tearDown()
  })
  it('send a massage and receive it in a test',async () => {
    utils.sendToQueue(QUEUE_NAME, 'first')
    utils.sendToQueue(QUEUE_NAME, 'second')

    const [msg1, msg2] = await utils.consumeN(QUEUE_NAME, 2)
    expect(msg1).eql('first')
    expect(msg2).eql('second')
  })
})
