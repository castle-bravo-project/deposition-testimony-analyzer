import React, { useEffect, useRef, useMemo } from 'react';

interface SourceViewerProps {
  fullText: string;
  highlightText: string | null;
  panelWidth: number;
}

const SourceViewer: React.FC<SourceViewerProps> = ({ fullText, highlightText, panelWidth }) => {
  const highlightRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightText]); // Rerun effect when highlight changes

  const getHighlightedContent = () => {
    if (!highlightText) {
      return fullText;
    }
    const index = fullText.indexOf(highlightText);
    if (index === -1) {
      // If the exact text isn't found, return the full text without highlighting.
      // This can happen if the AI summarizes or slightly alters the source text.
      return fullText;
    }

    const before = fullText.substring(0, index);
    const highlighted = fullText.substring(index, index + highlightText.length);
    const after = fullText.substring(index + highlightText.length);

    return (
      <>
        {before}
        <mark ref={highlightRef} className="bg-sky-200 dark:bg-sky-500/30 rounded px-1 py-0.5 transition-colors duration-300">
          {highlighted}
        </mark>
        {after}
      </>
    );
  };

  return (
    <div 
        style={{ width: `${panelWidth}px` }} 
        className="flex-shrink-0 overflow-y-auto bg-white dark:bg-slate-800/80 text-sm leading-relaxed border-r border-slate-200 dark:border-slate-700/50"
    >
      <div className="sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm z-10 px-4 sm:px-6 pt-4 pb-3">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 border-b border-slate-300 dark:border-slate-600 pb-2">
            Source Document
          </h3>
      </div>
      <p className="whitespace-pre-wrap p-4 sm:p-6 pt-2 text-slate-700 dark:text-slate-300">
          {getHighlightedContent()}
      </p>
    </div>
  );
};

export default SourceViewer;