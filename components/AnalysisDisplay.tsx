
import React from 'react';
import { AnalysisNode, AnalysisSummaryData } from '../types';
import MindMapNode from './MindMapNode';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import AnalysisSummary from './AnalysisSummary';
import { UploadIcon } from './icons/UploadIcon';
import { DashboardIcon } from './icons/DashboardIcon';
import { NetworkIcon } from './icons/NetworkIcon';

type AnalysisView = 'dashboard' | 'mindmap';

interface AnalysisDisplayProps {
  analysis: AnalysisNode | null;
  summaryData: AnalysisSummaryData | null;
  isLoading: boolean;
  isParsing: boolean;
  isRestoring: boolean;
  error: string | null;
  onExplore: (nodeId: string) => void;
  onFactCheck: (nodeId: string) => void;
  onUpdateNote: (nodeId: string, note: string) => void;
  selectedIds: Set<string>;
  onNodeSelect: (nodeId: string, isSelected: boolean) => void;
  hasFile: boolean;
  sourceFileHash: string | null;
  collapsedIds: Set<string>;
  onNodeCollapseToggle: (nodeId: string) => void;
  activeNodeId: string | null;
  onNodeActivate: (nodeId: string) => void;
  activeView: AnalysisView;
  onActiveViewChange: (view: AnalysisView) => void;
}

const TabButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={isActive}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-slate-800/50
        ${
          isActive
            ? 'bg-sky-500 text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
    >
      {icon}
      {label}
    </button>
  );
};


const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ 
    analysis, 
    summaryData,
    isLoading,
    isParsing,
    isRestoring,
    error, 
    onExplore, 
    onFactCheck, 
    onUpdateNote, 
    selectedIds, 
    onNodeSelect,
    hasFile,
    sourceFileHash,
    collapsedIds,
    onNodeCollapseToggle,
    activeNodeId,
    onNodeActivate,
    activeView,
    onActiveViewChange,
}) => {

  const renderContent = () => {
    if (isRestoring) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 p-6">
          <SpinnerIcon className="w-12 h-12 animate-spin text-sky-500" />
          <p className="mt-4 text-lg">Restoring session...</p>
        </div>
      );
    }
    
    if (isLoading || isParsing) {
      const showProgress = isLoading && analysis;
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 p-6">
          <SpinnerIcon className="w-12 h-12 animate-spin text-sky-500" />
          <p className="mt-4 text-lg">
            {isParsing ? 'Parsing PDF...' : 'Analyzing document...'}
          </p>
          {showProgress && <p className="mt-2 text-sm">Mind map will appear here as it's generated.</p>}
          {isLoading && !analysis && <div className="p-4 sm:p-8 w-full"><div className="w-full h-[600px] bg-slate-200/50 dark:bg-slate-800/50 rounded-lg animate-pulse"></div></div>}
        </div>
      );
    }

    if (error) {
      return (
        <div className="m-4 sm:m-8 flex flex-col items-center justify-center h-full text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/50 rounded-lg p-6">
          <p className="text-lg font-semibold">An Error Occurred</p>
          <p className="mt-2 text-center text-red-600 dark:text-red-300">{error}</p>
        </div>
      );
    }

    if (analysis) {
      return (
        <div>
          <div className="sticky top-0 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-sm z-10 border-b border-slate-200 dark:border-slate-700 p-4">
             <div role="tablist" aria-label="Analysis Views" className="flex items-center gap-2">
                <TabButton
                    icon={<DashboardIcon className="w-5 h-5"/>}
                    label="Dashboard"
                    isActive={activeView === 'dashboard'}
                    onClick={() => onActiveViewChange('dashboard')}
                />
                <TabButton
                    icon={<NetworkIcon className="w-5 h-5"/>}
                    label="Mind Map"
                    isActive={activeView === 'mindmap'}
                    onClick={() => onActiveViewChange('mindmap')}
                />
             </div>
          </div>
          <div className="p-4 sm:p-6 lg:p-8">
            {activeView === 'dashboard' && (
              <AnalysisSummary 
                summary={summaryData} 
                sourceFileHash={sourceFileHash}
              />
            )}
            {activeView === 'mindmap' && (
              <MindMapNode 
                  node={analysis} 
                  level={0} 
                  isLastChild={true} 
                  onExplore={onExplore}
                  onFactCheck={onFactCheck}
                  onUpdateNote={onUpdateNote}
                  selectedIds={selectedIds}
                  onNodeSelect={onNodeSelect}
                  collapsedIds={collapsedIds}
                  onNodeCollapseToggle={onNodeCollapseToggle}
                  activeNodeId={activeNodeId}
                  onNodeActivate={onNodeActivate}
              />
            )}
          </div>
        </div>
      );
    }
    
    if (hasFile) {
        return (
             <div className="flex flex-col items-center justify-center h-full text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg m-4 sm:m-8 p-6">
                <LightbulbIcon className="w-16 h-16 text-slate-400 dark:text-slate-600" />
                <h3 className="mt-4 text-xl font-semibold text-slate-600 dark:text-slate-400">Ready to Analyze</h3>
                <p className="mt-2 text-center max-w-sm">
                  Click the "Analyze Document" button in the sidebar to generate a mind map of key points, inconsistencies, and potential questions.
                </p>
            </div>
        );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg m-4 sm:m-8 p-6">
        <UploadIcon className="w-16 h-16 text-slate-400 dark:text-slate-600" />
        <h3 className="mt-4 text-xl font-semibold text-slate-600 dark:text-slate-400">Analysis Appears Here</h3>
        <p className="mt-2 text-center max-w-sm">
          Upload a deposition PDF in the sidebar to begin. The AI will generate a mind map of key points, inconsistencies, and potential questions.
        </p>
      </div>
    );
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 h-full">
      {renderContent()}
    </div>
  );
};

export default AnalysisDisplay;
