import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AnalyticsPage = () => {
    const [stats, setStats] = useState({ total_products: 0, top_brands: [], top_categories: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const response = await axios.get('http://127.0.0.1:8000/analytics');
                setStats(response.data);
                setError(null);
            } catch (err) {
                console.error("Error fetching analytics:", err);
                setError("Failed to load analytics data. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);
    
    if (loading) {
        return <div className="loading-state">Loading Analytics...</div>;
    }
    
    if (error) {
        return <div className="error-state">{error}</div>;
    }

    return (
        <div className="analytics-container">
            <div className="stat-card">
                <h2>Total Products Indexed</h2>
                <p>{stats.total_products}</p>
            </div>
            <div className="chart-card">
                <h2>Top 10 Brands</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.top_brands} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={80} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Products" fill="#007bff" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
             <div className="chart-card">
                <h2>Top 10 Categories</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.top_categories} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={80} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Products" fill="#28a745" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default AnalyticsPage;

