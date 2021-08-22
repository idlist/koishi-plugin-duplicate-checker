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
   * Whether the bot should call out the original sender of the image.
   * @default false
   */
  calloutSelf?: boolean
  /**
   * Minimum length for a text message to be recorded.
   * @default 64
   */
  minTextLength?: number
  /**
   * Minimum width for an image to be recorded in px.
   * Too small pictures are considered as stickers.
   * @default 512
   */
  minWidth?: number
  /**
   * Minimum height for an image to be recorded.
   * Too small pictures are considered as stickers.
   * @default 512
   */
  minHeight?: number
  /**
   * Duration for a record to be cleaned from the record list.
   * @default { days: 3 }
   */
  expireDuration?: DurationObject
  /**
   * Interval of cleaning the expired records.
   * @default { minutes: 10 }
   */
  cleanExpireInterval?: DurationObject
  /**
   * Cooldown after the first callout so that a duplicated message could
   * not be called out repeatedly in a short period.
   * @default { minutes: 5 }
   */
  cooldown: DurationObject
}

export declare const apply: (ctx: Context, config: ConfigObject) => void