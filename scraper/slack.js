import fetch from 'node-fetch'
import { getConfig } from './supabase.js'

export async function sendSlackAlert(lead) {
  let webhookUrl, threshold
  try {
    webhookUrl = await getConfig('slack_webhook_url')
    threshold  = parseInt(await getConfig('slack_score_threshold'), 10)
  } catch (err) {
    console.error('[slack] Impossible de lire la config :', err.message)
    return false
  }

  if (!webhookUrl || lead.score < threshold) return false

  const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000'
  const excerpt = (lead.content_excerpt || '').slice(0, 200)
  const emoji = lead.label === 'Chaud' ? '🔥' : lead.label === 'Tiède' ? '🌡️' : '🧊'

  const text = [
    `${emoji} *Nouveau lead ${lead.label}* — Score ${lead.score}/100`,
    `*Subreddit :* r/${lead.subreddit}`,
    `*Auteur :* u/${lead.author}`,
    `*Besoin :* ${lead.type_besoin || 'Non détecté'}`,
    '',
    `> ${excerpt}`,
    '',
    `🔗 <${lead.url}|Voir le post Reddit>  |  📋 <${dashboardUrl}/leads/${lead.id}|Fiche lead>`
  ].join('\n')

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    if (!res.ok) throw new Error(`Slack HTTP ${res.status}`)
    return true
  } catch (err) {
    console.error('[slack] Envoi échoué :', err.message)
    return false
  }
}
