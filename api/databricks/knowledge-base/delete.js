/**
 * Knowledge Base Delete API
 *
 * Deletes a file from both the Unity Catalog Volume and the metadata table.
 * All Databricks credentials read from environment variables.
 * Uses REST API (not @databricks/sql which doesn't work in Vercel serverless).
 *
 * Location: api/databricks/knowledge-base/delete.js
 */

import { getDatabricksConfig } from '../../utils/validateEnv.js';
import { logFileEvent, logError } from '../../utils/logger.js';
import { getRoleForEmail, getRoleForOAuthToken, roleIsAllowed, ROLES_DELETE_FILES } from '../../utils/userRole.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workspaceHost, accessToken, warehouseId, schema } = getDatabricksConfig();

    const { fileId, userEmail, oauthToken, oauthWorkspaceHost } = req.body;

    if (!fileId || !userEmail) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['fileId', 'userEmail'],
      });
    }

    // If the client passes an OAuth token, use it to verify identity server-side
    // via Databricks SCIM — this avoids trusting the client-supplied userEmail.
    const resolvedRole = oauthToken
      ? await getRoleForOAuthToken(oauthToken, oauthWorkspaceHost || workspaceHost, warehouseId, schema)
      : await getRoleForEmail(userEmail, workspaceHost, accessToken, warehouseId, schema);
    if (!roleIsAllowed(resolvedRole, ROLES_DELETE_FILES)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only Research Leaders, Data Scientists, and Administrators can delete files',
      });
    }

    console.log(`[Knowledge Base Delete] User: ${userEmail} (${resolvedRole}) deleting file: ${fileId}`);

    // Step 1: Get file path from metadata
    const selectResponse = await fetch(
      `https://${workspaceHost}/api/2.0/sql/statements`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: warehouseId,
          statement: `SELECT file_name, file_path, uploaded_by
                      FROM knowledge_base.${schema}.file_metadata
                      WHERE file_id = '${fileId}'`,
          wait_timeout: '30s',
        }),
      }
    );

    if (!selectResponse.ok) {
      const errorData = await selectResponse.json();
      throw new Error(`Metadata query failed: ${errorData.message || selectResponse.statusText}`);
    }

    const selectResult = await selectResponse.json();
    const rows = selectResult.result?.data_array || [];

    if (rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const [fileName, filePath, uploadedBy] = rows[0];
    console.log(`[Knowledge Base Delete] Deleting: ${fileName} at ${filePath} (uploaded by ${uploadedBy})`);

    // Step 2: Delete actual file from volume
    try {
      const deleteFileResponse = await fetch(
        `https://${workspaceHost}/api/2.0/fs/files${filePath}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!deleteFileResponse.ok && deleteFileResponse.status !== 404) {
        console.warn(`[Knowledge Base Delete] Warning: File deletion returned ${deleteFileResponse.status}`);
      } else {
        console.log('[Knowledge Base Delete] File deleted from volume');
      }
    } catch (fileError) {
      console.error('[Knowledge Base Delete] File deletion error (continuing with metadata):', fileError.message);
    }

    // Step 3: Delete metadata row
    const deleteMetaResponse = await fetch(
      `https://${workspaceHost}/api/2.0/sql/statements`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: warehouseId,
          statement: `DELETE FROM knowledge_base.${schema}.file_metadata WHERE file_id = '${fileId}'`,
          wait_timeout: '30s',
        }),
      }
    );

    if (!deleteMetaResponse.ok) {
      const errorData = await deleteMetaResponse.json();
      throw new Error(`Metadata delete failed: ${errorData.message || deleteMetaResponse.statusText}`);
    }

    console.log(`[Knowledge Base Delete] SUCCESS: ${fileName} deleted by ${userEmail}`);
    logFileEvent({ eventType: 'file_deleted', userEmail, fileName, fileId, details: { filePath, uploadedBy } });

    return res.status(200).json({
      success: true,
      fileId,
      fileName,
      message: `File "${fileName}" has been deleted`,
      deletedBy: userEmail,
    });

  } catch (error) {
    console.error('[Knowledge Base Delete] Error:', error);
    logError({ userEmail: req.body?.userEmail, error, context: { fileId: req.body?.fileId, operation: 'delete' } });
    return res.status(500).json({ error: 'Deletion failed', message: error.message });
  }
}
