import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';

const Navbar = ({ user, isDarkMode, toggleDarkMode }) => {
    const auth = getAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const handleLogout = () => {
        signOut(auth);
        setIsMenuOpen(false);
    };

    // Close menu if clicking outside of it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    const getInitials = (email) => {
        if (!email) return '?';
        return email.substring(0, 2).toUpperCase();
    };

    return (
        <nav className="navbar">
            <h1>NOTABLE</h1>
            <div className="nav-links">
                {user ? (
                    <div className="user-menu-container" ref={menuRef}>
                        <button className="user-avatar-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            {getInitials(user.email)}
                        </button>
                        {isMenuOpen && (
                            <div className="user-menu-dropdown">
                                <div className="user-menu-header">
                                    <p>Signed in as</p>
                                    <strong>{user.email}</strong>
                                </div>
                                <div className="user-menu-item" onClick={toggleDarkMode}>
                                    {isDarkMode ? '☀️' : '🌙'}
                                    <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                                </div>
                                <div className="user-menu-item" onClick={handleLogout}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                    <span>Logout</span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link to="/login">
                        <button>Login</button>
                    </Link>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
