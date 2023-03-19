import { Context } from 'koishi'

export interface ConfigObject {
  /**
   * 消息发送者自己发送了两次的情况下是否需要出警。
   *
   * @default false
   */
  calloutSelf?: boolean
  /**
   * 最大出警次数。能够用于减少对于表情包的误出警频率。
   *
   * @default 10
   */
  maxCallout?: number
  /**
   * 对同一条火星消息出警的冷却时间，单位为秒。
   *
   * 第一次出警不受此配置项影响。
   *
   * 也能用于减少对表情包的出警频率，因为并不能分辨出表情包和火星图片。
   *
   * @default 300
   */
  cooldown?: number
  /**
   * 是否对文字消息进行出警。
   *
   * @default true
   */
  callloutText?: boolean
  /**
   * 被记录的文字信息的最小长度。只有长于此长度的文字信息才会被记录。
   *
   * @default 128
   */
  minTextLength?: number
  /**
   * 被记录的图片信息的最小宽度，单位为像素（px）。
   *
   * 太小的图很可能是表情包。
   *
   * @default 512
   */
  minWidth?: number
  /**
   * 被记录的图片信息的最小高度，单位为像素（px）。
   *
   * 太小的图很可能是表情包。
   *
   * @default 512
   */
  minHeight?: number
  /**
   * 被记录的消息的储存时长，单位为秒。默认值为 3 天。
   *
   * @default 259200
   */
  expireDuration?: number
  /**
   * 清理过期消息的间隔，单位为秒。默认值为 1 小时。
   *
   * @default 3600
   */
  cleanExpireInterval?: number
}

export declare const apply: (ctx: Context, config: ConfigObject) => void