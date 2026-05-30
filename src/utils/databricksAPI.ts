/**
 * Databricks Knowledge Base API Integration
 * 
 * PRODUCTION MODE - Connects to real Databricks Unity Catalog
 * 
 * Location: utils/databricksAPI.ts
 */

import { getValidSession } from './databricksAuth';
import { isFigmaMake } from './mockMode';

export interface ProjectTypeConfig {
  projectType: string;
  prompt: string;
  createdBy: string;
  createdDate: number;
  updatedBy?: string;
  updatedDate?: number;
}

export interface KnowledgeBaseFile {
  fileId: string;
  fileName: string;
  filePath: string;
  scope: 'general' | 'category' | 'brand';
  category?: string;
  brand?: string;
  projectType?: string;
  fileType: 'Synthesis' | 'Wisdom' | 'Findings' | 'Research' | 'Persona' | 'Example';
  isApproved: boolean;
  uploadDate: string;
  uploadedBy: string;
  approverEmail?: string;
  approvalDate?: string;
  approvalNotes?: string;
  tags: string[];
  citationCount: number;
  gemInclusionCount: number;
  fileSizeBytes: number;
  contentSummary?: string;
  insightType?: 'Brand' | 'Category' | 'General';
  inputMethod?: 'Text' | 'Voice' | 'Photo' | 'Video' | 'File' | 'Interview';
  iterationType?: 'iteration' | 'summary';
  includedHexes?: string[];
  createdAt: string;
  updatedAt: string;
  cleaningStatus?: 'uncleaned' | 'cleaned' | 'in_progress' | 'processed';
  cleanedAt?: string;
  cleanedBy?: string;
}

export interface UploadFileParams {
  file: File;
  scope?: 'general' | 'category' | 'brand';  // optional — assigned during processing if omitted
  category?: string;
  brand?: string;                              // optional — assigned during processing if omitted
  projectType?: string;                        // optional — assigned during processing if omitted
  fileType: 'Synthesis' | 'Wisdom' | 'Findings' | 'Research' | 'Persona' | 'Example';
  tags?: string[];
  contentSummary?: string;
  insightType?: 'Brand' | 'Category' | 'General';
  inputMethod?: 'Text' | 'Voice' | 'Photo' | 'Video' | 'File' | 'Interview';
  iterationType?: 'iteration' | 'summary';
  includedHexes?: string[];
  userEmail: string;
  userRole: string;
  cleaningStatus?: 'uncleaned' | 'cleaned' | 'in_progress' | 'processed';
  allowUncleaned?: boolean;
}

export interface ListFilesParams {
  scope?: 'general' | 'category' | 'brand';
  category?: string;
  brand?: string;
  fileType?: 'Synthesis' | 'Wisdom' | 'Findings' | 'Research' | 'Persona' | 'Example';
  isApproved?: boolean;
  projectType?: string;
  uploadedBy?: string;
  searchTerm?: string;
  includeGeneral?: boolean;
  includeCategory?: boolean;
  iterationType?: 'iteration' | 'summary';
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'upload_date' | 'citation_count' | 'file_name';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Get auth session — used for userEmail attribution only.
 * Databricks credentials now live server-side in environment variables.
 */
async function getAuthData() {
  const session = await getValidSession();
  if (!session) {
    throw new Error('Not authenticated. Please sign in.');
  }
  return {};
}

/**
 * Upload a file to the Knowledge Base.
 * Brand, projectType, and scope are optional — assigned during processing.
 */
export async function uploadToKnowledgeBase(params: UploadFileParams): Promise<{ 
  success: boolean; 
  fileId?: string;
  filePath?: string;
  error?: string;
}> {
  try {
    console.log('📤 Uploading to Knowledge Base:', params.file.name);
    const auth = await getAuthData();
    const fileContent = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => { const base64 = reader.result as string; resolve(base64.split(',')[1]); };
      reader.onerror = reject;
      reader.readAsDataURL(params.file);
    });
    const response = await fetch('/api/databricks/knowledge-base/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: params.file.name, fileContent, fileSize: params.file.size,
        scope: params.scope, category: params.category, brand: params.brand,
        projectType: params.projectType, fileType: params.fileType, tags: params.tags || [],
        contentSummary: params.contentSummary, insightType: params.insightType,
        inputMethod: params.inputMethod, iterationType: params.iterationType,
        includedHexes: params.includedHexes, userEmail: params.userEmail, userRole: params.userRole,
        cleaningStatus: params.cleaningStatus, allowUncleaned: params.allowUncleaned,
      }),
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || `Upload failed: ${response.statusText}`); }
    const result = await response.json();
    console.log('✅ Upload successful:', result.fileId);
    return { success: true, fileId: result.fileId, filePath: result.filePath };
  } catch (error) {
    console.error('❌ Upload error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
  }
}

/**
 * List files from the Knowledge Base with filters
 */
export async function listKnowledgeBaseFiles(params: ListFilesParams = {}): Promise<KnowledgeBaseFile[]> {
  try {
    console.log('📥 Fetching Knowledge Base files with filters:', params);
    const auth = await getAuthData();
    const queryParams = new URLSearchParams();
    if (params.scope) queryParams.append('scope', params.scope);
    if (params.category) queryParams.append('category', params.category);
    if (params.brand) queryParams.append('brand', params.brand);
    if (params.fileType) queryParams.append('fileType', params.fileType);
    if (params.isApproved !== undefined) queryParams.append('isApproved', String(params.isApproved));
    if (params.projectType) queryParams.append('projectType', params.projectType);
    if (params.uploadedBy) queryParams.append('uploadedBy', params.uploadedBy);
    if (params.searchTerm) queryParams.append('searchTerm', params.searchTerm);
    if (params.includeGeneral) queryParams.append('includeGeneral', 'true');
    if (params.includeCategory) queryParams.append('includeCategory', 'true');
    if (params.limit) queryParams.append('limit', String(params.limit));
    if (params.offset) queryParams.append('offset', String(params.offset));
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.iterationType) queryParams.append('iterationType', params.iterationType);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    const response = await fetch(`/api/databricks/knowledge-base/list?${queryParams}`, {
      method: 'GET', headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || `Query failed: ${response.statusText}`); }
    const result = await response.json();
    console.log(`✅ Found ${result.files.length} files`);
    return result.files;
  } catch (error) {
    console.error('❌ List error:', error);
    return [];
  }
}

/**
 * Approve a file in the Knowledge Base
 */
export async function approveKnowledgeBaseFile(
  fileId: string, userEmail: string, userRole: string, approvalNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('✅ Approving file:', fileId);
    const session = await getValidSession();
    const response = await fetch('/api/databricks/knowledge-base/approve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, approvalNotes, userEmail, userRole, oauthToken: session?.accessToken, oauthWorkspaceHost: session?.workspaceHost }),
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || `Approval failed: ${response.statusText}`); }
    const result = await response.json();
    console.log('✅ File approved:', result.fileName);
    return { success: true };
  } catch (error) {
    console.error('❌ Approval error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Approval failed' };
  }
}

/**
 * Unapprove a file in the Knowledge Base (set is_approved = FALSE)
 */
export async function unapproveKnowledgeBaseFile(
  fileId: string,
  userEmail: string,
  userRole: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('↩️ Unapproving file:', fileId);
    const session = await getValidSession();
    const response = await fetch('/api/databricks/knowledge-base/unapprove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, userEmail, userRole, oauthToken: session?.accessToken, oauthWorkspaceHost: session?.workspaceHost }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Unapproval failed: ${response.statusText}`);
    }
    console.log('✅ File unapproved:', fileId);
    return { success: true };
  } catch (error) {
    console.error('❌ Unapproval error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unapproval failed' };
  }
}

/**
 * Update metadata for a file.
 * Supports: fileName, tags, contentSummary, brand, projectType, fileType,
 *           approvalNotes, citationCount, gemInclusionCount.
 */
export async function updateKnowledgeBaseMetadata(
  fileId: string,
  updates: {
    fileName?: string;
    tags?: string[];
    contentSummary?: string;
    brand?: string;           // ← added — was missing, caused silent drop
    projectType?: string;
    fileType?: string;
    approvalNotes?: string;
    citationCount?: number;
    gemInclusionCount?: number;
  },
  userEmail?: string,
  userRole?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await getAuthData();
    const response = await fetch('/api/databricks/knowledge-base/update', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, ...updates, userEmail, userRole }),
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || `Update failed: ${response.statusText}`); }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Update failed' };
  }
}

/**
 * Delete a file from the Knowledge Base
 */
export async function deleteKnowledgeBaseFile(
  fileId: string, userEmail: string, userRole: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getValidSession();
    const response = await fetch('/api/databricks/knowledge-base/delete', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, userEmail, userRole, oauthToken: session?.accessToken, oauthWorkspaceHost: session?.workspaceHost }),
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || `Deletion failed: ${response.statusText}`); }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Deletion failed' };
  }
}

/**
 * Download a file to the user's computer
 */
export function downloadFile(fileName: string, content: string, mimeType: string = 'application/octet-stream') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = fileName;
  document.body.appendChild(link); link.click();
  document.body.removeChild(link); URL.revokeObjectURL(url);
}

/**
 * Download a file from the Knowledge Base — fetches content AND triggers browser download.
 * Use this only for explicit Download buttons. For viewing only, use readKnowledgeBaseFile.
 */
export async function downloadKnowledgeBaseFile(
  fileId: string, fileName: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    // Uses /read — /download endpoint does not exist
    const auth = await getAuthData();
    const response = await fetch('/api/databricks/knowledge-base/read', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId }),
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || `Download failed: ${response.statusText}`); }
    const result = await response.json();
    const content = result.content || '';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'txt': 'text/plain', 'md': 'text/markdown', 'csv': 'text/csv',
      'pdf': 'application/pdf', 'json': 'application/json',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    const mimeType = mimeTypes[ext] || 'text/plain';
    if (content) downloadFile(fileName, content, mimeType);
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Download failed' };
  }
}

export const KNOWLEDGE_BASE_CATEGORIES = ['Beer', 'Cider', 'RTD', 'Footwear'] as const;
export type KnowledgeBaseCategory = typeof KNOWLEDGE_BASE_CATEGORIES[number];

/**
 * Upload uncleaned data to the Knowledge Base
 */
export async function uploadUncleanedToKnowledgeBase(params: {
  file: File; fileType: 'Synthesis' | 'Wisdom' | 'Findings' | 'Research' | 'Persona' | 'Example';
  tags?: string[]; contentSummary?: string; insightType?: 'Brand' | 'Category' | 'General';
  inputMethod?: 'Text' | 'Voice' | 'Photo' | 'Video' | 'File' | 'Interview';
  userEmail: string; userRole: string; scope?: 'general' | 'category' | 'brand';
}): Promise<{ success: boolean; fileId?: string; filePath?: string; error?: string; }> {
  try {
    const auth = await getAuthData();
    const fileContent = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => { const base64 = reader.result as string; resolve(base64.split(',')[1]); };
      reader.onerror = reject;
      reader.readAsDataURL(params.file);
    });
    const response = await fetch('/api/databricks/knowledge-base/upload', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: params.file.name, fileContent, fileSize: params.file.size,
        scope: params.scope || 'general', fileType: params.fileType,
        tags: [...(params.tags || []), 'Uncleaned', 'Needs-AI-Processing'],
        contentSummary: params.contentSummary, insightType: params.insightType,
        inputMethod: params.inputMethod, userEmail: params.userEmail, userRole: params.userRole,
        cleaningStatus: 'uncleaned', allowUncleaned: true,
      }),
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || `Upload failed: ${response.statusText}`); }
    const result = await response.json();
    return { success: true, fileId: result.fileId, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
  }
}

/**
 * Read file content from Knowledge Base
 */
export async function readKnowledgeBaseFile(fileId: string): Promise<{ 
  success: boolean; fileId?: string; fileName?: string; fileType?: string; filePath?: string;
  content?: string; extractionMethod?: string; fileSizeBytes?: number; error?: string;
}> {
  try {
    const auth = await getAuthData();
    const response = await fetch('/api/databricks/knowledge-base/read', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId }),
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || `Read failed: ${response.statusText}`); }
    const result = await response.json();
    return { 
      success: true, fileId: result.fileId, fileName: result.fileName, fileType: result.fileType,
      filePath: result.filePath, content: result.content, extractionMethod: result.extractionMethod,
      fileSizeBytes: result.fileSizeBytes,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Read failed' };
  }
}

/**
 * Process a file in the Knowledge Base.
 * Converts non-text files to plain text. Returns AI-suggested brand and project types.
 *
 * @param fileId - The file to process
 * @param processingModelEndpoint - Vision-capable model (from ModelTemplate). Required.
 * @param availableBrands - Known brands to help AI suggest the correct match
 * @param availableProjectTypes - Known project types to help AI suggest matches
 */
export async function processKnowledgeBaseFile(
  fileId: string,
  processingModelEndpoint?: string,
  availableBrands: string[] = [],
  availableProjectTypes: string[] = []
): Promise<{ 
  success: boolean; 
  fileId?: string;
  txtFileId?: string;
  fileName?: string;
  txtFileName?: string;
  summary?: string;
  tags?: string;
  cleaningStatus?: string;
  suggestedBrand?: string;
  suggestedProjectTypes?: string[];
  error?: string;
}> {
  try {
    console.log('⚙️ Processing file in Knowledge Base:', fileId);
    if (processingModelEndpoint) {
      console.log('🔬 Using processing model:', processingModelEndpoint);
    }
    
    const auth = await getAuthData();
    
    const response = await fetch('/api/databricks/knowledge-base/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId,
        processingModelEndpoint,
        availableBrands,
        availableProjectTypes,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Processing failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ File processed successfully:', result.fileName);
    console.log('💡 Suggested brand:', result.suggestedBrand);
    console.log('💡 Suggested project types:', result.suggestedProjectTypes);
    
    return { 
      success: true,
      fileId: result.fileId,
      txtFileId: result.txtFileId,
      fileName: result.fileName,
      txtFileName: result.txtFileName,
      summary: result.summary,
      tags: result.tags,
      cleaningStatus: result.cleaningStatus,
      suggestedBrand: result.suggestedBrand,
      suggestedProjectTypes: result.suggestedProjectTypes,
    };
    
  } catch (error) {
    console.error('❌ Process error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Processing failed',
    };
  }
}

/**
 * Types for Assessment Results
 */
export interface AssessmentRound {
  roundNumber: number;
  content: string;
  timestamp: string;
}

export interface CitedFile {
  fileName: string;
  fileId: string | null;
}

/**
 * Save a gem (highlighted text) to the gems table
 */
export async function saveGem(params: {
  gemText: string;
  fileId?: string;
  fileName?: string;
  assessmentType?: string;
  hexId?: string;
  hexLabel?: string;
  brand?: string;
  projectType?: string;
  createdBy: string;
  accessToken?: string;
  workspaceHost?: string;
}): Promise<{ success: boolean; gemId?: string; error?: string; }> {
  try {
    console.log('💎 Saving gem:', params.gemText.substring(0, 50) + '...');
    const auth = await getAuthData();
    const response = await fetch('/api/databricks/gems/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gemText: params.gemText, fileId: params.fileId, fileName: params.fileName,
        assessmentType: params.assessmentType, hexId: params.hexId, hexLabel: params.hexLabel,
        brand: params.brand, projectType: params.projectType, createdBy: params.createdBy,
      }),
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || `Save gem failed: ${response.statusText}`); }
    const result = await response.json();
    console.log('✅ Gem saved:', result.gemId);
    return { success: true, gemId: result.gemId };
  } catch (error) {
    console.error('❌ Save gem error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Save gem failed' };
  }
}

/**
 * Generate a markdown summary from hex execution data
 */
export async function generateSummary(params: {
  brand: string; projectType: string; fileName: string; selectedFiles?: string[];
  outputOptions?: string[]; hexExecutions?: any; completedSteps?: string[];
  responses?: any; userEmail: string; userRole: string; modelEndpoint?: string;
  iterationGems?: any[]; iterationChecks?: any[]; iterationCoal?: any[];
  iterationDirections?: string[];
}): Promise<{ 
  success: boolean; summary?: string; docxBase64?: string | null; model?: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number; };
  metadata?: any; error?: string;
}> {
  try {
    console.log('📊 Generating summary for:', params.brand, '-', params.projectType);
    const auth = await getAuthData();
    const response = await fetch('/api/databricks/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: params.brand, projectType: params.projectType, fileName: params.fileName,
        selectedFiles: params.selectedFiles, outputOptions: params.outputOptions,
        hexExecutions: params.hexExecutions, completedSteps: params.completedSteps,
        responses: params.responses, userEmail: params.userEmail, userRole: params.userRole,
        modelEndpoint: params.modelEndpoint,
        iterationGems: params.iterationGems, iterationChecks: params.iterationChecks,
        iterationCoal: params.iterationCoal, iterationDirections: params.iterationDirections,
      }),
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || `Summary generation failed: ${response.statusText}`); }
    const result = await response.json();
    console.log('✅ Summary generated:', result.summary?.length, 'chars', result.docxBase64 ? '+ docx' : '');
    return { success: true, summary: result.summary, docxBase64: result.docxBase64, model: result.model, usage: result.usage, metadata: result.metadata };
  } catch (error) {
    console.error('❌ Generate summary error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Summary generation failed' };
  }
}

/**
 * Fetch shared brands and project types from Databricks
 */
export async function fetchSharedConfig(): Promise<{
  success: boolean; brands?: string[]; projectTypes?: string[]; error?: string;
}> {
  try {
    console.log('📋 Fetching shared brands and project types...');
    if (isFigmaMake()) return { success: true, brands: [], projectTypes: [] };
    // No client-side auth guard — server uses env credentials; all workspace users can read
    const response = await fetch('/api/databricks/config/brands-projects', {
      method: 'GET', headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || `Fetch failed: ${response.statusText}`); }
    const result = await response.json();
    console.log(`✅ Fetched ${result.brands?.length || 0} brands, ${result.projectTypes?.length || 0} project types`);
    return { success: true, brands: result.brands || [], projectTypes: result.projectTypes || [] };
  } catch (error) {
    console.error('❌ Fetch shared config error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch configuration' };
  }
}

/**
 * Add a new brand or project type to the shared configuration
 */
export async function addSharedConfigItem(
  type: 'brand' | 'project_type', value: string, userEmail: string
): Promise<{ success: boolean; error?: string; }> {
  try {
    console.log(`➕ Adding shared ${type}: "${value}"`);
    const response = await fetch('/api/databricks/config/brands-projects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, value, userEmail }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 409) return { success: true };
      throw new Error(errorData.error || `Add failed: ${response.statusText}`);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add configuration' };
  }
}

/**
 * Add a new project type with associated prompt (Data Scientists only)
 */
export async function addProjectTypeWithPrompt(
  projectType: string, prompt: string, userEmail: string, userRole: string
): Promise<{ success: boolean; error?: string; }> {
  try {
    console.log(`➕ Adding project type with prompt: "${projectType}"`);
    const response = await fetch('/api/databricks/config/project-type-prompts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectType, prompt, userEmail, userRole }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 409) return { success: false, error: 'Project type already exists' };
      throw new Error(errorData.error || `Add failed: ${response.statusText}`);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add project type configuration' };
  }
}

/**
 * Fetch all project type configurations with prompts
 */
export async function fetchProjectTypeConfigs(): Promise<{
  success: boolean; configs?: ProjectTypeConfig[]; error?: string;
}> {
  try {
    console.log('📋 Fetching project type configurations...');
    if (isFigmaMake()) return { success: true, configs: [] };
    // No client-side auth guard — server uses env credentials
    const response = await fetch('/api/databricks/config/project-type-prompts', {
      method: 'GET', headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || `Fetch failed: ${response.statusText}`); }
    const result = await response.json();
    return { success: true, configs: result.configs || [] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch project type configurations' };
  }
}

/**
 * Update the prompt for an existing project type
 */
export async function updateProjectTypePrompt(
  projectType: string, prompt: string, userEmail: string, userRole: string
): Promise<{ success: boolean; error?: string; }> {
  try {
    const response = await fetch('/api/databricks/config/project-type-prompts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectType, prompt, userEmail, userRole }),
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || `Update failed: ${response.statusText}`); }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update project type prompt' };
  }
}

/**
 * Delete a project type configuration
 */
export async function deleteProjectTypeConfig(
  projectType: string, userEmail: string, userRole: string
): Promise<{ success: boolean; error?: string; }> {
  try {
    const response = await fetch('/api/databricks/config/project-type-prompts', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectType, userEmail, userRole }),
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || `Delete failed: ${response.statusText}`); }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete project type configuration' };
  }
}

// ── Custom Personas ────────────────────────────────────────────────────────────

export interface CustomPersona {
  personaId: string;
  name: string;
  hexIds: string; // 'any' or comma-separated hex IDs e.g. 'Luminaries,Consumers'
  contentJson: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

export async function fetchCustomPersonas(): Promise<CustomPersona[]> {
  try {
    const response = await fetch('/api/databricks/personas/list');
    if (!response.ok) return [];
    const data = await response.json();
    return data.personas || [];
  } catch {
    return [];
  }
}

export async function saveCustomPersona(params: {
  personaId?: string;
  name: string;
  hexIds: string;
  contentJson: Record<string, unknown>;
  createdBy: string;
}): Promise<{ success: boolean; personaId?: string; error?: string }> {
  try {
    const response = await fetch('/api/databricks/personas/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Save failed');
    }
    return await response.json();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save persona' };
  }
}

export async function deleteCustomPersona(personaId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/databricks/personas/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId }),
    });
    if (!response.ok) throw new Error('Delete failed');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete persona' };
  }
}
