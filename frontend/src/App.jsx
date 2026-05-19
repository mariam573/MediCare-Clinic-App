import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5050';

// ============== AUTH CONTEXT ==============
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('currentUser') || 'null'));

  const saveSession = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    setToken(data.token);
    setCurrentUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    setToken(null);
    setCurrentUser(null);
  };

  const isPatient = () => token && currentUser?.role === 'patient';
  const isDoctor = () => token && currentUser?.role === 'doctor';

  return (
    <AuthContext.Provider value={{ token, currentUser, saveSession, logout, isPatient, isDoctor }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// ============== COMPONENTS ==============
const Header = ({ variant = 'public' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  if (variant === 'public') {
    return (
      <header>
        <div className="container nav-flex">
          <Link to="/" className="logo"><img src="/icon.svg" alt="MediCare" style={{ width: '28px', height: '28px' }} /> MediCare</Link>
          <nav>
            <ul>
              <li><Link to="/" className={isActive('/')}>Home</Link></li>
              <li><Link to="/booking" className={isActive('/booking')}>Book Now</Link></li>
              <li><Link to="/login" className={isActive('/login')}>Login</Link></li>
            </ul>
          </nav>
        </div>
      </header>
    );
  }

  if (variant === 'booking') {
    return (
      <header>
        <div className="container nav-flex">
          <Link to="/" className="logo"><img src="/icon.svg" alt="MediCare" style={{ width: '28px', height: '28px' }} /> MediCare</Link>
          <nav>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/booking" className="active">Book Now</Link></li>
              <li><Link to="/patient-dashboard">My Dashboard</Link></li>
            </ul>
          </nav>
        </div>
      </header>
    );
  }

  if (variant === 'patient' || variant === 'doctor') {
    return (
      <header>
        <div className="container nav-flex">
          <Link to="/" className="logo">
            <img src="/icon.svg" alt="MediCare" style={{ width: '28px', height: '28px' }} /> MediCare {variant === 'doctor' && <span style={{ fontSize: '0.8rem', marginLeft: '5px', color: '#666' }}>(Doctor Portal)</span>}
          </Link>
          <nav>
            <ul>
              <li><button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-color)', fontWeight: 500, cursor: 'pointer', fontSize: '1rem' }}>Log Out</button></li>
            </ul>
          </nav>
        </div>
      </header>
    );
  }
  return null;
};

const StatusModal = ({ isOpen, type, title, message, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="modal">
      <div className="modal-content">
        <span style={{ fontSize: '3rem', color: type === 'error' ? '#ff4444' : 'green' }}>
          {type === 'error' ? '⚠' : '✔'}
        </span>
        <h3>{title}</h3>
        <p style={{ margin: '15px 0', color: '#555' }}>{message}</p>
        <button className="btn btn-full" onClick={onClose}>OK</button>
      </div>
    </div>
  );
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="modal">
      <div className="modal-content">
        <span style={{ fontSize: '3rem', color: '#ff4444' }}>⚠</span>
        <h3>{title || 'Cancel Appointment?'}</h3>
        <p>{message || 'Are you sure?'}</p>
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={onConfirm}>Yes, Cancel It</button>
          <button className="btn btn-secondary" onClick={onCancel}>No, Keep It</button>
        </div>
      </div>
    </div>
  );
};

// ============== PAGES ==============
const HomePage = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/doctors`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => { setDoctors(data.doctors || []); setLoading(false); })
      .catch(() => { setError('Failed to load doctors. Make sure backend is running on port 5050.'); setLoading(false); });
  }, []);

  return (
    <>
      <Header variant="public" />
      <main className="container">
        <section className="hero">
          <h1>Your Health, Our Priority</h1>
          <p>Book appointments with the best specialists in the city.</p>
          <Link to="/booking" className="btn">Book Appointment Now</Link>
        </section>
        <section>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Meet Our Specialists</h2>
          <div className="grid-layout">
            {loading && <p>Loading doctors...</p>}
            {error && <p>{error}</p>}
            {!loading && !error && doctors.length === 0 && <p>No doctors available.</p>}
            {doctors.map(d => (
              <div key={d.id} className="card">
                <h3>{d.name}</h3>
                <span>{d.specialty}</span>
                <p style={{ marginTop: '5px', fontSize: '0.9rem', color: '#666' }}>Available: {d.daysText}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { saveSession } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', callback: null });
  const [form, setForm] = useState({ loginEmail: '', loginPassword: '', signupName: '', signupEmail: '', signupPassword: '', docEmail: '', docPassword: '' });

  const showModal = (type, title, message, callback = null) => setModal({ isOpen: true, type, title, message, callback });
  const closeModal = () => { const cb = modal.callback; setModal({ ...modal, isOpen: false }); if (cb) cb(); };

  const handlePatientLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/auth/patient/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.loginEmail.trim(), password: form.loginPassword.trim() })
      });
      if (!res.ok) { showModal('error', 'Login Failed', await res.text() || 'Invalid credentials.'); return; }
      saveSession(await res.json());
      navigate('/patient-dashboard');
    } catch { showModal('error', 'Error', 'Could not connect to server.'); }
  };

  const handlePatientSignup = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/auth/patient/signup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: form.signupName.trim(), email: form.signupEmail.trim(), password: form.signupPassword.trim() })
      });
      if (!res.ok) { showModal('error', 'Sign Up Failed', await res.text() || 'Could not create account.'); return; }
      showModal('success', 'Account Created', 'Now login as patient.', () => { setActiveTab('login'); setForm({ ...form, loginEmail: form.signupEmail.trim(), loginPassword: '' }); });
    } catch { showModal('error', 'Error', 'Could not connect to server.'); }
  };

  const handleDoctorLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/auth/doctor/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.docEmail.trim(), password: form.docPassword.trim() })
      });
      if (!res.ok) { showModal('error', 'Login Failed', await res.text() || 'Invalid credentials.'); return; }
      saveSession(await res.json());
      navigate('/doctor-dashboard');
    } catch { showModal('error', 'Error', 'Could not connect to server.'); }
  };

  return (
    <>
      <Header variant="public" />
      <main className="container">
        <div className="form-box">
          <div className="tabs">
            <button className={`tab-btn ${activeTab === 'login' ? 'active-tab' : ''}`} onClick={() => setActiveTab('login')}>Patient Login</button>
            <button className={`tab-btn ${activeTab === 'signup' ? 'active-tab' : ''}`} onClick={() => setActiveTab('signup')}>Patient Sign Up</button>
            <button className={`tab-btn ${activeTab === 'doctor' ? 'active-tab' : ''}`} onClick={() => setActiveTab('doctor')}>Doctor Login</button>
          </div>

          <div className={`tab-content ${activeTab === 'login' ? 'active-content' : ''}`}>
            <form onSubmit={handlePatientLogin}>
              <label>Email</label>
              <input type="email" placeholder="patient@test.com" value={form.loginEmail} onChange={e => setForm({ ...form, loginEmail: e.target.value })} required />
              <label>Password</label>
              <input type="password" placeholder="123" value={form.loginPassword} onChange={e => setForm({ ...form, loginPassword: e.target.value })} required />
              <button type="submit" className="btn btn-full">Login as Patient</button>
            </form>
          </div>

          <div className={`tab-content ${activeTab === 'signup' ? 'active-content' : ''}`}>
            <form onSubmit={handlePatientSignup}>
              <label>Full Name</label>
              <input type="text" placeholder="John Doe" value={form.signupName} onChange={e => setForm({ ...form, signupName: e.target.value })} required />
              <label>Email Address</label>
              <input type="email" placeholder="john@example.com" value={form.signupEmail} onChange={e => setForm({ ...form, signupEmail: e.target.value })} required />
              <label>Create Password</label>
              <input type="password" placeholder="Min 3 chars" minLength="3" value={form.signupPassword} onChange={e => setForm({ ...form, signupPassword: e.target.value })} required />
              <button type="submit" className="btn btn-full">Create Account</button>
            </form>
          </div>

          <div className={`tab-content ${activeTab === 'doctor' ? 'active-content' : ''}`}>
            <form onSubmit={handleDoctorLogin}>
              <label>Doctor Email</label>
              <input type="email" placeholder="dr.omar@medicare.com" value={form.docEmail} onChange={e => setForm({ ...form, docEmail: e.target.value })} required />
              <label>License / Password</label>
              <input type="password" placeholder="doc123" value={form.docPassword} onChange={e => setForm({ ...form, docPassword: e.target.value })} required />
              <button type="submit" className="btn btn-full" style={{ backgroundColor: '#008080' }}>Login as Doctor</button>
            </form>
          </div>
        </div>
      </main>
      <StatusModal isOpen={modal.isOpen} type={modal.type} title={modal.title} message={modal.message} onClose={closeModal} />
    </>
  );
};

const BookingPage = () => {
  const navigate = useNavigate();
  const { token, currentUser, isPatient } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '' });

  useEffect(() => {
    if (!token || !isPatient()) { navigate('/login'); return; }
    fetch(`${API_BASE}/api/doctors`)
      .then(res => res.json())
      .then(data => { setDoctors(data.doctors || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, navigate, isPatient]);

  const showModal = (type, title, message) => setModal({ isOpen: true, type, title, message });
  const closeModal = () => setModal({ isOpen: false, type: '', title: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctor) { showModal('error', 'Error', 'Please choose a doctor.'); return; }
    if (!selectedDate) { showModal('error', 'Error', 'Please choose a date.'); return; }

    // Find the selected doctor
    const doctor = doctors.find(d => d.id === Number(selectedDoctor));
    if (!doctor) { showModal('error', 'Error', 'Doctor not found.'); return; }

    // Check if selected date is on doctor's available day
    const selectedDateObj = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = selectedDateObj.getDay(); // 0=Sunday, 1=Monday, etc.

    if (!doctor.days.includes(dayOfWeek)) {
      showModal('error', 'Not Available', `${doctor.name} is only available on ${doctor.daysText}. Please select a different date.`);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ doctor_id: Number(selectedDoctor), appointment_date: selectedDate })
      });
      if (!res.ok) { showModal('error', 'Booking Failed', await res.text() || 'Could not book appointment.'); return; }
      navigate('/patient-dashboard');
    } catch { showModal('error', 'Error', 'Could not connect to server.'); }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      <Header variant="booking" />
      <main className="container">
        <div className="form-box">
          <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Book Appointment</h2>
          <p style={{ textAlign: 'center', color: '#0066cc', marginBottom: '20px', fontWeight: 'bold' }}>
            {currentUser?.name ? `Logged in as: ${currentUser.name}` : ''}
          </p>
          <form onSubmit={handleSubmit}>
            <label>Select Doctor & Schedule</label>
            <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)} required disabled={loading}>
              {loading ? <option value="">Loading doctors...</option> : doctors.length === 0 ? <option value="">No doctors available</option> : (
                <><option value="">-- Choose a Specialist --</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name} — {d.specialty} ({d.daysText})</option>)}</>
              )}
            </select>
            <label>Select Date</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} min={today} required />
            <button type="submit" className="btn btn-full">Confirm Booking</button>
          </form>
        </div>
      </main>
      <StatusModal isOpen={modal.isOpen} type={modal.type} title={modal.title} message={modal.message} onClose={closeModal} />
    </>
  );
};

const PatientDashboard = () => {
  const navigate = useNavigate();
  const { token, currentUser, isPatient } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
  const [settingsModal, setSettingsModal] = useState(false);

  const loadAppointments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/appointments/patient`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setAppointments(data.appointments || []);
      setLoading(false);
    } catch { setLoading(false); }
  };

  useEffect(() => {
    if (!token || !isPatient()) { navigate('/login'); return; }
    loadAppointments();
  }, [token, navigate, isPatient]);

  const handleConfirmCancel = async () => {
    const id = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null });
    try {
      await fetch(`${API_BASE}/api/appointments/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      loadAppointments();
    } catch {}
  };

  const upcomingCount = appointments.filter(a => a.status === 'booked').length;

  return (
    <>
      <Header variant="patient" />
      <main className="container" style={{ marginTop: '40px' }}>
        <h1>Welcome, {currentUser?.name || 'Patient'}</h1>
        <div className="grid-layout">
          <div className="card">
            <h3>My Appointments</h3>
            <p><strong style={{ fontSize: '1.5rem', color: '#0066cc' }}>{upcomingCount}</strong> Upcoming</p>
            <br /><Link to="/booking" className="btn">Book New</Link>
          </div>
          <div className="card"><h3>Medical History</h3><p>No history available.</p></div>
          <div className="card">
            <h3>Profile Settings</h3><p>Update your email or password.</p><br />
            <button className="btn" style={{ background: '#555' }} onClick={() => setSettingsModal(true)}>Edit Profile</button>
          </div>
        </div>
        <div className="appt-list">
          <h2>Upcoming Appointments</h2>
          {loading && <p>Loading...</p>}
          {!loading && appointments.filter(a => a.status === 'booked').length === 0 && <p>No upcoming appointments.</p>}
          {appointments.filter(a => a.status === 'booked').map(a => (
            <div key={a.id} className="appointment-card">
              <h4>{a.doctor_name}</h4>
              <p>{a.specialty}</p>
              <p>Date: {a.appointment_date}</p>
              <button className="btn cancel-btn" onClick={() => setConfirmModal({ isOpen: true, id: a.id })}>Cancel</button>
            </div>
          ))}
        </div>

        {appointments.filter(a => a.status === 'cancelled').length > 0 && (
          <div className="appt-list" style={{ marginTop: '20px', opacity: 0.7 }}>
            <h2>Cancelled Appointments</h2>
            {appointments.filter(a => a.status === 'cancelled').map(a => (
              <div key={a.id} className="appointment-card" style={{ background: '#f5f5f5' }}>
                <h4 style={{ color: '#999' }}>{a.doctor_name}</h4>
                <p>{a.specialty}</p>
                <p>Date: {a.appointment_date}</p>
                <p style={{ color: '#ff4444' }}>Status: Cancelled</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {settingsModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Update Profile</h3>
            <form onSubmit={e => { e.preventDefault(); setSettingsModal(false); }}>
              <label>New Email</label><input type="email" required />
              <label>New Password</label><input type="password" placeholder="New Password" required />
              <button type="submit" className="btn btn-full">Save Changes</button>
              <button type="button" className="btn btn-full" style={{ background: '#999', marginTop: '5px' }} onClick={() => setSettingsModal(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal isOpen={confirmModal.isOpen} title="Cancel Appointment?" message="Are you sure you want to remove this appointment?"
        onConfirm={handleConfirmCancel} onCancel={() => setConfirmModal({ isOpen: false, id: null })} />
    </>
  );
};

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { token, currentUser, isDoctor } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  const loadAppointments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/appointments/doctor`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setAppointments(data.appointments || []);
      setLoading(false);
    } catch { setLoading(false); }
  };

  useEffect(() => {
    if (!token || !isDoctor()) { navigate('/login'); return; }
    loadAppointments();
  }, [token, navigate, isDoctor]);

  const handleConfirmCancel = async () => {
    const id = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null });
    try {
      await fetch(`${API_BASE}/api/appointments/doctor/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      loadAppointments();
    } catch {}
  };

  const upcomingCount = appointments.filter(a => a.status === 'booked').length;

  return (
    <>
      <Header variant="doctor" />
      <main className="container" style={{ marginTop: '40px' }}>
        <h1>Welcome, {currentUser?.name || 'Doctor'}</h1>
        <div className="grid-layout">
          <div className="card"><h3>My Schedule</h3><p><strong style={{ fontSize: '1.5rem', color: '#0066cc' }}>{upcomingCount}</strong> Upcoming Appointments</p></div>
          <div className="card"><h3>Status</h3><p>🟢 Active & Online</p></div>
        </div>
        <div className="appt-list">
          <h2>Upcoming Patients</h2>
          {loading && <p>Loading...</p>}
          {!loading && appointments.filter(a => a.status === 'booked').length === 0 && <p>No upcoming appointments.</p>}
          {appointments.filter(a => a.status === 'booked').map(a => (
            <div key={a.id} className="appointment-card">
              <h4>Patient: {a.patient_name}</h4>
              <p>Date: {a.appointment_date}</p>
              <button className="btn cancel-btn" onClick={() => setConfirmModal({ isOpen: true, id: a.id })}>Cancel</button>
            </div>
          ))}
        </div>

        {appointments.filter(a => a.status === 'cancelled').length > 0 && (
          <div className="appt-list" style={{ marginTop: '20px', opacity: 0.7 }}>
            <h2>Cancelled Appointments</h2>
            {appointments.filter(a => a.status === 'cancelled').map(a => (
              <div key={a.id} className="appointment-card" style={{ background: '#f5f5f5' }}>
                <h4 style={{ color: '#999' }}>Patient: {a.patient_name}</h4>
                <p>Date: {a.appointment_date}</p>
                <p style={{ color: '#ff4444' }}>Status: Cancelled</p>
              </div>
            ))}
          </div>
        )}
      </main>
      <ConfirmModal isOpen={confirmModal.isOpen} title="Cancel Appointment?" message="Are you sure you want to cancel this patient's appointment?"
        onConfirm={handleConfirmCancel} onCancel={() => setConfirmModal({ isOpen: false, id: null })} />
    </>
  );
};

// ============== APP ==============
function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/patient-dashboard" element={<PatientDashboard />} />
        <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
