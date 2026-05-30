import { Database, Cpu, GitBranch, BarChart3, Rocket, CirclePlay, Settings, FileText, Users, Globe, MessageSquare, TestTube2, CircleCheck, Save, CircleAlert, User, Download, Upload, RotateCcw, Mic, Camera } from 'lucide-react';
import { ProcessFlow, processSteps } from './ProcessFlow';
import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { ResearchView } from './ResearchView';
import { TemplateManager, UserTemplate, defaultTemplates } from './TemplateManager';
import { ModelTemplateManager, ModelTemplate, defaultModelTemplates, getModelForExecution, type HexId, type PurposeId } from './ModelTemplateManager';
import { ResearcherModes } from './ResearcherModes';
import { CentralHexView } from './CentralHexView';
import { AIHelpWidget } from './AIHelpWidget';
import { DiagnosticPanel } from './DiagnosticPanel';
import { LogViewer } from './LogViewer';
import { ReviewView } from './ReviewView';
import { DatabricksOAuthLogin } from './DatabricksOAuthLogin';
import { DatabricksFileSaver } from './DatabricksFileSaver';
import { InterviewDialog } from './InterviewDialog';
import { PersonaInterviewDialog } from './PersonaInterviewDialog';
import { useMicDevices } from '../hooks/useMicDevices';
import { AssessmentModal, type IdeaElement, type IterationGem, type KbMode, type RequestMode, type Scope } from './AssessmentModal';
import { StoriesView } from './StoriesView';
import { StoryModal } from './StoryModal';
import type { StoryCategory, StorySubtype } from '../data/storyTypes';
import { UserNotesBox, type NoteEntry } from './UserNotesBox';
import type { ReviewItem } from './GemCheckCoalReviewPanel';
import { MarkdownViewer } from './MarkdownViewer';
import { LoadingGem, SpinHex } from './LoadingGem';
import cohiveLogo from 'figma:asset/88105c0c8621f3d41d65e5be3ae75558f9de1753.png';
import { uploadToKnowledgeBase, downloadFile, listKnowledgeBaseFiles, type KnowledgeBaseFile, generateSummary, fetchSharedConfig, addSharedConfigItem, fetchProjectTypeConfigs, fetchCustomPersonas, type ProjectTypeConfig, type CustomPersona } from '../utils/databricksAPI';
import { isAuthenticated, getCurrentUserEmail, getValidSession } from '../utils/databricksAuth';
import { generateIterationFileName, loadSessionVersions, saveSessionVersions, startNewVersionRun, type SessionVersion } from '../utils/sessionVersioning';
import { systemProjectTypes, isSystemProjectType } from '../data/systemProjectTypes';
import { stepContentData, type StepContent } from '../data/stepContentData';
import { extractIdeasFromHexResults, buildGradeScoringPrompt, parseGradeResults, resolveGradeSegments, formatGradeForIteration, type GradeResults } from '../utils/gradeExtraction';
import { executeAIPrompt } from '../utils/databricksAI';

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
  content?: string;
  source?: string;
  scope?: 'general' | 'category' | 'brand';
  contentSummary?: string;
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
  assessmentType: string[];
  assessment: string;
  timestamp: number;
}

interface HexExecutions {
  [hexId: string]: HexExecution[];
}

// ── v3: AssessmentModal props type (extended) ─────────────────────────────────

interface AssessmentModalPropsState {
  hexId: string;
  hexLabel: string;
  assessmentType: string;
  selectedPersonas: string[];
  kbFileNames: string[];
  userSolution: string;
  ideasFile: { fileName: string; content: string; fileType: string } | null;
  brand: string;
  projectType: string;
  modelEndpoint?: string;
  factCheckerModelEndpoint?: string;
  // v3 additions — derived from Enter hex state before opening modal
  requestMode: RequestMode;
  ideaElements: IdeaElement[];
  kbMode?: KbMode;       // optional pre-set; user selects in modal if not provided
  scope?: 'brand' | 'category' | 'general'; // optional pre-set
  numDebateRounds?: number;
  /** All hex executions for this iteration — passed to AssessmentModal for context injection */
  hexExecutions: Record<string, HexExecution[]>;
  canManageExamples?: boolean;
  customPersonaData?: Record<string, unknown>;
}

// iterationGems lives at ProcessWireframe level — see useState below

// ─── Word doc utilities ───────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function textToWordHtml(title: string, text: string): string {
  const lines = text.split('\n');
  let body = `<h1>${escapeHtml(title)}</h1>\n`;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^={40,}$/.test(line)) {
      // Divider line — next line is a section heading
      i++;
      const heading = (lines[i] || '').trim();
      if (heading) body += `<h2>${escapeHtml(heading)}</h2>\n`;
    } else if (/^-{3,}\s*Run \d+/.test(line)) {
      body += `<h3>${escapeHtml(line.replace(/^-+\s*/, '').replace(/\s*-+$/, ''))}</h3>\n`;
    } else if (line.trim() === '') {
      body += '<p>&nbsp;</p>\n';
    } else {
      let fmt = escapeHtml(line);
      if (fmt.startsWith('### ')) { body += `<h4>${fmt.slice(4)}</h4>\n`; }
      else if (fmt.startsWith('## ')) { body += `<h3>${fmt.slice(3)}</h3>\n`; }
      else if (fmt.startsWith('# ')) { body += `<h2>${fmt.slice(2)}</h2>\n`; }
      else {
        fmt = fmt.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
        body += `<p>${fmt}</p>\n`;
      }
    }
    i++;
  }
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.6;margin:2cm}h1{font-size:18pt;border-bottom:2px solid #333;padding-bottom:6px}h2{font-size:13pt;color:#222;border-bottom:1px solid #ccc;padding-bottom:3px;margin-top:18pt}h3{font-size:11pt;color:#444;margin-top:12pt}h4{font-size:10pt;color:#555}p{margin:3pt 0}strong{font-weight:bold}em{font-style:italic}</style></head><body>${body}</body></html>`;
}

function downloadWordDoc(fileName: string, textContent: string): void {
  const baseName = fileName.replace(/\.(txt|json|doc|docx)$/i, '');
  const html = textToWordHtml(baseName, textContent);
  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${baseName}.doc`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

function createWordDocFile(fileName: string, textContent: string): File {
  const baseName = fileName.replace(/\.(txt|json|doc|docx)$/i, '');
  const html = textToWordHtml(baseName, textContent);
  return new File([html], `${baseName}.doc`, { type: 'application/msword' });
}

export default function ProcessWireframe() {
  const [activeStepId, setActiveStepId] = useState<string>('Enter');
  const [responses, setResponses] = useState<StepResponses>({});
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = useState<string>('');
  const [showDiagnosticPanel, setShowDiagnosticPanel] = useState(false);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [showPersonaInterviewDialog, setShowPersonaInterviewDialog] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [ideasFiles, setIdeasFiles] = useState<IdeasFile[]>([]);
  const [researchFiles, setResearchFiles] = useState<ResearchFile[]>([]);
  const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>([]);
  const [editSuggestions, setEditSuggestions] = useState<EditSuggestion[]>([]);
  const [hexExecutions, setHexExecutions] = useState<{ [hexId: string]: HexExecution[] }>({});
  const [showValidation, setShowValidation] = useState(false);
  const [selectedResearchFiles, setSelectedResearchFiles] = useState<string[]>([]);

  const [lastAssessmentResults, setLastAssessmentResults] = useState<{
    rounds: any[];
    citedFiles: any[];
    summary: string | null;
    hexId: string;
    hexLabel: string;
  } | null>(null);

  // Gems accumulated across all modal opens within the current iteration.
  // Cleared when the user saves an iteration or returns to Enter hex.
  const [iterationGems, setIterationGems] = useState<IterationGem[]>([]);
  const [iterationChecks, setIterationChecks] = useState<Array<{ text: string; hexId: string; hexLabel: string }>>([]);
  const [iterationCoal, setIterationCoal] = useState<Array<{ text: string; hexId: string; hexLabel: string }>>([]);
  const [iterationDirections, setIterationDirections] = useState<string[]>([]);

  // Grade hex scoring state — cleared with iteration
  const [gradeExtractedIdeas, setGradeExtractedIdeas] = useState<string[]>([]);
  const [gradeIdeasLoading, setGradeIdeasLoading] = useState(false);
  const [gradeScoreResults, setGradeScoreResults] = useState<GradeResults | null>(null);
  const [gradeScoring, setGradeScoring] = useState(false);
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [noteEntries, setNoteEntries] = useState<NoteEntry[]>([{ id: 'init-note', type: 'note', text: '' }]);

  // Assessment Modal state
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [assessmentModalProps, setAssessmentModalProps] = useState<AssessmentModalPropsState | null>(null);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [storyModalParams, setStoryModalParams] = useState<{
    category: StoryCategory;
    subtype: StorySubtype;
    selectedValues: string[];
    selectedEmotions: string[];
  } | null>(null);

  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showModelTemplateManager, setShowModelTemplateManager] = useState(false);
  const [userRole, setUserRole] = useState<'administrator' | 'research-analyst' | 'research-leader' | 'data-scientist' | 'marketing-manager' | 'product-manager' | 'executive-stakeholder'>('marketing-manager');
  // Role fetched from Databricks for non-cohivesolutions users — overrides template role
  const [databricksRole, setDatabricksRole] = useState<string | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<UserTemplate | null>(null);
  const [modelTemplates, setModelTemplates] = useState<ModelTemplate[]>([]);
  const [currentModelTemplateId, setCurrentModelTemplateId] = useState<string>('');
  const [currentModelTemplate, setCurrentModelTemplate] = useState<ModelTemplate | null>(null);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableProjectTypes, setAvailableProjectTypes] = useState<string[]>([]);
  const [projectTypeConfigs, setProjectTypeConfigs] = useState<ProjectTypeConfig[]>([]);
  const [iterationSaved, setIterationSaved] = useState<boolean>(false);
  const [lastSavedFileName, setLastSavedFileName] = useState<string>(
    () => localStorage.getItem('cohive_last_iteration_filename') || ''
  );
  const [isDatabricksAuthenticated, setIsDatabricksAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showFileSaver, setShowFileSaver] = useState<boolean>(false);
  const [fileSaverData, setFileSaverData] = useState<{ fileName: string; content: string } | null>(null);
  const [userEmail, setUserEmail] = useState<string>('unknown@databricks.com');
  const [showMarkdownViewer, setShowMarkdownViewer] = useState<boolean>(false);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [markdownTitle, setMarkdownTitle] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [isSavingIteration, setIsSavingIteration] = useState<boolean>(false);
  
  const [sessionVersions, setSessionVersions] = useState<{ [key: string]: SessionVersion }>(loadSessionVersions());

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [captureMethod, setCaptureMethod] = useState<'upload' | 'capture' | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVoiceToText, setIsVoiceToText] = useState(false);
  
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [interviewContext, setInterviewContext] = useState<{
    insightType: 'Brand' | 'Category' | 'General';
    brand?: string;
    projectType?: string;
  }>({ insightType: 'General' });
  
  const [wisdomSuccessMessage, setWisdomSuccessMessage] = useState<string | null>(null);
  const [wisdomErrorMessage, setWisdomErrorMessage] = useState<string | null>(null);
  const [isWisdomSaving, setIsWisdomSaving] = useState(false);
  const [isDatabricksLoading, setIsDatabricksLoading] = useState(false);
  const [databricksLoadingMessage, setDatabricksLoadingMessage] = useState('Communicating with Databricks...');
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);

  const [hexWidgetContext, setHexWidgetContext] = useState<{
    files: string[];
    step: 1 | 2 | 3;
  }>({ files: [], step: 1 });
 
  const [researchMode, setResearchMode] = useState<string | null>(null);
  const [selectedKBFile, setSelectedKBFile] = useState<string | null>(null);
  const [pendingApprovalCount, setPendingApprovalCount] = useState<number>(0);
  const [wisdomInputMethod, setWisdomInputMethod] = useState<string | null>(null);
  const [wisdomCameraMode, setWisdomCameraMode] = useState<'photo' | 'video' | null>(null);
  const wisdomVideoRef = useRef<HTMLVideoElement>(null);
  const { devices: micDevices, selectedDeviceId: selectedMicDeviceId, setSelectedDeviceId: setSelectedMicDeviceId } = useMicDevices();
  
  const isBrowser = typeof window !== 'undefined';
  const hasMediaDevices = isBrowser && typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;

  // ── v3: Derive requestMode and ideaElements from Enter hex responses ────────

  /**
   * Reads the "Ideas Source" selection from responses['Enter'] and converts it
   * to the RequestMode type expected by AssessmentModal.
   *
   * Storage location: responses['Enter'][ideasSourceIdx]
   *   "Get Inspired"       → "get-inspired"
   *   "Load Current Ideas" → "load-ideas"
   *   anything else / undefined → "get-inspired" (safe default)
   */
  const deriveRequestMode = (): RequestMode => {
    const enterQuestions = getEnterQuestions();
    const ideasSourceIdx = enterQuestions.indexOf('Ideas Source');
    if (ideasSourceIdx === -1) return 'get-inspired'; // War Games or not yet shown
    const ideasChoice = responses['Enter']?.[ideasSourceIdx];
    return ideasChoice === 'Load Current Ideas' ? 'load-ideas' : 'get-inspired';
  };

  /**
   * When the user has loaded a current ideas file, build the IdeaElement array.
   * Currently CoHive supports a single ideas file at a time — returns a single-element
   * array. When multi-element comparison is supported, this can be extended.
   */
  const deriveIdeaElements = (brand: string, projectType: string): IdeaElement[] => {
    const requestMode = deriveRequestMode();
    if (requestMode !== 'load-ideas') return [];

    const ideasFile = getIdeasFile(brand, projectType);
    if (!ideasFile) return [];

    // Decode base64 content for the element
    let decodedContent = '';
    try {
      const b64 = ideasFile.content.includes(',')
        ? ideasFile.content.split(',')[1]
        : ideasFile.content;
      decodedContent = atob(b64);
    } catch {
      decodedContent = ideasFile.content; // fallback: use raw if decode fails
    }

    return [{
      id: `${brand}-${projectType}-ideas`,
      label: ideasFile.fileName,
      content: decodedContent,
    }];
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const generateDefaultFileName = (brand: string, projectType: string, creationDate?: number, editDate?: number) => {
    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    const cleanName = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '');
    const brandPart = cleanName(brand) || 'Brand';
    const projectTypePart = cleanName(projectType) || 'ProjectType';
    const creationPart = formatDate(creationDate || Date.now());
    const editPart = editDate ? `_${formatDate(editDate)}` : '';
    return `${brandPart}_${projectTypePart}_${creationPart}${editPart}`;
  };

  const createFileFromBlob = (blob: Blob, fileName: string): File => {
    const file = blob as any;
    file.name = fileName;
    file.lastModified = Date.now();
    return file as File;
  };

  const loadSharedConfig = async () => {
    const DEFAULT_BRANDS = ['Nike', 'Adidas'];
    const systemProjectTypeNames = systemProjectTypes.map(pt => pt.projectType);
    setIsDatabricksLoading(true);
    setDatabricksLoadingMessage('Loading workspace config…');
    try {
      const result = await fetchSharedConfig();
      if (result.success && result.brands && result.brands.length > 0) {
        setAvailableBrands(result.brands);
        localStorage.setItem('cohive_available_brands', JSON.stringify(result.brands));
      } else {
        const savedBrands = localStorage.getItem('cohive_available_brands');
        if (savedBrands) { setAvailableBrands(JSON.parse(savedBrands)); } else { setAvailableBrands(DEFAULT_BRANDS); localStorage.setItem('cohive_available_brands', JSON.stringify(DEFAULT_BRANDS)); }
      }
      let userProjectTypes: string[] = [];
      if (result.success && result.projectTypes && result.projectTypes.length > 0) {
        userProjectTypes = result.projectTypes;
        localStorage.setItem('cohive_available_project_types', JSON.stringify(userProjectTypes));
      } else {
        const savedProjectTypes = localStorage.getItem('cohive_available_project_types');
        if (savedProjectTypes) { userProjectTypes = JSON.parse(savedProjectTypes); }
      }
      const allProjectTypes = [...new Set([...systemProjectTypeNames, ...userProjectTypes])].sort();
      setAvailableProjectTypes(allProjectTypes);
      try {
        const configResult = await fetchProjectTypeConfigs();
        let userConfigs: ProjectTypeConfig[] = [];
        if (configResult.success && configResult.configs) {
          userConfigs = configResult.configs;
          localStorage.setItem('cohive_project_type_configs', JSON.stringify(userConfigs));
        } else {
          const savedConfigs = localStorage.getItem('cohive_project_type_configs');
          if (savedConfigs) { try { userConfigs = JSON.parse(savedConfigs); } catch { userConfigs = []; } }
        }
        setProjectTypeConfigs([...systemProjectTypes, ...userConfigs]);
      } catch (configError) {
        console.warn('Failed to fetch project type configurations:', configError);
        const savedConfigs = localStorage.getItem('cohive_project_type_configs');
        let userConfigs: ProjectTypeConfig[] = [];
        if (savedConfigs) { try { userConfigs = JSON.parse(savedConfigs); } catch { userConfigs = []; } }
        setProjectTypeConfigs([...systemProjectTypes, ...userConfigs]);
      }
      // Fetch custom personas (non-blocking — failure is silent)
      fetchCustomPersonas().then(personas => setCustomPersonas(personas)).catch(() => {});
    } catch (error) {
      console.warn('Failed to fetch shared config from Databricks, using localStorage:', error);
      const savedBrands = localStorage.getItem('cohive_available_brands');
      if (savedBrands) { try { setAvailableBrands(JSON.parse(savedBrands)); } catch { setAvailableBrands(DEFAULT_BRANDS); } } else { setAvailableBrands(DEFAULT_BRANDS); localStorage.setItem('cohive_available_brands', JSON.stringify(DEFAULT_BRANDS)); }
      let userProjectTypes: string[] = [];
      const savedProjectTypes = localStorage.getItem('cohive_available_project_types');
      if (savedProjectTypes) { try { userProjectTypes = JSON.parse(savedProjectTypes); } catch { userProjectTypes = []; } }
      const allProjectTypes = [...new Set([...systemProjectTypeNames, ...userProjectTypes])].sort();
      setAvailableProjectTypes(allProjectTypes);
      const savedConfigs = localStorage.getItem('cohive_project_type_configs');
      let userConfigs: ProjectTypeConfig[] = [];
      if (savedConfigs) { try { userConfigs = JSON.parse(savedConfigs); } catch { userConfigs = []; } }
      setProjectTypeConfigs([...systemProjectTypes, ...userConfigs]);
    } finally {
      setIsDatabricksLoading(false);
    }
  };

  useEffect(() => {
    const savedResponses = localStorage.getItem('cohive_responses');
    if (savedResponses) {
      try { setResponses(JSON.parse(savedResponses)); } catch (e) { console.error('Failed to load saved responses', e); }
    }

    const savedIterationFlag = localStorage.getItem('cohive_iteration_saved');
    if (savedIterationFlag) setIterationSaved(savedIterationFlag === 'true');

    const savedTemplates = localStorage.getItem('cohive_templates');
    if (savedTemplates) {
      try {
        let tmpl: UserTemplate[] = JSON.parse(savedTemplates);
        // Merge default permissions into stored templates so new properties (e.g.
        // canEditTemplates) are always present even in older localStorage versions.
        tmpl = tmpl.map(t => {
          const def = defaultTemplates.find(d => d.id === t.id);
          if (!def) return t;
          return { ...t, permissions: { ...def.permissions, ...t.permissions } };
        });
        // Add data-scientist template if missing (legacy migration)
        const hasDataScientist = tmpl.some((t: UserTemplate) => t.id === 'data-scientist');
        if (!hasDataScientist) {
          const ds = defaultTemplates.find(t => t.id === 'data-scientist');
          if (ds) tmpl = [...tmpl, ds];
        }
        setTemplates(tmpl);
        localStorage.setItem('cohive_templates', JSON.stringify(tmpl));
      } catch (e) {
        setTemplates(defaultTemplates);
        localStorage.setItem('cohive_templates', JSON.stringify(defaultTemplates));
      }
    } else {
      setTemplates(defaultTemplates);
      localStorage.setItem('cohive_templates', JSON.stringify(defaultTemplates));
    }

    const savedCurrentTemplateId = localStorage.getItem('cohive_current_template_id');
    if (savedCurrentTemplateId) { try { setCurrentTemplateId(savedCurrentTemplateId); } catch { setCurrentTemplateId('admin'); localStorage.setItem('cohive_current_template_id', 'admin'); } }
    else { setCurrentTemplateId('admin'); localStorage.setItem('cohive_current_template_id', 'admin'); }

    const savedModelTemplates = localStorage.getItem('cohive_model_templates');
    if (savedModelTemplates) {
      try { setModelTemplates(JSON.parse(savedModelTemplates)); } catch { setModelTemplates(defaultModelTemplates); localStorage.setItem('cohive_model_templates', JSON.stringify(defaultModelTemplates)); }
    } else { setModelTemplates(defaultModelTemplates); localStorage.setItem('cohive_model_templates', JSON.stringify(defaultModelTemplates)); }

    const savedCurrentModelTemplateId = localStorage.getItem('cohive_current_model_template_id');
    if (savedCurrentModelTemplateId) { try { setCurrentModelTemplateId(savedCurrentModelTemplateId); } catch { setCurrentModelTemplateId('default-claude'); localStorage.setItem('cohive_current_model_template_id', 'default-claude'); } }
    else { setCurrentModelTemplateId('default-claude'); localStorage.setItem('cohive_current_model_template_id', 'default-claude'); }

    const savedProjects = localStorage.getItem('cohive_projects');
    if (savedProjects) { try { setProjectFiles(JSON.parse(savedProjects)); } catch (e) { console.error('Failed to load saved projects', e); } }

    const savedIdeasFiles = localStorage.getItem('cohive_ideas_files');
    if (savedIdeasFiles) { try { setIdeasFiles(JSON.parse(savedIdeasFiles)); } catch (e) { console.error('Failed to load saved ideas files', e); } }

    console.log('📂 Research files will be loaded after Databricks authentication');

    const savedSuggestions = localStorage.getItem('cohive_edit_suggestions');
    if (savedSuggestions) { try { setEditSuggestions(JSON.parse(savedSuggestions)); } catch (e) { console.error('Failed to load saved edit suggestions', e); } }

    const savedHexExecutions = localStorage.getItem('cohive_hex_executions');
    if (savedHexExecutions) { try { setHexExecutions(JSON.parse(savedHexExecutions)); } catch (e) { console.error('Failed to load saved hex executions', e); } }

    const savedSelectedResearchFiles = localStorage.getItem('cohive_selected_research_files');
    if (savedSelectedResearchFiles) { try { setSelectedResearchFiles(JSON.parse(savedSelectedResearchFiles)); } catch (e) { console.error('Failed to load selected research files', e); } }

    loadSharedConfig();
  }, []);

  useEffect(() => {
    if (Object.keys(responses).length > 0) {
      localStorage.setItem('cohive_responses', JSON.stringify(responses));
      setShowSaveNotification(true);
      const timer = setTimeout(() => setShowSaveNotification(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [responses]);

  useEffect(() => {
    if (Object.keys(sessionVersions).length > 0) saveSessionVersions(sessionVersions);
  }, [sessionVersions]);

  useEffect(() => {
    if (currentTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === currentTemplateId);
      setCurrentTemplate(template || null);
      if (template?.permissions?.canEditTemplates) {
        // Users whose template grants canEditTemplates can switch roles freely
        setUserRole(template.role);
      } else if (template) {
        // All other users get their role from Databricks — template.role is ignored
        if (databricksRole) {
          setUserRole(databricksRole as 'administrator' | 'research-analyst' | 'research-leader' | 'data-scientist' | 'marketing-manager' | 'product-manager' | 'executive-stakeholder');
        }
        // else leave role as-is until the Databricks fetch completes
      }
    }
  }, [currentTemplateId, templates, databricksRole]);

  useEffect(() => {
    if (currentModelTemplateId && modelTemplates.length > 0) {
      const modelTemplate = modelTemplates.find(t => t.id === currentModelTemplateId);
      setCurrentModelTemplate(modelTemplate || null);
    }
  }, [currentModelTemplateId, modelTemplates]);

  useEffect(() => {
    const checkAuthAndHandleCallback = async () => {
      setIsCheckingAuth(true);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        if (code && state) {
          window.location.href = '/oauth/callback' + window.location.search;
          return;
        }
        const authenticated = isAuthenticated();
        setIsDatabricksAuthenticated(authenticated);
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

  useEffect(() => {
    const fetchUserEmail = async () => {
      if (isDatabricksAuthenticated) {
        try {
          const email = await getCurrentUserEmail();
          setUserEmail(email);
        } catch (error) {
          setUserEmail('unknown@databricks.com');
        }
        // Re-fetch shared config now that auth is confirmed
        await loadSharedConfig();
      }
    };
    fetchUserEmail();
  }, [isDatabricksAuthenticated]);

  // Fetch role from Databricks for users whose template does not grant canEditTemplates
  useEffect(() => {
    if (!userEmail || userEmail === 'unknown@databricks.com') return;

    const fetchDatabricksRole = async () => {
      try {
        const session = await getValidSession();
        if (!session) return;
        const params = new URLSearchParams({
          userEmail,
          accessToken: session.accessToken,
          workspaceHost: session.workspaceHost,
        });
        const resp = await fetch(`/api/databricks/user-role?${params}`);
        if (!resp.ok) return;
        const { role } = await resp.json() as { role: 'administrator' | 'research-analyst' | 'research-leader' | 'data-scientist' | 'marketing-manager' | 'product-manager' | 'executive-stakeholder' };
        setDatabricksRole(role);
        setUserRole(role);
      } catch {
        // leave role as template default
      }
    };
    fetchDatabricksRole();
  }, [userEmail]);

  // Detect session expiry while the app is open — check on tab focus and every 2 minutes
  useEffect(() => {
    const checkExpiry = () => {
      if (isDatabricksAuthenticated && !isAuthenticated()) {
        setIsDatabricksAuthenticated(false);
      }
    };
    const handleVisibility = () => { if (document.visibilityState === 'visible') checkExpiry(); };
    document.addEventListener('visibilitychange', handleVisibility);
    const interval = setInterval(checkExpiry, 2 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [isDatabricksAuthenticated]);

  useEffect(() => {
    const loadResearchFilesFromDatabricks = async () => {
      if (isDatabricksAuthenticated && !isCheckingAuth) {
        await loadKnowledgeBaseFiles();
      } else if (!isDatabricksAuthenticated && !isCheckingAuth) {
        setResearchFiles([]);
        setSelectedResearchFiles([]);
      }
    };
    loadResearchFilesFromDatabricks();
  }, [isDatabricksAuthenticated, isCheckingAuth, currentTemplate]);

  // When the user navigates to the Grade hex, extract ideas from all hex results
  useEffect(() => {
    if (activeStepId !== 'Grade') return;
    const hasAnyResults = Object.values(hexExecutions).some(execs => execs?.length > 0);
    if (!hasAnyResults) return;
    setGradeIdeasLoading(true);
    const modelEndpoint = currentModelTemplate?.hexModels?.['Grade']?.modelId || 'databricks-claude-haiku-4-5';
    extractIdeasFromHexResults(hexExecutions, userEmail, userRole, modelEndpoint)
      .then(ideas => {
        setGradeExtractedIdeas(ideas);
        setGradeIdeasLoading(false);
      })
      .catch(() => setGradeIdeasLoading(false));
  }, [activeStepId]);

  const getExistingFiles = (brand: string, projectType: string): ProjectFile[] => {
    if (!brand || !projectType) return [];
    return projectFiles.filter(f => f.brand.toLowerCase() === brand.toLowerCase() && f.projectType.toLowerCase() === projectType.toLowerCase());
  };

  const getIdeasFile = (brand: string, projectType: string): IdeasFile | null => {
    if (!brand || !projectType) return null;
    return ideasFiles.find(f => f.brand.toLowerCase() === brand.toLowerCase() && f.projectType.toLowerCase() === projectType.toLowerCase()) || null;
  };

  const getUniqueFileName = (fileName: string, brand: string, projectType: string): string => {
    const existingFiles = projectFiles.filter(f => f.brand.toLowerCase() === brand.toLowerCase() && f.projectType.toLowerCase() === projectType.toLowerCase());
    // Strip .txt so comparisons work regardless of how the file was stored
    const normalize = (n: string) => n.replace(/\.txt$/i, '');
    const baseName = normalize(fileName);
    const versionMatch = baseName.match(/^(.+?)_[vV](\d+)$/);
    if (versionMatch) {
      const base = versionMatch[1];
      let highestVersion = parseInt(versionMatch[2], 10);
      existingFiles.forEach(file => {
        const fvm = normalize(file.fileName).match(/^(.+?)_[vV](\d+)$/);
        if (fvm && fvm[1] === base) { const v = parseInt(fvm[2], 10); if (v > highestVersion) highestVersion = v; }
      });
      const fileExists = existingFiles.some(f => normalize(f.fileName) === baseName);
      if (!fileExists) return baseName;
      return `${base}_V${highestVersion + 1}`;
    } else {
      const baseV1 = `${baseName}_V1`;
      if (existingFiles.some(f => normalize(f.fileName) === baseV1)) {
        let highestVersion = 1;
        existingFiles.forEach(file => {
          const fvm = normalize(file.fileName).match(/^(.+?)_[vV](\d+)$/);
          if (fvm && fvm[1] === baseName) { const v = parseInt(fvm[2], 10); if (v > highestVersion) highestVersion = v; }
        });
        return `${baseName}_V${highestVersion + 1}`;
      }
      return baseV1;
    }
  };

  const getApprovedResearchFiles = (brand: string, projectType: string): ResearchFile[] => {
    // Only return files for this brand, or files with no brand (general/category scope)
    // Exclude Example files — they appear in their own section below
    const brandLower = brand.toLowerCase();
    const ptLower = projectType.toLowerCase();
    const brandFiles = researchFiles.filter(file =>
      file.isApproved &&
      file.fileType !== 'Example' &&
      (!file.brand || file.brand.toLowerCase() === brandLower)
    );
    // Sort: matched project type first, then other project types, then untyped
    return brandFiles.sort((a, b) => {
      const aMatch = (a.projectType || '').toLowerCase() === ptLower;
      const bMatch = (b.projectType || '').toLowerCase() === ptLower;
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  };

  const getExampleFiles = (_projectType: string): ResearchFile[] => {
    // Example files are brand-agnostic — shown for all project types.
    // Hide _txt.txt companions; only show the original files.
    return researchFiles.filter(file =>
      file.isApproved &&
      file.fileType === 'Example' &&
      !file.fileName.endsWith('_txt.txt')
    );
  };

  // Roles that can upload and manage Example files directly
  const canManageExamples = ['research-analyst', 'research-leader', 'data-scientist', 'administrator'].includes(userRole);

  // CoHive internal users can always switch templates regardless of their current template's permissions
  const isCohiveUser = userEmail.toLowerCase().endsWith('@cohivesolutions.com');

  // Strip extension for display — users never see .txt
  const displayFileName = (fileName: string): string =>
    fileName.replace(/\.(txt|json)$/i, '');

  const getSummaryFileName = (fileName: string): string => {
    // Strip .txt extension before generating summary name
    const stripped = fileName.replace(/\.txt$/i, '');
    const versionMatch = stripped.match(/^(.+?)_[vV]\d+$/);
    const baseName = versionMatch ? versionMatch[1] : stripped;
    return `${baseName}_sum`;
  };

  const getEnterQuestions = (): string[] => {
    const baseQuestions = ['Brand', 'Project Type'];
    const brand = responses['Enter']?.[0]?.trim();
    const projectType = responses['Enter']?.[1]?.trim();

    if (brand && projectType) {
      baseQuestions.push('Filename for this iteration');
    }

    const lastQuestionIndex = baseQuestions.length - 1;
    if (lastQuestionIndex >= 2 && responses['Enter']?.[lastQuestionIndex]?.trim()) {
      if (projectType === 'War Games') {
        baseQuestions.push('Research Files');
      } else {
        baseQuestions.push('Ideas Source');
        const ideasSourceIdx = baseQuestions.indexOf('Ideas Source');
        if (ideasSourceIdx !== -1) {
          const ideasChoice = responses['Enter']?.[ideasSourceIdx];
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

  useEffect(() => {
    if (activeStepId !== 'Enter') return;
    const brand = responses['Enter']?.[0]?.trim();
    const projectType = responses['Enter']?.[1]?.trim();
    if (!brand || !projectType) return;

    const normalize = (n: string) => n.replace(/\.txt$/i, '');
    const currentFilename = responses['Enter']?.[2];

    if (!currentFilename) {
      // No filename yet — generate a default one
      const autoBase = generateDefaultFileName(brand, projectType);
      let highestSaved = 0;
      projectFiles.forEach(file => {
        const fvm = normalize(file.fileName).match(/^(.+?)_[vV](\d+)$/i);
        if (fvm && fvm[1] === autoBase) { const v = parseInt(fvm[2], 10); if (v > highestSaved) highestSaved = v; }
      });
      setResponses(prev => ({ ...prev, Enter: { ...prev.Enter, 2: `${autoBase}_V${highestSaved + 1}` } }));
      return;
    }

    // For any existing filename (auto-generated or manually typed):
    // strip any existing version suffix to get the base name, then find the
    // highest saved version of that base and bump past it.
    const normalizedCurrent = normalize(currentFilename);
    const versionMatch = normalizedCurrent.match(/^(.+?)_[vV](\d+)$/i);
    const baseName = versionMatch ? versionMatch[1] : normalizedCurrent;
    const currentVersion = versionMatch ? parseInt(versionMatch[2], 10) : 0;

    let highestSaved = 0;
    projectFiles.forEach(file => {
      const fvm = normalize(file.fileName).match(/^(.+?)_[vV](\d+)$/i);
      if (fvm && fvm[1] === baseName) { const v = parseInt(fvm[2], 10); if (v > highestSaved) highestSaved = v; }
    });

    if (highestSaved > 0 && currentVersion <= highestSaved) {
      setResponses(prev => ({ ...prev, Enter: { ...prev.Enter, 2: `${baseName}_V${highestSaved + 1}` } }));
    }
  }, [activeStepId, responses['Enter']?.[0], responses['Enter']?.[1], responses['Enter']?.[2], projectFiles]);

  const currentContent = activeStepId === 'Enter'
    ? { ...stepContentData[0], questions: getEnterQuestions() }
    : stepContentData.find(s => s.id === activeStepId) || stepContentData[0];

  const currentStepIndex = processSteps.findIndex(s => s.id === activeStepId);

  const handleResponseChange = (questionIndex: number, value: string) => {
    if (activeStepId === 'Enter' && (questionIndex === 0 || questionIndex === 1)) {
      const currentResponses = responses['Enter'] || {};
      const newBrand = questionIndex === 0 ? value : (currentResponses[0] || '');
      const newProjectType = questionIndex === 1 ? value : (currentResponses[1] || '');
      let newFileName = '';
      if (newBrand && newProjectType) newFileName = generateDefaultFileName(newBrand, newProjectType);
      // Brand/project changed — reset the last-saved-name so it doesn't bleed into the new project
      setLastSavedFileName('');
      localStorage.removeItem('cohive_last_iteration_filename');
      setResponses(prev => ({
        ...prev,
        [activeStepId]: {
          ...prev[activeStepId],
          [questionIndex]: value,
          ...(newFileName ? { 2: newFileName } : {})
        }
      }));
      setSelectedResearchFiles([]);
    } else {
      setResponses(prev => ({
        ...prev,
        [activeStepId]: { ...prev[activeStepId], [questionIndex]: value }
      }));
    }
    setShowValidation(false);
    if (activeStepId === 'Enter' && iterationSaved) {
      setIterationSaved(false);
      localStorage.setItem('cohive_iteration_saved', 'false');
    }
  };

  const isStepComplete = (stepId: string): boolean => {
    if (stepId === 'Enter') {
      const EnterQuestions = getEnterQuestions();
      const stepResponses = responses[stepId];
      if (!stepResponses) return false;
      if (!stepResponses[0]?.trim() || !stepResponses[1]?.trim()) return false;
      const brand = stepResponses[0]?.trim();
      const projectType = stepResponses[1]?.trim();
      const existingFiles = brand && projectType ? getExistingFiles(brand, projectType) : [];
      if (existingFiles.length > 0) {
        const projectChoice = stepResponses[2];
        if (!projectChoice?.trim()) return false;
        if (projectChoice === 'New' && !stepResponses[3]?.trim()) return false;
        else if (projectChoice === 'Existing' && !stepResponses[3]?.trim()) return false;
      } else {
        if (!stepResponses[2]?.trim()) return false;
      }
      const ideasSourceIdx = EnterQuestions.indexOf('Ideas Source');
      if (ideasSourceIdx !== -1) {
        const ideasChoice = stepResponses[ideasSourceIdx];
        if (!ideasChoice?.trim()) return false;
        if (ideasChoice === 'Load Current Ideas') {
          if (!stepResponses[ideasSourceIdx + 1]?.trim()) return false;
        }
      }
      const researchFilesIdx = EnterQuestions.indexOf('Research Files');
      if (researchFilesIdx !== -1 && selectedResearchFiles.length === 0) return false;
      return true;
    }
    const content = stepContentData.find(s => s.id === stepId);
    if (!content) return false;
    const stepResponses = responses[stepId];
    if (!stepResponses) return false;
    return content.questions.every((_, idx) => {
      const response = stepResponses[idx];
      return response && response.trim().length > 0;
    });
  };

  const isCurrentStepComplete = isStepComplete(activeStepId);

  const getCompletedStepsCount = (): number => processSteps.filter(step => isStepComplete(step.id)).length;

  const handleNext = () => {
    if (activeStepId === 'Enter' && !isCurrentStepComplete) { setShowValidation(true); return; }
    if (currentStepIndex < processSteps.length - 1) { setActiveStepId(processSteps[currentStepIndex + 1].id); setShowValidation(false); }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) { setActiveStepId(processSteps[currentStepIndex - 1].id); setShowValidation(false); }
  };

  const getStepStatus = (stepId: string): 'completed' | 'active' | 'upcoming' => {
    if (stepId === activeStepId) return 'active';
    if (isStepComplete(stepId)) return 'completed';
    if (stepId === 'Enter') return 'upcoming';
    if (isStepComplete('Enter')) return 'upcoming';
    return 'upcoming';
  };

  const handleAddSuggestion = (fileId: string, suggestion: string) => {
    const file = researchFiles.find(f => f.id === fileId);
    if (!file) return;
    const newSuggestion: EditSuggestion = { id: Date.now().toString(), researchFileId: fileId, fileName: file.fileName, suggestedBy: 'Current User', suggestion, timestamp: Date.now(), status: 'pending' };
    setEditSuggestions(prev => [...prev, newSuggestion]);
    localStorage.setItem('cohive_edit_suggestions', JSON.stringify([...editSuggestions, newSuggestion]));
  };

  const handleUpdateSuggestionStatus = (suggestionId: string, status: 'pending' | 'reviewed' | 'implemented') => {
    setEditSuggestions(prev => prev.map(s => s.id === suggestionId ? { ...s, status } : s));
    const updated = editSuggestions.map(s => s.id === suggestionId ? { ...s, status } : s);
    localStorage.setItem('cohive_edit_suggestions', JSON.stringify(updated));
  };

  const handleToggleApproval = async (fileId: string, forceValue?: boolean) => {
    const file = researchFiles.find(f => f.id === fileId);
    if (!file) return;

    // If forceValue is provided, use it directly; otherwise toggle current state
    const nowApproved = forceValue !== undefined ? forceValue : !file.isApproved;

    // If already in the desired state, skip (prevents toggle-back on bulk ops)
    if (nowApproved === file.isApproved) return;

    // Check if file has been processed before approving
    if (nowApproved && (!file.contentSummary || file.contentSummary.trim() === '')) {
      alert(`❌ Cannot approve unprocessed file.\n\nThe file "${file.fileName}" must be processed before approval.\n\nPlease go to Knowledge Base → Workspace mode and process this file first.`);
      return;
    }

    // Optimistic local update so UI responds immediately
    setResearchFiles(prev => prev.map(f => f.id === fileId ? { ...f, isApproved: nowApproved } : f));

    try {
      if (nowApproved) {
        // Persist approval to Databricks
        const { approveKnowledgeBaseFile } = await import('../utils/databricksAPI');
        const result = await approveKnowledgeBaseFile(fileId, userEmail, userRole, 'Approved via Research mode');
        if (!result.success) {
          // Roll back optimistic update on failure
          setResearchFiles(prev => prev.map(f => f.id === fileId ? { ...f, isApproved: !nowApproved } : f));
          alert(`❌ Approval failed: ${result.error || 'Unknown error'}`);
          return;
        }
        console.log(`✅ File ${fileId} approved and persisted to Databricks`);
      } else {
        // Unapproval — set is_approved = FALSE in Databricks
        const { unapproveKnowledgeBaseFile } = await import('../utils/databricksAPI');
        const result = await unapproveKnowledgeBaseFile(fileId, userEmail, userRole);
        if (!result.success) {
          console.warn(`⚠️ Could not persist unapproval for ${fileId}: ${result.error}`);
          // Non-fatal for unapproval — local state still reflects intent
        }
        console.log(`✅ File ${fileId} unapproved`);
      }
    } catch (error) {
      console.error('handleToggleApproval error:', error);
      // Roll back on unexpected error
      setResearchFiles(prev => prev.map(f => f.id === fileId ? { ...f, isApproved: !nowApproved } : f));
      alert(`❌ Could not update approval: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return;
    }

    // Update local cache and re-fetch from Databricks to ensure full sync
    const updated = researchFiles.map(f => f.id === fileId ? { ...f, isApproved: nowApproved } : f);
    localStorage.setItem('cohive_research_files', JSON.stringify(updated));
    setResearchFiles(updated);
    // Re-fetch so synthesis file list reflects the new approval state
    await loadKnowledgeBaseFiles();
  };

  const handleCreateResearchFile = (file: Omit<ResearchFile, 'id' | 'uploadDate'>) => {
    const newFile: ResearchFile = { ...file, id: Date.now().toString(), uploadDate: Date.now() };
    setResearchFiles(prev => [...prev, newFile]);
    localStorage.setItem('cohive_research_files', JSON.stringify([...researchFiles, newFile]));
  };

  const handleUpdateResearchFile = (fileId: string, content: string) => {
    const updated = researchFiles.map(f => f.id === fileId ? { ...f, content } : f);
    setResearchFiles(updated);
    localStorage.setItem('cohive_research_files', JSON.stringify(updated));
  };

  const handleDeleteProjectFiles = (fileNames: string[]) => {
    const updatedFiles = projectFiles.filter(file => !fileNames.includes(file.fileName));
    setProjectFiles(updatedFiles);
    localStorage.setItem('cohive_projects', JSON.stringify(updatedFiles));
  };

  // ── Grade hex scoring ────────────────────────────────────────────────────────

  const handleGradeExecute = async (selectedSegmentIds: string[], assessment: string) => {
    const brand = responses['Enter']?.[0]?.trim() || '';
    const projectType = responses['Enter']?.[1]?.trim() || '';

    // Parse encoded scale, ideas, and Zappi flag from the assessment string.
    // Ideas are extracted by finding the marker and slicing to end-of-string so that
    // idea text containing ']' doesn't break the parse.
    const scaleMatch = assessment.match(/\[GRADE_SCALE:([^\]]+)\]/);
    const scale = scaleMatch?.[1] || 'scale-1-5-written';
    const includeZappiQuestions = assessment.includes('[ZAPPI_QUESTIONS:true]');
    const includeZappiSet2 = assessment.includes('[ZAPPI_SET2:true]');
    const ideasMarker = '[GRADE_IDEAS:';
    const ideasStart = assessment.indexOf(ideasMarker);
    let ideas: string[] = [];
    if (ideasStart !== -1) {
      const raw = assessment.slice(ideasStart + ideasMarker.length).replace(/\n\[ZAPPI.*$/gm, '').replace(/\]$/, '').trim();
      ideas = raw.split('||').map(s => s.trim()).filter(Boolean);
    }

    if (ideas.length === 0 && !includeZappiQuestions && !includeZappiSet2) {
      alert('No ideas to score. Please go back and select ideas, or enable Zappi Questions.');
      return;
    }

    const segments = resolveGradeSegments(selectedSegmentIds);
    const modelEndpoint = currentModelTemplate?.hexModels?.['Grade']?.modelId || 'databricks-claude-haiku-4-5';
    const prompt = buildGradeScoringPrompt(ideas, segments, scale, brand, projectType, includeZappiQuestions, includeZappiSet2);

    setGradeScoring(true);
    try {
      const result = await executeAIPrompt({ prompt, modelEndpoint, maxTokens: 4000, temperature: 0.2, userEmail, userRole });
      if (result.success && result.response) {
        const parsed = parseGradeResults(result.response);
        setGradeScoreResults(parsed);
        setGradeModalOpen(true);
      }
    } catch (e) {
      console.error('[Grade] Scoring failed:', e);
    } finally {
      setGradeScoring(false);
    }
  };

  // ── handleCentralHexExecute — v3: derives requestMode and ideaElements ──────

  const handleCentralHexExecute = (selectedFiles: string[], assessmentType: string[], assessment: string) => {
    const brand = responses['Enter']?.[0]?.trim() || '';
    const projectType = responses['Enter']?.[1]?.trim() || '';

    // Grade hex: intercept and run scoring instead of opening AssessmentModal
    if (activeStepId === 'Grade') {
      handleGradeExecute(selectedFiles, assessment);
      return;
    }

    const executionData: HexExecution = {
      id: Date.now().toString(),
      selectedFiles,
      assessmentType,
      assessment,
      timestamp: Date.now()
    };

    setResponses(prev => ({
      ...prev,
      [activeStepId]: { 0: `Files: ${selectedFiles.join(', ')}`, 1: assessment }
    }));

    setHexExecutions(prev => ({
      ...prev,
      [activeStepId]: [...(prev[activeStepId] || []), executionData]
    }));
    localStorage.setItem('cohive_hex_executions', JSON.stringify({
      ...hexExecutions,
      [activeStepId]: [...(hexExecutions[activeStepId] || []), executionData]
    }));

    const personaHexIds = ['Consumers', 'Luminaries', 'Colleagues', 'cultural', 'Grade', 'competitors'];
    const isPersonaHex = personaHexIds.includes(activeStepId);

    const kbFileNames = isPersonaHex
      ? selectedResearchFiles
      : selectedFiles.map(idOrName => {
          const match = researchFiles.find(f => f.id === idOrName || f.fileName === idOrName);
          return match ? match.fileName : idOrName;
        });

    console.log(`[${activeStepId}] isPersonaHex: ${isPersonaHex}`);
    console.log(`[${activeStepId}] kbFileNames: ${JSON.stringify(kbFileNames)}`);

    const currentStep = processSteps.find(s => s.id === activeStepId);
    const hexLabel = currentStep?.label || activeStepId;

    const ideasFile = getIdeasFile(brand, projectType);
    const modelEndpoint = currentTemplate?.conversationSettings?.modelEndpoint || 'databricks-claude-haiku-4-5';
    const factCheckerModelEndpoint =
      (currentModelTemplate
        ? getModelForExecution(currentModelTemplate, activeStepId as HexId, 'fact-checking') ?? ''
        : '') || 'databricks-gpt-5-mini';

    // ── v3: Derive requestMode and ideaElements from Enter hex ───────────────
    const requestMode = deriveRequestMode();
    const ideaElements = deriveIdeaElements(brand, projectType);

    console.log(`[${activeStepId}] requestMode (from Enter hex): ${requestMode}`);
    console.log(`[${activeStepId}] ideaElements: ${ideaElements.length} element(s)`);

    const isWarGames = projectType === 'War Games';

    setAssessmentModalProps({
      hexId: activeStepId,
      hexLabel,
      // War Games uses unified output — not persona debate rounds
      assessmentType: isWarGames ? 'unified' : (assessmentType[0] || 'unified'),
      // War Games does not use personas — the 5-step framework runs directly
      selectedPersonas: (isPersonaHex && !isWarGames) ? selectedFiles : [],
      kbFileNames,
      // Always pass assessment for War Games so the [WAR_GAMES_COMPETITOR:] marker reaches run.js
      userSolution: (isWarGames || assessmentType.includes('assess')) ? assessment : '',
      ideasFile: ideasFile ? {
        fileName: ideasFile.fileName,
        content: ideasFile.content,
        fileType: ideasFile.fileType,
      } : null,
      brand,
      projectType,
      modelEndpoint,
      factCheckerModelEndpoint,
      // v3
      requestMode,
      ideaElements,
      // kbMode and scope not pre-set — user selects in modal settings panel
      // Pass full hexExecutions so AssessmentModal can include prior results as context
      hexExecutions,
      canManageExamples,
      // Custom personas — pass full data so run.js can build prompts without extra DB call
      customPersonaData: Object.fromEntries(customPersonas.map(p => [p.personaId, p.contentJson])),
    });
    setAssessmentModalOpen(true);
  };

  // Called by AssessmentModal whenever the user saves a gem —
  // accumulates into iterationGems which persists across modal opens.
  const handleGemSaved = (gem: IterationGem) => {
    setIterationGems(prev => [...prev, gem]);
  };

  const handleAddIterationDirection = (direction: string) => {
    setIterationDirections(prev => [...prev, direction]);
    const hexLabel = currentContent?.title || activeStepId;
    const totalRuns = Object.values(hexExecutions).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    const runLabel = totalRuns === 0 ? 'pre-assessment' : `run ${totalRuns}`;
    const promptText = `[${hexLabel} · ${runLabel}]: ${direction}`;
    setNoteEntries(prev => {
      const next = [...prev];
      next.push({ id: `prompt-${Date.now()}`, type: 'prompt', text: promptText, hexLabel });
      // Ensure there's a note entry after for continued typing
      const last = next[next.length - 1];
      if (last?.type !== 'note' || last.text !== '') {
        next.push({ id: `note-${Date.now() + 1}`, type: 'note', text: '' });
      }
      return next;
    });
  };

  const handleReviewConfirmed = (items: ReviewItem[]) => {
    const confirmed = items.filter((item) => item.included);
    // Update iteration-level check/coal arrays for iteration save
    setIterationChecks(prev => [
      ...prev,
      ...confirmed.filter(i => i.type === 'check').map(i => ({ text: i.text, hexId: i.hexId, hexLabel: i.hexLabel })),
    ]);
    setIterationCoal(prev => [
      ...prev,
      ...confirmed.filter(i => i.type === 'coal').map(i => ({ text: i.text, hexId: i.hexId, hexLabel: i.hexLabel })),
    ]);
    if (confirmed.length === 0) return;
    setNoteEntries(prev => {
      const next = [...prev];
      confirmed.forEach((item) => {
        next.push({
          id: `${item.type}-${item.id}`,
          type: item.type as 'gem' | 'check' | 'coal',
          text: item.text,
          hexLabel: item.hexLabel,
        });
      });
      // Ensure a note entry follows for continued typing
      const last = next[next.length - 1];
      if (last?.type !== 'note') {
        next.push({ id: `note-post-review-${Date.now()}`, type: 'note', text: '' });
      }
      return next;
    });
  };

  const handleSaveRecommendation = (recommendation: string, hexId: string) => {
    const brand = responses['Enter']?.[0]?.trim() || 'General';
    const projectType = responses['Enter']?.[1]?.trim() || 'General';
    const newRecommendationFile: ResearchFile = {
      id: Date.now().toString(), brand, projectType,
      fileName: `Recommendation_${hexId}_${Date.now()}`,
      isApproved: true, uploadDate: Date.now(), fileType: 'Research',
      content: recommendation
    };
    const updatedFiles = [...researchFiles, newRecommendationFile];
    setResearchFiles(updatedFiles);
    localStorage.setItem('cohive_research_files', JSON.stringify(updatedFiles));
  };

  const handleSaveWisdomToDatabricks = async (fileName: string, content: string, insightType: string, inputMethod: string, brand?: string, projectType?: string) => {
    if (!isDatabricksAuthenticated) { setWisdomErrorMessage('⚠️ Please sign in to Databricks before saving. Click the Sign In button in the header.'); setShowLoginModal(true); return false; }
    setIsWisdomSaving(true);
    setIsDatabricksLoading(true);
    setDatabricksLoadingMessage('Saving to Knowledge Base…');
    setWisdomErrorMessage(null);
    try {
      const mimeType = getMimeTypeFromFileName(fileName);
      let file: File;
      const isBase64 = content.includes('data:') || (content.includes(',') && !content.includes(' '));
      if (isBase64) {
        const base64Data = content.includes(',') ? content.split(',')[1] : content;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        file = createFileFromBlob(blob, fileName);
      } else {
        const blob = new Blob([content], { type: 'text/plain' });
        file = createFileFromBlob(blob, fileName);
      }
      let scope: 'general' | 'category' | 'brand';
      if (insightType === 'General') scope = 'general';
      else if (insightType === 'Category') scope = 'category';
      else scope = 'brand';
      const result = await uploadToKnowledgeBase({ file, scope, category: projectType, brand: scope === 'brand' ? (brand || undefined) : undefined, projectType: projectType || undefined, fileType: 'Wisdom', tags: [insightType, inputMethod], insightType: insightType as 'Brand' | 'Category' | 'General', inputMethod: inputMethod as 'Text' | 'Voice' | 'Photo' | 'Video' | 'File', userEmail: userEmail, userRole });
      if (result.success) {
        setWisdomSuccessMessage(`✅ "${fileName}" saved to Knowledge Base.\n\nThis file will be made available after it has been processed, read and approved by a research manager.`);
        return true;
      } else {
        setWisdomErrorMessage(`Failed to save: ${result.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      setWisdomErrorMessage(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setIsWisdomSaving(false);
      setIsDatabricksLoading(false);
    }
  };

  function getMimeTypeFromFileName(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = { 'txt': 'text/plain', 'webm': 'audio/webm', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif', 'mp4': 'video/mp4', 'pdf': 'application/pdf', 'doc': 'application/msword', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'xls': 'application/vnd.ms-excel', 'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'ppt': 'application/vnd.ms-powerpoint', 'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'csv': 'text/csv' };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  // Attach camera stream to the video preview element whenever the mode changes
  useEffect(() => {
    if (wisdomCameraMode && stream && wisdomVideoRef.current) {
      wisdomVideoRef.current.srcObject = stream;
    }
  }, [wisdomCameraMode, stream]);

  const stopWisdomCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setWisdomCameraMode(null);
    setIsRecording(false);
    setMediaRecorder(null);
    setRecordedChunks([]);
  };

  const centralHexIds = ['Luminaries', 'Consumers', 'competitors', 'Colleagues', 'cultural', 'test', 'Grade'];
  const isCentralHex = centralHexIds.includes(activeStepId);

  const handleStoriesGenerate = (params: { category: StoryCategory; subtype: StorySubtype; selectedValues: string[]; selectedEmotions: string[] }) => {
    setStoryModalParams(params);
    setStoryModalOpen(true);
  };

  const handleStoryAcceptResults = (results: { rounds: Array<{ roundNumber: number; label: string; content: string }>; hexId: string; hexLabel: string; synopsis?: string }) => {
    const storyTypeLabel = [storyModalParams?.category?.label, storyModalParams?.subtype?.label].filter(Boolean).join(' · ');
    const execData = {
      id: `story-${Date.now()}`,
      selectedFiles: selectedResearchFiles,
      assessmentType: ['Story', storyTypeLabel].filter(Boolean),
      assessment: results.rounds.map(r => `## ${r.label}\n\n${r.content}`).join('\n\n---\n\n'),
      timestamp: Date.now(),
      synopsis: results.synopsis || '',
      storyValues: storyModalParams?.selectedValues || [],
      storyEmotions: storyModalParams?.selectedEmotions || [],
      storyCategory: storyModalParams?.category?.label || '',
      storySubtype: storyModalParams?.subtype?.label || '',
    };
    setHexExecutions(prev => ({
      ...prev,
      stories: [...(prev['stories'] || []), execData],
    }));

    // Add each round as a story NoteEntry (brief descriptor only, not full content)
    results.rounds.forEach(round => {
      const storyEntry: NoteEntry = {
        id: `story-${Date.now()}-${round.roundNumber}`,
        type: 'story',
        text: storyTypeLabel ? `Story written: ${storyTypeLabel} — ${round.label}` : `Story written: ${round.label}`,
        hexLabel: round.label,
      };
      setNoteEntries(prev => [
        ...prev,
        storyEntry,
        { id: `note-${Date.now()}-${round.roundNumber}`, type: 'note', text: '' },
      ]);
    });
  };

  const handleTemplateChange = (templateId: string) => {
    const newTemplate = templates.find(t => t.id === templateId);
    if (newTemplate) { setCurrentTemplateId(templateId); localStorage.setItem('cohive_current_template_id', templateId); }
  };
  const handleTemplateUpdate = (template: UserTemplate) => {
    const updatedTemplates = templates.map(t => t.id === template.id ? template : t);
    setTemplates(updatedTemplates);
    if (currentTemplateId === template.id) { setCurrentTemplateId(template.id); localStorage.setItem('cohive_current_template_id', template.id); }
    localStorage.setItem('cohive_templates', JSON.stringify(updatedTemplates));
  };
  const handleTemplateCreate = (template: UserTemplate) => {
    const updatedTemplates = [...templates, template];
    setTemplates(updatedTemplates);
    localStorage.setItem('cohive_templates', JSON.stringify(updatedTemplates));
  };
  const handleModelTemplateChange = (templateId: string) => {
    const newModelTemplate = modelTemplates.find(t => t.id === templateId);
    if (newModelTemplate) { setCurrentModelTemplateId(templateId); localStorage.setItem('cohive_current_model_template_id', templateId); }
  };
  const handleModelTemplateUpdate = (template: ModelTemplate) => {
    const updatedTemplates = modelTemplates.map(t => t.id === template.id ? template : t);
    setModelTemplates(updatedTemplates);
    if (currentModelTemplateId === template.id) { setCurrentModelTemplateId(template.id); localStorage.setItem('cohive_current_model_template_id', template.id); }
    localStorage.setItem('cohive_model_templates', JSON.stringify(updatedTemplates));
  };
  const handleModelTemplateCreate = (template: ModelTemplate) => {
    const updatedTemplates = [...modelTemplates, template];
    setModelTemplates(updatedTemplates);
    localStorage.setItem('cohive_model_templates', JSON.stringify(updatedTemplates));
  };

  const handleAddBrand = async (brand: string) => {
    if (!brand.trim() || availableBrands.includes(brand.trim())) return;
    const trimmedBrand = brand.trim();
    const updated = [...availableBrands, trimmedBrand].sort();
    setAvailableBrands(updated);
    localStorage.setItem('cohive_available_brands', JSON.stringify(updated));
    try {
      const result = await addSharedConfigItem('brand', trimmedBrand, userEmail);
      if (!result.success) console.warn(`⚠️ Failed to save brand to Databricks: ${result.error}`);
    } catch (error) { console.warn('Failed to save brand to Databricks:', error); }
  };

  const handleAddProjectType = async (projectType: string) => {
    if (!projectType.trim() || availableProjectTypes.includes(projectType.trim())) return;
    const trimmedProjectType = projectType.trim();
    const updated = [...availableProjectTypes, trimmedProjectType].sort();
    setAvailableProjectTypes(updated);
    localStorage.setItem('cohive_available_project_types', JSON.stringify(updated));
    try {
      const result = await addSharedConfigItem('project_type', trimmedProjectType, userEmail);
      if (!result.success) console.warn(`⚠️ Failed to save project type to Databricks: ${result.error}`);
    } catch (error) { console.warn('Failed to save project type to Databricks:', error); }
  };

  const handleAddProjectTypeWithPrompt = async (projectType: string, prompt: string) => {
    const trimmedProjectType = projectType.trim();
    const trimmedPrompt = prompt.trim();
    if (!trimmedProjectType || !trimmedPrompt) { alert('Project type and prompt cannot be empty'); return; }
    if (isSystemProjectType(trimmedProjectType)) { alert(`❌ Cannot use name "${trimmedProjectType}" - this is a system project type.\n\nPlease choose a different name for your custom project type.`); return; }
    if (availableProjectTypes.includes(trimmedProjectType)) { alert('❌ Project type already exists. Please choose a different name.'); return; }
    if (userRole !== 'data-scientist') { alert('❌ Access Denied: Only Data Scientists can create new project types with prompts.'); return; }
    try {
      const { addProjectTypeWithPrompt } = await import('../utils/databricksAPI');
      const result = await addProjectTypeWithPrompt(trimmedProjectType, trimmedPrompt, userEmail, userRole);
      if (result.success) {
        const updatedTypes = [...availableProjectTypes, trimmedProjectType].sort();
        setAvailableProjectTypes(updatedTypes);
        localStorage.setItem('cohive_available_project_types', JSON.stringify(updatedTypes));
        const newConfig = { projectType: trimmedProjectType, prompt: trimmedPrompt, createdBy: userEmail, createdDate: Date.now() };
        const updatedConfigs = [...projectTypeConfigs, newConfig];
        setProjectTypeConfigs(updatedConfigs);
        localStorage.setItem('cohive_project_type_configs', JSON.stringify(updatedConfigs));
        alert(`✅ Project type "${trimmedProjectType}" created successfully!`);
        const configResult = await import('../utils/databricksAPI').then(m => m.fetchProjectTypeConfigs());
        if (configResult.success && configResult.configs) {
          setProjectTypeConfigs(configResult.configs);
          localStorage.setItem('cohive_project_type_configs', JSON.stringify(configResult.configs));
        }
      } else { alert(`❌ Failed to create project type: ${result.error || 'Unknown error'}`); }
    } catch (error) { alert(`❌ Failed to create project type: ${error instanceof Error ? error.message : 'Unknown error'}`); }
  };

  const handleExportData = () => {
    const brandName = responses['Enter']?.[0] || 'Brand';
    const projectType = responses['Enter']?.[1] || 'ProjectType';
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const filename = `${brandName}_${projectType}_${dateStr}_V1.md`;
    let markdown = `# CoHive Project Export\n\n**Brand:** ${brandName}\n**Project Type:** ${projectType}\n**Export Date:** ${new Date().toLocaleString()}\n**Template:** ${currentTemplate?.name || 'Default'}\n**User Role:** ${currentTemplate?.role || 'N/A'}\n\n---\n\n## Workflow Responses\n\n`;
    const stepOrder = ['Enter', 'Research', 'Luminaries', 'Stories', 'Consumers', 'Competitors', 'Colleagues', 'Cultural Voices', 'Social Voices', 'Wisdom', 'Grade', 'Action'];
    stepOrder.forEach(stepId => {
      if (responses[stepId] && Object.keys(responses[stepId]).length > 0) {
        markdown += `### ${stepId}\n\n`;
        Object.entries(responses[stepId]).forEach(([questionIndex, answer]) => { markdown += `**Q${parseInt(questionIndex) + 1}:** ${answer}\n\n`; });
      }
    });
    if (researchFiles.length > 0) { markdown += `---\n\n## Research Files\n\n`; researchFiles.forEach(file => { markdown += `- **${file.fileName}** (${file.brand} - ${file.projectType})${file.isApproved ? ' ✓' : ''}\n`; }); markdown += `\n`; }
    markdown += `---\n\n*Export Version: 1.0*\n*Template ID: ${currentTemplateId || 'default'}*\n`;
    const dataBlob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    alert('Import is not available. Project exports are now in Markdown format for documentation purposes. Your work is automatically saved to localStorage and Databricks.');
    event.target.value = '';
  };

  const loadKnowledgeBaseFiles = async () => {
    setIsDatabricksLoading(true);
    setDatabricksLoadingMessage('Loading knowledge base…');
    try {
      const session = await getValidSession();
      if (!session) {
        setResearchFiles([]);
        setIsDatabricksAuthenticated(false);
        return;
      }
      if (!currentTemplate) return;
      let kbFiles: KnowledgeBaseFile[] = [];
      kbFiles = await listKnowledgeBaseFiles({ sortBy: 'upload_date', sortOrder: 'DESC', limit: 500 });
      const filteredFiles = kbFiles.filter(file => file.fileType !== 'Findings');
      const convertedFiles: ResearchFile[] = filteredFiles.map((kbFile: KnowledgeBaseFile) => {
        let displayBrand = '', displayProjectType = 'Knowledge Base';
        if (kbFile.scope === 'category') { displayBrand = ''; displayProjectType = kbFile.projectType || 'Category Knowledge'; }
        else if (kbFile.scope === 'brand') { displayBrand = kbFile.brand || ''; displayProjectType = kbFile.projectType || kbFile.category || 'Brand Knowledge'; }
        else { displayBrand = ''; displayProjectType = kbFile.projectType || 'General Knowledge'; }
        return { id: kbFile.fileId, brand: displayBrand, projectType: displayProjectType, fileName: kbFile.fileName, isApproved: kbFile.isApproved, uploadDate: new Date(kbFile.uploadDate).getTime(), fileType: kbFile.fileType, source: kbFile.filePath, scope: kbFile.scope, contentSummary: kbFile.contentSummary };
      });
      setResearchFiles(convertedFiles);
      localStorage.setItem('cohive_research_files', JSON.stringify(convertedFiles));

      // ── Findings/Iteration files — populate projectFiles for Enter hex ────
      const findingsFiles = kbFiles.filter(file => file.fileType === 'Findings' && file.brand && file.fileName);
      if (findingsFiles.length > 0) {
        const kbProjectFiles: ProjectFile[] = findingsFiles.map(f => ({
          brand: f.brand || '',
          projectType: f.projectType || f.category || '',
          fileName: f.fileName,
          timestamp: f.uploadDate ? new Date(f.uploadDate).getTime() : Date.now(),
        }));
        setProjectFiles(prev => {
          const merged = [...kbProjectFiles];
          prev.forEach(local => {
            const alreadyIn = merged.some(k => k.fileName === local.fileName && k.brand.toLowerCase() === local.brand.toLowerCase());
            if (!alreadyIn) merged.push(local);
          });
          localStorage.setItem('cohive_projects', JSON.stringify(merged));
          return merged;
        });
      }
    } catch (error) {
      console.error('Failed to load knowledge base files:', error);
      setResearchFiles([]);
    } finally {
      setIsDatabricksLoading(false);
    }
  };

  const handleRestart = () => {
    const confirmed = confirm('⚠️ WARNING: Restart Project\n\nThis action will permanently delete:\n• All workflow steps and progress\n• All responses and data entered\n• All execution history\n• All uploaded ideas files\n• Templates, research files, and project files will be preserved.\n\nThis action CANNOT be undone.\n\nAre you sure you want to restart?');
    if (!confirmed) return;
    setResponses({});
    setActiveStepId('Enter');
    setShowValidation(false);
    setIdeasFiles([]);
    setHexExecutions({});
    setNoteEntries([{ id: `note-restart-${Date.now()}`, type: 'note', text: '' }]);
    localStorage.removeItem('cohive_responses');
    localStorage.removeItem('cohive_hex_executions');
    localStorage.removeItem('cohive_ideas_files');
    alert('Project has been restarted. All data has been cleared.');
  };

  return (
    <div className="p-8">
      {isCheckingAuth && <LoadingGem message="Starting CoHive…" />}

      <div className="flex gap-6 mb-6">
        <div className="flex-shrink-0">
          <ProcessFlow
            activeStep={activeStepId}
            onStepChange={(stepId) => {
              if (stepId === 'Enter' && iterationSaved) {
                // Seed the filename field with the last saved name so the version-bump
                // useEffect can strip the suffix and suggest the next version correctly.
                const seedName = lastSavedFileName || '';
                setResponses(prev => ({ ...prev, 'Enter': { ...prev['Enter'], [2]: seedName }, 'Findings': { ...prev['Findings'], [0]: '' } }));
                setIterationSaved(false);
                localStorage.setItem('cohive_iteration_saved', 'false');
              }
              // Clear iteration gems when navigating to Enter — iteration boundary
              if (stepId === 'Enter') {
                setIterationGems([]);
                setIterationChecks([]);
                setIterationCoal([]);
                setIterationDirections([]);
                setGradeScoreResults(null);
                setGradeModalOpen(false);
                setGradeExtractedIdeas([]);
              }
              if (stepId === 'Enter' && !iterationSaved) {
                setResponses(prev => ({ ...prev, 'Findings': { ...prev['Findings'], [0]: '' } }));
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

          <div className="flex flex-col gap-3 mt-4">
            {showSaveNotification && (
              <span className="flex items-center gap-2 text-green-600 text-sm px-3 py-2 bg-green-50 rounded">
                <Save className="w-4 h-4" />
                Saved
              </span>
            )}
            <button className="px-4 py-2 border-2 border-red-500 text-red-700 rounded flex items-center gap-2 hover:bg-gray-50" onClick={handleRestart} title="Restart the project and clear all data">
              <RotateCcw className="w-4 h-4" />Restart Project
            </button>
            <button className="px-4 py-2 border-2 border-gray-500 text-gray-700 rounded flex items-center gap-2 hover:bg-gray-50"
              onClick={() => { if (window.confirm('Are you sure you want to log out? This will return you to the landing page.')) { localStorage.removeItem('cohive_logged_in'); window.location.reload(); } }}
              title="Log out and return to landing page">
              <User className="w-4 h-4" />Log Out
            </button>
            <div className="flex items-center gap-2 px-3 py-2 border-2 border-gray-300 rounded">
              <User className="w-4 h-4 text-gray-600" />
              <div className="flex flex-col"><span className="text-xs text-gray-500">Template</span><span className="text-sm text-gray-900">{currentTemplateId}</span></div>
            </div>
            <div className="relative">
              {(isCohiveUser || currentTemplate?.permissions?.canEditTemplates) && (
                <>
                  <button className="w-full px-4 py-2 border-2 border-gray-400 text-gray-700 rounded flex items-center gap-2 hover:bg-gray-50" onClick={() => setShowTemplateManager(true)}>
                    <Settings className="w-4 h-4" />Manage Templates
                  </button>
                  {showTemplateManager && currentTemplate && (
                    <TemplateManager currentTemplate={currentTemplate} availableTemplates={templates} onTemplateChange={handleTemplateChange} onTemplateUpdate={handleTemplateUpdate} onTemplateCreate={handleTemplateCreate} />
                  )}
                </>
              )}
              {currentTemplate?.permissions?.canEditTemplates && (
                <>
                  <button className="w-full px-4 py-2 border-2 border-gray-400 text-gray-700 rounded flex items-center gap-2 hover:bg-gray-50" onClick={() => setShowModelTemplateManager(true)}>
                    <Cpu className="w-4 h-4" />Model Templates
                  </button>
                  {showModelTemplateManager && currentModelTemplate && (
                    <ModelTemplateManager currentTemplate={currentModelTemplate} availableTemplates={modelTemplates} onTemplateChange={handleModelTemplateChange} onTemplateUpdate={handleModelTemplateUpdate} onTemplateCreate={handleModelTemplateCreate} />
                  )}
                </>
              )}
              {/* Diagnostic Panel button - Only for Test@cohive.com */}
              {(localStorage.getItem('cohive_pending_email') || '').toLowerCase() === 'test@cohive.com' && (
                <button
                  className="w-full px-4 py-2 border-2 border-orange-400 text-orange-600 rounded flex items-center gap-2 hover:bg-orange-50"
                  onClick={() => setShowDiagnosticPanel(true)}
                >
                  <Settings className="w-4 h-4" />
                  Unit Testing
                </button>
              )}
              {/* Activity Log Viewer - CoHive administrators only */}
              {userRole === 'administrator' && userEmail.toLowerCase().endsWith('@cohivesolutions.com') && (
                <button
                  className="w-full px-4 py-2 border-2 border-indigo-400 text-indigo-600 rounded flex items-center gap-2 hover:bg-indigo-50"
                  onClick={() => setShowLogViewer(true)}
                >
                  <Database className="w-4 h-4" />
                  Activity Log
                </button>
              )}
            </div>
          </div>
        </div>

        
        <div className="flex-1 flex gap-6">
          <div className="flex-1">
            <div className="mb-4 -mt-8 flex justify-center">
              <img src={cohiveLogo} alt="CoHive - Insight into Inspiration" className="h-24" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-gray-900">
                  {activeStepId === 'research' && !currentTemplate?.permissions?.canApproveResearch ? 'View Knowledge Assets' : currentContent.title}
                </h2>
                <div className="flex items-center gap-2">
                  {isCurrentStepComplete && (<span className="flex items-center gap-1 px-3 py-1 text-green-800 text-sm"><CircleCheck className="w-4 h-4" />Complete</span>)}
                </div>
              </div>

              <p className="text-gray-600 mb-6">
                {activeStepId === 'research' && !currentTemplate?.permissions?.canApproveResearch ? 'Review and suggest edits to the knowledge assets your projects will be based on' : currentContent.description}
              </p>

              {activeStepId === 'Enter' && showValidation && !isCurrentStepComplete && (
                <div className="mb-4 p-4 border-2 border-red-200 rounded-lg flex items-start gap-2">
                  <CircleAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-red-900">Please complete the Enter step</div>
                    <div className="text-red-700 text-sm">All Enter questions must be answered before proceeding to the next step.</div>
                  </div>
                </div>
              )}

              {(activeStepId === 'Enter' || !isDatabricksAuthenticated) && (
                <div className="mb-3">
                  {isCheckingAuth ? (
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-2.5">
                      <div className="flex items-center gap-2"><SpinHex className="w-4 h-4" /><span className="text-gray-700 text-sm">Checking Databricks authentication...</span></div>
                    </div>
                  ) : isDatabricksAuthenticated ? (
                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-2.5">
                      <div className="flex items-center gap-2"><CircleCheck className="w-4 h-4 text-green-600" /><span className="text-gray-900 text-sm font-medium">Connected to Databricks</span></div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CircleAlert className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-gray-900 font-medium mb-1">Databricks Authentication Required</h4>
                          <p className="text-gray-700 text-sm mb-3">CoHive integrates with Databricks to save your work, access your organization's Knowledge Base, and power AI-driven insights across all workflow steps.</p>
                          <button onClick={() => setShowLoginModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-2">
                            <Database className="w-4 h-4" />Sign In to Databricks
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

             <div className="space-y-4">
                {activeStepId === 'research' ? (
                 (userRole === 'administrator' || userRole === 'research-analyst' || userRole === 'research-leader' || userRole === 'data-scientist') ? (
                   <ResearcherModes brand={responses['Enter']?.[0]?.trim() || ''} projectType={responses['Enter']?.[1]?.trim() || ''} researchFiles={researchFiles} editSuggestions={editSuggestions} canApproveResearch={currentTemplate?.permissions?.canApproveResearch || false} canManageExamples={canManageExamples} onCreateResearchFile={handleCreateResearchFile} onToggleApproval={handleToggleApproval} onUpdateResearchFile={handleUpdateResearchFile} onUpdateSuggestionStatus={handleUpdateSuggestionStatus} availableBrands={availableBrands} availableProjectTypes={availableProjectTypes} projectTypeConfigs={projectTypeConfigs} onAddBrand={handleAddBrand} onAddProjectType={handleAddProjectType} onAddProjectTypeWithPrompt={handleAddProjectTypeWithPrompt} userRole={userRole} onModeChange={(mode) => setResearchMode(mode)} onFileOpen={(fileName) => setSelectedKBFile(fileName)} onPendingCountChange={(count) => setPendingApprovalCount(count)} processingModelEndpoint={currentModelTemplate ? (getModelForExecution(currentModelTemplate, 'research', 'synthesis') ?? undefined) : undefined} onRefreshFiles={loadKnowledgeBaseFiles} onLoadingChange={(loading, msg) => { setIsDatabricksLoading(loading); if (msg) setDatabricksLoadingMessage(msg); }} />
                        ) : (
                   <ResearchView role="non-researcher" brand={responses['Enter']?.[0]?.trim() || ''} projectType={responses['Enter']?.[1]?.trim() || ''} researchFiles={researchFiles} editSuggestions={editSuggestions} onAddSuggestion={handleAddSuggestion} onUpdateSuggestionStatus={handleUpdateSuggestionStatus} onToggleApproval={handleToggleApproval} canApproveResearch={currentTemplate?.permissions?.canApproveResearch || false} onCreateResearchFile={handleCreateResearchFile} />
                         )
                         ) : activeStepId === 'review' ? (
                  <ReviewView projectFiles={projectFiles} onDeleteFiles={handleDeleteProjectFiles} />
                         ) : activeStepId === 'stories' ? (
                  <StoriesView
                    brand={responses['Enter']?.[0]?.trim() || ''}
                    iterationDirections={iterationDirections}
                    onGenerate={handleStoriesGenerate}
                    onAddIterationDirection={handleAddIterationDirection}
                    onSaveRecommendation={handleSaveRecommendation}
                    userEmail={userEmail}
                    userRole={userRole}
                    projectType={responses['Enter']?.[1]?.trim() || ''}
                  />
                         ) : isCentralHex ? (
                  <>
                  <CentralHexView key={activeStepId} hexId={activeStepId} hexLabel={currentContent.title} researchFiles={researchFiles} customPersonas={customPersonas} onExecute={handleCentralHexExecute} databricksInstructions={currentTemplate?.databricksInstructions?.[activeStepId] || ''} previousExecutions={hexExecutions[activeStepId] || []} crossHexExecutions={[...['Consumers', 'Luminaries', 'Colleagues', 'cultural', 'Grade'].filter(h => h !== activeStepId).flatMap(h => hexExecutions[h] || []), ...(hexExecutions['stories'] || [])]} anyPriorPersonaRun={['Consumers', 'Luminaries', 'Colleagues', 'cultural', 'Grade'].some(h => hexExecutions[h]?.length > 0) || (hexExecutions['stories']?.length ?? 0) > 0} onSaveRecommendation={handleSaveRecommendation} projectType={responses['Enter']?.[1] || ''} userBrand={responses['Enter']?.[0] || ''} lastResults={lastAssessmentResults} conversationMode={currentTemplate?.conversationSettings?.conversationMode || 'multi-round'} modelEndpoint={currentTemplate?.conversationSettings?.modelEndpoint || 'databricks-claude-haiku-4-5'} requestMode={deriveRequestMode()} userEmail={userEmail} userRole={userRole} onContextChange={(files, step) => setHexWidgetContext({ files, step })} onAddIterationDirection={handleAddIterationDirection} iterationDirections={iterationDirections} extractedIdeas={gradeExtractedIdeas} ideasLoading={gradeIdeasLoading} />
                  {/* Grade hex: scoring results displayed inline */}
                  {gradeScoring && <LoadingGem message="Scoring against segments…" />}
                  {activeStepId === 'Grade' && (
                    <div className="mt-4 px-3">
                      {gradeScoring && (
                        <div className="flex items-center gap-2 py-4 text-gray-500">
                          <span className="text-sm">Scoring in progress…</span>
                        </div>
                      )}
                      {gradeScoreResults && !gradeScoring && (
                        <div className="flex items-center gap-3 py-2">
                          <button
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                            onClick={() => setGradeModalOpen(true)}
                          >
                            View Score Results
                          </button>
                          <button
                            className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
                            onClick={() => { setGradeScoreResults(null); setGradeModalOpen(false); }}
                          >
                            Clear
                          </button>
                          <span className="text-xs text-gray-400">Results saved with iteration</span>
                        </div>
                      )}
                    </div>
                  )}
                  </>
                        ) : (
                    <>
                    {wisdomSuccessMessage && activeStepId === 'Wisdom' && (
                      <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between gap-3">
                        <p className="text-sm text-green-800">{wisdomSuccessMessage}</p>
                        <button onClick={() => setWisdomSuccessMessage(null)} className="flex-shrink-0 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">OK</button>
                      </div>
                    )}
                    {wisdomErrorMessage && activeStepId === 'Wisdom' && (
                      <div className="mb-4 bg-red-50 border border-red-300 rounded-lg p-3 flex items-center justify-between gap-3">
                        <p className="text-sm text-red-800">{wisdomErrorMessage}</p>
                        <button onClick={() => setWisdomErrorMessage(null)} className="flex-shrink-0 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">✕</button>
                      </div>
                    )}
                    {currentContent.questions.map((question, idx) => {
                      const hasResponse = responses[activeStepId]?.[idx]?.trim().length > 0;
                      const showError = false;

                      if (activeStepId === 'Enter') {
                        const brand = responses['Enter']?.[0]?.trim();
                        const projectType = responses['Enter']?.[1]?.trim();

                        if (question === 'Ideas Source') {
                          if (projectType === 'War Games') return null;
                          const ideasChoice = responses[activeStepId]?.[idx];
                          const nextQuestionIdx = idx + 1;
                          return (
                            <div key={idx} className="mb-2">
                              <label className="block text-gray-900 mb-1 flex items-start justify-between">
                                <span>{idx + 1}. Load Current Ideas or Get Inspired?</span>
                                {hasResponse && <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                              </label>
                              <div className="space-y-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" name="ideasSource" value="Load Current Ideas" checked={responses[activeStepId]?.[idx] === 'Load Current Ideas'} onChange={(e) => handleResponseChange(idx, e.target.value)} className="w-4 h-4" />
                                  <span className="text-gray-700">Load Current Ideas</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" name="ideasSource" value="Get Inspired" checked={responses[activeStepId]?.[idx] === 'Get Inspired'} onChange={(e) => handleResponseChange(idx, e.target.value)} className="w-4 h-4" />
                                  <span className="text-gray-700">Get Inspired</span>
                                </label>
                              </div>
                              {ideasChoice === 'Load Current Ideas' && (
                                <div className="mt-2">
                                  <label className="block text-gray-900 mb-1 flex items-start justify-between">
                                    <span>{idx + 2}. Upload Ideas File</span>
                                    {responses[activeStepId]?.[nextQuestionIdx] && <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                                  </label>
                                  <input type="file" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls" className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      const fileName = file.name;
                                      const fileType = file.type || 'application/octet-stream';
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        const base64Content = event.target?.result as string;
                                        const newIdeasFile: IdeasFile = { brand: brand || '', projectType: projectType || '', fileName, content: base64Content, fileType, uploadDate: Date.now() };
                                        const updatedIdeasFiles = ideasFiles.filter(f => !(f.brand.toLowerCase() === brand?.toLowerCase() && f.projectType.toLowerCase() === projectType?.toLowerCase()));
                                        updatedIdeasFiles.push(newIdeasFile);
                                        setIdeasFiles(updatedIdeasFiles);
                                        localStorage.setItem('cohive_ideas_files', JSON.stringify(updatedIdeasFiles));
                                        handleResponseChange(nextQuestionIdx, fileName);
                                      };
                                      reader.onerror = () => { alert('Failed to read file. Please try again.'); };
                                      reader.readAsDataURL(file);
                                    }}
                                  />
                                  {responses[activeStepId]?.[nextQuestionIdx] && (() => {
                                    const currentIdeasFile = getIdeasFile(brand || '', projectType || '');
                                    return (
                                      <div className="text-sm mt-2">
                                        <p className="text-green-700 flex items-center gap-2">
                                          <CircleCheck className="w-4 h-4" />Selected: {responses[activeStepId][nextQuestionIdx]}
                                        </p>
                                        {currentIdeasFile && <p className="text-blue-600 text-xs mt-1">✓ File content stored ({(currentIdeasFile.content.length / 1024).toFixed(1)} KB) - Will be sent to Databricks on execution</p>}
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        }

                        if (question === 'Research Files') {
                          const approvedFiles = brand && projectType ? getApprovedResearchFiles(brand, projectType) : [];
                          const exampleFiles = getExampleFiles(projectType || '');

                          const toggleFile = (fileName: string, checked: boolean) => {
                            const updated = checked
                              ? [...selectedResearchFiles, fileName]
                              : selectedResearchFiles.filter(f => f !== fileName);
                            setSelectedResearchFiles(updated);
                            localStorage.setItem('cohive_selected_research_files', JSON.stringify(updated));
                          };

                          return (
                            <div key={idx} className="mb-2 space-y-3">
                              <label className="block text-gray-900 mb-1 flex items-start justify-between">
                                <span>{idx + 1}. Select Knowledge Files</span>
                                {hasResponse && <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                              </label>

                              {/* Brand/project research files — matched PT first, then others */}
                              <div className="border-2 border-gray-300 rounded-lg p-3">
                                <h6 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                                  Research Files — {brand}{projectType ? ` · ${projectType}` : ''}
                                </h6>
                                <div className="space-y-1">
                                  {approvedFiles.length > 0 ? (() => {
                                    const ptLower = (projectType || '').toLowerCase();
                                    const matched = approvedFiles.filter(f => (f.projectType || '').toLowerCase() === ptLower);
                                    const others  = approvedFiles.filter(f => (f.projectType || '').toLowerCase() !== ptLower);
                                    const renderFile = (file: ResearchFile, fileIdx: number) => (
                                      <label key={fileIdx} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          name="researchFiles"
                                          value={file.fileName}
                                          checked={selectedResearchFiles.includes(file.fileName)}
                                          onChange={(e) => toggleFile(file.fileName, e.target.checked)}
                                          className="w-4 h-4"
                                        />
                                        <span className="text-gray-700 text-sm">{file.fileName}</span>
                                        <span className="text-xs text-gray-400">{new Date(file.uploadDate).toLocaleDateString()}</span>
                                      </label>
                                    );
                                    return (
                                      <>
                                        {matched.map(renderFile)}
                                        {matched.length > 0 && others.length > 0 && (
                                          <div className="flex items-center gap-2 my-2">
                                            <div className="flex-1 border-t border-gray-200" />
                                            <span className="text-xs text-gray-400 whitespace-nowrap">Other project types</span>
                                            <div className="flex-1 border-t border-gray-200" />
                                          </div>
                                        )}
                                        {others.map((f, i) => renderFile(f, matched.length + i))}
                                        {matched.length === 0 && others.length === 0 && (
                                          <p className="text-gray-500 text-sm italic">No approved research files for {brand}.</p>
                                        )}
                                      </>
                                    );
                                  })() : (
                                    <p className="text-gray-500 text-sm italic">No approved research files for {brand}.</p>
                                  )}
                                </div>
                              </div>

                              {/* Example files — cross-brand, always shown */}
                              {exampleFiles.length > 0 && (
                                <div className="border-2 border-amber-300 rounded-lg p-3 bg-amber-50">
                                  <h6 className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">
                                    ✦ Example Files
                                  </h6>
                                  <p className="text-xs text-amber-700 mb-1">
                                    Cross-brand reference files. The AI will use these as quality and format standards only — not as facts about {brand}.
                                  </p>
                                  {(() => {
                                    const modelId = assessmentModalProps?.modelEndpoint || currentModelTemplate?.hexModels?.['Luminaries']?.modelId || 'databricks-claude-haiku-4-5';
                                    const modelSupports = ['databricks-claude-sonnet-4-6','databricks-gpt-5-2','databricks-gpt-5-1','databricks-gpt-5','databricks-gemini-3-1-pro','databricks-gemini-2-5-pro','databricks-gpt-5-mini','databricks-gemini-3-flash','databricks-gemini-2-5-flash','databricks-claude-haiku-4-5'].includes(modelId);
                                    return modelSupports ? (
                                      <p className="text-xs text-amber-600 mb-2">✦ Your selected model can read PDF and DOCX examples directly — format replication is enabled.</p>
                                    ) : (
                                      <p className="text-xs text-amber-600 mb-2">Text version of examples will be used (model does not support document reading).</p>
                                    );
                                  })()}
                                  <div className="space-y-1">
                                    {exampleFiles.map((file, fileIdx) => (
                                      <label key={fileIdx} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          name="researchFiles"
                                          value={file.fileName}
                                          checked={selectedResearchFiles.includes(file.fileName)}
                                          onChange={(e) => toggleFile(file.fileName, e.target.checked)}
                                          className="w-4 h-4 accent-amber-600"
                                        />
                                        <span className="text-amber-900 text-sm font-medium">{file.fileName}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }

                        if (idx === 2 && question === 'Filename for this iteration') {
                          const currentFileName = responses[activeStepId]?.[idx] || '';
                          let suggestedFileName = '';
                          if (brand && projectType) {
                            const baseFileName = generateDefaultFileName(brand, projectType);
                            const matchingFiles = projectFiles.filter(file => file.brand === brand && file.projectType === projectType && file.fileName.startsWith(baseFileName));
                            if (matchingFiles.length > 0) {
                              let highestVersion = 0;
                              matchingFiles.forEach(file => { const vm = file.fileName.match(/_v(\d+)$/); if (vm) { const v = parseInt(vm[1], 10); if (v > highestVersion) highestVersion = v; } else if (file.fileName === baseFileName) { highestVersion = Math.max(highestVersion, 1); } });
                              suggestedFileName = `${baseFileName}_v${highestVersion + 1}`;
                            } else { suggestedFileName = baseFileName; }
                            if (suggestedFileName && !currentFileName) setTimeout(() => { handleResponseChange(idx, suggestedFileName); }, 0);
                          }
                          return (
                            <div key={idx} className="mb-2">
                              <label className="block text-gray-900 mb-1 flex items-start justify-between">
                                <span>{idx + 1}. {question}</span>
                                {hasResponse && <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                              </label>
                              <input type="text" className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 font-mono focus:outline-none focus:border-blue-500" value={displayFileName(responses[activeStepId]?.[idx] || suggestedFileName)} onChange={(e) => handleResponseChange(idx, e.target.value)} placeholder={displayFileName(suggestedFileName)} />
                              <p className="text-gray-600 text-xs mt-1">You can edit this filename or keep the suggested name</p>
                            </div>
                          );
                        }
                      }

                      // Wisdom hex questions — preserved from original, truncated for brevity
                      if (activeStepId === 'Wisdom') {
                        const brand = responses['Enter']?.[0]?.trim() || '';
                        const projectType = responses['Enter']?.[1]?.trim() || '';
                        const insightType = brand ? 'Brand' : (projectType ? 'Category' : 'General');
                        if (idx === 0 && question === 'Input Method') {
                          return (
                            <div key={idx} className="mb-2">
                              <label className="block text-gray-900 mb-1 flex items-start justify-between">
                                <span>How would you like to share?</span>
                                {hasResponse && <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                              </label>
                              <div className="space-y-1">
                                {['Text', 'Voice', 'Photo', 'File', 'Interview', 'Persona Interview'].map(method => (
                                  <label key={method} className="flex items-start gap-2 cursor-pointer">
                                    <input type="radio" name="inputMethod" value={method} checked={responses[activeStepId]?.[idx] === method} onChange={(e) => handleResponseChange(idx, e.target.value)} className="w-4 h-4 mt-0.5" />
                                    <span className="text-gray-700">
                                      {method === 'Text' ? 'Text / dictation, unlimited time'
                                        : method === 'Voice' ? 'Voice / audio - 90 seconds'
                                        : method === 'Interview' ? 'Be Interviewed'
                                        : method === 'Persona Interview' ? (
                                          <span>
                                            Interview to Become a Persona
                                            <span className="block text-xs text-indigo-600 mt-0.5">Your AI Persona can attempt to ask and answer questions about a strategy as well as make recommendations and assessments.</span>
                                          </span>
                                        )
                                        : method}
                                    </span>
                                  </label>
                                ))}
                              </div>
                              <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                                If you have a video of the brand in use or at an event, please send it to{' '}
                                <a href="mailto:help@cohivesolutions.com" className="text-blue-600 hover:underline">help@cohivesolutions.com</a>
                                , or load the file into a share drive and send a note with the filename and address/url.
                              </p>
                            </div>
                          );
                        }
                        if (idx === 1 && question === 'Share Your Wisdom') {
                          const inputMethod = responses[activeStepId]?.[0];
                          if (!inputMethod) return null;

                          const usesMic = ['Text', 'Voice', 'Interview', 'Persona Interview'].includes(inputMethod);
                          const MicDevicePicker = usesMic && micDevices.length > 1 ? (
                            <div className="flex items-center gap-2 mb-3">
                              <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                              <select
                                value={selectedMicDeviceId}
                                onChange={e => setSelectedMicDeviceId(e.target.value)}
                                className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 text-gray-700 bg-white focus:outline-none focus:border-blue-500"
                              >
                                {micDevices.map(d => (
                                  <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                                ))}
                              </select>
                            </div>
                          ) : null;

                          // Shared filename helper — Wisdom_email_DDMMYY.ext
                          const wisdomFileName = (ext: string) => {
                            const d = new Date();
                            const dd = String(d.getDate()).padStart(2, '0');
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const yy = String(d.getFullYear()).slice(-2);
                            return `Wisdom_${userEmail.replace(/[@.]/g, '_')}_${dd}${mm}${yy}.${ext}`;
                          };

                          // TEXT — textarea + microphone (speech-to-text)
                          if (inputMethod === 'Text') {
                            return (
                              <div key={idx} className="mb-2">
                                <label className="block text-gray-900 mb-1 flex items-start justify-between">
                                  <span>Share Your Wisdom</span>
                                  {hasResponse && <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                                </label>
                                {MicDevicePicker}
                                <div className="relative">
                                  <textarea className="w-full border-2 border-gray-300 bg-white rounded p-2 pr-10 text-gray-700 focus:outline-none focus:border-blue-500" placeholder={`Share your ${insightType.toLowerCase()} insight here...`} rows={6} value={responses[activeStepId]?.[idx] || ''} onChange={(e) => handleResponseChange(idx, e.target.value)} />
                                  <button
                                    type="button"
                                    title="Dictate (speech to text)"
                                    className="absolute bottom-3 right-2 p-1.5 rounded-full bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600"
                                    onClick={async () => {
                                      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                                      if (!SR) { alert('Speech recognition is not supported in this browser.'); return; }
                                      // Prime the browser to the selected device before SpeechRecognition starts
                                      if (selectedMicDeviceId && selectedMicDeviceId !== 'default') {
                                        try {
                                          const s = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: selectedMicDeviceId } } });
                                          s.getTracks().forEach(t => t.stop());
                                        } catch { /* fall back to browser default */ }
                                      }
                                      const rec = new SR();
                                      rec.continuous = true; rec.interimResults = false; rec.lang = 'en-US';
                                      rec.onresult = (e: any) => {
                                        const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
                                        handleResponseChange(idx, (responses[activeStepId]?.[idx] || '') + ' ' + transcript);
                                      };
                                      rec.start();
                                      setTimeout(() => rec.stop(), 30000);
                                    }}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                  </button>
                                </div>
                                {hasResponse && (
                                  <button onClick={async () => {
                                    const wisdom = responses[activeStepId]?.[idx];
                                    if (!wisdom) return;
                                    const saved = await handleSaveWisdomToDatabricks(wisdomFileName('txt'), wisdom, insightType, 'Text', brand, projectType);
                                    if (saved) {
                                      handleResponseChange(idx, '');
                                      handleResponseChange(0, '');
                                    }
                                  }} disabled={isWisdomSaving} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2">
                                    {isWisdomSaving ? <><SpinHex className="w-4 h-4" />Saving...</> : 'Save to Knowledge Base'}
                                  </button>
                                )}
                              </div>
                            );
                          }

                          // VOICE — microphone recording → save as .webm audio file for later transcription
                          if (inputMethod === 'Voice') {
                            const voiceScope: 'general' | 'category' | 'brand' = insightType === 'General' ? 'general' : insightType === 'Category' ? 'category' : 'brand';
                            return (
                              <div key={idx} className="mb-2">
                                <label className="block text-gray-900 mb-1 flex items-start justify-between">
                                  <span>Record Your Wisdom</span>
                                  {hasResponse && <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                                </label>
                                {MicDevicePicker}
                                <div className="space-y-2">
                                  <button
                                    className="w-full px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-2"
                                    onClick={async () => {
                                      if (!isDatabricksAuthenticated) { setWisdomErrorMessage('⚠️ Please sign in to Databricks before saving. Click the Sign In button in the header.'); setShowLoginModal(true); return; }
                                      try {
                                        const audioConstraints: MediaStreamConstraints['audio'] =
                                          selectedMicDeviceId && selectedMicDeviceId !== 'default'
                                            ? { deviceId: { exact: selectedMicDeviceId } }
                                            : true;
                                        const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
                                        const recorder = new MediaRecorder(stream);
                                        const chunks: BlobPart[] = [];
                                        recorder.ondataavailable = (e) => chunks.push(e.data);
                                        recorder.onstop = async () => {
                                          stream.getTracks().forEach(t => t.stop());
                                          const blob = new Blob(chunks, { type: 'audio/webm' });
                                          const audioFileName = wisdomFileName('webm');
                                          const audioFile = new File([blob], audioFileName, { type: 'audio/webm' });
                                          setIsWisdomSaving(true);
                                          setIsDatabricksLoading(true);
                                          setDatabricksLoadingMessage('Saving recording…');
                                          setWisdomErrorMessage(null);
                                          try {
                                            const result = await uploadToKnowledgeBase({
                                              file: audioFile,
                                              scope: voiceScope,
                                              brand: voiceScope === 'brand' ? (brand || undefined) : undefined,
                                              projectType: projectType || undefined,
                                              fileType: 'Wisdom',
                                              tags: [insightType, 'Voice'],
                                              insightType: insightType as 'Brand' | 'Category' | 'General',
                                              inputMethod: 'Voice',
                                              userEmail,
                                              userRole,
                                            });
                                            if (result.success) {
                                              handleResponseChange(idx, 'Voice recording saved');
                                              setWisdomSuccessMessage(`✅ "${audioFileName}" saved to Knowledge Base.\n\nThis recording will be transcribed when processed by a research manager.`);
                                            } else {
                                              setWisdomErrorMessage(`Failed to save recording: ${result.error || 'Unknown error'}`);
                                            }
                                          } catch (err) {
                                            setWisdomErrorMessage(`Failed to save recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
                                          } finally {
                                            setIsWisdomSaving(false);
                                            setIsDatabricksLoading(false);
                                          }
                                        };
                                        recorder.start();
                                        setWisdomInputMethod('recording');
                                        setTimeout(() => { recorder.stop(); setWisdomInputMethod(null); }, 120000);
                                        (window as any)._wisdomRecorder = recorder;
                                      } catch { alert('Microphone access denied. Please allow microphone access and try again.'); }
                                    }}
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                    {wisdomInputMethod === 'recording' ? '🔴 Recording… (tap to stop)' : 'Start Recording'}
                                  </button>
                                  {wisdomInputMethod === 'recording' && (
                                    <button className="w-full px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-900"
                                      onClick={() => { (window as any)._wisdomRecorder?.stop(); setWisdomInputMethod(null); }}>
                                      Stop Recording
                                    </button>
                                  )}
                                  {responses[activeStepId]?.[idx] && <div className="bg-green-50 border border-green-200 rounded p-2"><p className="text-sm text-green-700">✓ {responses[activeStepId][idx]}</p></div>}
                                </div>
                              </div>
                            );
                          }

                          // PHOTO — upload or use camera
                          if (inputMethod === 'Photo') {
                            const photoScope: 'general' | 'category' | 'brand' = insightType === 'General' ? 'general' : insightType === 'Category' ? 'category' : 'brand';
                            const MAX_PHOTO_BYTES = 3.4 * 1024 * 1024;
                            const uploadPhoto = async (file: File, label: string, e: React.ChangeEvent<HTMLInputElement>) => {
                              if (!isDatabricksAuthenticated) { setWisdomErrorMessage('⚠️ Please sign in to Databricks before saving. Click the Sign In button in the header.'); setShowLoginModal(true); e.target.value = ''; return; }
                              if (file.size > MAX_PHOTO_BYTES) { setWisdomErrorMessage(`Photo is too large (${Math.round(file.size / 1024 / 1024 * 10) / 10}MB). Maximum is 3.4MB — please resize the image first.`); e.target.value = ''; return; }
                              const ext = file.name.split('.').pop() || 'jpg';
                              const renamed = new File([file], wisdomFileName(ext), { type: file.type });
                              setIsWisdomSaving(true);
                              setIsDatabricksLoading(true);
                              setDatabricksLoadingMessage('Saving photo…');
                              setWisdomErrorMessage(null);
                              try {
                                const result = await uploadToKnowledgeBase({ file: renamed, scope: photoScope, brand: photoScope === 'brand' ? (brand || undefined) : undefined, projectType: projectType || undefined, fileType: 'Wisdom', tags: [insightType, 'Photo'], insightType: insightType as 'Brand' | 'Category' | 'General', inputMethod: 'Photo', userEmail, userRole });
                                if (result.success) { handleResponseChange(idx, label); setWisdomSuccessMessage(`✅ "${renamed.name}" saved to Knowledge Base.\n\nThis file will be made available after it has been processed, read and approved by a research manager.`); }
                                else { setWisdomErrorMessage(`Failed to save photo: ${result.error || 'Unknown error'}`); }
                              } catch (err) { setWisdomErrorMessage(`Failed to save photo: ${err instanceof Error ? err.message : 'Unknown error'}`); }
                              finally { setIsWisdomSaving(false); setIsDatabricksLoading(false); e.target.value = ''; }
                            };
                            return (
                              <div key={idx} className="mb-2">
                                <label className="block text-gray-900 mb-1 flex items-start justify-between">
                                  <span>Share a Photo</span>
                                  {hasResponse && <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                                </label>
                                <div className="space-y-2">
                                  <p className="text-xs text-gray-500">Maximum file size: 3.4MB. For larger photos, resize before uploading.</p>
                                  <label className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded cursor-pointer ${isWisdomSaving ? 'bg-blue-400 text-white pointer-events-none' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                    {isWisdomSaving ? <SpinHex className="w-5 h-5" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                                    {isWisdomSaving ? 'Saving...' : 'Upload Photo'}
                                    <input type="file" accept="image/*" className="hidden" disabled={isWisdomSaving} onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; await uploadPhoto(file, `Photo: ${file.name}`, e); }} />
                                  </label>
                                  <button
                                    type="button"
                                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-700 text-white rounded hover:bg-gray-900"
                                    onClick={async () => {
                                      try {
                                        const s = await navigator.mediaDevices.getUserMedia({ video: true });
                                        setStream(s);
                                        setWisdomCameraMode('photo');
                                      } catch (err) { setWisdomErrorMessage(`Camera error: ${err instanceof Error ? err.message : 'Unable to access camera'}`); }
                                    }}
                                  >
                                    <Camera className="w-5 h-5" />
                                    Take Photo with Camera
                                  </button>
                                  {wisdomCameraMode === 'photo' && (
                                    <div className="border-2 border-gray-300 rounded overflow-hidden">
                                      <video ref={wisdomVideoRef} autoPlay muted playsInline className="w-full rounded-t" />
                                      <div className="flex gap-2 p-2 bg-gray-50">
                                        <button
                                          type="button"
                                          disabled={isWisdomSaving}
                                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center gap-2"
                                          onClick={async () => {
                                            const video = wisdomVideoRef.current;
                                            if (!video) { setWisdomErrorMessage('Camera stream not ready — please try again.'); return; }
                                            const canvas = document.createElement('canvas');
                                            canvas.width = video.videoWidth || 1280;
                                            canvas.height = video.videoHeight || 720;
                                            canvas.getContext('2d')?.drawImage(video, 0, 0);
                                            canvas.toBlob(async (blob) => {
                                              if (!blob) { setWisdomErrorMessage('Failed to capture photo — please try again.'); return; }
                                              const d = new Date();
                                              const mm = String(d.getMonth() + 1).padStart(2, '0');
                                              const yy = String(d.getFullYear()).slice(-2);
                                              const photoName = `wisdom_Photo_${userEmail.replace(/[@.]/g, '_')}_${mm}${yy}.jpg`;
                                              const captured = new File([blob], photoName, { type: 'image/jpeg' });
                                              stopWisdomCamera();
                                              if (!isDatabricksAuthenticated) { setWisdomErrorMessage('⚠️ Please sign in to Databricks before saving. Click the Sign In button in the header.'); setShowLoginModal(true); return; }
                                              setIsWisdomSaving(true);
                                              setIsDatabricksLoading(true);
                                              setDatabricksLoadingMessage('Saving photo…');
                                              setWisdomErrorMessage(null);
                                              try {
                                                const result = await uploadToKnowledgeBase({ file: captured, scope: photoScope, brand: photoScope === 'brand' ? (brand || undefined) : undefined, projectType: projectType || undefined, fileType: 'Wisdom', tags: [insightType, 'Photo'], insightType: insightType as 'Brand' | 'Category' | 'General', inputMethod: 'Photo', userEmail, userRole });
                                                if (result.success) { handleResponseChange(idx, 'Camera photo saved'); setWisdomSuccessMessage(`✅ "${captured.name}" saved to Knowledge Base.\n\nThis file will be made available after it has been processed, read and approved by a research manager.`); }
                                                else { setWisdomErrorMessage(`Failed to save photo: ${result.error || 'Unknown error'}`); }
                                              } catch (err) { setWisdomErrorMessage(`Failed to save photo: ${err instanceof Error ? err.message : 'Unknown error'}`); }
                                              finally { setIsWisdomSaving(false); setIsDatabricksLoading(false); }
                                            }, 'image/jpeg', 0.92);
                                          }}
                                        >
                                          {isWisdomSaving ? <><SpinHex className="w-4 h-4" />Saving...</> : <><Camera className="w-4 h-4" />Capture</>}
                                        </button>
                                        <button type="button" className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300" onClick={stopWisdomCamera}>Cancel</button>
                                      </div>
                                    </div>
                                  )}
                                  {responses[activeStepId]?.[idx] && <div className="bg-green-50 border border-green-200 rounded p-2"><p className="text-sm text-green-700">✓ {responses[activeStepId][idx]}</p></div>}
                                </div>
                              </div>
                            );
                          }

                          // FILE — upload documents
                          if (inputMethod === 'File') {
                            return (
                              <div key={idx} className="mb-2">
                                <label className="block text-gray-900 mb-1 flex items-start justify-between">
                                  <span>Share Your Wisdom</span>
                                  {hasResponse && <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                                </label>
                                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" multiple className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                                  onChange={async (e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length === 0) return;
                                    for (const file of files) {
                                      const reader = new FileReader();
                                      reader.onload = async (event) => {
                                        const b64 = event.target?.result as string;
                                        const ext = file.name.split('.').pop() || 'bin';
                                        await handleSaveWisdomToDatabricks(wisdomFileName(ext), b64, insightType, 'File', brand, projectType);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                    handleResponseChange(idx, files.map(f => f.name).join(', '));
                                    e.target.value = '';
                                  }}
                                />
                                {responses[activeStepId]?.[idx] && <div className="bg-green-50 border border-green-200 rounded p-2"><p className="text-sm text-green-700">✓ Uploaded: {responses[activeStepId][idx]}</p></div>}
                              </div>
                            );
                          }

                          // INTERVIEW
                          if (inputMethod === 'Interview') {
                            return (
                              <div key={idx} className="mb-2">
                                <label className="block text-gray-900 mb-1 flex items-start justify-between">
                                  <span>Share Your Wisdom</span>
                                  {hasResponse && <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                                </label>
                                {MicDevicePicker}
                                <button
                                  onClick={() => { setInterviewContext({ insightType, brand, projectType }); setShowInterviewDialog(true); }}
                                  className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center justify-center gap-2"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                  Start Interview
                                </button>
                                {responses[activeStepId]?.[idx] && <div className="bg-green-50 border border-green-200 rounded p-2 mt-2"><p className="text-sm text-green-700">✓ {responses[activeStepId][idx]}</p></div>}
                              </div>
                            );
                          }

                          // PERSONA INTERVIEW
                          if (inputMethod === 'Persona Interview') {
                            return (
                              <div key={idx} className="mb-2">
                                <label className="block text-gray-900 mb-1 flex items-start justify-between">
                                  <span>Interview to Become a Persona</span>
                                  {hasResponse && <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                                </label>
                                {MicDevicePicker}
                                <button
                                  onClick={() => setShowPersonaInterviewDialog(true)}
                                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center justify-center gap-2"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                  Start Persona Interview
                                </button>
                                {responses[activeStepId]?.[idx] && <div className="bg-green-50 border border-green-200 rounded p-2 mt-2"><p className="text-sm text-green-700">✓ {responses[activeStepId][idx]}</p></div>}
                              </div>
                            );
                          }
                          return null;
                        }
                      }

                      // Findings hex questions
                      if (activeStepId === 'Findings') {
                        const brand = responses['Enter']?.[0]?.trim();
                        const projectType = responses['Enter']?.[1]?.trim();
                        const currentFileName = responses['Enter']?.[2]?.trim();
                        const findingsChoice = responses['Findings']?.[0];
                        const workflowHexes = ['research', 'Luminaries', 'stories', 'Consumers', 'competitors', 'Colleagues', 'cultural', 'social', 'Grade'];
                        const hasHexExecutions = workflowHexes.some(hexId => { const executions = hexExecutions[hexId]; return executions && executions.length > 0; });
                        if (idx === 0 && question === 'Save Iteration or Summarize') {
                          return (
                            <div key={idx} className="mb-2">
                              <label className="block text-gray-900 mb-1 flex items-start justify-between">
                                <span>{idx + 1}. {question}</span>
                                {hasResponse && <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                              </label>
                              <div className="space-y-1">
                                {hasHexExecutions && (
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="findingsChoice" value="Save Iteration" checked={responses[activeStepId]?.[idx] === 'Save Iteration'}
                                      disabled={isSavingIteration}
                                      onChange={async (e) => {
                                        handleResponseChange(idx, e.target.value);
                                        if (e.target.value === 'Save Iteration' && brand && projectType) {
                                          if (!isDatabricksAuthenticated) { alert('⚠️ Please sign in to Databricks before saving.'); setShowLoginModal(true); handleResponseChange(idx, ''); return; }
                                          const userEnteredFileName = currentFileName || '';
                                          if (!userEnteredFileName) { alert('Please enter a filename in the Enter hex before saving.'); handleResponseChange(idx, ''); return; }
                                          setIsSavingIteration(true);
                                          try {
                                            const { updatedSession } = generateIterationFileName(sessionVersions, brand, projectType);
                                            setSessionVersions(prev => ({ ...prev, [updatedSession.sessionKey]: updatedSession }));
                                            const docFileName = userEnteredFileName.replace(/\.(txt|json|doc|docx)$/i, '') + '.doc';
                                            const newFile: ProjectFile = { brand, projectType, fileName: docFileName, timestamp: Date.now() };
                                            const txtLines: string[] = [];
                                            txtLines.push(`ITERATION: ${userEnteredFileName}`);
                                            txtLines.push(`Brand: ${brand}`);
                                            txtLines.push(`Project Type: ${projectType}`);
                                            txtLines.push(`Saved: ${new Date().toLocaleDateString()}`);
                                            txtLines.push('');
                                            if (completedSteps.size > 0) {
                                              txtLines.push(`Completed Hexes: ${Array.from(completedSteps).join(', ')}`);
                                              txtLines.push('');
                                            }
                                            const hexOrder = ['research','Luminaries','stories','Consumers','competitors','Colleagues','cultural','social','Grade','Wisdom'];
                                            const hexLabels: Record<string,string> = { research:'Research', Luminaries:'Luminaries', stories:'Stories', Consumers:'Consumers', competitors:'Competitors', Colleagues:'Colleagues', cultural:'Cultural', social:'Social', Grade:'Grade', Wisdom:'Wisdom' };
                                            const orderedHexes = [...hexOrder.filter(h => hexExecutions[h]?.length > 0), ...Object.keys(hexExecutions).filter(h => !hexOrder.includes(h) && hexExecutions[h]?.length > 0)];
                                            for (const hexId of orderedHexes) {
                                              const execs = hexExecutions[hexId];
                                              if (!execs?.length) continue;
                                              const label = hexLabels[hexId] || hexId;
                                              txtLines.push('='.repeat(60));
                                              txtLines.push(`${label.toUpperCase()} HEX`);
                                              txtLines.push('='.repeat(60));
                                              execs.forEach((ex: any, i: number) => {
                                                if (execs.length > 1) txtLines.push(`\n--- Run ${i + 1} ---`);
                                                if (ex.selectedFiles?.length > 0) txtLines.push(`Files: ${ex.selectedFiles.join(', ')}`);
                                                if (ex.assessment) txtLines.push('\n' + ex.assessment);
                                              });
                                              txtLines.push('');
                                            }
                                            if (iterationGems.length > 0) {
                                              txtLines.push('='.repeat(60));
                                              txtLines.push('GEMS (Highlighted Elements)');
                                              txtLines.push('='.repeat(60));
                                              iterationGems.forEach(g => txtLines.push(`[${g.hexLabel}] ${g.gemText}`));
                                              txtLines.push('');
                                            }
                                            if (iterationChecks.length > 0) {
                                              txtLines.push('='.repeat(60));
                                              txtLines.push('CHECK (Elements of Interest)');
                                              txtLines.push('='.repeat(60));
                                              iterationChecks.forEach(c => txtLines.push(`[${c.hexLabel}] ${c.text}`));
                                              txtLines.push('');
                                            }
                                            if (iterationCoal.length > 0) {
                                              txtLines.push('='.repeat(60));
                                              txtLines.push('COAL (Elements to Avoid)');
                                              txtLines.push('='.repeat(60));
                                              iterationCoal.forEach(c => txtLines.push(`[${c.hexLabel}] ${c.text}`));
                                              txtLines.push('');
                                            }
                                            if (gradeScoreResults && (gradeScoreResults.scoreGrid || gradeScoreResults.assessments)) {
                                              txtLines.push('='.repeat(60));
                                              txtLines.push('GRADE: SEGMENT SCORING');
                                              txtLines.push('='.repeat(60));
                                              txtLines.push(formatGradeForIteration(gradeScoreResults));
                                              txtLines.push('');
                                            }
                                            const noteText = noteEntries
                                              .filter(e => e.text.trim() && e.type !== 'story')
                                              .map(e => {
                                                if (e.type === 'note') return e.text.trim();
                                                const prefix = e.type === 'gem' ? 'GEM' : e.type === 'check' ? 'CHECK' : e.type === 'coal' ? 'COAL' : 'DIRECTION';
                                                return `[${prefix}${e.hexLabel ? ' · ' + e.hexLabel : ''}] ${e.text.trim()}`;
                                              })
                                              .join('\n\n');
                                            if (noteText) {
                                              txtLines.push('='.repeat(60));
                                              txtLines.push('USER NOTES');
                                              txtLines.push('='.repeat(60));
                                              txtLines.push(noteText);
                                              txtLines.push('');
                                            }
                                            const txtContent = txtLines.join('\n');
                                            const file = createWordDocFile(userEnteredFileName, txtContent);
                                            let scope: 'general' | 'category' | 'brand' = 'brand';
                                            if (!brand) scope = projectType ? 'category' : 'general';
                                            const result = await uploadToKnowledgeBase({ file, scope, category: projectType, brand: scope === 'brand' ? brand : undefined, projectType: projectType || undefined, fileType: 'Findings', tags: ['Iteration', brand, projectType].filter(Boolean) as string[], iterationType: 'iteration', includedHexes: Array.from(completedSteps), userEmail: userEmail, userRole });
                                            if (result.success) {
                                              alert(`✅ Upload successful! Iteration "${userEnteredFileName}" saved to your files.`);
                                              handleResponseChange(idx, '');
                                              const updatedFiles = [...projectFiles, newFile];
                                              setProjectFiles(updatedFiles);
                                              localStorage.setItem('cohive_projects', JSON.stringify(updatedFiles));
                                              setIterationSaved(true);
                                              localStorage.setItem('cohive_iteration_saved', 'true');
                                              const baseSaved = userEnteredFileName.replace(/\.txt$/i, '');
                                              setLastSavedFileName(baseSaved);
                                              localStorage.setItem('cohive_last_iteration_filename', baseSaved);
                                              setLastAssessmentResults(null);
                                              setIterationGems([]);
                                              setIterationChecks([]);
                                              setIterationCoal([]);
                                              setIterationDirections([]);
                                              setNoteEntries([{ id: `note-save-${Date.now()}`, type: 'note', text: '' }]);
                                              setGradeScoreResults(null);
                                              setGradeExtractedIdeas([]);
                                            } else { alert(`Failed to save to Databricks: ${result.error || 'Unknown error'}`); handleResponseChange(idx, ''); }
                                          } finally { setIsSavingIteration(false); }
                                        }
                                      }}
                                      className="w-4 h-4"
                                    />
                                    {isSavingIteration ? <><SpinHex className="w-4 h-4" /><span className="text-gray-700">Saving...</span></> : <span className="text-gray-700">Save Iteration</span>}
                                  </label>
                                )}
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" name="findingsChoice" value="Summarize" checked={responses[activeStepId]?.[idx] === 'Summarize'} onChange={(e) => handleResponseChange(idx, e.target.value)} className="w-4 h-4" />
                                  <span className="text-gray-700">Summarize</span>
                                </label>
                              </div>
                              {!hasHexExecutions && findingsChoice !== 'Summarize' && <p className="text-amber-600 text-sm mt-2">ℹ️ Save Iteration requires at least one workflow hex to be executed. Only Summarize is available.</p>}
                            </div>
                          );
                        }
                        if (findingsChoice !== 'Summarize') return null;
                        if (findingsChoice === 'Summarize' && idx === 1) {
                          const suggestedSummaryName = getSummaryFileName(currentFileName || '');
                          const matchingFiles = projectFiles.filter(f => f.brand === brand && f.projectType === projectType).sort((a, b) => b.timestamp - a.timestamp);
                          const selectedFiles = responses[activeStepId]?.[idx]?.split(',').filter(Boolean) || [];
                          return (
                            <div key={idx}>
                              <div className="mb-2">
                                <label className="block text-gray-900 mb-1">Suggested Summary Filename</label>
                                <input type="text" className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500" value={responses[activeStepId]?.['summaryFileName'] || suggestedSummaryName} onChange={(e) => { setResponses(prev => ({ ...prev, [activeStepId]: { ...prev[activeStepId], summaryFileName: e.target.value, [3]: '' } })); }} placeholder="Enter summary filename..." />
                              </div>
                              <div className="mb-2">
                                <label className="block text-gray-900 mb-1">{idx + 1}. {question}</label>
                                <div className="border-2 border-gray-300 rounded p-2 bg-white max-h-40 overflow-y-auto">
                                  {matchingFiles.length > 0 ? matchingFiles.map((file, fileIdx) => (
                                    <label key={fileIdx} className="flex items-center gap-2 cursor-pointer py-1">
                                      <input type="checkbox" checked={selectedFiles.includes(file.fileName)} onChange={(e) => { let newSelected = [...selectedFiles]; if (e.target.checked) { newSelected.push(file.fileName); } else { newSelected = newSelected.filter(f => f !== file.fileName); } handleResponseChange(idx, newSelected.join(',')); }} className="w-4 h-4" />
                                      <span className="text-gray-700">{displayFileName(file.fileName)} ({new Date(file.timestamp).toLocaleDateString()})</span>
                                    </label>
                                  )) : <p className="text-gray-500 text-sm">No files found for {brand} - {projectType}</p>}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        if (idx === 2 && question === 'Output Options') {
                          const selectedOptions = responses[activeStepId]?.[idx]?.split(',').filter(Boolean) || [];
                          const options = ['Executive Summary', 'Share all Ideas as a list', 'Provide a grid with all "final" ideas with their scores', 'Include Gems', 'Include Track', 'Include Coal', 'Include User Notes from all iterations as an Appendix'];
                          return (
                            <div key={idx} className="mb-2">
                              <label className="block text-gray-900 mb-1 flex items-start justify-between"><span>{idx + 1}. {question}</span>{hasResponse && <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}</label>
                              <div className="space-y-1">
                                {options.map((option, optIdx) => (
                                  <label key={optIdx} className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={selectedOptions.includes(option)} onChange={(e) => { let newSelected = [...selectedOptions]; if (e.target.checked) { newSelected.push(option); } else { newSelected = newSelected.filter(o => o !== option); } handleResponseChange(idx, newSelected.join(',')); }} className="w-4 h-4 flex-shrink-0" />
                                    <span className="text-gray-700">{option}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        if (idx === 3 && question === 'Save or Download') {
                          return (
                            <div key={idx} className="mb-2">
                              <label className="block text-gray-900 mb-1 flex items-start justify-between"><span>{idx + 1}. {question}</span>{hasResponse && <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}</label>
                              <div className="space-y-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" name="saveOrDownload" value="Read" checked={responses[activeStepId]?.[idx] === 'Read'}
                                    onChange={async (e) => {
                                      handleResponseChange(idx, e.target.value);
                                      if (e.target.value === 'Read' && brand && projectType) {
                                        const summaryFileName = responses[activeStepId]?.['summaryFileName'] || getSummaryFileName(currentFileName || '');
                                        if (summaryFileName) {
                                          setIsGeneratingSummary(true);
                                          try {
                                            const result = await generateSummary({ brand, projectType, fileName: summaryFileName, selectedFiles: responses[activeStepId]?.[1]?.split(',').filter(Boolean) || [], outputOptions: responses[activeStepId]?.[2]?.split(',').filter(Boolean) || [], hexExecutions, completedSteps: Array.from(completedSteps), responses, userEmail, userRole, modelEndpoint: currentTemplate?.conversationMode === 'incremental' ? currentTemplate?.modelEndpoint : 'databricks-claude-sonnet-4-6' });
                                            if (result.success && result.summary) { setMarkdownContent(result.summary); setMarkdownTitle(summaryFileName); setShowMarkdownViewer(true); }
                                            else { alert(`Failed to generate summary: ${result.error || 'Unknown error'}`); }
                                          } catch { alert('Failed to generate summary. Please try again.'); }
                                          finally { setIsGeneratingSummary(false); handleResponseChange(idx, ''); }
                                        }
                                      }
                                    }}
                                    className="w-4 h-4" disabled={isGeneratingSummary}
                                  />
                                  {isGeneratingSummary ? <><SpinHex className="w-4 h-4" /><span className="text-gray-700">Generating Summary...</span></> : <span className="text-gray-700">Read</span>}
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" name="saveOrDownload" value="SaveWorkspace" checked={responses[activeStepId]?.[idx] === 'SaveWorkspace'}
                                    onChange={(e) => {
                                      handleResponseChange(idx, e.target.value);
                                      if (e.target.value === 'SaveWorkspace' && brand && projectType) {
                                        const summaryFileName = responses[activeStepId]?.['summaryFileName'] || getSummaryFileName(currentFileName || '');
                                        if (summaryFileName) {
                                          const hexOrder2 = ['research','Luminaries','stories','Consumers','competitors','Colleagues','cultural','social','Grade','Wisdom'];
                                          const hexLabels2: Record<string,string> = { research:'Research',Luminaries:'Luminaries',stories:'Stories',Consumers:'Consumers',competitors:'Competitors',Colleagues:'Colleagues',cultural:'Cultural',social:'Social',Grade:'Grade',Wisdom:'Wisdom' };
                                          const sumLines: string[] = [`SUMMARY: ${summaryFileName}`,`Brand: ${brand}`,`Project Type: ${projectType}`,`Saved: ${new Date().toLocaleDateString()}`,``];
                                          const orderedH = [...hexOrder2.filter(h => hexExecutions[h]?.length > 0), ...Object.keys(hexExecutions).filter(h => !hexOrder2.includes(h) && hexExecutions[h]?.length > 0)];
                                          for (const hid of orderedH) {
                                            const execs = hexExecutions[hid];
                                            if (!execs?.length) continue;
                                            sumLines.push('='.repeat(60)); sumLines.push(`${(hexLabels2[hid] || hid).toUpperCase()} HEX`); sumLines.push('='.repeat(60));
                                            execs.forEach((ex: any, i: number) => { if (execs.length > 1) sumLines.push(`\n--- Run ${i + 1} ---`); if (ex.selectedFiles?.length > 0) sumLines.push(`Files: ${ex.selectedFiles.join(', ')}`); if (ex.assessment) sumLines.push('\n' + ex.assessment); });
                                            sumLines.push('');
                                          }
                                          const sumContent = sumLines.join('\n');
                                          const docName = summaryFileName.replace(/\.(txt|json|doc|docx)$/i, '') + '.doc';
                                          setFileSaverData({ fileName: docName, content: textToWordHtml(summaryFileName, sumContent) });
                                          setShowFileSaver(true); handleResponseChange(idx, '');
                                        }
                                      }
                                    }}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-gray-700">Save to Databricks Workspace</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" name="saveOrDownload" value="Download" checked={responses[activeStepId]?.[idx] === 'Download'}
                                    onChange={(e) => {
                                      handleResponseChange(idx, e.target.value);
                                      if (e.target.value === 'Download' && brand && projectType) {
                                        const summaryFileName = responses[activeStepId]?.['summaryFileName'] || getSummaryFileName(currentFileName || '');
                                        if (summaryFileName) {
                                          const hexOrder3 = ['research','Luminaries','stories','Consumers','competitors','Colleagues','cultural','social','Grade','Wisdom'];
                                          const hexLabels3: Record<string,string> = { research:'Research',Luminaries:'Luminaries',stories:'Stories',Consumers:'Consumers',competitors:'Competitors',Colleagues:'Colleagues',cultural:'Cultural',social:'Social',Grade:'Grade',Wisdom:'Wisdom' };
                                          const dlLines: string[] = [`SUMMARY: ${summaryFileName}`,`Brand: ${brand}`,`Project Type: ${projectType}`,`Saved: ${new Date().toLocaleDateString()}`,``];
                                          const orderedH2 = [...hexOrder3.filter(h => hexExecutions[h]?.length > 0), ...Object.keys(hexExecutions).filter(h => !hexOrder3.includes(h) && hexExecutions[h]?.length > 0)];
                                          for (const hid of orderedH2) {
                                            const execs = hexExecutions[hid];
                                            if (!execs?.length) continue;
                                            dlLines.push('='.repeat(60)); dlLines.push(`${(hexLabels3[hid] || hid).toUpperCase()} HEX`); dlLines.push('='.repeat(60));
                                            execs.forEach((ex: any, i: number) => { if (execs.length > 1) dlLines.push(`\n--- Run ${i + 1} ---`); if (ex.selectedFiles?.length > 0) dlLines.push(`Files: ${ex.selectedFiles.join(', ')}`); if (ex.assessment) dlLines.push('\n' + ex.assessment); });
                                            dlLines.push('');
                                          }
                                          downloadWordDoc(summaryFileName, dlLines.join('\n')); alert('✅ Summary downloaded to your computer!'); handleResponseChange(idx, '');
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

                      // Enter Brand dropdown
                      if (activeStepId === 'Enter' && idx === 0 && question === 'Brand') {
                        return (
                          <div key={idx} className="mb-2">
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 text-gray-900 whitespace-nowrap">
                                <span>{idx + 1}. {question}</span>
                                {hasResponse && <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                              </label>
                              <select className="flex-1 border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500" value={responses[activeStepId]?.[idx] || ''} onChange={(e) => handleResponseChange(idx, e.target.value)}>
                                <option value="">-- Select a Brand --</option>
                                {availableBrands.map((brand, brandIdx) => (<option key={brandIdx} value={brand}>{brand}</option>))}
                              </select>
                            </div>
                          </div>
                        );
                      }

                      // Enter Project Type dropdown
                      if (activeStepId === 'Enter' && idx === 1 && question === 'Project Type') {
                        return (
                          <div key={idx} className="mb-2">
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 text-gray-900 whitespace-nowrap">
                                <span>{idx + 1}. {question}</span>
                                {hasResponse && <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                              </label>
                              <select className="flex-1 border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500" value={responses[activeStepId]?.[idx] || ''} onChange={(e) => handleResponseChange(idx, e.target.value)}>
                                <option value="">-- Select a Project Type --</option>
                                {availableProjectTypes.map((type, typeIdx) => (<option key={typeIdx} value={type}>{type}</option>))}
                              </select>
                            </div>
                          </div>
                        );
                      }

                      // Default textarea
                      return (
                        <div key={idx} className="mb-2">
                          <label className="block text-gray-900 mb-1 flex items-start justify-between">
                            <span>{idx + 1}. {question}</span>
                            {hasResponse && <CircleCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                          </label>
                          <textarea className="w-full h-20 border-2 border-gray-300 bg-white rounded p-2 text-gray-700 resize-none focus:outline-none focus:border-blue-500" placeholder="Enter your response..." value={responses[activeStepId]?.[idx] || ''} onChange={(e) => handleResponseChange(idx, e.target.value)} />
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ width: 'var(--panel-w)', flexShrink: 0 }}>
            <AIHelpWidget activeHexId={activeStepId} activeHexLabel={currentContent.title} userEmail={userEmail} userRole={userRole} brand={responses['Enter']?.[0]?.trim() || ''} projectType={responses['Enter']?.[1]?.trim() || ''} selectedResearchFiles={selectedResearchFiles} selectedFiles={isCentralHex ? hexWidgetContext.files : []} currentStep={isCentralHex ? hexWidgetContext.step : undefined} researchMode={activeStepId === 'research' ? researchMode : undefined} selectedKBFile={activeStepId === 'research' ? selectedKBFile : undefined} pendingApprovalCount={activeStepId === 'research' ? pendingApprovalCount : undefined} wisdomInputMethod={activeStepId === 'Wisdom' ? (responses['Wisdom']?.[0] || null) : undefined} projectFileCount={activeStepId === 'review' ? projectFiles.length : undefined} canManageExamples={canManageExamples} />

            <div className="bg-white border-2 border-gray-300 rounded-lg p-4" style={{ height: '550px' }}>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-gray-600" />
                <h3 className="text-gray-900">User Notes</h3>
              </div>
              <div className="border-2 border-gray-300 bg-gray-50 rounded p-2" style={{ height: 'calc(550px - 80px)' }}>
                <UserNotesBox entries={noteEntries} onEntriesChange={setNoteEntries} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <DatabricksOAuthLogin open={showLoginModal} currentStep={activeStepId} onClose={() => { setShowLoginModal(false); setTimeout(() => { const authenticated = isAuthenticated(); setIsDatabricksAuthenticated(authenticated); }, 500); }} />

      {fileSaverData && (
        <DatabricksFileSaver open={showFileSaver} onClose={() => { setShowFileSaver(false); setFileSaverData(null); }} fileName={fileSaverData.fileName} fileContent={fileSaverData.content} onSaveSuccess={(path) => { console.log('File saved successfully to:', path); }} />
      )}

      <PersonaInterviewDialog
        open={showPersonaInterviewDialog}
        onClose={() => setShowPersonaInterviewDialog(false)}
        onComplete={(name) => {
          handleResponseChange(1, `Persona created: ${name}`);
          // Refresh custom personas so it immediately appears in Colleagues hex
          fetchCustomPersonas().then(p => setCustomPersonas(p)).catch(() => {});
        }}
        userEmail={userEmail}
        userRole={userRole}
        selectedMicDeviceId={selectedMicDeviceId}
      />

      <InterviewDialog open={showInterviewDialog} onClose={() => { setShowInterviewDialog(false); }} onComplete={() => { if (activeStepId === 'Wisdom') { handleResponseChange(1, 'Interview completed and saved to Knowledge Base'); } }} userEmail={userEmail} userRole={userRole} selectedMicDeviceId={selectedMicDeviceId}
        onSaveTranscript={async (transcript: string, fileName: string) => {
          try {
            const blob = new Blob([transcript], { type: 'text/plain' });
            const file = createFileFromBlob(blob, fileName);
            const result = await uploadToKnowledgeBase({ file, scope: 'general', fileType: 'Wisdom', tags: ['Wisdom', 'Interview'], insightType: 'General', inputMethod: 'Interview', userEmail: userEmail, userRole });
            if (result.success) alert(`✅ Upload successful! Interview transcript saved to the Knowledge Base.`);
            return result.success;
          } catch (err) { console.error('Failed to save interview transcript:', err); return false; }
        }}
      />

      {/* ── Grade Score Results Modal ── */}
      {gradeModalOpen && gradeScoreResults && (
        <div className="fixed inset-y-0 left-0 z-50 flex items-center justify-center bg-black/60" style={{ right: 'var(--modal-r)', padding: 'var(--modal-p-lg)' }} onClick={() => setGradeModalOpen(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Grade: Score Results</h2>
                <p className="text-xs text-gray-500 mt-0.5">Results are saved with the iteration</p>
              </div>
              <button
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                onClick={() => setGradeModalOpen(false)}
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              {gradeScoreResults.scoreGrid && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Score Grid</div>
                  <div className="overflow-x-auto">
                    <pre className="text-sm text-gray-800 font-mono whitespace-pre leading-relaxed bg-gray-50 border border-gray-200 rounded-lg p-4">{gradeScoreResults.scoreGrid}</pre>
                  </div>
                </div>
              )}
              {gradeScoreResults.assessments && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Results</div>
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-gray-50 border border-gray-200 rounded-lg p-4">{gradeScoreResults.assessments}</pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                onClick={() => setGradeModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assessment Modal — v3 with requestMode derived from Enter hex ── */}
      {assessmentModalOpen && assessmentModalProps && (
        <AssessmentModal
          isOpen={assessmentModalOpen}
          onClose={() => setAssessmentModalOpen(false)}
          onAcceptResults={(results) => {
            setLastAssessmentResults(results);
            // Write the actual AI-generated content back into hexExecutions
            // so the iteration .txt file contains the real assessment output
            const { rounds, summary, hexId: resultHexId } = results;
            const aiContent = [
              ...rounds.map(r => r.content),
              ...(summary ? [`\n--- Summary ---\n${summary}`] : []),
            ].join('\n').trim();
            if (aiContent) {
              setHexExecutions(prev => {
                const existing = prev[resultHexId] || [];
                if (existing.length === 0) return prev;
                // Update the last execution's assessment with the real AI output
                const updated = [...existing];
                updated[updated.length - 1] = { ...updated[updated.length - 1], assessment: aiContent };
                const next = { ...prev, [resultHexId]: updated };
                localStorage.setItem('cohive_hex_executions', JSON.stringify(next));
                return next;
              });
            }
          }}
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
          modelEndpoint={assessmentModalProps.modelEndpoint}
          factCheckerModelEndpoint={assessmentModalProps.factCheckerModelEndpoint}
          projectTypeConfigs={projectTypeConfigs}
          // v3: requestMode derived from Enter hex — never selected in modal
          requestMode={assessmentModalProps.requestMode}
          ideaElements={assessmentModalProps.ideaElements}
          // kbMode and scope not pre-set — user selects in modal settings panel
          // Iteration context — prior hex results for cross-hex awareness
          hexExecutions={assessmentModalProps.hexExecutions}
          // Iteration gems — persists across modal opens, cleared at iteration boundary
          iterationGems={iterationGems}
          iterationChecks={iterationChecks}
          iterationCoal={iterationCoal}
          iterationDirections={iterationDirections}
          onGemSaved={handleGemSaved}
          onReviewConfirmed={handleReviewConfirmed}
          canManageExamples={assessmentModalProps.canManageExamples}
          customPersonaData={assessmentModalProps.customPersonaData}
        />
      )}

      {/* ── Story Modal ── */}
      {storyModalOpen && storyModalParams && (
        <StoryModal
          isOpen={storyModalOpen}
          onClose={() => setStoryModalOpen(false)}
          brand={responses['Enter']?.[0]?.trim() || ''}
          projectType={responses['Enter']?.[1]?.trim() || ''}
          projectTypePrompt={projectTypeConfigs.find(pt => pt.projectType === (responses['Enter']?.[1]?.trim() || ''))?.prompt || ''}
          category={storyModalParams.category}
          subtype={storyModalParams.subtype}
          selectedValues={storyModalParams.selectedValues}
          selectedEmotions={storyModalParams.selectedEmotions}
          researchFiles={researchFiles}
          kbFileNames={selectedResearchFiles}
          userEmail={userEmail}
          userRole={userRole}
          iterationDirections={iterationDirections}
          iterationGems={iterationGems}
          iterationChecks={iterationChecks}
          iterationCoal={iterationCoal}
          onGemSaved={handleGemSaved}
          onReviewConfirmed={handleReviewConfirmed}
          onAcceptResults={handleStoryAcceptResults}
        />
      )}

      {showDiagnosticPanel && (
        <DiagnosticPanel onClose={() => setShowDiagnosticPanel(false)} />
      )}

      {showLogViewer && (
        <LogViewer onClose={() => setShowLogViewer(false)} userEmail={userEmail} />
      )}

      
      {showMarkdownViewer && (
        <MarkdownViewer title={markdownTitle} markdown={markdownContent} brand={responses['Enter']?.[0]} projectType={responses['Enter']?.[1]} onClose={() => { setShowMarkdownViewer(false); setMarkdownContent(''); setMarkdownTitle(''); }} />
      )}

      {isDatabricksLoading && <LoadingGem message={databricksLoadingMessage} />}
    </div>
  );
}
