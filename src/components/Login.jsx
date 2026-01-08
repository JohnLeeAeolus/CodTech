import React, { useEffect, useState } from 'react'

import './Login.css'

import bg from '../assets/campus-bg.png'

import logo from '../assets/codtech-logo.png'

import { auth } from '../firebase'

import { browserSessionPersistence, setPersistence, signInWithEmailAndPassword } from 'firebase/auth'

import { getOrInferUserRole, ensureUserDoc, createStudentProfile, createFacultyProfile } from '../utils/firestoreHelpers'



export default function Login({ onLogin, onNavigate }) {

  // selected role: 'faculty' or 'student'

  const [role, setRole] = useState('student')



  const [email, setEmail] = useState('')

  const [pw, setPw] = useState('')

  const [signedInEmail, setSignedInEmail] = useState(null)

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setSignedInEmail(u?.email || null)
    })
    return () => unsub()
  }, [])

  async function handleSwitchAccount() {
    try {
      await auth.signOut()
      setPw('')
      try {
        window.location.hash = 'login'
      } catch (e) {
        // ignore
      }
    } catch (e) {
      console.error('Sign out error', e)
      alert('Could not sign out. Please try again.')
    }
  }



  async function handleSubmit(e) {

    e.preventDefault()

    // Use Firebase Authentication (email + password)

    if (!email || !pw) {

      alert('Please enter email and password')

      return

    }

    try {

      // Use per-tab auth sessions so logging into another account in a different
      // browser tab doesn't overwrite this tab's signed-in user.
      await setPersistence(auth, browserSessionPersistence)

      const cred = await signInWithEmailAndPassword(auth, email, pw)

      // Always trust the database role for separation.
      let actualRole = await getOrInferUserRole(cred.user.uid, cred.user.email || email)

      // If this Auth user existed before Firestore user/profile docs were created,
      // initialize their role using the selected toggle.
      if (!actualRole) {
        const selected = role || 'student'
        const ok = confirm(`This account does not have a role set yet. Set it as ${selected}?`)
        if (!ok) {
          await auth.signOut()
          return
        }

        await ensureUserDoc(cred.user.uid, {
          uid: cred.user.uid,
          email: cred.user.email || email,
          role: selected
        })

        try {
          if (selected === 'faculty') {
            await createFacultyProfile(cred.user.uid, { uid: cred.user.uid, email: cred.user.email || email })
          } else {
            await createStudentProfile(cred.user.uid, { uid: cred.user.uid, email: cred.user.email || email })
          }
        } catch (e) {
          // Profile creation is best-effort; role doc is the source of truth.
          console.warn('Could not create profile doc during login initialization:', e)
        }

        actualRole = selected
      }

      // If user selected a different role than their account, block it.
      if (role && actualRole && role !== actualRole) {

        await auth.signOut()

        alert(`This account is registered as ${actualRole}. Please switch to ${actualRole} and try again.`)

        return

      }

      try {
        // Clear forced auth screen hash once login succeeds.
        if (window.location.hash) window.location.hash = ''
      } catch (e) {
        // ignore
      }

      if (onLogin) onLogin(actualRole)

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

              <h3>Step into the classroom of tomorrow

                <br/>designed for you, today.</h3>

            </div>

          </div>

        </aside>



        <section className="form-panel">

          <div className="form-card">

            <div className="form-header">

              <h1>CODTECH</h1>

              <p className="muted">Learning Management Systems</p>

            </div>

            {signedInEmail ? (
              <div style={{ marginBottom: '12px' }}>
                <div className="muted" style={{ marginBottom: '8px' }}>
                  Signed in as <strong>{signedInEmail}</strong>
                </div>
                <button className="link-btn" type="button" onClick={handleSwitchAccount}>
                  Switch account
                </button>
              </div>
            ) : null}



            <div className="role-switch">

              <button type="button" className={role === 'student' ? 'role active' : 'role'} onClick={() => setRole('student')}>Student</button>

              <button type="button" className={role === 'faculty' ? 'role active' : 'role'} onClick={() => setRole('faculty')}>Faculty</button>

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