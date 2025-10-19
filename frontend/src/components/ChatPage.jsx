import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ChatPage = () => {
    const [messages, setMessages] = useState([
        { from: 'bot', text: 'Hello! How can I help you find the perfect furniture today?' }
    ]);
    const [lastShownProducts, setLastShownProducts] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lightboxImage, setLightboxImage] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    // Close lightbox on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && lightboxImage) {
                setLightboxImage(null);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [lightboxImage]);

    const openLightbox = (imageUrl, productTitle) => {
        setLightboxImage({ url: imageUrl, title: productTitle });
    };

    const closeLightbox = () => {
        setLightboxImage(null);
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { from: 'user', text: input };
        const currentMessagesForState = [...messages, userMessage];

        // Prepare the history for the API, ensuring the backend gets the right format
        const historyForAPI = messages.map(m => ({ from_user: m.from, text: m.text }));

        setMessages(currentMessagesForState);
        setInput('');
        setIsLoading(true);

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
            const response = await axios.post(`${API_URL}/recommend`, {
                query: input,
                history: [...historyForAPI, { from_user: 'user', text: input }],
                last_products: lastShownProducts.map(p => ({
                    id: p.id,
                    title: p.title,
                    image: p.image,
                    price: p.price,
                    key_features: p.key_features,
                    best_for: p.best_for,
                    dimensions: p.dimensions,
                    material: p.material,
                    color: p.color,
                    brand: p.brand
                }))
            });

            const data = response.data;
            
            // Log the response for debugging
            console.log('Backend response:', data);
            
            let botMessage;

            // Handle greeting response
            if (data.type === 'greeting') {
                botMessage = { from: 'bot', text: data.response };
                setLastShownProducts([]); // Reset products on greeting
            } 
            // Handle answer/question response
            else if (data.type === 'answer') {
                botMessage = { from: 'bot', text: data.response };
                // Don't reset products for answers/questions
            } 
            // Handle no results found
            else if (data.type === 'no_results') {
                botMessage = { from: 'bot', text: data.response };
                setLastShownProducts([]); // Clear products when no results
            }
            // Handle product recommendations
            else if (data.type === 'products' && data.recommendations?.length > 0) {
                // Use custom response message if provided, otherwise use default
                const responseText = data.response || "Here are some recommendations based on your request:";
                botMessage = { 
                    from: 'bot', 
                    text: responseText, 
                    products: data.recommendations 
                };
                setLastShownProducts(data.recommendations);
            } 
            // Fallback for unexpected responses
            else {
                console.error('Unexpected response format:', data);
                botMessage = { from: 'bot', text: "I'm sorry, I couldn't find any products that match your search. Please try describing it differently." };
                setLastShownProducts([]);
            }
            
            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error("Error fetching recommendations:", error);
            console.error("Error details:", error.response?.data);
            
            let errorText = 'Sorry, I seem to be having trouble connecting.';
            
            if (error.response) {
                // Server responded with error
                errorText = `Server error: ${error.response.status}. ${error.response.data?.detail || 'Please try again.'}`;
            } else if (error.request) {
                // Request made but no response
                errorText = 'No response from server. Please check if the backend is running.';
            } else {
                // Something else happened
                errorText = `Error: ${error.message}`;
            }
            
            const errorMessage = { from: 'bot', text: errorText };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`message-wrapper ${msg.from}`}>
                        <div className="message-bubble">
                            <p>{msg.text}</p>
                            {msg.products && (
                                <div className="product-list">
                                    {msg.products.map(p => (
                                        <div key={p.id} className="product-card">
                                            <img
                                                src={p.image || 'https://placehold.co/100x100/EEE/31343C?text=No+Image'}
                                                alt={p.title}
                                                className="product-image clickable"
                                                onClick={() => {
                                                    const imageUrl = p.image || 'https://placehold.co/100x100/EEE/31343C?text=No+Image';
                                                    openLightbox(imageUrl, p.title);
                                                }}
                                                onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/100x100/EEE/31343C?text=No+Image'; }}
                                            />
                                            <div className="product-info">
                                                <h3>{p.title}</h3>
                                                <p className="product-price">{p.price}</p>
                                                <div className="product-summary">
                                                    <h4>Key Features:</h4>
                                                    <ul>
                                                        {p.key_features && p.key_features.map((feature, i) => <li key={i}>{feature}</li>)}
                                                    </ul>
                                                    <h4>Best For:</h4>
                                                    <p>{p.best_for}</p>
                                                    
                                                    {/* Display additional metadata with clear labels */}
                                                    <div className="product-details">
                                                        {p.dimensions && (
                                                            <div className="detail-row">
                                                                <span className="detail-label">Dimensions:</span>
                                                                <span className="detail-value">{p.dimensions}</span>
                                                            </div>
                                                        )}
                                                        {p.material && (
                                                            <div className="detail-row">
                                                                <span className="detail-label">Material:</span>
                                                                <span className="detail-value">{p.material}</span>
                                                            </div>
                                                        )}
                                                        {p.color && (
                                                            <div className="detail-row">
                                                                <span className="detail-label">Color:</span>
                                                                <span className="detail-value">{p.color}</span>
                                                            </div>
                                                        )}
                                                        {p.brand && (
                                                            <div className="detail-row">
                                                                <span className="detail-label">Brand:</span>
                                                                <span className="detail-value">{p.brand}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="message-wrapper bot">
                        <div className="message-bubble">
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Lightbox Modal */}
            {lightboxImage && (
                <div className="lightbox-overlay" onClick={closeLightbox}>
                    <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
                        <button className="lightbox-close" onClick={closeLightbox} aria-label="Close">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                        <img 
                            src={lightboxImage.url} 
                            alt={lightboxImage.title}
                            className="lightbox-image"
                        />
                        <div className="lightbox-caption">{lightboxImage.title}</div>
                    </div>
                </div>
            )}

            <form className="chat-input-form" onSubmit={sendMessage}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe the furniture you're looking for..."
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading}>
                    <svg className="send-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                    </svg>
                </button>
            </form>
        </>
    );
};

export default ChatPage;