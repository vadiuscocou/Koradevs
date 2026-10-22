-- Comptes e-mail + mot de passe, et connexion Google.
ALTER TABLE users DROP CONSTRAINT users_provider_check;
ALTER TABLE users ADD CONSTRAINT users_provider_check CHECK (provider IN ('github', 'dev', 'google', 'password'));

-- Seule l'empreinte du mot de passe (scrypt, sel aléatoire) est stockée, jamais le mot de passe.
CREATE TABLE credentials (
  user_id       uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX users_login_lower_idx ON users (lower(login));
