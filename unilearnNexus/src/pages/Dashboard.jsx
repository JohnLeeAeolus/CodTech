import React from 'react'
import './Dashboard.css'
import logo from '../assets/codtech-logo.png'

export default function Dashboard() {
  return (
    <div className="dashboard-root">
      <header className="topbar">
        <div className="topbar-left">
          <div className="unilearn-title">
            <span className="unilearn-bold">UniLearn Nexus</span>
            <span className="unilearn-sub">Learning Management Systems</span>
          </div>
          <nav className="nav-links">
            <a href="#" className="nav-link">Home</a>
            <a href="#" className="nav-link active">Dashboard</a>
            <a href="#" className="nav-link">Courses</a>
            <a href="#" className="nav-link">Schedule</a>
          </nav>
        </div>
        <div className="topbar-center">
          <div className="logo-circle">
            <img src={logo} alt="CodTech" />
          </div>
          <div className="codtech-title">CodTech</div>
        </div>
        <div className="topbar-right">
          <div className="user-dropdown">
            <span className="user-avatar">A</span>
            <span className="user-name">Student Name ▾</span>
            <div className="dropdown-menu">
              <div className="dropdown-title">Quick Nav</div>
              <a href="#" className="dropdown-link">Recent Activities</a>
              <a href="#" className="dropdown-link">Assignments</a>
              <a href="#" className="dropdown-link">Announcements</a>
            </div>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-card timeline-card">
          <h2>School work Timeline</h2>
          <div className="timeline-list">
            <div className="timeline-month">
              <div className="month-title">October 2025</div>
              <div className="timeline-item">Assignment #1 (Course here) <button className="timeline-btn">Add Submission</button></div>
              <div className="timeline-item">Assignment #2 (Course here)</div>
            </div>
            <div className="timeline-month">
              <div className="month-title">November 2025</div>
              <div className="timeline-item">Quiz #1 (Course here) <button className="timeline-btn quiz">Take Quiz</button></div>
            </div>
            <div className="timeline-month">
              <div className="month-title">December 2025</div>
              <div className="timeline-item">Project Submission (Course here) <button className="timeline-btn">Add Submission</button></div>
            </div>
            <div className="timeline-month muted">
              <div>January 2026</div>
              <div>February 2026</div>
              <div>March 2026</div>
              <div>April 2026</div>
              <div>May 2026</div>
              <div>June 2026</div>
            </div>
          </div>
        </div>

        <div className="dashboard-card calendar-card">
          <h2>Calendar</h2>
          <div className="calendar-header">
            <span className="calendar-month">November 2025</span>
            <input className="calendar-search" placeholder="Search" />
          </div>
          <div className="calendar-grid">
            <div className="calendar-row calendar-days">
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d)=> (
                <div key={d} className="calendar-day-name">{d}</div>
              ))}
            </div>
            <div className="calendar-body">
              {/* Render 30 days for November, with sample events */}
              {Array.from({length:30}).map((_,i)=> {
                let events = [];
                if(i===7) events = ['Assignment #1','Assignment #2','Assignment #3'];
                if(i===12) events = ['Quiz #4','Seatwork #4'];
                if(i===20) events = ['Project Submission'];
                return (
                  <div key={i} className="calendar-cell">
                    <div className="calendar-date">{i+1}</div>
                    {events.map((ev,idx)=>(
                      <div key={ev} className={`calendar-event${ev.includes('Quiz') ? ' quiz' : ev.includes('Project') ? ' project' : ''}`}>{ev}</div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
