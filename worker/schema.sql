CREATE TABLE IF NOT EXISTS pages (title TEXT PRIMARY KEY NOT NULL, content TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, editor TEXT NOT NULL DEFAULT '관리자', created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_pages_updated_at ON pages(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_revisions_title_id ON revisions(title, id DESC);
