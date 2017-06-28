const feathers = require('feathers')
const hooks = require('feathers-hooks')
const NeDB = require('nedb')
const NeDBservice = require('feathers-nedb')
const search = require('./')
const assert = require('assert')

let service

before(async function () {
  const Model = new NeDB({
    filename: './test.db',
    autoload: true
  })

  app = feathers()
  app.configure(hooks())
  app.use('/test', NeDBservice({ Model, id: 'kode' }))
  app.hooks({
    before: {
      find: search()
    }
  })

  service = app.service('test')

  await service.create({
    kode: 'test',
    some: { nested: { path: 'with string to search for' } }
  })
})

after(function remove (done) {
  service.remove('test').then(() => {
    service.Model.persistence.persistCachedDatabase(done)
  })
})

it ('should find three documents with the text `pytagoras` in them.', async function () {
  this.timeout(100)
  let res = await service.find({ query: { $search: 'pytagoras' } })
  assert.equal(res.length, 3)
})

it('should search documents deeply', async function () {
  let res = await service.find({ query: { $search: 'with string to search for' } })
  assert.equal(res.length, 1)
})

it('should perform well', async function () {
  let times = 50
  let maxTime = 50
  this.timeout(maxTime * (times + 1))
  let totalTime = 0
  let res, start
  for (let i = 0; i < times; i++) {
    start = Date.now()
    res = await service.find({ query: { $search: 'pytagoras' } })
    totalTime += Date.now() - start
  }
  let avg = Math.round(totalTime / times)
  console.log(`pytagoras average search time: ${avg} ms`)
  assert(avg < maxTime)
})
