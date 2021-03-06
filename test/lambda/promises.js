'use strict'

const test = require('tape')
const lambdaLocal = require('lambda-local')

const lambda = require('../../lib/lambda')
const AgentMock = require('./mock/agent')
const util = require('./_util')
const assertError = util.assertError
const assertTransaction = util.assertTransaction

process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs8.10'
process.env.AWS_REGION = 'us-east-1'

test('resolve', function (t) {
  const name = 'greet.hello'
  const input = { name: 'world' }
  const output = 'Hello, world!'
  let context

  const agent = new AgentMock()
  const wrap = lambda(agent)

  lambdaLocal.execute({
    event: input,
    lambdaFunc: {
      [name]: wrap((payload, _context) => {
        context = _context
        return Promise.resolve(`Hello, ${payload.name}!`)
      })
    },
    lambdaHandler: name,
    timeoutMs: 3000,
    verboseLevel: 0,
    callback: function (err, result) {
      t.error(err)
      t.strictEqual(result, output)

      t.ok(agent.flushed)

      t.strictEqual(agent.errors.length, 0)

      t.strictEqual(agent.transactions.length, 1)
      assertTransaction(t, agent.transactions[0], name, context, input, output)

      t.end()
    }
  })
})

test('resolve with parent id header present', function (t) {
  const name = 'greet.hello'
  const input = {
    name: 'world',
    headers: {
      traceparent: 'test'
    }
  }
  const output = 'Hello, world!'
  let context

  const agent = new AgentMock()
  const wrap = lambda(agent)

  lambdaLocal.execute({
    event: input,
    lambdaFunc: {
      [name]: wrap((payload, _context) => {
        context = _context
        return Promise.resolve(`Hello, ${payload.name}!`)
      })
    },
    lambdaHandler: name,
    timeoutMs: 3000,
    verboseLevel: 0,
    callback: function (err, result) {
      t.error(err)
      t.strictEqual(result, output)

      t.ok(agent.flushed)

      t.strictEqual(agent.errors.length, 0)

      t.strictEqual(agent.transactions.length, 1)
      assertTransaction(t, agent.transactions[0], name, context, input, output)

      t.strictEqual(input.headers.traceparent, agent.transactions[0].opts.childOf, 'context trace id matches parent trace id')

      t.end()
    }
  })
})

test('reject', function (t) {
  const name = 'fn.fail'
  const input = {}
  const error = new Error('fail')
  let context

  const agent = new AgentMock()
  const wrap = lambda(agent)

  lambdaLocal.execute({
    event: input,
    lambdaFunc: {
      [name]: wrap((payload, _context) => {
        context = _context
        return Promise.reject(error)
      })
    },
    lambdaHandler: name,
    timeoutMs: 3000,
    verboseLevel: 0,
    callback: function (err, result) {
      t.ok(err)
      t.notOk(result)

      t.ok(agent.flushed)

      t.strictEqual(agent.errors.length, 1)
      assertError(t, agent.errors[0], error)

      t.strictEqual(agent.transactions.length, 1)
      assertTransaction(t, agent.transactions[0], name, context, input)

      t.end()
    }
  })
})
