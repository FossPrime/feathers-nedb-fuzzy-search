const transformSearchFieldsInQuery = require('./transformSearchFieldsInQuery')


module.exports = function regexFieldSearch (sm) {
  return function (hook) {
    transformSearchFieldsInQuery(hook.params.query, sm)
  }
}
