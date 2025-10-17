import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Main Chat Component ---
const RecommendationPage = () => {
    const [messages, setMessages] = useState([
        { from: 'bot', text: 'Hello! How can I help you find the perfect furniture today?' }
    ]);
    const [lastShownProducts, setLastShownProducts] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { from: 'user', text: input };
        const currentMessages = [...messages, userMessage];
        setMessages(currentMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await axios.post('http://127.0.0.1:8000/recommend', { 
                query: input,
                history: currentMessages,
                last_products: lastShownProducts // Send context of last shown products
            });
            
            const data = response.data;
            let botMessage;

            if (data.type === 'greeting' || data.type === 'answer') {
                botMessage = { from: 'bot', text: data.response };
                // Don't clear products on a Q&A, as the user might ask another question
                if(data.type === 'greeting') {
                    setLastShownProducts([]);
                }
            } else if (data.type === 'products' && data.recommendations?.length > 0) {
                botMessage = { from: 'bot', text: "Here's what I found based on your request:", products: data.recommendations };
                setLastShownProducts(data.recommendations); // Update the last shown products
            } else {
                botMessage = { from: 'bot', text: "I couldn't find any specific matches. Could you try describing it in a different way?" };
                setLastShownProducts([]);
            }
            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error("Error fetching recommendations:", error);
            const errorMessage = { from: 'bot', text: 'Sorry, I seem to be having trouble connecting. Please try again in a moment.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.from}`}>
                        <div className="message-bubble">
                            <p>{msg.text}</p>
                            {msg.products && (
                                <div className="product-list">
                                    {msg.products.map(p => (
                                        <div key={p.id} className="product-card">
                                            <img src={p.image} alt={p.title} onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/600x400/EEE/31343C?text=Image+Not+Found'; }} />
                                            <div className="product-info">
                                                <h3>{p.title}</h3>
                                                <p>{p.generated_description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                 {isLoading && (
                    <div className="message bot">
                         <div className="message-bubble">
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-form" onSubmit={sendMessage}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe the furniture you're looking for..."
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading}>Send</button>
            </form>
        </div>
    );
};


// --- Analytics Page Component ---
const AnalyticsPage = () => {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/analytics');
                setAnalyticsData(response.data);
            } catch (err) {
                setError("Failed to fetch analytics data.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <div className="loading-analytics">Loading Analytics...</div>;
    if (error) return <div className="error-analytics">{error}</div>;

    return (
        <div className="analytics-container">
            <h1>Product Analytics</h1>
            <div className="stat-card">
                <h2>Total Products Indexed</h2>
                <p>{analyticsData?.vector_count.toLocaleString() || 'N/A'}</p>
            </div>
            <div className="chart-container">
                <h2>Products by Category (Sample Data)</h2>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                        data={analyticsData?.dummy_chart_data}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// --- Main App Component with Routing ---
function App() {
    return (
        <div className="app-layout">
            <nav className="sidebar">
                <h2>FurniFind AI</h2>
                <ul>
                    <li><Link to="/">Recommender</Link></li>
                    <li><Link to="/analytics">Analytics</Link></li>
                </ul>
            </nav>
            <main className="content">
                <Routes>
                    <Route path="/" element={<RecommendationPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;

