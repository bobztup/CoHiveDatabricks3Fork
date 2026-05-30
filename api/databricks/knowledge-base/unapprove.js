/**
 * Knowledge Base Unapprove API
 *
 * Sets is_approved = FALSE for a file in the Knowledge Base.
 * Mirror of approve.js — same pattern, opposite value.
 *
 * Location: api/databricks/knowledge-base/unapprove.js
 */

import { getDatabricksConfig } from '../../utils/validateEnv.js';
import { logFileEvent, logError } from '../../utils/logger.js';
import { getRoleForEmail, getRoleForOAuthToken, roleIsAllowed, ROLES_APPROVE_RESEARCH } from '../../utils/userRole.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const resolvedRole = oauthToken
      ? await getRoleForOAuthToken(oauthToken, oauthWorkspaceHost || workspaceHost, warehouseId, schema)
      : await getRoleForEmail(userEmail, workspaceHost, accessToken, warehouseId, schema);
    if (!roleIsAllowed(resolvedRole, ROLES_APPROVE_RESEARCH)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only Research Leaders and Administrators can unapprove files',
      });
    }

    console.log(`[KB Unapprove] ${userEmail} (${resolvedRole}) unapproving file: ${fileId}`);

    const updateResponse = await fetch(
      `https://${workspaceHost}/api/2.0/sql/statements`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: warehouseId,
          statement: `
            UPDATE knowledge_base.${schema}.file_metadata
            SET
              is_approved = FALSE,
              approver_email = NULL,
              approval_date = NULL,
              approval_notes = 'Unapproved by ${userEmail.replace(/'/g, "''")}',
              updated_at = CURRENT_TIMESTAMP()
            WHERE file_id = '${fileId.replace(/'/g, "''")}'
          `,
          wait_timeout: '30s',
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(`Update failed: ${errorData.message || updateResponse.statusText}`);
    }

    // Verify
    const verifyResponse = await fetch(
      `https://${workspaceHost}/api/2.0/sql/statements`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: warehouseId,
          statement: `
            SELECT file_id, file_name, is_approved
            FROM knowledge_base.${schema}.file_metadata
            WHERE file_id = '${fileId.replace(/'/g, "''")}'
          `,
          wait_timeout: '30s',
        }),
      }
    );

    if (!verifyResponse.ok) throw new Error('Could not verify unapproval');

    const verifyResult = await verifyResponse.json();
    const rows = verifyResult.result?.data_array || [];
    if (rows.length === 0) return res.status(404).json({ error: 'File not found' });

    const [, fileName, isApproved] = rows[0];

    console.log(`[KB Unapprove] ✅ ${fileName} unapproved by ${userEmail}`);
    logFileEvent({ eventType: 'file_unapproved', userEmail, fileName, fileId, details: {} });

    return res.status(200).json({
      success: true,
      fileId,
      fileName,
      isApproved: false,
      message: `File "${fileName}" has been unapproved`,
    });

  } catch (error) {
    console.error('[KB Unapprove] Error:', error);
    logError({ userEmail: req.body?.userEmail, error, context: { fileId: req.body?.fileId, operation: 'unapprove' } });
    return res.status(500).json({ error: 'Unapproval failed', message: error.message });
  }
}
