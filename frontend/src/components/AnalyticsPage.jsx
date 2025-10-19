import React, { useState, useEffect} from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from 'recharts';
import { TrendingUp, Package, Award, Grid3x3, DollarSign, Star, Activity, ShoppingBag } from 'lucide-react';

const AnalyticsPage = () => {
  const [stats, setStats] = useState({
    total_products: 0,
    top_brands: [],
    top_categories: [],
    price_distribution: [],
    category_metrics: [],
    average_price: 0,
    most_expensive: null,
    least_expensive: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animatedCount, setAnimatedCount] = useState(0);
  const [animatedPrice, setAnimatedPrice] = useState(0);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${API_URL}/analytics`);
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const data = await response.json();
        setStats(data);
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

  useEffect(() => {
    if (stats.total_products > 0) {
      let start = 0;
      const end = stats.total_products;
      const duration = 2000;
      const increment = end / (duration / 16);
      
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setAnimatedCount(end);
          clearInterval(timer);
        } else {
          setAnimatedCount(Math.floor(start));
        }
      }, 16);
      
      return () => clearInterval(timer);
    }
  }, [stats.total_products]);

  useEffect(() => {
    if (stats.average_price > 0) {
      let start = 0;
      const end = stats.average_price;
      const duration = 2000;
      const increment = end / (duration / 16);
      
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setAnimatedPrice(end);
          clearInterval(timer);
        } else {
          setAnimatedPrice(start);
        }
      }, 16);
      
      return () => clearInterval(timer);
    }
  }, [stats.average_price]);

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="loading-state">
          <div style={{
            width: '50px',
            height: '50px',
            border: '2px solid #f5f5f5',
            borderTop: '2px solid #FF6B6B',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ color: '#666', fontWeight: '400' }}>Loading analytics...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div className="error-state">{error}</div>
      </div>
    );
  }

  const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
  
  const pieData = stats.top_categories.slice(0, 6).map((cat, idx) => ({
    name: cat.name,
    value: cat.count,
    color: COLORS[idx % COLORS.length]
  }));

  const totalBrandProducts = stats.top_brands.reduce((sum, brand) => sum + brand.count, 0);
  
  const brandsWithPercentage = stats.top_brands.map(brand => ({
    ...brand,
    percentage: totalBrandProducts > 0 ? ((brand.count / totalBrandProducts) * 100).toFixed(1) : 0
  }));

  const topCategoryData = stats.top_categories.slice(0, 6).map((cat, idx) => ({
    category: cat.name.length > 12 ? cat.name.substring(0, 12) + '...' : cat.name,
    products: cat.count
  }));

  return (
    <div className="analytics-container">
      {/* Hero Header */}
      <div style={{
        background: '#ffffff',
        border: '2px solid #e9ecef',
        borderRadius: '16px',
        padding: '3rem 2.5rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          marginBottom: '2.5rem',
          paddingBottom: '1.5rem',
          borderBottom: '2px solid #e9ecef'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: '#f8f9fa',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Package size={24} color="#2c3e50" />
          </div>
          <div>
            <h1 style={{ 
              fontSize: '1.75rem', 
              fontWeight: '600', 
              margin: 0,
              color: '#2c3e50',
              letterSpacing: '-0.02em'
            }}>
              Analytics Dashboard
            </h1>
            <p style={{ 
              margin: '0.25rem 0 0 0', 
              fontSize: '0.875rem', 
              color: '#6c757d',
              fontWeight: '400'
            }}>
              Real-time insights into your furniture catalog
            </p>
          </div>
        </div>
        
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '2rem'
        }}>
          <div>
            <div style={{ 
              fontSize: '0.75rem', 
              fontWeight: '500',
              color: '#6c757d', 
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Total Products
            </div>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: '600',
              color: '#2c3e50',
              letterSpacing: '-0.02em'
            }}>
              {animatedCount.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ 
              fontSize: '0.75rem', 
              fontWeight: '500',
              color: '#6c757d', 
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Average Price
            </div>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: '600',
              color: '#2c3e50',
              letterSpacing: '-0.02em'
            }}>
              ${animatedPrice.toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: '#ffffff',
          border: '2px solid #e9ecef',
          borderRadius: '12px',
          padding: '1.5rem',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#f8f9fa',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Award size={20} color="#2c3e50" />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6c757d', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Brands
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '600', color: '#2c3e50' }}>
            {stats.top_brands.length}
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          border: '2px solid #e9ecef',
          borderRadius: '12px',
          padding: '1.5rem',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#f8f9fa',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Grid3x3 size={20} color="#2c3e50" />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6c757d', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Categories
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '600', color: '#2c3e50' }}>
            {stats.top_categories.length}
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          border: '2px solid #e9ecef',
          borderRadius: '12px',
          padding: '1.5rem',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#f8f9fa',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={20} color="#2c3e50" />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: '500', color: '#6c757d', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Avg per Brand
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '600', color: '#2c3e50' }}>
            {stats.top_brands.length > 0 ? Math.round(totalBrandProducts / stats.top_brands.length) : 0}
          </div>
        </div>
      </div>

      {/* Price Insights */}
      {stats.most_expensive && stats.least_expensive && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: '#F7DC6F',
            borderRadius: '12px',
            padding: '1.5rem',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(247, 220, 111, 0.15)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(247, 220, 111, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(247, 220, 111, 0.15)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'rgba(0,0,0,0.1)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Star size={16} color="#2c3e50" />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#2c3e50', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Most Expensive
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '0.75rem', color: '#2c3e50' }}>
              {stats.most_expensive.price}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#34495e', lineHeight: '1.5' }}>
              {stats.most_expensive.title.substring(0, 70)}...
            </div>
          </div>

          <div style={{
            background: '#98D8C8',
            borderRadius: '12px',
            padding: '1.5rem',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(152, 216, 200, 0.15)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(152, 216, 200, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(152, 216, 200, 0.15)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'rgba(0,0,0,0.1)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <DollarSign size={16} color="#2c3e50" />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#2c3e50', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Most Affordable
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '0.75rem', color: '#2c3e50' }}>
              {stats.least_expensive.price}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#34495e', lineHeight: '1.5' }}>
              {stats.least_expensive.title.substring(0, 70)}...
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="chart-card" style={{ 
          gridColumn: 'span 2',
          border: '2px solid #FF6B6B',
          boxShadow: '0 4px 16px rgba(255, 107, 107, 0.12)'
        }}>
          <h2 style={{ 
            fontSize: '1rem',
            fontWeight: '600',
            color: '#FF6B6B',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Award size={18} />
            Top Brands
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={stats.top_brands} margin={{ top: 20, right: 20, bottom: 80, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={120} 
                interval={0}
                tick={{ fill: '#666', fontSize: 11, fontWeight: '400' }}
                axisLine={{ stroke: '#e8e8e8' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#666', fontSize: 11, fontWeight: '400' }}
                axisLine={{ stroke: '#e8e8e8' }}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  background: '#ffffff',
                  border: '2px solid #FF6B6B',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(255, 107, 107, 0.15)',
                  fontSize: '0.875rem'
                }}
                cursor={{ fill: 'rgba(255, 107, 107, 0.05)' }}
              />
              <Bar dataKey="count" fill="#FF6B6B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card" style={{ 
          border: '2px solid #4ECDC4',
          boxShadow: '0 4px 16px rgba(78, 205, 196, 0.12)'
        }}>
          <h2 style={{ 
            fontSize: '1rem',
            fontWeight: '600',
            color: '#4ECDC4',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Grid3x3 size={18} />
            Category Distribution
          </h2>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => {
                  const displayName = name.length > 15 ? name.substring(0, 12) + '...' : name;
                  return `${displayName} ${(percent * 100).toFixed(0)}%`;
                }}
                outerRadius={90}
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={2}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  background: '#ffffff',
                  border: '2px solid #4ECDC4',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(78, 205, 196, 0.15)',
                  fontSize: '0.875rem'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card" style={{ 
          border: '2px solid #45B7D1',
          boxShadow: '0 4px 16px rgba(69, 183, 209, 0.12)'
        }}>
          <h2 style={{ 
            fontSize: '1rem',
            fontWeight: '600',
            color: '#45B7D1',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <ShoppingBag size={18} />
            Products by Category
          </h2>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={topCategoryData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis 
                dataKey="category" 
                tick={{ fill: '#666', fontSize: 10, fontWeight: '400' }}
                axisLine={{ stroke: '#e8e8e8' }}
                tickLine={false}
                angle={-35}
                textAnchor="end"
                height={90}
                interval={0}
              />
              <YAxis 
                tick={{ fill: '#666', fontSize: 11, fontWeight: '400' }}
                axisLine={{ stroke: '#e8e8e8' }}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  background: '#ffffff',
                  border: '2px solid #45B7D1',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(69, 183, 209, 0.15)',
                  fontSize: '0.875rem'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="products" 
                stroke="#45B7D1" 
                strokeWidth={3}
                dot={{ fill: '#45B7D1', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {stats.price_distribution && stats.price_distribution.length > 0 && (
          <div className="chart-card" style={{ 
            gridColumn: 'span 2',
            border: '2px solid #FFA07A',
            boxShadow: '0 4px 16px rgba(255, 160, 122, 0.12)'
          }}>
            <h2 style={{ 
              fontSize: '1rem',
              fontWeight: '600',
              color: '#FFA07A',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <DollarSign size={18} />
              Price Distribution
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={stats.price_distribution} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFA07A" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FFA07A" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis 
                  dataKey="range" 
                  tick={{ fill: '#666', fontSize: 11, fontWeight: '400' }}
                  axisLine={{ stroke: '#e8e8e8' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#666', fontSize: 11, fontWeight: '400' }}
                  axisLine={{ stroke: '#e8e8e8' }}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: '#ffffff',
                    border: '2px solid #FFA07A',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(255, 160, 122, 0.15)',
                    fontSize: '0.875rem'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#FFA07A" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPrice)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {stats.category_metrics && stats.category_metrics.length > 0 && (
          <div className="chart-card" style={{ 
            border: '2px solid #BB8FCE',
            boxShadow: '0 4px 16px rgba(187, 143, 206, 0.12)'
          }}>
            <h2 style={{ 
              fontSize: '1rem',
              fontWeight: '600',
              color: '#BB8FCE',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Activity size={18} />
              Category Metrics
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={stats.category_metrics}>
                <PolarGrid stroke="#e8e8e8" />
                <PolarAngleAxis 
                  dataKey="category" 
                  tick={{ fill: '#666', fontSize: 10, fontWeight: '400' }} 
                />
                <PolarRadiusAxis 
                  tick={{ fill: '#666', fontSize: 9 }}
                  axisLine={{ stroke: '#e8e8e8' }}
                />
                <Radar 
                  name="Products" 
                  dataKey="count" 
                  stroke="#BB8FCE" 
                  fill="#BB8FCE" 
                  fillOpacity={0.3}
                  strokeWidth={3}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: '#ffffff',
                    border: '2px solid #BB8FCE',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(187, 143, 206, 0.15)',
                    fontSize: '0.875rem'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="chart-card" style={{ 
          border: '2px solid #85C1E2',
          boxShadow: '0 4px 16px rgba(133, 193, 226, 0.12)'
        }}>
          <h2 style={{ 
            fontSize: '1rem',
            fontWeight: '600',
            color: '#85C1E2',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem'
          }}>
            <Award size={18} />
            Brand Rankings
          </h2>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.75rem',
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '0.25rem'
          }}>
            {brandsWithPercentage.slice(0, 8).map((brand, idx) => (
              <div key={idx} style={{
                background: '#f8f9fa',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #e9ecef',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e9ecef';
                e.currentTarget.style.borderColor = '#85C1E2';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.borderColor = '#e9ecef';
                e.currentTarget.style.transform = 'translateX(0)';
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: '0.75rem',
                  alignItems: 'center'
                }}>
                  <span style={{ 
                    fontWeight: '500', 
                    fontSize: '0.875rem',
                    color: '#2c3e50'
                  }}>
                    {brand.name}
                  </span>
                  <span style={{ 
                    fontWeight: '600', 
                    fontSize: '1rem',
                    color: '#85C1E2'
                  }}>
                    {brand.count}
                  </span>
                </div>
                <div style={{ 
                  height: '6px', 
                  background: '#e9ecef', 
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    background: '#85C1E2',
                    width: `${brand.percentage}%`,
                    borderRadius: '3px',
                    transition: 'width 1s ease'
                  }} />
                </div>
                <div style={{ 
                  marginTop: '0.5rem', 
                  fontSize: '0.75rem', 
                  color: '#6c757d',
                  fontWeight: '400'
                }}>
                  {brand.percentage}% of catalog
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '2rem',
        padding: '1.25rem',
        background: '#f8f9fa',
        border: '2px solid #e9ecef',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <p style={{ 
          color: '#6c757d', 
          fontSize: '0.8125rem', 
          margin: 0,
          fontWeight: '400'
        }}>
          Last updated: {new Date().toLocaleTimeString()} • {stats.total_products} products tracked
        </p>
      </div>
    </div>
  );
};

export default AnalyticsPage;