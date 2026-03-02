/**
 * Databricks Knowledge Base API Integration
 * 
 * PRODUCTION MODE - Connects to real Databricks Unity Catalog
 * 
 * Location: utils/databricksAPI.ts
 */

import { getValidSession } from './databricksAuth';

export interface KnowledgeBaseFile {
  fileId: string;
  fileName: string;
  filePath: string;
  scope: 'general' | 'category' | 'brand';
  category?: string;
  brand?: string;
  projectType?: string;
  fileType: 'Synthesis' | 'Wisdom' | 'Findings' | 'Research' | 'Persona';
  isApproved: boolean | null; // Can be TRUE, FALSE, or NULL in database
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
  cleaningStatus?: 'uncleaned' | 'cleaned' | 'processed' | 'in_progress'; // Track cleaning status
  cleanedAt?: string; // When AI cleaned the data
  cleanedBy?: string; // Who/what cleaned it
}

export interface UploadFileParams {
  file: File;
  scope: 'general' | 'category' | 'brand';
  category?: string;
  brand?: string;
  projectType?: string;
  fileType: 'Synthesis' | 'Wisdom' | 'Findings' | 'Research' | 'Persona';
  tags?: string[];
  contentSummary?: string;
  insightType?: 'Brand' | 'Category' | 'General';
  inputMethod?: 'Text' | 'Voice' | 'Photo' | 'Video' | 'File' | 'Interview';
  iterationType?: 'iteration' | 'summary';
  includedHexes?: string[];
  userEmail: string;
  userRole: string;
  cleaningStatus?: 'uncleaned' | 'cleaned'; // NEW: Allow marking as uncleaned
  allowUncleaned?: boolean; // NEW: Flag to allow saving without brand/project
}

export interface ListFilesParams {
  scope?: 'general' | 'category' | 'brand';
  category?: string;
  brand?: string;
  fileType?: 'Synthesis' | 'Wisdom' | 'Findings' | 'Research' | 'Persona';
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
 * Get auth session for API calls
 */
async function getAuthData() {
  const session = await getValidSession();
  if (!session) {
    throw new Error('Not authenticated. Please sign in to Databricks.');
  }
  return {
    accessToken: session.accessToken,
    workspaceHost: session.workspaceHost,
  };
}

/**
 * Upload a file to the Knowledge Base
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
    
    // Convert file to base64
    const fileContent = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:... prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(params.file);
    });

    const response = await fetch('/api/databricks/knowledge-base/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: params.file.name,
        fileContent,
        fileSize: params.file.size,
        scope: params.scope,
        category: params.category,
        brand: params.brand,
        projectType: params.projectType,
        fileType: params.fileType,
        tags: params.tags || [],
        contentSummary: params.contentSummary,
        insightType: params.insightType,
        inputMethod: params.inputMethod,
        iterationType: params.iterationType,
        includedHexes: params.includedHexes,
        userEmail: params.userEmail,
        userRole: params.userRole,
        cleaningStatus: params.cleaningStatus,
        allowUncleaned: params.allowUncleaned,
        ...auth,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Upload successful:', result.fileId);
    
    return { 
      success: true, 
      fileId: result.fileId,
      filePath: result.filePath,
    };
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
}

/**
 * List files from the Knowledge Base with filters
 */
export async function listKnowledgeBaseFiles(
  params: ListFilesParams = {}
): Promise<KnowledgeBaseFile[]> {
  try {
    console.log('📥 Fetching Knowledge Base files with filters:', params);
    
    const auth = await getAuthData();
    
    // Build query string
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
    
    queryParams.append('accessToken', auth.accessToken);
    queryParams.append('workspaceHost', auth.workspaceHost);

    const response = await fetch(
      `/api/databricks/knowledge-base/list?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Query failed: ${response.statusText}`);
    }

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
  fileId: string,
  userEmail: string,
  userRole: string,
  approvalNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('✅ Approving file:', fileId);
    
    const auth = await getAuthData();
    
    const response = await fetch('/api/databricks/knowledge-base/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        approvalNotes,
        userEmail,
        userRole,
        ...auth,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Approval failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ File approved:', result.fileName);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Approval error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Approval failed' 
    };
  }
}

/**
 * Update metadata for a file
 */
export async function updateKnowledgeBaseMetadata(
  fileId: string,
  updates: {
    tags?: string[];
    contentSummary?: string;
    projectType?: string;
    approvalNotes?: string;
    citationCount?: number;
    gemInclusionCount?: number;
  },
  userEmail: string,
  userRole: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📝 Updating metadata for:', fileId);
    
    const auth = await getAuthData();
    
    const response = await fetch('/api/databricks/knowledge-base/update', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        ...updates,
        userEmail,
        userRole,
        ...auth,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Update failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Metadata updated:', result.fileName);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Update error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Update failed' 
    };
  }
}

/**
 * Delete a file from the Knowledge Base
 */
export async function deleteKnowledgeBaseFile(
  fileId: string,
  userEmail: string,
  userRole: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ Deleting file:', fileId);
    
    const auth = await getAuthData();
    
    const response = await fetch('/api/databricks/knowledge-base/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        userEmail,
        userRole,
        ...auth,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Deletion failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ File deleted:', result.fileName);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Deletion failed' 
    };
  }
}

/**
 * Download a file to the user's computer
 */
export function downloadFile(fileName: string, content: string, mimeType: string = 'application/octet-stream') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  console.log('✅ File downloaded:', fileName);
}

/**
 * Download a file from the Knowledge Base
 */
export async function downloadKnowledgeBaseFile(
  fileId: string,
  fileName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📥 Downloading file from Knowledge Base:', fileId);
    
    const auth = await getAuthData();
    
    const queryParams = new URLSearchParams();
    queryParams.append('fileId', fileId);
    queryParams.append('accessToken', auth.accessToken);
    queryParams.append('workspaceHost', auth.workspaceHost);

    const response = await fetch(
      `/api/databricks/knowledge-base/download?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Download failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Download file to user's computer
    const content = result.content || '';
    const mimeType = result.mimeType || 'application/octet-stream';
    downloadFile(fileName, content, mimeType);
    
    console.log('✅ File downloaded successfully:', fileName);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Download error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Download failed' 
    };
  }
}

/**
 * Read file content from the Knowledge Base for preview/processing
 */
export async function readKnowledgeBaseFile(
  fileId: string
): Promise<{ 
  success: boolean; 
  content?: string;
  fileName?: string;
  fileType?: string;
  error?: string;
}> {
  try {
    console.log('📖 Reading file from Knowledge Base:', fileId);
    
    const auth = await getAuthData();
    
    const response = await fetch('/api/databricks/knowledge-base/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        ...auth,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Read failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ File read successfully:', result.fileName);
    
    return { 
      success: true,
      content: result.content,
      fileName: result.fileName,
      fileType: result.fileType,
    };
    
  } catch (error) {
    console.error('❌ Read error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Read failed' 
    };
  }
}

/**
 * Process a file in the Knowledge Base (extract text, generate AI summary and tags)
 */
export async function processKnowledgeBaseFile(
  fileId: string
): Promise<{ 
  success: boolean;
  summary?: string;
  tags?: string;
  error?: string;
}> {
  try {
    console.log('⚙️ Processing file:', fileId);
    
    const auth = await getAuthData();
    
    const response = await fetch('/api/databricks/knowledge-base/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        ...auth,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Processing failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ File processed successfully:', result.fileName);
    
    return { 
      success: true,
      summary: result.summary,
      tags: result.tags,
    };
    
  } catch (error) {
    console.error('❌ Processing error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Processing failed' 
    };
  }
}

/**
 * Classify a file in the Knowledge Base using AI
 * Automatically determines scope (general/category/brand) and assigns metadata
 */
export async function classifyKnowledgeBaseFile(
  fileId: string,
  fileName: string,
  fileContent: string,
  userHints?: {
    brand?: string;
    category?: string;
    scope?: 'general' | 'category' | 'brand';
  }
): Promise<{ 
  success: boolean;
  classification?: {
    scope: 'general' | 'category' | 'brand';
    category: string | null;
    brand: string | null;
    confidence: number;
    reasoning: string;
    tags: string[];
  };
  error?: string;
}> {
  try {
    console.log('🤖 Classifying file:', fileId);
    
    const auth = await getAuthData();
    
    const response = await fetch('/api/databricks/knowledge-base/classify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        fileName,
        fileContent,
        userHints,
        ...auth,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Classification failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ File classified successfully:', result.classification);
    
    return { 
      success: true,
      classification: result.classification,
    };
    
  } catch (error) {
    console.error('❌ Classification error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Classification failed' 
    };
  }
}

/**
 * Valid categories for the Knowledge Base
 */
export const KNOWLEDGE_BASE_CATEGORIES = [
  'Beer',
  'Cider',
  'RTD',
  'Footwear',
] as const;

export type KnowledgeBaseCategory = typeof KNOWLEDGE_BASE_CATEGORIES[number];

/**
 * Upload uncleaned data to the Knowledge Base
 * This allows saving content without brand/project type for AI processing later
 */
export async function uploadUncleanedToKnowledgeBase(params: {
  file: File;
  fileType: 'Synthesis' | 'Wisdom' | 'Findings' | 'Research' | 'Persona';
  tags?: string[];
  contentSummary?: string;
  insightType?: 'Brand' | 'Category' | 'General';
  inputMethod?: 'Text' | 'Voice' | 'Photo' | 'Video' | 'File' | 'Interview';
  userEmail: string;
  userRole: string;
  scope?: 'general' | 'category' | 'brand'; // Defaults to 'general'
}): Promise<{ 
  success: boolean; 
  fileId?: string;
  filePath?: string;
  error?: string;
}> {
  try {
    console.log('📤 Uploading UNCLEANED data to Knowledge Base:', params.file.name);
    
    const auth = await getAuthData();
    
    // Convert file to base64
    const fileContent = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:... prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(params.file);
    });

    const response = await fetch('/api/databricks/knowledge-base/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: params.file.name,
        fileContent,
        fileSize: params.file.size,
        scope: params.scope || 'general', // Default to general scope
        category: undefined, // No category for uncleaned
        brand: undefined, // No brand for uncleaned
        projectType: undefined, // No project type for uncleaned
        fileType: params.fileType,
        tags: [...(params.tags || []), 'Uncleaned', 'Needs-AI-Processing'],
        contentSummary: params.contentSummary,
        insightType: params.insightType,
        inputMethod: params.inputMethod,
        userEmail: params.userEmail,
        userRole: params.userRole,
        cleaningStatus: 'uncleaned', // Mark as uncleaned
        allowUncleaned: true, // Allow upload without brand/project
        ...auth,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Uncleaned data uploaded successfully:', result.fileId);
    
    return { 
      success: true, 
      fileId: result.fileId,
      filePath: result.filePath,
    };
    
  } catch (error) {
    console.error('❌ Uncleaned upload error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
}
// ─── Assessment & Gems ────────────────────────────────────────────────────────

export interface AssessmentRound {
  roundNumber: number;
  content: string;
  timestamp: string;
}

export interface CitedFile {
  fileName: string;
  fileId: string | null;
}

export interface AssessmentResult {
  success: boolean;
  hexId: string;
  brand: string;
  projectType: string;
  assessmentType: string;
  rounds: AssessmentRound[];
  totalRounds: number;
  citedFiles: CitedFile[];
  completedAt: string;
  error?: string;
}

export interface SaveGemParams {
  gemText: string;
  fileId?: string;
  fileName?: string;
  assessmentType: string;
  hexId: string;
  hexLabel: string;
  brand: string;
  projectType: string;
  createdBy: string;
  accessToken: string;
  workspaceHost: string;
}

/**
 * Save a gem (highlighted passage) from an assessment result
 */
export async function saveGem(
  params: SaveGemParams
): Promise<{ success: boolean; gemId?: string; error?: string }> {
  try {
    console.log('💎 Saving gem from file:', params.fileName);

    const response = await fetch('/api/databricks/gems/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Save failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('💎 Gem saved:', result.gemId);
    return { success: true, gemId: result.gemId };

  } catch (error) {
    console.error('❌ Gem save error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gem save failed',
    };
  }
}

export interface Gem {
  gemId: string;
  gemText: string;
  fileId: string | null;
  fileName: string | null;
  assessmentType: string;
  hexId: string;
  hexLabel: string;
  brand: string;
  projectType: string;
  createdBy: string;
  createdAt: string;
}

/**
 * List saved gems with optional filters
 */
export async function listGems(params: {
  brand?: string;
  hexId?: string;
  createdBy?: string;
  limit?: number;
}): Promise<Gem[]> {
  try {
    const auth = await getAuthData();
    const query = new URLSearchParams();
    if (params.brand) query.append('brand', params.brand);
    if (params.hexId) query.append('hexId', params.hexId);
    if (params.createdBy) query.append('createdBy', params.createdBy);
    if (params.limit) query.append('limit', String(params.limit));
    query.append('accessToken', auth.accessToken);
    query.append('workspaceHost', auth.workspaceHost);

    const response = await fetch(`/api/databricks/gems/list?${query}`);
    if (!response.ok) throw new Error('Failed to list gems');

    const result = await response.json();
    return result.gems || [];

  } catch (error) {
    console.error('❌ List gems error:', error);
    return [];
  }
}
