-- ============================================================
-- Intent Tracker — Migration initiale
-- ============================================================

-- Table principale : leads détectés
create table if not exists leads (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz default now(),
  author             text not null,
  subreddit          text not null,
  post_id            text not null,
  comment_id         text,
  content_hash       text not null unique,
  url                text not null,
  content_excerpt    text,
  score              integer not null check (score >= 0 and score <= 100),
  label              text not null check (label in ('Chaud', 'Tiède', 'Froid')),
  explication        text,
  type_besoin        text,
  langue             text check (langue in ('fr', 'en')),
  message_pre_redige text,
  statut             text not null default 'Détecté' check (statut in ('Détecté', 'Contacté', 'Répondu', 'Converti')),
  rappel_at          timestamptz,
  slack_alerted      boolean default false
);

-- Table subreddits surveillés
create table if not exists subreddits (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  actif      boolean default true,
  created_at timestamptz default now()
);

-- Table config clé/valeur
create table if not exists config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz default now()
);

-- Valeurs par défaut de config
insert into config (key, value) values
  ('slack_webhook_url',      ''),
  ('slack_score_threshold',  '70'),
  ('scan_interval_minutes',  '60')
on conflict (key) do nothing;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table leads      enable row level security;
alter table subreddits enable row level security;
alter table config     enable row level security;

-- Politique : accès complet pour l'utilisateur authentifié
-- (user_id sera ajouté en V2 pour le multi-tenant)

create policy "Authenticated users can read leads"
  on leads for select
  to authenticated
  using (true);

create policy "Authenticated users can insert leads"
  on leads for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update leads"
  on leads for update
  to authenticated
  using (true);

create policy "Authenticated users can delete leads"
  on leads for delete
  to authenticated
  using (true);

create policy "Authenticated users can read subreddits"
  on subreddits for select
  to authenticated
  using (true);

create policy "Authenticated users can write subreddits"
  on subreddits for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read config"
  on config for select
  to authenticated
  using (true);

create policy "Authenticated users can write config"
  on config for all
  to authenticated
  using (true)
  with check (true);

-- Index pour les requêtes fréquentes
create index if not exists leads_score_idx      on leads (score desc);
create index if not exists leads_statut_idx     on leads (statut);
create index if not exists leads_created_at_idx on leads (created_at desc);
create index if not exists leads_subreddit_idx  on leads (subreddit);
