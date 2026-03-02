import formidable from 'formidable';
import fs from 'fs';

// Vercel serverless function configuration
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Parse form data using formidable v3
    const form = formidable({});
    
    const parseForm = () => new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const { fields, files } = await parseForm();

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const workspaceUrl = Array.isArray(fields.workspace_url) ? fields.workspace_url[0] : fields.workspace_url;
    const databricksToken = Array.isArray(fields.databricks_token) ? fields.databricks_token[0] : fields.databricks_token;
    const catalogPath = Array.isArray(fields.catalog_path) ? fields.catalog_path[0] : fields.catalog_path;

    if (!file || !workspaceUrl || !databricksToken || !catalogPath) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: file, workspace_url, databricks_token, or catalog_path',
      });
    }

    // Parse catalog path (format: catalog/schema)
    const [catalog, schema] = catalogPath.split('/');
    if (!catalog || !schema) {
      return res.status(400).json({
        success: false,
        error: 'Invalid catalog_path format. Expected: catalog/schema',
      });
    }

    // Read file contents
    const fileBuffer = fs.readFileSync(file.filepath);

    // Create the file path in Databricks
    const fileName = file.originalFilename || 'upload';
    const volumePath = `/Volumes/${catalog}/${schema}/default/${fileName}`;

    // Upload to Databricks using the Files API
    const uploadUrl = `${workspaceUrl}/api/2.0/fs/files${volumePath}`;
    console.log(`Uploading to: ${uploadUrl}`);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${databricksToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Databricks API Error:', errorText);
      return res.status(500).json({
        success: false,
        error: `Databricks upload failed: ${uploadResponse.status} - ${errorText}`,
        details: {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          volumePath,
        },
      });
    }

    // Success response
    return res.status(200).json({
      success: true,
      file: {
        name: fileName,
        path: volumePath,
        size: file.size,
        catalog,
        schema,
      },
      message: 'File uploaded successfully to Databricks',
    });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
