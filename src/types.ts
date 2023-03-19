export interface RecordDetail {
  content: string,
  count: number,
  id: string,
  timestamp: number,
  expire: number,
  cooldown: number | undefined
}

export type RecordType = Record<string, {
  text: RecordType[]
  image: RecordType[]
  startSince: number
  count: number
}>