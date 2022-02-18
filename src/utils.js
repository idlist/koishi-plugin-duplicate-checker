const { distance: levenshtein } = require('fastest-levenshtein')

/**
 * @param {string} a String a
 * @param {string} b String b
 * @returns {number}
 */
const distanceRatio = (a, b) => {
  return levenshtein(a, b) / Math.max(a.length, b.length)
}

/**
 * @param {import('../index').DurationObject} durationObject
 * @returns {number}
 */
const convertDurationObject = (durationObject) => {
  let duration = 0

  for (const unit in durationObject) {
    switch (unit) {
      case 'ms':
      case 'millisecond':
      case 'milliseconds':
        duration += durationObject[unit]
        break
      case 'second':
      case 'seconds':
        duration += durationObject[unit] * 1000
        break
      case 'minute':
      case 'minutes':
        duration += durationObject[unit] * 60 * 1000
        break
      case 'hour':
      case 'hours':
        duration += durationObject[unit] * 60 * 60 * 1000
        break
      case 'day':
      case 'days':
        duration += durationObject[unit] * 24 * 60 * 60 * 1000
        break
      default:
        continue
    }
  }

  return duration
}

/**
 * @param {number} number
 * @param {number} digits
 * @returns {string}
 */
const padZero = (number, digits) => number.toString().padStart(digits, '0')

/**
 * @param {number} timestamp
 * @returns {string}
 */
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp)

  const year = padZero(date.getFullYear(), 4)
  const month = padZero(date.getMonth() + 1, 2)
  const day = padZero(date.getDate(), 2)
  const hours = padZero(date.getHours(), 2)
  const minutes = padZero(date.getMinutes(), 2)
  const seconds = padZero(date.getSeconds(), 2)

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

module.exports.distanceRatio = distanceRatio
module.exports.convertDurationObject = convertDurationObject
module.exports.formatTimestamp = formatTimestamp