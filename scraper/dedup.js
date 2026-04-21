import { createHash } from 'crypto'
import { supabase } from './supabase.js'

export function hashContent(content) {
  return createHash('sha256').update(content).digest('hex')
}

export async function isDuplicate(hash) {
  const { data } = await supabase
    .from('leads')
    .select('id')
    .eq('content_hash', hash)
    .maybeSingle()
  return data !== null
}
