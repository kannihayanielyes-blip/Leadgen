'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/stats` }
    })
    setSent(true)
    setLoading(false)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/stats` }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm space-y-6 p-8 bg-gray-900 rounded-2xl border border-gray-800">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-white">Intent Tracker</h1>
          <p className="text-gray-400 text-sm">Détecteur de signaux d'achat Reddit</p>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <p className="text-green-400">Vérifie ta boîte mail !</p>
            <p className="text-gray-400 text-sm mt-1">Lien de connexion envoyé à {email}</p>
          </div>
        ) : (
          <>
            <Button
              onClick={handleGoogle}
              variant="outline"
              className="w-full border-gray-700 hover:bg-gray-800"
            >
              Continuer avec Google
            </Button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-700" />
              <span className="text-gray-500 text-xs">ou par email</span>
              <div className="flex-1 h-px bg-gray-700" />
            </div>

            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="toi@example.com"
                  required
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Envoi...' : 'Envoyer le lien magique'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
