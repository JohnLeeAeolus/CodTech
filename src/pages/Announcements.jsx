import React, { useState, useEffect } from 'react'
import './Announcements.css'
import UserDropdown from '../components/UserDropdown'
import { getCourseAnnouncements, createAnnouncement, updateAnnouncement, getFacultyCourses, getStudentProfile } from '../utils/firestoreHelpers'
import { auth } from '../firebase'

export default function Announcements({ onNavigate, onLogout, userType }) {
  const [announcements, setAnnouncements] = useState([])
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ title: '', content: '' })
  const [error, setError] = useState('')
  const currentUser = auth.currentUser

  // Load announcements and courses on mount
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return
      setLoading(true)
      try {
        let coursesList = []
        let allAnnouncements = []

        if (userType === 'faculty') {
          // Faculty sees their courses
          coursesList = await getFacultyCourses(currentUser.uid)
          console.log('Faculty courses:', coursesList)
          if (coursesList.length > 0) {
            setSelectedCourse(coursesList[0].id)
            const courseAnns = await getCourseAnnouncements(coursesList[0].id)
            console.log('Faculty announcements:', courseAnns)
            setAnnouncements(courseAnns)
          }
        } else {
          // Students see announcements from all their enrolled courses
          console.log('Loading student profile for:', currentUser.uid)
          const profile = await getStudentProfile(currentUser.uid)
          console.log('Student profile:', profile)
          
          if (profile?.enrolledCourses && profile.enrolledCourses.length > 0) {
            console.log('Student enrolled courses:', profile.enrolledCourses)
            // Fetch announcements from all enrolled courses
            const announcementPromises = profile.enrolledCourses.map(courseId =>
              getCourseAnnouncements(courseId).catch(err => {
                console.warn(`Error fetching announcements for course ${courseId}:`, err)
                return []
              })
            )
            const results = await Promise.all(announcementPromises)
            console.log('Raw announcement results:', results)
            allAnnouncements = results.flat()
            console.log('All announcements (flattened):', allAnnouncements)
            
            // Sort by createdAt descending
            allAnnouncements.sort((a, b) => {
              const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
              const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
              return dateB - dateA
            })
            console.log('Sorted announcements:', allAnnouncements)
            setAnnouncements(allAnnouncements)
          } else {
            console.log('No enrolled courses found or profile is null')
            setAnnouncements([])
          }
        }

        setCourses(coursesList)
      } catch (err) {
        console.error('Error loading data:', err)
        setError('Failed to load announcements')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [currentUser, userType])

  // Load announcements when course changes (faculty only)
  useEffect(() => {
    const loadAnnouncements = async () => {
      if (!selectedCourse || userType !== 'faculty') return
      setLoading(true)
      try {
        const courseAnns = await getCourseAnnouncements(selectedCourse)
        setAnnouncements(courseAnns)
      } catch (err) {
        console.error('Error loading announcements:', err)
        setError('Failed to load announcements')
      } finally {
        setLoading(false)
      }
    }

    loadAnnouncements()
  }, [selectedCourse, userType])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required')
      return
    }

    try {
      setLoading(true)
      setError('')
      if (editingId) {
        // Update existing
        await updateAnnouncement(editingId, formData)
        // Update in local state
        setAnnouncements(announcements.map(a => 
          a.id === editingId ? { ...a, ...formData, updatedAt: new Date() } : a
        ))
      } else {
        // Create new
        const newAnnouncement = await createAnnouncement(selectedCourse, {
          ...formData,
          createdAt: new Date()
        })
        // Add to top of list
        setAnnouncements([newAnnouncement, ...announcements])
      }
      setFormData({ title: '', content: '' })
      setIsEditing(false)
      setEditingId(null)
    } catch (err) {
      console.error('Error saving announcement:', err)
      setError('Failed to save announcement: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (announcement) => {
    setEditingId(announcement.id)
    setFormData({ title: announcement.title, content: announcement.content })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditingId(null)
    setFormData({ title: '', content: '' })
    setError('')
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date'
    try {
      let date
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate()
      } else if (timestamp instanceof Date) {
        date = timestamp
      } else if (typeof timestamp === 'number') {
        date = new Date(timestamp)
      } else {
        date = new Date(timestamp)
      }
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Unknown date'
    }
  }

  // Sort announcements with newest first
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    const getTime = (item) => {
      if (item.createdAt?.toDate && typeof item.createdAt.toDate === 'function') {
        return item.createdAt.toDate().getTime()
      } else if (item.createdAt instanceof Date) {
        return item.createdAt.getTime()
      } else if (typeof item.createdAt === 'number') {
        return item.createdAt
      }
      return 0
    }
    return getTime(b) - getTime(a)
  })

  return (
    <div className="ann-root">
      <header className="topbar ann-topbar">
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

      <main className="ann-main">
        <div className="ann-container">
          <div className="ann-card">
            <h1 className="ann-title">Announcements</h1>

            {error && <div className="ann-error">{error}</div>}

            {/* Course selector - Faculty only */}
            {userType === 'faculty' && courses.length > 1 && (
              <div className="ann-course-selector">
                <label htmlFor="course-select">Select Course:</label>
                <select 
                  id="course-select"
                  value={selectedCourse} 
                  onChange={e => setSelectedCourse(e.target.value)}
                  className="ann-select"
                >
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.name || course.title || course.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Teacher announcement editor */}
            {userType === 'faculty' && (
              <div className="ann-editor-section">
                {!isEditing && (
                  <button 
                    className="ann-btn-new"
                    onClick={() => setIsEditing(true)}
                  >
                    + New Announcement
                  </button>
                )}

                {isEditing && (
                  <form onSubmit={handleSubmit} className="ann-form">
                    <div className="ann-form-group">
                      <label htmlFor="title">Title</label>
                      <input
                        id="title"
                        type="text"
                        placeholder="Announcement title"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        className="ann-input"
                        disabled={loading}
                      />
                    </div>

                    <div className="ann-form-group">
                      <label htmlFor="content">Content</label>
                      <textarea
                        id="content"
                        placeholder="Announcement content"
                        value={formData.content}
                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                        className="ann-textarea"
                        rows="6"
                        disabled={loading}
                      />
                    </div>

                    <div className="ann-form-buttons">
                      <button 
                        type="submit" 
                        className="ann-btn-save"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : (editingId ? 'Update' : 'Post')}
                      </button>
                      <button 
                        type="button" 
                        className="ann-btn-cancel"
                        onClick={handleCancel}
                        disabled={loading}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Latest announcement display */}
            {sortedAnnouncements.length > 0 && (
              <div className="ann-latest">
                <div className="ann-latest-header">
                  <h2 className="ann-latest-title">{sortedAnnouncements[0].title}</h2>
                  <span className="ann-latest-date">{formatDate(sortedAnnouncements[0].createdAt)}</span>
                </div>
                <div className="ann-latest-content">
                  {sortedAnnouncements[0].content}
                </div>
                {userType === 'faculty' && (
                  <div className="ann-latest-actions">
                    <button 
                      className="ann-btn-edit"
                      onClick={() => handleEdit(sortedAnnouncements[0])}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            )}

            {sortedAnnouncements.length === 0 && !isEditing && (
              <div className="ann-empty">
                <p>{userType === 'faculty' ? 'No announcements yet. Create one!' : 'No announcements posted yet.'}</p>
              </div>
            )}

            {/* Past announcements list */}
            {sortedAnnouncements.length > 1 && (
              <div className="ann-past-section">
                <h3 className="ann-past-title">Past Announcements</h3>
                <div className="ann-past-list">
                  {sortedAnnouncements.slice(1).map(ann => (
                    <div key={ann.id} className="ann-past-item">
                      <div className="ann-past-item-header">
                        <h4 className="ann-past-item-title">{ann.title}</h4>
                        <span className="ann-past-item-date">{formatDate(ann.createdAt)}</span>
                      </div>
                      <p className="ann-past-item-content">{ann.content}</p>
                      {userType === 'faculty' && (
                        <button 
                          className="ann-btn-edit-small"
                          onClick={() => handleEdit(ann)}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
