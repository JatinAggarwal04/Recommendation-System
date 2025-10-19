import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import ChatPage from './components/ChatPage';
import AnalyticsPage from './components/AnalyticsPage';
import './index.css';

// ✅ Import the Analytics component from Vercel
import { Analytics } from '@vercel/analytics/react';

// --- Main App Component with Routing ---
const App = () => {
    return (
        <>
            <Router>
                <div className="app-container">
                    <div className="chat-widget">
                        <header className="chat-header">
                            <h1>AI Product Recommendation System</h1>
                            <nav>
                                <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>Chat</NavLink>
                                <NavLink to="/analytics" className={({ isActive }) => isActive ? 'active' : ''}>Analytics</NavLink>
                            </nav>
                        </header>
                        <main className="chat-body">
                            <Routes>
                                <Route path="/" element={<ChatPage />} />
                                <Route path="/analytics" element={<AnalyticsPage />} />
                            </Routes>
                        </main>
                    </div>
                </div>
            </Router>

            {/* ✅ Add Vercel Analytics component here */}
            <Analytics />
        </>
    );
};

export default App;