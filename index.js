const { s, t } = require('koishi')
const axios = require('axios').default
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
const paddingZero = (number, digits) => number.toString().padStart(digits, '0')

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

/**
 * @param {string} cid
 */
const initMessageRecord = cid => {
  MessageRecords[cid] = {
    text: [],
    image: [],
    link: [],
    count: 0,
    startSince: Date.now()
  }
}

module.exports.name = 'duplicate-checker'

/**
 * @param {import('koishi').Context} ctx
 * @param {import('./index').ConfigObject} config
 */
module.exports.apply = (ctx, config) => {
  config = {
    calloutSelf: false,
    maxCallout: 10,
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

  const logger = ctx.logger('duplicate-checker')

  ctx.middleware(async (session, next) => {
    const fragments = s.parse(session.content)
    const cid = `${session.platform}:${session.channelId}`
    if (!MessageRecords[cid]) initMessageRecord(cid)
    const channelRecord = MessageRecords[cid]

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
          records = channelRecord.text
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
            records = channelRecord.image
            processed = await imghash.hash(imageBuffer, 32)
          } catch (err) {
            logger.warn('Something wrong happened during the request of the image')
            logger.warn(err)
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

        if (record.count >= config.maxCallout) continue
        if (record.cooldown && record.cooldown >= session.timestamp) continue

        record.cooldown = session.timestamp + cooldown
        channelRecord.count++

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

  ctx.command('dplch', '查看出警器', { hidden: true })

  ctx.command('dplch.now', '查看出警器统计')
    .action(({ session }) => {
      const cid = `${session.platform}:${session.channelId}`
      if (!MessageRecords[cid]) initMessageRecord(cid)
      const record = MessageRecords[cid]
      const recordNumber = record.image.length + record.text.length
      return '现在记录库中' +
        (recordNumber ? `有 ${recordNumber} 条记录，` : '没有记录，') +
        `自 ${formatTimestamp(record.startSince)} 起` +
        (record.count ? `已经出警过了 ${record.count} 次。` : '还没有出警过。')
    })

  ctx.command('dplch.reset', '重置当前记录', { authority: 4 })
    .action(async ({ session }) => {
      session.send('请在 5 秒内输入 y(es) 以确认重置当前记录。输入其他内容将被视为中断。')
      const twoFactor = await session.prompt(1000 * 5)
      if (['y', 'yes'].includes(twoFactor.toLowerCase())) {
        const cid = `${session.platform}:${session.channelId}`
        initMessageRecord(cid)
        return '出警器记录已重置。'
      }
    })

  const cleanExpire = () => {
    for (const channel in MessageRecords) {
      const channelRecord = MessageRecords[channel]
      for (const type in channelRecord) {
        channelRecord[type] = channelRecord[type].filter(record => {
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