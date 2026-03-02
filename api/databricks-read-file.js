/**
 * Vercel Serverless Function: Read Databricks File
 * Proxy for reading file content from Databricks workspace, DBFS, or volumes
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { path, encoding = 'text', accessToken, workspaceHost } = req.body;

    // Validate required fields
    if (!path || !accessToken || !workspaceHost) {
      return res.status(400).json({ 
        error: 'Missing required fields: path, accessToken, workspaceHost' 
      });
    }

    let content = '';
    let endpoint = '';
    let method = 'GET';
    let body = undefined;

    // Determine the correct Databricks API endpoint based on path type
    if (path.startsWith('/Workspace')) {
      endpoint = `/api/2.0/workspace/export?path=${encodeURIComponent(path)}&format=SOURCE`;
    } else if (path.startsWith('/Volumes')) {
      endpoint = `/api/2.0/fs/files${path}`;
    } else if (path.startsWith('dbfs:')) {
      const cleanPath = path.replace(/^dbfs:/, '');
      endpoint = `/api/2.0/dbfs/read`;
      method = 'POST';
      body = JSON.stringify({ path: cleanPath });
    } else {
      return res.status(400).json({ 
        error: 'Invalid path. Must start with /Workspace, /Volumes, or dbfs:' 
      });
    }

    const databricksUrl = `https://${workspaceHost}${endpoint}`;

    const response = await fetch(databricksUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData.message || `Databricks API error: ${response.statusText}`,
      });
    }

    const data = await response.json();

    // Process content based on path type and encoding
    if (path.startsWith('/Workspace')) {
      if (encoding === 'base64') {
        content = data.content || '';
      } else {
        // Decode base64 content to text
        content = Buffer.from(data.content || '', 'base64').toString('utf-8');
      }
    } else if (path.startsWith('/Volumes')) {
      if (encoding === 'base64') {
        content = Buffer.from(data.contents || '').toString('base64');
      } else {
        content = data.contents || '';
      }
    } else if (path.startsWith('dbfs:')) {
      if (encoding === 'base64') {
        content = data.data || '';
      } else {
        content = Buffer.from(data.data || '', 'base64').toString('utf-8');
      }
    }

    const fileName = path.split('/').pop() || 'unknown';

    return res.status(200).json({
      path,
      name: fileName,
      content,
      encoding,
    });

  } catch (error) {
    console.error('Read file error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
