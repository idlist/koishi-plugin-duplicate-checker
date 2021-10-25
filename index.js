const { s, t } = require('koishi')
const axios = require('axios')
const probe = require('probe-image-size')
const imghash = require('imghash')
const levenshtein = require('js-levenshtein')

t.set('duplicate-checker', {
  'text': '消息',
  'text-quantifier': '条',
  'image': '图',
  'image-quantifier': '张',
  'link': '图',
  'link-quantifier': '张',
  'callout': '出警！{0} 又在发火星{1}了！\n这{2}{1}由 {3} [{4}] 于 {5} 发过，已经被发过了 {6} 次！'
})

/**
 * @type {import('./index').RecordType}
 */
let MessageRecords = {}

/**
 * @param {import('koishi').Session} session
 * @returns {string}
 */
const getName = (session) => {
  const nickname = session.author.nickname
  const username = session.author.username

  return nickname ? nickname : username
}

/**
 * @param {string} a String a
 * @param {string} b String b
 * @returns {number}
 */
const distanceRatio = (a, b) => {
  return levenshtein(a, b) / Math.max(a.length, b.length)
}

/**
 * @param {import('./index').DurationObject} durationObject
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
 * @returnss {string}
 */
const paddingZero = (number, digits) => {
  return number.toString().padStart(digits, '0')
}

/**
 * @param {number} timestamp
 * @returns {string}
 */
const formatTimestamp = (timestamp) => {
  let date = new Date(timestamp)

  const year = paddingZero(date.getFullYear(), 4)
  const month = paddingZero(date.getMonth() + 1, 2)
  const day = paddingZero(date.getDate(), 2)
  const hours = paddingZero(date.getHours(), 2)
  const minutes = paddingZero(date.getMinutes(), 2)
  const seconds = paddingZero(date.getSeconds(), 2)

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

module.exports.name = 'duplicate-checker'

/**
 * @param {import('koishi').Context} ctx
 * @param {import('./index').ConfigObject} config
 */
module.exports.apply = (ctx, config) => {
  config = {
    calloutSelf: false,
    minTextLength: 128,
    minWidth: 512,
    minHeight: 512,
    expireDuration: { days: 3 },
    cleanExpireInterval: { minutes: 10 },
    cooldown: { minutes: 5 },
    ...config
  }

  const expireDuration = convertDurationObject(config.expireDuration)
  const cleanExpireInterval = convertDurationObject(config.cleanExpireInterval)
  const cooldown = convertDurationObject(config.cooldown)

  ctx.middleware(async (session, next) => {
    const fragments = s.parse(session.content)
    const channel = `${session.platform}:${session.channelId}`
    if (!(channel in MessageRecords)) {
      MessageRecords[channel] = {
        text: [],
        image: [],
        link: []
      }
    }
    const recordsCategory = MessageRecords[channel]

    for (const fragment of fragments) {
      /**
       * @type {'text' | 'image' | 'link'}
       */
      let type

      /**
       * @type {import('./index').RecordDetail[]}
       */
      let records

      let processed

      switch (fragment.type) {
        case 'text':
          if (fragment.data.content.length < config.minTextLength) continue

          type = 'text'
          records = recordsCategory.text
          processed = fragment.data.content
          break
        case 'image':
          try {
            const { data: imageBuffer } = await axios.get(fragment.data.url, {
              responseType: 'arraybuffer'
            })
            const info = probe.sync(imageBuffer)
            if (info.width < config.minWidth && info.height < config.minHeight) continue
            if (!['jpg', 'png', 'bmp', 'webp', 'tiff'].includes(info.type)) continue

            type = 'image'
            records = recordsCategory.image
            processed = await imghash.hash(imageBuffer, 32)
          } catch (err) {
            console.log(err)
            continue
          }
          break
        default:
          continue
      }

      let duplicateFound = false

      for (const record of records) {
        switch (type) {
          case 'text':
          case 'link':
            if (distanceRatio(record.content, processed) >= 0.1) continue
            break
          case 'image':
            if (distanceRatio(record.content, processed) >= 0.1) continue
            break
        }

        duplicateFound = true
        if (!config.calloutSelf && record.id == session.author.userId) continue

        record.count++
        record.expire = session.timestamp + expireDuration

        if (record.cooldown && record.cooldown >= session.timestamp) continue

        record.cooldown = session.timestamp + cooldown

        // 'callout': '出警！{0} 又在发火星{1}了！\n这{2}{1}由 {3} [{4}] 于 {5} 发过，已经被发过了 {6} 次！'
        session.send(t('duplicate-checker.callout',
          getName(session), t(`duplicate-checker.${type}`), t(`duplicate-checker.${type}-quantifier`),
          record.name, record.id, formatTimestamp(record.timestamp), record.count))
      }

      if (!duplicateFound) {
        records.push({
          content: processed,
          count: 0,
          id: session.userId,
          name: getName(session),
          timestamp: session.timestamp,
          expire: session.timestamp + expireDuration,
          cooldown: undefined
        })
      }
    }

    return next()
  })

  const cleanExpire = () => {
    for (const channel in MessageRecords) {
      const recordsCategory = MessageRecords[channel]
      for (const type in recordsCategory) {
        recordsCategory[type] = recordsCategory[type].filter(record => {
          return record.expire > Date.now()
        })
      }
    }
  }

  let cleanExpireTimer

  ctx.on('connect', () => {
    cleanExpireTimer = setInterval(cleanExpire, cleanExpireInterval)
  })

  ctx.on('disconnect', () => {
    clearInterval(cleanExpireTimer)
  })
}