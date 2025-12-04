import React, { useState, useEffect } from 'react'
import './FacultyProfile.css'
import logo from '../assets/codtech-logo.png'

export default function FacultyProfile({ onBack, onNavigate, onLogout }) {
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState('Name of Student/Faculty');
  const [email, setEmail] = useState('student.facultyEmail@example.com.ph');
  const [newName, setNewName] = useState(name);
  const [newEmail, setNewEmail] = useState(email);

  const openEdit = () => {
    setNewName(name);
    setNewEmail(email);
    setEditOpen(true);
  };
  const closeEdit = () => setEditOpen(false);
  const saveEdit = () => {
    setName(newName);
    setEmail(newEmail);
    setEditOpen(false);
  };
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.user-dropdown')) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  return (
    <div className="profile-root">
      <header className="topbar profile-topbar">
        <div className="topbar-left">
          <div className="unilearn-title">
            <span className="unilearn-bold">UniLearn Nexus</span>
            <span className="unilearn-sub">Learning Management Systems</span>
          </div>
          <nav className="nav-links">
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('home')}}>Home</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('dashboard')}}>Dashboard</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('courses')}}>Courses</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('schedule')}}>Schedule</a>
          </nav>
        </div>
        <div className="topbar-center">
          <div className="logo-circle">
            <img src={logo} alt="CodTech" />
          </div>
          <div className="codtech-title">CodTech</div>
        </div>
        <div className="topbar-right">
          <div className={`user-dropdown${dropdownOpen ? ' open' : ''}`} tabIndex={0}>
            <span className="user-mini user-avatar" onClick={() => setDropdownOpen(v => !v)}>F</span>
            <span className="user-name" onClick={() => setDropdownOpen(v => !v)} style={{marginLeft:8}}>Faculty Name ▾</span>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-title">Quick Nav</div>
                <a href="#" className="dropdown-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('recent'); setDropdownOpen(false);}}>Recent Activities</a>
                <a href="#" className="dropdown-link" onClick={e => {e.preventDefault(); alert('Assignment creation coming soon!'); setDropdownOpen(false);}}>Assignment Creation</a>
                <a href="#" className="dropdown-link" onClick={e => {e.preventDefault(); alert('Submissions management coming soon!'); setDropdownOpen(false);}}>Submissions</a>
                <a href="#" className="dropdown-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('facultyProfile'); setDropdownOpen(false);}}>Profile</a>
                <a href="#" className="dropdown-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('announcements'); setDropdownOpen(false);}}>Announcements</a>
                <div className="dropdown-divider"></div>
                <a href="#" className="dropdown-link logout-link" onClick={e => {e.preventDefault(); onLogout && onLogout(); setDropdownOpen(false);}}>Logout</a>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="profile-main">
        <div className="profile-header">
          <div className="profile-logo">
            <img src={logo} alt="logo" />
          </div>
          <div className="avatar">A</div>
          <div className="role">Faculty</div>
          <div className="full-name">{name}</div>
          <button className="edit-btn" onClick={openEdit}>Edit Profile</button>
        </div>

        <section className="profile-card">
          <div className="cols">
            <div className="col">
              <h4>User details</h4>
              <div className="row"><div className="k">Email address</div><div className="v">{email}</div></div>
              <div className="row"><div className="k">Country</div><div className="v">Philippines</div></div>
              <div className="row"><div className="k">City/town</div><div className="v">Quezon City</div></div>
              <div className="row"><div className="k">Timezone</div><div className="v">Asia/Manila</div></div>
            </div>

            <div className="col">
              <h4>Miscellaneous</h4>
              <div className="row"><div className="k">Misc</div><div className="v">Miscellaneous</div></div>
              <div className="row"><div className="k">Misc</div><div className="v">Miscellaneous</div></div>
              <div className="row"><div className="k">Misc</div><div className="v">Miscellaneous</div></div>
              <div className="row"><div className="k">Misc</div><div className="v">Miscellaneous</div></div>
            </div>

            <div className="col">
              <h4>Login Activity</h4>
              <div className="row"><div className="k">Logged In at:</div><div className="v">Login location</div></div>
              <div className="row"><div className="k">Last Logged in:</div><div className="v">Last Log</div></div>
              <div className="row"><div className="k">Logged In devices:</div><div className="v">Login Device</div></div>
            </div>

            <div className="col">
              <h4>Courses</h4>
              <div className="row"><div className="v">Courses will be listed here</div></div>
              <div className="row"><div className="v">Courses will be listed here</div></div>
              <div className="row"><div className="v">Courses will be listed here</div></div>
            </div>

            <div className="col small">
              <h4>Grades/My Grades</h4>
              <div className="row"><div className="v">Grades</div></div>
              <div className="row"><div className="v">Grades overview</div></div>
            </div>
          </div>
        </section>
      </main>
      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Edit Profile</h3>
            <div className="modal-row">
              <label>Name:</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="modal-row">
              <label>Email:</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button onClick={saveEdit}>Save</button>
              <button onClick={closeEdit}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
