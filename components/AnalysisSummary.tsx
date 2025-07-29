import React from 'react';
import type { AnalysisNode, AnalysisSummaryData } from '../types';
import { ClaimIcon } from './icons/ClaimIcon';
import { InconsistencyIcon } from './icons/InconsistencyIcon';
import { QuestionIcon } from './icons/QuestionIcon';
import { HashIcon } from './icons/HashIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { UserIcon } from './icons/UserIcon';
import { GavelIcon } from './icons/GavelIcon';
import { ScalesIcon } from './icons/ScalesIcon';
import { ShieldIcon } from './icons/ShieldIcon';

interface AnalysisSummaryProps {
  summary: AnalysisSummaryData | null;
  sourceFileHash: string | null;
}

const VERACITY_STYLES: Record<NonNullable<AnalysisNode['veracity']>, { dot: string, text: string }> = {
    VERIFIED:      { dot: 'bg-green-500', text: 'text-green-700 dark:text-green-300' },
    LIKELY_TRUE:   { dot: 'bg-green-500', text: 'text-green-700 dark:text-green-300' },
    UNCERTAIN:     { dot: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300' },
    UNSUPPORTED:   { dot: 'bg-red-500', text: 'text-red-700 dark:text-red-300' },
    CONTRADICTORY: { dot: 'bg-red-500', text: 'text-red-700 dark:text-red-300' },
};

const INDICATOR_STYLES: Record<string, { dot: string, text: string }> = {
    EXCULPATORY: { dot: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-300' },
    INCULPATORY: { dot: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-300' },
    HEARSAY:     { dot: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-300' },
};

const StatCard: React.FC<{ icon: React.ReactNode, value: number, label: string, color: string }> = ({ icon, value, label, color }) => (
    <div className="bg-white dark:bg-slate-900/50 p-4 rounded-lg flex items-center gap-4 border border-slate-200 dark:border-slate-700/50">
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        </div>
    </div>
);

const ProfileCard: React.FC<{icon: React.ReactNode, title: string, content: string}> = ({ icon, title, content }) => (
    <div className="bg-white dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50">
        <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            {icon} {title}
        </h3>
        <blockquote className="text-sm text-slate-600 dark:text-slate-300 italic">
            {content}
        </blockquote>
    </div>
);

const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({ summary, sourceFileHash }) => {
  if (!summary) return null;

  const sortedTones = Object.entries(summary.toneCounts).sort(([, a], [, b]) => b - a);
  const maxToneCount = Math.max(...Object.values(summary.toneCounts), 0);
  const sortedIndicators = Object.entries(summary.indicatorCounts).sort(([, a], [, b]) => b - a);


  return (
    <div className="p-4 sm:p-6 mb-8 bg-slate-100 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700/50 rounded-xl">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200 mb-2">Analysis Dashboard</h2>
        
        {sourceFileHash && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700/50">
                <HashIcon className="w-3 h-3 flex-shrink-0" />
                <span className="font-semibold">Source SHA-256:</span>
                <code className="truncate">{sourceFileHash}</code>
            </div>
        )}
        
        {/* Strategic Profiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <ProfileCard icon={<UserIcon className="w-5 h-5 text-sky-500"/>} title="Deponent Profile" content={summary.deponentProfile} />
            <ProfileCard icon={<ScalesIcon className="w-5 h-5 text-red-500"/>} title="Assumed Prosecution Profile" content={summary.prosecutionProfile} />
            <ProfileCard icon={<ShieldIcon className="w-5 h-5 text-blue-500"/>} title="Assumed Defense Profile" content={summary.defenseProfile} />
            <ProfileCard icon={<GavelIcon className="w-5 h-5 text-amber-500"/>} title="Court's Perspective" content={summary.courtProfile} />
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard icon={<ClaimIcon className="w-6 h-6"/>} value={summary.keyClaims} label="Key Claims" color="bg-sky-500/20 text-sky-600 dark:text-sky-300" />
            <StatCard icon={<InconsistencyIcon className="w-6 h-6"/>} value={summary.inconsistencies} label="Inconsistencies" color="bg-amber-500/20 text-amber-600 dark:text-amber-300" />
            <StatCard icon={<QuestionIcon className="w-6 h-6"/>} value={summary.questions} label="Questions" color="bg-purple-500/20 text-purple-600 dark:text-purple-300" />
        </div>

        {/* Breakdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
            {/* Veracity Breakdown */}
            <div>
                <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-3">Veracity Breakdown</h3>
                <div className="space-y-2 text-sm">
                    {Object.entries(summary.veracityCounts).map(([veracity, count]) => {
                        const styles = VERACITY_STYLES[veracity as NonNullable<AnalysisNode['veracity']>];
                        if (count === 0 || !styles) return null;
                        return (
                            <div key={veracity} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${styles.dot}`}></span>
                                    <span className={`capitalize ${styles.text}`}>
                                        {veracity.replace('_', ' ').toLowerCase()}
                                    </span>
                                </div>
                                <span className="font-mono text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700/50 px-2 py-0.5 rounded-md">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
             {/* Legal Indicators Breakdown */}
            <div>
                <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"><ShieldCheckIcon className="w-5 h-5"/> Legal Indicators</h3>
                {sortedIndicators.length > 0 ? (
                    <div className="space-y-2 text-sm">
                        {sortedIndicators.map(([indicator, count]) => {
                            const styles = INDICATOR_STYLES[indicator];
                            if (count === 0 || !styles) return null;
                            return (
                                <div key={indicator} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${styles.dot}`}></span>
                                        <span className={`capitalize ${styles.text}`}>
                                            {indicator.toLowerCase()}
                                        </span>
                                    </div>
                                    <span className="font-mono text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700/50 px-2 py-0.5 rounded-md">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No specific legal indicators were flagged.</p>
                )}
            </div>

            {/* Tone Analysis Chart */}
            <div className="lg:col-span-2">
                <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-3">Tone Analysis</h3>
                {sortedTones.length > 0 ? (
                    <div className="space-y-2 text-sm">
                       {sortedTones.map(([tone, count]) => (
                            <div key={tone} className="grid grid-cols-12 items-center gap-2">
                                <span className="capitalize truncate col-span-3 text-slate-600 dark:text-slate-300">{tone}</span>
                                <div className="col-span-9 flex items-center gap-2">
                                    <div className="w-full bg-slate-200 dark:bg-slate-700/80 rounded-full h-3.5">
                                        <div
                                            className="bg-sky-500 h-3.5 rounded-full"
                                            style={{ width: `${maxToneCount > 0 ? (count / maxToneCount) * 100 : 0}%` }}
                                            title={`${count} instances`}
                                        ></div>
                                    </div>
                                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 w-6 text-right">{count}</span>
                                </div>
                            </div>
                       ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No specific tones were detected.</p>
                )}
            </div>
        </div>
    </div>
  );
};

export default AnalysisSummary;