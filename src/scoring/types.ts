export interface CatEntry {
  name: string
  breed: string
}

export interface Finals {
  count: number | string | null
  rank: (number | string | null)[]
}

export interface Ring {
  judge: string
  name: string
  absp: 'AB' | 'SP'
  congress: string | number
  classes: Record<string, number | string>
  finals: Record<string, Finals>
}

export interface Show {
  label: string
  nrings: number | string
  judges?: Record<string, string>
  rings: Ring[]
}

export interface ShowOptions {
  namewidth?: number
  colwidth?: number
  mixedcase?: number
  printscore?: number
}

export interface Catalog {
  filename?: string
  reporter: string
  email?: string
  club: string
  location: string
  date: string
  format?: string
  nshows?: string | number
  options: ShowOptions
  entries: Record<string, CatEntry>
  shows: Show[]
}
