import { Context } from 'koishi'

export interface RecordDetail {
  content: string,
  count: number,
  id: string,
  name: string,
  timestamp: number,
  expire: number,
  cooldown: number | undefined
}

export type RecordType = Record<string, {
  text: RecordType[]
  image: RecordType[]
  link: RecordType[]
}>

export interface DurationObject {
  ms?: number
  millisecond?: number
  milliseconds?: number
  second: number
  seconds?: number
  minute?: number
  minutes?: number
  hour?: number
  hours?: number
  day?: number
  days?: number
}

export interface ConfigObject {
  /**
   * 消息发送者自己发送了两次的情况下是否需要出警。
   *
   * @default false
   */
  calloutSelf?: boolean
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
   * 消息记录的储存时长。
   *
   * @default { days: 3 }
   */
  expireDuration?: DurationObject
  /**
   * 清理过期消息的间隔。
   *
   * @default { minutes: 10 }
   */
  cleanExpireInterval?: DurationObject
  /**
   * 对同一条火星消息出警的冷却时间。第一次出警不受此配置项影响。
   *
   * 也能用于减少对表情包的出警频率，因为并不能分辨出表情包和火星图片。
   *
   * @default { minutes: 5 }
   */
  cooldown?: DurationObject
}

export declare const apply: (ctx: Context, config: ConfigObject) => void