import React from 'react';
import { BranchIcon } from './icons/BranchIcon';
import { GeminiLogoIcon } from './icons/GeminiLogoIcon';
import ThemeToggle from './ThemeToggle';
import { YourLogoIcon } from './icons/YourLogoIcon';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, onToggle }) => {
  return (
    <header className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-700/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
            <BranchIcon className="w-10 h-10 text-sky-500 mt-1 flex-shrink-0" />
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
                    Deposition Analyzer
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">AI-Powered Testimony Assessment</p>
                <div className="flex items-center gap-2 mt-2.5 text-slate-500 dark:text-slate-400">
                    <GeminiLogoIcon className="w-5 h-5" />
                    <span className="text-xs font-medium">Powered by Google Gemini</span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <YourLogoIcon className="w-auto h-10 text-slate-800 dark:text-slate-200" />
          <ThemeToggle theme={theme} onToggle={onToggle} />
        </div>
      </div>
    </header>
  );
};

export default Header;