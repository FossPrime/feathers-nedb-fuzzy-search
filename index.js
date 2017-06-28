const escape = require('escape-string-regexp')
const deepReduce = require('deep-reduce')

/**
 * Add $search to `service.find` query. If `options.fields`
 * is omitted, it will search all properties of documents.
 *
 * Usage:
 * ```
 * const fuzzySearch = require('feathers-nedb-fuzzy-search')
 *
 * app.service('something').hooks({
 *   before: {
 *     find: [ fuzzySearch({
 *       fields: ['title', 'description']  // search these properties in the document
 *     }) ]
 *   }
 * })
 *
 * app.service('something').find({
 *  query: {
 *    $search: 'text string to search for'
 *  }
 * })
 * ```
 *
 * @param {object} options
 */
module.exports = function (options = {}) {
  return function (hook) {
    if (hook.method === 'find' && hook.params.query && hook.params.query.$search) {
      hook.params.query.$where = fuzzySearch(hook.params.query.$search, options.fields)
      delete hook.params.query.$search
    }
    return hook
  }
}

/**
 * Returns a $where function for NeDB. The function search all
 * properties of objects and returns true if `str` is found in
 * one of the properties. Searching is not case sensitive.
 *
 * @param {string} str search for this string
 * @return {function}
 */
function fuzzySearch (str, fields) {
  let r = new RegExp(escape(str), 'i')

  return function () {
    let result = deepReduce(this, (hit, value, path) =>
      hit || (
        (fields === undefined || fields.include(path)) &&
        typeof value === 'string' &&
        value.match(r) !== null
      ), false)
    return result
  }
}
