import { useState, useEffect } from "react";
import {
  CheckCircle,
  PlayCircle,
  FileText,
  ChevronRight,
  Cpu,
} from "lucide-react";
import gemIcon from "figma:asset/53dc6cf554f69e479cfbd60a46741f158d11dd21.png";
import { getPersonasForHex, LIVING_PERSONA_IDS, type PersonaLevel1, type PersonaLevel2, type PersonaLevel3 } from "../data/personas";
import type { CustomPersona } from "../utils/databricksAPI";
import { isBrandInCategory } from "../data/brandCategoryMapping";
import { availableModels } from "./ModelTemplateManager";
import { CoalIcon } from "./GemCheckCoalReviewPanel";

interface ResearchFile {
  id: string;
  brand: string;
  projectType: string;
  fileName: string;
  isApproved: boolean;
  uploadDate: number;
  fileType: string;
  scope?: 'general' | 'category' | 'brand';
}

interface HexExecution {
  id: string;
  selectedFiles: string[];
  assessmentType: string[];
  assessment: string;
  timestamp: number;
}

interface CentralHexViewProps {
  hexId: string;
  hexLabel: string;
  researchFiles: ResearchFile[];
  onExecute: (
    selectedFiles: string[],
    assessmentType: string[],
    assessment: string,
  ) => void;
  databricksInstructions?: string;
  previousExecutions: HexExecution[];
  crossHexExecutions?: HexExecution[];
  anyPriorPersonaRun?: boolean;
  onSaveRecommendation?: (recommendation: string, hexId: string) => void;
  projectType?: string;
  userBrand?: string;
  requestMode?: 'get-inspired' | 'load-ideas';
  // ── AI Help Widget props (NEW) ──────────────────────────────────────────────
  userEmail?: string;
  userRole?: string;
  onContextChange?: (files: string[], step: 1 | 2 | 3) => void;
  onAddIterationDirection?: (direction: string) => void;
  iterationDirections?: string[];
  // ── Grade hex idea extraction ───────────────────────────────────────────────
  extractedIdeas?: string[];
  ideasLoading?: boolean;
  customPersonas?: CustomPersona[];
}

export function CentralHexView({
  hexId,
  hexLabel,
  researchFiles,
  onExecute,
  databricksInstructions,
  previousExecutions,
  crossHexExecutions = [],
  anyPriorPersonaRun = false,
  onSaveRecommendation,
  projectType,
  userBrand,
  requestMode,
  // ── AI Help Widget props (NEW) ──────────────────────────────────────────────
  userEmail = 'user@cohive.app',
  userRole = 'user',
  onContextChange,
  onAddIterationDirection,
  iterationDirections = [],
  extractedIdeas = [],
  ideasLoading = false,
  customPersonas = [],
}: CentralHexViewProps) {
  const isPersonaHex = ['Consumers', 'Luminaries', 'Colleagues', 'cultural', 'Grade'].includes(hexId);
  
  // Set initial step based on hexId - Competitors starts at step 3
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(hexId === 'competitors' ? 3 : 1);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  // Persona hexes default to "recommend", others default to "unified"
  const [assessmentType, setAssessmentType] = useState<string[]>(
    isPersonaHex ? ["recommend"] : ["unified"]
  );
  const [testingScale, setTestingScale] = useState<string>("");
  const [assessment, setAssessment] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [sendToKnowledgeBase, setSendToKnowledgeBase] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);
  const [bugReportText, setBugReportText] = useState('');
  const [bugReportSending, setBugReportSending] = useState(false);
  const [showDirectionModal, setShowDirectionModal] = useState(false);
  const [directionText, setDirectionText] = useState('');
  const [showPriorPersonaModal, setShowPriorPersonaModal] = useState(false);
  const [pendingExecuteFiles, setPendingExecuteFiles] = useState<string[]>([]);
  const [pendingExecuteType, setPendingExecuteType] = useState<string[]>([]);
  const [pendingExecuteAssessment, setPendingExecuteAssessment] = useState('');
  const [recommendationText, setRecommendationText] = useState("");
  const [showGemInput, setShowGemInput] = useState(false);
  const [gemText, setGemText] = useState("");

  // Competitors-specific state
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>("");
  const [competitorAnalysisType, setCompetitorAnalysisType] = useState<string>("");

  // Grade hex — idea selection state.
  // All extractedIdeas are selected by default; user can uncheck to exclude.
  // manualIdeas are always included. This derived pattern avoids async timing issues.
  const [excludedIdeas, setExcludedIdeas] = useState<Set<string>>(new Set());
  const [manualIdeas, setManualIdeas] = useState<string[]>([]);
  const [manualIdea, setManualIdea] = useState<string>('');
  const [gradeSubmitted, setGradeSubmitted] = useState(false);
  const [includeZappiQuestions, setIncludeZappiQuestions] = useState(false);
  const [includeZappiSet2, setIncludeZappiSet2] = useState(false);
  const effectiveSelectedIdeas = [
    ...extractedIdeas.filter(idea => !excludedIdeas.has(idea)),
    ...manualIdeas,
  ];

  // Persona selection state for Consumers hex
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [selectedLevel1, setSelectedLevel1] = useState<string[]>([]);
  const [selectedLevel2, setSelectedLevel2] = useState<string[]>([]);

  // Unified is meaningless when only one persona is selected — disable and auto-clear it
  const personaHexIds = ['Consumers', 'Luminaries', 'Colleagues', 'cultural'];
  const isUnifiedDisabled = personaHexIds.includes(hexId) && selectedFiles.length <= 1;
  useEffect(() => {
    if (isUnifiedDisabled && assessmentType.includes('unified')) {
      setAssessmentType(prev => prev.filter(t => t !== 'unified'));
    }
  }, [isUnifiedDisabled]);

  // ── AI Help Widget: notify parent when step or files change (NEW) ───────────
  useEffect(() => {
    onContextChange?.(selectedFiles, currentStep);
  }, [selectedFiles, currentStep]);

  // Get persona config for this hex
  const personaConfig = getPersonasForHex(hexId);

  // Filter research files relevant to this hex
  const relevantFiles = researchFiles.filter((file) => file.isApproved);

  // Check if "recommend" has been done in previous executions
  const hasRecommendBeenDone = previousExecutions.some(execution => 
    Array.isArray(execution.assessmentType) 
      ? execution.assessmentType.includes('recommend')
      : execution.assessmentType === 'recommend'
  );

  // Determine if "assess" should be disabled (persona hexes only)
  // Allow assess if this hex has prior runs OR if any other persona hex has been run
  const isAssessDisabled = isPersonaHex && requestMode === 'get-inspired' && !hasRecommendBeenDone && !anyPriorPersonaRun;

  const handleFileToggle = (fileName: string) => {
    if (selectedFiles.includes(fileName)) {
      setSelectedFiles(
        selectedFiles.filter((f) => f !== fileName),
      );
    } else {
      setSelectedFiles([...selectedFiles, fileName]);
    }
  };

  const handleAssessmentTypeChange = (type: string) => {
    if (assessmentType.includes(type)) {
      // Deselecting a type
      const newTypes = assessmentType.filter(t => t !== type);
      if (newTypes.length > 0) {
        setAssessmentType(newTypes);
      }
    } else {
      // Selecting a type
      if (type === 'unified') {
        // Unified can only be added if assess or recommend is already selected
        const hasAssessOrRecommend = assessmentType.includes('assess') || assessmentType.includes('recommend');
        if (hasAssessOrRecommend) {
          setAssessmentType([...assessmentType, type]);
        }
      } else {
        // Adding assess or recommend
        setAssessmentType([...assessmentType, type]);
      }
    }
  };

  // Persona selection handlers
  const handlePersonaToggle = (personaId: string, personaName: string) => {
    if (selectedPersonas.includes(personaId)) {
      setSelectedPersonas(selectedPersonas.filter(p => p !== personaId));
    } else {
      setSelectedPersonas([...selectedPersonas, personaId]);
    }
  };

  // Level 1 toggle handler
  const handleLevel1Toggle = (level1Id: string) => {
    if (selectedLevel1.includes(level1Id)) {
      const newLevel1 = selectedLevel1.filter(id => id !== level1Id);
      setSelectedLevel1(newLevel1);
      
      const level1Option = personaConfig?.options.find(opt => opt.id === level1Id);
      if (level1Option?.subcategories) {
        const level2IdsToRemove = level1Option.subcategories.map(sub => sub.id);
        setSelectedLevel2(selectedLevel2.filter(id => !level2IdsToRemove.includes(id)));
        
        const personasToRemove: string[] = [];
        level1Option.subcategories.forEach(sub => {
          if (sub.roles) {
            sub.roles.forEach(role => personasToRemove.push(role.id));
          }
        });
        setSelectedPersonas(selectedPersonas.filter(id => !personasToRemove.includes(id)));
      }
    } else {
      setSelectedLevel1([...selectedLevel1, level1Id]);
    }
  };

  // Level 2 toggle handler
  const handleLevel2Toggle = (level2Id: string, level1Id: string) => {
    if (selectedLevel2.includes(level2Id)) {
      setSelectedLevel2(selectedLevel2.filter(id => id !== level2Id));
      
      const level1Option = personaConfig?.options.find(opt => opt.id === level1Id);
      const level2Option = level1Option?.subcategories?.find(sub => sub.id === level2Id);
      if (level2Option?.roles) {
        const personasToRemove = level2Option.roles.map(role => role.id);
        setSelectedPersonas(selectedPersonas.filter(id => !personasToRemove.includes(id)));
      }
    } else {
      setSelectedLevel2([...selectedLevel2, level2Id]);
    }
  };

  // Get level2 options for all selected level1s
  const getAllLevel2Options = (): { level1Id: string; level2: PersonaLevel2 }[] => {
    if (!personaConfig || selectedLevel1.length === 0) return [];
    
    const result: { level1Id: string; level2: PersonaLevel2 }[] = [];
    selectedLevel1.forEach(level1Id => {
      const level1Option = personaConfig.options.find(opt => opt.id === level1Id);
      if (level1Option?.subcategories) {
        level1Option.subcategories.forEach(level2 => {
          result.push({ level1Id, level2 });
        });
      }
    });
    return result;
  };

  // Get level3 options for all selected level2s
  const getAllLevel3Options = (): { level1Id: string; level2Id: string; level3: PersonaLevel3 }[] => {
    if (!personaConfig || selectedLevel2.length === 0) return [];
    
    const result: { level1Id: string; level2Id: string; level3: PersonaLevel3 }[] = [];
    selectedLevel1.forEach(level1Id => {
      const level1Option = personaConfig.options.find(opt => opt.id === level1Id);
      if (level1Option?.subcategories) {
        level1Option.subcategories.forEach(level2 => {
          if (selectedLevel2.includes(level2.id) && level2.roles) {
            level2.roles.forEach(level3 => {
              result.push({ level1Id, level2Id: level2.id, level3 });
            });
          }
        });
      }
    });
    return result;
  };

  // Get current level2 options based on selected level1
  const getLevel2Options = (): PersonaLevel2[] | undefined => {
    if (!personaConfig || selectedLevel1.length === 0) return undefined;
    const level1Option = personaConfig.options.find(opt => opt.id === selectedLevel1[0]);
    return level1Option?.subcategories;
  };

  // Get current level3 options based on selected level1 and level2
  const getLevel3Options = (): PersonaLevel3[] | undefined => {
    if (!personaConfig || selectedLevel1.length === 0) return undefined;
    const level1Option = personaConfig.options.find(opt => opt.id === selectedLevel1[0]);
    
    if (!level1Option) return undefined;
    
    if (selectedLevel2.length > 0 && level1Option.subcategories) {
      const level2Option = level1Option.subcategories.find(opt => opt.id === selectedLevel2[0]);
      return level2Option?.roles;
    }
    
    return level1Option.roles;
  };

  const handleExecute = () => {
    const isWarGames = projectType === 'War Games';

    // Grade hex: validate ideas + segments + scale, then encode and fire
    if (hexId === 'Grade') {
      if (effectiveSelectedIdeas.length === 0 && !includeZappiQuestions && !includeZappiSet2) {
        alert("Please select at least one idea to score, or enable Zappi Questions.");
        return;
      }
      if (selectedFiles.length === 0) {
        alert("Please select at least one segment.");
        return;
      }
      if (!testingScale) {
        alert("Please choose a scoring scale.");
        return;
      }
      const gradeAssessment = `[GRADE_SCALE:${testingScale}]\n[GRADE_IDEAS:${effectiveSelectedIdeas.join('||')}]${includeZappiQuestions ? '\n[ZAPPI_QUESTIONS:true]' : ''}${includeZappiSet2 ? '\n[ZAPPI_SET2:true]' : ''}`;
      onExecute(selectedFiles, ['grade'], gradeAssessment);
      setGradeSubmitted(true);
      return;
    }

    if (hexId === 'competitors') {
      if (isWarGames) {
        if (!selectedCompetitor) {
          alert("Please select a competitor");
          return;
        }
      } else {
        if (!selectedCompetitor || !competitorAnalysisType) {
          alert("Please select a competitor and analysis type");
          return;
        }
      }
    } else if (isWarGames) {
      if (!assessment.trim()) {
        alert("Please provide an assessment");
        return;
      }
    } else {
      if (isPersonaHex) {
        if (selectedFiles.length === 0) {
          alert("Please select at least one persona");
          return;
        }
      } else {
        if (selectedFiles.length === 0 || !assessment.trim()) {
          alert(
            "Please select at least one file and provide an assessment",
          );
          return;
        }
      }
    }

    // If there are prior executions on this or any other persona hex, ask user what to include
    const personaHexIds = ['Consumers', 'Luminaries', 'Colleagues', 'cultural', 'Grade'];
    const allPriorExecutions = [...previousExecutions, ...crossHexExecutions];
    if (personaHexIds.includes(hexId) && allPriorExecutions.length > 0) {
      setPendingExecuteFiles(selectedFiles);
      setPendingExecuteType(assessmentType);
      setPendingExecuteAssessment(assessment);
      setShowPriorPersonaModal(true);
      return;
    }

    // For War Games in the competitors hex, inject competitor name into assessment
    const finalAssessment = (hexId === 'competitors' && projectType === 'War Games' && selectedCompetitor)
      ? `[WAR_GAMES_COMPETITOR: ${selectedCompetitor}]\n${assessment}`
      : assessment;

    onExecute(selectedFiles, assessmentType, finalAssessment);

    // Reset for next execution
    setCurrentStep(hexId === 'competitors' ? 3 : 1);
    setSelectedFiles([]);
    setAssessmentType(isPersonaHex ? ["recommend"] : ["unified"]);
    setAssessment("");
    
    if (hexId === 'competitors') {
      setSelectedCompetitor("");
      setCompetitorAnalysisType("");
    }
  };

  const isWarGamesProject = projectType === 'War Games';
  // Grade uses all 3 steps: step1=ideas, step2=segments, step3=scale
  const canProceedToStep2 = hexId === 'Grade'
    ? effectiveSelectedIdeas.length > 0 || includeZappiQuestions || includeZappiSet2
    : isWarGamesProject || selectedFiles.length > 0;
  const canProceedToStep3 =
    hexId === "Grade"
      ? canProceedToStep2 && selectedPersonas.length > 0  // segments in selectedPersonas until Next copies to selectedFiles
      : canProceedToStep2 && assessmentType.length > 0;
  const canExecute =
    hexId === 'Grade'
      ? canProceedToStep3 && testingScale.length > 0
      : hexId === 'competitors'
      ? (projectType === 'War Games'
          ? selectedCompetitor.length > 0
          : selectedCompetitor.length > 0 && competitorAnalysisType.length > 0)
      : isWarGamesProject
        ? assessment.trim().length > 0
        : canProceedToStep3 && assessment.trim().length > 0;

  return (
    <div className="space-y-2">
      {/* Step Progress Indicator - Hidden for Competitors */}
      {hexId !== 'competitors' && !(hexId === 'Consumers' || hexId === 'Luminaries' || hexId === 'Colleagues' || hexId === 'cultural' || hexId === 'Grade') && (
        <div className="flex items-center justify-between pb-1 border-b-2 border-gray-300">
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <button
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    currentStep === step
                      ? "bg-blue-600 text-white border-blue-600"
                      : currentStep > step
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-gray-200 text-gray-600 border-gray-300"
                  }`}
                  onClick={() => {
                    if (step === 1) setCurrentStep(1);
                    if (step === 2 && canProceedToStep2)
                      setCurrentStep(2);
                    if (step === 3 && canProceedToStep3)
                      setCurrentStep(3);
                  }}
                  disabled={
                    (step === 2 && !canProceedToStep2) ||
                    (step === 3 && !canProceedToStep3)
                  }
                >
                  {currentStep > step ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step
                  )}
                </button>
                {step < 3 && (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              Step {currentStep} of 3
            </span>
            {previousExecutions.length > 0 && (
              <button
                className="px-3 py-1 border-2 border-gray-400 text-gray-700 rounded text-sm hover:bg-gray-50"
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? "Hide" : "Show"} History (
                {previousExecutions.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step Progress Indicator for Grade Hex - 3 steps */}
      {hexId === 'Grade' && (
        <div className="flex items-center justify-between pb-1 border-b-2 border-gray-300">
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <button
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    currentStep === step
                      ? "bg-blue-600 text-white border-blue-600"
                      : currentStep > step
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-gray-200 text-gray-600 border-gray-300"
                  }`}
                  onClick={() => {
                    if (step === 1) { setCurrentStep(1); setGradeSubmitted(false); }
                    if (step === 2 && canProceedToStep2) setCurrentStep(2);
                    if (step === 3 && canProceedToStep3) setCurrentStep(3);
                  }}
                  disabled={
                    (step === 2 && !canProceedToStep2) ||
                    (step === 3 && !canProceedToStep3)
                  }
                >
                  {currentStep > step ? <CheckCircle className="w-5 h-5" /> : step}
                </button>
                {step < 3 && <ChevronRight className="w-5 h-5 text-gray-400" />}
              </div>
            ))}
          </div>
          <span className="text-sm text-gray-600">Step {currentStep} of 3</span>
        </div>
      )}

      {/* Step Progress Indicator for Persona Hexes - Without History Button */}
      {(hexId === 'Consumers' || hexId === 'Luminaries' || hexId === 'Colleagues' || hexId === 'cultural') && (
        <div className="flex items-center justify-between pb-1 border-b-2 border-gray-300">
          <div className="flex items-center gap-4">
            {[1, 2].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <button
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    currentStep === step
                      ? "bg-blue-600 text-white border-blue-600"
                      : currentStep > step
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-gray-200 text-gray-600 border-gray-300"
                  }`}
                  onClick={() => {
                    if (step === 1) setCurrentStep(1);
                    if (step === 2 && canProceedToStep2)
                      setCurrentStep(2);
                  }}
                  disabled={step === 2 && !canProceedToStep2}
                >
                  {currentStep > step ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step
                  )}
                </button>
                {step < 2 && (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              Step {currentStep} of 2
            </span>
          </div>
        </div>
      )}

      {/* History Button for Competitors (without step indicator) */}
      {hexId === 'competitors' && previousExecutions.length > 0 && (
        <div className="flex justify-end pb-1 border-b-2 border-gray-300">
          <button
            className="px-3 py-1 border-2 border-gray-400 text-gray-700 rounded text-sm hover:bg-gray-50"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? "Hide" : "Show"} History (
            {previousExecutions.length})
          </button>
        </div>
      )}

      {/* History View */}
      {showHistory && previousExecutions.length > 0 && (
        <div className="mb-2 p-2">
          <h3 className="text-gray-900 mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Execution History
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {previousExecutions.map((execution, idx) => (
              <div
                key={execution.id}
                className="p-2 bg-white border border-gray-300 rounded"
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-900">
                    Execution #{previousExecutions.length - idx}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(
                      execution.timestamp,
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-gray-700 mb-1">
                  <strong>Files:</strong>{" "}
                  {execution.selectedFiles.join(", ")}
                </div>
                <div className="text-sm text-gray-700 mb-1">
                  <strong>Type:</strong>{" "}
                  {Array.isArray(execution.assessmentType) 
                    ? execution.assessmentType.map(type => 
                        type === 'assess' ? 'Assess' : 
                        type === 'recommend' ? 'Recommend' : 
                        'Unified'
                      ).join(', ')
                    : execution.assessmentType === "assess"
                      ? "Assess"
                      : execution.assessmentType === "recommend"
                        ? "Recommend"
                        : "Unified"
                  }
                </div>
                <div className="text-sm text-gray-700">
                  <strong>Assessment:</strong>
                  <div className="mt-1 p-2 rounded text-xs border border-gray-200">
                    {execution.assessment}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitors-specific dropdowns */}
      {hexId === 'competitors' && (
        <div className="p-3 border-b-2 border-gray-300">
          <div className="space-y-3">
            {/* Competitor Selector */}
            <div>
              <label className="block text-gray-900 mb-1 font-semibold">
                Select Competitor
              </label>
              <input
                type="text"
                className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                placeholder="Enter competitor brand name..."
                value={selectedCompetitor}
                onChange={(e) => setSelectedCompetitor(e.target.value)}
              />
            </div>

            {/* Analysis Type - Hidden for War Games */}
            {projectType !== 'War Games' && (
              <div>
                <label className="block text-gray-900 mb-1 font-semibold">
                  Analysis Type
                </label>
                <select
                  className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                  value={competitorAnalysisType}
                  onChange={(e) => setCompetitorAnalysisType(e.target.value)}
                >
                  <option value="">Choose analysis type...</option>
                  <option value="compare-assets">Compare Assets</option>
                  <option value="strengths-weaknesses">Identify Strengths and Weaknesses</option>
                  <option value="propose-improvements">Propose Improvements</option>
                </select>
              </div>
            )}

            {/* Show current selections */}
            {(selectedCompetitor || competitorAnalysisType) && (
              <div className="p-2 border-2 border-blue-500 rounded">
                <p className="text-sm text-gray-700">
                  {selectedCompetitor && (
                    <span className="block">
                      <strong>Competitor:</strong> {selectedCompetitor}
                    </span>
                  )}
                  {competitorAnalysisType && (
                    <span className="block">
                      <strong>Analysis:</strong>{" "}
                      {competitorAnalysisType === 'compare-assets' ? 'Compare Assets' :
                       competitorAnalysisType === 'strengths-weaknesses' ? 'Identify Strengths and Weaknesses' :
                       'Propose Improvements'}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Execute Button for Competitors */}
            <button
              className="w-full px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
              onClick={handleExecute}
              disabled={!canExecute}
            >
              <PlayCircle className="w-5 h-5" />
              Execute Process
            </button>
          </div>
        </div>
      )}

      {/* Step 1: File Selection / Grade Idea Selection */}
      {currentStep === 1 && (
        <div className="p-3">
          {/* Grade hex — idea selection from iteration results */}
          {hexId === 'Grade' ? (
            <>
              <h3 className="text-gray-900 leading-tight mb-1">
                Step 1 of 3: Select Ideas to Score
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Ideas extracted from this iteration's AI discussions. Select which to include in the scoring.
              </p>

              {ideasLoading ? (
                <div className="flex items-center gap-2 py-4 text-gray-500">
                  <svg className="animate-spin w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="text-sm">Extracting ideas from your iteration discussions…</span>
                </div>
              ) : extractedIdeas.length === 0 && manualIdeas.length === 0 ? (
                <div className="p-3 border-2 border-amber-200 bg-amber-50 rounded mb-3">
                  <p className="text-amber-800 text-sm">
                    No iteration results found. Run some hexes first, then return to score the ideas.
                  </p>
                </div>
              ) : (
                <div className="space-y-1 mb-3">
                  {extractedIdeas.map((idea, i) => {
                    const isExcluded = excludedIdeas.has(idea);
                    return (
                      <label key={i} className={`flex items-start gap-2 p-2 cursor-pointer hover:bg-gray-50 rounded ${isExcluded ? 'opacity-40' : ''}`}>
                        <input
                          type="checkbox"
                          checked={!isExcluded}
                          onChange={() => setExcludedIdeas(prev => {
                            const next = new Set(prev);
                            if (next.has(idea)) next.delete(idea); else next.add(idea);
                            return next;
                          })}
                          className="w-4 h-4 mt-0.5 flex-shrink-0"
                        />
                        <span className="text-gray-800 text-sm leading-snug">{idea}</span>
                      </label>
                    );
                  })}
                  {manualIdeas.map((idea, i) => (
                    <label key={`manual-${i}`} className="flex items-start gap-2 p-2 cursor-pointer hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => setManualIdeas(prev => prev.filter((_, idx) => idx !== i))}
                        className="w-4 h-4 mt-0.5 flex-shrink-0"
                      />
                      <span className="text-gray-800 text-sm leading-snug">{idea} <span className="text-xs text-gray-400">(added)</span></span>
                    </label>
                  ))}
                </div>
              )}

              {/* Add manual idea */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  className="flex-1 border-2 border-gray-300 bg-white rounded p-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500"
                  placeholder="Add an idea manually…"
                  value={manualIdea}
                  onChange={e => setManualIdea(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && manualIdea.trim()) {
                      setManualIdeas(prev => [...prev, manualIdea.trim()]);
                      setManualIdea('');
                    }
                  }}
                />
                <button
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                  onClick={() => {
                    if (manualIdea.trim()) {
                      setManualIdeas(prev => [...prev, manualIdea.trim()]);
                      setManualIdea('');
                    }
                  }}
                >
                  Add
                </button>
              </div>

              {/* Zappi Questions toggles */}
              <div className="mt-3 space-y-2">
                <label className="flex items-start gap-2 p-2 border-2 border-gray-200 rounded cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeZappiQuestions}
                    onChange={(e) => setIncludeZappiQuestions(e.target.checked)}
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <div className="text-gray-900 font-semibold text-sm">Include Zappi Questions — Set 1</div>
                    <div className="text-gray-500 text-xs mt-0.5">7 standardised concept-testing dimensions: brand fit, standout, emotion, relevance, understanding, purchase intent, brand appeal (1–5). Ideas are optional when either Zappi set is enabled.</div>
                  </div>
                </label>
                <label className="flex items-start gap-2 p-2 border-2 border-gray-200 rounded cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeZappiSet2}
                    onChange={(e) => setIncludeZappiSet2(e.target.checked)}
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <div className="text-gray-900 font-semibold text-sm">Include Zappi Questions — Set 2</div>
                    <div className="text-gray-500 text-xs mt-0.5">6 brand & creative dimensions: clarity, product anchoring, emotional resonance, distinctiveness, sensory impact, authenticity (0–5). Can be used with or without Set 1.</div>
                  </div>
                </label>
              </div>

              <div className="flex justify-between mt-4">
                <span className="text-sm text-gray-500">
                  {(includeZappiQuestions || includeZappiSet2) && effectiveSelectedIdeas.length === 0
                    ? 'Zappi Questions mode — no ideas required'
                    : `${effectiveSelectedIdeas.length} idea${effectiveSelectedIdeas.length !== 1 ? 's' : ''} selected`}
                </span>
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedToStep2}
                >
                  Next: Select Segments →
                </button>
              </div>
            </>
          ) : /* War Games - Skip file selection */
          projectType === 'War Games' ? (
            <>
              <h3 className="text-gray-900 leading-tight mb-3">
                Step 1: War Games Mode
              </h3>
              <div className="p-3 border-2 border-blue-200 bg-blue-50 rounded mb-3">
                <p className="text-blue-800">
                  War Games mode does not require knowledge base files. You can proceed directly to the assessment.
                </p>
              </div>
              <div className="flex justify-end mt-3">
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => setCurrentStep(3)}
                >
                  Skip to Assessment →
                </button>
              </div>
            </>
          ) : (hexId === 'Consumers' || hexId === 'Luminaries' || hexId === 'Colleagues' || hexId === 'cultural') && personaConfig ? (
            // Persona Selection for Consumers, Luminaries, Colleagues, Cultural Voices
            // (Grade has its own Step 1 above; its segment picker is shown in Step 2)
            <>
              <h3 className="text-gray-900 leading-tight mb-3">
                Step 1 of 2: Select {
                  hexId === 'Consumers' ? 'Consumer' :
                  hexId === 'Luminaries' ? 'External Expert' :
                  hexId === 'Colleagues' ? 'Internal Colleague' :
                  hexId === 'cultural' ? 'Cultural Voice' :
                  ''
                } Personas to use in this hex
              </h3>

              <div className="space-y-3 mb-3">
                <div>
                  <div className="space-y-0">
                    {personaConfig.options.map((opt) => (
                      <div key={opt.id}>
                        <label
                          className="flex items-start gap-2 p-0.5 cursor-pointer hover:bg-gray-50 rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            value={opt.id}
                            checked={selectedLevel1.includes(opt.id)}
                            onChange={() => handleLevel1Toggle(opt.id)}
                            className="w-4 h-4 mt-0.5"
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <div className="text-gray-900 font-semibold">
                              {opt.category}
                              {opt.description && (
                                <span className="text-sm text-gray-600 font-normal ml-2">
                                  {opt.description}
                                </span>
                              )}
                            </div>
                            {selectedLevel1.includes(opt.id) && opt.subcategories && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const level2Ids = opt.subcategories!.map(sub => sub.id);
                                  const allSelected = level2Ids.every(id => selectedLevel2.includes(id));
                                  
                                  if (allSelected) {
                                    setSelectedLevel2(selectedLevel2.filter(id => !level2Ids.includes(id)));
                                    const personasToRemove: string[] = [];
                                    opt.subcategories!.forEach(sub => {
                                      if (sub.roles) {
                                        sub.roles.forEach(role => personasToRemove.push(role.id));
                                      }
                                    });
                                    setSelectedPersonas(selectedPersonas.filter(id => !personasToRemove.includes(id)));
                                  } else {
                                    const newLevel2 = [...selectedLevel2];
                                    level2Ids.forEach(id => {
                                      if (!newLevel2.includes(id)) {
                                        newLevel2.push(id);
                                      }
                                    });
                                    setSelectedLevel2(newLevel2);
                                    
                                    const newPersonas = [...selectedPersonas];
                                    opt.subcategories!.forEach(sub => {
                                      if (sub.roles) {
                                        sub.roles.forEach(role => {
                                          if (!newPersonas.includes(role.id)) {
                                            newPersonas.push(role.id);
                                          }
                                        });
                                      }
                                    });
                                    setSelectedPersonas(newPersonas);
                                  }
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 underline ml-2"
                              >
                                {opt.subcategories.every(sub => selectedLevel2.includes(sub.id)) ? 'Deselect All' : 'Select All'}
                              </button>
                            )}
                          </div>
                        </label>

                        {selectedLevel1.includes(opt.id) && opt.subcategories && (
                          <div style={{ marginLeft: '24px', paddingLeft: '12px', borderLeft: '3px solid #93c5fd', marginTop: '4px' }}>
                            {opt.subcategories.map((level2) => (
                              <div key={level2.id}>
                                <label
                                  className="flex items-start gap-2 p-0.5 cursor-pointer hover:bg-gray-50 rounded transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    value={level2.id}
                                    checked={selectedLevel2.includes(level2.id)}
                                    onChange={() => handleLevel2Toggle(level2.id, opt.id)}
                                    className="w-4 h-4 mt-0.5"
                                  />
                                  <div className="flex-1 flex items-center justify-between">
                                    <div className="text-gray-900 font-semibold">
                                      {level2.name}
                                      {level2.description && (
                                        <span className="text-sm text-gray-600 font-normal ml-2">
                                          {level2.description}
                                        </span>
                                      )}
                                    </div>
                                    {selectedLevel2.includes(level2.id) && level2.roles && (
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          const personaIds = level2.roles!.map(role => role.id);
                                          const allSelected = personaIds.every(id => selectedPersonas.includes(id));
                                          
                                          if (allSelected) {
                                            setSelectedPersonas(selectedPersonas.filter(id => !personaIds.includes(id)));
                                          } else {
                                            const newPersonas = [...selectedPersonas];
                                            personaIds.forEach(id => {
                                              if (!newPersonas.includes(id)) {
                                                newPersonas.push(id);
                                              }
                                            });
                                            setSelectedPersonas(newPersonas);
                                          }
                                        }}
                                        className="text-xs text-green-600 hover:text-green-800 underline ml-2"
                                      >
                                        {level2.roles.every(role => selectedPersonas.includes(role.id)) ? 'Deselect All' : 'Select All'}
                                      </button>
                                    )}
                                  </div>
                                </label>

                                {selectedLevel2.includes(level2.id) && level2.roles && (
                                  <div style={{ marginLeft: '24px', paddingLeft: '12px', borderLeft: '3px solid #d1d5db', marginTop: '2px' }}>
                                    <div className="space-y-0 max-h-64 overflow-y-auto">
                                      {level2.roles.map((level3) => (
                                        <label
                                          key={level3.id}
                                          className="flex items-center gap-2 p-0.5 cursor-pointer hover:bg-gray-50 rounded transition-all"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selectedPersonas.includes(level3.id)}
                                            onChange={() => handlePersonaToggle(level3.id, level3.name)}
                                            className="w-4 h-4"
                                          />
                                          <div className="flex-1">
                                            <div className="text-gray-900">
                                              {level3.name}
                                              {LIVING_PERSONA_IDS.has(level3.id) && (
                                                <span className="text-amber-600 ml-1 text-xs">*</span>
                                              )}
                                            </div>
                                          </div>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom personas from Databricks — shown if any match this hex */}
              {(() => {
                const matchingCustom = customPersonas.filter(p =>
                  p.hexIds === 'any' || p.hexIds.split(',').map(s => s.trim()).includes(hexId)
                );
                if (matchingCustom.length === 0) return null;
                return (
                  <div className="mt-3 border-t border-gray-200 pt-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Custom Personas</div>
                    <div className="space-y-1">
                      {matchingCustom.map(p => (
                        <label key={p.personaId} className="flex items-start gap-2 p-1.5 cursor-pointer hover:bg-blue-50 rounded transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedPersonas.includes(p.personaId)}
                            onChange={() => {
                              if (selectedPersonas.includes(p.personaId)) {
                                setSelectedPersonas(selectedPersonas.filter(id => id !== p.personaId));
                              } else {
                                setSelectedPersonas([...selectedPersonas, p.personaId]);
                              }
                            }}
                            className="w-4 h-4 mt-0.5"
                          />
                          <div>
                            <span className="text-gray-900 font-medium text-sm">{p.name}</span>
                            <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Custom</span>
                            {(p.contentJson as any).category && (
                              <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">{(p.contentJson as any).subRole || (p.contentJson as any).category}</span>
                            )}
                            {(p.contentJson as any).context && (
                              <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{(p.contentJson as any).context}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {selectedPersonas.length > 0 && (
                <div className="mt-2 p-2 border-2 border-green-500 rounded">
                  <p className="text-green-800">
                    <strong>{selectedPersonas.length}</strong> persona(s) selected
                  </p>
                  {selectedPersonas.some(id => LIVING_PERSONA_IDS.has(id)) && (
                    <p className="text-amber-700 text-xs mt-1">
                      * Personas based solely on published works and do not represent those individuals' actual views or statements.
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end mt-3">
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    setSelectedFiles(selectedPersonas);
                    setCurrentStep(2);
                  }}
                  disabled={selectedPersonas.length === 0}
                >
                  Next: Choose Assessment Type →
                </button>
              </div>
            </>
          ) : (
            // Original File Selection for other hexes
            <>
              <h3 className="text-gray-900 leading-tight">
                Step 1: Select Knowledge Base Files
              </h3>
              <p className="text-gray-600 mb-2">
                Choose the knowledge files you want to include in
                this {hexLabel} process.
              </p>

          {relevantFiles.length === 0 ? (
            <div className="p-2 border-2 border-yellow-500">
              <p className="text-yellow-800">
                No approved knowledge base files available for this
                hexagon. Please upload and approve files in the
                Knowledge Base step first.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {relevantFiles.map((file) => (
                <label
                  key={file.id}
                  className="flex items-center gap-2 p-2 cursor-pointer transition-all"
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(
                      file.fileName,
                    )}
                    onChange={() =>
                      handleFileToggle(file.fileName)
                    }
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-gray-900">
                      {file.fileName}
                    </div>
                    <div className="text-sm text-gray-500">
                      Uploaded:{" "}
                      {new Date(
                        file.uploadDate,
                      ).toLocaleDateString()}
                    </div>
                  </div>
                  {selectedFiles.includes(file.fileName) && (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  )}
                </label>
              ))}
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="mt-2 p-2 border-2 border-green-500">
              <p className="text-green-800">
                <strong>{selectedFiles.length}</strong> file(s)
                selected
              </p>
            </div>
          )}

          <div className="flex justify-end mt-3">
            <button
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setCurrentStep(2)}
              disabled={!canProceedToStep2}
            >
              Next: Choose Assessment Type →
            </button>
          </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Grade segment picker OR Assessment Type for other hexes */}
      {currentStep === 2 && (
        <div className="p-3">
          {hexId === "Grade" && personaConfig ? (
            // Grade Step 2: segment picker — mirrors other persona hexes exactly
            <>
              <h3 className="text-gray-900 leading-tight mb-3">
                Step 2 of 3: Select Target Segments
              </h3>
              <div className="space-y-3 mb-3">
                <div className="space-y-0">
                  {personaConfig.options.map((opt) => (
                    <div key={opt.id}>
                      <label className="flex items-start gap-2 p-0.5 cursor-pointer hover:bg-gray-50 rounded transition-colors">
                        <input
                          type="checkbox"
                          value={opt.id}
                          checked={selectedLevel1.includes(opt.id)}
                          onChange={() => handleLevel1Toggle(opt.id)}
                          className="w-4 h-4 mt-0.5"
                        />
                        <div className="flex-1 flex items-center justify-between">
                          <div className="text-gray-900 font-semibold">
                            {opt.category}
                            {opt.description && (
                              <span className="text-sm text-gray-600 font-normal ml-2">{opt.description}</span>
                            )}
                          </div>
                          {selectedLevel1.includes(opt.id) && opt.subcategories && (
                            <button
                              onClick={(e) => {
                                e.preventDefault(); e.stopPropagation();
                                const level2Ids = opt.subcategories!.map(sub => sub.id);
                                const allSelected = level2Ids.every(id => selectedLevel2.includes(id));
                                if (allSelected) {
                                  setSelectedLevel2(selectedLevel2.filter(id => !level2Ids.includes(id)));
                                  const toRemove: string[] = [];
                                  opt.subcategories!.forEach(sub => sub.roles?.forEach(r => toRemove.push(r.id)));
                                  setSelectedPersonas(selectedPersonas.filter(id => !toRemove.includes(id)));
                                } else {
                                  const newL2 = [...selectedLevel2];
                                  level2Ids.forEach(id => { if (!newL2.includes(id)) newL2.push(id); });
                                  setSelectedLevel2(newL2);
                                  const newP = [...selectedPersonas];
                                  opt.subcategories!.forEach(sub => sub.roles?.forEach(r => { if (!newP.includes(r.id)) newP.push(r.id); }));
                                  setSelectedPersonas(newP);
                                }
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 underline ml-2"
                            >
                              {opt.subcategories.every(sub => selectedLevel2.includes(sub.id)) ? 'Deselect All' : 'Select All'}
                            </button>
                          )}
                        </div>
                      </label>

                      {selectedLevel1.includes(opt.id) && opt.subcategories && (
                        <div style={{ marginLeft: '24px', paddingLeft: '12px', borderLeft: '3px solid #93c5fd', marginTop: '4px' }}>
                          {opt.subcategories.map((sub) => (
                            <div key={sub.id}>
                              <label className="flex items-start gap-2 p-0.5 cursor-pointer hover:bg-gray-50 rounded transition-colors">
                                <input
                                  type="checkbox"
                                  value={sub.id}
                                  checked={selectedLevel2.includes(sub.id)}
                                  onChange={() => handleLevel2Toggle(sub.id, opt.id)}
                                  className="w-4 h-4 mt-0.5"
                                />
                                <div className="flex-1 flex items-center justify-between">
                                  <div className="text-gray-700 font-medium">
                                    {sub.name}
                                    {sub.description && <span className="text-sm text-gray-500 font-normal ml-2">{sub.description}</span>}
                                  </div>
                                  {selectedLevel2.includes(sub.id) && sub.roles && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault(); e.stopPropagation();
                                        const ids = sub.roles!.map(r => r.id);
                                        const allSelected = ids.every(id => selectedPersonas.includes(id));
                                        if (allSelected) {
                                          setSelectedPersonas(selectedPersonas.filter(id => !ids.includes(id)));
                                        } else {
                                          const newP = [...selectedPersonas];
                                          ids.forEach(id => { if (!newP.includes(id)) newP.push(id); });
                                          setSelectedPersonas(newP);
                                        }
                                      }}
                                      className="text-xs text-green-600 hover:text-green-800 underline ml-2"
                                    >
                                      {sub.roles.every(r => selectedPersonas.includes(r.id)) ? 'Deselect All' : 'Select All'}
                                    </button>
                                  )}
                                </div>
                              </label>

                              {selectedLevel2.includes(sub.id) && sub.roles && (
                                <div style={{ marginLeft: '24px', paddingLeft: '12px', borderLeft: '3px solid #d1d5db', marginTop: '2px' }}>
                                  <div className="space-y-0 max-h-64 overflow-y-auto">
                                    {sub.roles.map((role) => (
                                      <label key={role.id} className="flex items-center gap-2 p-0.5 cursor-pointer hover:bg-gray-50 rounded transition-all">
                                        <input
                                          type="checkbox"
                                          checked={selectedPersonas.includes(role.id)}
                                          onChange={() => handlePersonaToggle(role.id, role.name)}
                                          className="w-4 h-4"
                                        />
                                        <div className="flex-1 text-gray-900 text-sm">
                                          {role.name}
                                          {LIVING_PERSONA_IDS.has(role.id) && (
                                            <span className="text-amber-600 ml-1 text-xs">*</span>
                                          )}
                                          {(role as any).populationEstimate != null && (
                                            <span className="text-gray-400 ml-1 text-xs">({(role as any).populationEstimate}%)</span>
                                          )}
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedPersonas.length > 0 && (
                <div className="mt-2 p-2 border-2 border-green-500 rounded mb-2">
                  <p className="text-green-800 text-sm">
                    <strong>{selectedPersonas.length}</strong> segment{selectedPersonas.length !== 1 ? 's' : ''} selected
                  </p>
                  {selectedPersonas.some(id => LIVING_PERSONA_IDS.has(id)) && (
                    <p className="text-amber-700 text-xs mt-1">
                      * Personas based solely on published works and do not represent those individuals' actual views or statements.
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between mt-3">
                <button className="px-6 py-2 border-2 border-gray-400 text-gray-700 rounded hover:bg-gray-50" onClick={() => setCurrentStep(1)}>← Back</button>
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => { setSelectedFiles(selectedPersonas); setCurrentStep(3); }}
                  disabled={selectedPersonas.length === 0}
                >
                  Next: Choose Scale →
                </button>
              </div>
            </>
          ) : hexId === "Grade" ? (
            <p className="text-gray-500 text-sm p-2">No segment configuration found.</p>
          ) : (
            // All other hexes: Assessment Type (Step 2 of 2 for persona hexes, Step 2 of 3 for non-persona)
            <>
              <h3 className="text-gray-900 leading-tight">
                {(['Consumers', 'Luminaries', 'Colleagues', 'cultural'].includes(hexId)) ? 'Step 2 of 2' : 'Step 2'}: Choose Assessment Type
              </h3>
              <p className="text-gray-600 mb-2">
                Select how you want to process the selected files.
              </p>
              <div className="space-y-1">
                <label className="flex items-start gap-2 p-2 cursor-pointer transition-colors">
                  <input type="checkbox" checked={assessmentType.includes("assess")} onChange={() => handleAssessmentTypeChange("assess")} className="w-4 h-4" disabled={isAssessDisabled} />
                  <div className="flex-1">
                    <div className="text-gray-900 font-semibold">Assess</div>
                    <div className="text-sm text-gray-600">Evaluate and analyze the current state based on the selected knowledge base files</div>
                  </div>
                </label>
                <label className="flex items-start gap-2 p-2 cursor-pointer transition-colors">
                  <input type="checkbox" checked={assessmentType.includes("recommend")} onChange={() => handleAssessmentTypeChange("recommend")} className="w-4 h-4" />
                  <div className="flex-1">
                    <div className="text-gray-900 font-semibold">Recommend</div>
                    <div className="text-sm text-gray-600">Generate recommendations and action items based on the knowledge base</div>
                  </div>
                </label>
                <label className={`flex items-start gap-2 p-2 transition-colors ${isUnifiedDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input type="checkbox" checked={assessmentType.includes("unified")} onChange={() => handleAssessmentTypeChange("unified")} className="w-4 h-4" disabled={isUnifiedDisabled} />
                  <div className="flex-1">
                    <div className="text-gray-900 font-semibold">Unified Response (Combine all experts responses into a single response)</div>
                    <div className="text-sm text-gray-600">
                      {isUnifiedDisabled
                        ? 'Only one persona selected — unified is not applicable'
                        : 'This button combines the assessments and recommendations of all personas to a single unified response'}
                    </div>
                  </div>
                </label>
              </div>
              <div className="flex justify-between mt-6">
                <button className="px-6 py-2 border-2 border-gray-400 text-gray-700 rounded hover:bg-gray-50" onClick={() => setCurrentStep(1)}>← Back</button>
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => {
                    const isPersonaHex = ['Consumers', 'Luminaries', 'Colleagues', 'cultural'].includes(hexId);
                    if (isPersonaHex) { handleExecute(); } else { setCurrentStep(3); }
                  }}
                >
                  {['Consumers', 'Luminaries', 'Colleagues', 'cultural'].includes(hexId) ? 'Execute →' : 'Next: Provide Assessment →'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: Grade scale selection OR Assessment Input for other hexes */}
      {currentStep === 3 && hexId !== 'competitors' && (
        <div className="p-3">
          {hexId === 'Grade' ? (
            <>
              {gradeSubmitted ? (
                <div className="py-4 text-center">
                  <p className="text-green-700 font-semibold mb-1">Scoring request sent</p>
                  <p className="text-gray-500 text-sm mb-4">Results will appear below once the AI finishes scoring.</p>
                  <button
                    className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    onClick={() => {
                      setGradeSubmitted(false);
                      setCurrentStep(1);
                      setSelectedFiles([]);
                      setExcludedIdeas(new Set());
                      setManualIdeas([]);
                      setTestingScale('');
                      setIncludeZappiQuestions(false);
                    }}
                  >
                    Score Again
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-gray-900 leading-tight mb-1">
                    Step 3 of 3: Choose Scoring Scale
                  </h3>
                  <p className="text-gray-600 mb-3 text-sm">
                    Select how the AI should score {(includeZappiQuestions || includeZappiSet2) && effectiveSelectedIdeas.length === 0 ? 'each Zappi dimension' : 'each idea'} against each segment.
                  </p>

                  <div className="space-y-1 mb-4">
                    <label className="flex items-center gap-2 p-2 cursor-pointer transition-colors">
                      <input type="radio" name="testingScale" value="scale-1-5-written" checked={testingScale === "scale-1-5-written"} onChange={(e) => setTestingScale(e.target.value)} className="w-4 h-4" />
                      <div className="flex-1"><div className="text-gray-900 font-semibold">Scale of 1–5 with written assessments</div></div>
                    </label>
                    <label className="flex items-start gap-2 p-2 cursor-pointer transition-colors">
                      <input type="radio" name="testingScale" value="scale-1-5-no-written" checked={testingScale === "scale-1-5-no-written"} onChange={(e) => setTestingScale(e.target.value)} className="w-4 h-4" />
                      <div className="flex-1"><div className="text-gray-900 font-semibold">Scale of 1–5, scores only</div></div>
                    </label>
                    <label className="flex items-start gap-2 p-2 cursor-pointer transition-colors">
                      <input type="radio" name="testingScale" value="scale-1-10-written" checked={testingScale === "scale-1-10-written"} onChange={(e) => setTestingScale(e.target.value)} className="w-4 h-4" />
                      <div className="flex-1"><div className="text-gray-900 font-semibold">Scale of 1–10 with written assessments</div></div>
                    </label>
                    <label className="flex items-start gap-2 p-2 cursor-pointer transition-colors">
                      <input type="radio" name="testingScale" value="scale-1-10-no-written" checked={testingScale === "scale-1-10-no-written"} onChange={(e) => setTestingScale(e.target.value)} className="w-4 h-4" />
                      <div className="flex-1"><div className="text-gray-900 font-semibold">Scale of 1–10, scores only</div></div>
                    </label>
                    <label className="flex items-start gap-2 p-2 cursor-pointer transition-colors">
                      <input type="radio" name="testingScale" value="no-scale-written" checked={testingScale === "no-scale-written"} onChange={(e) => setTestingScale(e.target.value)} className="w-4 h-4" />
                      <div className="flex-1"><div className="text-gray-900 font-semibold">Written assessments only, no numeric score</div></div>
                    </label>
                  </div>
                  <div className="flex justify-between mt-2">
                    <button className="px-6 py-2 border-2 border-gray-400 text-gray-700 rounded hover:bg-gray-50" onClick={() => setCurrentStep(2)}>← Back</button>
                    <button
                      className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      onClick={handleExecute}
                      disabled={!canExecute}
                    >
                      Run Scoring →
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
          <>
          <h3 className="text-gray-900 leading-tight">
            Step 3: Provide Your Assessment
          </h3>
          <p className="text-gray-600 mb-2">
            Enter your assessment or instructions for how to process these files.
          </p>

          <div className="mb-2">
            <label className="block text-gray-900 mb-1">
              Assessment / Instructions
            </label>
            <textarea
              className="w-full h-40 border-2 border-gray-300 bg-white rounded p-3 text-gray-700 resize-none focus:outline-none focus:border-blue-500"
              placeholder={`Enter your ${assessmentType.includes("assess") ? "assessment criteria" : assessmentType.includes("recommend") ? "recommendation requirements" : "assessment and recommendation instructions"}...`}
              value={assessment}
              onChange={(e) => setAssessment(e.target.value)}
            />
            <div className="text-sm text-gray-500 mt-1">
              {assessment.length} characters
            </div>
          </div>

          {hexId !== 'competitors' && (
            <div className="p-2 mb-2 border-2 border-blue-500">
              <h4 className="text-gray-900 font-semibold mb-2">
                Execution Summary
              </h4>
              <div className="text-sm text-gray-700 space-y-1">
                <div>
                  <strong>Files:</strong> {selectedFiles.length} selected
                </div>
                <div>
                  <strong>Type:</strong>{" "}
                  {assessmentType.map(type => 
                    type === 'assess' ? 'Assess' : 
                    type === 'recommend' ? 'Recommend' : 
                    'Unified'
                  ).join(', ')}
                </div>
                {databricksInstructions && (
                  <div className="mt-2 pt-2 border-t border-blue-400">
                    <strong>Databricks Instructions:</strong>
                    <div className="mt-1 text-xs italic">
                      {databricksInstructions}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-3">
            {hexId !== 'competitors' && (
              <button
                className="px-6 py-2 border-2 border-gray-400 text-gray-700 rounded hover:bg-gray-50"
                onClick={() => setCurrentStep(2)}
              >
                ← Back
              </button>
            )}
            <button
              className={`px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${hexId === 'competitors' ? 'w-full justify-center' : ''}`}
              onClick={handleExecute}
              disabled={!canExecute}
            >
              <PlayCircle className="w-5 h-5" />
              Execute Process
            </button>
          </div>
          </>
          )}
        </div>
      )}

      {/* Send Recommendations to Knowledge base */}
      <div className="p-3 border-t-2 border-gray-300 mt-4">
        {/* Add Direction / Focus */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer" onClick={() => setShowDirectionModal(true)}>
            <input
              type="checkbox"
              checked={iterationDirections.length > 0}
              onChange={() => setShowDirectionModal(true)}
              className="w-4 h-4 accent-purple-600"
              readOnly
            />
            <span className="text-gray-900">Add insight, focus or direction to remaining prompts</span>
          </label>
          {iterationDirections.length > 0 && (
            <div className="mt-2 ml-6 space-y-1">
              {iterationDirections.map((d, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-purple-800 bg-purple-50 border border-purple-200 rounded px-2 py-1">
                  <span className="mt-0.5">→</span>
                  <span className="flex-1">{d.length > 80 ? d.substring(0, 80) + '…' : d}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={sendToKnowledgeBase}
            onChange={(e) => setSendToKnowledgeBase(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-gray-900">
            Send Recommendations to Knowledge Base
          </span>
        </label>
        
        {sendToKnowledgeBase && (
          <div className="space-y-2 ml-7">
            <textarea
              className="w-full h-24 border-2 border-gray-300 bg-white rounded p-2 text-gray-700 resize-none focus:outline-none focus:border-blue-500"
              placeholder="Enter your recommendations for the knowledge base..."
              value={recommendationText}
              onChange={(e) => setRecommendationText(e.target.value)}
            />
            <button
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!recommendationText.trim()}
              onClick={() => {
                if (recommendationText.trim()) {
                  if (onSaveRecommendation) {
                    onSaveRecommendation(recommendationText, hexId);
                  }
                  alert('Recommendation saved to Knowledge base!');
                  setRecommendationText('');
                  setSendToKnowledgeBase(false);
                }
              }}
            >
              Save to Knowledge base
            </button>
          </div>
        )}

        {/* Report Suggestions or Bugs */}
        <label className="flex items-center gap-2 cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={showBugReport}
            onChange={(e) => { setShowBugReport(e.target.checked); setBugReportText(''); }}
            className="w-4 h-4"
          />
          <span className="text-gray-900">Report Suggestions or Bugs</span>
        </label>
        {showBugReport && (
          <div className="space-y-2 ml-7 mt-2">
            <textarea
              className="w-full h-24 border-2 border-gray-300 bg-white rounded p-2 text-sm text-gray-700 resize-none focus:outline-none focus:border-purple-400"
              placeholder="Share your suggestions or found bugs here:"
              value={bugReportText}
              onChange={(e) => setBugReportText(e.target.value)}
            />
            <button
              className="px-4 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!bugReportText.trim() || bugReportSending}
              onClick={async () => {
                if (!bugReportText.trim()) return;
                setBugReportSending(true);
                try {
                  await fetch('/api/feedback/report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      message: bugReportText.trim(),
                      userEmail,
                      hexId,
                      hexLabel,
                      brand: userBrand,
                      projectType,
                      userRole,
                    }),
                  });
                } catch (_) {}
                setBugReportText('');
                setShowBugReport(false);
                setBugReportSending(false);
              }}
            >
              Send
            </button>
          </div>
        )}

        {/* Gem / Check / Coal legend */}
        <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
          <div className="flex items-center gap-2">
            <img src={gemIcon} alt="CoHive gem icon" className="w-7 h-7 flex-shrink-0" />
            <span className="text-gray-900">Highlight elements you like</span>
          </div>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" className="w-7 h-7 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="chkBg" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#0F766E" />
                  <stop offset="50%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#DC2626" />
                </linearGradient>
                <radialGradient id="chkGold" cx="50%" cy="50%" r="30%">
                  <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
                </radialGradient>
              </defs>
              <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="url(#chkBg)" />
              <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="url(#chkGold)" />
              <path d="M9 16.5l5 5 9.5-10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="text-gray-900">Track elements of interest</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-7 flex items-center justify-center"><CoalIcon size={22} /></span>
            <span className="text-gray-900">Flag elements you want to avoid</span>
          </div>
        </div>
      </div>

      {/* Prior Persona Re-use Modal */}
      {showPriorPersonaModal && (
        <div className="fixed inset-y-0 left-0 z-50 flex items-center justify-center bg-black/40" style={{ right: 'var(--modal-r)', padding: 'var(--modal-p)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-gray-900 font-semibold text-base">Previous results available</h3>
              <p className="text-gray-500 text-sm mt-0.5">
                {previousExecutions.length > 0 && crossHexExecutions.length > 0
                  ? `You have ${previousExecutions.length} run${previousExecutions.length !== 1 ? 's' : ''} in this hex plus results from other hexes (stories, personas).`
                  : previousExecutions.length > 0
                  ? `You have ${previousExecutions.length} prior run${previousExecutions.length !== 1 ? 's' : ''} in this hex.`
                  : 'You have prior results from other hexes (stories or personas).'
                }{' '}How would you like to proceed?
              </p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <button
                onClick={() => {
                  setShowPriorPersonaModal(false);
                  const allPrior = [...previousExecutions, ...crossHexExecutions];
                  const priorPersonaNames = allPrior.flatMap(ex => (ex.selectedFiles || [])).filter((v, i, a) => a.indexOf(v) === i);
                  const augmented = pendingExecuteAssessment + (priorPersonaNames.length > 0 ? `

[PRIOR_PERSONAS: ${priorPersonaNames.join(', ')}]` : '');
                  onExecute(pendingExecuteFiles, pendingExecuteType, augmented);
                  setPendingExecuteFiles([]); setPendingExecuteType([]); setPendingExecuteAssessment('');
                  setCurrentStep(hexId === 'competitors' ? 3 : 1); setSelectedFiles([]); setAssessmentType(['recommend']); setAssessment('');
                }}
                className="w-full text-left px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all"
              >
                <div className="font-medium text-gray-900 text-sm">Include previous results in this run</div>
                <div className="text-gray-500 text-xs mt-0.5">Stories and prior persona results join this session and can inform or challenge the discussion</div>
              </button>
              <button
                onClick={() => {
                  setShowPriorPersonaModal(false);
                  const allPriorForSummary = [...previousExecutions, ...crossHexExecutions];
                  const summaryLines = allPriorForSummary.map((ex, i) => { const preview = (ex.assessment || '').substring(0, 200).replace(/\n/g, ' '); return `Run ${i + 1}: ${preview}${preview.length === 200 ? '...' : ''}`; });
                  const summaryBlock = `\n\n[PRIOR_SUMMARY:\n${summaryLines.join('\n')}\n]`;
                  onExecute(pendingExecuteFiles, pendingExecuteType, pendingExecuteAssessment + summaryBlock);
                  setPendingExecuteFiles([]); setPendingExecuteType([]); setPendingExecuteAssessment('');
                  setCurrentStep(hexId === 'competitors' ? 3 : 1); setSelectedFiles([]); setAssessmentType(['recommend']); setAssessment('');
                }}
                className="w-full text-left px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                <div className="font-medium text-gray-900 text-sm">Include summary of previous results only</div>
                <div className="text-gray-500 text-xs mt-0.5">A brief summary of prior rounds is shared as context — not the full personas</div>
              </button>
              <button
                onClick={() => {
                  setShowPriorPersonaModal(false);
                  onExecute(pendingExecuteFiles, pendingExecuteType, pendingExecuteAssessment);
                  setPendingExecuteFiles([]); setPendingExecuteType([]); setPendingExecuteAssessment('');
                  setCurrentStep(hexId === 'competitors' ? 3 : 1); setSelectedFiles([]); setAssessmentType(['recommend']); setAssessment('');
                }}
                className="w-full text-left px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all"
              >
                <div className="font-medium text-gray-900 text-sm">Start fresh — don't include previous results</div>
                <div className="text-gray-500 text-xs mt-0.5">Run this session independently with no context from prior runs</div>
              </button>
            </div>
            <div className="px-6 py-3 border-t border-gray-100">
              <button onClick={() => setShowPriorPersonaModal(false)} className="w-full text-center text-sm text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Direction Modal */}
      {showDirectionModal && (
        <div className="fixed inset-y-0 left-0 z-50 flex items-center justify-center bg-black/40" style={{ right: 'var(--modal-r)', padding: 'var(--modal-p)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-gray-900 font-semibold text-base">Add insight, focus or direction</h3>
              <p className="text-gray-500 text-sm mt-1">
                What additional insight, focus or direction would you like to add to the remaining prompts in this iteration?
              </p>
            </div>
            <div className="px-6 py-4">
              <textarea
                autoFocus
                className="w-full h-32 border-2 border-gray-300 bg-white rounded-lg p-3 text-gray-800 text-sm resize-none focus:outline-none focus:border-purple-500 leading-relaxed"
                placeholder="e.g. Focus on the 18–24 age group. Lean into the sustainability angle. Keep recommendations budget-conscious for Q1."
                value={directionText}
                onChange={e => setDirectionText(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-2">This will be added to all remaining hex prompts in this iteration.</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => { setShowDirectionModal(false); setDirectionText(''); }}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (directionText.trim() && onAddIterationDirection) {
                    onAddIterationDirection(directionText.trim());
                  }
                  setShowDirectionModal(false);
                  setDirectionText('');
                }}
                disabled={!directionText.trim()}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
              >
                Add to prompts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}