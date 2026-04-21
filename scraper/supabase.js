import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function getConfig(key) {
  const { data, error } = await supabase
    .from('config')
    .select('value')
    .eq('key', key)
    .single()
  if (error) throw new Error(`Config '${key}' introuvable : ${error.message}`)
  return data.value
}

export async function getActiveSubreddits() {
  const { data, error } = await supabase
    .from('subreddits')
    .select('name')
    .eq('actif', true)
  if (error) throw new Error(`Erreur chargement subreddits : ${error.message}`)
  return data.map(r => r.name)
}

export async function saveLead(lead) {
  const { data, error } = await supabase
    .from('leads')
    .insert(lead)
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function markSlackAlerted(id) {
  await supabase.from('leads').update({ slack_alerted: true }).eq('id', id)
}
