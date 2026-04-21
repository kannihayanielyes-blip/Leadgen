import fetch from 'node-fetch'
import 'dotenv/config'

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234'
const MODEL = process.env.LM_STUDIO_MODEL || 'mistral-7b-instruct'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000

const SYSTEM_PROMPT = `Tu es un expert en détection d'intention d'achat. Analyse le contenu Reddit suivant et retourne UNIQUEMENT un objet JSON valide, sans markdown, sans explication.

Détecte si l'auteur exprime un besoin, une frustration, ou cherche activement un outil/service/solution.

Signaux à chercher (FR et EN) :
- "How can I automate...", "I'm tired of manually doing...", "Does anyone know a tool for..."
- "I hate [processus répétitif]", "Looking for a solution to...", "Is there a way to..."
- "On cherche quelqu'un pour...", "J'en ai marre de faire X à la main"
- "Quelqu'un connaît un outil pour...", "Je cherche une solution pour..."

Réponds UNIQUEMENT avec ce JSON :
{
  "score": <entier 0-100>,
  "label": <"Chaud" si score>70, "Tiède" si 40-70, "Froid" si <40>,
  "explication": <string, 1 phrase max, explique pourquoi ce score>,
  "type_besoin": <string, ex: "Automatisation", "Recherche outil", "Délégation", "Frustration process", null si Froid>,
  "langue": <"fr" ou "en">,
  "message_pre_redige": <string si score>=40, null si score<40>
}

Règles message_pre_redige :
- Score > 70 : message personnalisé 4-5 lignes, mentionne le problème exact, ton humain conversationnel, zéro pitch, ouvre juste une conversation
- Score 40-70 : message court 2-3 lignes, brise-glace seulement
- Score < 40 : null
- Langue du message = langue détectée du post`

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function callLMStudio(messages) {
  const res = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 800,
      stream: false
    })
  })
  if (!res.ok) throw new Error(`LM Studio HTTP ${res.status}`)
  const json = await res.json()
  return json.choices[0].message.content.trim()
}

export async function analyzeContent(content, author, subreddit) {
  const userMessage = `Subreddit : r/${subreddit}\nAuteur : u/${author}\nContenu : ${content}`

  let lastError
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await callLMStudio([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ])

      // Nettoie les backticks markdown si le modèle en ajoute quand même
      const cleaned = raw.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim()
      const result = JSON.parse(cleaned)

      // Valeurs de fallback si le modèle oublie un champ
      return {
        score:              Math.min(100, Math.max(0, parseInt(result.score) || 0)),
        label:              result.label || labelFromScore(result.score),
        explication:        result.explication || null,
        type_besoin:        result.type_besoin || null,
        langue:             result.langue || 'en',
        message_pre_redige: result.message_pre_redige || null
      }
    } catch (err) {
      lastError = err
      console.error(`[ai] Tentative ${attempt}/${MAX_RETRIES} échouée : ${err.message}`)
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS)
    }
  }

  // Après 3 échecs : score 0 pour ne pas alerter Slack
  console.error('[ai] Toutes les tentatives ont échoué :', lastError?.message)
  return {
    score: 0,
    label: 'Froid',
    explication: null,
    type_besoin: null,
    langue: 'en',
    message_pre_redige: null
  }
}

function labelFromScore(score) {
  if (score > 70) return 'Chaud'
  if (score >= 40) return 'Tiède'
  return 'Froid'
}
