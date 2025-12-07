import React, { useState, useEffect } from 'react'
import './FacultyProfile.css'
import UserDropdown from '../components/UserDropdown'
import { auth } from '../firebase'
import { getFacultyProfile, updateFacultyProfile, createFacultyProfile } from '../utils/firestoreHelpers'

export default function FacultyProfile({ onBack, onNavigate, onLogout, userType }) {
  const [editOpen, setEditOpen] = useState(false);
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('Faculty')
  const [email, setEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [currentUser, setCurrentUser] = useState(null)

  // Initialize and load data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && userType === 'faculty') {
        setCurrentUser(user)
        console.log('🔵 Loading faculty profile for:', user.uid)
        await loadFacultyProfile(user)
      } else {
        setLoading(false)
      }
    })
    return unsubscribe
  }, [userType])

  const loadFacultyProfile = async (user) => {
    try {
      const profileData = await getFacultyProfile(user.uid)
      console.log('✓ Loaded faculty profile:', profileData)
      if (!profileData) {
        const defaultName = user.displayName || 'Faculty'
        const nameParts = defaultName.trim().split(' ')
        const firstName = nameParts[0]
        const lastName = nameParts.slice(1).join(' ')
        const defaultProfile = {
          firstName,
          lastName,
          name: defaultName,
          email: user.email || '',
          country: '',
          city: '',
          timezone: 'Asia/Manila'
        }
        await createFacultyProfile(user.uid, defaultProfile)
        setProfile({ country: '', city: '', timezone: 'Asia/Manila' })
        setName(defaultName)
        setNewName(defaultName)
        setEmail(user.email || '')
        setNewEmail(user.email || '')
      } else {
        const fullName = `${profileData?.firstName || ''} ${profileData?.lastName || ''}`.trim()
        const resolvedName = fullName || profileData?.name || user.displayName || 'Faculty'
        const resolvedEmail = profileData?.email || user.email || ''
        setProfile({
          country: profileData?.country || '',
          city: profileData?.city || '',
          timezone: profileData?.timezone || 'Asia/Manila'
        })
        setName(resolvedName)
        setNewName(resolvedName)
        setEmail(resolvedEmail)
        setNewEmail(resolvedEmail)
      }
      setLoading(false)
    } catch (error) {
      console.error('❌ Error loading faculty profile:', error)
      // Use Firebase auth data as fallback
      setName(user?.displayName || 'Faculty')
      setNewName(user?.displayName || 'Faculty')
      setEmail(user?.email || '')
      setNewEmail(user?.email || '')
      setLoading(false)
    }
  }

  const openEdit = () => {
    setNewName(name);
    setNewEmail(email);
    setEditOpen(true);
  };

  const closeEdit = () => setEditOpen(false);

  const saveEdit = async () => {
    try {
      const nameParts = newName.trim().split(' ')
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(' ')
      await updateFacultyProfile(currentUser.uid, {
        firstName: firstName || newName,
        lastName,
        email: newEmail
      })
      setName(newName);
      setEmail(newEmail);
      setEditOpen(false);
      alert('Profile updated successfully!')
    } catch (error) {
      alert('Error updating profile: ' + error.message)
    }
  };

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
        <div className="topbar-right">
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <main className="profile-main">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            <p>Loading profile...</p>
          </div>
        ) : (
          <>
            <div className="profile-header">
              <div className="avatar">{(name || 'F').charAt(0).toUpperCase()}</div>
              <div className="role">Faculty</div>
              <div className="full-name">{name || 'Faculty'}</div>
              <button className="edit-btn" onClick={openEdit}>Edit Profile</button>
            </div>

            <section className="profile-card">
          <div className="cols">
            <div className="col">
              <h4>User details</h4>
              <div className="row"><div className="k">Email address</div><div className="v">{email || 'N/A'}</div></div>
              <div className="row"><div className="k">Country</div><div className="v">{profile?.country || 'N/A'}</div></div>
              <div className="row"><div className="k">City/town</div><div className="v">{profile?.city || 'N/A'}</div></div>
              <div className="row"><div className="k">Timezone</div><div className="v">{profile?.timezone || 'Asia/Manila'}</div></div>
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
          </>
        )}
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
