export type Label = 'Chaud' | 'Tiède' | 'Froid'
export type Statut = 'Détecté' | 'Contacté' | 'Répondu' | 'Converti'
export type Langue = 'fr' | 'en'

export interface Lead {
  id: string
  created_at: string
  author: string
  subreddit: string
  post_id: string
  comment_id: string | null
  content_hash: string
  url: string
  content_excerpt: string | null
  score: number
  label: Label
  explication: string | null
  type_besoin: string | null
  langue: Langue | null
  message_pre_redige: string | null
  statut: Statut
  rappel_at: string | null
  slack_alerted: boolean
}

export interface Subreddit {
  id: string
  name: string
  actif: boolean
  created_at: string
}

export interface Config {
  key: string
  value: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      leads:       { Row: Lead;       Insert: Partial<Lead>;       Update: Partial<Lead> }
      subreddits:  { Row: Subreddit;  Insert: Partial<Subreddit>;  Update: Partial<Subreddit> }
      config:      { Row: Config;     Insert: Partial<Config>;     Update: Partial<Config> }
    }
  }
}

export const LABEL_COLORS: Record<Label, string> = {
  'Chaud': 'bg-red-500 text-white',
  'Tiède': 'bg-orange-500 text-white',
  'Froid': 'bg-gray-500 text-white'
}

export const STATUTS: Statut[] = ['Détecté', 'Contacté', 'Répondu', 'Converti']
