const { t } = require('koishi')
const core = require('./src/core')

t.set('duplicate-checker', {
  'text': '消息',
  'text-quantifier': '条',
  'image': '图',
  'image-quantifier': '张',

  'callout': '出警！{0} 又在发火星{1}了！\n',
  'callout-pronoun': '这',
  'callout-ordinal': '第 {0} ',
  'callout-detail': '{0}{1}{2}由 {3} 于 {4} 发过，已经被发过了 {5} 次！',

  'user-not-found': '[找不到该用户]',

  'desc': '查看出警器',

  'now': '查看出警器统计',
  'now-result': '现在记录库中{0}，自 {1} 起{2}。',
  'now-result-record': '有 {0} 条记录',
  'now-result-no-record': '没有记录',
  'now-result-callout': '已经出警过了 {0} 次',
  'now-result-no-callout': '还没有出警过',

  'reset': '重置当前记录',
  'reset-prompt': '请在 5 秒内输入 y(es) 以确认重置当前记录。输入其他内容将被视为中断。',
  'reset-success': '出警器记录已重置。'
})

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
    ...config
  }

  ctx.plugin(core, config)
}