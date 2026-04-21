// File d'attente en mémoire — traitement séquentiel pour ne pas saturer LM Studio
const queue = []
let processing = false

export function enqueue(item) {
  queue.push(item)
}

export function size() {
  return queue.length
}

// Lance le traitement séquentiel de la file
// processor(item) doit être une fonction async
export async function drain(processor) {
  if (processing) return
  processing = true
  while (queue.length > 0) {
    const item = queue.shift()
    try {
      await processor(item)
    } catch (err) {
      console.error(`[queue] Erreur sur l'item ${item.url} :`, err.message)
    }
  }
  processing = false
}
