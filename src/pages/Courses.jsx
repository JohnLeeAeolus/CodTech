import React from 'react'
import './SimplePage.css'

export default function Courses({ onNavigate }) {
  return (
    <div className="simple-root">
      <div className="simple-card">
        <h1>Courses</h1>
        <p>Courses will be listed here. This is a placeholder page.</p>
        <p><button onClick={() => onNavigate && onNavigate('dashboard')}>Back to Dashboard</button></p>
      </div>
    </div>
  )
}
