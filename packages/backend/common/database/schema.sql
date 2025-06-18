CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  source TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  author TEXT,
  published_at DATETIME,
  category TEXT,
  scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  images TEXT
);

CREATE INDEX IF NOT EXISTS idx_published ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_source ON articles(source);
CREATE INDEX IF NOT EXISTS idx_scraped ON articles(scraped_at);