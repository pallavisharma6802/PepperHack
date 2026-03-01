import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  componentDidCatch(e, info) { console.error('💥 React crash:', e, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#F7F5F0', color: '#CF8008', padding: 24, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
          <h2>💥 App crashed</h2>
          <p>{String(this.state.error)}</p>
          <p>{this.state.error?.stack}</p>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
