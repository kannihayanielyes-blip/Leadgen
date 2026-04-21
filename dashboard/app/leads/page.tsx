'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Sidebar } from '@/components/Sidebar'
import { LeadModal } from '@/components/LeadModal'
import { Lead, Statut, STATUTS } from '@/lib/types'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable
} from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const colors = {
    'Chaud': 'bg-red-500/20 text-red-400',
    'Tiède': 'bg-orange-500/20 text-orange-400',
    'Froid': 'bg-gray-500/20 text-gray-400'
  }[label] || 'bg-gray-500/20 text-gray-400'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors}`}>
      {label} {score}
    </span>
  )
}

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`bg-gray-800 rounded-lg p-3 border border-gray-700 cursor-pointer hover:border-gray-500 transition-all space-y-2 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm text-white truncate">u/{lead.author}</span>
        <ScoreBadge score={lead.score} label={lead.label} />
      </div>
      <p className="text-xs text-gray-400">r/{lead.subreddit}</p>
      {lead.type_besoin && (
        <p className="text-xs text-blue-400 bg-blue-950/30 px-2 py-0.5 rounded">{lead.type_besoin}</p>
      )}
      {lead.content_excerpt && (
        <p className="text-xs text-gray-500 line-clamp-2">{lead.content_excerpt}</p>
      )}
      <p className="text-xs text-gray-600">{new Date(lead.created_at).toLocaleDateString('fr-FR')}</p>
    </div>
  )
}

function KanbanColumn({ statut, leads, onLeadClick }: {
  statut: Statut
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: statut })
  return (
    <div className="flex-1 min-w-0 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-gray-300">{statut}</h2>
        <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">{leads.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[200px] rounded-xl p-2 space-y-2 border-2 transition-colors ${
          isOver ? 'border-blue-500 bg-blue-950/20' : 'border-transparent bg-gray-900/50'
        }`}
      >
        {leads
          .sort((a, b) => b.score - a.score)
          .map(lead => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
          ))}
      </div>
    </div>
  )
}

export default function LeadsPage() {
  const [leads, setLeads]           = useState<Lead[]>([])
  const [selected, setSelected]     = useState<Lead | null>(null)
  const [hotOnly, setHotOnly]       = useState(false)
  const [activeId, setActiveId]     = useState<string | null>(null)
  const supabase = createClient()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  async function loadLeads() {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    setLeads((data || []) as Lead[])
  }

  useEffect(() => { loadLeads() }, [])

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string)
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    if (!e.over) return
    const lead   = leads.find(l => l.id === e.active.id)
    const newSt  = e.over.id as Statut
    if (!lead || lead.statut === newSt) return

    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, statut: newSt } : l))
    await supabase.from('leads').update({ statut: newSt }).eq('id', lead.id)
  }

  function handleLeadUpdate(updated: Lead) {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
    setSelected(updated)
  }

  const displayed = hotOnly ? leads.filter(l => l.label === 'Chaud') : leads

  const activeLead = leads.find(l => l.id === activeId)

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 flex flex-col gap-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Leads</h1>
          <button
            onClick={() => setHotOnly(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              hotOnly
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500'
            }`}
          >
            🔥 Chaud uniquement
          </button>
        </div>

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUTS.map(statut => (
              <KanbanColumn
                key={statut}
                statut={statut}
                leads={displayed.filter(l => l.statut === statut)}
                onLeadClick={setSelected}
              />
            ))}
          </div>
          <DragOverlay>
            {activeLead ? (
              <div className="bg-gray-800 rounded-lg p-3 border border-blue-500 shadow-xl opacity-90 w-64">
                <p className="font-medium text-sm">u/{activeLead.author}</p>
                <p className="text-xs text-gray-400">r/{activeLead.subreddit}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <LeadModal
          lead={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleLeadUpdate}
        />
      </main>
    </div>
  )
}
