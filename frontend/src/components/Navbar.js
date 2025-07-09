import React from 'react';
import { Link } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';

const Navbar = ({ user }) => {
    const auth = getAuth();

    const handleLogout = () => {
        signOut(auth);
    };

    return (
        <nav className="navbar">
            <h1>NOTABLE</h1>
            <div className="nav-links">
                {user ? (
                    <>
                        <span>Welcome, {user.email}</span>
                        <button onClick={handleLogout}>Logout</button>
                    </>
                ) : (
                    <Link to="/login">Login</Link>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
