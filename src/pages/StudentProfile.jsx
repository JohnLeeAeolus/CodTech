import React, { useState, useEffect } from 'react'
import './StudentProfile.css'
import UserDropdown from '../components/UserDropdown'
import { auth } from '../firebase'
import { getStudentProfile, updateStudentProfile, createStudentProfile } from '../utils/firestoreHelpers'

export default function StudentProfile({ onNavigate, onLogout, userType }) {
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    country: '',
    city: '',
    timezone: 'Asia/Manila'
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState(profileData);
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)

  // Load student profile from Firestore
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && userType === 'student') {
        setCurrentUser(user)
        console.log('🔵 Loading student profile for:', user.uid)
        try {
          const profile = await getStudentProfile(user.uid)
          console.log('✓ Loaded student profile:', profile)
          if (!profile) {
            // create a default profile using auth data
            const defaultProfile = {
              name: user.displayName || 'Student',
              email: user.email || '',
              country: '',
              city: '',
              timezone: 'Asia/Manila'
            }
            await createStudentProfile(user.uid, {
              ...defaultProfile,
              firstName: defaultProfile.name.split(' ')[0],
              lastName: defaultProfile.name.split(' ').slice(1).join(' ')
            })
            setProfileData(defaultProfile)
            setEditData(defaultProfile)
          } else {
            const mergedProfile = {
              name: profile?.name || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() || user.displayName || 'Student',
              email: profile?.email || user.email || '',
              country: profile?.country || '',
              city: profile?.city || '',
              timezone: profile?.timezone || 'Asia/Manila'
            }
            setProfileData(mergedProfile)
            setEditData(mergedProfile)
          }
        } catch (error) {
          console.error('❌ Error loading student profile:', error)
          // Use Firebase auth data as fallback
          const defaultProfile = {
            name: user.displayName || 'Student',
            email: user.email || '',
            country: '',
            city: '',
            timezone: 'Asia/Manila'
          }
          setProfileData(defaultProfile)
          setEditData(defaultProfile)
        }
      }
      setLoading(false)
    })
    return unsubscribe
  }, [userType])

  const handleEditClick = () => {
    setIsEditMode(true);
    setEditData(profileData);
  };

  const handleCancel = () => {
    setIsEditMode(false);
  };

  const handleSave = async () => {
    if (!currentUser) return
    try {
      const [firstName, ...rest] = (editData.name || '').trim().split(' ')
      await updateStudentProfile(currentUser.uid, {
        ...editData,
        firstName: firstName || editData.name,
        lastName: rest.join(' ')
      })
      setProfileData(editData);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile changes')
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="student-profile-root">
      <header className="topbar sp-topbar">
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
          <div className="notification-icon">🔔</div>
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <main className="sp-main">
        <div className="sp-container">
          {/* Profile Header */}
          <div className="profile-header">
            <div className="avatar-section">
              <div className="avatar-large">{(profileData.name || 'S').charAt(0).toUpperCase()}</div>
              <div className="profile-info-main">
                <p className="role-label">Student</p>
                <p className="name-display">{profileData.name || 'Student'}</p>
              </div>
            </div>
            <button className="edit-profile-btn" onClick={handleEditClick}>
              Edit Profile
            </button>
          </div>

          {/* Edit Modal */}
          {isEditMode && (
            <div className="edit-modal-overlay" onClick={handleCancel}>
              <div className="edit-modal" onClick={e => e.stopPropagation()}>
                <h2>Edit Profile</h2>
                <div className="edit-form">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      name="name"
                      value={editData.name}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input
                      type="text"
                      name="country"
                      value={editData.country}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>City/Town</label>
                    <input
                      type="text"
                      name="city"
                      value={editData.city}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Timezone</label>
                    <input
                      type="text"
                      name="timezone"
                      value={editData.timezone}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="modal-buttons">
                    <button className="btn-save" onClick={handleSave}>Save Changes</button>
                    <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Content */}
          <div className="profile-content">
            <div className="content-section user-details">
              <h3>User details</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <p className="detail-label">Email address</p>
                  <p className="detail-value">{profileData.email || 'N/A'}</p>
                </div>
                <div className="detail-item">
                  <p className="detail-label">Country</p>
                  <p className="detail-value">{profileData.country || 'N/A'}</p>
                </div>
                <div className="detail-item">
                  <p className="detail-label">City/town</p>
                  <p className="detail-value">{profileData.city || 'N/A'}</p>
                </div>
                <div className="detail-item">
                  <p className="detail-label">Timezone</p>
                  <p className="detail-value">{profileData.timezone || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="content-section miscellaneous">
              <h3>Miscellaneous</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <p className="detail-label">Misc</p>
                  <p className="detail-value">Miscellaneous</p>
                </div>
                <div className="detail-item">
                  <p className="detail-label">Misc</p>
                  <p className="detail-value">Miscellaneous</p>
                </div>
                <div className="detail-item">
                  <p className="detail-label">Misc</p>
                  <p className="detail-value">Miscellaneous</p>
                </div>
                <div className="detail-item">
                  <p className="detail-label">Misc</p>
                  <p className="detail-value">Miscellaneous</p>
                </div>
              </div>
            </div>

            <div className="content-section login-activity">
              <h3>Login Activity</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <p className="detail-label">Logged in at:</p>
                  <p className="detail-value">Login location</p>
                </div>
                <div className="detail-item">
                  <p className="detail-label">Last Logged In:</p>
                  <p className="detail-value">Last Log</p>
                </div>
                <div className="detail-item">
                  <p className="detail-label">Logged in devices:</p>
                  <p className="detail-value">
                    Login Device<br />
                    Login Device<br />
                    Login Device
                  </p>
                </div>
              </div>
            </div>

            <div className="content-section courses">
              <h3>Courses</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <p className="detail-label">Courses will be listed here</p>
                  <p className="detail-value">Courses will be listed here</p>
                </div>
                <div className="detail-item">
                  <p className="detail-label">Courses will be listed here</p>
                  <p className="detail-value">Courses will be listed here</p>
                </div>
                <div className="detail-item">
                  <p className="detail-label">Courses will be listed here</p>
                  <p className="detail-value">Courses will be listed here</p>
                </div>
                <div className="detail-item">
                  <p className="detail-label">Courses will be listed here</p>
                  <p className="detail-value">Courses will be listed here</p>
                </div>
              </div>
            </div>

            <div className="content-section grades">
              <h3>Grades/My Grades</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <p className="detail-label">Grades</p>
                  <p className="detail-value">—</p>
                </div>
                <div className="detail-item">
                  <p className="detail-label">Grades overview</p>
                  <p className="detail-value">—</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
