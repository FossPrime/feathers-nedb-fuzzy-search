const feathers = require('feathers')
const hooks = require('feathers-hooks')
const NeDB = require('nedb')
const NeDBservice = require('feathers-nedb')
const search = require('./')
const assert = require('assert')

let app, service, res

let _currentHook = search()
function currentHook (hook) {
  return _currentHook(hook)
}

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
      find: currentHook
    }
  })

  service = app.service('test')

  await service.create([
    {
      kode: 'test',
      some: { nested: { path: 'with string to search for' } }
    }, {
      kode: 'test2',
      another: { nested: { path: 'with string to search for' } }
    }
  ])
})

after(function remove (done) {
  Promise.all([
    service.remove('test'),
    service.remove('test2')
  ])
  .then(() => {
    service.Model.persistence.persistCachedDatabase(done)
  })
})

it ('should find three documents with the text `pytagoras` in them.', async function () {
  res = await service.find({ query: { $search: 'pytagoras' } })
  assert.equal(res.length, 3)
})

it('should search documents deeply', async function () {
  _currentHook = search({
    deep: true
  })
  res = await service.find({ query: { $search: 'with string to search for' } })
  assert.equal(res.length, 2)
})

it('should allow specifying field names to search', async function () {
  _currentHook = search({
    fields: ['some.nested.path']
  })
  res = await service.find({ query: { $search: 'with string to search for' } })
  assert.equal(res.length, 1)
})

it('should not find anything when specifying non existent path', async function () {
  _currentHook = search({
    fields: ['non.existent.path']
  })
  res = await service.find({ query: { $search: 'with string to search for' } })
  assert.equal(res.length, 0)
})

it('should perform well', async function () {
  _currentHook = search()
  let times = 50
  let maxTime = 100
  this.timeout(maxTime * (times + 1))
  let totalTime = 0
  let start
  for (let i = 0; i < times; i++) {
    start = Date.now()
    res = await service.find({ query: { $search: 'pytagoras' } })
    totalTime += Date.now() - start
  }
  let avg = Math.round(totalTime / times)
  console.log(`pytagoras average search time: ${avg} ms`)
  assert(avg < maxTime)
})
