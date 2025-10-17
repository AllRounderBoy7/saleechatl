import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Optional: Agar aapne koi global CSS file banayi ho
import App from './App'; // Yeh App.jsx ko import karta hai

// DOM element jahan React app load hoga (#root in public/index.html)
const root = ReactDOM.createRoot(document.getElementById('root'));

// App component ko load karna
root.render(
  <React.StrictMode>
    <App /> 
  </React.StrictMode>
);
