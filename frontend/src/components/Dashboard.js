import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const API_URL = process.env.REACT_APP_API_URL;

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
    const [currentNote, setCurrentNote] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [question, setQuestion] = useState('');
    const [aiResult, setAiResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [saveStatus, setSaveStatus] = useState('Saved');
    
    const [activeTool, setActiveTool] = useState(null);
    const [mainView, setMainView] = useState('editor');

    const debounceTimeout = useRef(null);

    const getAuthHeaders = useCallback(() => ({
        headers: { userid: user.uid }
    }), [user.uid]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [notesResponse, foldersResponse] = await Promise.all([
                axios.get(`${API_URL}/notes`, getAuthHeaders()),
                axios.get(`${API_URL}/folders`, getAuthHeaders())
            ]);
            setNotes(notesResponse.data);
            setFolders(foldersResponse.data);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, [getAuthHeaders]);

    useEffect(() => {
        if (user) fetchData();
    }, [user, fetchData]);

    // Auto-save logic
    useEffect(() => {
        if (!currentNote) return;

        setSaveStatus('Unsaved changes...');
        
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        debounceTimeout.current = setTimeout(async () => {
            if (isQuillEmpty(content) || !title.trim()) {
                return;
            }
            
            setSaveStatus('Saving...');
            const noteData = { 
                title, 
                content, 
                characterCount: countCharacters(content),
                folderId: currentNote.folderId
            };
            try {
                await axios.put(`${API_URL}/notes/${currentNote._id}`, noteData, getAuthHeaders());
                setSaveStatus('Saved');
                fetchData();
            } catch (error) {
                console.error("Auto-save failed:", error);
                setSaveStatus('Save failed');
            }
        }, 1500);

        return () => {
            clearTimeout(debounceTimeout.current);
        };
    }, [title, content, currentNote, getAuthHeaders, fetchData]);


    const handleNewNote = async (folderId = null) => {
        const newTitle = "Untitled Note";
        const newContent = "";
        const noteData = {
            title: newTitle,
            content: newContent,
            characterCount: 0,
            folderId: folderId
        };
        try {
            const response = await axios.post(`${API_URL}/notes`, noteData, getAuthHeaders());
            await fetchData();
            handleSelectNote(response.data);
            setMainView('editor');
        } catch (error) {
            console.error("Error creating new note:", error);
            alert("Failed to create a new note.");
        }
    };

    const handleSelectNote = (note) => {
        setCurrentNote(note);
        setTitle(note.title);
        setContent(note.content);
        setActiveTool(null);
        setAiResult('');
        setMainView('editor');
    };

    const handleDeleteNote = async (noteId) => {
        if (window.confirm('Are you sure you want to delete this note?')) {
            try {
                await axios.delete(`${API_URL}/notes/${noteId}`, getAuthHeaders());
                fetchData();
                if (currentNote && currentNote._id === noteId) {
                    setCurrentNote(null);
                    setTitle('');
                    setContent('');
                }
            } catch (error) {
                console.error("Error deleting note:", error);
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
                console.error("Error creating folder:", error);
                alert("Failed to create folder.");
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
            console.error("Error saving AI result as note:", error);
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
                <span className="save-status">{saveStatus}</span>
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
                    </div>
                </div>

                {mainView === 'editor' && currentNote && renderEditorView()}
                {mainView === 'editor' && !currentNote && (
                    <div className="no-note-selected">
                        <h2>Select a note to get started</h2>
                        <p>Or create a new one to begin writing.</p>
                    </div>
                )}
                {mainView === 'solver' && renderSolverView()}
            </div>
        </div>
    );
};

export default Dashboard;
