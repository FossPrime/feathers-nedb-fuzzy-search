[![npm version](https://badge.fury.io/js/feathers-nedb-fuzzy-search.svg)](https://badge.fury.io/js/feathers-nedb-fuzzy-search)

# feathers-nedb-fuzzy-search
Add fuzzy `$search` to NeDB `service.find` queries.

## Install
```
npm install feathers-nedb-fuzzy-search
```

## Usage
```js
const search = require('feathers-nedb-fuzzy-search')
const messages = app.service('messages')

// enable for message service, may use app.hooks too
messages.hooks({
  before: {
    find: search({['name', 'email']})
  }
})

let res = await service.find({ query: { name: { $search: 'ello' } } })
let res = await service.find({ query: $search: 'ello' } })
```
Besure to whitelist non-standard query parameters in your model.
That's `['$text', '$regex']` for MongoDB , and `['$where', '$regex']` for NeDB. 

### Options
`feathers-nedb-fuzzy-search` take two options in NeDB `$where` mode:

```js
search({
  fields: ['search.this.path', 'this.path.too', 'title'],
  deep: true
})
```

- `fields` - Specify which fields to search.
- `deep`- If true and `fields` is undefined, will search deep in objects.
- `fuzzyDiacritics`- If true, diacritics will be ignored.

In NeDB `$regex` mode it takes as service options the following:

- `excludeFields` - Specify which fields to exclude from search.
- `fields` - Specify which fields to search. Mutually exclusive. 

As query parameters it also takes `$caseSensitive`

### Complete example
```js
const feathers = require('feathers')
const hooks = require('feathers-hooks')
const NeDB = require('nedb')
const service = require('feathers-nedb')
const search = require('feathers-nedb-fuzzy-search')

const Model = new NeDB({
  filename: './example.db',
  autoload: true
})

const app = feathers()
app.configure(hooks())
app.use('/test', service({ Model }))
app.hooks({
  before: {
    find: search({
      // if omitted, then it will search all properties of documents
      fields: ['title', 'description']
    })
  }
})

// you need node v7 or above for async / await syntax
async function testDatabase () {
  let service = app.service('test')
  await service.create([
    { 'title': 'asdf' },
    { 'title': 'qwerty' },
    { 'title': 'zxcvb' },
    { 'title': 'hello world' },
    { 'title': 'world around' },
    { 'title': 'cats are awesome' },
  ])

  let res = await service.find({ query: { $search: 'world' } })
  let res = await service.find({ query: { title: { $search: 'ello' } } })

  console.log(res)
  // [ { title: 'world around', _id: '1RDM5BJWX4DWr1Jg' },
  //   { title: 'hello world', _id: 'dX4bpdM1IsAFkAZd' } ]
  //   { title: 'hello world', _id: 'dX4bpdM1IsAFkAZd' } ]
}

testDatabase()
  .catch(e => console.error(e))
```

## Plans for 2.0
- Support MongoDB and NeDB in this adapter
- Implement global search with $regex, instead of $where and $text which have widly different behavior
- Implement a $searchOpts parameter with {$native, $caseSensitive} etc
- Keep the same name, NeDB is the biggest raison d'etre
  - Though it's not a bad option to simplify MongoDB search queries

## Development
```
npm test  # runs mocha, see test.js
```

## License
MIT © 2019 Ray Foss
MIT © 2017 Arve Seljebu
