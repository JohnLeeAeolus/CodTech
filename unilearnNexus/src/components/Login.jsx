import React, { useState } from 'react'
import './Login.css'
import bg from '../assets/campus-bg.png'
import logo from '../assets/codtech-logo.png'

export default function Login({ onLogin }) {
  // true => Faculty left, Student/Admin right
  const [isLoginActive, setIsLoginActive] = useState(true)

  // Faculty
  const [facultyId, setFacultyId] = useState('')
  const [facultyPw, setFacultyPw] = useState('')

  // Student
  const [studentId, setStudentId] = useState('')
  const [studentPw, setStudentPw] = useState('')
  const toggleForm = () => {
    setIsLoginActive((s) => !s)
    // keep it simple: switching resets to Student view
  }

  function handleFacultyLogin(e) {
    e.preventDefault()
    if (facultyId === 'admin' && facultyPw === 'admin') {
      if (onLogin) onLogin('faculty')
    } else {
      alert('Default Faculty login: admin / admin')
    }
  }

  function handleStudentLogin(e) {
    e.preventDefault()
    if (studentId === 'admin' && studentPw === 'admin') {
      if (onLogin) onLogin('student')
    } else {
      alert('Default Student login: admin / admin')
    }
  }

  return (
    <div className="login-root">
      <div className="bg-image" style={{ backgroundImage: `url(${bg})` }} />

      <div className={`container ${isLoginActive ? 'login-active' : 'signup-active'}`}>
        <div className={`form-container ${isLoginActive ? 'login-active' : 'signup-active'}`}>

          <form className="form login-form" onSubmit={handleFacultyLogin}>
            <div className="logo-wrap small">
              <img src={logo} alt="CodTech" />
            </div>
            <h2>Faculty Login</h2>
            <input
              type="text"
              placeholder="Faculty ID Number"
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={facultyPw}
              onChange={(e) => setFacultyPw(e.target.value)}
            />
            <button className="primary" type="submit">Login</button>
            <p className="toggle-link" onClick={() => { setIsLoginActive(false); }}>Use Student login</p>
          </form>

          <form
            className="form signup-form"
            onSubmit={handleStudentLogin}
          >
            <div className="logo-wrap small">
              <img src={logo} alt="CodTech" />
            </div>

            <h2>Student Login</h2>

            <>
              <input
                type="text"
                placeholder="Student ID Number"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                value={studentPw}
                onChange={(e) => setStudentPw(e.target.value)}
              />
              <button className="primary" type="submit">Login</button>
              <p className="toggle-link" onClick={() => setIsLoginActive(true)}>Use Faculty login</p>
            </>
          </form>

        </div>
      </div>
    </div>
  )
}
