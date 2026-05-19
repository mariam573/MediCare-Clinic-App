require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initDb, all, get, run } = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { authRequired, requireRole } = require("./auth");


const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running ");
});

/* =========================
   DOCTORS
========================= */
app.get("/api/doctors", async (req, res) => {
  try {
    const doctors = await all(
      `SELECT id, full_name, specialty, days_json, days_text, email
       FROM doctors
       ORDER BY id ASC`
    );

    const formatted = doctors.map((d) => ({
      id: d.id,
      name: d.full_name,
      specialty: d.specialty,
      days: JSON.parse(d.days_json),
      daysText: d.days_text,
      email: d.email,
    }));

    res.json({ doctors: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: String(err) });
  }
});

/* =========================
   APPOINTMENTS (PATIENT)
========================= */

// Create appointment (TEMP patient_id = 1)
app.post("/api/appointments", authRequired, requireRole("patient"), async (req, res) => {
  try {
    const { doctor_id, appointment_date } = req.body;
    if (!doctor_id || !appointment_date) return res.status(400).send("Missing data");

    const doctor = await get("SELECT id FROM doctors WHERE id = ?", [doctor_id]);
    if (!doctor) return res.status(404).send("Doctor not found");

    const exists = await get(
      `SELECT id FROM appointments
       WHERE doctor_id = ? AND appointment_date = ? AND status = 'booked'`,
      [doctor_id, appointment_date]
    );
    if (exists) return res.status(409).send("Appointment already booked");

    await run(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date)
       VALUES (?, ?, ?)`,
      [req.user.id, doctor_id, appointment_date]
    );

    res.status(201).send("Appointment booked");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


// Read appointments for patient (TEMP patient_id = 1)
app.get("/api/appointments/patient", authRequired, requireRole("patient"), async (req, res) => {
  try {
    const appointments = await all(
      `SELECT 
         a.id,
         a.appointment_date,
         a.status,
         d.full_name AS doctor_name,
         d.specialty
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date`,
      [req.user.id]
    );
    res.json({ appointments });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


// Cancel appointment for patient (TEMP patient_id = 1)
app.delete("/api/appointments/:id", authRequired, requireRole("patient"), async (req, res) => {
  try {
    const apptId = req.params.id;

    const appt = await get(
      "SELECT id FROM appointments WHERE id = ? AND patient_id = ?",
      [apptId, req.user.id]
    );
    if (!appt) return res.status(404).send("Appointment not found");

    await run("UPDATE appointments SET status = 'cancelled' WHERE id = ?", [apptId]);
    res.send("Appointment cancelled");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


/* =========================
   APPOINTMENTS (DOCTOR)
========================= */

// Read appointments for a doctor
app.get("/api/appointments/doctor", authRequired, requireRole("doctor"), async (req, res) => {
  try {
    const rows = await all(
      `SELECT 
         a.id,
         a.appointment_date,
         a.status,
         p.full_name AS patient_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.doctor_id = ?
       ORDER BY a.appointment_date`,
      [req.user.id]
    );
    res.json({ appointments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


// Cancel appointment as doctor (uses doctorId ownership)
app.delete("/api/appointments/doctor/:id", authRequired, requireRole("doctor"), async (req, res) => {
  try {
    const id = req.params.id;

    const appt = await get(
      "SELECT id FROM appointments WHERE id = ? AND doctor_id = ?",
      [id, req.user.id]
    );
    if (!appt) return res.status(404).send("Appointment not found");

    await run("UPDATE appointments SET status='cancelled' WHERE id = ?", [id]);
    res.send("Appointment cancelled");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


/* =========================
   START SERVER
========================= */
async function startServer() {
  await initDb();
  const port = process.env.PORT || 5050;
  app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));
}

app.post("/api/auth/patient/signup", async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    if (!full_name || !email || !password) return res.status(400).send("Missing data");

    const exists = await get("SELECT id FROM patients WHERE email = ?", [email]);
    if (exists) return res.status(409).send("Email already exists");

    const hash = await bcrypt.hash(password, 10);
    await run(
      "INSERT INTO patients (full_name, email, password_hash) VALUES (?, ?, ?)",
      [full_name, email, hash]
    );

    res.status(201).send("Patient created");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.post("/api/auth/patient/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send("Missing data");

    const user = await get(
      "SELECT id, full_name, email, password_hash FROM patients WHERE email = ?",
      [email]
    );
    if (!user) return res.status(401).send("Invalid credentials");

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).send("Invalid credentials");

    const token = jwt.sign(
      { id: user.id, role: "patient", email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user.id, name: user.full_name, email: user.email, role: "patient" },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.post("/api/auth/doctor/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send("Missing data");

    const doc = await get(
      "SELECT id, full_name, email, password_hash FROM doctors WHERE email = ?",
      [email]
    );
    if (!doc) return res.status(401).send("Invalid credentials");

    const ok = await bcrypt.compare(password, doc.password_hash);
    if (!ok) return res.status(401).send("Invalid credentials");

    const token = jwt.sign(
      { id: doc.id, role: "doctor", email: doc.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: doc.id, name: doc.full_name, email: doc.email, role: "doctor" },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


startServer();
