import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from 'recharts';
import { TrendingUp, Package, Award, Grid3x3, DollarSign, Star, Activity, Zap } from 'lucide-react';

const AnalyticsPage = () => {
  const [stats, setStats] = useState({
    total_products: 0,
    top_brands: [],
    top_categories: [],
    price_distribution: [],
    monthly_trends: [],
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
        const response = await fetch('http://127.0.0.1:8000/analytics');
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

  // Animate total count
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

  // Animate average price
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
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '1.5rem'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            border: '4px solid #f0f2f5',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{
            fontSize: '1.2rem',
            color: 'var(--text-secondary)',
            fontWeight: '500'
          }}>Loading Analytics Dashboard...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '1rem',
          padding: '2rem'
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            boxShadow: '0 8px 16px rgba(245, 87, 108, 0.3)'
          }}>⚠️</div>
          <p style={{
            fontSize: '1.2rem',
            color: 'var(--text-primary)',
            fontWeight: '600',
            textAlign: 'center'
          }}>{error}</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140'];
  
  // Prepare data for pie chart
  const pieData = stats.top_categories.slice(0, 6).map((cat, idx) => ({
    name: cat.name,
    value: cat.count,
    color: COLORS[idx % COLORS.length]
  }));

  // Calculate total for percentage
  const totalBrandProducts = stats.top_brands.reduce((sum, brand) => sum + brand.count, 0);
  
  // Add percentage to brands
  const brandsWithPercentage = stats.top_brands.map(brand => ({
    ...brand,
    percentage: totalBrandProducts > 0 ? ((brand.count / totalBrandProducts) * 100).toFixed(1) : 0
  }));

  return (
    <div className="analytics-container">
      {/* Hero Stats Section */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '1.5rem',
        padding: '3rem 2rem',
        color: 'white',
        marginBottom: '2rem',
        boxShadow: '0 20px 60px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(40px)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '-30px',
          width: '150px',
          height: '150px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(40px)'
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <Package size={40} />
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: '700', 
              margin: 0,
              textShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}>
              Analytics Dashboard
            </h1>
          </div>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2rem',
            marginTop: '2rem'
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Products</div>
              <div style={{ 
                fontSize: '3.5rem', 
                fontWeight: '800',
                textShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}>
                {animatedCount.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>Average Price</div>
              <div style={{ 
                fontSize: '3.5rem', 
                fontWeight: '800',
                textShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}>
                ${animatedPrice.toFixed(0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="metrics-grid" style={{ marginBottom: '2rem' }}>
        <div className="metric-card" style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        }}>
          <div className="metric-icon">
            <Award size={40} />
          </div>
          <div className="metric-info">
            <h3>Total Brands</h3>
            <div className="metric-value">{stats.top_brands.length}</div>
          </div>
        </div>

        <div className="metric-card" style={{
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
        }}>
          <div className="metric-icon">
            <Grid3x3 size={40} />
          </div>
          <div className="metric-info">
            <h3>Categories</h3>
            <div className="metric-value">{stats.top_categories.length}</div>
          </div>
        </div>

        <div className="metric-card" style={{
          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
        }}>
          <div className="metric-icon">
            <TrendingUp size={40} />
          </div>
          <div className="metric-info">
            <h3>Avg per Brand</h3>
            <div className="metric-value">
              {stats.top_brands.length > 0 
                ? Math.round(totalBrandProducts / stats.top_brands.length)
                : 0}
            </div>
          </div>
        </div>

        <div className="metric-card" style={{
          background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
        }}>
          <div className="metric-icon">
            <Zap size={40} />
          </div>
          <div className="metric-info">
            <h3>Price Range</h3>
            <div className="metric-value" style={{ fontSize: '1.3rem' }}>
              {stats.price_distribution.length > 0 ? `${stats.price_distribution.length}` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Price Insights Section */}
      {stats.most_expensive && stats.least_expensive && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
            borderRadius: '1rem',
            padding: '1.5rem',
            color: '#2d3436',
            boxShadow: '0 8px 16px rgba(253, 203, 110, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Star size={24} />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Most Expensive</h3>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              {stats.most_expensive.price}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              {stats.most_expensive.title.substring(0, 60)}...
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)',
            borderRadius: '1rem',
            padding: '1.5rem',
            color: 'white',
            boxShadow: '0 8px 16px rgba(108, 92, 231, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <DollarSign size={24} />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Most Affordable</h3>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              {stats.least_expensive.price}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              {stats.least_expensive.title.substring(0, 60)}...
            </div>
          </div>
        </div>
      )}

      {/* Main Charts Grid */}
      <div className="charts-grid">
        {/* Brand Distribution Bar Chart */}
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <h2 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            <Award size={20} />
            Top Brands Performance
          </h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={stats.top_brands}>
              <defs>
                <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#667eea" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#764ba2" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                tick={{ fill: '#65676b', fontSize: 12 }}
              />
              <YAxis tick={{ fill: '#65676b', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Bar 
                dataKey="count" 
                fill="url(#brandGradient)" 
                radius={[8, 8, 0, 0]}
                animationDuration={1500}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution Pie Chart */}
        <div className="chart-card">
          <h2 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            <Grid3x3 size={20} />
            Category Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
                animationDuration={1500}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Price Distribution */}
        {stats.price_distribution && stats.price_distribution.length > 0 && (
          <div className="chart-card" style={{ gridColumn: 'span 2' }}>
            <h2 style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              <DollarSign size={20} />
              Price Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.price_distribution}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4facfe" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis dataKey="range" tick={{ fill: '#65676b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#65676b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#4facfe" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPrice)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category Metrics Radar */}
        {stats.category_metrics && stats.category_metrics.length > 0 && (
          <div className="chart-card">
            <h2 style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              <Activity size={20} />
              Category Metrics
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={stats.category_metrics}>
                <PolarGrid stroke="#e0e0e0" />
                <PolarAngleAxis dataKey="category" tick={{ fill: '#65676b', fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fill: '#65676b', fontSize: 10 }} />
                <Radar 
                  name="Products" 
                  dataKey="count" 
                  stroke="#43e97b" 
                  fill="#43e97b" 
                  fillOpacity={0.6}
                  animationDuration={1500}
                />
                <Tooltip 
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Brand Rankings */}
        <div className="chart-card">
          <h2 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            <Award size={20} />
            Brand Rankings
          </h2>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '0.5rem'
          }}>
            {brandsWithPercentage.slice(0, 8).map((brand, idx) => (
              <div key={idx} style={{
                background: 'linear-gradient(135deg, #f0f2f5 0%, #ffffff 100%)',
                padding: '1rem',
                borderRadius: '0.75rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: '0.5rem',
                  alignItems: 'center'
                }}>
                  <span style={{ 
                    fontWeight: '600', 
                    fontSize: '0.95rem',
                    color: 'var(--text-primary)'
                  }}>
                    #{idx + 1} {brand.name}
                  </span>
                  <span style={{ 
                    fontWeight: '700', 
                    fontSize: '1.1rem',
                    color: '#43e97b'
                  }}>
                    {brand.count}
                  </span>
                </div>
                <div style={{
                  height: '8px',
                  background: '#e9e9eb',
                  borderRadius: '99px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${COLORS[idx % COLORS.length]}, ${COLORS[(idx + 1) % COLORS.length]})`,
                    width: `${brand.percentage}%`,
                    borderRadius: '99px',
                    transition: 'width 1.5s ease',
                    boxShadow: `0 0 10px ${COLORS[idx % COLORS.length]}40`
                  }} />
                </div>
                <div style={{
                  marginTop: '0.25rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}>
                  {brand.percentage}% of catalog
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
        borderRadius: '1rem',
        textAlign: 'center'
      }}>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          margin: 0
        }}>
          Dashboard powered by AI-driven analytics • Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default AnalyticsPage;