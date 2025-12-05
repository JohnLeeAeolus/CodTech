// src/pages/FacultyAssignments.jsx
import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrashAlt, FaEdit } from 'react-icons/fa';
import './FacultyAssignments.css';
import UserDropdown from '../components/UserDropdown';
import { auth } from '../firebase';
import {
    getFacultyCourses,
    getCourseAssignments,
    createAssignment,
    deleteAssignment,
    uploadAssignmentFile,
} from '../utils/firestoreHelpers';

const AssignmentItem = ({ assignment, onEdit, onDelete }) => (
    <div className={`assignment-item ${assignment.status === 'completed' ? 'completed' : ''}`}>
        <span className="drag-handle">&#9776;</span>
        <div className="item-details">
            <p className="quiz-name">{assignment.title}</p>
            <p className="item-description">{assignment.assignmentType} | {assignment.totalPoints} pts</p>
        </div>
        <span className="item-date">{assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : ''}</span>
        <div className="item-actions">
            <button title="Edit" onClick={() => onEdit(assignment)}><FaEdit /></button>
            <button title="Delete" onClick={() => onDelete(assignment.id)}><FaTrashAlt /></button>
        </div>
    </div>
);

const CreateAssignmentModal = ({ visible, onClose, onCreate }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [totalPoints, setTotalPoints] = useState(100);
    const [type, setType] = useState('assignment');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!visible) {
            setTitle('');
            setDescription('');
            setDueDate('');
            setTotalPoints(100);
            setType('assignment');
            setFile(null);
            setUploading(false);
        }
    }, [visible]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Form submitted. Title:', title, 'File:', file?.name);
        
        if (!title.trim()) {
            alert('Please enter a title.');
            return;
        }
        
        const data = {
            title: title.trim(),
            description,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
            totalPoints: Number(totalPoints) || 0,
            type,
        };

        try {
            setUploading(true);
            console.log('Starting upload process. File present:', !!file);
            
            if (file) {
                console.log('Uploading file:', file.name);
                const uploaded = await uploadAssignmentFile('global', file);
                console.log('File uploaded:', uploaded);
                data.attachment = uploaded;
            }
            
            console.log('Calling onCreate with:', data);
            await onCreate(data);
            console.log('onCreate completed successfully');
            onClose();
        } catch (err) {
            console.error('Error in handleSubmit:', err);
            console.error('Full error:', err.code, err.message, err.stack);
            alert('❌ Error: ' + (err.message || 'Unknown error occurred'));
            setUploading(false);
        }
    };

    if (!visible) return null;
    
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <button 
                    className="modal-close" 
                    onClick={onClose}
                    style={{position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'}}
                >
                    ✕
                </button>
                <h3>{type === 'quiz' ? 'Create Quiz' : 'Create Assignment'}</h3>
                <form onSubmit={handleSubmit} className="create-assignment-form">
                    <label>
                        Type
                        <select value={type} onChange={e => setType(e.target.value)}>
                            <option value="assignment">Assignment</option>
                            <option value="quiz">Quiz</option>
                        </select>
                    </label>
                    <label>
                        Title
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Enter title"
                            required
                        />
                    </label>
                    <label>
                        Description
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Describe the assignment or quiz..."
                            rows="4"
                        />
                    </label>
                    <label>
                        Due Date
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                    </label>
                    <label>
                        Total Points
                        <input type="number" value={totalPoints} onChange={e => setTotalPoints(e.target.value)} min="0" />
                    </label>
                    <label>
                        Attachment (Optional)
                        <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
                        {file && <div style={{marginTop: 6, fontSize: '0.9rem', color: '#4A90E2'}}>✓ {file.name}</div>}
                    </label>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} disabled={uploading}>Cancel</button>
                        <button type="submit" disabled={uploading}>
                            {uploading ? 'Creating...' : `Create ${type === 'quiz' ? 'Quiz' : 'Assignment'}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Assignments = ({ onNavigate, onLogout, userType }) => {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user && userType === 'faculty') {
                setCurrentUser(user);
                await loadFacultyData(user.uid);
            } else {
                setLoading(false);
            }
        });
        return unsubscribe;
    }, [userType]);

    const loadFacultyData = async (userId) => {
        try {
            const coursesData = await getFacultyCourses(userId);
            setCourses(coursesData);
            if (coursesData.length > 0) {
                const firstId = coursesData[0].id;
                setSelectedCourse(firstId);
                const assignmentsData = await getCourseAssignments(firstId);
                setAssignments(assignmentsData);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error loading faculty data:', error);
            setLoading(false);
        }
    };

    const handleCourseSelect = async (courseId) => {
        setSelectedCourse(courseId);
        try {
            const assignmentsData = await getCourseAssignments(courseId);
            setAssignments(assignmentsData);
        } catch (error) {
            console.error('Error loading assignments:', error);
        }
    };

    const handleDelete = async (assignmentId) => {
        if (window.confirm('Are you sure you want to delete this assignment?')) {
            try {
                await deleteAssignment(assignmentId);
                setAssignments(prev => prev.filter(a => a.id !== assignmentId));
                alert('Assignment deleted successfully!');
            } catch (error) {
                alert('Error deleting assignment: ' + error.message);
            }
        }
    };

    const handleEdit = (assignment) => {
        alert('Edit functionality coming soon for: ' + assignment.title);
    };

    const handleCreateAssignment = async (data) => {
        console.log('Starting assignment creation with data:', data);
        try {
            const courseId = selectedCourse || courses[0]?.id || 'general';
            console.log('Using courseId:', courseId);
            console.log('Creating assignment with:', { courseId, data });
            const result = await createAssignment(courseId, data);
            console.log('Assignment created:', result);
            const refreshed = await getCourseAssignments(courseId);
            console.log('Refreshed assignments:', refreshed);
            setAssignments(refreshed);
            alert('✓ ' + (data.type === 'quiz' ? 'Quiz' : 'Assignment') + ' created successfully!');
        } catch (err) {
            console.error('Error creating assignment:', err);
            console.error('Error details:', err.code, err.message, err.stack);
            alert('❌ Error: ' + err.message);
        }
    };

    const currentAssignments = assignments.filter(a => a.dueDate ? new Date(a.dueDate) > new Date() : true);
    const completedAssignments = assignments.filter(a => a.dueDate ? new Date(a.dueDate) <= new Date() : false);

    return (
        <div className="faculty-assignments-root">
            <header className="topbar fa-topbar">
                <div className="topbar-left">
                    <div className="unilearn-title">
                        <span className="unilearn-bold">UniLearn Nexus</span>
                        <span className="unilearn-sub">Learning Management Systems</span>
                    </div>
                    <nav className="nav-links">
                        <a href="#" className="nav-link" onClick={e => { e.preventDefault(); onNavigate && onNavigate('home'); }}>Home</a>
                        <a href="#" className="nav-link" onClick={e => { e.preventDefault(); onNavigate && onNavigate('dashboard'); }}>Dashboard</a>
                        <a href="#" className="nav-link" onClick={e => { e.preventDefault(); onNavigate && onNavigate('courses'); }}>Courses</a>
                        <a href="#" className="nav-link" onClick={e => { e.preventDefault(); onNavigate && onNavigate('schedule'); }}>Schedule</a>
                        <a href="#" className="nav-link active" onClick={e => { e.preventDefault(); onNavigate && onNavigate('assignments'); }}>Assignments</a>
                    </nav>
                </div>
                <div className="topbar-right">
                    <div className="notification-icon">🔔</div>
                    <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
                </div>
            </header>

            <div className="assignments-page-layout">
                <div className="assignment-content-wrapper">
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

                    <section className="assignment-main-content">
                        <div className="content-header">
                            <h2>Assignments & Quizzes</h2>
                            <button className="publish-button" onClick={() => setShowCreateModal(true)}><FaPlus /> Create Assignment or Quiz</button>
                        </div>

                        {selectedCourse && courses.length > 0 && (
                            <div style={{marginBottom:'20px', padding:'10px', background:'#f5f5f5', borderRadius:'6px', fontSize:'0.95rem'}}>
                                <strong>Viewing:</strong> {courses.find(c => c.id === selectedCourse)?.name || selectedCourse}
                            </div>
                        )}

                        <div className="assignments-section current-assignments">
                            <div className="section-title">
                                <h3>Current Assignments ({currentAssignments.length})</h3>
                                <button className="add-button" onClick={() => setShowCreateModal(true)}><FaPlus /></button>
                            </div>
                            <div className="assignment-list">
                                {currentAssignments.map(item => (
                                    <AssignmentItem key={item.id} assignment={item} onEdit={handleEdit} onDelete={handleDelete} />
                                ))}
                            </div>
                        </div>

                        <div className="assignments-section completed-assignments">
                            <div className="section-title">
                                <h3>Completed Assignments ({completedAssignments.length})</h3>
                            </div>
                            <div className="assignment-list">
                                {completedAssignments.map(item => (
                                    <AssignmentItem key={item.id} assignment={item} onEdit={handleEdit} onDelete={handleDelete} />
                                ))}
                            </div>
                        </div>
                    </section>

                    <aside className="quick-nav-sidebar"></aside>
                </div>
            </div>

            <CreateAssignmentModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateAssignment}
            />
        </div>
    );
};

export default Assignments;