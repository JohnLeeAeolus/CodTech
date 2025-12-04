import React, { useState, useEffect } from 'react'

export default function UserDropdown({ userType, onNavigate, onLogout }) {
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
    <div className={`user-dropdown${dropdownOpen ? ' open' : ''}`} tabIndex={0}>
      <span
        className="user-mini user-avatar"
        onClick={() => setDropdownOpen(v => !v)}
      >
        {userType === 'faculty' ? 'F' : 'A'}
      </span>
      <span
        className="user-name"
        onClick={() => setDropdownOpen(v => !v)}
        style={{ marginLeft: 8 }}
      >
        {userType === 'faculty' ? 'Faculty Name' : 'Student Name'} ▾
      </span>

      {dropdownOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-title">Quick Nav</div>

          <a
            href="#"
            className="dropdown-link"
            onClick={e => { e.preventDefault(); onNavigate && onNavigate('recent'); setDropdownOpen(false); }}
          >
            Recent Activities
          </a>

          {userType === 'faculty' ? (
            <>
              <a
                href="#"
                className="dropdown-link"
                onClick={e => { e.preventDefault(); alert('Assignment creation coming soon!'); setDropdownOpen(false); }}
              >
                Assignment Creation
              </a>
              <a
                href="#"
                className="dropdown-link"
                onClick={e => { e.preventDefault(); alert('Submissions management coming soon!'); setDropdownOpen(false); }}
              >
                Submissions
              </a>
              <a
                href="#"
                className="dropdown-link"
                onClick={e => { e.preventDefault(); onNavigate && onNavigate('facultyProfile'); setDropdownOpen(false); }}
              >
                Profile
              </a>
            </>
          ) : (
            <>
              <a
                href="#"
                className="dropdown-link"
                onClick={e => { e.preventDefault(); onNavigate && onNavigate('assignments'); setDropdownOpen(false); }}
              >
                Assignments
              </a>
              <a
                href="#"
                className="dropdown-link"
                onClick={e => { e.preventDefault(); onNavigate && onNavigate('studentProfile'); setDropdownOpen(false); }}
              >
                Profile
              </a>
            </>
          )}

          <a
            href="#"
            className="dropdown-link"
            onClick={e => { e.preventDefault(); onNavigate && onNavigate('announcements'); setDropdownOpen(false); }}
          >
            Announcements
          </a>

          <div className="dropdown-divider"></div>

          <a
            href="#"
            className="dropdown-link logout-link"
            onClick={e => { e.preventDefault(); onLogout && onLogout(); setDropdownOpen(false); }}
          >
            Logout
          </a>
        </div>
      )}
    </div>
  );
}
