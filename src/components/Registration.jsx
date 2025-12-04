import React, { useState } from 'react'
import './Registration.css'
import bg from '../assets/campus-bg.png'
import logo from '../assets/codtech-logo.png'
import { db, auth } from '../firebase'
import { collection, doc, setDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'

export default function Registration({ onNavigate }) {
  const [role, setRole] = useState('student')
  const [name, setName] = useState('')
  const [id, setId] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !pw) {
      alert('Please provide email and password')
      return
    }
    try {
      // create auth user
      const cred = await createUserWithEmailAndPassword(auth, email, pw)
      const uid = cred.user.uid
      // store profile in Firestore under students/{uid} or faculty/{uid}
      const col = role === 'faculty' ? 'faculty' : 'students'
      await setDoc(doc(db, col, uid), {
        uid,
        name,
        id,
        email,
        createdAt: new Date().toISOString()
      })
      alert(`Registered ${role} successfully.`)
      if (onNavigate) onNavigate('login')
    } catch (err) {
      console.error('Registration error', err)
      const code = err.code || 'unknown'
      alert('Registration failed: ' + err.message + '\n(code: ' + code + ')')
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
              <h3>Welcome to CodTech</h3>
            </div>
          </div>
        </aside>

        <section className="form-panel">
          <div className="form-card">
            <div className="form-header">
              <h1>Create an account</h1>
              <p className="muted">Already have an account? <button className="link-btn" onClick={() => onNavigate && onNavigate('login')}>Log in</button></p>
            </div>

            <div className="role-switch">
              <button className={role === 'student' ? 'role active' : 'role'} onClick={() => setRole('student')}>Student</button>
              <button className={role === 'faculty' ? 'role active' : 'role'} onClick={() => setRole('faculty')}>Faculty</button>
            </div>

            <form className="form" onSubmit={handleSubmit}>
              <h2 className="form-title">{role === 'faculty' ? 'Faculty Registration' : 'Student Registration'}</h2>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last name" autoComplete="name" />
              <input value={id} onChange={(e) => setId(e.target.value)} placeholder={role === 'faculty' ? 'Faculty ID' : 'Student ID'} autoComplete="organization" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" />
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Create a password" autoComplete="new-password" />
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <input type="checkbox" id="agree" defaultChecked style={{width:18,height:18}} />
                <label htmlFor="agree" style={{color:'rgba(255, 255, 255, 0.6)'}}>I agree to the Terms & Conditions</label>
              </div>
              <button className="primary" type="submit">Create account</button>
            </form>

            {/* Social buttons removed as requested */}

            <div className="actions-row">
              <button className="link-btn" onClick={() => onNavigate && onNavigate('login')}>Back to login</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
