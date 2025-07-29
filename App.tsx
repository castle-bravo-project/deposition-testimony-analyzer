
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AnalysisNode, FlatAnalysisNode, AnalysisSummaryData } from './types';
import { analyzeTestimonyStream, getAlternativePerspective, factCheckClaim, generateMotionDocument } from './services/geminiService';
import Sidebar from './components/Sidebar';
import AnalysisDisplay from './components/AnalysisDisplay';
import SourceViewer from './components/SourceViewer';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { PDFDocumentProxy } from 'pdfjs-dist/build/pdf.mjs';
import { get, set, clear } from 'idb-keyval';
import { Document, Packer, Paragraph, TextRun } from 'docx';

// Setup pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.mjs`;

// --- Hashing Utilities ---
// Helper to calculate SHA-256 hash of an ArrayBuffer (for files)
async function calculateArrayBufferSHA256(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to calculate SHA-256 hash of a string (for reports)
async function calculateStringSHA256(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to recursively add a new node to the tree immutably
const addNodeToTree = (root: AnalysisNode, parentId: string, newNode: AnalysisNode): AnalysisNode => {
    if (root.id === parentId) {
        return { ...root, children: [...(root.children || []), newNode] };
    }
    if (root.children) {
        let childWasUpdated = false;
        const newChildren = root.children.map(child => {
            const updatedChild = addNodeToTree(child, parentId, newNode);
            if (updatedChild !== child) {
                childWasUpdated = true;
            }
            return updatedChild;
        });

        if (childWasUpdated) {
            return { ...root, children: newChildren };
        }
    }
    return root;
};

const summarizeAnalysisTree = (rootNode: AnalysisNode | null): AnalysisSummaryData | null => {
    if (!rootNode) return null;

    const summary: AnalysisSummaryData = {
        keyClaims: 0,
        inconsistencies: 0,
        questions: 0,
        veracityCounts: {
            VERIFIED: 0,
            LIKELY_TRUE: 0,
            UNCERTAIN: 0,
            CONTRADICTORY: 0,
            UNSUPPORTED: 0,
        },
        toneCounts: {},
        indicatorCounts: {},
        deponentProfile: 'No profile generated.',
        prosecutionProfile: 'Not generated.',
        defenseProfile: 'Not generated.',
        courtProfile: 'Not generated.',
        keyIndividuals: [],
        suggestedMotions: [],
    };

    const findNodeByTitle = (node: AnalysisNode, titlePart: string): AnalysisNode | null => {
        return node.children?.find(c => c.title.toLowerCase().includes(titlePart.toLowerCase())) || null;
    }

    const keyClaimsNode = findNodeByTitle(rootNode, 'key claims');
    if (keyClaimsNode?.children) summary.keyClaims = keyClaimsNode.children.length;

    const inconsistenciesNode = findNodeByTitle(rootNode, 'inconsistencies');
    if (inconsistenciesNode?.children) summary.inconsistencies = inconsistenciesNode.children.length;

    const questionsNode = findNodeByTitle(rootNode, 'questions for cross-examination');
    if (questionsNode?.children) summary.questions = questionsNode.children.length;
    
    const profileNode = findNodeByTitle(rootNode, 'deponent profile');
    if (profileNode?.content) summary.deponentProfile = profileNode.content;

    const prosecutionNode = findNodeByTitle(rootNode, 'assumed prosecution profile');
    if (prosecutionNode?.content) summary.prosecutionProfile = prosecutionNode.content;

    const defenseNode = findNodeByTitle(rootNode, 'assumed defense profile');
    if (defenseNode?.content) summary.defenseProfile = defenseNode.content;

    const courtNode = findNodeByTitle(rootNode, "court's perspective");
    if (courtNode?.content) summary.courtProfile = courtNode.content;
    
    const individualsNode = findNodeByTitle(rootNode, 'key individuals');
    if(individualsNode?.children) {
        summary.keyIndividuals = individualsNode.children.map(child => ({
            name: child.title,
            role: child.content,
        }));
    }

    const motionsNode = findNodeByTitle(rootNode, 'suggested motions');
    if (motionsNode?.children) {
        summary.suggestedMotions = motionsNode.children.map((child, index) => ({
            id: `motion-${index}`,
            type: child.title,
            justification: child.content,
            sourceNodeId: child.sourceNodeId,
        }));
    }


    function collectStats(node: AnalysisNode) {
        if (node.veracity) {
            summary.veracityCounts[node.veracity]++;
        }
        if (node.tone) {
            node.tone.forEach(t => {
                summary.toneCounts[t] = (summary.toneCounts[t] || 0) + 1;
            });
        }
        if (node.indicators) {
            node.indicators.forEach(i => {
                summary.indicatorCounts[i] = (summary.indicatorCounts[i] || 0) + 1;
            });
        }
        if (node.children) {
            node.children.forEach(collectStats);
        }
    }
    collectStats(rootNode);

    return summary;
};


// Helper to recursively update a node in the tree
const updateNodeInTree = (nodes: AnalysisNode[], nodeId: string, updates: Partial<AnalysisNode>): AnalysisNode[] => {
  return nodes.map(node => {
    if (node.id === nodeId) {
      return { ...node, ...updates };
    }
    if (node.children) {
      return { ...node, children: updateNodeInTree(node.children, nodeId, updates) };
    }
    return node;
  });
};

// Helper to recursively get all node IDs
const getAllNodeIds = (node: AnalysisNode): string[] => {
  let ids = [node.id];
  if (node.children) {
    ids = ids.concat(node.children.flatMap(getAllNodeIds));
  }
  return ids;
};

// Helper to find a node by its ID
const findNodeById = (node: AnalysisNode, id: string): AnalysisNode | null => {
    if (node.id === id) return node;
    if (node.children) {
        for (const child of node.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
    }
    return null;
};

// Helper to generate a downloadable file
const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const SIDEBAR_WIDTH = 450; // Constant for sidebar width

type AnalysisView = 'dashboard' | 'mindmap';

function App(): React.ReactNode {
  const [document, setDocument] = useState<{ file: File | null; text: string }>({ file: null, text: '' });
  const [sourceFileHash, setSourceFileHash] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<AnalysisNode | null>(null);
  const [summaryData, setSummaryData] = useState<AnalysisSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [veracityFilter, setVeracityFilter] = useState<Set<AnalysisNode['veracity']>>(new Set());
  const [indicatorFilter, setIndicatorFilter] = useState<Set<string>>(new Set());
  const [isRestoring, setIsRestoring] = useState(true);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [sourcePanelWidth, setSourcePanelWidth] = useState(600);
  const [motionGenerationStatus, setMotionGenerationStatus] = useState<Record<string, 'idle' | 'generating'>>({});
  const [activeView, setActiveView] = useState<AnalysisView>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
        window.document.documentElement.classList.add('dark');
        localStorage.theme = 'dark';
    } else {
        window.document.documentElement.classList.remove('dark');
        localStorage.theme = 'light';
    }
  }, [theme]);
  
    // --- Session Management ---

  // Restore session on initial load
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [
          savedAnalysis, savedSelectedIds, savedCollapsedIds,
          savedHash, savedDocText, savedDocName, savedActiveNodeId,
          savedActiveView
        ] = await Promise.all([
          get<AnalysisNode | null>('analysis'),
          get<string[]>('selectedIds'),
          get<string[]>('collapsedIds'),
          get<string | null>('sourceFileHash'),
          get<string>('documentText'),
          get<string>('documentFileName'),
          get<string | null>('activeNodeId'),
          get<AnalysisView>('activeView'),
        ]);

        if (savedAnalysis) {
          setAnalysis(savedAnalysis);
          setSummaryData(summarizeAnalysisTree(savedAnalysis));
          setSelectedIds(new Set(savedSelectedIds || []));
          setCollapsedIds(new Set(savedCollapsedIds || []));
          setActiveNodeId(savedActiveNodeId || null);
          setSourceFileHash(savedHash || null);
          setActiveView(savedActiveView || 'dashboard');
          setDocument({
            text: savedDocText || '',
            file: savedDocName ? new File([], savedDocName, { type: 'application/pdf' }) : null,
          });
        }
      } catch (err) {
        console.error("Could not restore session:", err);
      } finally {
        setIsRestoring(false);
      }
    };
    restoreSession();
  }, []);

  // Save session on state change
  useEffect(() => {
    if (isRestoring) return;

    // If state is clear, remove from storage
    if (!analysis && !document.file) {
      clear().catch(err => console.error("Could not clear session storage:", err));
      return;
    }
    
    const tasks = [
      set('analysis', analysis),
      set('selectedIds', Array.from(selectedIds)),
      set('collapsedIds', Array.from(collapsedIds)),
      set('sourceFileHash', sourceFileHash),
      set('documentText', document.text),
      set('documentFileName', document.file?.name || null),
      set('activeNodeId', activeNodeId),
      set('activeView', activeView),
    ];

    Promise.all(tasks).catch(err => console.error("Could not save session:", err));

  }, [isRestoring, analysis, selectedIds, collapsedIds, sourceFileHash, document, activeNodeId, activeView]);
  
    // --- Resizing Logic ---
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
        if (!isResizing) return;
        // Adjust width, with constraints
        const newWidth = e.clientX - SIDEBAR_WIDTH;
        if (newWidth > 300 && newWidth < window.innerWidth - SIDEBAR_WIDTH - 400) { // Min/max width constraints
             setSourcePanelWidth(newWidth);
        }
    };

    const handleResizeEnd = () => {
        setIsResizing(false);
    };

    if (isResizing) {
        window.addEventListener('mousemove', handleResize);
        window.addEventListener('mouseup', handleResizeEnd);
    }

    return () => {
        window.removeEventListener('mousemove', handleResize);
        window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing]);

  const handleThemeToggle = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };
  
  const handleStartNewSession = useCallback(() => {
    // Clear in-memory state. The save effect will handle clearing storage.
    setDocument({ file: null, text: '' });
    setAnalysis(null);
    setSummaryData(null);
    setSelectedIds(new Set());
    setCollapsedIds(new Set());
    setError(null);
    setSourceFileHash(null);
    setSearchQuery('');
    setVeracityFilter(new Set());
    setIndicatorFilter(new Set());
    setActiveNodeId(null);
    setActiveView('dashboard');
  }, []);

  const handleFileChange = useCallback(async (file: File | null) => {
    if (!file) {
      handleStartNewSession();
      return;
    }
    
    if (file.type !== 'application/pdf') {
        setError("Invalid file type. Please upload a PDF.");
        setDocument({ file: null, text: ''});
        return;
    }

    setIsParsing(true);
    setError(null);
    try {
        const arrayBuffer = await file.arrayBuffer();
        
        const hashPromise = calculateArrayBufferSHA256(arrayBuffer);
        const pdfPromise: Promise<PDFDocumentProxy> = pdfjsLib.getDocument(arrayBuffer).promise;
        
        const [hash, pdf] = await Promise.all([hashPromise, pdfPromise]);

        setSourceFileHash(hash);

        const numPages = pdf.numPages;
        let fullText = '';
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n\n';
        }
        setDocument({ file, text: fullText });
        setAnalysis(null);
        setSummaryData(null);
        setSelectedIds(new Set());
        setCollapsedIds(new Set());
        setActiveNodeId(null);
        setError(null);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during PDF parsing.";
        setError(`Failed to parse PDF. ${errorMessage}`);
        setDocument({ file: null, text: '' });
        setSourceFileHash(null);
    } finally {
        setIsParsing(false);
    }
  }, [handleStartNewSession]);
  
  const handleClearFile = useCallback(() => {
    handleFileChange(null);
  }, [handleFileChange]);


  const handleAnalyzeClick = useCallback(async () => {
    if (!document.text.trim()) {
      setError("Please upload a PDF document to analyze.");
      return;
    }
    setIsLoading(true);
    setAnalysis(null);
    setSummaryData(null);
    setSelectedIds(new Set());
    setCollapsedIds(new Set());
    setActiveNodeId(null);
    setActiveView('dashboard');
    setError(null);
    
    try {
      const stream = analyzeTestimonyStream(document.text);
      let nodeBuffer: FlatAnalysisNode[] = [];
      const BATCH_SIZE = 5;

      const processBuffer = () => {
          if (nodeBuffer.length === 0) return;
          const nodesToProcess = [...nodeBuffer];
          nodeBuffer = [];

          setAnalysis(prevAnalysis => {
              let currentAnalysis = prevAnalysis;
              for (const flatNode of nodesToProcess) {
                  const newNode: AnalysisNode = {
                      ...flatNode,
                      children: [],
                      isExploring: false,
                      isFactChecking: false,
                      isSelected: false,
                      notes: '',
                  };

                  if (!currentAnalysis) { // This is the root node
                      newNode.sourceFileHash = sourceFileHash || undefined;
                      currentAnalysis = newNode;
                  } else if (flatNode.parentId) {
                      currentAnalysis = addNodeToTree(currentAnalysis, flatNode.parentId, newNode);
                  }
              }
              return currentAnalysis;
          });
      };

      for await (const flatNode of stream) {
          nodeBuffer.push(flatNode);
          if (nodeBuffer.length >= BATCH_SIZE) {
              processBuffer();
          }
      }
      processBuffer(); // Process any remaining nodes

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`Failed to get analysis. ${errorMessage}`);
      console.error(e);
    } finally {
      setIsLoading(false);
      // Recalculate summary once at the end
      setAnalysis(prev => {
          if (prev) {
              setSummaryData(summarizeAnalysisTree(prev));
          }
          return prev;
      });
    }
  }, [document.text, sourceFileHash]);

  const handleExploreAlternatives = useCallback(async (nodeId: string) => {
    if (!analysis || !document.text) return;
    let nodeToExplore: AnalysisNode | null = null;
    const findNode = (node: AnalysisNode) => {
      if (node.id === nodeId) { nodeToExplore = node; return; }
      if (node.children && !nodeToExplore) { node.children.forEach(findNode); }
    };
    findNode(analysis);
    if (!nodeToExplore) return;

    setAnalysis(prev => updateNodeInTree([prev!], nodeId, { isExploring: true })[0]);
    try {
      const alternativeText = await getAlternativePerspective(nodeToExplore.title, nodeToExplore.content, document.text);
      setAnalysis(prev => updateNodeInTree([prev!], nodeId, { alternative: alternativeText, isExploring: false })[0]);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      setAnalysis(prev => updateNodeInTree([prev!], nodeId, { alternative: `Error fetching counter-argument: ${errorMessage}`, isExploring: false })[0]);
    }
  }, [analysis, document.text]);

  const handleFactCheck = useCallback(async (nodeId: string) => {
    if (!analysis) return;
     let nodeToExplore: AnalysisNode | null = null;
    const findNode = (node: AnalysisNode) => {
      if (node.id === nodeId) { nodeToExplore = node; return; }
      if (node.children && !nodeToExplore) { node.children.forEach(findNode); }
    };
    findNode(analysis);
    if (!nodeToExplore) return;
    
    setAnalysis(prev => updateNodeInTree([prev!], nodeId, { isFactChecking: true })[0]);
    try {
        const groundingData = await factCheckClaim(nodeToExplore.title, nodeToExplore.content);
        setAnalysis(prev => updateNodeInTree([prev!], nodeId, { grounding: groundingData, isFactChecking: false })[0]);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error";
        const errorGrounding = { summary: `Fact check failed: ${errorMessage}`, sources: [] };
        setAnalysis(prev => updateNodeInTree([prev!], nodeId, { grounding: errorGrounding, isFactChecking: false })[0]);
    }
  }, [analysis]);

  const handleGenerateMotion = useCallback(async (motionId: string, motionType: string, justification: string, sourceNodeId?: string) => {
      setMotionGenerationStatus(prev => ({ ...prev, [motionId]: 'generating' }));
      try {
          const sourceNode = sourceNodeId && analysis ? findNodeById(analysis, sourceNodeId) : null;
          const counterArgument = sourceNode?.alternative;
          const factCheck = sourceNode?.grounding?.summary;

          const motionText = await generateMotionDocument(
            motionType, 
            justification,
            counterArgument,
            factCheck,
          );
          
          const doc = new Document({
              sections: [{
                  properties: {},
                  children: motionText.split('\n').map(line => 
                      new Paragraph({
                          children: [new TextRun(line)],
                          spacing: { after: 100 }
                      })
                  ),
              }],
          });

          const blob = await Packer.toBlob(doc);
          const url = URL.createObjectURL(blob);
          const a = window.document.createElement('a');
          a.href = url;
          a.download = `${motionType.replace(/[\s/]/g, '_')}.docx`;
          window.document.body.appendChild(a);
a.click();
          window.document.body.removeChild(a);
          URL.revokeObjectURL(url);

      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
          setError(`Failed to generate motion: ${errorMessage}`);
          console.error(err);
      } finally {
          setMotionGenerationStatus(prev => ({ ...prev, [motionId]: 'idle' }));
      }
  }, [analysis]);

  const handleUpdateNote = useCallback((nodeId: string, notes: string) => {
    if (!analysis) return;
    setAnalysis(prev => updateNodeInTree([prev!], nodeId, { notes })[0]);
  }, [analysis]);


  const handleNodeSelect = useCallback((nodeId: string, isSelected: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(nodeId);
      } else {
        newSet.delete(nodeId);
      }
      return newSet;
    });
  }, []);
  
  const handleNodeActivate = useCallback((nodeId: string) => {
      // If clicking the same node, deactivate it. Otherwise, activate the new one.
      setActiveNodeId(prev => (prev === nodeId ? null : nodeId));
  }, []);

  const handleNodeCollapseToggle = useCallback((nodeId: string) => {
    setCollapsedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(nodeId)) {
            newSet.delete(nodeId);
        } else {
            newSet.add(nodeId);
        }
        return newSet;
    });
  }, []);
  
  const handleSelectAll = useCallback((isAllSelected: boolean) => {
    if (isAllSelected && analysis) {
        const allIds = getAllNodeIds(analysis);
        setSelectedIds(new Set(allIds));
    } else {
        setSelectedIds(new Set());
    }
  }, [analysis]);

  const getSelectedTree = useCallback((rootNode: AnalysisNode | null) => {
    if (!rootNode) return null;

    const buildSelectedTree = (nodes: AnalysisNode[]): AnalysisNode[] => {
        return nodes
            .map((node): AnalysisNode | null => {
                const selectedChildren = node.children ? buildSelectedTree(node.children) : [];
                if (selectedIds.has(node.id) || selectedChildren.length > 0) {
                    // Create a clean node for export, removing internal state
                    const { isExploring, isFactChecking, isSelected: _, sourceFileHash: _sfh, ...rest } = node;
                    return { ...rest, isSelected: selectedIds.has(node.id), children: selectedChildren };
                }
                return null;
            })
            .filter((node): node is AnalysisNode => node !== null);
    };

    const [root] = buildSelectedTree([rootNode]);
    return root || null;
  }, [selectedIds]);

  const getVerificationInstructions = () => ({
      sourceDocument: "To verify the integrity of the source document, calculate its SHA-256 hash using a local tool and compare it to the 'sourceDocumentHash' value. On macOS/Linux, use 'shasum -a 256 /path/to/your/file.pdf'. On Windows, use 'CertUtil -hashfile /path/to/your/file.pdf SHA256'.",
      thisReport: "To verify the integrity of this report file, calculate its SHA-256 hash and compare it to the 'reportHash' value. The hash must be calculated on the file exactly as it was downloaded.",
  });
  
  const handleExportJson = useCallback(async (rootNode: AnalysisNode | null) => {
    const selectedTree = getSelectedTree(rootNode);
    if (!selectedTree) return;
    
    const verificationInstructions = getVerificationInstructions();
    const sourceHash = rootNode?.sourceFileHash || 'N/A';
    const reportHashPlaceholder = 'CALCULATING...';

    const exportObject: any = {
        metadata: {
            sourceDocumentHash: { algorithm: "SHA-256", value: sourceHash },
            reportHash: { algorithm: "SHA-256", value: reportHashPlaceholder },
            exportedAt: new Date().toISOString(),
            verificationInstructions
        },
        analysis: selectedTree,
    };
    
    const contentToHash = JSON.stringify(exportObject, null, 2).replace(reportHashPlaceholder, '');
    const reportHash = await calculateStringSHA256(contentToHash);
    
    exportObject.metadata.reportHash.value = reportHash;
    const finalJsonString = JSON.stringify(exportObject, null, 2);
    downloadFile(finalJsonString, 'analysis-export.json', 'application/json');

  }, [getSelectedTree]);

  const handleExportHtml = useCallback(async (rootNode: AnalysisNode | null) => {
    const selectedTree = getSelectedTree(rootNode);
    if (!selectedTree) return;

    const findNodeByTitle = (node: AnalysisNode, titlePart: string): AnalysisNode | null => {
        if (node.title.toLowerCase().includes(titlePart.toLowerCase())) return node;
        return node.children?.find(c => c.title.toLowerCase().includes(titlePart.toLowerCase())) || null;
    };
    
    const profileNode = findNodeByTitle(selectedTree, 'deponent profile');
    const individualsNode = findNodeByTitle(selectedTree, 'key individuals');
    const mainCategories = selectedTree.children?.filter(c => c.isSelected) || [];

    const createAnchor = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    let tocHtml = '';
    if (profileNode) tocHtml += `<li><a href="#${createAnchor(profileNode.title)}">${profileNode.title}</a></li>`;
    if (individualsNode) tocHtml += `<li><a href="#${createAnchor(individualsNode.title)}">${individualsNode.title}</a></li>`;
    mainCategories.forEach(cat => {
        tocHtml += `<li><a href="#${createAnchor(cat.title)}">${cat.title}</a></li>`;
    });

    let profileHtml = '';
    if (profileNode) {
        profileHtml = `<div id="${createAnchor(profileNode.title)}" class="report-section">
            <h2>${profileNode.title}</h2>
            <blockquote class="profile-quote">
                <p>${profileNode.content.replace(/\n/g, '<br>')}</p>
            </blockquote>
        </div>`;
    }

    let mermaidHtml = '';
    if (individualsNode?.children && individualsNode.children.length > 0) {
        const sanitize = (str: string) => str.replace(/"/g, '#quot;');
        let mermaidSyntax = 'mindmap\n  root((Deponent))\n';
        individualsNode.children.forEach((child) => {
            const sanitizedTitle = sanitize(child.title);
            const sanitizedRole = sanitize(child.content);
             mermaidSyntax += `    (<strong>${sanitizedTitle}</strong><br/><i style='font-size: smaller;'>${sanitizedRole}</i>)\n`;
        });

        mermaidHtml = `<div id="${createAnchor(individualsNode.title)}" class="report-section">
            <h2>${individualsNode.title}</h2>
            <div class="mermaid">${mermaidSyntax}</div>
        </div>`;
    }

    const generateNodeHtml = (node: AnalysisNode): string => {
        let listItems = '';
        if (node.isSelected) {
            let badgesHtml = '';
            if (node.veracity || (node.tone && node.tone.length > 0) || (node.indicators && node.indicators.length > 0)) {
                badgesHtml += `<div class="badges-container">`;
                if (node.veracity) {
                    let veracityClass = '';
                    switch (node.veracity) {
                        case 'VERIFIED': case 'LIKELY_TRUE': veracityClass = 'badge-green'; break;
                        case 'UNCERTAIN': veracityClass = 'badge-yellow'; break;
                        case 'CONTRADICTORY': case 'UNSUPPORTED': veracityClass = 'badge-red'; break;
                    }
                    badgesHtml += `<span class="badge ${veracityClass}">${node.veracity.replace('_', ' ').toLowerCase()}</span>`;
                }
                if (node.indicators) {
                    node.indicators.forEach(t => {
                        badgesHtml += `<span class="badge badge-violet">${t.toLowerCase()}</span>`;
                    });
                }
                if (node.tone) {
                    node.tone.forEach(t => {
                        badgesHtml += `<span class="badge badge-slate">${t}</span>`;
                    });
                }
                badgesHtml += `</div>`;
            }
            let notesHtml = node.notes ? `<div class="notes-box"><h4 class="notes-title">Private Notes</h4><p>${node.notes}</p></div>` : '';
            let counterHtml = node.alternative ? `<blockquote class="counter-quote"><strong>Counter-Argument:</strong> ${node.alternative.replace(/\n/g, '<br>')}</blockquote>` : '';
            let factCheckHtml = '';
            if (node.grounding) {
                factCheckHtml += `<div class="factcheck-box"><h4 class="factcheck-title">Fact Check Summary</h4><p>${node.grounding.summary}</p>`;
                if (node.grounding.sources.length > 0) {
                    factCheckHtml += `<h5 class="factcheck-sources-title">Sources:</h5><ul>`;
                    node.grounding.sources.forEach(s => factCheckHtml += `<li><a href="${s.uri}" target="_blank" rel="noopener noreferrer">${s.title}</a></li>`);
                    factCheckHtml += `</ul>`;
                }
                factCheckHtml += `</div>`;
            }

            listItems += `<li class="analysis-item">
                <h3>${node.title}</h3>
                ${badgesHtml}
                <p>${node.content}</p>
                ${counterHtml}${factCheckHtml}${notesHtml}
            </li>`;
        }
        if (node.children && node.children.length > 0) {
            const childrenHtml = node.children.map(generateNodeHtml).join('');
            if (childrenHtml) listItems += `<ul class="analysis-list">${childrenHtml}</ul>`;
        }
        return listItems;
    };
    
    let analysisContentHtml = '';
    mainCategories.forEach(cat => {
        analysisContentHtml += `<div id="${createAnchor(cat.title)}" class="report-section">
            <h2>${cat.title}</h2>
            <ul class="analysis-list root-list">${cat.children?.map(generateNodeHtml).join('') || ''}</ul>
        </div>`;
    });

    const sourceHash = rootNode?.sourceFileHash || 'N/A';
    const reportHashPlaceholder = '%%REPORT_HASH%%';
    const instructions = getVerificationInstructions();

    const metadataHtml = `<div class="metadata-box">
        <h2>Report Metadata</h2>
        <div class="metadata-hashes">
          <p><strong>Source Doc Hash (SHA-256):</strong> <span>${sourceHash}</span></p>
          <p><strong>This Report Hash (SHA-256):</strong> <span>${reportHashPlaceholder}</span></p>
        </div>
        <div class="metadata-instructions">
          <h3>Verification Instructions</h3>
          <p><strong>Source:</strong> ${instructions.sourceDocument}</p>
          <p><strong>Report:</strong> ${instructions.thisReport}</p>
        </div>
    </div>`;

    const preliminaryHtml = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Analysis Export</title>
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; background-color: #f9fafb; }
            .report-container { display: flex; }
            .report-sidebar { width: 280px; position: fixed; top: 0; left: 0; height: 100vh; background: #ffffff; padding: 1.5rem; overflow-y: auto; border-right: 1px solid #e5e7eb; box-shadow: 2px 0 10px rgba(0,0,0,0.05); }
            .report-sidebar h2 { font-size: 1.25rem; color: #111827; margin-top: 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.75rem; }
            .report-sidebar ul { list-style: none; padding: 0; margin-top: 1rem; }
            .report-sidebar li a { color: #4b5563; text-decoration: none; display: block; padding: 0.5rem 0.75rem; border-radius: 0.375rem; font-weight: 500; transition: all 0.2s ease; }
            .report-sidebar li a:hover { background-color: #f3f4f6; color: #1e40af; }
            .report-main { margin-left: 280px; padding: 2rem 3.5rem; width: calc(100% - 280px); }
            h1 { font-size: 2.25rem; color: #1e3a8a; margin-bottom: 1rem; }
            h2 { font-size: 1.75rem; color: #1e40af; border-bottom: 2px solid #dbeafe; padding-bottom: 0.5rem; margin-top: 2rem; margin-bottom: 1.5rem; }
            h3 { font-size: 1.25rem; color: #1e3a8a; margin-top: 0; }
            p { margin-top: 4px; } a { color: #0c4a6e; }
            .report-section { margin-bottom: 2rem; }
            .metadata-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 2rem; }
            .metadata-hashes { font-family: monospace; font-size: 0.875rem; color: #475569; word-break: break-all; margin-bottom: 1.5rem; }
            .metadata-hashes p { margin: 0.5rem 0; }
            .metadata-instructions h3 { font-size: 1rem; color: #334155; margin: 0 0 0.5rem 0; }
            .metadata-instructions p { font-size: 0.875rem; margin: 0.25rem 0; }
            .profile-quote { background-color: #f0f9ff; border-left: 4px solid #0ea5e9; margin: 1rem 0; padding: 0.5rem 1.5rem; font-style: italic; }
            .mermaid { background: #fdfdfd; padding: 1rem; border-radius: 0.5rem; text-align: center; border: 1px solid #e2e8f0; }
            .analysis-list { padding-left: 20px; list-style-type: none; border-left: 1px solid #e5e7eb; }
            .root-list { border-left: none; padding-left: 0; }
            .analysis-item { margin-bottom: 1.5rem; position: relative; padding-left: 1.5rem; }
            .analysis-item::before { content: ''; position: absolute; left: -20px; top: 8px; width: 12px; height: 12px; border: 2px solid #93c5fd; background: #fff; border-radius: 50%; }
            .analysis-item h3 { margin-bottom: 0.5rem; }
            .badges-container { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
            .badge { padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: capitalize; border: 1px solid transparent; }
            .badge-green { background-color: #dcfce7; color: #166534; border-color: #86efac; }
            .badge-yellow { background-color: #fef9c3; color: #854d0e; border-color: #fde047; }
            .badge-red { background-color: #fee2e2; color: #991b1b; border-color: #fca5a5; }
            .badge-violet { background-color: #ede9fe; color: #5b21b6; border-color: #c4b5fd; }
            .badge-slate { background-color: #e2e8f0; color: #334155; }
            .notes-box { margin-top: 12px; padding: 12px; background-color: #f3f4f6; border-radius: 4px; border: 1px solid #d1d5db; }
            .notes-box h4 { margin:0 0 8px 0; font-weight: bold; color: #4b5563; }
            .notes-box p { margin:0; white-space: pre-wrap; }
            .counter-quote { background-color: #fef9c3; border-left: 4px solid #f59e0b; margin: 1rem 0; padding: 0.5rem 1rem; }
            .factcheck-box { margin-top: 12px; padding: 12px; background-color: #e0f2fe; border-radius: 4px; border: 1px solid #7dd3fc; }
            .factcheck-box h4, .factcheck-box h5 { margin:0 0 8px 0; font-weight: bold; color: #075985; }
        </style>
    </head>
    <body>
        <div class="report-container">
            <aside class="report-sidebar">
                <h2>Table of Contents</h2>
                <ul>${tocHtml}</ul>
            </aside>
            <main class="report-main">
                <h1>Deposition Analysis Export</h1>
                ${metadataHtml}
                ${profileHtml}
                ${mermaidHtml}
                ${analysisContentHtml}
            </main>
        </div>
        <script>mermaid.initialize({ startOnLoad: true, theme: 'neutral' });</script>
    </body>
    </html>`;
    
    const reportHash = await calculateStringSHA256(preliminaryHtml.replace(reportHashPlaceholder, ''));
    const finalHtml = preliminaryHtml.replace(reportHashPlaceholder, reportHash);
    
    downloadFile(finalHtml, 'analysis-export.html', 'text/html');
  }, [getSelectedTree]);

  const handleImportJson = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error('File could not be read.');
            const importedData = JSON.parse(text);

            let analysisData = importedData.analysis;
            let fileHash: string | undefined;

            if (analysisData) { // New format with metadata
                fileHash = importedData.metadata?.sourceDocumentHash?.value;
            } else { // Old format (just the analysis tree)
                analysisData = importedData;
            }
             
            if (!analysisData || !analysisData.title || !analysisData.content) throw new Error('Invalid analysis file format.');
            
            // Re-add client-side metadata recursively
            let nodeIdCounter = 0;
            const addMetadata = (node: any): AnalysisNode => {
                 const newNode: AnalysisNode = {
                    title: node.title ?? 'Untitled',
                    content: node.content ?? '',
                    id: `node-${nodeIdCounter++}`,
                    isExploring: false, isSelected: false, isFactChecking: false,
                    notes: node.notes ?? '',
                    alternative: node.alternative,
                    veracity: node.veracity,
                    tone: node.tone,
                    indicators: node.indicators,
                    grounding: node.grounding,
                    sourceText: node.sourceText,
                    sourceNodeId: node.sourceNodeId,
                    children: node.children ? node.children.map(addMetadata) : []
                };
                return newNode;
            };

            const analysisWithMetadata = addMetadata(analysisData);
            if (fileHash) {
                analysisWithMetadata.sourceFileHash = fileHash;
                setSourceFileHash(fileHash);
            } else {
                setSourceFileHash(null);
            }
            
            setAnalysis(analysisWithMetadata);
            setSummaryData(summarizeAnalysisTree(analysisWithMetadata));
            setDocument({ file: null, text: ''});
            setError(null);
            setSelectedIds(new Set());
            setCollapsedIds(new Set());
            setActiveNodeId(null);
            setActiveView('dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse JSON file.');
            console.error(err);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, []);


  const handleVeracityFilterChange = useCallback((veracity: AnalysisNode['veracity']) => {
    if (!veracity) return;
    setVeracityFilter(prev => {
        const newSet = new Set(prev);
        if (newSet.has(veracity)) {
            newSet.delete(veracity);
        } else {
            newSet.add(veracity);
        }
        return newSet;
    });
  }, []);
  
  const handleIndicatorFilterChange = useCallback((indicator: string) => {
    setIndicatorFilter(prev => {
        const newSet = new Set(prev);
        if (newSet.has(indicator)) {
            newSet.delete(indicator);
        } else {
            newSet.add(indicator);
        }
        return newSet;
    });
  }, []);

  const filteredAnalysis = useMemo(() => {
    if (!analysis) return null;
    const lowerCaseQuery = searchQuery.toLowerCase();

    const filterTree = (node: AnalysisNode): AnalysisNode | null => {
        const children = (node.children ?? []).map(filterTree).filter((n): n is AnalysisNode => n !== null);

        const queryMatch = lowerCaseQuery === '' || node.title.toLowerCase().includes(lowerCaseQuery) || node.content.toLowerCase().includes(lowerCaseQuery) || (node.notes??'').toLowerCase().includes(lowerCaseQuery);
        const veracityMatch = veracityFilter.size === 0 || (node.veracity ? veracityFilter.has(node.veracity) : false);
        const indicatorMatch = indicatorFilter.size === 0 || (node.indicators ? node.indicators.some(i => indicatorFilter.has(i)) : false);

        if ((queryMatch && veracityMatch && indicatorMatch) || children.length > 0) {
            return { ...node, children };
        }
        return null;
    };
    return filterTree(analysis);
  }, [analysis, searchQuery, veracityFilter, indicatorFilter]);
  
  const activeNode = useMemo(() => {
    if (!activeNodeId || !analysis) return null;
    return findNodeById(analysis, activeNodeId);
  }, [activeNodeId, analysis]);

  return (
    <div className="flex h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
      <Sidebar
        documentFile={document.file}
        sourceFileHash={sourceFileHash}
        onFileChange={handleFileChange}
        onClearFile={handleClearFile}
        isParsing={isParsing}
        onAnalyze={handleAnalyzeClick}
        isLoading={isLoading}
        analysisExists={!!analysis}
        onStartNewSession={handleStartNewSession}
        selectedCount={selectedIds.size}
        totalCount={analysis ? getAllNodeIds(analysis).length : 0}
        onSelectAll={handleSelectAll}
        onExportJson={() => handleExportJson(analysis)}
        onExportHtml={() => handleExportHtml(analysis)}
        onImportJson={handleImportJson}
        searchQuery={searchQuery}
        onSearchQueryChange={(e) => setSearchQuery(e.target.value)}
        veracityFilter={veracityFilter}
        onVeracityFilterChange={handleVeracityFilterChange}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        summaryData={summaryData}
        onGenerateMotion={handleGenerateMotion}
        motionGenerationStatus={motionGenerationStatus}
        indicatorFilter={indicatorFilter}
        onIndicatorFilterChange={handleIndicatorFilterChange}
      />
      <main className="flex-1 flex overflow-hidden">
        {analysis && document.text && (
            <>
              <SourceViewer 
                fullText={document.text}
                highlightText={activeNode?.sourceText || null}
                panelWidth={sourcePanelWidth}
              />
              <div
                className="w-2.5 cursor-col-resize group flex items-center justify-center bg-slate-100 dark:bg-slate-800"
                onMouseDown={handleResizeStart}
              >
                  <div className="w-1 h-12 bg-slate-300 dark:bg-slate-600 rounded-full group-hover:bg-sky-500 transition-colors duration-200" />
              </div>
            </>
        )}
        <div className="flex-1 overflow-y-auto">
            <AnalysisDisplay
              analysis={filteredAnalysis}
              isRestoring={isRestoring}
              sourceFileHash={sourceFileHash}
              summaryData={summaryData}
              isLoading={isLoading}
              isParsing={isParsing}
              error={error}
              onExplore={handleExploreAlternatives}
              onFactCheck={handleFactCheck}
              onUpdateNote={handleUpdateNote}
              selectedIds={selectedIds}
              onNodeSelect={handleNodeSelect}
              hasFile={!!document.file || (isRestoring && !!analysis)}
              collapsedIds={collapsedIds}
              onNodeCollapseToggle={handleNodeCollapseToggle}
              activeNodeId={activeNodeId}
              onNodeActivate={handleNodeActivate}
              activeView={activeView}
              onActiveViewChange={setActiveView}
            />
        </div>
      </main>
    </div>
  );
}

export default App;
