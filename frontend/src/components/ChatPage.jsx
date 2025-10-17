import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ChatPage = () => {
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

        const apiHistory = currentMessages.map(msg => ({
            from_user: msg.from,
            text: msg.text
        }));
        
        const apiPayload = {
            query: input,
            history: apiHistory,
            last_products: lastShownProducts.map(p => ({ id: p.id, title: p.title, generated_description: p.generated_description }))
        };

        try {
            const response = await axios.post('http://127.0.0.1:8000/recommend', apiPayload);
            const data = response.data;
            let botMessage;

            if (data.type === 'greeting' || data.type === 'answer') {
                botMessage = { from: 'bot', text: data.response };
                if (data.type === 'greeting') setLastShownProducts([]);
            } else if (data.type === 'products' && data.recommendations?.length > 0) {
                botMessage = { from: 'bot', text: "Here's what I found based on your request:", products: data.recommendations };
                setLastShownProducts(data.recommendations); 
            } else {
                botMessage = { from: 'bot', text: "I couldn't find any specific matches. Could you try describing it differently?" };
                setLastShownProducts([]);
            }
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error("Error fetching recommendations:", error);
            const errorMessage = { from: 'bot', text: 'Sorry, I seem to be having trouble connecting. Please try again.' };
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
                                                src={p.image} 
                                                alt={p.title} 
                                                className="product-image"
                                                onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/100x100/EEE/31343C?text=N/A'; }} 
                                            />
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
            <form className="chat-input-form" onSubmit={sendMessage}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe the furniture you're looking for..."
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="send-icon">
                        <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                    </svg>
                </button>
            </form>
        </>
    );
};

export default ChatPage;

