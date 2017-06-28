const escape = require('escape-string-regexp')
const objectPath = require('object-path')
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
      hook.params.query.$where = fuzzySearch(hook.params.query.$search, options)
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
function fuzzySearch(str, { fields, deep }) {
  let r = new RegExp(escape(str), 'i')

  if (Array.isArray(fields)) {
    return function () {
      return fields.reduce((match, field) => {
        if (match === true) {
          return true
        }
        let value = objectPath.get(this, field)
        return typeof value === 'string' && value.match(r) !== null
      }, false)
    }
  }

  if (deep) {
    return function () {
      let result = deepReduce(this, (match, value) =>
        match || (
          typeof value === 'string' && value.match(r) !== null
        ), false)
      return result
    }
  }

  return function () {
    for (let key in this) {
      // do not search _id and similar fields
      if (key[0] === '_' || !this.hasOwnProperty(key)) {
        continue
      }
      if (typeof this[key] === 'string' && this[key].match(r)) {
        return true
      }
    }
    return false
  }

}
