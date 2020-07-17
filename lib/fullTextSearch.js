const fuzzySearch = require('./fuzzySearch')


// Passthrough to NeDB driver
module.exports = function fullTextSearch (sm) {
  return function (hook) {
    if (hook.id || !hook.params.query || !hook.params.query.$search) {
      return hook
    }
    const query = hook.params.query

    if (hook.method === 'find') {
      query.$where = fuzzySearch(query.$search, sm)
    }
    delete query.$search

    // Not Supported by NeDB, but supported by mongo
    if (query.$language) {
      delete query.$language
    }
    if (query.$caseSensitive) {
      delete query.$caseSensitive
    }
    if (query.$diacriticSensitive) {
      delete query.$diacriticSensitive
    }

    return hook
  }
}
