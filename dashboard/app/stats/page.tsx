'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Sidebar } from '@/components/Sidebar'
import { Lead, Label } from '@/lib/types'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const LABEL_HEX: Record<Label, string> = {
  'Chaud': '#ef4444',
  'Tiède': '#f97316',
  'Froid': '#6b7280'
}

interface Stats {
  today: number
  week: number
  total: number
  avgScore: number
  distribution: { name: Label; value: number }[]
  topSubreddits: { name: string; count: number }[]
  recent: Lead[]
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const supabase = createClient()

  async function loadStats() {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekStart  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [{ count: total }, { count: today }, { count: week }, { data: recent }, { data: all7 }] =
      await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
        supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('leads').select('score, label, subreddit').gte('created_at', weekStart)
      ])

    const scores   = (all7 || []).map(l => l.score)
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

    const labelCounts = { Chaud: 0, Tiède: 0, Froid: 0 } as Record<Label, number>
    const subCounts: Record<string, number> = {}
    for (const l of all7 || []) {
      labelCounts[l.label as Label] = (labelCounts[l.label as Label] || 0) + 1
      subCounts[l.subreddit] = (subCounts[l.subreddit] || 0) + 1
    }

    const topSubreddits = Object.entries(subCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    setStats({
      today:       today || 0,
      week:        week || 0,
      total:       total || 0,
      avgScore,
      distribution: (Object.keys(labelCounts) as Label[]).map(k => ({ name: k, value: labelCounts[k] })),
      topSubreddits,
      recent:      (recent || []) as Lead[]
    })
  }

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 space-y-8">
        <h1 className="text-2xl font-bold">Vue d'ensemble</h1>

        {!stats ? (
          <p className="text-gray-400">Chargement...</p>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Aujourd'hui", value: stats.today },
                { label: 'Cette semaine', value: stats.week },
                { label: 'Total', value: stats.total },
                { label: 'Score moyen (7j)', value: `${stats.avgScore}/100` }
              ].map(kpi => (
                <div key={kpi.label} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                  <p className="text-gray-400 text-sm">{kpi.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{kpi.value}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Donut */}
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <h2 className="font-semibold mb-4">Répartition (7 derniers jours)</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={stats.distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                      {stats.distribution.map(entry => (
                        <Cell key={entry.name} fill={LABEL_HEX[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {stats.distribution.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-sm">
                      <span className="w-3 h-3 rounded-full" style={{ background: LABEL_HEX[d.name] }} />
                      <span className="text-gray-300">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top subreddits */}
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <h2 className="font-semibold mb-4">Top subreddits (7j)</h2>
                <div className="space-y-3">
                  {stats.topSubreddits.length === 0 && <p className="text-gray-500 text-sm">Pas encore de données</p>}
                  {stats.topSubreddits.map(s => (
                    <div key={s.name} className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">r/{s.name}</span>
                      <span className="font-semibold text-blue-400">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Récents */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h2 className="font-semibold mb-4">5 derniers leads</h2>
              <div className="space-y-3">
                {stats.recent.length === 0 && <p className="text-gray-500 text-sm">Aucun lead pour l'instant</p>}
                {stats.recent.map(l => (
                  <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div>
                      <span className="font-medium text-sm">u/{l.author}</span>
                      <span className="text-gray-500 text-sm ml-2">r/{l.subreddit}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">{l.score}/100</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        l.label === 'Chaud' ? 'bg-red-500/20 text-red-400' :
                        l.label === 'Tiède' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>{l.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
