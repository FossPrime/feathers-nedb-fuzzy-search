const feathers = require('feathers')
const hooks = require('feathers-hooks')
const NeDB = require('nedb')
const service = require('feathers-nedb')
const search = require('./')
const assert = require('assert')

const Model = new NeDB({
  filename: './test.db',
  autoload: true
})

const app = feathers()
app.configure(hooks())
app.use('/test', service({ Model }))
app.hooks({
  before: {
    find: search()
  }
})

async function test () {
  let service = app.service('test')
  let documents = await service.find()
  let start = Date.now()
  let res = await service.find({ query: { $search: 'pytagoras' } })
  let time = Date.now() - start
  assert.equal(res.length, 3, `Should find three documents with the text 'pytagoras' in them, found ${res.length}.`)

  assert(time < 100, 'Should find documents in 100 milliseconds, took ${time} ms.')

  console.log(`Found ${res.length} documents from ${documents.length} rows in ${time} milliseconds.`)
}

setTimeout(() => {
  test().catch(err => console.error(err))
}, 1000) // wait for database to load
