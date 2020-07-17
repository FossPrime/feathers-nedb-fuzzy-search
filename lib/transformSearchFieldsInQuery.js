const escapeStrRx = require('escape-string-regexp')
const utils = require('feathers-commons')
const errors = require('feathers-errors')
const fuzzySearch = require('./fuzzySearch')


module.exports = function transformSearchFieldsInQuery (query, options, fieldName) {
  utils.each(query, (value, key) => {
    if (key === '$text') { // MongoDB only, passthrough
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
        options.excludeFields.includes(key)) {
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
