// src/pages/FacultyAssignments.jsx
import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrashAlt, FaEdit } from 'react-icons/fa';
import './FacultyAssignments.css';
import UserDropdown from '../components/UserDropdown';
import { auth } from '../firebase';
import {
    getFacultyCourses,
    getAllCourses,
    getCourseAssignments,
    createAssignment,
    deleteAssignment,
    uploadAssignmentFile,
    getFacultyAssignments,
    updateAssignment,
    claimUnownedCourses,
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
    const [questions, setQuestions] = useState([]);

    const makeNewQuestion = (kind = 'multiple_choice') => {
        if (kind === 'true_false') {
            return { id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()), kind, prompt: '', correctAnswer: true, points: 1 };
        }
        if (kind === 'identification') {
            return { id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()), kind, prompt: '', correctAnswer: '', points: 1 };
        }
        if (kind === 'essay') {
            return { id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()), kind, prompt: '', rubric: '', points: 1 };
        }
        // multiple_choice
        return {
            id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
            kind,
            prompt: '',
            options: [''],
            correctIndex: 0,
            points: 1
        };
    };

    const updateQuestion = (questionId, patch) => {
        setQuestions(prev => prev.map(q => (q.id === questionId ? { ...q, ...patch } : q)));
    };

    const removeQuestion = (questionId) => {
        setQuestions(prev => prev.filter(q => q.id !== questionId));
    };

    const addQuestion = (kind) => {
        setQuestions(prev => [...prev, makeNewQuestion(kind)]);
    };

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
            setQuestions(Array.isArray(editingAssignment.questions) ? editingAssignment.questions : []);
        } else if (visible && !editingAssignment) {
            // Set default course when creating new
            setCourseId(selectedCourse || '');
            setQuestions([]);
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
            setQuestions([]);
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

        // Validate questions (if any)
        if (questions.length > 0) {
            for (const q of questions) {
                if (!q?.prompt || !String(q.prompt).trim()) {
                    alert('Please fill in all question prompts.');
                    return;
                }
                if (q.kind === 'multiple_choice') {
                    const opts = Array.isArray(q.options) ? q.options.map(o => String(o ?? '').trim()) : [];
                    if (opts.length < 2) {
                        alert('Multiple choice questions need at least 2 options.');
                        return;
                    }
                    if (opts.some(o => !o)) {
                        alert('Please fill in all multiple choice options.');
                        return;
                    }
                    const idx = Number.isFinite(q.correctIndex) ? q.correctIndex : parseInt(q.correctIndex, 10);
                    if (!(idx >= 0 && idx < opts.length)) {
                        alert('Please select a valid correct option for each multiple choice question.');
                        return;
                    }
                }
                if (q.kind === 'identification') {
                    if (!q?.correctAnswer || !String(q.correctAnswer).trim()) {
                        alert('Identification questions need a correct answer.');
                        return;
                    }
                }
                if (q.kind === 'true_false') {
                    if (typeof q.correctAnswer !== 'boolean') {
                        alert('True/False questions need a correct answer.');
                        return;
                    }
                }
            }
        }

        setUploading(true);
        try {
            let uploaded = null;
            if (file) {
                console.log('Uploading file:', file.name);
                uploaded = await uploadAssignmentFile(courseId, file);
            }

            const payload = {
                title: title.trim(),
                description: description || '',
                dueDate: dueDate ? new Date(dueDate).toISOString() : '',
                totalPoints: Number(totalPoints) || 0,
                type: type || 'assignment',
                courseId,
                externalLink: (externalLink || '').trim(),
                questions: questions.map(q => {
                    // Store only the fields needed for each question kind.
                    if (q.kind === 'true_false') {
                        return { id: q.id, kind: q.kind, prompt: q.prompt, correctAnswer: !!q.correctAnswer, points: Number(q.points) || 0 };
                    }
                    if (q.kind === 'identification') {
                        return { id: q.id, kind: q.kind, prompt: q.prompt, correctAnswer: String(q.correctAnswer || ''), points: Number(q.points) || 0 };
                    }
                    if (q.kind === 'essay') {
                        return { id: q.id, kind: q.kind, prompt: q.prompt, rubric: String(q.rubric || ''), points: Number(q.points) || 0 };
                    }
                    // multiple_choice
                    return {
                        id: q.id,
                        kind: 'multiple_choice',
                        prompt: q.prompt,
                        options: Array.isArray(q.options) ? q.options : [],
                        correctIndex: Number.isFinite(q.correctIndex) ? q.correctIndex : parseInt(q.correctIndex, 10),
                        points: Number(q.points) || 0
                    };
                }),
                ...(uploaded
                    ? {
                          attachmentURL: uploaded.downloadURL,
                          attachmentPath: uploaded.storagePath,
                          attachmentName: uploaded.fileName,
                      }
                    : {}),
            };

            await onCreate(payload);
            onClose();
        } catch (err) {
            console.error('Error in handleSubmit:', err);
            console.error('Full error:', err.code, err.message, err.stack);
            alert('❌ Error: ' + (err.message || 'Unknown error occurred'));
        } finally {
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
                >
                    ✕
                </button>
                <h3>{editingAssignment ? 'Edit' : 'Create'} {getTypeLabel(type || 'assignment')}</h3>
                <form onSubmit={handleSubmit} className="create-assignment-form">
                    <div className="form-row">
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
                    </div>

                    <div className="form-row">
                        <label>
                            Title *
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Enter title..."
                                required
                            />
                        </label>
                    </div>

                    <label>
                        Description (Optional)
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Enter instructions/details..."
                            rows="3"
                        />
                    </label>

                    <div className="form-row">
                        <label>
                            Due Date
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        </label>
                        <label>
                            Total Points
                            <input type="number" value={totalPoints} onChange={e => setTotalPoints(e.target.value)} min="0" />
                        </label>
                    </div>

                    <div className="form-row">
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
                            Attachment (Optional)
                            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
                            {file && <div style={{marginTop: 6, fontSize: '0.9rem', color: '#4A90E2'}}>✓ {file.name}</div>}
                        </label>
                    </div>

                    <div>
                        <div className="qb-toolbar">
                            <strong className="qb-title">Questions (Optional)</strong>
                            <div className="qb-actions">
                                <button className="qb-btn" type="button" onClick={() => addQuestion('multiple_choice')}>+ Multiple Choice</button>
                                <button className="qb-btn" type="button" onClick={() => addQuestion('identification')}>+ Identification</button>
                                <button className="qb-btn" type="button" onClick={() => addQuestion('true_false')}>+ True/False</button>
                                <button className="qb-btn" type="button" onClick={() => addQuestion('essay')}>+ Essay</button>
                            </div>
                        </div>

                        {questions.length === 0 ? (
                            <div className="qb-empty">
                                Add questions if you want this to be an in-app quiz/assessment.
                            </div>
                        ) : null}

                        {questions.map((q, idx) => (
                            <div key={q.id || idx} className="qb-question">
                                <div className="qb-question-header">
                                    <strong>Q{idx + 1} — {q.kind === 'multiple_choice' ? 'Multiple Choice' : q.kind === 'identification' ? 'Identification' : q.kind === 'true_false' ? 'True/False' : 'Essay'}</strong>
                                    <button className="qb-btn qb-btn-danger" type="button" onClick={() => removeQuestion(q.id)}>Remove</button>
                                </div>

                                <label className="qb-label">
                                    Prompt
                                    <textarea
                                        value={q.prompt || ''}
                                        onChange={e => updateQuestion(q.id, { prompt: e.target.value })}
                                        rows="3"
                                        placeholder="Enter the question prompt..."
                                    />
                                </label>

                                <label className="qb-label">
                                    Points
                                    <input
                                        type="number"
                                        min="0"
                                        value={q.points ?? 1}
                                        onChange={e => updateQuestion(q.id, { points: e.target.value })}
                                    />
                                </label>

                                {q.kind === 'multiple_choice' ? (
                                    <div className="qb-mcq">
                                        <div className="qb-mcq-header">
                                            <strong>Options</strong>
                                            <button
                                                className="qb-btn"
                                                type="button"
                                                onClick={() => {
                                                    const next = Array.isArray(q.options) ? [...q.options, ''] : [''];
                                                    updateQuestion(q.id, { options: next });
                                                }}
                                            >
                                                + Add option
                                            </button>
                                        </div>

                                        {(Array.isArray(q.options) ? q.options : []).map((opt, optIdx) => (
                                            <div key={optIdx} className="qb-mcq-row">
                                                <input
                                                    value={opt}
                                                    onChange={e => {
                                                        const next = [...(Array.isArray(q.options) ? q.options : [])];
                                                        next[optIdx] = e.target.value;
                                                        updateQuestion(q.id, { options: next });
                                                    }}
                                                    placeholder={`Option ${optIdx + 1}`}
                                                />
                                                <button
                                                    className="qb-btn qb-btn-danger"
                                                    type="button"
                                                    onClick={() => {
                                                        const next = [...(Array.isArray(q.options) ? q.options : [])].filter((_, i) => i !== optIdx);
                                                        const nextCorrect = Math.max(0, Math.min(Number(q.correctIndex || 0), next.length - 1));
                                                        updateQuestion(q.id, { options: next, correctIndex: nextCorrect });
                                                    }}
                                                    disabled={(Array.isArray(q.options) ? q.options.length : 0) <= 1}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}

                                        <label className="qb-label">
                                            Correct option
                                            <select
                                                value={q.correctIndex ?? 0}
                                                onChange={e => updateQuestion(q.id, { correctIndex: parseInt(e.target.value, 10) })}
                                            >
                                                {(Array.isArray(q.options) ? q.options : []).map((_, optIdx) => (
                                                    <option key={optIdx} value={optIdx}>Option {optIdx + 1}</option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                ) : null}

                                {q.kind === 'identification' ? (
                                    <label className="qb-label">
                                        Correct Answer
                                        <input
                                            value={q.correctAnswer || ''}
                                            onChange={e => updateQuestion(q.id, { correctAnswer: e.target.value })}
                                            placeholder="Enter the correct answer"
                                        />
                                    </label>
                                ) : null}

                                {q.kind === 'true_false' ? (
                                    <label className="qb-label">
                                        Correct Answer
                                        <select
                                            value={q.correctAnswer === false ? 'false' : 'true'}
                                            onChange={e => updateQuestion(q.id, { correctAnswer: e.target.value === 'true' })}
                                        >
                                            <option value="true">True</option>
                                            <option value="false">False</option>
                                        </select>
                                    </label>
                                ) : null}

                                {q.kind === 'essay' ? (
                                    <label className="qb-label">
                                        Rubric / Notes (Optional)
                                        <textarea
                                            value={q.rubric || ''}
                                            onChange={e => updateQuestion(q.id, { rubric: e.target.value })}
                                            rows="2"
                                            placeholder="Optional grading notes/rubric..."
                                        />
                                    </label>
                                ) : null}
                            </div>
                        ))}
                    </div>
                    <label>
                        Attachment (Optional)
                        <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
                        {file && <div style={{marginTop: 6, fontSize: '0.9rem', color: '#4A90E2'}}>✓ {file.name}</div>}
                    </label>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} disabled={uploading}>Cancel</button>
                        <button type="submit" disabled={uploading}>
                            {uploading ? (editingAssignment ? 'Updating...' : 'Creating...') : (editingAssignment ? `Update ${getTypeLabel(type || 'assignment')}` : `Create ${getTypeLabel(type || 'assignment')}`)}
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

    const getOwnedCourseIds = (courseRows, uid) => {
        if (!uid) return [];
        return (courseRows || [])
            .filter(c => (c?.facultyId || null) === uid)
            .map(c => c.id)
            .filter(Boolean);
    };

    const loadFacultyData = async (userId) => {
        try {
            console.log('Loading faculty data for userId:', userId);

            // Load ALL courses so the Create Assignment dropdown is never empty.
            // Ownership is still enforced by Firestore rules when writing.
            let coursesData = [];
            try {
                coursesData = await getAllCourses();
                console.log('Loaded all courses:', coursesData);
            } catch (courseErr) {
                console.warn('Error loading all courses, falling back to faculty courses:', courseErr);
                coursesData = await getFacultyCourses(userId);
            }
            
            setCourses(coursesData);

            const ownedCourseIds = getOwnedCourseIds(coursesData, userId);
            const facultyAssignments = await getFacultyAssignments(ownedCourseIds);
            setAssignments(facultyAssignments || []);
            setLoading(false);
            
            // Prefer selecting an owned course (since create/edit will work there).
            if (ownedCourseIds.length > 0) {
                setSelectedCourse(ownedCourseIds[0]);
            } else if (coursesData.length > 0) {
                setSelectedCourse(coursesData[0].id);
            }
        } catch (error) {
            console.error('Error loading faculty data:', error);

            // Still try to load faculty assignments even if courses fail
            try {
                const facultyAssignments = await getFacultyAssignments(null);
                setAssignments(facultyAssignments || []);
            } catch (e) {
                console.error('Failed to load faculty assignments:', e);
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
            // Fallback: get faculty-only assignments
            try {
                const ownedCourseIds = getOwnedCourseIds(courses, currentUser?.uid);
                const facultyAssignments = await getFacultyAssignments(ownedCourseIds);
                setAssignments(facultyAssignments || []);
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
                if (error?.code === 'permission-denied') {
                    alert('Error deleting assignment: Missing or insufficient permissions.\n\nThis usually means the assignment is not owned by your faculty account (or Firestore rules are not deployed).');
                    return;
                }
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
            
            // Refresh faculty assignments to show the new one
            const ownedCourseIds = getOwnedCourseIds(courses, currentUser?.uid);
            const facultyAssignments = await getFacultyAssignments(ownedCourseIds);
            setAssignments(facultyAssignments);
            console.log('Refreshed faculty assignments:', facultyAssignments);
            
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
            
            // Refresh faculty assignments
            const ownedCourseIds = getOwnedCourseIds(courses, currentUser?.uid);
            const facultyAssignments = await getFacultyAssignments(ownedCourseIds);
            setAssignments(facultyAssignments);
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
                            <div style={{marginBottom:'20px', padding:'12px', background:'#f5f5f5', borderRadius:'8px', fontSize:'0.95rem', display:'flex', alignItems:'center', gap:'12px'}}>
                                <strong style={{marginRight:'8px'}}>Viewing:</strong>
                                <select 
                                    value={selectedCourse} 
                                    onChange={(e) => handleCourseSelect(e.target.value)}
                                    style={{
                                        padding:'6px 10px',
                                        borderRadius:'6px',
                                        border:'1px solid #d1d5db',
                                        background:'#ffffff',
                                        fontSize:'0.95rem',
                                        cursor:'pointer',
                                        fontWeight:'600',
                                        color:'#111827'
                                    }}
                                >
                                    {courses.map(course => (
                                        <option key={course.id} value={course.id}>
                                            {course.name || course.courseName || course.id}
                                        </option>
                                    ))}
                                </select>
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