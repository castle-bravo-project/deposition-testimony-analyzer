
import React from 'react';

export const BranchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
        <path d="M6 3v12" />
        <path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path d="M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path d="M15 6a9 9 0 0 0-9 9" />
    </svg>
);
