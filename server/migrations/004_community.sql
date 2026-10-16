-- Communauté : profils (Maison), projets, signalements et preuves du Passeport.
-- Un petit magasin de documents JSON, pour ne pas multiplier les tables.
CREATE TABLE community_docs (
  kind       text NOT NULL,
  id         text NOT NULL,
  data       jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, id)
);
CREATE INDEX community_docs_kind_created_idx ON community_docs (kind, created_at DESC);
