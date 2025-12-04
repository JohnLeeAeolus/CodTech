// src/pages/FacultyAssignments.jsx
import React from 'react';
import { FaPlus, FaTrashAlt, FaEdit } from 'react-icons/fa';
import './FacultyAssignments.css'; // Import the corresponding CSS
import UserDropdown from '../components/UserDropdown';

// Placeholder component for an individual assignment item in the list
const AssignmentItem = ({ quizName, questions, points, date, isCompleted }) => (
    <div className={`assignment-item ${isCompleted ? 'completed' : ''}`}>
        <span className="drag-handle">&#9776;</span>
        <div className="item-details">
            <p className="quiz-name">{quizName}</p>
            <p className="item-description">Create assignment | {questions} questions | {points} pts</p>
        </div>
        <span className="item-date">{date}</span>
        <div className="item-actions">
            <button title="Edit"><FaEdit /></button>
            <button title="Delete"><FaTrashAlt /></button>
        </div>
    </div>
);

const Assignments = ({ onNavigate, onLogout, userType }) => {
    // Placeholder data for assignments
    const currentAssignments = [
        { id: 1, quizName: 'Quiz 4', questions: 10, points: 10, date: 'Oct 30, 2025' },
        { id: 2, quizName: 'Quiz 5', questions: 10, points: 10, date: 'Nov 15, 2025' },
        { id: 3, quizName: 'Quiz 6', questions: 10, points: 10, date: 'Nov 25, 2025' },
        { id: 4, quizName: 'Quiz 7', questions: 10, points: 10, date: 'Dec 10, 2025' },
    ];

    const completedAssignments = [
        { id: 5, quizName: 'Quiz 1', questions: 10, points: 10, date: 'Sep 30, 2025' },
        { id: 6, quizName: 'Quiz 2', questions: 10, points: 10, date: 'Aug 15, 2025' },
    ];

    return (
        <div className="faculty-assignments-root">
            <header className="topbar fa-topbar">
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
                        <a href="#" className="nav-link active" onClick={e => {e.preventDefault(); onNavigate && onNavigate('assignments')}}>Assignments</a>
                    </nav>
                </div>
                <div className="topbar-right">
                    <div className="notification-icon">🔔</div>
                    <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
                </div>
            </header>

            <div className="assignments-page-layout">

            <div className="assignment-content-wrapper">
                
                {/* Left Navigation Sidebar */}
                <aside className="assignment-nav-sidebar">
                    <h1>Create Assignment</h1>
                    <ul>
                        <li>Basics</li>
                        <li>Modules</li>
                        <li className="active-nav">Assignments</li>
                        <li>Grades</li>
                        <li>Rubrics</li>
                    </ul>
                </aside>

                {/* Main Content Area */}
                <section className="assignment-main-content">
                    
                    <div className="content-header">
                        <h2>Assignments</h2>
                        <div className="actions">
                            <button className="publish-button">Publish Assignment</button>
                            <button className="create-quiz-button">
                                <FaPlus /> Quiz
                            </button>
                        </div>
                    </div>

                    {/* Current Assignments Section */}
                    <div className="assignments-section current-assignments">
                        <div className="section-title">
                            <h3>Current Assignments ({currentAssignments.length})</h3>
                            <button className="add-button"><FaPlus /></button>
                        </div>
                        <div className="assignment-list">
                            {currentAssignments.map(item => (
                                <AssignmentItem key={item.id} {...item} isCompleted={false} />
                            ))}
                        </div>
                    </div>

                    {/* Completed Assignments Section */}
                    <div className="assignments-section completed-assignments">
                        <div className="section-title">
                            <h3>Completed Assignments ({completedAssignments.length})</h3>
                        </div>
                        <div className="assignment-list">
                            {completedAssignments.map(item => (
                                <AssignmentItem key={item.id} {...item} isCompleted={true} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Right Quick Nav Sidebar (Styled to float) */}
                <aside className="quick-nav-sidebar">
                    {/* Content will be placed here by the App Layout, or manually if needed */}
                </aside>
            </div>
        </div>
        </div>
    );
};

export default Assignments;