# Intent Tracker

Détecte en temps réel les signaux d'intention d'achat sur Reddit, les score via un LLM local (LM Studio), et les présente dans un dashboard Kanban pour contacter les leads en un clic.

---

## Architecture

```
Reddit API → Scraper Node.js → File d'attente → LM Studio (local)
                                                      ↓
                                                  Supabase DB
                                                      ↓
                                           Dashboard Next.js (Vercel)
                                           + Alertes Slack
```

---

## Setup

### 1. Supabase

1. Crée un projet sur [supabase.com](https://supabase.com)
2. Dans **SQL Editor**, exécute le contenu de `supabase/migrations/001_init.sql`
3. Dans **Authentication > Providers**, active **Google** (client ID + secret depuis Google Cloud Console)
4. Dans **Authentication > URL Configuration** :
   - Site URL : ton URL Vercel (ex: `https://intent-tracker.vercel.app`)
   - Redirect URL : `https://intent-tracker.vercel.app/**`
5. Récupère dans **Project Settings > API** :
   - `Project URL`
   - `anon public` key (pour le dashboard)
   - `service_role` key (pour le scraper — ne jamais l'exposer côté client)

### 2. Reddit

Aucune clé API nécessaire pour la lecture publique. L'API publique Reddit est utilisée directement.

Limite : ~60 requêtes/minute. Le scraper attend 1 seconde entre chaque requête.

### 3. LM Studio

1. Télécharge [LM Studio](https://lmstudio.ai)
2. Dans l'onglet **Discover**, recherche et télécharge `mistral-7b-instruct` (quantized GGUF, ~4-5 Go)
3. Dans l'onglet **Local Server**, charge le modèle et démarre le serveur sur le **port 1234**
4. Vérifie que l'API répond : `curl http://localhost:1234/v1/models`

### 4. Slack

1. Va sur [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → From scratch
2. Dans **Incoming Webhooks**, active et crée un webhook pour le channel de ton choix
3. Copie l'URL du webhook → tu la colleras dans le dashboard (Config > Slack)

### 5. Variables d'environnement

**Scraper** — copie `scraper/.env.example` en `scraper/.env` :
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...          # service_role key
LM_STUDIO_URL=http://localhost:1234
LM_STUDIO_MODEL=mistral-7b-instruct
DASHBOARD_URL=https://intent-tracker.vercel.app
```

**Dashboard** — copie `dashboard/.env.local.example` en `dashboard/.env.local` :
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # anon key
```

---

## Lancer le scraper (machine locale)

```bash
cd scraper
npm install
node index.js
```

Le scraper :
- Lance un premier scan au démarrage
- Tourne en boucle selon `config.scan_interval_minutes` (défaut : 60 min)
- Logs dans la console

### Ajouter des subreddits à surveiller

Depuis le dashboard (Config) ou directement en SQL :
```sql
insert into subreddits (name) values ('entrepreneur'), ('freelance'), ('webdev');
```

---

## Lancer le dashboard (dev)

```bash
cd dashboard
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000)

---

## Déployer le dashboard sur Vercel

```bash
cd dashboard
npx vercel --prod
```

Ajoute les variables d'environnement dans Vercel Dashboard :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Structure du projet

```
/
├── supabase/
│   └── migrations/
│       └── 001_init.sql
├── scraper/
│   ├── index.js        # daemon principal
│   ├── reddit.js       # client API Reddit
│   ├── ai.js           # appel LM Studio
│   ├── slack.js        # alertes Slack
│   ├── supabase.js     # client Supabase
│   ├── dedup.js        # déduplication SHA256
│   ├── queue.js        # file d'attente mémoire
│   └── .env.example
└── dashboard/
    ├── app/
    │   ├── login/      # auth page
    │   ├── stats/      # vue KPIs
    │   ├── leads/      # kanban
    │   └── config/     # subreddits + slack
    ├── components/
    │   ├── Sidebar.tsx
    │   └── LeadModal.tsx
    └── lib/
        ├── supabase.ts
        ├── supabase-server.ts
        └── types.ts
```

---

## Choisir les bons subreddits

Pour la détection d'intentions d'achat, commence avec :
- `entrepreneur`, `startups`, `smallbusiness`
- `freelance`, `forhire`
- `webdev`, `learnprogramming`
- `productivity`, `nocode`
- Subreddits de ta niche cible
