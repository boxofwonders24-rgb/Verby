const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

class PromptDB {
  constructor(dbPath) {
    const defaultPath = dbPath || path.join(app.getPath('userData'), 'verbyprompt.db');
    this.db = new Database(defaultPath);
    this.db.pragma('journal_mode = WAL');
    this._migrate();
  }

  _migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_transcript TEXT NOT NULL,
        optimized_prompt TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        is_favorite INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS prompt_tags (
        prompt_id INTEGER REFERENCES prompts(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (prompt_id, tag_id)
      );
    `);
  }

  savePrompt({ rawTranscript, optimizedPrompt, category }) {
    const stmt = this.db.prepare(
      'INSERT INTO prompts (raw_transcript, optimized_prompt, category) VALUES (?, ?, ?)'
    );
    const result = stmt.run(rawTranscript, optimizedPrompt, category || 'general');
    return result.lastInsertRowid;
  }

  getHistory(limit = 50, offset = 0) {
    return this.db.prepare(
      'SELECT * FROM prompts ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset);
  }

  searchPrompts(query) {
    return this.db.prepare(
      "SELECT * FROM prompts WHERE optimized_prompt LIKE ? OR raw_transcript LIKE ? ORDER BY created_at DESC"
    ).all(`%${query}%`, `%${query}%`);
  }

  toggleFavorite(id) {
    this.db.prepare('UPDATE prompts SET is_favorite = NOT is_favorite WHERE id = ?').run(id);
    return this.db.prepare('SELECT * FROM prompts WHERE id = ?').get(id);
  }

  deletePrompt(id) {
    this.db.prepare('DELETE FROM prompts WHERE id = ?').run(id);
  }

  addTag(promptId, tagName) {
    const tag = this.db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(tagName);
    const tagId = tag.lastInsertRowid || this.db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName).id;
    this.db.prepare('INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)').run(promptId, tagId);
  }

  getTagsForPrompt(promptId) {
    return this.db.prepare(
      'SELECT t.name FROM tags t JOIN prompt_tags pt ON t.id = pt.tag_id WHERE pt.prompt_id = ?'
    ).all(promptId).map(r => r.name);
  }

  close() {
    this.db.close();
  }
}

module.exports = PromptDB;
