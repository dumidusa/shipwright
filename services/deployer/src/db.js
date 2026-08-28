const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'deploys.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS deploys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    git_sha TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    duration_ms INTEGER,
    detail TEXT
  );
`);

function createDeploy(gitSha) {
  const stmt = db.prepare(
    `INSERT INTO deploys (git_sha, status, started_at) VALUES (?, 'pending', ?)`
  );
  const info = stmt.run(gitSha, new Date().toISOString());
  return info.lastInsertRowid;
}

function finishDeploy(id, status, detail) {
  const row = db.prepare(`SELECT started_at FROM deploys WHERE id = ?`).get(id);
  const finishedAt = new Date();
  const durationMs = row ? finishedAt - new Date(row.started_at) : null;

  db.prepare(
    `UPDATE deploys SET status = ?, finished_at = ?, duration_ms = ?, detail = ? WHERE id = ?`
  ).run(status, finishedAt.toISOString(), durationMs, detail || null, id);
}

function listDeploys(limit = 20) {
  return db
    .prepare(`SELECT * FROM deploys ORDER BY id DESC LIMIT ?`)
    .all(limit);
}

module.exports = { createDeploy, finishDeploy, listDeploys };