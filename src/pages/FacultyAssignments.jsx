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
    getAllAssignments,
    updateAssignment,
} from '../utils/firestoreHelpers';

const getTypeIcon = (type) => {
  const icons = {
    'assignment': '📋',
    'quiz': '❓',
    'seatwork': '💼',
    'project': '🎯'
  };
  return icons[type] || '📋';
};

const getTypeLabel = (type) => {
  const labels = {
    'assignment': 'Assignment',
    'quiz': 'Quiz',
    'seatwork': 'Seatwork',
    'project': 'Project'
  };
  return labels[type] || 'Assignment';
};

const getTypeColor = (type) => {
  const colors = {
    'assignment': '#667eea',
    'quiz': '#764ba2',
    'seatwork': '#f093fb',
    'project': '#4facfe'
  };
  return colors[type] || '#667eea';
};

const AssignmentItem = ({ assignment, onEdit, onDelete }) => (
    <div className={`assignment-item ${assignment.status === 'completed' ? 'completed' : ''}`}>
        <span className="drag-handle">&#9776;</span>
        <div className="item-details">
            <div className="item-type-badge" style={{ backgroundColor: getTypeColor(assignment.type || 'assignment') }}>
              {getTypeIcon(assignment.type || 'assignment')} {getTypeLabel(assignment.type || 'assignment')}
            </div>
            <p className="quiz-name">{assignment.title}</p>
                        <p className="item-description">{assignment.totalPoints} pts</p>
                        {assignment.externalLink && (
                            <a
                                className="item-link"
                                href={assignment.externalLink}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                🔗 Open Link
                            </a>
                        )}
        </div>
        <span className="item-date">{assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : ''}</span>
        <div className="item-actions">
            <button title="Edit" onClick={() => onEdit(assignment)}><FaEdit /></button>
            <button title="Delete" onClick={() => onDelete(assignment.id)}><FaTrashAlt /></button>
        </div>
    </div>
);

const CreateAssignmentModal = ({ visible, onClose, onCreate, editingAssignment, courses, selectedCourse }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [totalPoints, setTotalPoints] = useState(100);
    const [type, setType] = useState('assignment');
    const [courseId, setCourseId] = useState('');
    const [file, setFile] = useState(null);
    const [externalLink, setExternalLink] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (visible && editingAssignment) {
            // Populate form with existing assignment data
            setTitle(editingAssignment.title || '');
            setDescription(editingAssignment.description || '');
            setDueDate(editingAssignment.dueDate ? new Date(editingAssignment.dueDate).toISOString().split('T')[0] : '');
            setTotalPoints(editingAssignment.totalPoints || 100);
            setType(editingAssignment.type || 'assignment');
            setCourseId(editingAssignment.courseId || selectedCourse || '');
            setExternalLink(editingAssignment.externalLink || '');
            setFile(null);
        } else if (visible && !editingAssignment) {
            // Set default course when creating new
            setCourseId(selectedCourse || '');
        } else if (!visible) {
            // Reset form when closing
            setTitle('');
            setDescription('');
            setDueDate('');
            setTotalPoints(100);
            setType('assignment');
            setCourseId('');
            setFile(null);
            setExternalLink('');
            setUploading(false);
        }
    }, [visible, editingAssignment, selectedCourse]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Form submitted. Title:', title, 'File:', file?.name);
        
        if (!title.trim()) {
            alert('Please enter a title.');
            return;
        }
        
        if (!courseId) {
            alert('Please select a course.');
            return;
        }
        
        const data = {
            title: title.trim(),
            description,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
            totalPoints: Number(totalPoints) || 0,
            type,
            courseId,
            externalLink: externalLink.trim() ? externalLink.trim() : null,
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
                <h3>{editingAssignment ? 'Edit' : 'Create'} {type === 'quiz' ? 'Quiz' : 'Assignment'}</h3>
                <form onSubmit={handleSubmit} className="create-assignment-form">
                    <label>
                        Course *
                        <select value={courseId} onChange={e => setCourseId(e.target.value)} required>
                            <option value="">Select a course...</option>
                            {courses.map(course => (
                                <option key={course.id} value={course.id}>
                                    {course.name || course.courseName || course.id}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Type
                        <select value={type} onChange={e => setType(e.target.value)}>
                            <option value="assignment">📋 Assignment</option>
                            <option value="quiz">❓ Quiz</option>
                            <option value="seatwork">💼 Seatwork</option>
                            <option value="project">🎯 Project</option>
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
                        External Link (Optional)
                        <input
                            type="url"
                            value={externalLink}
                            onChange={e => setExternalLink(e.target.value)}
                            placeholder="https://forms.gle/..."
                        />
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
                            {uploading ? (editingAssignment ? 'Updating...' : 'Creating...') : (editingAssignment ? `Update ${type === 'quiz' ? 'Quiz' : 'Assignment'}` : `Create ${type === 'quiz' ? 'Quiz' : 'Assignment'}`)}
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
    const [editingAssignment, setEditingAssignment] = useState(null);

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
            console.log('Loading faculty data for userId:', userId);
            
            // Try to load courses first
            let coursesData = [];
            try {
                coursesData = await getFacultyCourses(userId);
                console.log('Loaded faculty courses:', coursesData);
            } catch (courseErr) {
                console.warn('Error loading faculty courses (likely missing index), will load all assignments instead:', courseErr);
            }
            
            setCourses(coursesData);
            
            // Load all assignments as the primary data source
            try {
                const allAssignments = await getAllAssignments();
                console.log('Loaded all assignments:', allAssignments);
                setAssignments(allAssignments || []);
                setLoading(false);
            } catch (assignmentErr) {
                console.error('Error loading assignments:', assignmentErr);
                setAssignments([]);
                setLoading(false);
            }
            
            // Set first course as selected if available
            if (coursesData.length > 0) {
                setSelectedCourse(coursesData[0].id);
            }
        } catch (error) {
            console.error('Error loading faculty data:', error);
            // Still try to load assignments even if courses fail
            try {
                const allAssignments = await getAllAssignments();
                setAssignments(allAssignments || []);
            } catch (e) {
                console.error('Failed to load assignments:', e);
                setAssignments([]);
            }
            setLoading(false);
        }
    };

    const handleCourseSelect = async (courseId) => {
        setSelectedCourse(courseId);
        try {
            const assignmentsData = await getCourseAssignments(courseId);
            setAssignments(assignmentsData);
        } catch (error) {
            console.warn('Error loading course assignments (using fallback):', error);
            // Fallback: get all assignments
            try {
                const allAssignments = await getAllAssignments();
                setAssignments(allAssignments || []);
            } catch (fallbackErr) {
                console.error('Fallback also failed:', fallbackErr);
                setAssignments([]);
            }
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
        setEditingAssignment(assignment);
        setShowCreateModal(true);
    };

    const handleCreateAssignment = async (data) => {
        console.log('Starting assignment creation with data:', data);
        try {
            const courseId = data.courseId;
            console.log('Using courseId from data:', courseId);
            console.log('Creating assignment with:', { courseId, data });
            const result = await createAssignment(courseId, data);
            console.log('Assignment created:', result);
            
            // Refresh all assignments to show the new one
            const allAssignments = await getAllAssignments();
            setAssignments(allAssignments);
            console.log('Refreshed all assignments:', allAssignments);
            
            alert('✓ ' + (data.type === 'quiz' ? 'Quiz' : 'Assignment') + ' created successfully!');
        } catch (err) {
            console.error('Error creating assignment:', err);
            console.error('Error details:', err.code, err.message, err.stack);
            alert('❌ Error: ' + err.message);
        }
    };

    const handleUpdateAssignment = async (assignmentId, data) => {
        console.log('Updating assignment:', assignmentId, data);
        try {
            await updateAssignment(assignmentId, data);
            console.log('Assignment updated successfully');
            
            // Refresh assignments
            const allAssignments = await getAllAssignments();
            setAssignments(allAssignments);
            alert('✓ Assignment updated successfully!');
        } catch (err) {
            console.error('Error updating assignment:', err);
            alert('❌ Error: ' + err.message);
        }
    };

    const handleCreateOrUpdate = async (data) => {
        if (editingAssignment) {
            await handleUpdateAssignment(editingAssignment.id, data);
            setEditingAssignment(null);
        } else {
            await handleCreateAssignment(data);
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
                    <UserDropdown userType={userType} onNavigate={onNavigate} onLogout={onLogout} />
                </div>
            </header>

            <div className="assignments-page-layout">
                <div className="assignment-content-wrapper">
                    <section className="assignment-main-content">
                        <div className="content-header">
                            <h2>Assignments</h2>
                            <button className="publish-button" onClick={() => setShowCreateModal(true)}><FaPlus /> Create Assignment</button>
                        </div>

                        {selectedCourse && courses.length > 0 && (
                            <div style={{marginBottom:'20px', padding:'10px', background:'#f5f5f5', borderRadius:'6px', fontSize:'0.95rem'}}>
                                <strong>Viewing:</strong> {courses.find(c => c.id === selectedCourse)?.name || selectedCourse}
                            </div>
                        )}

                        <div className="assignments-section current-assignments">
                            <div className="section-title">
                                <h3>Current Assignments ({currentAssignments.length})</h3>
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
                onClose={() => {
                    setShowCreateModal(false);
                    setEditingAssignment(null);
                }}
                onCreate={handleCreateOrUpdate}
                editingAssignment={editingAssignment}
                courses={courses}
                selectedCourse={selectedCourse}
            />
        </div>
    );
};

export default Assignments;