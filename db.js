const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");

const DB_PATH = path.join(__dirname, "database.sqlite");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

const db = new sqlite3.Database(DB_PATH);

// Promisified helpers
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this); // has lastID
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function initDb() {
  // Apply schema
  await exec("PRAGMA foreign_keys = ON;");
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  await exec(schema);

  // Seed doctors if empty
  const countRow = await get("SELECT COUNT(*) AS c FROM doctors");
  if (countRow && countRow.c === 0) {
    const doctors = [
      { full_name: "Dr. Omar Osama", specialty: "Cardiologist", days: [1, 3, 5], daysText: "Mon, Wed, Fri", email: "dr.omar@medicare.com", password: "doc123" },
      { full_name: "Dr. Youssef Mohamed", specialty: "Dermatologist", days: [2, 4], daysText: "Tue, Thu", email: "dr.youssef@medicare.com", password: "doc123" },
      { full_name: "Dr. Nour Mohamed", specialty: "Pediatrician", days: [0, 6], daysText: "Sun, Sat", email: "dr.nour@medicare.com", password: "doc123" },
      { full_name: "Dr. Mariam Mahmoud", specialty: "General Doctor", days: [0, 1, 2, 3, 4], daysText: "Sun to Thu", email: "dr.mariam@medicare.com", password: "doc123" }
    ];

    for (const d of doctors) {
      const passwordHash = await bcrypt.hash(d.password, 10);
      await run(
        `INSERT INTO doctors (full_name, specialty, days_json, days_text, email, password_hash)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          d.full_name,
          d.specialty,
          JSON.stringify(d.days),
          d.daysText,
          d.email,
          passwordHash
        ]
      );
    }

    console.log("Seeded doctors (password = doc123)");
  }
}

module.exports = { db, run, get, all, exec, initDb };
