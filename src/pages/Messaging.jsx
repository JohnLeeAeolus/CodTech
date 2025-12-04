import React, { useState } from 'react'
import './Messaging.css'
import UserDropdown from '../components/UserDropdown'

export default function Messaging({ onNavigate, onLogout, userType }) {
  const [conversations] = useState([
    { id: 1, name: 'Prof. Smith', role: 'Instructor', lastMessage: 'Please review my assignment', time: '5 min ago', unread: 2 },
    { id: 2, name: 'John Doe', role: 'Student', lastMessage: 'When is the next class?', time: '2 hours ago', unread: 0 },
    { id: 3, name: 'Jane Smith', role: 'Student', lastMessage: 'Thanks for the feedback', time: '1 day ago', unread: 0 },
    { id: 4, name: 'CS101 Group Project', role: 'Group', lastMessage: 'Let\'s meet tomorrow', time: '2 days ago', unread: 1 },
  ])

  const [selectedConversation, setSelectedConversation] = useState(1)
  const [messages] = useState([
    { id: 1, sender: 'Prof. Smith', text: 'Hi, how can I help?', time: '10:30 AM', isOwn: false },
    { id: 2, sender: 'You', text: 'Please review my assignment submission', time: '10:32 AM', isOwn: true },
    { id: 3, sender: 'Prof. Smith', text: 'I\'ll check it and provide feedback by tomorrow', time: '10:33 AM', isOwn: false },
    { id: 4, sender: 'You', text: 'Thank you!', time: '10:34 AM', isOwn: true },
  ])

  return (
    <div className="messaging-root">
      <header className="topbar msg-topbar">
        <div className="topbar-left">
          <div className="unilearn-title">
            <span className="unilearn-bold">UniLearn Nexus</span>
            <span className="unilearn-sub">Learning Management Systems</span>
          </div>
          <nav className="nav-links">
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('home')}}>Home</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('dashboard')}}>Dashboard</a>
            <a href="#" className="nav-link" onClick={e => {e.preventDefault(); onNavigate && onNavigate('courses')}}>Courses</a>
          </nav>
        </div>
        <div className="topbar-right">
          <div className="notification-icon">🔔</div>
          <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
        </div>
      </header>

      <main className="msg-main">
        <div className="msg-container">
          <div className="messaging-layout">
            {/* Conversations List */}
            <aside className="conversations-sidebar">
              <div className="sidebar-header">
                <h2>Messages</h2>
                <button className="new-msg-btn">✎ New</button>
              </div>

              <div className="conversations-list">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`conversation-item ${selectedConversation === conv.id ? 'active' : ''}`}
                    onClick={() => setSelectedConversation(conv.id)}
                  >
                    <div className="conv-avatar">{conv.name.charAt(0)}</div>
                    <div className="conv-info">
                      <h3>{conv.name}</h3>
                      <p className="last-message">{conv.lastMessage}</p>
                    </div>
                    <div className="conv-meta">
                      <span className="time">{conv.time}</span>
                      {conv.unread > 0 && (
                        <span className="unread-badge">{conv.unread}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Chat Area */}
            <section className="chat-section">
              <div className="chat-header">
                <div className="chat-info">
                  <div className="chat-avatar">{conversations.find(c => c.id === selectedConversation)?.name.charAt(0)}</div>
                  <div>
                    <h2>{conversations.find(c => c.id === selectedConversation)?.name}</h2>
                    <p className="chat-role">{conversations.find(c => c.id === selectedConversation)?.role}</p>
                  </div>
                </div>
                <div className="chat-actions">
                  <button className="icon-btn">📞</button>
                  <button className="icon-btn">📹</button>
                  <button className="icon-btn">ℹ️</button>
                </div>
              </div>

              <div className="messages-area">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`message ${msg.isOwn ? 'own' : 'other'}`}
                  >
                    <div className="message-content">
                      <p>{msg.text}</p>
                      <span className="message-time">{msg.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="message-input-area">
                <div className="input-wrapper">
                  <button className="attach-btn">📎</button>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="message-input"
                  />
                  <button className="emoji-btn">😊</button>
                </div>
                <button className="send-btn">Send</button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
