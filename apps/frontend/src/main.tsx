import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Apply saved theme or default to 'light'
(function () {
  const saved = localStorage.getItem('theme');
  const resolved = saved === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', resolved);
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);