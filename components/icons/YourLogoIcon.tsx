import React from 'react';

// Custom logo provided by user.
export const YourLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 400 100"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
        <linearGradient id="githubAtomicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444"/>
            <stop offset="50%" stopColor="#f97316"/>
            <stop offset="100%" stopColor="#eab308"/>
        </linearGradient>
    </defs>
    
    {/* Shield outline */}
    <path d="M50 15 L70 25 L70 55 L50 75 L30 55 L30 25 Z" 
          fill="none" stroke="url(#githubAtomicGrad)" strokeWidth="2"/>
    
    {/* Atomic symbol */}
    <circle cx="50" cy="45" r="3" fill="#f97316"/>
    
    {/* Electron orbits */}
    <ellipse cx="50" cy="45" rx="15" ry="6" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.7"/>
    <ellipse cx="50" cy="45" rx="15" ry="6" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.7" transform="rotate(60 50 45)"/>
    <ellipse cx="50" cy="45" rx="15" ry="6" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.7" transform="rotate(-60 50 45)"/>
    
    {/* Electrons - pulse class removed as <style> tag is not supported here */}
    <circle cx="65" cy="45" r="1.5" fill="#eab308"/>
    <circle cx="42" cy="38" r="1.5" fill="#eab308"/>
    <circle cx="58" cy="52" r="1.5" fill="#eab308"/>
    
    {/* Code elements */}
    <text x="35" y="22" fontFamily="monospace" fontSize="6" fill="#60a5fa" opacity="0.6">{"</>"}</text>
    <text x="58" y="22" fontFamily="monospace" fontSize="6" fill="#60a5fa" opacity="0.6">{"{}"}</text>
    
    {/* Text */}
    <text x="95" y="35" fontFamily="Arial, sans-serif" fontSize="20" fontWeight="bold" fill="#ef4444">Castle Bravo Project</text>
    <text x="95" y="55" fontFamily="Arial, sans-serif" fontSize="12" fill="#f97316">Open Code. Open Defense. Open Future.</text>
  </svg>
);