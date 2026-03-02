/**
 * Knowledge Base Delete API
 * 
 * Deletes a file from both the Unity Catalog Volume and the metadata table.
 * Logs the action but does not enforce role restrictions (per user request).
 * 
 * Location: api/databricks/knowledge-base/delete.js
 */

import { createClient } from '@databricks/sql';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      fileId,
      
      // User info (for logging only, no enforcement)
      userEmail,
      userRole,
      
      // Auth
      accessToken,
      workspaceHost,
    } = req.body;

    // Validate required fields
    if (!fileId || !userEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['fileId', 'userEmail']
      });
    }

    if (!accessToken || !workspaceHost) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Log the delete action (audit trail - no blocking)
    console.log(`[KB Delete] User: ${userEmail} (${userRole}) deleting file: ${fileId}`);

    // Connect to Databricks SQL
    const client = createClient({
      host: workspaceHost,
      path: '/sql/1.0/warehouses/52742af9db71826d', // User needs to replace with their warehouse ID
      token: accessToken,
    });

    await client.connect();

    // First, get the file path so we can delete the actual file
    const selectQuery = `
      SELECT file_name, file_path, uploaded_by
      FROM knowledge_base.cohive.file_metadata
      WHERE file_id = '${fileId}'
    `;

    const result = await client.executeStatement(selectQuery);

    if (result.result.data_array.length === 0) {
      await client.close();
      return res.status(404).json({ error: 'File not found' });
    }

    const [fileName, filePath, uploadedBy] = result.result.data_array[0];

    console.log(`[KB Delete] Deleting: ${fileName} at ${filePath}`);
    console.log(`[KB Delete] Originally uploaded by: ${uploadedBy}`);

    // Step 1: Delete the actual file from the volume
    try {
      const deleteFileResponse = await fetch(
        `https://${workspaceHost}/api/2.0/fs/files${filePath}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!deleteFileResponse.ok && deleteFileResponse.status !== 404) {
        // If file doesn't exist (404), that's okay - proceed with metadata deletion
        // For other errors, log but continue (metadata should still be cleaned up)
        console.warn(`[KB Delete] Warning: File deletion returned ${deleteFileResponse.status}`);
      } else {
        console.log('[KB Delete] File deleted from volume');
      }
    } catch (fileError) {
      // Log error but continue with metadata deletion
      console.error('[KB Delete] File deletion error (continuing with metadata):', fileError.message);
    }

    // Step 2: Delete the metadata row
    const deleteQuery = `
      DELETE FROM knowledge_base.cohive.file_metadata
      WHERE file_id = '${fileId}'
    `;

    await client.executeStatement(deleteQuery);
    await client.close();

    console.log(`[KB Delete] SUCCESS: ${fileName} deleted by ${userEmail}`);

    return res.status(200).json({
      success: true,
      fileId,
      fileName,
      message: `File "${fileName}" has been deleted`,
      deletedBy: userEmail,
    });

  } catch (error) {
    console.error('[KB Delete] Error:', error);
    return res.status(500).json({ 
      error: 'Deletion failed',
      message: error.message 
    });
  }
}
