const feathers = require('feathers')
const hooks = require('feathers-hooks')
const NeDB = require('nedb')
const NeDBservice = require('feathers-nedb')
const search = require('./lib')
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
  app.use('/test', NeDBservice({
    Model,
    id: 'kode',
    multi: true,
    whitelist: [ '$where' ]
  }))
  app.hooks({
    before: {
      find: currentHook
    }
  })

  service = app.service('test')

  await service.create([
    {
      kode: 'test',
      ref: 42,
      some: { nested: { path: 'with string to search for' } }
    }, {
      kode: 'test2',
      ref: 1337,
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
    service.options.Model.persistence.persistCachedDatabase(done)
  })
})

it ('should find three documents with the text `pytagoras` in them.', async function () {
  res = await service.find({ query: { $search: 'pytagoras' } })
  assert.equal(res.length, 3)
})

it ('should find 96 documents with the text `påvirker` in them.', async function () {
  res = await service.find({ query: { $search: 'påvirker' } })
  assert.equal(res.length, 96)
})

it ('should find `påvirker` with the text `pavirker`.', async function () {
  _currentHook = search({
    fuzzyDiacritics: true
  })
  res = await service.find({ query: { $search: 'pavirke' } })
  assert.equal(res.length, 181)
})

it ('should find 1 document with the text `13` in it.', async function () {
  _currentHook = search({
    fields: ['ref']
  })
  res = await service.find({ query: { $search: '13' } })
  assert.equal(res.length, 1)
});

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

it ('should allow fields to be passed as array instead of options object.', async function () {
  _currentHook = search(['some.nested.path'])
  res = await service.find({ query: { $search: 'with string to search for' } })
  assert.equal(res.length, 1)
})

it('should perform well', async function () {
  _currentHook = search()
  let times = 50
  let maxTime = 1000
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
