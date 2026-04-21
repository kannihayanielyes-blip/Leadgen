import fetch from 'node-fetch'
import 'dotenv/config'

const USER_AGENT = process.env.REDDIT_USER_AGENT || 'IntentTracker/1.0'
const RATE_LIMIT_MS = 1000

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function redditGet(url) {
  await sleep(RATE_LIMIT_MS)
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  })
  if (!res.ok) throw new Error(`Reddit API ${res.status} sur ${url}`)
  return res.json()
}

// Retourne les 25 derniers posts d'un subreddit
export async function getNewPosts(subreddit) {
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=25`
  const json = await redditGet(url)
  return json.data.children.map(c => c.data)
}

// Retourne les commentaires d'un post (jusqu'à 100)
export async function getComments(subreddit, postId) {
  const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=100`
  const json = await redditGet(url)
  // Le 2ème élément contient les commentaires
  if (!json[1]) return []
  return flattenComments(json[1].data.children)
}

// Aplatit la structure récursive des commentaires Reddit
function flattenComments(children, result = []) {
  for (const child of children) {
    if (child.kind !== 't1') continue
    const d = child.data
    result.push(d)
    if (d.replies && d.replies.data && d.replies.data.children) {
      flattenComments(d.replies.data.children, result)
    }
  }
  return result
}
