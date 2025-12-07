import React, { useState, useEffect } from 'react'
import { auth } from '../firebase'
import { getStudentProfile, getFacultyProfile } from '../utils/firestoreHelpers'

export default function UserDropdown({ userType, onNavigate, onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [displayName, setDisplayName] = useState(userType === 'faculty' ? 'Faculty' : 'Student')
  const [initial, setInitial] = useState(userType === 'faculty' ? 'F' : 'S')

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.user-dropdown')) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  // Load profile name/initial for top-right avatar
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return
      try {
        if (userType === 'faculty') {
          const profile = await getFacultyProfile(user.uid)
          const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim()
          const name = fullName || profile?.name || user.displayName || user.email?.split('@')[0] || 'Faculty'
          setDisplayName(name)
          setInitial(name.charAt(0).toUpperCase() || 'F')
        } else {
          const profile = await getStudentProfile(user.uid)
          const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim()
          const name = fullName || profile?.name || user.displayName || user.email?.split('@')[0] || 'Student'
          setDisplayName(name)
          setInitial(name.charAt(0).toUpperCase() || 'S')
        }
      } catch (err) {
        // Fallback to auth info if Firestore is unavailable
        const name = user.displayName || user.email?.split('@')[0] || (userType === 'faculty' ? 'Faculty' : 'Student')
        setDisplayName(name)
        setInitial(name.charAt(0).toUpperCase() || (userType === 'faculty' ? 'F' : 'S'))
      }
    })
    return unsubscribe
  }, [userType])

  return (
    <div className={`user-dropdown${dropdownOpen ? ' open' : ''}`} tabIndex={0}>
      <span
        className="user-mini user-avatar"
        onClick={() => setDropdownOpen(v => !v)}
      >
        {initial}
      </span>
      <span
        className="user-name"
        onClick={() => setDropdownOpen(v => !v)}
        style={{ marginLeft: 8 }}
      >
        {displayName} ▾
      </span>

      {dropdownOpen && (
        <div className="dropdown-menu">
          {userType === 'faculty' ? (
            <>
              <a
                href="#"
                className="dropdown-link"
                onClick={e => { e.preventDefault(); onNavigate && onNavigate('assignments'); setDropdownOpen(false); }}
              >
                Create Assignment
              </a>
              <a
                href="#"
                className="dropdown-link"
                onClick={e => { e.preventDefault(); onNavigate && onNavigate('submissions'); setDropdownOpen(false); }}
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
                onClick={e => { e.preventDefault(); onNavigate && onNavigate('submissions'); setDropdownOpen(false); }}
              >
                Submissions
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
