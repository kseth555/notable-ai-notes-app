import React, { useState, useEffect, useCallback } from 'react';
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


const Dashboard = ({ user, isDarkMode, toggleDarkMode }) => {
    const [activeTab, setActiveTab] = useState('notes');
    const [notes, setNotes] = useState([]);
    const [currentNote, setCurrentNote] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [question, setQuestion] = useState('');
    const [aiResult, setAiResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSaveDisabled, setIsSaveDisabled] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [characterCount, setCharacterCount] = useState(0);

    useEffect(() => {
        setIsSaveDisabled(!title.trim() || isQuillEmpty(content));
        setCharacterCount(countCharacters(content));
    }, [title, content]);

    const getAuthHeaders = useCallback(() => ({
        headers: { userid: user.uid }
    }), [user.uid]);

    const fetchNotes = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/notes`, getAuthHeaders());
            setNotes(response.data);
        } catch (error) {
            console.error("Error fetching notes:", error);
        }
    }, [getAuthHeaders]);

    useEffect(() => {
        if (user) fetchNotes();
    }, [user, fetchNotes]);

    useEffect(() => {
        setAiResult('');
    }, [activeTab]);

    const handleNewNote = () => {
        setCurrentNote(null);
        setTitle('');
        setContent('');
        setActiveTab('notes');
    };

    const handleSelectNote = (note) => {
        setCurrentNote(note);
        setTitle(note.title);
        setContent(note.content);
        setActiveTab('notes');
    };

    const handleSaveNote = async () => {
        if (isSaveDisabled) {
            alert("Title and content are required.");
            return;
        }
        const noteData = { title, content, characterCount: countCharacters(content) };
        try {
            if (currentNote) {
                await axios.put(`${API_URL}/notes/${currentNote._id}`, noteData, getAuthHeaders());
            } else {
                await axios.post(`${API_URL}/notes`, noteData, getAuthHeaders());
            }
            fetchNotes();
            alert('Note saved successfully!');
        } catch (error) {
            console.error("Error saving note:", error);
            alert('Failed to save note.');
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (window.confirm('Are you sure you want to delete this note?')) {
            try {
                await axios.delete(`${API_URL}/notes/${noteId}`, getAuthHeaders());
                fetchNotes();
                if (currentNote && currentNote._id === noteId) {
                    handleNewNote();
                }
            } catch (error) {
                console.error("Error deleting note:", error);
                alert('Failed to delete note.');
            }
        }
    };

    const handleSummarize = async () => {
        if (!currentNote) {
            alert('Please select a note to summarize.');
            return;
        }
        setLoading(true);
        setAiResult('');
        try {
            const response = await axios.post(`${API_URL}/notes/summarize`, { content: currentNote.content }, getAuthHeaders());
            setAiResult(response.data.summary);
        } catch (error) {
            console.error("Error summarizing:", error);
            setAiResult('Failed to get summary.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleSolveQuestion = async () => {
        if (!question.trim()) {
            alert('Please enter a question.');
            return;
        }
        setLoading(true);
        setAiResult('');
        try {
            const response = await axios.post(`${API_URL}/notes/solve`, { question }, getAuthHeaders());
            setAiResult(response.data.answer);
        } catch (error) {
            console.error("Error solving question:", error);
            setAiResult('Failed to get an answer.');
        } finally {
            setLoading(false);
        }
    };

    // --- NEW: Function to save AI result as a new note ---
    const handleSaveAiResult = async () => {
        if (!aiResult) return;

        let newTitle = "";
        if (activeTab === 'summarize' && currentNote) {
            newTitle = `Summary of: ${currentNote.title}`;
        } else if (activeTab === 'solver' && question) {
            newTitle = `Answer for: "${question.substring(0, 30)}..."`;
        } else {
            newTitle = "AI Generated Note";
        }

        // The AI result is plain text with markdown-like formatting.
        // We wrap it in <pre> tags to preserve line breaks and spacing when viewed in Quill.
        const newContent = `<pre>${aiResult}</pre>`;
        const newCharacterCount = aiResult.length;

        const noteData = {
            title: newTitle,
            content: newContent,
            characterCount: newCharacterCount,
        };

        try {
            setLoading(true);
            await axios.post(`${API_URL}/notes`, noteData, getAuthHeaders());
            fetchNotes(); // Refresh the notes list in the sidebar
            alert('AI result saved as a new note!');
        } catch (error) {
            console.error("Error saving AI result as note:", error);
            alert('Failed to save AI result.');
        } finally {
            setLoading(false);
        }
    };

    const exportToPDF = () => {
        if (!currentNote) return;
        const doc = new jsPDF();
        doc.text(currentNote.title, 20, 20);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = currentNote.content;
        const plainText = tempDiv.innerText || "";
        doc.autoTable({
            startY: 30,
            body: [[plainText]],
            theme: 'grid',
            styles: { cellPadding: 3, fontSize: 10 }
        });
        doc.save(`${currentNote.title.replace(/\s+/g, '_')}.pdf`);
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

    return (
        <div className="dashboard">
            <div className="sidebar">
                <button onClick={handleNewNote} className="new-note-btn">+ New Note</button>
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
                    {filteredNotes.map(note => (
                        <li key={note._id} onClick={() => handleSelectNote(note)} className={currentNote?._id === note._id ? 'active' : ''}>
                            <div className="note-item-content">
                                <span className="note-title-sidebar">{note.title}</span>
                                <div className="note-meta">
                                    <span className="note-date">{formatDate(note.updatedAt)}</span>
                                    <span className="note-char-count">{note.characterCount} characters</span>
                                </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteNote(note._id); }} className="delete-btn">X</button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="main-content">
                <div className="tabs-container">
                    <div className="tabs">
                        <button onClick={() => setActiveTab('notes')} className={activeTab === 'notes' ? 'active' : ''}>📝 Notes Creation</button>
                        <button onClick={() => setActiveTab('summarize')} className={activeTab === 'summarize' ? 'active' : ''}>✨ Notes Summarization</button>
                        <button onClick={() => setActiveTab('solver')} className={activeTab === 'solver' ? 'active' : ''}>📚 Question Solver</button>
                    </div>
                    <button onClick={toggleDarkMode} className="dark-mode-toggle">
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>
                </div>

                {activeTab === 'notes' && (
                    <div className="note-editor">
                        <div className="editor-header">
                            <input
                                type="text"
                                placeholder="Note Title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            {currentNote && (
                                <div className="editor-dates">
                                    <span>Created: {formatDate(currentNote.createdAt)}</span>
                                    <span>Edited: {formatDate(currentNote.updatedAt)}</span>
                                </div>
                            )}
                        </div>
                        <ReactQuill
                            theme="snow"
                            value={content}
                            onChange={setContent}
                            modules={modules}
                        />
                        <div className="note-actions">
                            <button onClick={handleSaveNote} data-disabled={isSaveDisabled}>Save Note</button>
                            {currentNote && <button onClick={exportToPDF}>Export to PDF</button>}
                            <div className="live-char-count">{characterCount} characters</div>
                        </div>
                    </div>
                )}

                {activeTab === 'summarize' && (
                    <div className="ai-feature">
                        <h3>Summarize Note</h3>
                        <p>Select a note from the list and click the button below.</p>
                        <button onClick={handleSummarize} disabled={!currentNote || loading}>
                            {loading ? 'Summarizing...' : `Summarize "${currentNote?.title || 'selected note'}"`}
                        </button>
                        {aiResult && (
                            <div className="ai-result-container">
                                <div className="ai-result"><pre>{aiResult}</pre></div>
                                <button onClick={handleSaveAiResult} className="save-ai-btn" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save as Note'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'solver' && (
                    <div className="ai-feature">
                        <h3>Question Solver</h3>
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
                                <button onClick={handleSaveAiResult} className="save-ai-btn" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save as Note'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
