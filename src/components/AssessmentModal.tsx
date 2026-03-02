/**
 * AssessmentModal
 * 
 * Full-screen overlay that:
 * 1. Shows a loading state while AI rounds complete (streaming feel)
 * 2. Displays each round as it arrives
 * 3. Allows text highlight → floating "Save as Gem 💎" button
 * 4. Saves gems to Databricks with citation tracking
 * 
 * Location: src/components/AssessmentModal.tsx
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle, Loader, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import gemIcon from 'figma:asset/53dc6cf554f69e479cfbd60a46741f158d11dd21.png';
import { saveGem, type AssessmentRound, type CitedFile } from '../utils/databricksAPI';
import { getValidSession } from '../utils/databricksAuth';

interface ResearchFile {
  id: string;
  brand: string;
  projectType: string;
  fileName: string;
  isApproved: boolean;
  uploadDate: number;
  fileType: string;
  content?: string;
  source?: string;
}

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  hexId: string;
  hexLabel: string;
  brand: string;
  projectType: string;
  assessmentType: string;
  selectedPersonas: string[];
  kbFileNames: string[];
  researchFiles: ResearchFile[];
  userSolution?: string;
  userEmail: string;
  ideasFile?: { fileName: string; content: string; fileType: string } | null;
}

interface GemToast {
  id: string;
  text: string;
  fileName: string;
}

interface FloatingButtonPos {
  x: number;
  y: number;
  text: string;
  fileId: string | null;
  fileName: string | null;
}

export function AssessmentModal({
  isOpen,
  onClose,
  hexId,
  hexLabel,
  brand,
  projectType,
  assessmentType,
  selectedPersonas,
  kbFileNames,
  researchFiles,
  userSolution,
  userEmail,
  ideasFile,
}: AssessmentModalProps) {
  const [rounds, setRounds] = useState<AssessmentRound[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [citedFiles, setCitedFiles] = useState<CitedFile[]>([]);
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(new Set());
  const [floatingBtn, setFloatingBtn] = useState<FloatingButtonPos | null>(null);
  const [savingGem, setSavingGem] = useState(false);
  const [gemToasts, setGemToasts] = useState<GemToast[]>([]);
  const [savedGemCount, setSavedGemCount] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  // IMPORTANT: runAssessment defined with useCallback BEFORE the useEffect that calls it
  const runAssessment = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setRounds([]);
    setCurrentRound(0);
    setIsComplete(false);
    setCitedFiles([]);

    try {
      const session = await getValidSession();
      if (!session) throw new Error('Not authenticated');

      // Build file list — fileId and fileName only.
      // Content is fetched server-side in assessment/run.js directly from Databricks.
      const kbFiles = kbFileNames.map(name => {
        const match = researchFiles.find(
          f => f.fileName === name || f.fileName.toLowerCase() === name.toLowerCase()
        );
        return {
          fileId: match?.id || '',
          fileName: match?.fileName || name,
        };
      });

      console.log(`[AssessmentModal] kbFileNames: ${JSON.stringify(kbFileNames)}`);
      console.log(`[AssessmentModal] resolved files: ${kbFiles.map(f => f.fileName).join(', ')}`);

      if (kbFiles.length === 0) {
        throw new Error('No knowledge base files were selected. Please go back to the Enter hex and select at least one Research File.');
      }

      const response = await fetch('/api/databricks/assessment/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hexId,
          hexLabel,
          brand,
          projectType,
          assessmentTypes: [assessmentType],
          userSolution,
          ideasFile,
          selectedPersonas,
          kbFiles,
          userEmail,
          accessToken: session.accessToken,
          workspaceHost: session.workspaceHost,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: response.statusText }));
        console.error('[AssessmentModal] Assessment failed:', err);
        console.error('[AssessmentModal] Response status:', response.status);
        throw new Error(err.message || 'Assessment failed');
      }

      const result = await response.json();

      for (let i = 0; i < result.rounds.length; i++) {
        setCurrentRound(i + 1);
        await new Promise<void>(resolve => setTimeout(resolve, 400));
        setRounds(prev => [...prev, result.rounds[i]]);
        if (i >= 1) {
          setCollapsedRounds(prev => new Set([...prev, i]));
        }
      }

      setCitedFiles(result.citedFiles || []);
      setIsComplete(true);
    } catch (err) {
      console.error('[AssessmentModal] Error caught:', err);
      console.error('[AssessmentModal] Error message:', err instanceof Error ? err.message : 'Unknown error');
      console.error('[AssessmentModal] Error stack:', err instanceof Error ? err.stack : 'No stack');
      setError(err instanceof Error ? err.message : 'Assessment failed');
    } finally {
      setIsRunning(false);
      setCurrentRound(0);
    }
  }, [hexId, hexLabel, brand, projectType, assessmentType, userSolution, ideasFile, selectedPersonas, kbFileNames, researchFiles, userEmail]);

  useEffect(() => {
    if (isOpen && !hasStarted.current) {
      hasStarted.current = true;
      setCollapsedRounds(new Set());
      setFloatingBtn(null);
      setSavedGemCount(0);
      setGemToasts([]);
      runAssessment();
    }
    if (!isOpen) {
      hasStarted.current = false;
    }
  }, [isOpen, runAssessment]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [rounds, currentRound]);

  // Handle text selection changes (better for Mac trackpad)
  useEffect(() => {
    const handleSelectionChange = () => {
      // Small delay to let the selection settle
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.toString().trim()) {
          setFloatingBtn(null);
          return;
        }
        const text = selection.toString().trim();
        if (text.length < 10) {
          setFloatingBtn(null);
          return;
        }

        // Check if selection is inside the modal content
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        if (!range || !contentRef.current?.contains(range.commonAncestorContainer)) {
          setFloatingBtn(null);
          return;
        }

        const allContent = rounds.map(r => r.content).join('\n');
        const selectionContext = text.substring(0, 100);
        const textIdx = allContent.indexOf(selectionContext);

        let fileId: string | null = null;
        let fileName: string | null = null;

        if (textIdx >= 0) {
          const citationRegex = /\[Source:\s*([^\]]+)\]/g;
          let match: RegExpExecArray | null;
          let lastCitationName: string | null = null;
          while ((match = citationRegex.exec(allContent)) !== null) {
            if (match.index < textIdx + selectionContext.length) {
              lastCitationName = match[1].trim();
            }
          }
          if (lastCitationName) {
            const cited = citedFiles.find(f => f.fileName?.toLowerCase() === lastCitationName!.toLowerCase());
            fileId = cited?.fileId || null;
            fileName = lastCitationName;
          }
        }

        const rect = range.getBoundingClientRect();
        const modalRect = contentRef.current?.getBoundingClientRect();
        if (modalRect) {
          setFloatingBtn({ x: rect.left - modalRect.left + rect.width / 2, y: rect.top - modalRect.top - 52, text, fileId, fileName });
        }
      }, 50);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [rounds, citedFiles]);

  // Handle keyboard shortcuts (Enter or Cmd+S to save gem)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (floatingBtn && (e.key === 'Enter' || (e.key === 's' && (e.metaKey || e.ctrlKey)))) {
        e.preventDefault();
        handleSaveGem();
      }
      if (e.key === 'Escape') {
        setFloatingBtn(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [floatingBtn]);

  const handleMouseUp = useCallback((_e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setFloatingBtn(null);
      return;
    }
    const text = selection.toString().trim();
    if (text.length < 10) { setFloatingBtn(null); return; }

    const allContent = rounds.map(r => r.content).join('\n');
    const selectionContext = text.substring(0, 100);
    const textIdx = allContent.indexOf(selectionContext);

    let fileId: string | null = null;
    let fileName: string | null = null;

    if (textIdx >= 0) {
      const citationRegex = /\[Source:\s*([^\]]+)\]/g;
      let match: RegExpExecArray | null;
      let lastCitationName: string | null = null;
      while ((match = citationRegex.exec(allContent)) !== null) {
        if (match.index < textIdx + selectionContext.length) {
          lastCitationName = match[1].trim();
        }
      }
      if (lastCitationName) {
        const cited = citedFiles.find(f => f.fileName?.toLowerCase() === lastCitationName!.toLowerCase());
        fileId = cited?.fileId || null;
        fileName = lastCitationName;
      }
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const modalRect = contentRef.current?.getBoundingClientRect();
    if (modalRect) {
      setFloatingBtn({ x: rect.left - modalRect.left + rect.width / 2, y: rect.top - modalRect.top - 52, text, fileId, fileName });
    }
  }, [rounds, citedFiles]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-gem-button]')) {
      // Don't clear immediately - let selectionchange handle it
      // This prevents the button from disappearing when clicking on selected text
    }
  }, []);

  const handleSaveGem = async () => {
    if (!floatingBtn) return;
    setSavingGem(true);
    try {
      const session = await getValidSession();
      if (!session) throw new Error('Not authenticated');
      const result = await saveGem({
        gemText: floatingBtn.text,
        fileId: floatingBtn.fileId || undefined,
        fileName: floatingBtn.fileName || undefined,
        assessmentType, hexId, hexLabel, brand, projectType,
        createdBy: userEmail,
        accessToken: session.accessToken,
        workspaceHost: session.workspaceHost,
      });
      if (result.success) {
        setSavedGemCount(prev => prev + 1);
        const toastId = Date.now().toString();
        setGemToasts(prev => [...prev, {
          id: toastId,
          text: floatingBtn.text.substring(0, 60) + (floatingBtn.text.length > 60 ? '…' : ''),
          fileName: floatingBtn.fileName || 'Unknown source',
        }]);
        setTimeout(() => setGemToasts(prev => prev.filter(t => t.id !== toastId)), 3500);
      } else {
        throw new Error(result.error || 'Save failed');
      }
    } catch (err) {
      alert(`Failed to save gem: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSavingGem(false);
      setFloatingBtn(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  const toggleRoundCollapse = (roundNum: number) => {
    setCollapsedRounds(prev => {
      const next = new Set(prev);
      if (next.has(roundNum)) next.delete(roundNum); else next.add(roundNum);
      return next;
    });
  };

  // Returns array of React nodes — wrap in a fragment or <p> at the call site
  const formatCitations = (text: string): React.ReactNode => {
    const parts = text.split(/(\[Source:[^\]]+\]|\[General Knowledge\]|\[COLLABORATION COMPLETE\])/g);
    return parts.map((part, i) => {
      if (part.startsWith('[Source:')) {
        const name = part.replace('[Source:', '').replace(']', '').trim();
        const cited = citedFiles.find(f => f.fileName?.toLowerCase() === name.toLowerCase());
        return (
          <span key={i} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium mx-0.5 ${cited?.fileId ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
            📄 {name}
          </span>
        );
      }
      if (part === '[General Knowledge]') return <span key={i} className="inline px-1 py-0.5 bg-gray-100 text-gray-500 text-xs rounded mx-0.5">General Knowledge</span>;
      if (part === '[COLLABORATION COMPLETE]') return <span key={i} />;
      return <span key={i}>{part}</span>;
    });
  };

  const formatContent = (content: string): React.ReactNode => {
    const lines = content.split('\n').filter(line => !line.startsWith('## Round'));
    return lines.map((line, i) => {
      const personaMatch = line.match(/^\*\*([^*]+):\*\*\s*(.*)/);
      if (personaMatch) {
        const persona = personaMatch[1];
        const rest = personaMatch[2];
        const isFactChecker = persona.toLowerCase().includes('fact');
        return (
          <div key={i} className="mb-3">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-1 ${isFactChecker ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-purple-100 text-purple-800 border border-purple-300'}`}>
              {persona}
            </span>
            <p className="text-gray-800 text-sm leading-relaxed">{formatCitations(rest)}</p>
          </div>
        );
      }
      if (line.trim() === '---') return <hr key={i} className="border-gray-200 my-3" />;
      if (!line.trim()) return <div key={i} className="h-1" />;
      return <p key={i} className="text-gray-700 text-sm leading-relaxed mb-1">{formatCitations(line)}</p>;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
      <div className="bg-white rounded-xl shadow-2xl flex flex-col" style={{ width: '75%', height: '75vh', maxWidth: '1200px' }}>
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-t-xl">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-gray-900 font-semibold text-lg leading-tight">{hexLabel} Assessment</h2>
            <p className="text-gray-500 text-sm">
              {brand} · {assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)}
              {selectedPersonas.length > 0 && ` · ${selectedPersonas.length} persona${selectedPersonas.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {isComplete && savedGemCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
              <img src={gemIcon} alt="gems" className="w-4 h-4" />
              <span className="text-amber-700 text-sm font-medium">{savedGemCount} gem{savedGemCount !== 1 ? 's' : ''} saved</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isComplete && (
            <span className="flex items-center gap-1.5 text-green-700 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Complete · {rounds.length} round{rounds.length !== 1 ? 's' : ''}
            </span>
          )}
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress */}
      {isRunning && (
        <div className="bg-purple-50 border-b border-purple-200 px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <img src={gemIcon} alt="working" className="w-4 h-4 animate-spin" />
          <span className="text-purple-800 text-sm font-medium">
            {currentRound > 0 ? `Running Round ${currentRound}…` : 'Starting collaboration…'}
          </span>
          <div className="flex gap-1 ml-2">
            {[1, 2, 3].map(n => (
              <div key={n} className={`w-2 h-2 rounded-full transition-all ${currentRound >= n ? 'bg-purple-600' : 'bg-purple-200'}`} />
            ))}
            <div className="w-2 h-2 rounded-full bg-purple-100 animate-pulse" />
          </div>
        </div>
      )}

      {/* Gem instructions */}
      {isComplete && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 flex-shrink-0">
          <img src={gemIcon} alt="gem" className="w-4 h-4" />
          <span className="text-amber-800 text-sm">
            <strong>Highlight any text</strong> to save it as a Gem — gems track which KB files inspired great ideas
          </span>
        </div>
      )}

      {/* Scrollable content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto bg-gray-50 relative" onMouseUp={handleMouseUp} onMouseDown={handleMouseDown}>
        {error && (
          <div className="m-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Assessment Failed</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button onClick={runAssessment} className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Try Again</button>
            </div>
          </div>
        )}

        {isRunning && rounds.length === 0 && (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-5/6" />
                  <div className="h-3 bg-gray-100 rounded w-4/6" />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-6 space-y-4 max-w-4xl mx-auto">
          {rounds.map((round, idx) => {
            const isCollapsed = collapsedRounds.has(round.roundNumber);
            const isLast = idx === rounds.length - 1;
            return (
              <div key={round.roundNumber} className={`bg-white border-2 rounded-lg overflow-hidden ${isLast ? 'border-purple-300 shadow-sm' : 'border-gray-200'}`}>
                <button onClick={() => toggleRoundCollapse(round.roundNumber)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isLast ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {round.roundNumber}
                    </span>
                    <span className={`font-medium text-sm ${isLast ? 'text-purple-900' : 'text-gray-700'}`}>
                      Round {round.roundNumber}{isLast && isComplete ? ' — Final' : ''}
                    </span>
                    {isLast && isRunning && <img src={gemIcon} alt="working" className="w-3.5 h-3.5 animate-spin" />}
                  </div>
                  {isCollapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
                </button>
                {!isCollapsed && (
                  <div className="px-5 pb-5 pt-1 border-t border-gray-100">
                    {formatContent(round.content)}
                  </div>
                )}
              </div>
            );
          })}

          {isRunning && rounds.length > 0 && (
            <div className="bg-white border-2 border-dashed border-purple-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <img src={gemIcon} alt="working" className="w-4 h-4 animate-spin" />
              <span className="text-purple-600 text-sm">Round {rounds.length + 1} in progress…</span>
            </div>
          )}

          {isComplete && citedFiles.length > 0 && (
            <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
              <h4 className="text-gray-700 font-medium text-sm mb-3">📚 Knowledge Base Citations Used</h4>
              <div className="flex flex-wrap gap-2">
                {citedFiles.map((f, i) => (
                  <span key={i} className={`px-2.5 py-1 rounded text-xs font-medium ${f.fileId ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                    📄 {f.fileName}{f.fileId && <span className="ml-1 text-green-600">✓</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {savedGemCount > 0 && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <img src={gemIcon} alt="gem" className="w-5 h-5" />
                <span className="text-amber-800 font-medium text-sm">{savedGemCount} gem{savedGemCount !== 1 ? 's' : ''} saved from this assessment</span>
              </div>
              <p className="text-amber-700 text-xs mt-1">Gems tagged with {hexLabel} · {brand}</p>
            </div>
          )}
        </div>

        {/* Floating gem button */}
        {floatingBtn && (
          <div
            data-gem-button="true"
            style={{ position: 'absolute', left: `${floatingBtn.x}px`, top: `${Math.max(4, floatingBtn.y)}px`, transform: 'translateX(-50%)', zIndex: 100 }}
          >
            <button
              onClick={handleSaveGem}
              disabled={savingGem}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-full shadow-lg disabled:opacity-60 transition-all whitespace-nowrap"
            >
              {savingGem ? <img src={gemIcon} alt="saving" className="w-3.5 h-3.5 animate-spin" /> : <img src={gemIcon} alt="gem" className="w-4 h-4" />}
              Save as Gem
              {floatingBtn.fileName && (
                <span className="text-amber-200 text-xs">· {floatingBtn.fileName.length > 20 ? floatingBtn.fileName.substring(0, 20) + '…' : floatingBtn.fileName}</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      {isComplete && (
        <div className="bg-white border-t-2 border-gray-200 px-6 py-4 flex items-center justify-end flex-shrink-0">
          <button onClick={onClose} className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors">
            Accept & Close
          </button>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 space-y-2 z-[200] pointer-events-none">
        {gemToasts.map(toast => (
          <div key={toast.id} className="flex items-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-lg shadow-lg text-sm max-w-xs">
            <img src={gemIcon} alt="gem" className="w-4 h-4 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium">Gem saved!</div>
              <div className="text-amber-100 text-xs truncate">{toast.text}</div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}