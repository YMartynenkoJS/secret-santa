import sqlite from "sqlite3";

export const getDatabase = () =>
  new sqlite.Database("./secret-santa.db", (err) => {
    if (err) {
      return console.log(err);
    }
  });

export const setUp = () => {
  const db = getDatabase();

  db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      assignedId INTEGER,
      UNIQUE(firstName, lastName)
    )
  `);
    db.run(`
    CREATE TABLE IF NOT EXISTS gifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER REFERENCES users(id),
      description TEXT NOT NULL
    )
  `);
  });

  db.close();
};
