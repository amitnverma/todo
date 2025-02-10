const path = require('path');
const { app } = require('electron');

let sqlite3;

try {
  // Attempt the normal require for sqlite3
  sqlite3 = require('sqlite3').verbose();
} catch (err) {
  console.warn('Standard require for sqlite3 failed, attempting to load from app.asar.unpacked');
  // Construct the path to the unpacked sqlite3 module.
  // process.resourcesPath typically points to: /Applications/ToDo Manager.app/Contents/Resources
  const unpackedSqlite3Path = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sqlite3');
  sqlite3 = require(unpackedSqlite3Path).verbose();
}

// Database file path (stored in user's local app data)
const dbPath = path.join(app.getPath('userData'), 'todo.db');

// Initialize the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database error:', err);
  else console.log('Connected to SQLite database');
});

console.log('Database path:', dbPath);

// Create tables if they don't exist
db.serialize(() => {
  // Create the projects table
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);

  // Create the tasks table
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      title TEXT NOT NULL,
      due_date TEXT,
      created_date TEXT DEFAULT (DATE('now')),
      priority TEXT DEFAULT 'Medium',
      status TEXT DEFAULT 'Pending',
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // Create the notes table
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      content TEXT,
      note_date TEXT DEFAULT (DATETIME('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    )
  `);

  // Create the project_details table
  db.run(`
    CREATE TABLE IF NOT EXISTS project_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      description TEXT,
      dev_lead TEXT,
      business_contact TEXT,
      links TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // Create the project_comments table
  db.run(`
    CREATE TABLE IF NOT EXISTS project_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      comment TEXT,
      comment_date TEXT DEFAULT (DATETIME('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // Create the project_archive table
  db.run(`
    CREATE TABLE IF NOT EXISTS project_archive (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      archived_date TEXT DEFAULT (DATETIME('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
});

// Export the database instance
module.exports = db;
