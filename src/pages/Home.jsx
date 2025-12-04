import React from 'react'
import './SimplePage.css'

export default function Home({ onNavigate }) {
  return (
    <div className="simple-root">
      <div className="simple-card">
        <h1>Welcome</h1>
        <p>This is the Home page. Use the navigation to go around.</p>
        <p><button onClick={() => onNavigate && onNavigate('dashboard')}>Go to Dashboard</button></p>
      </div>
    </div>
  )
}
