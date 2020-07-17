const regexFieldSearch = require('./regexFieldSearch')
const fullTextSearch = require('./fullTextSearch')

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
 * @param {array|object} opts Array of fields or options object
 */
module.exports = function search(opts = {}) {
  const sm = {
    escape: true
  }

  // If opts is an array, interpret it as an array of fields.
  // Otherwise, combine the options with `sm`.
  if (Array.isArray(opts)) {
    sm.fields = opts
  } else Object.assign(sm, opts)

  sm.fieldsNotEscaped = Array.isArray(sm.fieldsNotEscaped)
    ? sm.fieldsNotEscaped
    : []

  // Hook for field-based search:
  if (Array.isArray(sm.fields) && sm.fields.length) {
    sm.excludeFields = []  // one should not both include and exclude fields
  } else if (Array.isArray(sm.excludeFields) && sm.excludeFields.length) {
    sm.fields = []
  } else {
    return fullTextSearch(sm)
  }

  return regexFieldSearch(sm)
}
