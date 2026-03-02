import { Database, Cpu, GitBranch, BarChart3, Rocket, PlayCircle, Settings, FileText, Users, Globe, MessageSquare, TestTube, CheckCircle, Save, AlertCircle, User, Download, Upload, RotateCcw, Mic, Camera, Video, StopCircle, File } from 'lucide-react';
import { ProcessFlow, processSteps } from './ProcessFlow';
import { useState, useEffect } from 'react';
import React from 'react';
import { ResearchView } from './ResearchView';
import { TemplateManager, UserTemplate, defaultTemplates } from './TemplateManager';
import { ResearcherModes } from './ResearcherModes';
import { CentralHexView } from './CentralHexView';
import { ReviewView } from './ReviewView';
import { DatabricksOAuthLogin } from './DatabricksOAuthLogin';
import { DatabricksFileSaver } from './DatabricksFileSaver';
import { InterviewDialog } from './InterviewDialog';
import { AssessmentModal } from './AssessmentModal';
import cohiveLogo from 'figma:asset/88105c0c8621f3d41d65e5be3ae75558f9de1753.png';
import { uploadToKnowledgeBase, downloadFile, listKnowledgeBaseFiles, type KnowledgeBaseFile } from '../utils/databricksAPI';
import { isAuthenticated, getCurrentUserEmail, getValidSession } from '../utils/databricksAuth';
// Mock data import removed - using real data only
// import { exampleResearchFiles } from '../data/exampleResearchFiles';
import { stepContentData, type StepContent } from '../data/stepContentData';

interface StepResponses {
  [stepId: string]: {
    [questionIndex: number]: string;
  };
}

interface ProjectFile {
  brand: string;
  projectType: string;
  fileName: string;
  timestamp: number;
}

interface IdeasFile {
  brand: string;
  projectType: string;
  fileName: string;
  content: string; // Base64 encoded file content
  fileType: string; // MIME type
  uploadDate: number;
}

interface ResearchFile {
  id: string;
  brand: string;
  projectType: string;
  fileName: string;
  isApproved: boolean;
  uploadDate: number;
  fileType: string;
  content?: string; // Optional: actual file content from Databricks
  source?: string; // Optional: source path in Databricks
  scope?: 'general' | 'category' | 'brand'; // Optional: file scope for filtering
}

interface EditSuggestion {
  id: string;
  researchFileId: string;
  fileName: string;
  suggestedBy: string;
  suggestion: string;
  timestamp: number;
  status: 'pending' | 'reviewed' | 'implemented';
}

interface HexExecution {
  id: string;
  selectedFiles: string[];
  assessmentType: string[]; // Changed to array to support multiple selections
  assessment: string;
  timestamp: number;
}

interface HexExecutions {
  [hexId: string]: HexExecution[];
}


//Definitions for each hexagon - questions, steps, details
// NOTE: Step content now imported from /data/stepContentData.ts

export default function ProcessWireframe() {
  const [activeStepId, setActiveStepId] = useState<string>('Enter');
  const [responses, setResponses] = useState<StepResponses>({});
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = useState<string>('');
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [ideasFiles, setIdeasFiles] = useState<IdeasFile[]>([]);
  const [researchFiles, setResearchFiles] = useState<ResearchFile[]>([]);
  const [editSuggestions, setEditSuggestions] = useState<EditSuggestion[]>([]);
  const [hexExecutions, setHexExecutions] = useState<{ [hexId: string]: HexExecution[] }>({});
  const [showValidation, setShowValidation] = useState(false);
  const [selectedResearchFiles, setSelectedResearchFiles] = useState<string[]>([]);

  // Assessment Modal state
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [assessmentModalProps, setAssessmentModalProps] = useState<{
    hexId: string;
    hexLabel: string;
    assessmentType: string;
    selectedPersonas: string[];
    kbFileNames: string[];
    userSolution: string;
    ideasFile: { fileName: string; content: string; fileType: string } | null;
  } | null>(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [userRole, setUserRole] = useState<'administrator' | 'research-analyst' | 'research-leader' | 'marketing-manager' | 'product-manager' | 'executive-stakeholder'>('marketing-manager');
  const [currentTemplate, setCurrentTemplate] = useState<UserTemplate | null>(null);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableProjectTypes, setAvailableProjectTypes] = useState<string[]>([]);
  const [iterationSaved, setIterationSaved] = useState<boolean>(false);
  const [isDatabricksAuthenticated, setIsDatabricksAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showFileSaver, setShowFileSaver] = useState<boolean>(false);
  const [fileSaverData, setFileSaverData] = useState<{ fileName: string; content: string } | null>(null);
  const [userEmail, setUserEmail] = useState<string>('unknown@databricks.com');

  //Wisdom hex recording/capturing states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [captureMethod, setCaptureMethod] = useState<'upload' | 'capture' | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVoiceToText, setIsVoiceToText] = useState(false); // For voice-to-text in Text mode
  
  // Interview dialog state
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [interviewContext, setInterviewContext] = useState<{
    insightType: 'Brand' | 'Category' | 'General';
    brand?: string;
    projectType?: string;
  }>({ insightType: 'General' });
  
  // Wisdom success message state
  const [wisdomSuccessMessage, setWisdomSuccessMessage] = useState<string | null>(null);
  
  // Audio/Video preview state
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  
  // Browser environment check (for SSR compatibility)
  const isBrowser = typeof window !== 'undefined';
  const hasMediaDevices = isBrowser && typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;

  // Helper function to generate default filename
  const generateDefaultFileName = (brand: string, projectType: string, creationDate?: number, editDate?: number) => {
    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    };
    
    const cleanName = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '');
    
    const brandPart = cleanName(brand) || 'Brand';
    const projectTypePart = cleanName(projectType) || 'ProjectType';
    const creationPart = formatDate(creationDate || Date.now());
    const editPart = editDate ? `_${formatDate(editDate)}` : '';
    
    return `${brandPart}_${projectTypePart}_${creationPart}${editPart}`;
  };

  // Helper to create a File-like object (File constructor not available in this environment)
  const createFileFromBlob = (blob: Blob, fileName: string): File => {
    // Cast the Blob as File and add the name and size properties
    const file = blob as any;
    file.name = fileName;
    file.lastModified = Date.now();
    return file as File;
  };

  // Load responses from localStorage on mount
  useEffect(() => {
    const savedResponses = localStorage.getItem('cohive_responses');
    if (savedResponses) {
      try {
        setResponses(JSON.parse(savedResponses));
      } catch (e) {
        console.error('Failed to load saved responses', e);
      }
    }

    // Load iteration saved flag
    const savedIterationFlag = localStorage.getItem('cohive_iteration_saved');
    if (savedIterationFlag) {
      setIterationSaved(savedIterationFlag === 'true');
    }

    // Load templates or initialize with defaults
    const savedTemplates = localStorage.getItem('cohive_templates');
    if (savedTemplates) {
      try {
        const templates = JSON.parse(savedTemplates);
        setTemplates(templates);
      } catch (e) {
        console.error('Failed to load saved templates', e);
        // Initialize with default templates
        setTemplates(defaultTemplates);
        localStorage.setItem('cohive_templates', JSON.stringify(defaultTemplates));
      }
    } else {
      // Initialize with default templates
      setTemplates(defaultTemplates);
      localStorage.setItem('cohive_templates', JSON.stringify(defaultTemplates));
    }

    // Load current template selection or set default
    const savedCurrentTemplateId = localStorage.getItem('cohive_current_template_id');
    if (savedCurrentTemplateId) {
      try {
        setCurrentTemplateId(savedCurrentTemplateId);
      } catch (e) {
        console.error('Failed to load current template', e);
        // Set default template
        setCurrentTemplateId('admin');
        localStorage.setItem('cohive_current_template_id', 'admin');
      }
    } else {
      // Set default template
      setCurrentTemplateId('admin');
      localStorage.setItem('cohive_current_template_id', 'admin');
    }

    // Load project files
    const savedProjects = localStorage.getItem('cohive_projects');
    if (savedProjects) {
      try {
        setProjectFiles(JSON.parse(savedProjects));
      } catch (e) {
        console.error('Failed to load saved projects', e);
      }
    }

    // Load ideas files
    const savedIdeasFiles = localStorage.getItem('cohive_ideas_files');
    if (savedIdeasFiles) {
      try {
        setIdeasFiles(JSON.parse(savedIdeasFiles));
      } catch (e) {
        console.error('Failed to load saved ideas files', e);
      }
    }

    // Load research files from localStorage initially for offline access
    // Note: These will be refreshed from Databricks after authentication
    const savedResearch = localStorage.getItem('cohive_research_files');
    if (savedResearch) {
      try {
        setResearchFiles(JSON.parse(savedResearch));
        console.log('📂 Loaded cached research files from localStorage');
      } catch (e) {
        console.error('Failed to load saved research files', e);
      }
    }

    // Load edit suggestions
    const savedSuggestions = localStorage.getItem('cohive_edit_suggestions');
    if (savedSuggestions) {
      try {
        setEditSuggestions(JSON.parse(savedSuggestions));
      } catch (e) {
        console.error('Failed to load saved edit suggestions', e);
      }
    }

    // Load hex executions
    const savedHexExecutions = localStorage.getItem('cohive_hex_executions');
    if (savedHexExecutions) {
      try {
        setHexExecutions(JSON.parse(savedHexExecutions));
      } catch (e) {
        console.error('Failed to load saved hex executions', e);
      }
    }

    const savedSelectedResearchFiles = localStorage.getItem('cohive_selected_research_files');
    if (savedSelectedResearchFiles) {
      try {
        setSelectedResearchFiles(JSON.parse(savedSelectedResearchFiles));
      } catch (e) {
        console.error('Failed to load selected research files', e);
      }
    }

    // Load available brands and project types
    const savedBrands = localStorage.getItem('cohive_available_brands');
    const savedProjectTypes = localStorage.getItem('cohive_available_project_types');
    const projectTypesVersion = localStorage.getItem('cohive_project_types_version');
    
    // Version 3: Added War Games
    const CURRENT_VERSION = '3';
    
    if (savedBrands) {
      try {
        setAvailableBrands(JSON.parse(savedBrands));
      } catch (e) {
        console.error('Failed to load saved brands', e);
        setAvailableBrands(['Nike', 'Adidas']);
        localStorage.setItem('cohive_available_brands', JSON.stringify(['Nike', 'Adidas']));
      }
    } else {
      setAvailableBrands(['Nike', 'Adidas']);
      localStorage.setItem('cohive_available_brands', JSON.stringify(['Nike', 'Adidas']));
    }
    
    // Force update if version doesn't match or doesn't exist
    if (projectTypesVersion !== CURRENT_VERSION) {
      setAvailableProjectTypes(['Creative Messaging', 'Packaging', 'Product Launch', 'War Games']);
      localStorage.setItem('cohive_available_project_types', JSON.stringify(['Creative Messaging', 'Packaging', 'Product Launch', 'War Games']));
      localStorage.setItem('cohive_project_types_version', CURRENT_VERSION);
    } else if (savedProjectTypes) {
      try {
        setAvailableProjectTypes(JSON.parse(savedProjectTypes));
      } catch (e) {
        console.error('Failed to load saved project types', e);
        setAvailableProjectTypes(['Creative Messaging', 'Packaging', 'Product Launch', 'War Games']);
        localStorage.setItem('cohive_available_project_types', JSON.stringify(['Creative Messaging', 'Packaging', 'Product Launch', 'War Games']));
        localStorage.setItem('cohive_project_types_version', CURRENT_VERSION);
      }
    } else {
      setAvailableProjectTypes(['Creative Messaging', 'Packaging', 'Product Launch', 'War Games']);
      localStorage.setItem('cohive_available_project_types', JSON.stringify(['Creative Messaging', 'Packaging', 'Product Launch', 'War Games']));
      localStorage.setItem('cohive_project_types_version', CURRENT_VERSION);
    }
  }, []);

  // Save responses to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(responses).length > 0) {
      localStorage.setItem('cohive_responses', JSON.stringify(responses));
      setShowSaveNotification(true);
      const timer = setTimeout(() => setShowSaveNotification(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [responses]);

  // Sync currentTemplate when currentTemplateId or templates change
  useEffect(() => {
    if (currentTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === currentTemplateId);
      setCurrentTemplate(template || null);
      if (template) {
        setUserRole(template.role);
      }
    }
  }, [currentTemplateId, templates]);

  // Check Databricks authentication on mount and handle OAuth callback
  useEffect(() => {
    const checkAuthAndHandleCallback = async () => {
      setIsCheckingAuth(true);
      
      try {
        // Check if we're coming back from OAuth (URL has code and state params)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        if (code && state) {
          // OAuth callback is now handled by /oauth/callback route
          // This should not happen here anymore, but just in case:
          console.log('OAuth params detected in ProcessWireframe - redirecting to /oauth/callback');
          window.location.href = '/oauth/callback' + window.location.search;
          return;
        }
        
        // Normal auth check (no OAuth callback)
        const authenticated = isAuthenticated();
        console.log('Standard auth check on mount:', authenticated);
        setIsDatabricksAuthenticated(authenticated);
        
        // Restore the step we should be on if returning from OAuth
        const returnStep = sessionStorage.getItem('oauth_return_step');
        if (returnStep && authenticated) {
          setActiveStepId(returnStep);
          sessionStorage.removeItem('oauth_return_step');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsDatabricksAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuthAndHandleCallback();
  }, []);

  // Fetch user email after authentication
  useEffect(() => {
    const fetchUserEmail = async () => {
      if (isDatabricksAuthenticated) {
        try {
          const email = await getCurrentUserEmail();
          setUserEmail(email);
          console.log('✅ User email fetched:', email);
        } catch (error) {
          console.error('Failed to fetch user email:', error);
          setUserEmail('unknown@databricks.com');
        }
      }
    };
    
    fetchUserEmail();
  }, [isDatabricksAuthenticated]);

  // Load research files from Databricks after authentication
  useEffect(() => {
    const loadResearchFilesFromDatabricks = async () => {
      if (isDatabricksAuthenticated && !isCheckingAuth) {
        console.log('🔄 Loading research files from Databricks...');
        await loadKnowledgeBaseFiles();
      }
    };
    
    loadResearchFilesFromDatabricks();
  }, [isDatabricksAuthenticated, isCheckingAuth, currentTemplate]);

  // Helper function to get existing files for a brand/project type
  const getExistingFiles = (brand: string, projectType: string): ProjectFile[] => {
    if (!brand || !projectType) return [];
    return projectFiles.filter(
      file => file.brand.toLowerCase() === brand.toLowerCase() && 
              file.projectType.toLowerCase() === projectType.toLowerCase()
    );
  };

  // Helper function to get ideas file for a brand/project type
  const getIdeasFile = (brand: string, projectType: string): IdeasFile | null => {
    if (!brand || !projectType) return null;
    const file = ideasFiles.find(
      f => f.brand.toLowerCase() === brand.toLowerCase() && 
           f.projectType.toLowerCase() === projectType.toLowerCase()
    );
    return file || null;
  };

  // Helper function to increment filename version if it already exists
  const getUniqueFileName = (fileName: string, brand: string, projectType: string): string => {
    // Check if the filename already exists in projectFiles
    const existingFiles = projectFiles.filter(
      file => file.brand.toLowerCase() === brand.toLowerCase() && 
              file.projectType.toLowerCase() === projectType.toLowerCase()
    );
    
    // Extract base name and current version
    const versionMatch = fileName.match(/^(.+?)_[vV](\d+)$/);
    
    if (versionMatch) {
      // File has version pattern like "name_v1" or "name_V1"
      const baseName = versionMatch[1];
      let currentVersion = parseInt(versionMatch[2], 10);
      
      // Find the highest version for this base name
      let highestVersion = currentVersion;
      existingFiles.forEach(file => {
        const fileVersionMatch = file.fileName.match(/^(.+?)_[vV](\d+)$/);
        if (fileVersionMatch && fileVersionMatch[1] === baseName) {
          const version = parseInt(fileVersionMatch[2], 10);
          if (version > highestVersion) {
            highestVersion = version;
          }
        }
      });
      
      // If current version doesn't exist, return it; otherwise increment
      const fileExists = existingFiles.some(file => file.fileName === fileName);
      if (!fileExists) {
        return fileName;
      }
      
      // Return incremented version
      return `${baseName}_v${highestVersion + 1}`;
    } else {
      // File doesn't have version pattern - start with v1
      const baseV1 = `${fileName}_v1`;
      
      // Check if v1 already exists
      if (existingFiles.some(file => file.fileName === baseV1)) {
        // Find highest version
        let highestVersion = 1;
        existingFiles.forEach(file => {
          const fileVersionMatch = file.fileName.match(/^(.+?)_[vV](\d+)$/);
          if (fileVersionMatch && fileVersionMatch[1] === fileName) {
            const version = parseInt(fileVersionMatch[2], 10);
            if (version > highestVersion) {
              highestVersion = version;
            }
          }
        });
        return `${fileName}_v${highestVersion + 1}`;
      } else {
        // Return with _v1 appended
        return baseV1;
      }
    }
  };

  // Helper function to get approved research files for a brand/project type
  const getApprovedResearchFiles = (brand: string, projectType: string): ResearchFile[] => {
    if (!brand || !projectType) return [];
    return researchFiles.filter(
      file => file.brand.toLowerCase() === brand.toLowerCase() && 
              file.projectType.toLowerCase() === projectType.toLowerCase() &&
              file.isApproved === true
    );
  };

  // Helper function to generate summary filename (removes version, adds _sum)
  const getSummaryFileName = (fileName: string): string => {
    // Remove version suffix (_v1, _v2, etc.) if present
    const versionMatch = fileName.match(/^(.+?)_[vV]\d+$/);
    const baseName = versionMatch ? versionMatch[1] : fileName;
    return `${baseName}_sum`;
  };

  // Get dynamic questions for Enter step
  const getEnterQuestions = (): string[] => {
    const baseQuestions = ['Brand', 'Project Type'];
    const brand = responses['Enter']?.[0]?.trim();
    const projectType = responses['Enter']?.[1]?.trim();

    if (brand && projectType) {
      baseQuestions.push('Filename for this iteration');
    }

    // Add Ideas question after file selection is complete (skip for War Games)
    const lastQuestionIndex = baseQuestions.length - 1;
    if (lastQuestionIndex >= 2 && responses['Enter']?.[lastQuestionIndex]?.trim()) {
      // For War Games, skip Ideas Source and always show Research Files
      if (projectType === 'War Games') {
        baseQuestions.push('Research Files');
      } else {
        // For all other project types, show Ideas Source first
        baseQuestions.push('Ideas Source');
        
        // Add research files question after Ideas Source is complete
        const ideasSourceIdx = baseQuestions.indexOf('Ideas Source');
        if (ideasSourceIdx !== -1) {
          const ideasChoice = responses['Enter']?.[ideasSourceIdx];
          // For "Load Current Ideas", need to check if file was uploaded
          // For "Get Inspired", can proceed immediately
          const ideasComplete = ideasChoice === 'Get Inspired' || 
                               (ideasChoice === 'Load Current Ideas' && responses['Enter']?.[ideasSourceIdx + 1]?.trim());
          
          if (ideasComplete && brand && projectType) {
            baseQuestions.push('Research Files');
          }
        }
      }
    }

    return baseQuestions;
  };

  // Auto-fill filename when Brand and Project Type are selected
  useEffect(() => {
    if (activeStepId === 'Enter') {
      const brand = responses['Enter']?.[0]?.trim();
      const projectType = responses['Enter']?.[1]?.trim();
      
      if (brand && projectType) {
        const existingFiles = getExistingFiles(brand, projectType);
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        
        // Find the highest version number for this brand/projectType/date combination
        let highestVersion = 0;
        const basePattern = `CoHive_${brand}_${projectType}_${dateStr}_V`;
        
        projectFiles.forEach(file => {
          if (file.fileName.startsWith(basePattern)) {
            const versionMatch = file.fileName.match(/_V(\d+)$/);
            if (versionMatch) {
              const version = parseInt(versionMatch[1], 10);
              if (version > highestVersion) {
                highestVersion = version;
              }
            }
          }
        });
        
        // Increment to next version
        const nextVersion = highestVersion + 1;
        const suggestedFilename = `CoHive_${brand}_${projectType}_${dateStr}_V${nextVersion}`;
        
        // Auto-fill if no existing files and field is empty
        if (existingFiles.length === 0 && !responses['Enter']?.[2]) {
          setResponses(prev => ({
            ...prev,
            Enter: {
              ...prev.Enter,
              2: suggestedFilename
            }
          }));
        }
        
        // Update filename if brand/projectType changed and user chose "New"
        if (existingFiles.length > 0) {
          const projectChoice = responses['Enter']?.[2]?.trim();
          if (projectChoice === 'New') {
            // Check if filename exists at index 3
            const currentFilename = responses['Enter']?.[3];
            // Only update if filename doesn't match current brand/projectType pattern
            if (currentFilename && !currentFilename.includes(`${brand}_${projectType}`)) {
              setResponses(prev => ({
                ...prev,
                Enter: {
                  ...prev.Enter,
                  3: suggestedFilename
                }
              }));
            } else if (!currentFilename) {
              // Auto-fill if empty
              setResponses(prev => ({
                ...prev,
                Enter: {
                  ...prev.Enter,
                  3: suggestedFilename
                }
              }));
            }
          }
        }
      }
    }
  }, [activeStepId, responses['Enter']?.[0], responses['Enter']?.[1], responses['Enter']?.[2], projectFiles]);

  const currentContent = activeStepId === 'Enter' 
    ? { ...stepContentData[0], questions: getEnterQuestions() }
    : stepContentData.find(s => s.id === activeStepId) || stepContentData[0];
  
  const currentStepIndex = processSteps.findIndex(s => s.id === activeStepId);

  const handleResponseChange = (questionIndex: number, value: string) => {
    setResponses(prev => ({
      ...prev,
      [activeStepId]: {
        ...prev[activeStepId],
        [questionIndex]: value
      }
    }));
    setShowValidation(false);
    
    // If user changes Brand or Project Type in Enter hex, clear selected research files
    if (activeStepId === 'Enter' && (questionIndex === 0 || questionIndex === 1)) {
      setSelectedResearchFiles([]);
    }
    
    // If user is filling out Enter, mark iteration as not saved (in progress)
    if (activeStepId === 'Enter' && iterationSaved) {
      setIterationSaved(false);
      localStorage.setItem('cohive_iteration_saved', 'false');
    }
  };

  const isStepComplete = (stepId: string): boolean => {
    if (stepId === 'Enter') {
      // For Enter step, check the dynamic questions
      const EnterQuestions = getEnterQuestions();
      const stepResponses = responses[stepId];
      if (!stepResponses) return false;

      // Brand and Project Type must be selected (questions 0 and 1)
      if (!stepResponses[0]?.trim() || !stepResponses[1]?.trim()) return false;

      const brand = stepResponses[0]?.trim();
      const projectType = stepResponses[1]?.trim();
      const existingFiles = brand && projectType ? getExistingFiles(brand, projectType) : [];

      // Check if New/Existing question exists and is answered (question 2)
      if (existingFiles.length > 0) {
        const projectChoice = stepResponses[2];
        if (!projectChoice?.trim()) return false;

        // If "New" is selected, check Filename (question 3)
        if (projectChoice === 'New') {
          if (!stepResponses[3]?.trim()) return false;
        }
        // If "Existing" is selected, check that a file is selected (question 3)
        else if (projectChoice === 'Existing') {
          if (!stepResponses[3]?.trim()) return false;
        }
      } else {
        // No existing files, so Filename must be filled (question 2)
        if (!stepResponses[2]?.trim()) return false;
      }

      // Find Ideas Source question index in the current responses
      const ideasSourceIdx = EnterQuestions.indexOf('Ideas Source');
      if (ideasSourceIdx !== -1) {
        const ideasChoice = stepResponses[ideasSourceIdx];
        if (!ideasChoice?.trim()) return false;

        // If "Load Current Ideas" is selected, ensure file is uploaded
        if (ideasChoice === 'Load Current Ideas') {
          const fileResponse = stepResponses[ideasSourceIdx + 1];
          if (!fileResponse?.trim()) return false;
        }
        // If "Get Inspired" is selected, no file needed - continue to check research files
      }

      // Check Research Files if they exist as a question
      const researchFilesIdx = EnterQuestions.indexOf('Research Files');
      if (researchFilesIdx !== -1) {
        // Research Files uses selectedResearchFiles state, but also stores in responses
        // Check if at least one file is selected (stored as comma-separated or checked elsewhere)
        if (selectedResearchFiles.length === 0) return false;
      }

      return true;
    }

    const content = stepContentData.find(s => s.id === stepId);
    if (!content) return false;
    
    const stepResponses = responses[stepId];
    if (!stepResponses) return false;

    // Check if all questions have non-empty responses
    return content.questions.every((_, idx) => {
      const response = stepResponses[idx];
      return response && response.trim().length > 0;
    });
  };

  const isCurrentStepComplete = isStepComplete(activeStepId);

  const getCompletedStepsCount = (): number => {
    return processSteps.filter(step => isStepComplete(step.id)).length;
  };

  const handleNext = () => {
    // Enter step requires validation, all other steps allow free navigation
    if (activeStepId === 'Enter' && !isCurrentStepComplete) {
      setShowValidation(true);
      return;
    }

    if (currentStepIndex < processSteps.length - 1) {
      setActiveStepId(processSteps[currentStepIndex + 1].id);
      setShowValidation(false);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setActiveStepId(processSteps[currentStepIndex - 1].id);
      setShowValidation(false);
    }
  };

  const getStepStatus = (stepId: string): 'completed' | 'active' | 'upcoming' => {
    if (stepId === activeStepId) return 'active';
    if (isStepComplete(stepId)) return 'completed';
    
    // New logic: No "upcoming" blocking after Enter is complete
    // Enter must be completed first
    if (stepId === 'Enter') {
      return 'upcoming'; // Enter is upcoming if not completed
    }
    
    // If Enter is complete, all hexagons are accessible
    if (isStepComplete('Enter')) {
      // Review is always accessible after Enter
      if (stepId === 'review') {
        return 'upcoming'; // Will be clickable
      }
      
      // Findings requires Enter + at least one other completed step
      if (stepId === 'Findings') {
        const otherCompletedSteps = processSteps.filter(
          step => step.id !== 'Enter' && step.id !== 'Findings' && step.id !== 'review' && isStepComplete(step.id)
        ).length;
        
        // If at least one other step is complete, Findings is accessible
        if (otherCompletedSteps >= 1) {
          return 'upcoming'; // Will be clickable but shows as not completed
        }
        return 'upcoming'; // Not yet accessible
      }
      
      // All other steps are accessible after Enter
      return 'upcoming'; // Will be clickable
    }
    
    // If Enter is not complete, everything else is blocked
    return 'upcoming';
  };

  // Handle adding edit suggestions
  const handleAddSuggestion = (fileId: string, suggestion: string) => {
    const file = researchFiles.find(f => f.id === fileId);
    if (!file) return;

    const newSuggestion: EditSuggestion = {
      id: Date.now().toString(),
      researchFileId: fileId,
      fileName: file.fileName,
      suggestedBy: 'Current User',  // In production, this would be the actual user name
      suggestion,
      timestamp: Date.now(),
      status: 'pending'
    };

    setEditSuggestions(prev => [...prev, newSuggestion]);
    localStorage.setItem('cohive_edit_suggestions', JSON.stringify([...editSuggestions, newSuggestion]));
  };

  // Handle updating suggestion status
  const handleUpdateSuggestionStatus = (suggestionId: string, status: 'pending' | 'reviewed' | 'implemented') => {
    setEditSuggestions(prev => 
      prev.map(s => s.id === suggestionId ? { ...s, status } : s)
    );
    const updated = editSuggestions.map(s => s.id === suggestionId ? { ...s, status } : s);
    localStorage.setItem('cohive_edit_suggestions', JSON.stringify(updated));
  };

  // Handle toggling file approval
  const handleToggleApproval = (fileId: string) => {
    setResearchFiles(prev =>
      prev.map(f => f.id === fileId ? { ...f, isApproved: !f.isApproved } : f)
    );
    const updated = researchFiles.map(f => f.id === fileId ? { ...f, isApproved: !f.isApproved } : f);
    localStorage.setItem('cohive_research_files', JSON.stringify(updated));
  };

  // Handle creating new research file
  const handleCreateResearchFile = (file: Omit<ResearchFile, 'id' | 'uploadDate'>) => {
    const newFile: ResearchFile = {
      ...file,
      id: Date.now().toString(),
      uploadDate: Date.now()
    };
    setResearchFiles(prev => [...prev, newFile]);
    localStorage.setItem('cohive_research_files', JSON.stringify([...researchFiles, newFile]));
  };

  // Handle updating existing research file
  const handleUpdateResearchFile = (fileId: string, content: string) => {
    const updated = researchFiles.map(f => f.id === fileId ? { ...f, content } : f);
    setResearchFiles(updated);
    localStorage.setItem('cohive_research_files', JSON.stringify(updated));
  };

  // Handle deleting project files
  const handleDeleteProjectFiles = (fileNames: string[]) => {
    const updatedFiles = projectFiles.filter(file => !fileNames.includes(file.fileName));
    setProjectFiles(updatedFiles);
    localStorage.setItem('cohive_projects', JSON.stringify(updatedFiles));
  };

  // Handle central hexagon execution
  const handleCentralHexExecute = (selectedFiles: string[], assessmentType: string[], assessment: string) => {
    const brand = responses['Enter']?.[0]?.trim() || '';
    const projectType = responses['Enter']?.[1]?.trim() || '';

    // Store execution data locally (marks step complete)
    const executionData: HexExecution = {
      id: Date.now().toString(),
      selectedFiles,
      assessmentType,
      assessment,
      timestamp: Date.now()
    };

    setResponses(prev => ({
      ...prev,
      [activeStepId]: {
        0: `Files: ${selectedFiles.join(', ')}`,
        1: assessment
      }
    }));

    setHexExecutions(prev => ({
      ...prev,
      [activeStepId]: [...(prev[activeStepId] || []), executionData]
    }));
    localStorage.setItem('cohive_hex_executions', JSON.stringify({
      ...hexExecutions,
      [activeStepId]: [...(hexExecutions[activeStepId] || []), executionData]
    }));

    // For persona hexes (Luminaries, Consumers, etc.) selectedFiles contains persona IDs,
    // so KB files come from selectedResearchFiles (chosen in the Enter hex).
    // For non-persona hexes selectedFiles already contains KB file names.
    const personaHexIds = ['Consumers', 'Luminaries', 'Colleagues', 'cultural', 'Grade'];
    const isPersonaHex = personaHexIds.includes(activeStepId);

    // Resolve kbFileNames: map file IDs/names to actual file names for the API
    const kbFileNames = isPersonaHex
      ? selectedResearchFiles  // already file names from the Enter hex selection
      : selectedFiles.map(idOrName => {
          const match = researchFiles.find(f => f.id === idOrName || f.fileName === idOrName);
          return match ? match.fileName : idOrName;
        });

    // Get current hex label
    const currentStep = processSteps.find(s => s.id === activeStepId);
    const hexLabel = currentStep?.label || activeStepId;

    // Get the ideas file if one exists for this project (Load Current Ideas)
    const ideasFile = getIdeasFile(brand, projectType);

    // Open the Assessment Modal
    setAssessmentModalProps({
      hexId: activeStepId,
      hexLabel,
      assessmentType: assessmentType[0] || 'unified',
      selectedPersonas: isPersonaHex ? selectedFiles : [],
      kbFileNames,
      userSolution: assessmentType.includes('assess') ? assessment : '',
      ideasFile: ideasFile ? {
        fileName: ideasFile.fileName,
        content: ideasFile.content,
        fileType: ideasFile.fileType,
      } : null,
    });
    setAssessmentModalOpen(true);
  };

  // Handle saving recommendation to knowledge base
  const handleSaveRecommendation = (recommendation: string, hexId: string) => {
    const brand = responses['Enter']?.[0]?.trim() || 'General';
    const projectType = responses['Enter']?.[1]?.trim() || 'General';
    
    const newRecommendationFile: ResearchFile = {
      id: Date.now().toString(),
      brand,
      projectType,
      fileName: `Recommendation_${hexId}_${Date.now()}`,
      isApproved: true,
      uploadDate: Date.now(),
      fileType: 'Research',
      content: recommendation
    };
    
    const updatedFiles = [...researchFiles, newRecommendationFile];
    setResearchFiles(updatedFiles);
    localStorage.setItem('cohive_research_files', JSON.stringify(updatedFiles));
  };

  // Handle saving wisdom to Databricks Knowledge Base
  const handleSaveWisdomToDatabricks = async (
    fileName: string,
    content: string,
    insightType: string,
    inputMethod: string,
    brand?: string,
    projectType?: string
  ) => {
    // Check authentication first
    if (!isDatabricksAuthenticated) {
      alert('⚠️ Please sign in to Databricks before saving to the Knowledge Base.\n\nClick the "Sign In" button in the header to authenticate.');
      setShowLoginModal(true);
      return false;
    }

    try {
      const mimeType = getMimeTypeFromFileName(fileName);
      let file: File;
      
      // Check if content is base64 encoded (for media files) or plain text
      const isBase64 = content.includes('data:') || (content.includes(',') && !content.includes(' '));
      
      if (isBase64) {
        // Handle base64 media content (photos, videos, audio recordings)
        const base64Data = content.includes(',') ? content.split(',')[1] : content;
        
        // Convert base64 to blob
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        
        // Create File object from Blob
        file = createFileFromBlob(blob, fileName);
      } else {
        // Handle plain text content
        const blob = new Blob([content], { type: 'text/plain' });
        file = createFileFromBlob(blob, fileName);
      }

      // Determine scope based on insightType
      let scope: 'general' | 'category' | 'brand';
      if (insightType === 'General') {
        scope = 'general';
      } else if (insightType === 'Category') {
        scope = 'category';
      } else {
        scope = 'brand';
      }

      // Upload to Databricks Knowledge Base
      // Note: For category scope, brand should be undefined/null
      const result = await uploadToKnowledgeBase({
        file,
        scope,
        category: projectType, // Map projectType to category
        brand: scope === 'brand' ? (brand || undefined) : undefined, // Only set brand for brand scope
        projectType: projectType || undefined,
        fileType: 'Wisdom',
        tags: [insightType, inputMethod],
        insightType: insightType as 'Brand' | 'Category' | 'General',
        inputMethod: inputMethod as 'Text' | 'Voice' | 'Photo' | 'Video' | 'File',
        userEmail: userEmail,
        userRole,
      });
      
      if (result.success) {
        console.log('✅ Wisdom successfully saved to Databricks:', fileName);
        // Show success message that auto-dismisses after 3 seconds
        setWisdomSuccessMessage(`✅ "${fileName}" saved to Knowledge Base`);
        setTimeout(() => setWisdomSuccessMessage(null), 3000);
        return true;
      } else {
        console.error('❌ Failed to save wisdom to Databricks:', result.error);
        alert(`Failed to save to Knowledge Base: ${result.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error saving wisdom:', error);
      alert(`Failed to save wisdom: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  // Helper function to get MIME type from filename
  function getMimeTypeFromFileName(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'txt': 'text/plain',
      'webm': 'audio/webm',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'mp4': 'video/mp4',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'csv': 'text/csv',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  // Check if current step is a central hexagon
  const centralHexIds = ['Luminaries', 'panelist', 'Consumers', 'competitors', 'Colleagues', 'cultural', 'test', 'Grade'];
  const isCentralHex = centralHexIds.includes(activeStepId);

  // Template handlers
  const handleTemplateChange = (templateId: string) => {
    const newTemplate = templates.find(t => t.id === templateId);
    if (newTemplate) {
      setCurrentTemplateId(templateId);
      localStorage.setItem('cohive_current_template_id', templateId);
    }
  };

  const handleTemplateUpdate = (template: UserTemplate) => {
    const updatedTemplates = templates.map(t => 
      t.id === template.id ? template : t
    );
    setTemplates(updatedTemplates);
    if (currentTemplateId === template.id) {
      setCurrentTemplateId(template.id);
      localStorage.setItem('cohive_current_template_id', template.id);
    }
    localStorage.setItem('cohive_templates', JSON.stringify(updatedTemplates));
  };

  const handleTemplateCreate = (template: UserTemplate) => {
    const updatedTemplates = [...templates, template];
    setTemplates(updatedTemplates);
    localStorage.setItem('cohive_templates', JSON.stringify(updatedTemplates));
  };

  // Brand and Project Type handlers
  const handleAddBrand = (brand: string) => {
    if (!brand.trim() || availableBrands.includes(brand.trim())) return;
    const updated = [...availableBrands, brand.trim()].sort();
    setAvailableBrands(updated);
    localStorage.setItem('cohive_available_brands', JSON.stringify(updated));
  };

  const handleAddProjectType = (projectType: string) => {
    if (!projectType.trim() || availableProjectTypes.includes(projectType.trim())) return;
    const updated = [...availableProjectTypes, projectType.trim()].sort();
    setAvailableProjectTypes(updated);
    localStorage.setItem('cohive_available_project_types', JSON.stringify(updated));
  };

  // Export all project data
  const handleExportData = () => {
    // Get brand and project type from Enter responses
    const brandName = responses['Enter']?.[0] || 'Brand';
    const projectType = responses['Enter']?.[1] || 'ProjectType';
    
    // Format date as YYYY-MM-DD
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // Gets YYYY-MM-DD
    
    // Create base filename
    const baseFilename = `CoHive_${brandName}_${projectType}_${dateStr}`;
    
    // For now, we'll suggest V1 as the version
    // In a real implementation, you could track versions in localStorage
    const filename = `${baseFilename}_V1.json`;
    
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      projectName: responses['Enter']?.[0] || 'CoHive Project',
      responses,
      researchFiles,
      ideasFiles,
      hexExecutions,
      editSuggestions,
      projectFiles,
      currentTemplateId,
      templates
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import project data
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        
        // Validate data structure
        if (!importData.version || !importData.responses) {
          alert('Invalid project file format');
          return;
        }

        // Confirm before overwriting
        if (Object.keys(responses).length > 0) {
          const confirmed = confirm('This will replace your current project data. Continue?');
          if (!confirmed) return;
        }

        // Import all data
        setResponses(importData.responses || {});
        setResearchFiles(importData.researchFiles || []);
        setIdeasFiles(importData.ideasFiles || []);
        setHexExecutions(importData.hexExecutions || {});
        setEditSuggestions(importData.editSuggestions || []);
        setProjectFiles(importData.projectFiles || []);
        
        if (importData.currentTemplateId) {
          setCurrentTemplateId(importData.currentTemplateId);
        }
        
        if (importData.templates) {
          setTemplates(importData.templates);
        }

        // Save to localStorage
        localStorage.setItem('cohive_responses', JSON.stringify(importData.responses || {}));
        localStorage.setItem('cohive_research_files', JSON.stringify(importData.researchFiles || []));
        localStorage.setItem('cohive_ideas_files', JSON.stringify(importData.ideasFiles || []));
        localStorage.setItem('cohive_hex_executions', JSON.stringify(importData.hexExecutions || {}));
        localStorage.setItem('cohive_edit_suggestions', JSON.stringify(importData.editSuggestions || []));
        localStorage.setItem('cohive_projects', JSON.stringify(importData.projectFiles || []));
        
        if (importData.currentTemplateId) {
          localStorage.setItem('cohive_current_template_id', importData.currentTemplateId);
        }
        
        if (importData.templates) {
          localStorage.setItem('cohive_templates', JSON.stringify(importData.templates));
        }

        alert(`Project "${importData.projectName}" imported successfully!`);
      } catch (error) {
        alert('Failed to import project file. Please check the file format.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  // Load shared knowledge base files from Databricks (for first-time users)
  const loadKnowledgeBaseFiles = async () => {
    try {
      console.log('📚 Loading shared organizational knowledge base files...');
      
      // Check if user is authenticated with valid session
      const session = await getValidSession();
      if (!session) {
        console.log('User not authenticated yet, will load knowledge base files after sign-in');
        setResearchFiles([]);
        return;
      }

      // Determine what files to load based on user role
      // Handle case where currentTemplate might be null during initialization
      if (!currentTemplate) {
        console.log('⏳ Template not loaded yet, skipping file load...');
        return;
      }
      
      const isResearcher = currentTemplate.role === 'research-analyst' || currentTemplate.role === 'research-leader';
      const isResearchLeader = currentTemplate.role === 'research-leader';
      
      let kbFiles: KnowledgeBaseFile[] = [];
      
      if (isResearcher) {
        // Researchers can see all files (approved, processed/pending, and unprocessed)
        console.log(`👨‍🔬 Loading all files for ${currentTemplate.role}...`);
        kbFiles = await listKnowledgeBaseFiles({
          // No isApproved filter - get all files
          sortBy: 'upload_date',
          sortOrder: 'DESC',
          limit: 500,
        });
        console.log(`✅ Found ${kbFiles.length} knowledge base files (all statuses)`);
      } else {
        // Non-researchers only see approved files
        console.log('👤 Loading approved files only for non-researcher...');
        kbFiles = await listKnowledgeBaseFiles({
          isApproved: true, // Only approved files
          sortBy: 'upload_date',
          sortOrder: 'DESC',
          limit: 500,
        });
        console.log(`✅ Found ${kbFiles.length} approved knowledge base files`);
      }

      console.log(`✅ Found ${kbFiles.length} shared knowledge base files`);

      // Convert KnowledgeBaseFile format to ResearchFile format
      // Handle scope-based brand/category mapping:
      // - scope=general: no brand, display as "General"
      // - scope=category: category in category field, display category name
      // - scope=brand: both category and brand fields populated
      const convertedFiles: ResearchFile[] = kbFiles.map((kbFile: KnowledgeBaseFile) => {
        let displayBrand = 'General';
        let displayProjectType = 'Knowledge Base';
        
        if (kbFile.scope === 'category') {
          // For category scope, show the category name
          displayBrand = kbFile.category || 'Uncategorized';
          displayProjectType = kbFile.projectType || 'Category Knowledge';
        } else if (kbFile.scope === 'brand') {
          // For brand scope, show the brand name
          displayBrand = kbFile.brand || 'Unknown Brand';
          displayProjectType = kbFile.projectType || kbFile.category || 'Brand Knowledge';
        } else {
          // For general scope, show "General"
          displayBrand = 'General';
          displayProjectType = kbFile.projectType || 'General Knowledge';
        }
        
        return {
          id: kbFile.fileId,
          brand: displayBrand,
          projectType: displayProjectType,
          fileName: kbFile.fileName,
          isApproved: kbFile.isApproved,
          uploadDate: new Date(kbFile.uploadDate).getTime(),
          fileType: kbFile.fileType,
          source: kbFile.filePath,
          scope: kbFile.scope, // Preserve scope for filtering
        };
      });

      // Store in state and localStorage for offline access
      setResearchFiles(convertedFiles);
      localStorage.setItem('cohive_research_files', JSON.stringify(convertedFiles));
      
      console.log('✅ Knowledge base files loaded and cached locally');
    } catch (error) {
      console.error('Failed to load knowledge base files:', error);
      // Don't block the app if KB files fail to load
      setResearchFiles([]);
    }
  };

  // Restart the entire project
  const handleRestart = () => {
    const confirmed = confirm('⚠️ WARNING: Restart Project\n\nThis action will permanently delete:\n• All workflow steps and progress\n• All responses and data entered\n• All execution history\n• All uploaded ideas files\n• Templates, research files, and project files will be preserved.\n\nThis action CANNOT be undone.\n\nAre you sure you want to restart?');
    if (!confirmed) return;

    // Clear all state
    setResponses({});
    setActiveStepId('Enter');
    setShowValidation(false);
    setIdeasFiles([]);
    
    // Clear localStorage (but keep templates, research files, and project files)
    localStorage.removeItem('cohive_responses');
    localStorage.removeItem('cohive_hex_executions');
    localStorage.removeItem('cohive_ideas_files');
    
    alert('Project has been restarted. All data has been cleared.');
  };

  return (
    <div className="p-8">
      {/* Auth checking loading state */}
      {isCheckingAuth && (
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
          <div className="text-center">
            <Cpu className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-700">Loading CoHive...</p>
          </div>
        </div>
      )}

      {/* Top Section: Hex Box on Left, Content Area on Right */}
      <div className="flex gap-6 mb-6">
        {/* Left Side: Hexagonal Breadcrumb Navigation */}
        <div className="flex-shrink-0">
          <ProcessFlow 
            activeStep={activeStepId} 
            onStepChange={(stepId) => {
              // If navigating to Enter and the last iteration was saved, increment the filename
              if (stepId === 'Enter' && iterationSaved) {
                const brand = responses['Enter']?.[0];
                const projectType = responses['Enter']?.[1];
                const currentFileName = responses['Enter']?.[2];
                
                if (brand && projectType && currentFileName) {
                  // Get the next incremented filename
                  const nextFileName = getUniqueFileName(currentFileName, brand, projectType);
                  
                  setResponses(prev => ({
                    ...prev,
                    'Enter': {
                      ...prev['Enter'],
                      [2]: nextFileName
                    },
                    // Clear the "Save Iteration" selection from Findings
                    'Findings': {
                      ...prev['Findings'],
                      [0]: '' // Clear "Save Iteration or Summarize" choice
                    }
                  }));
                }
                
                setIterationSaved(false);
                localStorage.setItem('cohive_iteration_saved', 'false');
              }
              
              // Always clear "Save Iteration" selection when navigating to Enter
              if (stepId === 'Enter' && !iterationSaved) {
                setResponses(prev => ({
                  ...prev,
                  'Findings': {
                    ...prev['Findings'],
                    [0]: '' // Clear "Save Iteration or Summarize" choice
                  }
                }));
              }
              
              setActiveStepId(stepId);
              setShowValidation(false);
            }}
            completedSteps={processSteps.filter(step => isStepComplete(step.id)).map(step => step.id)}
            isEnterComplete={isStepComplete('Enter')}
            userRole={userRole}
            hexExecutions={hexExecutions}
            projectType={responses['Enter']?.[1] || ''}
          />
          
          {/* Bottom Section: Control Buttons - positioned below hex box */}
          <div className="flex flex-col gap-3 mt-4">
            {/* Save Notification */}
            {showSaveNotification && (
              <span className="flex items-center gap-2 text-green-600 text-sm px-3 py-2 bg-green-50 rounded">
                <Save className="w-4 h-4" />
                Saved
              </span>
            )}

            {/* Export Project Button */}
            <button 
              className="px-4 py-2 border-2 border-blue-500 text-blue-700 rounded flex items-center gap-2 hover:bg-gray-50"
              onClick={handleExportData}
              title="Export project data to JSON file"
            >
              <Download className="w-4 h-4" />
              Export Project
            </button>

            {/* Import Project Button */}
            <label className="px-4 py-2 border-2 border-green-500 text-green-700 rounded flex items-center gap-2 hover:bg-gray-50 cursor-pointer">
              <Upload className="w-4 h-4" />
              Import Project
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportData}
              />
            </label>

            {/* Restart Button */}
            <button 
              className="px-4 py-2 border-2 border-red-500 text-red-700 rounded flex items-center gap-2 hover:bg-gray-50"
              onClick={handleRestart}
              title="Restart the project and clear all data"
            >
              <RotateCcw className="w-4 h-4" />
              Restart Project
            </button>

            {/* Logout Button */}
            <button 
              className="px-4 py-2 border-2 border-gray-500 text-gray-700 rounded flex items-center gap-2 hover:bg-gray-50"
              onClick={() => {
                if (window.confirm('Are you sure you want to log out? This will return you to the landing page.')) {
                  localStorage.removeItem('cohive_logged_in');
                  window.location.reload();
                }
              }}
              title="Log out and return to landing page"
            >
              <User className="w-4 h-4" />
              Log Out
            </button>

            {/* Current Template Info */}
            <div className="flex items-center gap-2 px-3 py-2 border-2 border-gray-300 rounded">
              <User className="w-4 h-4 text-gray-600" />
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Template</span>
                <span className="text-sm text-gray-900">{currentTemplateId}</span>
              </div>
            </div>

            {/* Manage Templates Button */}
            <div className="relative">
              <button 
                className="w-full px-4 py-2 border-2 border-gray-400 text-gray-700 rounded flex items-center gap-2 hover:bg-gray-50"
                onClick={() => setShowTemplateManager(true)}
              >
                <Settings className="w-4 h-4" />
                Manage Templates
              </button>

              {/* Template Manager Modal */}
              {showTemplateManager && currentTemplate && (
                <TemplateManager
                  currentTemplate={currentTemplate}
                  availableTemplates={templates}
                  onTemplateChange={handleTemplateChange}
                  onTemplateUpdate={handleTemplateUpdate}
                  onTemplateCreate={handleTemplateCreate}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Content Area with Questions and User Notes */}
        <div className="flex-1 flex gap-6">
          {/* Main Content Area */}
          <div className="flex-1">
            {/* CoHive Logo */}
            <div className="mb-4 -mt-8 flex justify-center">
              <img src={cohiveLogo} alt="CoHive - Insight into Inspiration" className="h-24" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-gray-900">
                  {activeStepId === 'research' && !currentTemplate?.permissions?.canApproveResearch
                    ? 'View Knowledge Assets'
                    : currentContent.title}
                </h2>
                <div className="flex items-center gap-2">
                  {isCurrentStepComplete && (
                    <span className="flex items-center gap-1 px-3 py-1 text-green-800 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Complete
                    </span>
                  )}
                </div>
              </div>
              
              <p className="text-gray-600 mb-6">
                {activeStepId === 'research' && !currentTemplate?.permissions?.canApproveResearch
                  ? 'Review and suggest edits to the knowledge assets your projects will be based on'
                  : currentContent.description}
              </p>

              {/* Validation Message - Only for Enter step */}
              {activeStepId === 'Enter' && showValidation && !isCurrentStepComplete && (
                <div className="mb-4 p-4 border-2 border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-red-900">Please complete the Enter step</div>
                    <div className="text-red-700 text-sm">All Enter questions must be answered before proceeding to the next step.</div>
                  </div>
                </div>
              )}

              {/* Databricks Authentication Status - Show on Enter hex or any hex if not authenticated */}
              {(activeStepId === 'Enter' || !isDatabricksAuthenticated) && (
                <div className="mb-3">
                  {isCheckingAuth ? (
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-2.5">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-600 animate-pulse" />
                        <span className="text-gray-700 text-sm">Checking Databricks authentication...</span>
                      </div>
                    </div>
                  ) : isDatabricksAuthenticated ? (
                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-2.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-gray-900 text-sm font-medium">Connected to Databricks</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-gray-900 font-medium mb-1">Databricks Authentication Required</h4>
                          <p className="text-gray-700 text-sm mb-3">
                            CoHive integrates with Databricks to save your work, access your organization's Knowledge Base, 
                            and power AI-driven insights across all workflow steps.
                          </p>
                          
                          <button
                            onClick={() => setShowLoginModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-2"
                          >
                            <Database className="w-4 h-4" />
                            Sign In to Databricks
                          </button>
                          
                          <div className="mt-3 text-xs text-gray-600">
                            <p className="mb-1">✓ Secure OAuth 2.0 authentication</p>
                            <p className="mb-1">✓ Your credentials never leave Databricks</p>
                            <p>✓ Access your organization's shared Knowledge Base</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Questions Section */}
              <div className="space-y-4">
                {/* Special handling for Research step - different views for researchers vs non-researchers */}
                {activeStepId === 'research' ? (
                (userRole === 'administrator' || userRole === 'research-analyst' || userRole === 'research-leader') ? (
                  <ResearcherModes
                    brand={responses['Enter']?.[0]?.trim() || ''}
                    projectType={responses['Enter']?.[1]?.trim() || ''}
                    researchFiles={researchFiles}
                    editSuggestions={editSuggestions}
                    canApproveResearch={currentTemplate?.permissions?.canApproveResearch || false}
                    onCreateResearchFile={handleCreateResearchFile}
                    onToggleApproval={handleToggleApproval}
                    onUpdateResearchFile={handleUpdateResearchFile}
                    onUpdateSuggestionStatus={handleUpdateSuggestionStatus}
                    availableBrands={availableBrands}
                    availableProjectTypes={availableProjectTypes}
                    onAddBrand={handleAddBrand}
                    onAddProjectType={handleAddProjectType}
                  />
                ) : (
                  <ResearchView
                    role="non-researcher"
                    brand={responses['Enter']?.[0]?.trim() || ''}
                    projectType={responses['Enter']?.[1]?.trim() || ''}
                    researchFiles={researchFiles}
                    editSuggestions={editSuggestions}
                    onAddSuggestion={handleAddSuggestion}
                    onUpdateSuggestionStatus={handleUpdateSuggestionStatus}
                    onToggleApproval={handleToggleApproval}
                    canApproveResearch={currentTemplate?.permissions?.canApproveResearch || false}
                    onCreateResearchFile={handleCreateResearchFile}
                  />
                )
              ) : activeStepId === 'review' ? (
                <ReviewView
                  projectFiles={projectFiles}
                  onDeleteFiles={handleDeleteProjectFiles}
                />
              ) : isCentralHex ? (
                <CentralHexView
                  key={activeStepId}
                  hexId={activeStepId}
                  hexLabel={currentContent.title}
                  researchFiles={researchFiles}
                  onExecute={handleCentralHexExecute}
                  databricksInstructions={currentTemplate?.databricksInstructions?.[activeStepId] || ''}
                  previousExecutions={hexExecutions[activeStepId] || []}
                  onSaveRecommendation={handleSaveRecommendation}
                  projectType={responses['Enter']?.[1] || ''}
                  userBrand={responses['Enter']?.[0] || ''}
                />
              ) : (
                <>
                  {/* Success message for Wisdom uploads */}
                  {wisdomSuccessMessage && activeStepId === 'Wisdom' && (
                    <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">{wisdomSuccessMessage}</p>
                    </div>
                  )}
                  
                  {currentContent.questions.map((question, idx) => {
                  const hasResponse = responses[activeStepId]?.[idx]?.trim().length > 0;
                  const showError = false; // Allow free navigation - no validation errors
                  
                  // Special handling for Enter step dynamic questions
                  if (activeStepId === 'Enter') {
                    const brand = responses['Enter']?.[0]?.trim();
                    const projectType = responses['Enter']?.[1]?.trim();
                    const existingFiles = brand && projectType ? getExistingFiles(brand, projectType) : [];
                    


                    // Ideas Source question: Load Current Ideas or Get Inspired
                    // Skip this question for War Games project type
                    if (question === 'Ideas Source') {
                      const projectType = responses['Enter']?.[1];
                      if (projectType === 'War Games') {
                        return null; // Skip this question for War Games
                      }
                      
                      const ideasChoice = responses[activeStepId]?.[idx];
                      const nextQuestionIdx = idx + 1;
                      
                      return (
                        <div key={idx} className="mb-2">
                          <label className="block text-gray-900 mb-1 flex items-start justify-between">
                            <span>{idx + 1}. Load Current Ideas or Get Inspired?</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <div className="space-y-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="ideasSource"
                                value="Load Current Ideas"
                                checked={responses[activeStepId]?.[idx] === 'Load Current Ideas'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Load Current Ideas</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="ideasSource"
                                value="Get Inspired"
                                checked={responses[activeStepId]?.[idx] === 'Get Inspired'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Get Inspired</span>
                            </label>
                          </div>
                          {showError && (
                            <p className="text-red-600 text-sm mt-2">Please select an option</p>
                          )}

                          {/* File upload if "Load Current Ideas" is selected */}
                          {ideasChoice === 'Load Current Ideas' && (
                            <div className="mt-2">
                              <label className="block text-gray-900 mb-1 flex items-start justify-between">
                                <span>{idx + 2}. Upload Ideas File</span>
                                {responses[activeStepId]?.[nextQuestionIdx] && (
                                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                )}
                              </label>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
                                className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  
                                  const fileName = file.name;
                                  const fileType = file.type || 'application/octet-stream';
                                  
                                  // Read file content as base64
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const base64Content = event.target?.result as string;
                                    
                                    // Store the ideas file with content
                                    const newIdeasFile: IdeasFile = {
                                      brand: brand || '',
                                      projectType: projectType || '',
                                      fileName,
                                      content: base64Content,
                                      fileType,
                                      uploadDate: Date.now()
                                    };
                                    
                                    // Remove any existing ideas file for this brand/project
                                    const updatedIdeasFiles = ideasFiles.filter(
                                      f => !(f.brand.toLowerCase() === brand?.toLowerCase() && 
                                             f.projectType.toLowerCase() === projectType?.toLowerCase())
                                    );
                                    
                                    // Add the new file
                                    updatedIdeasFiles.push(newIdeasFile);
                                    setIdeasFiles(updatedIdeasFiles);
                                    
                                    // Save to localStorage
                                    localStorage.setItem('cohive_ideas_files', JSON.stringify(updatedIdeasFiles));
                                    
                                    // Store filename in responses
                                    handleResponseChange(nextQuestionIdx, fileName);
                                  };
                                  
                                  reader.onerror = () => {
                                    alert('Failed to read file. Please try again.');
                                  };
                                  
                                  reader.readAsDataURL(file);
                                }}
                              />
                              {responses[activeStepId]?.[nextQuestionIdx] && (() => {
                                const currentIdeasFile = getIdeasFile(brand || '', projectType || '');
                                return (
                                  <div className="text-sm mt-2">
                                    <p className="text-green-700 flex items-center gap-2">
                                      <CheckCircle className="w-4 h-4" />
                                      Selected: {responses[activeStepId][nextQuestionIdx]}
                                    </p>
                                    {currentIdeasFile && (
                                      <p className="text-blue-600 text-xs mt-1">
                                        ✓ File content stored ({(currentIdeasFile.content.length / 1024).toFixed(1)} KB) - Will be sent to Databricks on execution
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}


                        </div>
                      );
                    }

                    // Research Files question: Select approved knowledge files
                    if (question === 'Research Files') {
                      const nextQuestionIdx = idx + 1;
                      const approvedFiles = brand && projectType ? getApprovedResearchFiles(brand, projectType) : [];
                      
                      return (
                        <div key={idx} className="mb-2">
                            <label className="block text-gray-900 mb-1 flex items-start justify-between">
                              <span>{idx + 1}. Select Approved Knowledge Files</span>
                              {hasResponse && (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              )}
                            </label>
                            <div className="space-y-1">
                              {approvedFiles.length > 0 ? (
                                approvedFiles.map((file, fileIdx) => (
                                  <label key={fileIdx} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      name="researchFiles"
                                      value={file.fileName}
                                      checked={selectedResearchFiles.includes(file.fileName)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          const updated = [...selectedResearchFiles, file.fileName];
                                          setSelectedResearchFiles(updated);
                                          localStorage.setItem('cohive_selected_research_files', JSON.stringify(updated));
                                        } else {
                                          const updated = selectedResearchFiles.filter(f => f !== file.fileName);
                                          setSelectedResearchFiles(updated);
                                          localStorage.setItem('cohive_selected_research_files', JSON.stringify(updated));
                                        }
                                      }}
                                      className="w-4 h-4"
                                    />
                                    <span className="text-gray-700">{file.fileName} (Uploaded: {new Date(file.uploadDate).toLocaleDateString()})</span>
                                  </label>
                                ))
                              ) : (
                                <p className="text-gray-600 text-sm italic">No approved research files available for {brand} - {projectType}. You can upload files in the Research section.</p>
                              )}
                            </div>
                            {showError && (
                              <p className="text-red-600 text-sm mt-1">Please select at least one file</p>
                            )}
                        </div>
                      );
                    }

                    // Filename question: Use input with default filename
                    if (idx === 3 && question === 'Filename' && brand && projectType) {
                      const defaultFileName = generateDefaultFileName(brand, projectType);
                      return (
                        <div key={idx} className="mb-2">
                          <label className="block text-gray-900 mb-1 flex items-start justify-between">
                            <span>{idx + 1}. {question}</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <input
                            type="text"
                            className={`w-full border-2 ${showError ? 'border-red-300' : 'border-gray-300'} bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500`}
                            placeholder={defaultFileName}
                            value={responses[activeStepId]?.[idx] || ''}
                            onChange={(e) => handleResponseChange(idx, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !responses[activeStepId]?.[idx]) {
                                handleResponseChange(idx, defaultFileName);
                              }
                            }}
                          />
                          {showError && (
                            <p className="text-red-600 text-sm mt-2">Please enter a filename</p>
                          )}
                        </div>
                      );
                    }
                  }

                  // Special handling for Wisdom hex questions
                  if (activeStepId === 'Wisdom') {
                    const brand = responses['Enter']?.[0]?.trim() || '';
                    const projectType = responses['Enter']?.[1]?.trim() || '';
                    
                    // Determine insight type from processing (brand/project context)
                    const insightType = brand ? 'Brand' : (projectType ? 'Category' : 'General');
                    
                    // Question 0: Input Method (formerly Question 1)
                    if (idx === 0 && question === 'Input Method') {
                      return (
                        <div key={idx} className="mb-2">
                          <label className="block text-gray-900 mb-1 flex items-start justify-between">
                            <span>How would you like to share?</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <div className="space-y-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="inputMethod"
                                value="Text"
                                checked={responses[activeStepId]?.[idx] === 'Text'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Text</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="inputMethod"
                                value="Voice"
                                checked={responses[activeStepId]?.[idx] === 'Voice'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Voice</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="inputMethod"
                                value="Photo"
                                checked={responses[activeStepId]?.[idx] === 'Photo'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Photo</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="inputMethod"
                                value="Video"
                                checked={responses[activeStepId]?.[idx] === 'Video'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Video</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="inputMethod"
                                value="File"
                                checked={responses[activeStepId]?.[idx] === 'File'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">File</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="inputMethod"
                                value="Interview"
                                checked={responses[activeStepId]?.[idx] === 'Interview'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Be Interviewed</span>
                            </label>
                          </div>
                          {showError && (
                            <p className="text-red-600 text-sm mt-2">Please select an input method</p>
                          )}
                        </div>
                      );
                    }

                    // Question 1: Share Your Wisdom (formerly Question 2)
                    if (idx === 1 && question === 'Share Your Wisdom') {
                      const inputMethod = responses[activeStepId]?.[0];
                      if (!inputMethod) return null; // Only show after input method is selected
                      
                      // Text input
                      if (inputMethod === 'Text') {
                        return (
                          <div key={idx} className="mb-2">
                            <label className="block text-gray-900 mb-1 flex items-start justify-between">
                              <span>Share Your Wisdom</span>
                              {hasResponse && (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              )}
                            </label>
                            <div className="relative" style={{ position: 'relative' }}>
                              <textarea
                                className={`w-full border-2 ${showError ? 'border-red-300' : 'border-gray-300'} bg-white rounded p-2 pr-12 text-gray-700 focus:outline-none focus:border-blue-500`}
                                placeholder={`Share your ${insightType.toLowerCase()} insight here...`}
                                rows={6}
                                value={responses[activeStepId]?.[idx] || ''}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                              />
                              {/* Microphone button for voice-to-text */}
                              {hasMediaDevices && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!isVoiceToText) {
                                      try {
                                        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                        setStream(audioStream);
                                        setIsVoiceToText(true);
                                        
                                        // Use Web Speech API for voice-to-text if available
                                        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                                          const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
                                          const recognition = new SpeechRecognition();
                                          recognition.continuous = true;
                                          recognition.interimResults = true;
                                          
                                          // Store the starting text content
                                          const startingText = responses[activeStepId]?.[idx] || '';
                                          let accumulatedTranscript = '';
                                          
                                          recognition.onresult = (event: any) => {
                                            let interimTranscript = '';
                                            let currentSessionTranscript = '';
                                            
                                            // Process all results from this recognition session
                                            for (let i = 0; i < event.results.length; i++) {
                                              const transcript = event.results[i][0].transcript;
                                              if (event.results[i].isFinal) {
                                                currentSessionTranscript += transcript + ' ';
                                              } else {
                                                interimTranscript += transcript;
                                              }
                                            }
                                            
                                            // Update accumulated transcript with finalized text
                                            if (currentSessionTranscript) {
                                              accumulatedTranscript = currentSessionTranscript;
                                            }
                                            
                                            // Show starting text + accumulated + interim text
                                            const fullText = startingText + (startingText && accumulatedTranscript ? ' ' : '') + accumulatedTranscript + interimTranscript;
                                            handleResponseChange(idx, fullText);
                                          };
                                          
                                          recognition.onerror = (event: any) => {
                                            console.error('Speech recognition error:', event.error);
                                            setIsVoiceToText(false);
                                            audioStream.getTracks().forEach(track => track.stop());
                                            setStream(null);
                                          };
                                          
                                          recognition.onend = () => {
                                            setIsVoiceToText(false);
                                            audioStream.getTracks().forEach(track => track.stop());
                                            setStream(null);
                                          };
                                          
                                          recognition.start();
                                          (window as any).currentRecognition = recognition;
                                        } else {
                                          alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
                                          setIsVoiceToText(false);
                                          audioStream.getTracks().forEach(track => track.stop());
                                          setStream(null);
                                        }
                                      } catch (err) {
                                        alert('Unable to access microphone. Please check your browser permissions.');
                                        console.error('Microphone error:', err);
                                        setIsVoiceToText(false);
                                      }
                                    } else {
                                      // Stop recording
                                      if ((window as any).currentRecognition) {
                                        (window as any).currentRecognition.stop();
                                        (window as any).currentRecognition = null;
                                      }
                                      if (stream) {
                                        stream.getTracks().forEach(track => track.stop());
                                        setStream(null);
                                      }
                                      setIsVoiceToText(false);
                                    }
                                  }}
                                  className={`absolute right-2 top-2 p-2 rounded-full transition-colors ${
                                    isVoiceToText 
                                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                                  }`}
                                  style={{ position: 'absolute', right: '0.5rem', top: '0.5rem' }}
                                  title={isVoiceToText ? 'Stop voice input' : 'Start voice input'}
                                >
                                  <Mic className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                            {isVoiceToText && (
                              <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                                <span className="inline-block w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                                Listening... Speak now and your words will appear in the text box
                              </p>
                            )}
                            {showError && (
                              <p className="text-red-600 text-sm mt-2">Please enter your wisdom</p>
                            )}
                            {hasResponse && (
                              <button
                                onClick={async () => {
                                  const wisdom = responses[activeStepId]?.[idx];
                                  if (!wisdom) return;
                                  
                                  // Save to Databricks Knowledge Base
                                  const fileName = `Wisdom_${insightType}_${Date.now()}.txt`;
                                  const success = await handleSaveWisdomToDatabricks(
                                    fileName,
                                    wisdom,
                                    insightType,
                                    'Text',
                                    brand,
                                    projectType
                                  );
                                  
                                  if (success) {
                                    alert('✓ Wisdom saved to Databricks Knowledge Base!');
                                    // Reset form to allow adding another item
                                    setResponses(prev => {
                                      const updated = { ...prev };
                                      delete updated[activeStepId];
                                      return updated;
                                    });
                                  }
                                }}
                                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Save to Knowledge Base
                              </button>
                            )}
                          </div>
                        );
                      }
                      
                      // Voice recording
                      if (inputMethod === 'Voice') {
                        return (
                          <div key={idx} className="mb-2">
                            <label className="block text-gray-900 mb-1 flex items-start justify-between">
                              <span>Share Your Wisdom</span>
                              {hasResponse && (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              )}
                            </label>
                            
                            {!hasMediaDevices && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                                ⚠️ Voice recording is not available in this environment. Please use a modern browser with microphone support.
                              </div>
                            )}
                            
                            {hasMediaDevices && (
                              <div className="space-y-3">
                              {!isRecording && !responses[activeStepId]?.[idx] && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                      setStream(audioStream);
                                      
                                      const recorder = new MediaRecorder(audioStream);
                                      const chunks: Blob[] = [];
                                      
                                      recorder.ondataavailable = (e) => {
                                        if (e.data.size > 0) {
                                          chunks.push(e.data);
                                        }
                                      };
                                      
                                      recorder.onstop = async () => {
                                        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                                        
                                        // Store blob for preview
                                        setRecordedAudioBlob(audioBlob);
                                        
                                        // Stop all tracks
                                        audioStream.getTracks().forEach(track => track.stop());
                                        setStream(null);
                                      };
                                      
                                      setMediaRecorder(recorder);
                                      setRecordedChunks(chunks);
                                      recorder.start();
                                      setIsRecording(true);
                                    } catch (err) {
                                      alert('Unable to access microphone. Please check your browser permissions.');
                                      console.error('Microphone error:', err);
                                    }
                                  }}
                                  className="w-full px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-2"
                                >
                                  <Mic className="w-5 h-5" />
                                  Start Recording
                                </button>
                              )}
                              
                              {isRecording && (
                                <div className="space-y-2">
                                  <div className="bg-red-50 border-2 border-red-500 rounded p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                                      <span className="text-red-700 font-medium">Recording...</span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                                          mediaRecorder.stop();
                                          setIsRecording(false);
                                          setMediaRecorder(null);
                                        }
                                      }}
                                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                                    >
                                      <StopCircle className="w-4 h-4" />
                                      Stop
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {/* Audio Preview */}
                              {recordedAudioBlob && !responses[activeStepId]?.[idx] && (
                                <div className="space-y-3">
                                  <div className="bg-blue-50 border border-blue-200 rounded p-4">
                                    <p className="text-sm font-medium text-blue-900 mb-3">Preview your recording:</p>
                                    <audio 
                                      controls 
                                      src={URL.createObjectURL(recordedAudioBlob)}
                                      className="w-full"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={async () => {
                                        // Convert blob to base64
                                        const reader = new FileReader();
                                        reader.onload = async () => {
                                          const base64Content = reader.result as string;
                                          const fileName = `Wisdom_${insightType}_Voice_${Date.now()}.webm`;
                                          
                                          // Store in responses
                                          handleResponseChange(idx, fileName);
                                          
                                          // Save to Databricks Knowledge Base
                                          const success = await handleSaveWisdomToDatabricks(
                                            fileName,
                                            base64Content,
                                            insightType,
                                            'Voice',
                                            brand,
                                            projectType
                                          );
                                          
                                          if (success) {
                                            setRecordedAudioBlob(null);
                                            // Reset form to allow adding another item
                                            setResponses(prev => {
                                              const updated = { ...prev };
                                              delete updated[activeStepId];
                                              return updated;
                                            });
                                          }
                                        };
                                        
                                        reader.readAsDataURL(recordedAudioBlob);
                                      }}
                                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
                                    >
                                      <CheckCircle className="w-5 h-5" />
                                      Save to Knowledge Base
                                    </button>
                                    <button
                                      onClick={() => {
                                        setRecordedAudioBlob(null);
                                      }}
                                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center justify-center gap-2"
                                    >
                                      <X className="w-5 h-5" />
                                      Re-record
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {responses[activeStepId]?.[idx] && (
                                <div className="bg-green-50 border border-green-200 rounded p-2">
                                  <p className="text-sm text-green-700">
                                    ✓ Recorded: {responses[activeStepId][idx]}
                                  </p>
                                </div>
                              )}
                            </div>
                            )}
                          </div>
                        );
                      }
                      
                      // Photo upload
                      if (inputMethod === 'Photo') {
                        const photoMethod = responses[activeStepId]?.photoMethod;
                        
                        return (
                          <div key={idx} className="mb-2">
                            <label className="block text-gray-900 mb-1 flex items-start justify-between">
                              <span>Share Your Wisdom</span>
                              {hasResponse && (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              )}
                            </label>
                            
                            {!hasMediaDevices && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                                ⚠️ Photo capture is not available in this environment. Please use a modern browser with camera support.
                              </div>
                            )}
                            
                            {!photoMethod && hasMediaDevices && (
                              <div className="space-y-2">
                                <button
                                  onClick={() => {
                                    setResponses(prev => ({
                                      ...prev,
                                      [activeStepId]: {
                                        ...prev[activeStepId],
                                        photoMethod: 'upload'
                                      }
                                    }));
                                  }}
                                  className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                                >
                                  <Upload className="w-5 h-5" />
                                  Upload Photo
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      if (hasMediaDevices) {
                                        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                                        setStream(videoStream);
                                        setResponses(prev => ({
                                          ...prev,
                                          [activeStepId]: {
                                            ...prev[activeStepId],
                                            photoMethod: 'capture'
                                          }
                                        }));
                                      }
                                    } catch (err) {
                                      alert('Unable to access camera. Please check your browser permissions.');
                                      console.error('Camera error:', err);
                                    }
                                  }}
                                  className="w-full px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
                                >
                                  <Camera className="w-5 h-5" />
                                  Capture with Camera
                                </button>
                              </div>
                            )}
                            
                            {photoMethod === 'upload' && !responses[activeStepId]?.[idx] && (
                              <div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    
                                    const fileName = file.name;
                                    
                                    // Read file content as base64
                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                      const base64Content = event.target?.result as string;
                                      
                                      // Store in responses
                                      handleResponseChange(idx, fileName);
                                      
                                      // Save to Databricks Knowledge Base
                                      const wisdomFileName = `Wisdom_${insightType}_Photo_${fileName}`;
                                      const success = await handleSaveWisdomToDatabricks(
                                        wisdomFileName,
                                        base64Content,
                                        insightType,
                                        'Photo',
                                        brand,
                                        projectType
                                      );
                                      
                                      if (success) {
                                        // Reset form to allow adding another item
                                        setResponses(prev => {
                                          const updated = { ...prev };
                                          delete updated[activeStepId];
                                          return updated;
                                        });
                                      }
                                    };
                                    
                                    reader.onerror = () => {
                                      alert('Failed to read photo file. Please try again.');
                                    };
                                    
                                    reader.readAsDataURL(file);
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    setResponses(prev => ({
                                      ...prev,
                                      [activeStepId]: {
                                        ...prev[activeStepId],
                                        photoMethod: undefined
                                      }
                                    }));
                                  }}
                                  className="mt-2 text-sm text-blue-600 hover:underline"
                                >
                                  ← Back to options
                                </button>
                              </div>
                            )}
                            
                            {photoMethod === 'capture' && !responses[activeStepId]?.[idx] && stream && (
                              <div className="space-y-2">
                                <video
                                  ref={(video) => {
                                    if (video && stream) {
                                      video.srcObject = stream;
                                      video.play();
                                    }
                                  }}
                                  className="w-full rounded border-2 border-gray-300"
                                  autoPlay
                                  playsInline
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      const video = document.querySelector('video');
                                      if (!video) return;
                                      
                                      // Create canvas to capture frame
                                      const canvas = document.createElement('canvas');
                                      canvas.width = video.videoWidth;
                                      canvas.height = video.videoHeight;
                                      const ctx = canvas.getContext('2d');
                                      if (!ctx) return;
                                      
                                      ctx.drawImage(video, 0, 0);
                                      
                                      // Convert to blob and save
                                      canvas.toBlob((blob) => {
                                        if (!blob) return;
                                        
                                        const reader = new FileReader();
                                        reader.onload = async () => {
                                          const base64Content = reader.result as string;
                                          const fileName = `Wisdom_${insightType}_Captured_${Date.now()}.jpg`;
                                          
                                          // Store in responses
                                          handleResponseChange(idx, fileName);
                                          
                                          // Save to Databricks Knowledge Base
                                          const success = await handleSaveWisdomToDatabricks(
                                            fileName,
                                            base64Content,
                                            insightType,
                                            'Photo',
                                            brand,
                                            projectType
                                          );
                                          
                                          if (success) {
                                            // Reset form to allow adding another item
                                            setResponses(prev => {
                                              const updated = { ...prev };
                                              delete updated[activeStepId];
                                              return updated;
                                            });
                                          }
                                          
                                          // Stop camera
                                          stream.getTracks().forEach(track => track.stop());
                                          setStream(null);
                                        };
                                        
                                        reader.readAsDataURL(blob);
                                      }, 'image/jpeg', 0.9);
                                    }}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
                                  >
                                    <Camera className="w-5 h-5" />
                                    Capture Photo
                                  </button>
                                  <button
                                    onClick={() => {
                                      stream.getTracks().forEach(track => track.stop());
                                      setStream(null);
                                      setResponses(prev => ({
                                        ...prev,
                                        [activeStepId]: {
                                          ...prev[activeStepId],
                                          photoMethod: undefined
                                        }
                                      }));
                                    }}
                                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {responses[activeStepId]?.[idx] && (
                              <div className="bg-green-50 border border-green-200 rounded p-2">
                                <p className="text-sm text-green-700">
                                  ✓ Saved: {responses[activeStepId][idx]}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      // Video upload
                      if (inputMethod === 'Video') {
                        const videoMethod = responses[activeStepId]?.videoMethod;
                        
                        return (
                          <div key={idx} className="mb-2">
                            <label className="block text-gray-900 mb-1 flex items-start justify-between">
                              <span>Share Your Wisdom</span>
                              {hasResponse && (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              )}
                            </label>
                            
                            {!hasMediaDevices && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                                ⚠️ Video recording is not available in this environment. Please use a modern browser with camera support.
                              </div>
                            )}
                            
                            {!videoMethod && hasMediaDevices && (
                              <div className="space-y-2">
                                <button
                                  onClick={() => {
                                    setResponses(prev => ({
                                      ...prev,
                                      [activeStepId]: {
                                        ...prev[activeStepId],
                                        videoMethod: 'upload'
                                      }
                                    }));
                                  }}
                                  className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
                                >
                                  <Upload className="w-5 h-5" />
                                  Upload Video
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      if (hasMediaDevices) {
                                        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                                        setStream(videoStream);
                                        
                                        // Start recording
                                        const recorder = new MediaRecorder(videoStream);
                                        const chunks: Blob[] = [];
                                        
                                        recorder.ondataavailable = (e) => {
                                          if (e.data.size > 0) {
                                            chunks.push(e.data);
                                          }
                                        };
                                        
                                        setMediaRecorder(recorder);
                                        setRecordedChunks(chunks);
                                        
                                        setResponses(prev => ({
                                          ...prev,
                                          [activeStepId]: {
                                            ...prev[activeStepId],
                                            videoMethod: 'capture'
                                          }
                                        }));
                                      }
                                    } catch (err) {
                                      alert('Unable to access camera. Please check your browser permissions.');
                                      console.error('Camera error:', err);
                                    }
                                  }}
                                  className="w-full px-4 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center justify-center gap-2"
                                >
                                  <Video className="w-5 h-5" />
                                  Record Video
                                </button>
                              </div>
                            )}
                            
                            {videoMethod === 'upload' && !responses[activeStepId]?.[idx] && (
                              <div>
                                <input
                                  type="file"
                                  accept="video/*"
                                  className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    
                                    const fileName = file.name;
                                    
                                    // Read file content as base64
                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                      const base64Content = event.target?.result as string;
                                      
                                      // Store in responses
                                      handleResponseChange(idx, fileName);
                                      
                                      // Save to Databricks Knowledge Base
                                      const wisdomFileName = `Wisdom_${insightType}_Video_${fileName}`;
                                      const success = await handleSaveWisdomToDatabricks(
                                        wisdomFileName,
                                        base64Content,
                                        insightType,
                                        'Video',
                                        brand,
                                        projectType
                                      );
                                      
                                      if (success) {
                                        // Reset form to allow adding another item
                                        setResponses(prev => {
                                          const updated = { ...prev };
                                          delete updated[activeStepId];
                                          return updated;
                                        });
                                      }
                                    };
                                    
                                    reader.onerror = () => {
                                      alert('Failed to read video file. Please try again.');
                                    };
                                    
                                    reader.readAsDataURL(file);
                                  }}
                                />
                                <p className="text-amber-600 text-xs mt-1">
                                  Note: Large video files may exceed storage limits. Consider smaller files or shorter clips.
                                </p>
                                <button
                                  onClick={() => {
                                    setResponses(prev => ({
                                      ...prev,
                                      [activeStepId]: {
                                        ...prev[activeStepId],
                                        videoMethod: undefined
                                      }
                                    }));
                                  }}
                                  className="mt-2 text-sm text-blue-600 hover:underline"
                                >
                                  ← Back to options
                                </button>
                              </div>
                            )}
                            
                            {videoMethod === 'capture' && !responses[activeStepId]?.[idx] && stream && (
                              <div className="space-y-2">
                                <video
                                  ref={(video) => {
                                    if (video && stream) {
                                      video.srcObject = stream;
                                      video.play();
                                    }
                                  }}
                                  className="w-full rounded border-2 border-gray-300"
                                  autoPlay
                                  playsInline
                                  muted
                                />
                                
                                {!isRecording && mediaRecorder && mediaRecorder.state === 'inactive' && (
                                  <button
                                    onClick={() => {
                                      if (mediaRecorder) {
                                        mediaRecorder.start();
                                        setIsRecording(true);
                                      }
                                    }}
                                    className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-2"
                                  >
                                    <Video className="w-5 h-5" />
                                    Start Recording
                                  </button>
                                )}
                                
                                {isRecording && (
                                  <div className="bg-red-50 border-2 border-red-500 rounded p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                                      <span className="text-red-700 font-medium">Recording...</span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        if (mediaRecorder && mediaRecorder.state === 'recording') {
                                          mediaRecorder.onstop = async () => {
                                            const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
                                            
                                            // Store blob for preview
                                            setRecordedVideoBlob(videoBlob);
                                            
                                            // Stop camera
                                            stream.getTracks().forEach(track => track.stop());
                                            setStream(null);
                                            setIsRecording(false);
                                            setMediaRecorder(null);
                                            setRecordedChunks([]);
                                          };
                                          
                                          mediaRecorder.stop();
                                        }
                                      }}
                                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                                    >
                                      <StopCircle className="w-4 h-4" />
                                      Stop
                                    </button>
                                  </div>
                                )}
                                
                                {!isRecording && (
                                  <button
                                    onClick={() => {
                                      stream.getTracks().forEach(track => track.stop());
                                      setStream(null);
                                      setMediaRecorder(null);
                                      setRecordedChunks([]);
                                      setResponses(prev => ({
                                        ...prev,
                                        [activeStepId]: {
                                          ...prev[activeStepId],
                                          videoMethod: undefined
                                        }
                                      }));
                                    }}
                                    className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            )}
                            
                            {/* Video Preview */}
                            {recordedVideoBlob && !responses[activeStepId]?.[idx] && (
                              <div className="space-y-3">
                                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                                  <p className="text-sm font-medium text-blue-900 mb-3">Preview your video:</p>
                                  <video 
                                    controls 
                                    src={URL.createObjectURL(recordedVideoBlob)}
                                    className="w-full rounded"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={async () => {
                                      // Convert blob to base64
                                      const reader = new FileReader();
                                      reader.onload = async () => {
                                        const base64Content = reader.result as string;
                                        const fileName = `Wisdom_${insightType}_Video_${Date.now()}.webm`;
                                        
                                        // Store in responses
                                        handleResponseChange(idx, fileName);
                                        
                                        // Save to Databricks Knowledge Base
                                        const success = await handleSaveWisdomToDatabricks(
                                          fileName,
                                          base64Content,
                                          insightType,
                                          'Video',
                                          brand,
                                          projectType
                                        );
                                        
                                        if (success) {
                                          setRecordedVideoBlob(null);
                                          // Reset form to allow adding another item
                                          setResponses(prev => {
                                            const updated = { ...prev };
                                            delete updated[activeStepId];
                                            return updated;
                                          });
                                        }
                                      };
                                      
                                      reader.readAsDataURL(recordedVideoBlob);
                                    }}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
                                  >
                                    <CheckCircle className="w-5 h-5" />
                                    Save to Knowledge Base
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRecordedVideoBlob(null);
                                      setResponses(prev => ({
                                        ...prev,
                                        [activeStepId]: {
                                          ...prev[activeStepId],
                                          videoMethod: undefined
                                        }
                                      }));
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center justify-center gap-2"
                                  >
                                    <X className="w-5 h-5" />
                                    Re-record
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {responses[activeStepId]?.[idx] && (
                              <div className="bg-green-50 border border-green-200 rounded p-2">
                                <p className="text-sm text-green-700">
                                  ✓ Saved: {responses[activeStepId][idx]}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      // File upload
                      if (inputMethod === 'File') {
                        return (
                          <div key={idx} className="mb-2">
                            <label className="block text-gray-900 mb-1 flex items-start justify-between">
                              <span>Share Your Wisdom</span>
                              {hasResponse && (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              )}
                            </label>
                            
                            <div className="space-y-2">
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                                multiple
                                className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                                onChange={async (e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (files.length === 0) return;
                                  
                                  // Process each file
                                  for (const file of files) {
                                    const fileName = file.name;
                                    
                                    // Read file content as base64
                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                      const base64Content = event.target?.result as string;
                                      
                                      // Save to Databricks Knowledge Base
                                      const wisdomFileName = `Wisdom_${insightType}_File_${fileName}`;
                                      await handleSaveWisdomToDatabricks(
                                        wisdomFileName,
                                        base64Content,
                                        insightType,
                                        'File',
                                        brand,
                                        projectType
                                      );
                                    };
                                    
                                    reader.onerror = () => {
                                      alert('Failed to read file. Please try again.');
                                    };
                                    
                                    reader.readAsDataURL(file);
                                  }
                                  
                                  // Store file names in responses
                                  const fileNames = files.map(f => f.name).join(', ');
                                  handleResponseChange(idx, fileNames);
                                  
                                  // Reset the input to allow re-uploading
                                  e.target.value = '';
                                }}
                              />
                              <p className="text-gray-600 text-xs">
                                Supported formats: PDF, Word, Excel, PowerPoint, Text, CSV (multiple files allowed)
                              </p>
                              {responses[activeStepId]?.[idx] && (
                                <div className="bg-green-50 border border-green-200 rounded p-2">
                                  <p className="text-sm text-green-700">
                                    ✓ Uploaded: {responses[activeStepId][idx]}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Be Interviewed
                      if (inputMethod === 'Interview') {
                        return (
                          <div key={idx} className="mb-2">
                            <label className="block text-gray-900 mb-1 flex items-start justify-between">
                              <span>Share Your Wisdom</span>
                              {hasResponse && (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              )}
                            </label>
                            
                            <div className="space-y-4 border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-xl">🎤</span>
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-medium text-gray-900 mb-2">AI Interview Session</h3>
                                  <p className="text-sm text-gray-700 mb-2">
                                    Our AI interviewer will ask you questions about your {insightType.toLowerCase()} insights. 
                                    This conversational approach helps extract deeper wisdom through guided discussion.
                                  </p>
                                  
                                  {/* Requirements notice */}
                                  <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
                                    <p className="text-xs text-blue-800">
                                      <strong>Requires:</strong> Databricks authentication + Model Serving endpoint configured
                                    </p>
                                  </div>
                                  
                                  {!hasResponse ? (
                                    <button
                                      onClick={() => {
                                        // Check authentication first
                                        if (!isDatabricksAuthenticated) {
                                          alert('⚠️ Please sign in to Databricks before starting an interview.\n\nClick the "Sign In" button in the header to authenticate.');
                                          setShowLoginModal(true);
                                          return;
                                        }

                                        // Set interview context
                                        setInterviewContext({
                                          insightType: insightType as 'Brand' | 'Category' | 'General',
                                          brand: brand || undefined,
                                          projectType: projectType || undefined
                                        });
                                        
                                        // Open interview dialog
                                        setShowInterviewDialog(true);
                                      }}
                                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
                                    >
                                      <Mic className="w-5 h-5" />
                                      Start Interview
                                    </button>
                                  ) : (
                                    <div className="bg-white border border-purple-200 rounded p-3">
                                      <p className="text-sm text-purple-700">
                                        {responses[activeStepId]?.[idx]}
                                      </p>
                                      <button
                                        onClick={() => {
                                          handleResponseChange(idx, '');
                                        }}
                                        className="mt-2 text-sm text-purple-600 hover:underline"
                                      >
                                        Start new interview
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="border-t border-purple-200 pt-3">
                                <p className="text-xs text-gray-600">
                                  <strong>How it works:</strong> The AI interviewer adapts questions based on your responses, 
                                  helping you articulate insights you might not have considered. Sessions typically last 10-15 minutes.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // Fallback for unhandled input methods
                      return null;
                    }
                  }
                  
                  // Special handling for Enter Brand question (dropdown)
                  if (activeStepId === 'Enter' && idx === 0 && question === 'Brand') {
                    return (
                      <div key={idx} className="mb-2">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-gray-900 whitespace-nowrap">
                            <span>{idx + 1}. {question}</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <select
                            className={`flex-1 border-2 ${showError ? 'border-red-300' : 'border-gray-300'} bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500`}
                            value={responses[activeStepId]?.[idx] || ''}
                            onChange={(e) => handleResponseChange(idx, e.target.value)}
                          >
                            <option value="">-- Select a Brand --</option>
                            {availableBrands.map((brand, brandIdx) => (
                              <option key={brandIdx} value={brand}>
                                {brand}
                              </option>
                            ))}
                          </select>
                        </div>
                        {showError && (
                          <p className="text-red-600 text-sm mt-1">Please select a brand</p>
                        )}
                      </div>
                    );
                  }

                  // Special handling for Enter Project Type question (dropdown)
                  if (activeStepId === 'Enter' && idx === 1 && question === 'Project Type') {
                    return (
                      <div key={idx} className="mb-2">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-gray-900 whitespace-nowrap">
                            <span>{idx + 1}. {question}</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <select
                            className={`flex-1 border-2 ${showError ? 'border-red-300' : 'border-gray-300'} bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500`}
                            value={responses[activeStepId]?.[idx] || ''}
                            onChange={(e) => handleResponseChange(idx, e.target.value)}
                          >
                            <option value="">-- Select a Project Type --</option>
                            {availableProjectTypes.map((type, typeIdx) => (
                              <option key={typeIdx} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>
                        {showError && (
                          <p className="text-red-600 text-sm mt-1">Please select a project type</p>
                        )}
                      </div>
                    );
                  }

                  // Filename for this iteration: Use input with suggested filename pre-filled
                  if (activeStepId === 'Enter' && idx === 2 && question === 'Filename for this iteration') {
                    const brand = responses['Enter']?.[0];
                    const projectType = responses['Enter']?.[1];
                    const currentFileName = responses[activeStepId]?.[idx] || '';
                    
                    // Generate suggested filename with versioning
                    let suggestedFileName = '';
                    if (brand && projectType) {
                      // Generate base filename with date
                      const baseFileName = generateDefaultFileName(brand, projectType);
                      
                      // Check for existing iterations with same base name and add version
                      const matchingFiles = projectFiles.filter(file => 
                        file.brand === brand && 
                        file.projectType === projectType &&
                        file.fileName.startsWith(baseFileName)
                      );
                      
                      if (matchingFiles.length > 0) {
                        // Find highest version number
                        let highestVersion = 0;
                        matchingFiles.forEach(file => {
                          // Check for _v1, _v2, etc. at the end
                          const versionMatch = file.fileName.match(/_v(\d+)$/);
                          if (versionMatch) {
                            const version = parseInt(versionMatch[1], 10);
                            if (version > highestVersion) {
                              highestVersion = version;
                            }
                          } else if (file.fileName === baseFileName) {
                            // File without version number counts as v1
                            highestVersion = Math.max(highestVersion, 1);
                          }
                        });
                        
                        // Increment to next version
                        suggestedFileName = `${baseFileName}_v${highestVersion + 1}`;
                      } else {
                        // No existing files, no version suffix needed
                        suggestedFileName = baseFileName;
                      }
                      
                      // Auto-fill the filename only if field is empty
                      if (suggestedFileName && !currentFileName) {
                        setTimeout(() => {
                          handleResponseChange(idx, suggestedFileName);
                        }, 0);
                      }
                    }
                    
                    return (
                      <div key={idx} className="mb-2">
                        <label className="block text-gray-900 mb-1 flex items-start justify-between">
                          <span>{idx + 1}. {question}</span>
                          {hasResponse && (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          )}
                        </label>
                        <input
                          type="text"
                          className={`w-full border-2 ${showError ? 'border-red-300' : 'border-gray-300'} bg-white rounded p-2 text-gray-700 font-mono focus:outline-none focus:border-blue-500`}
                          value={responses[activeStepId]?.[idx] || suggestedFileName}
                          onChange={(e) => handleResponseChange(idx, e.target.value)}
                          placeholder={suggestedFileName}
                        />
                        <p className="text-gray-600 text-xs mt-1">
                          You can edit this filename or keep the suggested name
                        </p>
                        {showError && (
                          <p className="text-red-600 text-sm mt-1">Please enter a filename</p>
                        )}
                      </div>
                    );
                  }

                  // Special handling for Findings step
                  if (activeStepId === 'Findings') {
                    const brand = responses['Enter']?.[0]?.trim();
                    const projectType = responses['Enter']?.[1]?.trim();
                    const currentFileName = responses['Enter']?.[2]?.trim();
                    const findingsChoice = responses['Findings']?.[0];
                    
                    // Check if any hexes after Enter have been executed
                    const workflowHexes = ['research', 'Luminaries', 'panelist', 'Consumers', 'competitors', 'Colleagues', 'cultural', 'social', 'Grade'];
                    const hasHexExecutions = workflowHexes.some(hexId => {
                      const executions = hexExecutions[hexId];
                      return executions && executions.length > 0;
                    });
                    
                    // Question 1: Save Iteration or Summarize (radio buttons)
                    if (idx === 0 && question === 'Save Iteration or Summarize') {
                      return (
                        <div key={idx} className="mb-2">
                          <label className="block text-gray-900 mb-1 flex items-start justify-between">
                            <span>{idx + 1}. {question}</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <div className="space-y-1">
                            {hasHexExecutions && (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="findingsChoice"
                                  value="Save Iteration"
                                  checked={responses[activeStepId]?.[idx] === 'Save Iteration'}
                                  onChange={async (e) => {
                                    handleResponseChange(idx, e.target.value);
                                    // If Save Iteration, save to Databricks and add file to projectFiles
                                    if (e.target.value === 'Save Iteration' && brand && projectType && currentFileName) {
                                      // Check authentication first
                                      if (!isDatabricksAuthenticated) {
                                        alert('⚠️ Please sign in to Databricks before saving to the Knowledge Base.\n\nClick the "Sign In" button in the header to authenticate.');
                                        setShowLoginModal(true);
                                        handleResponseChange(idx, ''); // Clear the selection
                                        return;
                                      }

                                      // Save the CURRENT filename (not incremented)
                                      const newFile: ProjectFile = {
                                        brand,
                                        projectType,
                                        fileName: currentFileName,
                                        timestamp: Date.now()
                                      };
                                      
                                      // Prepare content
                                      const content = JSON.stringify({
                                        responses,
                                        hexExecutions,
                                        completedSteps: Array.from(completedSteps)
                                      });
                                      
                                      // Create File object for upload
                                      const blob = new Blob([content], { type: 'application/json' });
                                      const file = createFileFromBlob(blob, currentFileName);
                                      
                                      // Determine scope
                                      let scope: 'general' | 'category' | 'brand' = 'brand';
                                      if (!brand) {
                                        scope = projectType ? 'category' : 'general';
                                      }
                                      
                                      // Upload to Databricks Knowledge Base with iteration metadata
                                      // Note: Only set brand for brand scope, not for category or general
                                      const result = await uploadToKnowledgeBase({
                                        file,
                                        scope,
                                        category: projectType,
                                        brand: scope === 'brand' ? brand : undefined, // Only set brand for brand scope
                                        projectType: projectType || undefined,
                                        fileType: 'Findings',
                                        tags: ['Iteration', brand, projectType].filter(Boolean) as string[],
                                        iterationType: 'iteration',
                                        includedHexes: Array.from(completedSteps),
                                        userEmail: userEmail,
                                        userRole,
                                      });
                                      
                                      if (result.success) {
                                        console.log('✅ Iteration saved to Databricks Knowledge Base:', currentFileName);
                                        alert(`✅ Upload successful! Iteration saved to the Knowledge Base.`);
                                        
                                        // Also keep in localStorage for local reference
                                        const updatedFiles = [...projectFiles, newFile];
                                        setProjectFiles(updatedFiles);
                                        localStorage.setItem('cohive_projects', JSON.stringify(updatedFiles));
                                        
                                        // Mark iteration as saved
                                        setIterationSaved(true);
                                        localStorage.setItem('cohive_iteration_saved', 'true');
                                      } else {
                                        alert(`Failed to save to Databricks: ${result.error || 'Unknown error'}`);
                                      }
                                    }
                                  }}
                                  className="w-4 h-4"
                                />
                                <span className="text-gray-700">Save Iteration</span>
                              </label>
                            )}
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="findingsChoice"
                                value="Summarize"
                                checked={responses[activeStepId]?.[idx] === 'Summarize'}
                                onChange={(e) => handleResponseChange(idx, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Summarize</span>
                            </label>
                          </div>
                          {findingsChoice === 'Save Iteration' && currentFileName && (
                            <p className="text-green-600 text-sm mt-2">
                              ✓ File saved to Databricks user folder: {currentFileName}
                            </p>
                          )}
                          {!hasHexExecutions && findingsChoice !== 'Summarize' && (
                            <p className="text-amber-600 text-sm mt-2">
                              ℹ️ Save Iteration requires at least one workflow hex to be executed. Only Summarize is available.
                            </p>
                          )}
                        </div>
                      );
                    }
                    
                    // ONLY show remaining questions/details AFTER "Summarize" is selected
                    // This ensures Save Iteration and Summarize are shown first, then details appear
                    if (findingsChoice !== 'Summarize') {
                      return null;
                    }
                    
                    // Show suggested summary filename when Summarize is selected (replaces question 1)
                    if (findingsChoice === 'Summarize' && idx === 1 && question === 'Which files should we include in our findings?' && currentFileName) {
                      const suggestedSummaryName = getSummaryFileName(currentFileName);
                      
                      return (
                        <div key={idx}>
                          <div className="mb-2">
                            <label className="block text-gray-900 mb-1">
                              Suggested Summary Filename
                            </label>
                            <input
                              type="text"
                              className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                              value={responses[activeStepId]?.[`summaryFileName`] || suggestedSummaryName}
                              onChange={(e) => {
                                setResponses(prev => ({
                                  ...prev,
                                  [activeStepId]: {
                                    ...prev[activeStepId],
                                    summaryFileName: e.target.value,
                                    [3]: '' // Clear "Save or Download" selection when filename changes
                                  }
                                }));
                              }}
                              placeholder="Enter summary filename..."
                            />
                            <p className="text-sm text-gray-500 mt-1">
                              You can edit this filename or keep the suggested name
                            </p>
                          </div>
                          {/* Render the actual question */}
                          {(() => {
                            const matchingFiles = projectFiles
                              .filter(file => file.brand === brand && file.projectType === projectType)
                              .sort((a, b) => b.timestamp - a.timestamp); // Sort by date, most recent first
                            const selectedFiles = responses[activeStepId]?.[idx]?.split(',').filter(Boolean) || [];
                            
                            return (
                              <div className="mb-2">
                                <label className="block text-gray-900 mb-1 flex items-start justify-between">
                                  <span>{idx + 1}. {question}</span>
                                  {responses[activeStepId]?.[idx]?.trim().length > 0 && (
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                  )}
                                </label>
                                <div className="border-2 border-gray-300 rounded p-2 bg-white max-h-40 overflow-y-auto">
                                  {matchingFiles.length > 0 ? (
                                    matchingFiles.map((file, fileIdx) => (
                                      <label key={fileIdx} className="flex items-center gap-2 cursor-pointer py-1">
                                        <input
                                          type="checkbox"
                                          checked={selectedFiles.includes(file.fileName)}
                                          onChange={(e) => {
                                            let newSelected = [...selectedFiles];
                                            if (e.target.checked) {
                                              newSelected.push(file.fileName);
                                            } else {
                                              newSelected = newSelected.filter(f => f !== file.fileName);
                                            }
                                            handleResponseChange(idx, newSelected.join(','));
                                          }}
                                          className="w-4 h-4"
                                        />
                                        <span className="text-gray-700">
                                          {file.fileName} ({new Date(file.timestamp).toLocaleDateString()})
                                        </span>
                                      </label>
                                    ))
                                  ) : (
                                    <p className="text-gray-500 text-sm">No files found for {brand} - {projectType}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    }
                    
                    // Question 2: Which files should we include in our findings?
                    if (idx === 1 && question === 'Which files should we include in our findings?') {
                      const matchingFiles = projectFiles
                        .filter(file => file.brand === brand && file.projectType === projectType)
                        .sort((a, b) => b.timestamp - a.timestamp); // Sort by date, most recent first
                      const selectedFiles = responses[activeStepId]?.[idx]?.split(',').filter(Boolean) || [];
                      
                      return (
                        <div key={idx} className="mb-2">
                          <label className="block text-gray-900 mb-1 flex items-start justify-between">
                            <span>{idx + 1}. {question}</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <div className="border-2 border-gray-300 rounded p-2 bg-white max-h-40 overflow-y-auto">
                            {matchingFiles.length > 0 ? (
                              matchingFiles.map((file, fileIdx) => (
                                <label key={fileIdx} className="flex items-center gap-2 cursor-pointer py-1">
                                  <input
                                    type="checkbox"
                                    checked={selectedFiles.includes(file.fileName)}
                                    onChange={(e) => {
                                      let newSelected = [...selectedFiles];
                                      if (e.target.checked) {
                                        newSelected.push(file.fileName);
                                      } else {
                                        newSelected = newSelected.filter(f => f !== file.fileName);
                                      }
                                      handleResponseChange(idx, newSelected.join(','));
                                    }}
                                    className="w-4 h-4 flex-shrink-0"
                                  />
                                  <span className="text-gray-700">
                                    {file.fileName} ({new Date(file.timestamp).toLocaleDateString()})
                                  </span>
                                </label>
                              ))
                            ) : (
                              <p className="text-gray-500 text-sm">No files found for {brand} - {projectType}</p>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    // Question 3: Output Options (checkboxes)
                    if (idx === 2 && question === 'Output Options') {
                      const selectedOptions = responses[activeStepId]?.[idx]?.split(',').filter(Boolean) || [];
                      const options = [
                        'Executive Summary',
                        'Share all Ideas as a list',
                        'Provide a grid with all "final" ideas with their scores',
                        'Include Gems',
                        'Include User Notes from all iterations as an Appendix'
                      ];
                      
                      return (
                        <div key={idx} className="mb-2">
                          <label className="block text-gray-900 mb-1 flex items-start justify-between">
                            <span>{idx + 1}. {question}</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <div className="space-y-1">
                            {options.map((option, optIdx) => (
                              <label key={optIdx} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedOptions.includes(option)}
                                  onChange={(e) => {
                                    let newSelected = [...selectedOptions];
                                    if (e.target.checked) {
                                      newSelected.push(option);
                                    } else {
                                      newSelected = newSelected.filter(o => o !== option);
                                    }
                                    handleResponseChange(idx, newSelected.join(','));
                                  }}
                                  className="w-4 h-4 flex-shrink-0"
                                />
                                <span className="text-gray-700">{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    
                    // Question 4: Save or Download (radio buttons)
                    if (idx === 3 && question === 'Save or Download') {
                      return (
                        <div key={idx} className="mb-2">
                          <label className="block text-gray-900 mb-1 flex items-start justify-between">
                            <span>{idx + 1}. {question}</span>
                            {hasResponse && (
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </label>
                          <div className="space-y-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="saveOrDownload"
                                value="SaveWorkspace"
                                checked={responses[activeStepId]?.[idx] === 'SaveWorkspace'}
                                onChange={(e) => {
                                  handleResponseChange(idx, e.target.value);
                                  // Open Databricks file saver to save file to Databricks workspace
                                  if (e.target.value === 'SaveWorkspace' && brand && projectType) {
                                    const summaryFileName = responses[activeStepId]?.['summaryFileName'] || getSummaryFileName(currentFileName || '');
                                    if (summaryFileName) {
                                      const summaryData = {
                                        brand,
                                        projectType,
                                        fileName: summaryFileName,
                                        timestamp: Date.now(),
                                        responses,
                                        selectedFiles: responses[activeStepId]?.[1]?.split(',').filter(Boolean) || [],
                                        outputOptions: responses[activeStepId]?.[2]?.split(',').filter(Boolean) || [],
                                        hexExecutions,
                                        completedSteps: Array.from(completedSteps)
                                      };
                                      
                                      const fileName = summaryFileName.endsWith('.json') ? summaryFileName : `${summaryFileName}.json`;
                                      const content = JSON.stringify(summaryData, null, 2);
                                      
                                      setFileSaverData({ fileName, content });
                                      setShowFileSaver(true);
                                      
                                      // Clear the radio button selection so it can be used again
                                      handleResponseChange(idx, '');
                                    }
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Save to Databricks Workspace</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="saveOrDownload"
                                value="Download"
                                checked={responses[activeStepId]?.[idx] === 'Download'}
                                onChange={(e) => {
                                  handleResponseChange(idx, e.target.value);
                                  // Download the summary file to user's computer
                                  if (e.target.value === 'Download' && brand && projectType) {
                                    const summaryFileName = responses[activeStepId]?.['summaryFileName'] || getSummaryFileName(currentFileName || '');
                                    if (summaryFileName) {
                                      const summaryData = {
                                        brand,
                                        projectType,
                                        fileName: summaryFileName,
                                        timestamp: Date.now(),
                                        responses,
                                        selectedFiles: responses[activeStepId]?.[1]?.split(',').filter(Boolean) || [],
                                        outputOptions: responses[activeStepId]?.[2]?.split(',').filter(Boolean) || [],
                                        hexExecutions,
                                        completedSteps: Array.from(completedSteps)
                                      };
                                      
                                      downloadFile(
                                        summaryFileName.endsWith('.json') ? summaryFileName : `${summaryFileName}.json`,
                                        JSON.stringify(summaryData, null, 2),
                                        'application/json'
                                      );
                                      
                                      alert('✅ Summary downloaded to your computer!');
                                      
                                      // Clear the radio button selection so it can be used again
                                      handleResponseChange(idx, '');
                                    }
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-700">Download to Computer</span>
                            </label>
                          </div>
                        </div>
                      );
                    }
                  }
                  
                  // Default textarea for all other questions
                  return (
                    <div key={idx} className="mb-2">
                      <label className="block text-gray-900 mb-1 flex items-start justify-between">
                        <span>
                          {idx + 1}. {question}
                        </span>
                        {hasResponse && (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                      </label>
                      <textarea 
                        className={`w-full h-20 border-2 ${showError ? 'border-red-300' : 'border-gray-300'} bg-white rounded p-2 text-gray-700 resize-none focus:outline-none focus:border-blue-500`}
                        placeholder="Enter your response..."
                        value={responses[activeStepId]?.[idx] || ''}
                        onChange={(e) => handleResponseChange(idx, e.target.value)}
                      />
                      {showError && (
                        <p className="text-red-600 text-sm mt-1">This question is required</p>
                      )}
                    </div>
                  );
                })}
              </>
            )}
              </div>
            </div>
          </div>

          {/* User Notes Sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white border-2 border-gray-300 rounded-lg p-4" style={{ height: '650px' }}>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-gray-600" />
                <h3 className="text-gray-900">User Notes</h3>
              </div>
              <textarea 
                className="w-full border-2 border-gray-300 bg-gray-50 rounded p-2 text-sm resize-none"
                style={{ height: 'calc(650px - 80px)' }}
                placeholder="Add notes to be saved with each iteration..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Databricks OAuth Login Modal */}
      <DatabricksOAuthLogin
        open={showLoginModal}
        currentStep={activeStepId}
        onClose={() => {
          setShowLoginModal(false);
          // Recheck auth status after modal closes
          setTimeout(() => {
            const authenticated = isAuthenticated();
            setIsDatabricksAuthenticated(authenticated);
          }, 500);
        }}
      />

      {/* Databricks File Saver */}
      {fileSaverData && (
        <DatabricksFileSaver
          open={showFileSaver}
          onClose={() => {
            setShowFileSaver(false);
            setFileSaverData(null);
          }}
          fileName={fileSaverData.fileName}
          fileContent={fileSaverData.content}
          onSaveSuccess={(path) => {
            console.log('File saved successfully to:', path);
          }}
        />
      )}

      {/* Interview Dialog */}
      <InterviewDialog
        open={showInterviewDialog}
        onClose={() => {
          setShowInterviewDialog(false);
        }}
        onComplete={() => {
          // Mark interview as completed in responses
          if (activeStepId === 'Wisdom') {
            handleResponseChange(2, 'Interview completed and saved to Knowledge Base');
          }
        }}
        insightType={interviewContext.insightType}
        brand={interviewContext.brand}
        projectType={interviewContext.projectType}
        userEmail={userEmail}
        userRole={userRole}
        onSaveTranscript={async (transcript: string, fileName: string) => {
          try {
            // Create a File object from the transcript
            const blob = new Blob([transcript], { type: 'text/plain' });
            const file = createFileFromBlob(blob, fileName);
            
            // Determine scope based on insight type
            let scope: 'general' | 'category' | 'brand';
            if (interviewContext.insightType === 'General') {
              scope = 'general';
            } else if (interviewContext.insightType === 'Category') {
              scope = 'category';
            } else {
              scope = 'brand';
            }
            
            // Upload to Databricks Knowledge Base
            // Note: Only set brand for brand scope, not for category or general
            const result = await uploadToKnowledgeBase({
              file,
              scope,
              category: interviewContext.projectType,
              brand: scope === 'brand' ? interviewContext.brand : undefined, // Only set brand for brand scope
              projectType: interviewContext.projectType,
              fileType: 'Wisdom',
              tags: [interviewContext.insightType, 'Interview'],
              insightType: interviewContext.insightType,
              inputMethod: 'Interview',
              userEmail: userEmail,
              userRole,
            });

            if (result.success) {
              alert(`✅ Upload successful! Interview transcript saved to the Knowledge Base.`);
            }

            return result.success;
          } catch (err) {
            console.error('Failed to save interview transcript:', err);
            return false;
          }
        }}
      />

      {/* Assessment Modal */}
      {assessmentModalOpen && assessmentModalProps && (
        <AssessmentModal
          isOpen={assessmentModalOpen}
          onClose={() => setAssessmentModalOpen(false)}
          hexId={assessmentModalProps.hexId}
          hexLabel={assessmentModalProps.hexLabel}
          assessmentType={assessmentModalProps.assessmentType}
          selectedPersonas={assessmentModalProps.selectedPersonas}
          kbFileNames={assessmentModalProps.kbFileNames}
          researchFiles={researchFiles}
          brand={assessmentModalProps.brand}
          projectType={assessmentModalProps.projectType}
          userSolution={assessmentModalProps.userSolution}
          userEmail={userEmail}
          ideasFile={assessmentModalProps.ideasFile}
        />
      )}
    </div>
  );
}
