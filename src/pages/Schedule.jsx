import React from 'react'
import './SimplePage.css'

export default function Schedule({ onNavigate }) {
  return (
    <div className="simple-root">
      <div className="simple-card">
        <h1>Schedule</h1>
        <p>Schedule and calendar view placeholder.</p>
        <p><button onClick={() => onNavigate && onNavigate('dashboard')}>Back to Dashboard</button></p>
      </div>
    </div>
  )
}
