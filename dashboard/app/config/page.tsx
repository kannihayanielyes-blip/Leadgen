'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Sidebar } from '@/components/Sidebar'
import { Subreddit } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ConfigPage() {
  const supabase = createClient()

  const [subreddits, setSubreddits] = useState<Subreddit[]>([])
  const [newSub, setNewSub]         = useState('')
  const [webhook, setWebhook]       = useState('')
  const [threshold, setThreshold]   = useState('70')
  const [interval, setInterval]     = useState('60')
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)

  async function load() {
    const [{ data: subs }, { data: configs }] = await Promise.all([
      supabase.from('subreddits').select('*').order('name'),
      supabase.from('config').select('*')
    ])
    setSubreddits((subs || []) as Subreddit[])
    for (const c of configs || []) {
      if (c.key === 'slack_webhook_url')     setWebhook(c.value)
      if (c.key === 'slack_score_threshold') setThreshold(c.value)
      if (c.key === 'scan_interval_minutes') setInterval(c.value)
    }
  }

  useEffect(() => { load() }, [])

  async function addSubreddit(e: React.FormEvent) {
    e.preventDefault()
    const name = newSub.trim().replace(/^r\//i, '').toLowerCase()
    if (!name) return
    const { data } = await supabase.from('subreddits').insert({ name }).select().single()
    if (data) setSubreddits(prev => [...prev, data as Subreddit].sort((a, b) => a.name.localeCompare(b.name)))
    setNewSub('')
  }

  async function toggleSubreddit(id: string, actif: boolean) {
    await supabase.from('subreddits').update({ actif }).eq('id', id)
    setSubreddits(prev => prev.map(s => s.id === id ? { ...s, actif } : s))
  }

  async function deleteSubreddit(id: string) {
    await supabase.from('subreddits').delete().eq('id', id)
    setSubreddits(prev => prev.filter(s => s.id !== id))
  }

  async function saveConfig() {
    setSaving(true)
    await Promise.all([
      supabase.from('config').update({ value: webhook,   updated_at: new Date().toISOString() }).eq('key', 'slack_webhook_url'),
      supabase.from('config').update({ value: threshold, updated_at: new Date().toISOString() }).eq('key', 'slack_score_threshold'),
    ])
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 max-w-2xl space-y-10">
        <h1 className="text-2xl font-bold">Configuration</h1>

        {/* Subreddits */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Subreddits surveillés</h2>
          <form onSubmit={addSubreddit} className="flex gap-2">
            <Input
              value={newSub}
              onChange={e => setNewSub(e.target.value)}
              placeholder="entrepreneur (sans le r/)"
              className="bg-gray-800 border-gray-700 text-white"
            />
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 shrink-0">Ajouter</Button>
          </form>

          <div className="space-y-2">
            {subreddits.length === 0 && (
              <p className="text-gray-500 text-sm">Aucun subreddit. Ajoutes-en ci-dessus.</p>
            )}
            {subreddits.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3 border border-gray-800">
                <span className="text-sm font-medium">r/{s.name}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleSubreddit(s.id, !s.actif)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                      s.actif
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {s.actif ? 'Actif' : 'Inactif'}
                  </button>
                  <button
                    onClick={() => deleteSubreddit(s.id)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Slack */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Alertes Slack</h2>
          <div className="space-y-2">
            <Label className="text-gray-300">Webhook URL</Label>
            <Input
              value={webhook}
              onChange={e => setWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Seuil de score pour alerte (0-100)</Label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={100}
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                className="flex-1 accent-blue-500"
              />
              <span className="w-8 text-right font-bold text-blue-400">{threshold}</span>
            </div>
          </div>
          <Button onClick={saveConfig} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Sauvegarde...' : saved ? 'Sauvegardé !' : 'Sauvegarder'}
          </Button>
        </section>

        {/* Intervalle (info) */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Intervalle de scan</h2>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <p className="text-gray-300 text-sm">
              Intervalle actuel : <span className="font-bold text-white">{interval} minutes</span>
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Modifiable dans la variable <code className="bg-gray-800 px-1 rounded">config.scan_interval_minutes</code> en base ou via Supabase Studio.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
