import { useState } from "react";
import {
  CheckCircle,
  PlayCircle,
  FileText,
  ChevronRight,
} from "lucide-react";
import gemIcon from "figma:asset/53dc6cf554f69e479cfbd60a46741f158d11dd21.png";
import { getPersonasForHex, type PersonaLevel1, type PersonaLevel2, type PersonaLevel3 } from "../data/personas";
import { isBrandInCategory } from "../data/brandCategoryMapping";

interface ResearchFile {
  id: string;
  brand: string;
  projectType: string;
  fileName: string;
  isApproved: boolean;
  uploadDate: number;
  fileType: string;
  scope?: 'general' | 'category' | 'brand'; // Add scope info
}

interface HexExecution {
  id: string;
  selectedFiles: string[];
  assessmentType: string[]; // Changed to array to support multiple selections
  assessment: string;
  timestamp: number;
}

interface CentralHexViewProps {
  hexId: string;
  hexLabel: string;
  researchFiles: ResearchFile[];
  onExecute: (
    selectedFiles: string[],
    assessmentType: string[], // Changed to array
    assessment: string,
  ) => void;
  databricksInstructions?: string;
  previousExecutions: HexExecution[];
  onSaveRecommendation?: (recommendation: string, hexId: string) => void;
  projectType?: string;
  userBrand?: string; // Add user's brand
}

export function CentralHexView({
  hexId,
  hexLabel,
  researchFiles,
  onExecute,
  databricksInstructions,
  previousExecutions,
  onSaveRecommendation,
  projectType,
  userBrand,
}: CentralHexViewProps) {
  // Set initial step based on hexId
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedFiles, setSelectedFiles] = useState<string[]>(
    [],
  );
  const [assessmentType, setAssessmentType] = useState<string[]>([
    "unified"
  ]); // Changed to array to support multiple selections
  const [testingScale, setTestingScale] = useState<string>("");
  const [assessment, setAssessment] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [sendToKnowledgeBase, setSendToKnowledgeBase] = useState(false);
  const [recommendationText, setRecommendationText] = useState("");
  const [showGemInput, setShowGemInput] = useState(false);
  const [gemText, setGemText] = useState("");

  // Competitors-specific state
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>("");
  const [competitorAnalysisType, setCompetitorAnalysisType] = useState<string>("");

  // Persona selection state for Consumers hex
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [selectedLevel1, setSelectedLevel1] = useState<string[]>([]);
  const [selectedLevel2, setSelectedLevel2] = useState<string[]>([]);

  // Get persona config for this hex
  const personaConfig = getPersonasForHex(hexId);

  // Filter research files relevant to this hex based on hierarchical scope
  // - General files: shown to ALL brands/categories
  // - Category files: shown to ALL brands in that category
  // - Brand files: shown only to that specific brand
  const relevantFiles = researchFiles.filter((file) => {
    if (!file.isApproved) return false;
    
    // Determine file scope from the brand/projectType fields
    // If brand is "General", it's a general scope file
    if (file.brand === 'General') {
      return true; // General files are available to everyone
    }
    
    // If we don't have user context, show all approved files
    if (!userBrand || !projectType) {
      return true;
    }
    
    // Check if this is a category-scoped file (brand field contains category name)
    // Category files should be shown if the user's category matches
    if (file.projectType && file.projectType !== 'Knowledge Base') {
      // This might be a category file - check if user's category matches
      const userCategory = projectType;
      
      // If file brand matches a category name and user is in that category, show it
      if (file.brand === userCategory || file.projectType === userCategory) {
        return true;
      }
    }
    
    // Check if this is a brand-scoped file
    // Brand files should only be shown if the user's brand matches
    if (file.brand && file.brand !== 'General') {
      // Check if user's brand matches the file's brand
      if (file.brand.toLowerCase() === userBrand.toLowerCase()) {
        return true;
      }
      
      // Also check if this brand file's category matches user's category
      // and if user's brand is in that category
      if (projectType && isBrandInCategory(userBrand, projectType)) {
        // User is in the right category, but brand doesn't match - don't show brand-specific files
        return false;
      }
    }
    
    // Default: don't show
    return false;
  });

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
      // Remove the type if it's already selected
      const newTypes = assessmentType.filter(t => t !== type);
      // Ensure at least one type is always selected
      if (newTypes.length > 0) {
        setAssessmentType(newTypes);
      }
    } else {
      // Add the type to the selection
      setAssessmentType([...assessmentType, type]);
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
      // Remove this level1 and all its children
      const newLevel1 = selectedLevel1.filter(id => id !== level1Id);
      setSelectedLevel1(newLevel1);
      
      // Also remove any level2 selections that belong to this level1
      const level1Option = personaConfig?.options.find(opt => opt.id === level1Id);
      if (level1Option?.subcategories) {
        const level2IdsToRemove = level1Option.subcategories.map(sub => sub.id);
        setSelectedLevel2(selectedLevel2.filter(id => !level2IdsToRemove.includes(id)));
        
        // Also remove personas that belong to those level2s
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
      // Remove this level2
      setSelectedLevel2(selectedLevel2.filter(id => id !== level2Id));
      
      // Also remove personas that belong to this level2
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
    
    // If level2 is selected, get roles from level2
    if (selectedLevel2.length > 0 && level1Option.subcategories) {
      const level2Option = level1Option.subcategories.find(opt => opt.id === selectedLevel2[0]);
      return level2Option?.roles;
    }
    
    // Otherwise, get roles directly from level1 (if available)
    return level1Option.roles;
  };

  const handleExecute = () => {
    // For competitors, only validate competitor selection and analysis type
    if (hexId === 'competitors') {
      // For War Games, only validate competitor selection
      if (projectType === 'War Games') {
        if (!selectedCompetitor) {
          alert("Please select a competitor");
          return;
        }
      } else {
        // For other project types, validate both
        if (!selectedCompetitor || !competitorAnalysisType) {
          alert("Please select a competitor and analysis type");
          return;
        }
      }
    } else {
      // Only files required — assessment text field no longer exists
      if (selectedFiles.length === 0) {
        alert("Please select at least one knowledge base file.");
        return;
      }
    }

    onExecute(selectedFiles, assessmentType, assessment);

    // Reset form so hex is ready for next execution
    setCurrentStep(1);
    setSelectedFiles([]);
    setAssessmentType(["unified"]);
    setAssessment("");

    // Reset competitors-specific fields
    if (hexId === 'competitors') {
      setSelectedCompetitor("");
      setCompetitorAnalysisType("");
    }
    // Note: no alert here — the AssessmentModal handles the response display
  };

  const canProceedToStep2 = selectedFiles.length > 0;
  const canExecute =
    hexId === 'competitors'
      ? (projectType === 'War Games'
          ? selectedCompetitor.length > 0
          : selectedCompetitor.length > 0 && competitorAnalysisType.length > 0)
      : canProceedToStep2 && assessmentType.length > 0;

  return (
    <div className="space-y-2">
      {/* Step Progress Indicator - Hidden for Competitors */}
      {hexId !== 'competitors' && !(hexId === 'Consumers' || hexId === 'Luminaries' || hexId === 'Colleagues' || hexId === 'cultural' || hexId === 'Grade') && (
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
                    if (step === 2 && canProceedToStep2) setCurrentStep(2);
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

      {/* Step Progress Indicator for Persona Hexes - Without History Button */}
      {(hexId === 'Consumers' || hexId === 'Luminaries' || hexId === 'Colleagues' || hexId === 'cultural' || hexId === 'Grade') && (
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
                    if (step === 2 && canProceedToStep2) setCurrentStep(2);
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
              <select
                className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                value={selectedCompetitor}
                onChange={(e) => setSelectedCompetitor(e.target.value)}
              >
                <option value="">Choose a competitor...</option>
                <option value="Puma">Puma</option>
                <option value="Under Armour">Under Armour</option>
                <option value="New Balance">New Balance</option>
                <option value="Lululemon">Lululemon</option>
                <option value="Reebok">Reebok</option>
              </select>
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

      {/* Step 1: File Selection */}
      {currentStep === 1 && (
        <div className="p-3"> {(hexId === 'Consumers' || hexId === 'Luminaries' || hexId === 'Colleagues' || hexId === 'cultural' || hexId === 'Grade') && personaConfig ? (
            // Persona Selection for Consumers, Luminaries, Colleagues, Cultural Voices, and Grade hexes
            <>
              <h3 className="text-gray-900 leading-tight mb-3">
                Step 1: Select {
                  hexId === 'Consumers' ? 'Consumer' : 
                  hexId === 'Luminaries' ? 'External Expert' : 
                  hexId === 'Colleagues' ? 'Internal Colleague' :
                  hexId === 'cultural' ? 'Cultural Voice' :
                  hexId === 'Grade' ? 'Target Segment' :
                  ''
                } {hexId === 'Grade' ? 'Segments' : 'Personas'} to use in this hex
              </h3>

              <div className="space-y-3 mb-3">
                {/* Level 1: Buyer Type - Checkboxes for Multiple Selection */}
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
                            {/* Select All button for Level 2 - Show only when Level 1 is checked and has subcategories */}
                            {selectedLevel1.includes(opt.id) && opt.subcategories && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // Select all Level 2 items under this Level 1
                                  const level2Ids = opt.subcategories!.map(sub => sub.id);
                                  const allSelected = level2Ids.every(id => selectedLevel2.includes(id));
                                  
                                  if (allSelected) {
                                    // Deselect all Level 2
                                    setSelectedLevel2(selectedLevel2.filter(id => !level2Ids.includes(id)));
                                    // Also deselect all personas under these level2s
                                    const personasToRemove: string[] = [];
                                    opt.subcategories!.forEach(sub => {
                                      if (sub.roles) {
                                        sub.roles.forEach(role => personasToRemove.push(role.id));
                                      }
                                    });
                                    setSelectedPersonas(selectedPersonas.filter(id => !personasToRemove.includes(id)));
                                  } else {
                                    // Select all Level 2 that aren't already selected
                                    const newLevel2 = [...selectedLevel2];
                                    level2Ids.forEach(id => {
                                      if (!newLevel2.includes(id)) {
                                        newLevel2.push(id);
                                      }
                                    });
                                    setSelectedLevel2(newLevel2);
                                    
                                    // Also select all Level 3 personas under these Level 2s
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

                        {/* Level 2: Purchase Context - Show only for THIS Level 1 if checked */}
                        {selectedLevel1.includes(opt.id) && opt.subcategories && (
                          <div className="ml-8 pl-6 border-l-2 border-blue-300 mt-1 mb-1 space-y-1">
                            {opt.subcategories.map((level2) => (
                              <div key={level2.id}>
                                <label
                                  className="flex items-start gap-2 p-1.5 cursor-pointer hover:bg-gray-50 rounded transition-colors"
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
                                    {/* Select All button for Level 3 - Show only when Level 2 is checked and has roles */}
                                    {selectedLevel2.includes(level2.id) && level2.roles && (
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          // Select all personas under this Level 2
                                          const personaIds = level2.roles!.map(role => role.id);
                                          const allSelected = personaIds.every(id => selectedPersonas.includes(id));
                                          
                                          if (allSelected) {
                                            // Deselect all
                                            setSelectedPersonas(selectedPersonas.filter(id => !personaIds.includes(id)));
                                          } else {
                                            // Select all that aren't already selected
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

                                {/* Level 3: Buyer Profile - Show only for THIS Level 2 if checked */}
                                {selectedLevel2.includes(level2.id) && level2.roles && (
                                  <div className="ml-8 pl-6 border-l-2 border-green-300 mt-1">{/* Changed from ml-6 pl-4 to ml-8 pl-6 */}
                                    <div className="space-y-0.5 max-h-64 overflow-y-auto">
                                      {level2.roles.map((level3) => (
                                        <label
                                          key={level3.id}
                                          className="flex items-center gap-2 p-1 cursor-pointer hover:bg-gray-50 rounded transition-all"
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

              {selectedPersonas.length > 0 && (
                <div className="mt-2 p-2 border-2 border-green-500 rounded">
                  <p className="text-green-800">
                    <strong>{selectedPersonas.length}</strong> persona(s) selected
                  </p>
                </div>
              )}

              <div className="flex justify-end mt-3">
                <button
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    // Store selected personas in selectedFiles for consistency with existing flow
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
              Next: Choose Assessment Type/Scale →
            </button>
          </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Assessment Type */}
      {currentStep === 2 && (
        <div className="p-3">
          {hexId === "Grade" ? (
            <>
              <h3 className="text-gray-900 leading-tight">
                Step 2: What grading scale should be used?
              </h3>
              <p className="text-gray-600 mb-2">
                Select the grading scale for segment evaluation.
              </p>

              <div className="space-y-1">
                <label
                  className="flex items-center gap-2 p-2 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="testingScale"
                    value="scale-1-5-written"
                    checked={testingScale === "scale-1-5-written"}
                    onChange={(e) => setTestingScale(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-gray-900 font-semibold">
                      Scale of 1-5 with written assessments
                    </div>
                  </div>
                </label>

                <label
                  className="flex items-start gap-2 p-2 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="testingScale"
                    value="scale-1-5-no-written"
                    checked={testingScale === "scale-1-5-no-written"}
                    onChange={(e) => setTestingScale(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-gray-900 font-semibold">
                      Scale of 1-5 with no written assessments
                    </div>
                  </div>
                </label>

                <label
                  className="flex items-start gap-2 p-2 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="testingScale"
                    value="scale-1-10-written"
                    checked={testingScale === "scale-1-10-written"}
                    onChange={(e) => setTestingScale(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-gray-900 font-semibold">
                      Scale of 1-10 written assessments
                    </div>
                  </div>
                </label>

                <label
                  className="flex items-start gap-2 p-2 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="testingScale"
                    value="scale-1-10-no-written"
                    checked={testingScale === "scale-1-10-no-written"}
                    onChange={(e) => setTestingScale(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-gray-900 font-semibold">
                      Scale of 1-10 no written assessments
                    </div>
                  </div>
                </label>

                <label
                  className="flex items-start gap-2 p-2 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="testingScale"
                    value="no-scale-written"
                    checked={testingScale === "no-scale-written"}
                    onChange={(e) => setTestingScale(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-gray-900 font-semibold">
                      No scale, just written assessments
                    </div>
                  </div>
                </label>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-gray-900 leading-tight">
                Step 2: Choose Assessment Type
              </h3>
              <p className="text-gray-600 mb-2">
                Select how you want to process the selected
                files.
              </p>

              <div className="space-y-1">
                <label
                  className="flex items-start gap-2 p-2 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={assessmentType.includes("assess")}
                    onChange={() => handleAssessmentTypeChange("assess")}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-gray-900 font-semibold">
                      Assess
                    </div>
                    <div className="text-sm text-gray-600">
                      Evaluate and analyze the current state
                      based on the selected knowledge base files
                    </div>
                  </div>
                </label>

                <label
                  className="flex items-start gap-2 p-2 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={assessmentType.includes("recommend")}
                    onChange={() => handleAssessmentTypeChange("recommend")}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-gray-900 font-semibold">
                      Recommend
                    </div>
                    <div className="text-sm text-gray-600">
                      Generate recommendations and action items
                      based on the knowledge base
                    </div>
                  </div>
                </label>

                <label
                  className="flex items-start gap-2 p-2 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={assessmentType.includes("unified")}
                    onChange={() => handleAssessmentTypeChange("unified")}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-gray-900 font-semibold">
                      Unified Response (Combine all experts responses into a single response)
                    </div>
                    <div className="text-sm text-gray-600">
                      This button combines the assessments and
                      recommendations of all personas to a
                      single unified response
                    </div>
                  </div>
                </label>
              </div>
            </>
          )}

          <div className="flex justify-between mt-6">
            <button
              className="px-6 py-2 border-2 border-gray-400 text-gray-700 rounded hover:bg-gray-50"
              onClick={() => setCurrentStep(1)}
            >
              ← Back
            </button>
            <button
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={handleExecute}
              disabled={!canExecute}
            >
              <PlayCircle className="w-5 h-5" />
              Execute Process
            </button>
          </div>
        </div>
      )}

      {/* Send Recommendations to Knowledge base */}
      <div className="p-3 border-t-2 border-gray-300 mt-4">
        {/* Gem Highlight Feature */}
        <div className="mb-4">
          <button
            className="flex items-center gap-2 text-yellow-600 hover:text-yellow-700 cursor-pointer mb-2"
            onClick={() => setShowGemInput(!showGemInput)}
          >
            <img src={gemIcon} alt="Sparkles" className="w-7 h-7" />
            <span className="text-gray-900">Highlight an element that you like</span>
          </button>
          
          {showGemInput && (
            <div className="space-y-2 ml-7">
              <textarea
                className="w-full h-24 border-2 border-gray-300 bg-white rounded p-2 text-gray-700 resize-none focus:outline-none focus:border-gray-400"
                placeholder="Enter the element you would like to highlight as a gem."
                value={gemText}
                onChange={(e) => setGemText(e.target.value)}
              />
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!gemText.trim()}
                onClick={() => {
                  if (gemText.trim()) {
                    // Load existing gems from localStorage
                    const existingGems = JSON.parse(localStorage.getItem('cohive_gems') || '[]');
                    const newGem = {
                      id: Date.now().toString(),
                      text: gemText,
                      hexId: hexId,
                      hexLabel: hexLabel,
                      timestamp: Date.now()
                    };
                    const updatedGems = [...existingGems, newGem];
                    localStorage.setItem('cohive_gems', JSON.stringify(updatedGems));
                    
                    alert('Gem saved successfully!');
                    setGemText('');
                    setShowGemInput(false);
                  }
                }}
              >
                Save Gem
              </button>
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
                  // TODO: Add to research/knowledge base recommendations
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
      </div>
    </div>
  );
}