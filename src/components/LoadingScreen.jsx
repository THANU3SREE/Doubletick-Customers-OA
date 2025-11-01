// src/components/LoadingScreen.jsx

import React from 'react';
import '../styles/LoadingScreen.css';

/**
 * Loading screen component shown during initial data generation
 * Displays progress bar and current record count
 */
export default function LoadingScreen({ progress, total }) {
  const percentage = Math.round((progress / total) * 100);
  
  return (
    <div className="loading-screen">
      <div className="loading-content">
        {/* DoubleTick Logo */}
        <div className="logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path 
              d="M8 24L18 34L40 12" 
              stroke="#10B981" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M8 24L18 34L40 12" 
              stroke="#10B981" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              transform="translate(0, 8)"
            />
          </svg>
          <h1>DoubleTick</h1>
        </div>
        
        {/* Loading text */}
        <p className="loading-text">Initializing customer database...</p>
        
        {/* Progress bar */}
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>
        
        {/* Progress text */}
        <p className="progress-text">
          {progress.toLocaleString()} / {total.toLocaleString()} records ({percentage}%)
        </p>
      </div>
    </div>
  );
}