import React, { useState } from 'react'
import './Login.css'
import bg from '../assets/campus-bg.png'
import logo from '../assets/codtech-logo.png'
import { auth } from '../firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'

export default function Login({ onLogin, onNavigate }) {
  // selected role: 'faculty' or 'student'
  const [role, setRole] = useState('student')

  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    // Use Firebase Authentication (email + password)
    if (!email || !pw) {
      alert('Please enter email and password')
      return
    }
    try {
      await signInWithEmailAndPassword(auth, email, pw)
      if (onLogin) onLogin(role)
    } catch (err) {
      console.error('Login error', err)
      const code = err.code || 'unknown'
      alert('Login failed: ' + err.message + '\n(code: ' + code + ')')
    }
  }

  return (
    <div className="login-root">
      <div className="bg-image" style={{ backgroundImage: `url(${bg})` }} />
      <div className="auth-split">
        <aside className="visual">
          <div className="visual-inner">
            <div className="visual-top">
              <div className="logo-wrap small"><img src={logo} alt="CodTech"/></div>
            </div>
            <div className="visual-content">
              <h3>Capturing Moments,
                <br/>Creating Memories</h3>
            </div>
          </div>
        </aside>

        <section className="form-panel">
          <div className="form-card">
            <div className="form-header">
              <h1>Create a secure, quick login</h1>
              <p className="muted">Sign in to continue to CodTech</p>
            </div>

            <div className="role-switch">
              <button className={role === 'student' ? 'role active' : 'role'} onClick={() => setRole('student')}>Student</button>
              <button className={role === 'faculty' ? 'role active' : 'role'} onClick={() => setRole('faculty')}>Faculty</button>
            </div>

            <form className="form" onSubmit={handleSubmit}>
              <h2 className="form-title">{role === 'faculty' ? 'Faculty Login' : 'Student Login'}</h2>
              <input
                type="email"
                placeholder="Email address"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
              <button className="primary" type="submit">Login</button>
            </form>

            {/* Social buttons removed as requested */}

            <div className="actions-row">
              <button className="link-btn" onClick={() => onNavigate && onNavigate('register')}>Create an account</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
