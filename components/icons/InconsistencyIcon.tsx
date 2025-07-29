import React from 'react';

export const InconsistencyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m3 21 7.07-7.07" />
    <path d="M11 7 8 4l-4 4" />
    <path d="m14 10 3 3 4-4" />
    <path d="M21 3l-7.07 7.07" />
  </svg>
);
