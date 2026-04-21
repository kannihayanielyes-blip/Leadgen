'use client'

import { useState } from 'react'
import { Lead, STATUTS, Statut } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  lead: Lead | null
  onClose: () => void
  onUpdate: (lead: Lead) => void
}

const LABEL_CLASSES = {
  'Chaud': 'bg-red-500/20 text-red-400 border border-red-500/30',
  'Tiède': 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  'Froid': 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
}

export function LeadModal({ lead, onClose, onUpdate }: Props) {
  const supabase = createClient()
  const [message, setMessage]   = useState(lead?.message_pre_redige || '')
  const [statut, setStatut]     = useState<Statut>(lead?.statut || 'Détecté')
  const [rappel, setRappel]     = useState(lead?.rappel_at ? lead.rappel_at.split('T')[0] : '')
  const [copied, setCopied]     = useState(false)
  const [saving, setSaving]     = useState(false)
  const [dmClicked, setDmClicked] = useState(false)

  if (!lead) return null

  async function saveChanges(newStatut?: Statut) {
    setSaving(true)
    const update = {
      message_pre_redige: message,
      statut: newStatut || statut,
      rappel_at: rappel ? new Date(rappel).toISOString() : null
    }
    const { data } = await supabase
      .from('leads')
      .update(update)
      .eq('id', lead!.id)
      .select()
      .single()
    if (data) onUpdate(data as Lead)
    setSaving(false)
  }

  function copyMessage() {
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openDm() {
    const encoded = encodeURIComponent(message)
    const url = `https://www.reddit.com/message/compose/?to=${lead!.author}&subject=Hey&message=${encoded}`
    window.open(url, '_blank')
    setDmClicked(true)
  }

  async function markContacted() {
    setStatut('Contacté')
    await saveChanges('Contacté')
    setDmClicked(false)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>u/{lead.author}</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${LABEL_CLASSES[lead.label]}`}>
              {lead.label} — {lead.score}/100
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Infos */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400">Subreddit</p>
              <p className="font-medium mt-0.5">r/{lead.subreddit}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400">Type de besoin</p>
              <p className="font-medium mt-0.5">{lead.type_besoin || '—'}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400">Langue</p>
              <p className="font-medium mt-0.5">{lead.langue?.toUpperCase() || '—'}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400">Détecté le</p>
              <p className="font-medium mt-0.5">{new Date(lead.created_at).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          {/* Explication IA */}
          {lead.explication && (
            <div className="bg-blue-950/40 border border-blue-800/30 rounded-lg p-3">
              <p className="text-blue-300 text-xs font-medium mb-1">Analyse IA</p>
              <p className="text-sm text-gray-300">{lead.explication}</p>
            </div>
          )}

          {/* Extrait */}
          {lead.content_excerpt && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Extrait du contenu</p>
              <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300 leading-relaxed">
                {lead.content_excerpt}
              </div>
              <a href={lead.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline mt-1 block">
                Voir le post original →
              </a>
            </div>
          )}

          {/* Message */}
          <div>
            <Label className="text-gray-300 text-sm">Message pré-rédigé</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              className="mt-1.5 bg-gray-800 border-gray-700 text-gray-200 text-sm resize-none"
              placeholder="Aucun message généré (score < 40)"
            />
          </div>

          {/* Actions message */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={copyMessage} variant="outline" size="sm"
              className="border-gray-700 hover:bg-gray-800">
              {copied ? 'Copié !' : 'Copier le message'}
            </Button>
            <Button onClick={openDm} size="sm" className="bg-orange-600 hover:bg-orange-700">
              Ouvrir le DM Reddit
            </Button>
            {dmClicked && (
              <Button onClick={markContacted} size="sm" className="bg-green-700 hover:bg-green-600">
                Marquer comme Contacté
              </Button>
            )}
          </div>

          {/* Statut + rappel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Statut</Label>
              <Select value={statut} onValueChange={v => setStatut(v as Statut)}>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {STATUTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Date de rappel</Label>
              <Input
                type="date"
                value={rappel}
                onChange={e => setRappel(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <Button onClick={() => saveChanges()} disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700">
            {saving ? 'Sauvegarde...' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
