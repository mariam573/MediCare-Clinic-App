# 🏥 MediCare Clinic - Appointment Booking System

A full-stack Progressive Web Application (PWA) for booking medical appointments with specialists. Built with React, Node.js, Express, and SQLite.

![MediCare Clinic](frontend/public/icon.svg)

## ✨ Features

### For Patients
- 📝 **Account Registration** - Sign up with email and password
- 🔐 **Secure Login** - JWT-based authentication with bcrypt password hashing
- 👨‍⚕️ **Browse Doctors** - View all available specialists and their schedules
- 📅 **Book Appointments** - Schedule appointments based on doctor availability
- ❌ **Cancel Appointments** - Cancel booked appointments anytime
- 📊 **Dashboard** - View upcoming and cancelled appointments

### For Doctors
- 🔐 **Doctor Login** - Separate authentication for medical staff
- 📋 **View Patients** - See all scheduled appointments
- ❌ **Cancel Appointments** - Cancel patient appointments when needed
- 📊 **Dashboard** - Overview of upcoming patients

### Technical Features
- 📱 **Progressive Web App (PWA)** - Installable on any device
- 📴 **Offline Support** - Works without internet (cached pages)
- 🔄 **Single Page Application** - Instant navigation without page reloads
- 🔒 **Secure Authentication** - JWT tokens + bcrypt password hashing
- 📅 **Smart Booking** - Validates doctor availability by day of week

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **React Router v6** - Client-side routing
- **CSS3** - Custom styling
- **Service Worker** - PWA offline support

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite** - Database
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

## 📁 Project Structure

```
clinic-app/
├── backend/
│   ├── server.js        # Express server & API routes
│   ├── db.js            # Database connection & helpers
│   ├── auth.js          # JWT authentication middleware
│   ├── schema.sql       # Database schema
│   ├── database.sqlite  # SQLite database file
│   └── package.json
│
└── frontend/
    ├── public/
    │   ├── index.html       # HTML template with PWA setup
    │   ├── manifest.json    # PWA manifest
    │   ├── service-worker.js # Offline caching
    │   └── icon.svg         # App icon
    │
    ├── src/
    │   ├── App.jsx      # Main app with all components
    │   ├── index.jsx    # Entry point
    │   └── index.css    # Styles
    │
    └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/clinic-app.git
cd clinic-app
```

2. **Setup Backend**
```bash
cd backend
npm install
```

3. **Create `.env` file in backend folder**
```
JWT_SECRET=your_secret_key_here
PORT=5050
```

4. **Start Backend**
```bash
npm start
# Server runs on http://localhost:5050
```

5. **Setup Frontend** (new terminal)
```bash
cd frontend
npm install
npm start
# App runs on http://localhost:3000
```

## 🔑 Test Credentials

### Pre-seeded Doctors
| Email | Password |
|-------|----------|
| dr.omar@medicare.com | doc123 |
| dr.youssef@medicare.com | doc123 |
| dr.nour@medicare.com | doc123 |
| dr.mariam@medicare.com | doc123 |

### Patients
Sign up through the app to create a patient account.

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/patient/signup` | Register new patient |
| POST | `/api/auth/patient/login` | Patient login |
| POST | `/api/auth/doctor/login` | Doctor login |

### Doctors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctors` | Get all doctors |

### Appointments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/appointments` | Book appointment (patient) |
| GET | `/api/appointments/patient` | Get patient's appointments |
| GET | `/api/appointments/doctor` | Get doctor's appointments |
| DELETE | `/api/appointments/:id` | Cancel appointment (patient) |
| DELETE | `/api/appointments/doctor/:id` | Cancel appointment (doctor) |

## 📱 PWA Features

This app is a Progressive Web App that can be:
- ✅ Installed on desktop and mobile devices
- ✅ Launched from home screen
- ✅ Used offline (cached pages)
- ✅ Run in standalone mode (no browser UI)

### Install the App
- **Desktop**: Click the install icon in the browser address bar
- **Mobile**: Tap "Add to Home Screen" in browser menu

## 🗃️ Database Schema

```sql
-- Patients
CREATE TABLE patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Doctors
CREATE TABLE doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  days_json TEXT NOT NULL,
  days_text TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Appointments
CREATE TABLE appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  doctor_id INTEGER NOT NULL,
  appointment_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(patient_id) REFERENCES patients(id),
  FOREIGN KEY(doctor_id) REFERENCES doctors(id)
);
```



