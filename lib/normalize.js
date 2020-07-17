const { normalizeDiacritics } = require('normalize-text')


module.exports = function normalize(str, sm) {
  if (sm.fuzzyDiacritics) return normalizeDiacritics(str)
  else return str
}
