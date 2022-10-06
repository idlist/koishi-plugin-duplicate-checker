const core = require('./src/core')

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
    cleanExpireInterval: { hours: 1 },
    cooldown: { minutes: 5 },
    ...config,
  }

  ctx.plugin(core, config)
}