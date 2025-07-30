import React from 'react';
import Header from './Header';
import FileUpload from './FileUpload';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { JsonIcon } from './icons/JsonIcon';
import { HtmlIcon } from './icons/HtmlIcon';
import { ImportIcon } from './icons/ImportIcon';
import { ResetIcon } from './icons/ResetIcon';
import ApiKeyManager from './ApiKeyManager';
import type { AnalysisNode, AnalysisSummaryData } from '../types';
import { DocumentIcon } from './icons/DocumentIcon';

interface SidebarProps {
  documentFile: File | null;
  sourceFileHash: string | null;
  onFileChange: (file: File) => void;
  onClearFile: () => void;
  isParsing: boolean;
  onAnalyze: () => void;
  isLoading: boolean;
  analysisExists: boolean;
  onStartNewSession: () => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: (selectAll: boolean) => void;
  onExportJson: () => void;
  onExportHtml: () => void;
  onImportJson: (event: React.ChangeEvent<HTMLInputElement>) => void;
  searchQuery: string;
  onSearchQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  veracityFilter: Set<AnalysisNode['veracity']>;
  onVeracityFilterChange: (veracity: AnalysisNode['veracity']) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  summaryData: AnalysisSummaryData | null;
  onGenerateMotion: (motionId: string, motionType: string, justification: string, sourceNodeId?: string) => void;
  motionGenerationStatus: Record<string, 'idle' | 'generating'>;
  indicatorFilter: Set<string>;
  onIndicatorFilterChange: (indicator: string) => void;
}

const VERACITY_TYPES: AnalysisNode['veracity'][] = ['VERIFIED', 'LIKELY_TRUE', 'UNCERTAIN', 'UNSUPPORTED', 'CONTRADICTORY'];
const VERACITY_COLORS: Record<string, string> = {
    VERIFIED: 'border-green-400 data-[active=true]:bg-green-100 dark:data-[active=true]:bg-green-500/20 data-[active=true]:text-green-700 dark:data-[active=true]:text-green-300',
    LIKELY_TRUE: 'border-green-400 data-[active=true]:bg-green-100 dark:data-[active=true]:bg-green-500/20 data-[active=true]:text-green-700 dark:data-[active=true]:text-green-300',
    UNCERTAIN: 'border-yellow-400 data-[active=true]:bg-yellow-100 dark:data-[active=true]:bg-yellow-500/20 data-[active=true]:text-yellow-700 dark:data-[active=true]:text-yellow-300',
    UNSUPPORTED: 'border-red-400 data-[active=true]:bg-red-100 dark:data-[active=true]:bg-red-500/20 data-[active=true]:text-red-700 dark:data-[active=true]:text-red-300',
    CONTRADICTORY: 'border-red-400 data-[active=true]:bg-red-100 dark:data-[active=true]:bg-red-500/20 data-[active=true]:text-red-700 dark:data-[active=true]:text-red-300',
};

const LEGAL_INDICATORS = ['EXCULPATORY', 'INCULPATORY', 'HEARSAY'] as const;
const INDICATOR_COLORS: Record<string, string> = {
    EXCULPATORY: 'border-violet-400 data-[active=true]:bg-violet-100 dark:data-[active=true]:bg-violet-500/20 data-[active=true]:text-violet-700 dark:data-[active=true]:text-violet-300',
    INCULPATORY: 'border-violet-400 data-[active=true]:bg-violet-100 dark:data-[active=true]:bg-violet-500/20 data-[active=true]:text-violet-700 dark:data-[active=true]:text-violet-300',
    HEARSAY: 'border-violet-400 data-[active=true]:bg-violet-100 dark:data-[active=true]:bg-violet-500/20 data-[active=true]:text-violet-700 dark:data-[active=true]:text-violet-300',
}


const Sidebar: React.FC<SidebarProps> = ({
  documentFile,
  sourceFileHash,
  onFileChange,
  onClearFile,
  isParsing,
  onAnalyze,
  isLoading,
  analysisExists,
  onStartNewSession,
  selectedCount,
  totalCount,
  onSelectAll,
  onExportJson,
  onExportHtml,
  onImportJson,
  searchQuery,
  onSearchQueryChange,
  veracityFilter,
  onVeracityFilterChange,
  theme,
  onThemeToggle,
  summaryData,
  onGenerateMotion,
  motionGenerationStatus,
  indicatorFilter,
  onIndicatorFilterChange
}) => {
  const isAllSelected = analysisExists && totalCount > 0 && selectedCount === totalCount;
  const isExportDisabled = selectedCount === 0;

  return (
    <aside className="w-[450px] flex-shrink-0 bg-slate-100 dark:bg-slate-800 h-full flex flex-col shadow-2xl z-10">
      <Header theme={theme} onToggle={onThemeToggle} />
      <div className="p-6 flex-grow overflow-y-auto space-y-6">
        
        <FileUpload 
            file={documentFile}
            onFileChange={onFileChange}
            onClear={onClearFile}
            isParsing={isParsing}
            isLoading={isLoading}
            sourceFileHash={sourceFileHash}
        />

        <button
          onClick={onAnalyze}
          disabled={isLoading || isParsing || !documentFile}
          className="w-full flex items-center justify-center gap-2 bg-sky-600 text-white font-bold py-3 px-4 rounded-md hover:bg-sky-500 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 focus:ring-sky-500"
        >
          {isLoading ? (<><SpinnerIcon className="w-5 h-5 animate-spin" /> Analyzing...</>) : "Analyze Document"}
        </button>

        {analysisExists && (
          <div className="border-t border-slate-300 dark:border-slate-700/60 pt-6 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">Search & Filter</h2>
              <input
                type="text"
                placeholder="Search analysis..."
                value={searchQuery}
                onChange={onSearchQueryChange}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
              />
              <div className="mt-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Filter by veracity:</p>
                <div className="flex flex-wrap gap-2">
                    {VERACITY_TYPES.map(v => v && (
                        <button key={v} onClick={() => onVeracityFilterChange(v)} data-active={veracityFilter.has(v)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border capitalize border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${VERACITY_COLORS[v]}`}>
                            {v.replace('_', ' ').toLowerCase()}
                        </button>
                    ))}
                </div>
              </div>
               <div className="mt-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Filter by legal indicator:</p>
                <div className="flex flex-wrap gap-2">
                    {LEGAL_INDICATORS.map(i => (
                        <button key={i} onClick={() => onIndicatorFilterChange(i)} data-active={indicatorFilter.has(i)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border capitalize border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${INDICATOR_COLORS[i]}`}>
                            {i.toLowerCase()}
                        </button>
                    ))}
                </div>
              </div>
            </div>

            {summaryData?.suggestedMotions && summaryData.suggestedMotions.length > 0 && (
                <div className="border-t border-slate-300 dark:border-slate-700/60 pt-6">
                    <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <DocumentIcon className="w-5 h-5"/> Suggested Motions
                    </h2>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 -mr-2">
                        {summaryData.suggestedMotions.map((motion) => {
          <ApiKeyManager />
                            const isGenerating = motionGenerationStatus[motion.id] === 'generating';
                            return (
                                <div key={motion.id} className="bg-white dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50">
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{motion.type}</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 mb-3">{motion.justification}</p>
                                    <button
                                        onClick={() => onGenerateMotion(motion.id, motion.type, motion.justification, motion.sourceNodeId)}
                                        disabled={isGenerating}
                                        className="w-full flex items-center justify-center gap-2 bg-slate-600 text-white font-bold py-1.5 px-3 rounded-md hover:bg-slate-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-slate-500 text-xs"
                                    >
                                        {isGenerating ? (
                                            <><SpinnerIcon className="w-4 h-4 animate-spin" /> Generating...</>
                                        ) : (
                                            <>Generate & Download</>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            <div className="border-t border-slate-300 dark:border-slate-700/60 pt-6 flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Session & Export</h2>
              <div className="flex items-center justify-between bg-slate-200/50 dark:bg-slate-900/50 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <input id="select-all" type="checkbox" className="h-4 w-4 rounded bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600 text-sky-600 dark:text-sky-500 focus:ring-sky-500 dark:focus:ring-sky-600 cursor-pointer"
                    checked={isAllSelected} onChange={(e) => onSelectAll(e.target.checked)} />
                  <label htmlFor="select-all" className="font-medium text-slate-700 dark:text-slate-300">Select / Deselect All</label>
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400 font-mono bg-slate-300 dark:bg-slate-700 px-2 py-0.5 rounded">{selectedCount} / {totalCount}</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                 <button onClick={onStartNewSession} className="flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-2.5 px-4 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 focus:ring-slate-500">
                    <ResetIcon className="w-5 h-5" /> New Session
                 </button>
                 <label htmlFor="import-json" className="cursor-pointer flex items-center justify-center gap-2 bg-slate-600 text-white font-bold py-2.5 px-4 rounded-md hover:bg-slate-500 transition-colors duration-300 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-800 focus-within:ring-slate-500">
                    <ImportIcon className="w-5 h-5" />
                    Import JSON
                 </label>
                 <input type="file" id="import-json" accept=".json" className="sr-only" onChange={onImportJson} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={onExportJson} disabled={isExportDisabled}
                  className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-md hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 focus:ring-indigo-500">
                  <JsonIcon className="w-5 h-5" /> Export JSON
                </button>
                <button onClick={onExportHtml} disabled={isExportDisabled}
                  className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-md hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 focus:ring-emerald-500">
                  <HtmlIcon className="w-5 h-5" /> Export HTML
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gemini API Key Manager always visible at the bottom */}
      <div className="p-4 border-t border-slate-300 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900">
        <ApiKeyManager />
      </div>
    </aside>
  );
};

export default Sidebar;