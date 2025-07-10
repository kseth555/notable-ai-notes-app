import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const API_URL = process.env.REACT_APP_API_URL;
const localizer = momentLocalizer(moment);

const isQuillEmpty = (value) => {
  if (!value || value.trim() === '<p><br></p>' || value.trim() === '') {
    return true;
  }
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = value;
  return (tempDiv.textContent || tempDiv.innerText).trim().length === 0;
};

const countCharacters = (htmlString) => {
    if (isQuillEmpty(htmlString)) return 0;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    const text = tempDiv.textContent || tempDiv.innerText || "";
    return text.length;
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
};


const Dashboard = ({ user }) => {
    const [notes, setNotes] = useState([]);
    const [folders, setFolders] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [currentNote, setCurrentNote] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [question, setQuestion] = useState('');
    const [aiResult, setAiResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaveDisabled, setIsSaveDisabled] = useState(true);
    
    const [activeTool, setActiveTool] = useState(null);
    const [mainView, setMainView] = useState('editor');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [taskTitle, setTaskTitle] = useState('');
    const [newNoteFolderId, setNewNoteFolderId] = useState(null);

    const getAuthHeaders = useCallback(() => ({
        headers: { userid: user.uid }
    }), [user.uid]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const headers = getAuthHeaders();
        const requests = [
            axios.get(`${API_URL}/notes`, headers),
            axios.get(`${API_URL}/folders`, headers),
            axios.get(`${API_URL}/tasks`, headers)
        ];
        const results = await Promise.allSettled(requests);

        if (results[0].status === 'fulfilled') setNotes(results[0].value.data);
        if (results[1].status === 'fulfilled') setFolders(results[1].value.data);
        if (results[2].status === 'fulfilled') {
            const formattedTasks = results[2].value.data.map(task => ({
                ...task,
                start: new Date(task.date),
                end: new Date(task.date),
            }));
            setTasks(formattedTasks);
        }
        setLoading(false);
    }, [getAuthHeaders]);

    useEffect(() => {
        if (user) fetchData();
    }, [user, fetchData]);

    // This hook now only controls the save button's disabled state
    useEffect(() => {
        setIsSaveDisabled(!title.trim() || isQuillEmpty(content));
    }, [title, content]);


    const handleNewNote = (folderId = null) => {
        setCurrentNote(null); // This signifies a new note
        setTitle('Untitled Note');
        setContent('');
        setActiveTool(null);
        setAiResult('');
        setMainView('editor');
        setNewNoteFolderId(folderId); // Remember which folder to save in
    };

    const handleSelectNote = (note) => {
        setCurrentNote(note);
        setTitle(note.title);
        setContent(note.content);
        setActiveTool(null);
        setAiResult('');
        setMainView('editor');
        setNewNoteFolderId(null);
    };

    // --- FIX: Reverted to a stable manual save function ---
    const handleSaveNote = async () => {
        if (isSaveDisabled) return;
        
        const noteData = { 
            title, 
            content, 
            characterCount: countCharacters(content),
            folderId: currentNote ? currentNote.folderId : newNoteFolderId 
        };

        try {
            setLoading(true);
            if (currentNote) {
                // Update existing note
                await axios.put(`${API_URL}/notes/${currentNote._id}`, noteData, getAuthHeaders());
            } else {
                // Create new note
                const response = await axios.post(`${API_URL}/notes`, noteData, getAuthHeaders());
                setCurrentNote(response.data); // Set the new note as the current one
            }
            await fetchData();
            alert('Note saved successfully!');
        } catch (error) {
            console.error("Error saving note:", error);
            alert('Failed to save note.');
        } finally {
            setLoading(false);
            setNewNoteFolderId(null); // Reset folder context
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (window.confirm('Are you sure you want to delete this note?')) {
            try {
                await axios.delete(`${API_URL}/notes/${noteId}`, getAuthHeaders());
                fetchData();
                if (currentNote && currentNote._id === noteId) setCurrentNote(null);
            } catch (error) {
                alert('Failed to delete note.');
            }
        }
    };

    const handleCreateFolder = async () => {
        const folderName = prompt("Enter a name for the new folder:");
        if (folderName && folderName.trim()) {
            try {
                await axios.post(`${API_URL}/folders`, { name: folderName }, getAuthHeaders());
                fetchData();
            } catch (error) {
                alert("Failed to create folder.");
            }
        }
    };

    const handleSelectSlot = useCallback((slotInfo) => {
        setSelectedDate(slotInfo.start);
        setIsModalOpen(true);
    }, []);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!taskTitle.trim()) return;
        try {
            await axios.post(`${API_URL}/tasks`, { title: taskTitle, date: selectedDate }, getAuthHeaders());
            setTaskTitle('');
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            alert("Failed to create task.");
        }
    };

    const handleDeleteTask = async (task) => {
        if (window.confirm(`Are you sure you want to delete the task: "${task.title}"?`)) {
            try {
                await axios.delete(`${API_URL}/tasks/${task._id}`, getAuthHeaders());
                fetchData();
            } catch (error) {
                alert("Failed to delete task.");
            }
        }
    };

    const handleSummarize = async () => {
        if (!currentNote) return;
        setLoading(true);
        setAiResult('');
        try {
            const response = await axios.post(`${API_URL}/notes/summarize`, { content: currentNote.content }, getAuthHeaders());
            setAiResult(response.data.summary);
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to get summary.';
            setAiResult(`Error: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };
    
    const handleSolveQuestion = async () => {
        if (!question.trim()) return;
        setLoading(true);
        setAiResult('');
        try {
            const response = await axios.post(`${API_URL}/notes/solve`, { question }, getAuthHeaders());
            setAiResult(response.data.answer);
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to get an answer.';
            setAiResult(`Error: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAiResult = async () => {
        if (!aiResult || aiResult.startsWith('Error:')) return;
        let newTitle = "AI Generated Note";
        let targetFolderId = null;

        if (activeTool === 'summarize' && currentNote) {
            newTitle = `Summary of: ${currentNote.title}`;
            targetFolderId = currentNote.folderId;
        } else if (mainView === 'solver' && question) {
            newTitle = `Answer for: "${question.substring(0, 30)}..."`;
        }
        
        const newContent = `<pre>${aiResult}</pre>`;
        const newCharacterCount = countCharacters(newContent);
        const noteData = { title: newTitle, content: newContent, characterCount: newCharacterCount, folderId: targetFolderId };
        
        try {
            const response = await axios.post(`${API_URL}/notes`, noteData, getAuthHeaders());
            await fetchData();
            handleSelectNote(response.data);
            alert('AI result saved as a new note!');
        } catch (error) {
            alert('Failed to save AI result.');
        }
    };

    const modules = {
        toolbar: [
          [{ 'header': [1, 2, false] }],
          ['bold', 'italic', 'underline','strike', 'blockquote'],
          [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
          ['link', 'image'],
          [{ 'color': [] }, { 'background': [] }],
          ['clean']
        ],
    };

    const filteredNotes = notes.filter(note => 
        note.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderEditorView = () => (
        <div className="note-editor">
            <div className="editor-header">
                <input
                    type="text"
                    placeholder="Note Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <div className="editor-tools">
                    <button 
                        onClick={() => setActiveTool(activeTool === 'summarize' ? null : 'summarize')} 
                        className={`tool-btn ${activeTool === 'summarize' ? 'active' : ''}`}
                        disabled={isQuillEmpty(content)}
                        title="Summarize Note"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>
                    </button>
                </div>
            </div>
            
            {activeTool === 'summarize' && (
                 <div className="ai-feature">
                    <h3>Summarize Note</h3>
                    <button onClick={handleSummarize} disabled={!currentNote || loading}>
                        {loading ? 'Summarizing...' : `Generate Summary`}
                    </button>
                    {aiResult && (
                        <div className="ai-result-container">
                            <div className="ai-result"><pre>{aiResult}</pre></div>
                            <button onClick={handleSaveAiResult} className="save-ai-btn" disabled={loading || aiResult.startsWith('Error:')}>
                                Save as Note
                            </button>
                        </div>
                    )}
                </div>
            )}

            <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={modules}
            />
            <div className="status-bar">
                <span className="char-count">{countCharacters(content)} characters</span>
                 {/* --- Re-added Save Button --- */}
                <button className="save-note-btn-main" onClick={handleSaveNote} disabled={isSaveDisabled}>Save</button>
            </div>
        </div>
    );

    const renderSolverView = () => (
        <div className="ai-feature solver-view">
            <h2>Question Solver</h2>
            <p>Get detailed answers and explanations for any question.</p>
            <textarea
                placeholder="Paste your academic question here..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
            />
            <button onClick={handleSolveQuestion} disabled={!question.trim() || loading}>
                {loading ? 'Solving...' : 'Solve Question'}
            </button>
            {aiResult && (
                <div className="ai-result-container">
                    <div className="ai-result"><pre>{aiResult}</pre></div>
                    <button onClick={handleSaveAiResult} className="save-ai-btn" disabled={loading || aiResult.startsWith('Error:')}>
                        Save as Note
                    </button>
                </div>
            )}
        </div>
    );

    const renderCalendarView = () => (
        <div className="calendar-container">
            <Calendar
                localizer={localizer}
                events={tasks}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                selectable
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleDeleteTask}
            />
        </div>
    );

    return (
        <div className="dashboard">
            <div className="sidebar">
                <div className="sidebar-actions">
                    <button onClick={() => handleNewNote()} className="new-note-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <span>New Note</span>
                    </button>
                    <button onClick={handleCreateFolder} className="new-folder-btn" title="New Folder">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>
                    </button>
                </div>
                <h3>My Notes</h3>
                <div className="search-bar-container">
                    <input
                        type="text"
                        placeholder="Search notes..."
                        className="search-bar"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <ul>
                    {folders.map(folder => {
                        const notesInFolder = filteredNotes.filter(note => note.folderId === folder._id);
                        if (searchTerm && notesInFolder.length === 0) return null;

                        return (
                            <li key={folder._id} className="folder-item">
                                <div className="folder-header">
                                    <span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg> {folder.name}</span>
                                    <button className="add-note-to-folder-btn" onClick={(e) => { e.stopPropagation(); handleNewNote(folder._id); }}>+</button>
                                </div>
                                <ul className="nested-notes-list">
                                    {notesInFolder.map(note => (
                                        <li key={note._id} onClick={() => handleSelectNote(note)} className={currentNote?._id === note._id ? 'active' : ''}>
                                            <div className="note-item-content">
                                                <span className="note-title-sidebar">{note.title}</span>
                                                <div className="note-meta">
                                                    <span className="note-date">{formatDate(note.updatedAt)}</span>
                                                    <span>{note.characterCount} chars</span>
                                                </div>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteNote(note._id); }} className="delete-btn">X</button>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        );
                    })}
                    {filteredNotes.filter(note => !note.folderId).map(note => (
                        <li key={note._id} onClick={() => handleSelectNote(note)} className={currentNote?._id === note._id ? 'active' : ''}>
                            <div className="note-item-content">
                                <span className="note-title-sidebar">{note.title}</span>
                                <div className="note-meta">
                                    <span className="note-date">{formatDate(note.updatedAt)}</span>
                                    <span>{note.characterCount} chars</span>
                                </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteNote(note._id); }} className="delete-btn">X</button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="main-content">
                <div className="view-switcher">
                    <div className="view-switcher-buttons">
                        <button onClick={() => setMainView('editor')} className={mainView === 'editor' ? 'active' : ''}>Editor</button>
                        <button onClick={() => setMainView('solver')} className={mainView === 'solver' ? 'active' : ''}>Question Solver</button>
                        <button onClick={() => setMainView('calendar')} className={mainView === 'calendar' ? 'active' : ''}>Calendar</button>
                    </div>
                </div>

                {mainView === 'editor' && renderEditorView()}
                {mainView === 'editor' && !currentNote && (
                    <div className="no-note-selected">
                        <h2>Select a note to get started</h2>
                        <p>Or create a new one to begin writing.</p>
                    </div>
                )}
                {mainView === 'solver' && renderSolverView()}
                {mainView === 'calendar' && renderCalendarView()}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>New Task for {moment(selectedDate).format('MMMM Do,YYYY')}</h3>
                        <form onSubmit={handleCreateTask}>
                            <input
                                type="text"
                                placeholder="Task title..."
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                autoFocus
                            />
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit">Create Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
