const escapeStrRx = require('escape-string-regexp')
const objectPath = require('object-path')
const deepReduce = require('deep-reduce')
const utils = require('feathers-commons')
const errors = require('feathers-errors')

function transformSearchFieldsInQuery (query, options, fieldName) {
  utils.each(query, (value, key) => {
    if (key === '$text') {
      return
    }
    // Process current attribute or  recurse
    if (value && typeof value === 'object') {
      // Searchable field ?
      if (!value.hasOwnProperty('$search')) {
        return transformSearchFieldsInQuery(value, options, key)
      }
      // Field should either be included, or not excluded
      if ((options.fields.length && !options.fields.includes(key)) ||
          options.excludedFields.includes(key)) {
          debugger
        throw new errors.BadRequest('You are not allowed to perform $search on field ' + key)
      }
      transformSearchFieldsInQuery(value, options, key)
    } else if (key === '$search') {
      // Default to case insensitive if not given
      // Sanitize when required
      if (!options.fieldsNotEscaped.includes(fieldName)) {
        value = escapeStrRx(value)
      }
      // Update query
      if (fieldName) {
        query['$regex'] = query.$caseSensitive ? new RegExp(value) : new RegExp(value, 'i')
      } else {
        query.$where = fuzzySearch(query.$search, options)
      }
      // Delete unused field
      delete query['$search']
      delete query['$caseSensitive']
    }
  })
}

function regexFieldSearch (sm) {
  return function (hook) {
    transformSearchFieldsInQuery(hook.params.query, sm)
  }
}

// Passthough to NeDB driver
function fullTextSearch (sm) {
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
function init (opts = {}) {
  const sm = {}
  Object.assign(sm, opts)
  // if escape is undefined -> escape = true
  sm.escape = sm.escape !== false
  sm.fieldsNotEscaped = Array.isArray(sm.fieldsNotEscaped) ? sm.fieldsNotEscaped : []
  // hook for field-based search:
  if (Array.isArray(sm.fields) && sm.fields.length) {
    sm.excludedFields = []  // one should not both include and exclude fields
  } else if (Array.isArray(sm.excludedFields) && sm.excludedFields.length) {
    sm.fields = []
  } else {
    return fullTextSearch(sm)
  }
  
  return regexFieldSearch(sm)
}

module.exports = init


/**
 * Returns a $where function for NeDB. The function search all
 * properties of objects and returns true if `str` is found in
 * one of the properties. Searching is not case sensitive.
 *
 * @param {string} str search for this string
 * @return {function}
 */
function fuzzySearch(str, { fields, deep }) {
  let r = new RegExp(escapeStrRx(str), 'i')

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
