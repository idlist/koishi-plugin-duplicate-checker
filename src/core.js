const { readFile, writeFile } = require('fs').promises
const { resolve } = require('path')
const { h } = require('koishi')
const imageSize = require('image-size')
const phash = require('./phash')
const { distanceRatio, formatTimestamp } = require('./utils')

imageSize.disableFS(true)

/**
 * @type {import('../types').RecordType}
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
  const cooldown = config.cooldown * 1000
  const expireDuration = config.expireDuration * 1000
  const cleanExpireInterval = config.cleanExpireInterval * 1000

  const logger = ctx.logger('duplicate-checker')

  ctx.middleware(async (session, next) => {
    const fragments = h.parse(session.content)
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
       * @type {import('../types').RecordDetail[]}
       */
      let records

      let processed

      switch (fragment.type) {
        case 'text':
          if (!config.callloutText) continue
          if (fragment.attrs.content.length < config.minTextLength) continue

          type = 'text'
          records = channelRecord.text
          processed = fragment.attrs.content
          break
        case 'img':
          try {
            const imageBuffer = await ctx.http.get(fragment.attrs.url, {
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

        const sender = record.sender

        if (!shouldCallout) {
          shouldCallout = true
          const name = session.username
          const q = type == 'image' ? '图' : '消息'

          calloutHeader = `出警！${name} 又在发火星${q}了！`
        }

        calloutDetail.push(
          (type == 'image' ? `第 ${nthImage} 张图` : '这条消息') +
          `由 ${sender} (${record.id})` +
          `于 ${formatTimestamp(record.timestamp)} 发过，` +
          `已经被发过了 ${record.count} 次！`,
        )

        break
      }

      if (!duplicateFound) {
        records.push({
          content: processed,
          count: 0,
          id: session.userId,
          sender: session.username,
          timestamp: session.timestamp,
          expire: session.timestamp + expireDuration,
          cooldown: undefined,
        })
      }
    }

    if (shouldCallout) session.send(calloutHeader + calloutDetail.join('\n'))
    return next()
  })

  ctx.command('dplch', '查看出警器', { hidden: true })

  ctx.command('dplch.now', '查看出警器统计')
    .action(({ session }) => {
      const cid = session.cid

      if (!(cid in MessageRecords)) initMessageRecord(cid)
      const record = MessageRecords[cid]
      const recordNumber = record.image.length + record.text.length

      return '现在记录库中' +
        (recordNumber ? `有 ${recordNumber} 条记录` : '没有记录') +
        `，自 ${formatTimestamp(record.startSince)} 起` +
        (record.count ? `已经出警过了 ${record.count} 次` : '还没有出警过')
    })

  ctx.command('dplch.reset', '重制出警记录库', { authority: 4 })
    .action(async ({ session }) => {
      session.send('请在 5 秒内输入 y(es) 以确认重置当前记录。输入其他内容将被视为中断。')
      const confirm = await session.prompt(1000 * 5)

      if (['y', 'yes'].includes(confirm.toLowerCase())) {
        const cid = session.cid
        initMessageRecord(cid)
        return '出警器记录已重置。'
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