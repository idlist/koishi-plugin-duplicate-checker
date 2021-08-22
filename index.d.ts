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
   * Minimum length for a text message to be recorded.
   */
  minTextLength?: number
  /**
   * Minimum width for an image to be recorded.
   */
  minWidth?: number
  /**
   * Minimum height for an image to be recorded.
   */
  minHeight?: number
  /**
   * Duration for a record to be cleaned from the record list.
   */
  expireDuration?: DurationObject
  /**
   * Interval of cleaning the expired records.
   */
  cleanExpireInterval?: DurationObject
  /**
   * Cooldown after the first callout so that a duplicated message could
   * not be called out repeatedly in a short period.
   */
  cooldown: DurationObject
}

export declare const apply: (ctx: Context, config: ConfigObject) => void