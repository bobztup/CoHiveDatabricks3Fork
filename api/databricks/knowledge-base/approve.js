/**
 * Knowledge Base Approve API
 *
 * Approves a pending file in the Knowledge Base.
 * All Databricks credentials read from environment variables.
 *
 * Location: api/databricks/knowledge-base/approve.js
 */

import { getDatabricksConfig } from '../../utils/validateEnv.js';
import { logFileEvent, logError } from '../../utils/logger.js';
import { getRoleForEmail, roleIsAllowed, ROLES_APPROVE_RESEARCH } from '../../utils/userRole.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workspaceHost, accessToken, warehouseId, schema } = getDatabricksConfig();

    const {
      fileId,
      approvalNotes = '',
      userEmail,
      oauthToken,
      oauthWorkspaceHost,
    } = req.body;

    if (!fileId || !userEmail) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['fileId', 'userEmail'],
      });
    }

    const lookupToken = oauthToken || accessToken;
    const lookupHost  = oauthWorkspaceHost || workspaceHost;
    const resolvedRole = await getRoleForEmail(userEmail, lookupHost, lookupToken, warehouseId, schema);
    if (!roleIsAllowed(resolvedRole, ROLES_APPROVE_RESEARCH)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only Research Leaders and Administrators can approve files',
      });
    }

    console.log(`[KB Approve] User: ${userEmail} (${resolvedRole}) approving fileId: "${fileId}"`);
    console.log(`[KB Approve] Schema: ${schema}, Warehouse: ${warehouseId}`);

    // ── Step 1: Confirm the file exists and check current state ──────────────
    const checkResp = await fetch(
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
            LIMIT 1
          `,
          wait_timeout: '30s',
        }),
      }
    );

    if (!checkResp.ok) {
      const err = await checkResp.json().catch(() => ({}));
      throw new Error(`Pre-check query failed: ${err.message || checkResp.statusText}`);
    }

    const checkResult = await checkResp.json();
    const checkRows = checkResult.result?.data_array || [];

    if (checkRows.length === 0) {
      // File not found — log a sample of actual file_ids to diagnose the mismatch
      console.error(`[KB Approve] File "${fileId}" NOT FOUND in file_metadata`);

      const sampleResp = await fetch(
        `https://${workspaceHost}/api/2.0/sql/statements`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouse_id: warehouseId,
            statement: `
              SELECT file_id, file_name, is_approved
              FROM knowledge_base.${schema}.file_metadata
              ORDER BY created_at DESC
              LIMIT 10
            `,
            wait_timeout: '30s',
          }),
        }
      );

      let sampleIds = [];
      if (sampleResp.ok) {
        const sampleResult = await sampleResp.json();
        sampleIds = (sampleResult.result?.data_array || [])
          .map(r => `${r[0]} → ${r[1]} (approved: ${r[2]})`);
      }

      console.error(`[KB Approve] Recent file_ids in table:\n${sampleIds.join('\n')}`);

      return res.status(404).json({
        error: 'File not found',
        fileId,
        message: `No row with file_id "${fileId}" in knowledge_base.${schema}.file_metadata`,
        recentFileIds: sampleIds,
      });
    }

    const [foundFileId, fileName, currentApproved] = checkRows[0];
    console.log(`[KB Approve] Found: "${fileName}" (id: "${foundFileId}", is_approved: ${currentApproved})`);

    if (currentApproved === true) {
      console.log(`[KB Approve] Already approved — returning success`);
      return res.status(200).json({
        success: true,
        fileId,
        fileName,
        isApproved: true,
        approvedBy: userEmail,
        approvalDate: new Date().toISOString(),
        message: `File "${fileName}" was already approved`,
      });
    }

    // ── Step 2: Write the approval ────────────────────────────────────────────
    const updateResp = await fetch(
      `https://${workspaceHost}/api/2.0/sql/statements`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_id: warehouseId,
          statement: `
            UPDATE knowledge_base.${schema}.file_metadata
            SET
              is_approved    = TRUE,
              approver_email = '${userEmail.replace(/'/g, "''")}',
              approval_date  = CURRENT_TIMESTAMP(),
              approval_notes = '${approvalNotes.replace(/'/g, "''")}',
              updated_at     = CURRENT_TIMESTAMP()
            WHERE file_id = '${foundFileId.replace(/'/g, "''")}'
          `,
          wait_timeout: '30s',
        }),
      }
    );

    if (!updateResp.ok) {
      const errorData = await updateResp.json().catch(() => ({}));
      throw new Error(`UPDATE failed: ${errorData.message || updateResp.statusText}`);
    }

    const updateResult = await updateResp.json();

    // Check rows affected — if 0, the UPDATE ran but matched nothing
    // (can happen if the table uses a different primary key or the row was deleted)
    const rowsAffected = updateResult.result?.row_count
      ?? updateResult.result?.num_rows
      ?? updateResult.result?.data_array?.[0]?.[0]
      ?? null;

    console.log(`[KB Approve] UPDATE complete. Rows affected: ${rowsAffected}`);
    console.log(`[KB Approve] Full update result:`, JSON.stringify(updateResult.result ?? {}).substring(0, 300));

    if (rowsAffected === 0) {
      throw new Error(
        `UPDATE returned 0 rows affected for file_id "${foundFileId}". ` +
        `The table may be read-only, missing MODIFY grants, or the Delta table ` +
        `needs OPTIMIZE/VACUUM. Try: GRANT MODIFY ON TABLE knowledge_base.${schema}.file_metadata TO \`${userEmail}\``
      );
    }

    console.log(`[KB Approve] ✅ "${fileName}" approved by ${userEmail}`);

    try {
      logFileEvent({ eventType: 'file_approved', userEmail, fileName, fileId: foundFileId, details: { approvalNotes } });
    } catch (logErr) {
      console.warn('[KB Approve] Log write failed (non-fatal):', logErr.message);
    }

    return res.status(200).json({
      success: true,
      fileId: foundFileId,
      fileName,
      isApproved: true,
      approvedBy: userEmail,
      approvalDate: new Date().toISOString(),
      message: `File "${fileName}" has been approved`,
    });

  } catch (error) {
    console.error('[KB Approve] Error:', error);
    try {
      logError({ userEmail: req.body?.userEmail, error, context: { fileId: req.body?.fileId, operation: 'approve' } });
    } catch {}
    return res.status(500).json({ error: 'Approval failed', message: error.message });
  }
}
