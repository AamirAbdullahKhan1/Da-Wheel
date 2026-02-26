CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  team_name TEXT,
  login_id TEXT UNIQUE,
  password TEXT,
  spin_completed BOOLEAN DEFAULT FALSE,
  assigned_theme TEXT,
  assigned_at TIMESTAMP
);
