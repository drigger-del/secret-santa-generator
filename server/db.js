const SQL = require('sql.js').default;
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
let db = null;

// Initialize the database asynchronously (loads the SQL.js WASM module),
// then run the schema synchronously. All subsequent operations are sync.
const initPromise = (async () => {
  const SQLApi = await SQL();
  const { Database } = SQLApi;
  db = fs.existsSync(dbPath) ? new Database(fs.readFileSync(dbPath)) : new Database();
  db.exec('PRAGMA foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  return db;
})();

function getDb() {
  if (!db) throw new Error('Database not initialized yet');
  return db;
}

function all(sql, params = []) {
  const d = getDb();
  const stmt = d.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.reset();
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  const d = getDb();
  const stmt = d.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.reset();
  stmt.free();
  return row;
}

function run(sql, params = []) {
  const d = getDb();
  const stmt = d.prepare(sql);
  stmt.bind(params);
  stmt.step(); // executes INSERT/UPDATE/DELETE
  const lastIdStmt = d.prepare('SELECT last_insert_rowid() AS id');
  lastIdStmt.bind([]);
  lastIdStmt.step();
  const id = lastIdStmt.getAsObject().id;
  stmt.reset();
  stmt.free();
  lastIdStmt.reset();
  lastIdStmt.free();
  return { lastInsertRowid: id };
}

function exec(sql) {
  return getDb().exec(sql);
}

function transaction(fn) {
  const d = getDb();
  d.exec('BEGIN');
  try {
    const result = fn();
    d.exec('COMMIT');
    return result;
  } catch (e) {
    try { d.exec('ROLLBACK'); } catch (_) { /* ignore rollback errors */ }
    throw e;
  }
}

function save() {
  if (db) fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

// Auto-save to disk every 5 seconds so data isn't lost if the process stops.
setInterval(save, 5000);

module.exports = { all, get, run, exec, transaction, save, getDb, initPromise };
