import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#070B14', color: '#F8FAFC', fontFamily: 'Outfit, sans-serif',
          padding: '24px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💧</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#00E5FF', marginBottom: '8px' }}>
            AquaSentry
          </h1>
          <p style={{ color: '#94A3B8', marginBottom: '24px' }}>
            Loading error — refreshing automatically...
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(135deg, #00E5FF, #10B981)',
              border: 'none', borderRadius: '12px', padding: '12px 28px',
              color: '#070B14', fontWeight: 700, fontSize: '15px', cursor: 'pointer'
            }}
          >
            Reload Now
          </button>
          <details style={{ marginTop: '24px', color: '#64748B', fontSize: '11px', maxWidth: '500px' }}>
            <summary>Error details</summary>
            <pre style={{ textAlign: 'left', marginTop: '8px', wordBreak: 'break-all' }}>
              {this.state.error?.toString()}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
