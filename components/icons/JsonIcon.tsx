import React from 'react';

export const JsonIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        {...props}
    >
        <path d="M14 10h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4v-4a2 2 0 0 1 2-2z" />
        <path d="M6 10H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v-4a2 2 0 0 0-2-2z" />
        <path d="M10 10v10" />
    </svg>
);
