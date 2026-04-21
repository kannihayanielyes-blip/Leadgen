import 'dotenv/config'
import { getActiveSubreddits, getConfig, saveLead, markSlackAlerted } from './supabase.js'
import { getNewPosts, getComments } from './reddit.js'
import { hashContent, isDuplicate } from './dedup.js'
import { enqueue, drain, size } from './queue.js'
import { analyzeContent } from './ai.js'
import { sendSlackAlert } from './slack.js'

async function buildQueueForSubreddit(subreddit) {
  console.log(`[scan] r/${subreddit} — récupération des posts...`)
  let posts
  try {
    posts = await getNewPosts(subreddit)
  } catch (err) {
    console.error(`[scan] Impossible de lire r/${subreddit} :`, err.message)
    return
  }

  for (const post of posts) {
    const postContent = `${post.title} ${post.selftext || ''}`.trim()
    const postHash    = hashContent(postContent)
    const postUrl     = `https://www.reddit.com${post.permalink}`

    if (!(await isDuplicate(postHash))) {
      enqueue({
        author:          post.author,
        subreddit,
        post_id:         post.id,
        comment_id:      null,
        content_hash:    postHash,
        url:             postUrl,
        raw_content:     postContent
      })
    }

    // Récupère les commentaires du post
    let comments = []
    try {
      comments = await getComments(subreddit, post.id)
    } catch (err) {
      console.error(`[scan] Commentaires r/${subreddit}/${post.id} :`, err.message)
    }

    for (const comment of comments) {
      if (!comment.body || comment.body === '[deleted]') continue
      const commentHash = hashContent(comment.body)
      if (!(await isDuplicate(commentHash))) {
        enqueue({
          author:       comment.author,
          subreddit,
          post_id:      post.id,
          comment_id:   comment.id,
          content_hash: commentHash,
          url:          `https://www.reddit.com${post.permalink}${comment.id}/`,
          raw_content:  comment.body
        })
      }
    }
  }
}

async function processItem(item) {
  console.log(`[ai] Analyse de u/${item.author} dans r/${item.subreddit}...`)

  const analysis = await analyzeContent(item.raw_content, item.author, item.subreddit)

  const lead = {
    author:            item.author,
    subreddit:         item.subreddit,
    post_id:           item.post_id,
    comment_id:        item.comment_id,
    content_hash:      item.content_hash,
    url:               item.url,
    content_excerpt:   item.raw_content.slice(0, 500),
    score:             analysis.score,
    label:             analysis.label,
    explication:       analysis.explication,
    type_besoin:       analysis.type_besoin,
    langue:            analysis.langue,
    message_pre_redige: analysis.message_pre_redige,
    statut:            'Détecté',
    slack_alerted:     false
  }

  let leadId
  try {
    leadId = await saveLead(lead)
    console.log(`[db] Lead sauvegardé : ${leadId} (score ${analysis.score} — ${analysis.label})`)
  } catch (err) {
    // La contrainte UNIQUE sur content_hash peut déclencher une erreur de race condition
    if (err.code === '23505') {
      console.log(`[db] Doublon détecté (race condition), skip.`)
      return
    }
    throw err
  }

  // Alerte Slack si le score est suffisant
  const alerted = await sendSlackAlert({ ...lead, id: leadId })
  if (alerted) {
    await markSlackAlerted(leadId)
    console.log(`[slack] Alerte envoyée pour lead ${leadId}`)
  }
}

async function runScan() {
  console.log(`\n[scan] Début du scan — ${new Date().toISOString()}`)

  let subreddits
  try {
    subreddits = await getActiveSubreddits()
  } catch (err) {
    console.error('[scan] Impossible de charger les subreddits :', err.message)
    return
  }

  if (subreddits.length === 0) {
    console.log('[scan] Aucun subreddit actif trouvé. Ajoutes-en depuis le dashboard.')
    return
  }

  console.log(`[scan] ${subreddits.length} sureddit(s) actif(s) : ${subreddits.join(', ')}`)

  for (const subreddit of subreddits) {
    await buildQueueForSubreddit(subreddit)
  }

  console.log(`[queue] ${size()} items à analyser`)
  await drain(processItem)
  console.log(`[scan] Scan terminé — ${new Date().toISOString()}`)
}

async function main() {
  console.log('🚀 Intent Tracker démarré')

  // Premier scan immédiat
  await runScan()

  // Puis boucle selon l'intervalle configuré
  async function scheduleNext() {
    let intervalMinutes = 60
    try {
      intervalMinutes = parseInt(await getConfig('scan_interval_minutes'), 10) || 60
    } catch (_) {}

    console.log(`[scheduler] Prochain scan dans ${intervalMinutes} minutes`)
    setTimeout(async () => {
      await runScan()
      scheduleNext()
    }, intervalMinutes * 60 * 1000)
  }

  scheduleNext()
}

main().catch(err => {
  console.error('Erreur fatale :', err)
  process.exit(1)
})
