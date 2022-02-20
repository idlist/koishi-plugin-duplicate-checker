const { readFile, writeFile } = require('fs').promises
const { resolve } = require('path')
const { s, t } = require('koishi')
const imageSize = require('image-size')
const phash = require('./phash')
const { distanceRatio, convertDurationObject, formatTimestamp } = require('./utils')

imageSize.disableFS(true)

/**
 * @type {import('../index').RecordType}
 */
let MessageRecords = {}

/**
 * @param {string} cid
 */
const initMessageRecord = cid => {
  MessageRecords[cid] = {
    text: [],
    image: [],
    count: 0,
    startSince: Date.now(),
  }
}

/**
 * @param {import('koishi').Context} ctx
 * @param {import('../index').ConfigObject} config
 */
module.exports = (ctx, config) => {
  const expireDuration = convertDurationObject(config.expireDuration)
  const cleanExpireInterval = convertDurationObject(config.cleanExpireInterval)
  const cooldown = convertDurationObject(config.cooldown)

  const logger = ctx.logger('duplicate-checker')

  ctx.middleware(async (session, next) => {
    const fragments = s.parse(session.content)
    const cid = session.cid
    if (!(cid in MessageRecords)) initMessageRecord(cid)
    const channelRecord = MessageRecords[cid]

    let shouldCallout = false, calloutHeader = ''
    const calloutDetail = []
    let nthImage = 0

    for (const fragment of fragments) {
      /**
       * @type {'text' | 'image'}
       */
      let type

      /**
       * @type {import('../index').RecordDetail[]}
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
            const imageBuffer = await ctx.http.get(fragment.data.url, {
              responseType: 'arraybuffer',
            })
            const { width, height, type: imageType } = await imageSize(imageBuffer)
            if (width < config.minWidth && height < config.minHeight) continue
            if (!['jpg', 'png', 'bmp', 'webp', 'tiff'].includes(imageType)) continue

            type = 'image'
            records = channelRecord.image
            processed = await phash(imageBuffer, 16)
            nthImage++
          } catch (error) {
            logger.warn('Something wrong happened during the request of the image')
            logger.warn(error)
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

        record.cooldown = session.timestamp + cooldown - 1
        channelRecord.count++

        const sender = await session.bot.getGuildMember(session.guildId, record.id)
        const senderName = sender
          ? (sender.nickname || sender.username)
          : t('duplicate-checker.user-not-found')

        if (!shouldCallout && duplicateFound) {
          shouldCallout = true
          const name = session.author.nickname || session.author.username

          // 出警！{0} 又在发火星{1}了！
          calloutHeader = t('duplicate-checker.callout',
            name,
            t(`duplicate-checker.${type}`),
          )
        }

        calloutDetail.push(
          // {0}{1}{2}由 {3} 于 {4} 发过，已经被发过了 {5} 次！
          t('duplicate-checker.callout-detail',
            type == 'image'
              ? t('duplicate-checker.callout-ordinal', nthImage)
              : t('duplicate-checker.callout-pronoun'),
            t(`duplicate-checker.${type}-quantifier`),
            t(`duplicate-checker.${type}`),
            `${senderName} (${record.id})`,
            formatTimestamp(record.timestamp),
            record.count,
          ),
        )

        break
      }

      if (!duplicateFound) {
        records.push({
          content: processed,
          count: 0,
          id: session.userId,
          timestamp: session.timestamp,
          expire: session.timestamp + expireDuration,
          cooldown: undefined,
        })
      }
    }

    if (shouldCallout) session.send(calloutHeader + calloutDetail.join('\n'))
    return next()
  })

  ctx.command('dplch', t('duplicate-checker.desc'), { hidden: true })

  ctx.command('dplch.now', t('duplicate-checker.now'))
    .action(({ session }) => {
      const cid = session.cid

      if (!(cid in MessageRecords)) initMessageRecord(cid)
      const record = MessageRecords[cid]
      const recordNumber = record.image.length + record.text.length

      return t('duplicate-checker.now-result',
        recordNumber
          ? t('duplicate-checker.now-result-record', recordNumber)
          : t('duplicate-checker.now-result-no-record'),
        formatTimestamp(record.startSince),
        record.count
          ? t('duplicate-checker.now-result-callout', record.count)
          : t('duplicate-checker.now-result-no-callout'),
      )
    })

  ctx.command('dplch.reset', t('duplicate-checker.reset'), { authority: 4 })
    .action(async ({ session }) => {
      session.send(t('duplicate-checker.reset-prompt'))
      const confirm = await session.prompt(1000 * 5)

      if (['y', 'yes'].includes(confirm.toLowerCase())) {
        const cid = session.cid
        initMessageRecord(cid)
        return t('duplicate-checker.reset-result')
      }
    })

  const cleanExpire = () => {
    for (const channel in MessageRecords) {
      const channelRecord = MessageRecords[channel]
      for (const type of ['text', 'image']) {
        channelRecord[type] = channelRecord[type].filter(record => {
          return record.expire > Date.now()
        })
      }
    }
  }

  let cleanExpireTimer

  ctx.on('ready', async () => {
    try {
      MessageRecords = JSON.parse(await readFile(resolve(__dirname, '../cache.json'), 'utf8'))
    } catch {
      logger.debug('No cache file found or the file is broken, use empty data.')
      MessageRecords = {}
    }
    cleanExpire()
    cleanExpireTimer = setInterval(cleanExpire, cleanExpireInterval)
  })

  ctx.on('dispose', async () => {
    clearInterval(cleanExpireTimer)
  })

  ctx.on('exit', async () => {
    await writeFile(resolve(__dirname, '../cache.json'), JSON.stringify(MessageRecords))
    logger.debug('Current in-memory data is written to \'cache.json\'.')
  })
}