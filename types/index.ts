export interface RecordDetail {
  content: string,
  count: number,
  id: string,
  sender: string,
  timestamp: number,
  expire: number,
  cooldown: number | undefined
}

interface RecordsByType {
  text: RecordDetail[]
  image: RecordDetail[]
  startSince: number
  count: number
}

export type RecordsByChannel = Record<string, RecordsByType>