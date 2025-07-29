export interface GroundingSource {
  uri: string;
  title: string;
}

export interface GroundingData {
  summary: string;
  sources: GroundingSource[];
}

export interface AnalysisNode {
  id: string;
  title:string;
  content: string;
  veracity?: 'VERIFIED' | 'LIKELY_TRUE' | 'UNCERTAIN' | 'CONTRADICTORY' | 'UNSUPPORTED';
  tone?: string[];
  indicators?: ('EXCULPATORY' | 'INCULPATORY' | 'HEARSAY')[];
  children?: AnalysisNode[];
  alternative?: string;
  isExploring?: boolean;
  isSelected?: boolean;
  notes?: string;
  grounding?: GroundingData;
  isFactChecking?: boolean;
  sourceFileHash?: string; // Added to store the hash of the source document on the root node
  sourceText?: string; // The exact text from the source document this node refers to.
  sourceNodeId?: string; // ID of the node this node is about (e.g. for a motion)
}

// Type for the flat nodes received from the streaming API
export interface FlatAnalysisNode {
  id: string;
  parentId: string | null;
  title: string;
  content: string;
  sourceText?: string;
  veracity?: 'VERIFIED' | 'LIKELY_TRUE' | 'UNCERTAIN' | 'CONTRADICTORY' | 'UNSUPPORTED';
  tone?: string[];
  indicators?: ('EXCULPATORY' | 'INCULPATORY' | 'HEARSAY')[];
  sourceNodeId?: string;
}


export interface AnalysisSummaryData {
  keyClaims: number;
  inconsistencies: number;
  questions: number;
  veracityCounts: Record<NonNullable<AnalysisNode['veracity']>, number>;
  toneCounts: Record<string, number>;
  indicatorCounts: Record<string, number>;
  deponentProfile: string;
  prosecutionProfile: string;
  defenseProfile: string;
  courtProfile: string;
  keyIndividuals: { name: string; role: string }[];
  suggestedMotions: { id: string; type: string; justification: string; sourceNodeId?: string; }[];
}