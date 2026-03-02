/**
 * Databricks File Client
 * Handles communication with Databricks using OAuth authentication
 */

import { getValidSession, isAuthenticated } from './databricksAuth';
import { safeFetch } from './safeFetch';

export interface DatabricksFile {
  name: string;
  path: string;
  type: 'workspace' | 'volume' | 'dbfs';
  size?: number;
  modified_at?: number;
}

export interface FileListResponse {
  path: string;
  files: DatabricksFile[];
  count: number;
}

export interface FileReadResponse {
  path: string;
  name: string;
  content: string;
  encoding: 'text' | 'base64';
}

/**
 * Check if user has valid authentication
 */
export function hasCredentials(): boolean {
  return isAuthenticated();
}

/**
 * Make a request to Databricks API
 */
async function databricksRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  body?: any
): Promise<any> {
  try {
    const session = await getValidSession();
    
    if (!session) {
      throw new Error('Not authenticated. Please log in to Databricks.');
    }

    const url = `https://${session.workspaceHost}${endpoint}`;
    
    const response = await safeFetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response) {
      throw new Error('Network error: Unable to reach Databricks');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Databricks API error: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Databricks request failed:', error);
    throw error;
  }
}

/**
 * List files from a Databricks workspace path
 */
async function listWorkspaceFiles(path: string, fileTypes?: string[]): Promise<DatabricksFile[]> {
  try {
    const response = await databricksRequest(`/api/2.0/workspace/list?path=${encodeURIComponent(path)}`);
    
    const files: DatabricksFile[] = [];
    
    if (response.objects) {
      for (const item of response.objects) {
        if (item.object_type === 'FILE' || item.object_type === 'NOTEBOOK') {
          const fileName = item.path.split('/').pop() || '';
          
          // Filter by file types if specified
          if (!fileTypes || fileTypes.length === 0 || 
              fileTypes.some(ft => fileName.toLowerCase().endsWith(`.${ft.toLowerCase()}`))) {
            files.push({
              name: fileName,
              path: item.path,
              type: 'workspace',
              size: item.size,
              modified_at: item.modified_at,
            });
          }
        }
      }
    }
    
    return files;
  } catch (error) {
    console.error('Error listing workspace files:', error);
    return [];
  }
}

/**
 * List files from a Databricks Unity Catalog volume
 */
async function listVolumeFiles(path: string, fileTypes?: string[]): Promise<DatabricksFile[]> {
  try {
    const response = await databricksRequest(`/api/2.0/fs/directories${path}`);
    
    const files: DatabricksFile[] = [];
    
    if (response.contents) {
      for (const item of response.contents) {
        if (!item.is_directory) {
          const fileName = item.name;
          
          if (!fileTypes || fileTypes.length === 0 || 
              fileTypes.some(ft => fileName.toLowerCase().endsWith(`.${ft.toLowerCase()}`))) {
            files.push({
              name: fileName,
              path: item.path,
              type: 'volume',
              size: item.file_size,
              modified_at: item.last_modified,
            });
          }
        }
      }
    }
    
    return files;
  } catch (error) {
    console.error('Error listing volume files:', error);
    return [];
  }
}

/**
 * List files from DBFS
 */
async function listDbfsFiles(path: string, fileTypes?: string[]): Promise<DatabricksFile[]> {
  try {
    // Remove 'dbfs:' prefix if present
    const cleanPath = path.replace(/^dbfs:/, '');
    
    const response = await databricksRequest(`/api/2.0/dbfs/list?path=${encodeURIComponent(cleanPath)}`);
    
    const files: DatabricksFile[] = [];
    
    if (response.files) {
      for (const item of response.files) {
        if (!item.is_dir) {
          const fileName = item.path.split('/').pop() || '';
          
          if (!fileTypes || fileTypes.length === 0 || 
              fileTypes.some(ft => fileName.toLowerCase().endsWith(`.${ft.toLowerCase()}`))) {
            files.push({
              name: fileName,
              path: `dbfs:${item.path}`,
              type: 'dbfs',
              size: item.file_size,
            });
          }
        }
      }
    }
    
    return files;
  } catch (error) {
    console.error('Error listing DBFS files:', error);
    return [];
  }
}

/**
 * List files from a Databricks location
 */
export async function listDatabricksFiles(
  path: string,
  fileTypes?: string[]
): Promise<FileListResponse> {
  let files: DatabricksFile[] = [];

  if (path.startsWith('/Workspace')) {
    files = await listWorkspaceFiles(path, fileTypes);
  } else if (path.startsWith('/Volumes')) {
    files = await listVolumeFiles(path, fileTypes);
  } else if (path.startsWith('dbfs:')) {
    files = await listDbfsFiles(path, fileTypes);
  } else {
    throw new Error('Invalid path. Must start with /Workspace, /Volumes, or dbfs:');
  }

  return {
    path,
    files,
    count: files.length,
  };
}

/**
 * Read a file from Databricks workspace
 */
async function readWorkspaceFile(path: string, encoding: 'text' | 'base64'): Promise<string> {
  try {
    const response = await databricksRequest(`/api/2.0/workspace/export?path=${encodeURIComponent(path)}&format=SOURCE`);
    
    if (encoding === 'base64') {
      return response.content || '';
    } else {
      // Decode base64 content to text
      return atob(response.content || '');
    }
  } catch (error) {
    throw new Error(`Error reading workspace file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Read a file from Databricks volume
 */
async function readVolumeFile(path: string, encoding: 'text' | 'base64'): Promise<string> {
  try {
    const response = await databricksRequest(`/api/2.0/fs/files${path}`);
    
    if (encoding === 'base64') {
      return btoa(response.contents || '');
    } else {
      return response.contents || '';
    }
  } catch (error) {
    throw new Error(`Error reading volume file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Read a file from DBFS
 */
async function readDbfsFile(path: string, encoding: 'text' | 'base64'): Promise<string> {
  try {
    const cleanPath = path.replace(/^dbfs:/, '');
    
    const response = await databricksRequest(
      `/api/2.0/dbfs/read`,
      'POST',
      { path: cleanPath }
    );
    
    if (encoding === 'base64') {
      return response.data || '';
    } else {
      return atob(response.data || '');
    }
  } catch (error) {
    throw new Error(`Error reading DBFS file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Read a file from Databricks
 */
export async function readDatabricksFile(
  path: string,
  encoding: 'text' | 'base64' = 'text'
): Promise<FileReadResponse> {
  let content: string;
  
  if (path.startsWith('/Workspace')) {
    content = await readWorkspaceFile(path, encoding);
  } else if (path.startsWith('/Volumes')) {
    content = await readVolumeFile(path, encoding);
  } else if (path.startsWith('dbfs:')) {
    content = await readDbfsFile(path, encoding);
  } else {
    throw new Error('Invalid path');
  }

  const fileName = path.split('/').pop() || 'unknown';

  return {
    path,
    name: fileName,
    content,
    encoding,
  };
}

/**
 * Write a file to Databricks workspace
 */
async function writeWorkspaceFile(path: string, content: string, overwrite: boolean = false): Promise<void> {
  try {
    // Encode content as base64
    const base64Content = btoa(content);
    
    await databricksRequest(
      `/api/2.0/workspace/import`,
      'POST',
      {
        path,
        content: base64Content,
        format: 'SOURCE',
        overwrite,
      }
    );
  } catch (error) {
    throw new Error(`Error writing workspace file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Write a file to Databricks volume
 */
async function writeVolumeFile(path: string, content: string, overwrite: boolean = false): Promise<void> {
  try {
    await databricksRequest(
      `/api/2.0/fs/files${path}`,
      'PUT',
      { contents: content, overwrite }
    );
  } catch (error) {
    throw new Error(`Error writing volume file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Write a file to DBFS
 */
async function writeDbfsFile(path: string, content: string, overwrite: boolean = false): Promise<void> {
  try {
    const cleanPath = path.replace(/^dbfs:/, '');
    const base64Content = btoa(content);
    
    await databricksRequest(
      `/api/2.0/dbfs/put`,
      'POST',
      {
        path: cleanPath,
        contents: base64Content,
        overwrite,
      }
    );
  } catch (error) {
    throw new Error(`Error writing DBFS file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Write a file to Databricks
 */
export async function writeDatabricksFile(
  path: string,
  content: string,
  overwrite: boolean = false
): Promise<{ success: boolean; path: string }> {
  try {
    if (path.startsWith('/Workspace')) {
      await writeWorkspaceFile(path, content, overwrite);
    } else if (path.startsWith('/Volumes')) {
      await writeVolumeFile(path, content, overwrite);
    } else if (path.startsWith('dbfs:')) {
      await writeDbfsFile(path, content, overwrite);
    } else {
      throw new Error('Invalid path. Must start with /Workspace, /Volumes, or dbfs:');
    }

    return {
      success: true,
      path,
    };
  } catch (error) {
    console.error('Error writing file to Databricks:', error);
    throw error;
  }
}

/**
 * Check if Databricks API is available
 */
export async function checkDatabricksHealth(): Promise<boolean> {
  try {
    if (!isAuthenticated()) {
      return false;
    }

    const session = await getValidSession().catch(err => {
      console.error('Failed to get valid session during health check:', err);
      return null;
    });
    
    if (!session) {
      return false;
    }

    // Test with a simple workspace list call using safeFetch
    const response = await safeFetch(
      `https://${session.workspaceHost}/api/2.0/workspace/list?path=/`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response ? response.ok : false;
  } catch (error) {
    console.error('Databricks API health check failed:', error);
    return false;
  }
}

/**
 * Common Databricks paths for quick access
 */
export const DATABRICKS_PATHS = {
  workspace: '/Workspace/Shared',
  workspaceUsers: '/Workspace/Users',
  volumes: '/Volumes',
  dbfs: 'dbfs:/FileStore',
};

/**
 * Supported file types for research synthesis
 */
export const RESEARCH_FILE_TYPES = [
  'pdf',
  'docx',
  'doc',
  'txt',
  'md',
  'csv',
  'xlsx',
  'xls',
];
