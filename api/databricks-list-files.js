/**
 * Vercel Serverless Function: List Databricks Files
 * Proxy for listing files from Databricks workspace, DBFS, or volumes
 */

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { path, fileTypes, accessToken, workspaceHost } = req.query;

    // Validate required fields
    if (!accessToken || !workspaceHost) {
      return res.status(400).json({ 
        error: 'Missing required parameters: accessToken, workspaceHost' 
      });
    }

    const filePath = path || '/Workspace/Shared';
    const fileTypeList = fileTypes ? fileTypes.split(',') : [];

    let endpoint = '';
    
    // Determine the correct Databricks API endpoint based on path type
    if (filePath.startsWith('/Workspace')) {
      endpoint = `/api/2.0/workspace/list?path=${encodeURIComponent(filePath)}`;
    } else if (filePath.startsWith('/Volumes')) {
      endpoint = `/api/2.0/fs/directories${filePath}`;
    } else if (filePath.startsWith('dbfs:')) {
      const cleanPath = filePath.replace(/^dbfs:/, '');
      endpoint = `/api/2.0/dbfs/list?path=${encodeURIComponent(cleanPath)}`;
    } else {
      return res.status(400).json({ 
        error: 'Invalid path. Must start with /Workspace, /Volumes, or dbfs:' 
      });
    }

    const databricksUrl = `https://${workspaceHost}${endpoint}`;

    const response = await fetch(databricksUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData.message || `Databricks API error: ${response.statusText}`,
      });
    }

    const data = await response.json();

    // Process and filter files based on type
    const files = processFiles(data, filePath, fileTypeList);

    return res.status(200).json({
      path: filePath,
      files,
      count: files.length,
    });

  } catch (error) {
    console.error('List files error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

function processFiles(data, path, fileTypes) {
  const files = [];

  if (path.startsWith('/Workspace')) {
    // Process workspace files
    if (data.objects) {
      for (const item of data.objects) {
        if (item.object_type === 'FILE' || item.object_type === 'NOTEBOOK') {
          const fileName = item.path.split('/').pop() || '';
          
          if (!fileTypes.length || fileTypes.some(ft => fileName.toLowerCase().endsWith(`.${ft.toLowerCase()}`))) {
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
  } else if (path.startsWith('/Volumes')) {
    // Process volume files
    if (data.contents) {
      for (const item of data.contents) {
        if (!item.is_directory) {
          const fileName = item.name;
          
          if (!fileTypes.length || fileTypes.some(ft => fileName.toLowerCase().endsWith(`.${ft.toLowerCase()}`))) {
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
  } else if (path.startsWith('dbfs:')) {
    // Process DBFS files
    if (data.files) {
      for (const item of data.files) {
        if (!item.is_dir) {
          const fileName = item.path.split('/').pop() || '';
          
          if (!fileTypes.length || fileTypes.some(ft => fileName.toLowerCase().endsWith(`.${ft.toLowerCase()}`))) {
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
  }

  return files;
}
