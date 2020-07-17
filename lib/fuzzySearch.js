const deepReduce = require('deep-reduce')
const escapeStrRx = require('escape-string-regexp')
const objectPath = require('object-path')
const normalize = require('./normalize')


/**
 * Returns a $where function for NeDB. The function search all
 * properties of objects and returns true if `str` is found in
 * one of the properties. Searching is not case sensitive.
 *
 * @param {string} str search for this string
 * @param sm {options} options
 * @return {function}
 */
module.exports = function fuzzySearch(str, sm) {
  const { fields, deep } = sm
  let r = new RegExp(escapeStrRx(normalize(str, sm)), 'i')

  if (Array.isArray(fields)) {
    return function () {
      return fields.reduce((match, field) => {
        if (match === true) {
          return true
        }
        let value = objectPath.get(this, field)
        return typeof value === 'string' && normalize(value, sm).match(r) !== null
      }, false)
    }
  }

  if (deep) {
    return function () {
      return deepReduce( this, ( match, value ) =>
        match || (
          typeof value === 'string' && normalize( value, sm ).match( r ) !== null
        ), false )
    }
  }

  return function () {
    for (let key in this) {
      // do not search _id and similar fields
      if (!this.hasOwnProperty(key) || key[0] === '_') {
        continue
      }
      if (typeof this[key] === 'string' && normalize(this[key], sm).match(r)) {
        return true
      }
    }
    return false
  }

}
