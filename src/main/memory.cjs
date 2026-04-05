'use strict';

let db = null;

function initMemoryTables(database) {
  db = database;

  db.exec(`
    CREATE TABLE IF NOT EXISTS entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'unknown',
      metadata TEXT DEFAULT '{}',
      mention_count INTEGER DEFAULT 1,
      last_referenced TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      verb TEXT NOT NULL,
      object_id INTEGER NOT NULL,
      confidence REAL DEFAULT 0.5,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (subject_id) REFERENCES entities(id),
      FOREIGN KEY (object_id) REFERENCES entities(id),
      UNIQUE(subject_id, verb, object_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS output_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      context_pattern TEXT NOT NULL UNIQUE,
      preferred_format TEXT DEFAULT 'prompt',
      preferred_tone TEXT DEFAULT 'professional',
      preferred_detail TEXT DEFAULT 'medium',
      success_count INTEGER DEFAULT 0,
      reject_count INTEGER DEFAULT 0,
      last_used TEXT DEFAULT (datetime('now'))
    )
  `);
}

const memory = {
  // --- Entities ---
  upsertEntity(name, type, metadata = {}) {
    const existing = db.prepare('SELECT * FROM entities WHERE name = ?').get(name);
    if (existing) {
      // Merge metadata in JS instead of json_patch (safer cross-platform)
      let currentMeta = {};
      try { currentMeta = JSON.parse(existing.metadata || '{}'); } catch (_) { /* ignore */ }
      const merged = { ...currentMeta, ...metadata };
      db.prepare(`
        UPDATE entities
        SET mention_count = mention_count + 1,
            last_referenced = datetime('now'),
            type = CASE WHEN type = 'unknown' THEN ? ELSE type END,
            metadata = ?
        WHERE name = ?
      `).run(type, JSON.stringify(merged), name);
      return db.prepare('SELECT * FROM entities WHERE name = ?').get(name);
    }
    db.prepare(`
      INSERT INTO entities (name, type, metadata)
      VALUES (?, ?, ?)
    `).run(name, type, JSON.stringify(metadata));
    return db.prepare('SELECT * FROM entities WHERE name = ?').get(name);
  },

  getEntity(name) {
    return db.prepare('SELECT * FROM entities WHERE name = ?').get(name);
  },

  getTopEntities(limit = 10) {
    return db.prepare(`
      SELECT * FROM entities
      ORDER BY mention_count DESC, last_referenced DESC
      LIMIT ?
    `).all(limit);
  },

  getEntitiesByType(type) {
    return db.prepare('SELECT * FROM entities WHERE type = ?').all(type);
  },

  // --- Relationships ---
  upsertRelationship(subjectId, verb, objectId) {
    const existing = db.prepare(
      'SELECT * FROM relationships WHERE subject_id = ? AND verb = ? AND object_id = ?'
    ).get(subjectId, verb, objectId);
    if (existing) {
      const newConfidence = Math.min(1.0, existing.confidence + 0.1);
      db.prepare(
        'UPDATE relationships SET confidence = ? WHERE id = ?'
      ).run(newConfidence, existing.id);
      return;
    }
    db.prepare(`
      INSERT INTO relationships (subject_id, verb, object_id)
      VALUES (?, ?, ?)
    `).run(subjectId, verb, objectId);
  },

  getRelationshipsFor(entityId) {
    return db.prepare(`
      SELECT r.*, e1.name as subject_name, e2.name as object_name
      FROM relationships r
      JOIN entities e1 ON r.subject_id = e1.id
      JOIN entities e2 ON r.object_id = e2.id
      WHERE r.subject_id = ? OR r.object_id = ?
      ORDER BY r.confidence DESC
    `).all(entityId, entityId);
  },

  // --- Output Preferences ---
  recordPreference(contextPattern, format, tone, detail) {
    const existing = db.prepare(
      'SELECT * FROM output_preferences WHERE context_pattern = ?'
    ).get(contextPattern);
    if (existing) {
      db.prepare(`
        UPDATE output_preferences
        SET preferred_format = ?, preferred_tone = ?, preferred_detail = ?,
            last_used = datetime('now')
        WHERE context_pattern = ?
      `).run(format, tone, detail, contextPattern);
      return;
    }
    db.prepare(`
      INSERT INTO output_preferences (context_pattern, preferred_format, preferred_tone, preferred_detail)
      VALUES (?, ?, ?, ?)
    `).run(contextPattern, format, tone, detail);
  },

  recordSuccess(contextPattern) {
    db.prepare(`
      UPDATE output_preferences
      SET success_count = success_count + 1, last_used = datetime('now')
      WHERE context_pattern = ?
    `).run(contextPattern);
  },

  recordReject(contextPattern) {
    db.prepare(`
      UPDATE output_preferences
      SET reject_count = reject_count + 1, last_used = datetime('now')
      WHERE context_pattern = ?
    `).run(contextPattern);
  },

  getPreference(contextPattern) {
    return db.prepare(
      'SELECT * FROM output_preferences WHERE context_pattern = ?'
    ).get(contextPattern);
  },

  getTopPreferences(limit = 5) {
    return db.prepare(`
      SELECT * FROM output_preferences
      ORDER BY success_count DESC, last_used DESC
      LIMIT ?
    `).all(limit);
  },

  // --- Bulk export for backup ---
  exportAll() {
    return {
      entities: db.prepare('SELECT * FROM entities').all(),
      relationships: db.prepare('SELECT * FROM relationships').all(),
      output_preferences: db.prepare('SELECT * FROM output_preferences').all(),
    };
  },
};

module.exports = { initMemoryTables, memory };
