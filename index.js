const { Schema: S }  = require('koishi')
const core = require('./src/core')

module.exports.name = 'duplicate-checker'

module.exports.schema = S.object({
  calloutSelf: S.boolean().default(false)
    .description('消息发送者自己发送了两次的情况下是否需要出警。'),
  maxCallout: S.number().default(10)
    .description('最大出警次数。能够用于减少对于表情包的误出警频率。'),
  cooldown: S.number().default(300)
    .description('对同一条火星消息出警的冷却时间，单位为秒。\n\n'
      + '第一次出警不受此配置项影响。\n\n'
      + '也能用于减少对表情包的出警频率，因为并不能分辨出表情包和火星图片。'),
  calloutText: S.boolean().default(true)
    .description('是否对文字消息进行出警。'),
  minTextLength: S.number().default(128)
    .description('被记录的文字信息的最小长度。只有长于此长度的文字信息才会被记录。'),
  minWidth: S.number().default(512)
    .description('被记录的图片信息的最小宽度，单位为像素（px）。\n\n'
      + '太小的图很可能是表情包。'),
  minHeight: S.number().default(512)
    .description('被记录的图片信息的最小高度，单位为像素（px）。\n\n'
      + '太小的图很可能是表情包。'),
  expireDuration: S.number().default(259200)
    .description('被记录的消息的储存时长，单位为秒。默认值为 3 天。'),
  cleanExpireInterval: S.number().default(3600)
    .description('清理过期消息的间隔，单位为秒。默认值为 1 小时。'),
})

/**
 * @param {import('koishi').Context} ctx
 * @param {import('./index').ConfigObject} config
 */
module.exports.apply = (ctx, config) => {
  config = {
    calloutSelf: false,
    maxCallout: 10,
    cooldown: 300,
    callloutText: false,
    minTextLength: 128,
    minWidth: 512,
    minHeight: 512,
    expireDuration: 259200,
    cleanExpireInterval: 3600,
    ...config,
  }

  ctx.plugin(core, config)
}