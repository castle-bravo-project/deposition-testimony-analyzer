import React from 'react';
import { AnalysisNode } from '../types';
import { RethinkIcon } from './icons/RethinkIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { FactCheckIcon } from './icons/FactCheckIcon';
import { PlusSquareIcon } from './icons/PlusSquareIcon';
import { MinusSquareIcon } from './icons/MinusSquareIcon';

interface MindMapNodeProps {
  node: AnalysisNode;
  level: number;
  isLastChild: boolean;
  onExplore: (nodeId: string) => void;
  onFactCheck: (nodeId: string) => void;
  onUpdateNote: (nodeId: string, note: string) => void;
  selectedIds: Set<string>;
  onNodeSelect: (nodeId: string, isSelected: boolean) => void;
  collapsedIds: Set<string>;
  onNodeCollapseToggle: (nodeId: string) => void;
  activeNodeId: string | null;
  onNodeActivate: (nodeId: string) => void;
}

const getVeracityPillClasses = (veracity: AnalysisNode['veracity']) => {
    switch (veracity) {
        case 'VERIFIED':
        case 'LIKELY_TRUE':
            return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20';
        case 'UNCERTAIN':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/20';
        case 'CONTRADICTORY':
        case 'UNSUPPORTED':
            return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20';
        default:
            return 'hidden';
    }
};

const getIndicatorPillClasses = (indicator: AnalysisNode['indicators'] extends (infer U)[] ? U : never) => {
    // Using one color for all legal indicators for now, but can be expanded.
    return 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20';
};

const MindMapNode: React.FC<MindMapNodeProps> = ({ 
    node, 
    level, 
    isLastChild, 
    onExplore, 
    onFactCheck, 
    onUpdateNote, 
    selectedIds, 
    onNodeSelect, 
    collapsedIds, 
    onNodeCollapseToggle,
    activeNodeId,
    onNodeActivate
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isCollapsed = collapsedIds.has(node.id);
  const isActive = activeNodeId === node.id;

  const titleColor =
    level === 0 ? "text-sky-600 dark:text-sky-300" :
    level === 1 ? "text-teal-600 dark:text-teal-300" :
    level === 2 ? "text-indigo-600 dark:text-indigo-300" :
    "text-purple-600 dark:text-purple-300";
    
  const isSelected = selectedIds.has(node.id);

  const handleNodeBodyClick = () => {
    // Only activate nodes that have source text to highlight
    if (node.sourceText) {
        onNodeActivate(node.id);
    }
  };

  return (
    <div className="relative pl-8">
      {/* Vertical connector line from parent to this node */}
      <div className="absolute top-0 left-[1px] w-px h-full bg-slate-300 dark:bg-slate-600"></div>
      
      {/* Horizontal connector line */}
      <div className="absolute top-[22px] -left-px w-8 h-px bg-slate-300 dark:bg-slate-600"></div>

      {/* Circle for the node connection */}
      <div className="absolute top-[18px] -left-[4.5px] w-2.5 h-2.5 rounded-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-400 dark:border-slate-500"></div>
      
      {/* Hide bottom part of vertical line if it's the last child */}
      {isLastChild && <div className="absolute top-[22px] left-[1px] w-px h-full bg-slate-50 dark:bg-slate-800/50"></div>}

      <div className={`pt-3 pb-4 rounded-lg -ml-4 pl-4 transition-colors duration-200 ${isActive ? 'bg-sky-50 dark:bg-sky-500/10' : 'bg-transparent'}`}>
        <div className="flex items-start gap-3">
          <div className="flex items-start gap-2 flex-shrink-0">
            <div className="w-5 flex-shrink-0 flex items-center justify-center pt-1.5">
                {hasChildren && (
                    <button
                        onClick={() => onNodeCollapseToggle(node.id)}
                        className="text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                        aria-expanded={!isCollapsed}
                        aria-controls={`children-${node.id}`}
                        aria-label={isCollapsed ? `Expand ${node.title}` : `Collapse ${node.title}`}
                    >
                        {isCollapsed ? <PlusSquareIcon className="w-4 h-4" /> : <MinusSquareIcon className="w-4 h-4" />}
                    </button>
                )}
            </div>
            <input 
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onNodeSelect(node.id, e.target.checked)}
              className="mt-1.5 h-4 w-4 rounded bg-slate-200 dark:bg-slate-700 border-slate-400 dark:border-slate-600 text-sky-600 dark:text-sky-500 focus:ring-sky-500 dark:focus:ring-sky-600 cursor-pointer flex-shrink-0"
              aria-labelledby={`node-title-${node.id}`}
            />
          </div>
          <div className="flex-1 cursor-pointer" onClick={handleNodeBodyClick}>
              <h3 id={`node-title-${node.id}`} className={`font-bold ${titleColor} text-base md:text-lg`}>{node.title}</h3>
              
              {(node.veracity || (node.tone && node.tone.length > 0) || (node.indicators && node.indicators.length > 0)) && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {node.veracity && (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getVeracityPillClasses(node.veracity)}`}>
                            {node.veracity.replace('_', ' ').toLowerCase()}
                        </span>
                    )}
                    {node.indicators?.map((indicator, i) => (
                        <span key={i} className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getIndicatorPillClasses(indicator)}`}>
                            {indicator.toLowerCase()}
                        </span>
                    ))}
                    {node.tone?.map((t, i) => (
                        <span key={i} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">
                            {t}
                        </span>
                    ))}
                </div>
              )}

              <p className="text-slate-700 dark:text-slate-300 text-sm md:text-base mt-2">{node.content}</p>
          </div>
        </div>

        <div className="ml-7 mt-4 space-y-4">
            {/* Interaction Buttons */}
            <div className="flex items-center gap-4">
                {!node.alternative && (
                    <div>
                        {node.isExploring ? (
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                                <SpinnerIcon className="w-4 h-4 animate-spin" />
                                <span>Generating counter...</span>
                            </div>
                        ) : (
                            <button onClick={() => onExplore(node.id)}
                                className="flex items-center gap-2 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 text-sm font-semibold transition-colors duration-200">
                                <RethinkIcon className="w-4 h-4" />
                                <span>Challenge Point</span>
                            </button>
                        )}
                    </div>
                )}
                 <div>
                    {node.isFactChecking ? (
                         <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                            <SpinnerIcon className="w-4 h-4 animate-spin" />
                            <span>Fact-checking...</span>
                        </div>
                    ) : (
                         <button onClick={() => onFactCheck(node.id)}
                            className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 text-sm font-semibold transition-colors duration-200">
                            <FactCheckIcon className="w-4 h-4" />
                            <span>Fact Check</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Alternative Perspective Section */}
            {node.alternative && (
                <blockquote className="pl-4 border-l-4 border-amber-400 bg-amber-50 dark:border-amber-500/60 dark:bg-amber-900/20 p-3 rounded-r-lg">
                    <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Counter-Argument:</p>
                    <p className="text-amber-700 dark:text-amber-200 text-sm mt-1 whitespace-pre-wrap">{node.alternative}</p>
                </blockquote>
            )}
            
            {/* Grounding/Fact-Check Section */}
            {node.grounding && (
                <div className="pl-4 border-l-4 border-cyan-400 bg-cyan-50 dark:border-cyan-500/60 dark:bg-cyan-900/20 p-3 rounded-r-lg">
                    <p className="font-semibold text-cyan-800 dark:text-cyan-300 text-sm">Fact Check Summary:</p>
                    <p className="text-cyan-700 dark:text-cyan-200 text-sm mt-1 whitespace-pre-wrap">{node.grounding.summary}</p>
                    {node.grounding.sources && node.grounding.sources.length > 0 && (
                        <div className="mt-3">
                            <p className="font-semibold text-cyan-800 dark:text-cyan-300 text-xs">Sources:</p>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                                {node.grounding.sources.map((source, i) => (
                                    <li key={i} className="text-xs">
                                        <a href={source.uri} target="_blank" rel="noopener noreferrer"
                                           className="text-cyan-600 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-200 hover:underline truncate">
                                            {source.title || source.uri}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Private Notes Section */}
            <div>
                <label htmlFor={`notes-${node.id}`} className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Private Notes</label>
                <textarea 
                    id={`notes-${node.id}`}
                    value={node.notes || ''}
                    onChange={(e) => onUpdateNote(node.id, e.target.value)}
                    placeholder="Add your strategy, questions, or confidential notes here..."
                    className="w-full p-2 bg-slate-100 dark:bg-slate-900/70 border border-slate-300 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-300 placeholder-slate-500 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none transition duration-200 resize-y min-h-[60px]"
                />
            </div>
        </div>
        
        <div id={`children-${node.id}`}>
          {!isCollapsed && hasChildren && (
            <div className="mt-4">
              {node.children?.map((child, index) => (
                <MindMapNode
                  key={child.id}
                  node={child}
                  level={level + 1}
                  isLastChild={index === (node.children?.length ?? 0) - 1}
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MindMapNode;