/**
 * Knowledge Base Approve API
 * 
 * Approves a pending file in the Knowledge Base.
 * Uses REST API (not @databricks/sql which doesn't work in Vercel serverless).
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      fileId,
      approvalNotes = '',
      userEmail,
      userRole,
      accessToken,
      workspaceHost,
    } = req.body;

    if (!fileId || !userEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['fileId', 'userEmail']
      });
    }

    if (!accessToken || !workspaceHost) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`[KB Approve] User: ${userEmail} (${userRole}) approving file: ${fileId}`);

    const warehouseId = '52742af9db71826d';

    // Step 1: Update file approval status
    const updateSQL = `
      UPDATE knowledge_base.cohive.file_metadata
      SET 
        is_approved = TRUE,
        approver_email = '${userEmail.replace(/'/g, "''")}',
        approval_date = CURRENT_TIMESTAMP(),
        approval_notes = '${approvalNotes.replace(/'/g, "''")}',
        updated_at = CURRENT_TIMESTAMP()
      WHERE file_id = '${fileId}'
    `;

    const updateResponse = await fetch(
      `https://${workspaceHost}/api/2.0/sql/statements`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          warehouse_id: warehouseId,
          statement: updateSQL,
          wait_timeout: '30s',
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(`Update failed: ${errorData.message || updateResponse.statusText}`);
    }

    // Step 2: Verify the update actually worked
    const verifySQL = `
      SELECT file_id, file_name, is_approved, approver_email, approval_date
      FROM knowledge_base.cohive.file_metadata
      WHERE file_id = '${fileId}'
    `;

    const verifyResponse = await fetch(
      `https://${workspaceHost}/api/2.0/sql/statements`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          warehouse_id: warehouseId,
          statement: verifySQL,
          wait_timeout: '30s',
        }),
      }
    );

    if (!verifyResponse.ok) {
      throw new Error('Could not verify approval');
    }

    const verifyResult = await verifyResponse.json();
    const rows = verifyResult.result?.data_array || [];

    if (rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const [, fileName, isApproved] = rows[0];

    // Confirm the DB actually shows TRUE
    if (isApproved !== true) {
      throw new Error('Approval did not persist to database');
    }

    console.log(`[KB Approve] SUCCESS: ${fileName} approved by ${userEmail}`);

    return res.status(200).json({
      success: true,
      fileId,
      fileName,
      isApproved: true,
      approvedBy: userEmail,
      approvalDate: new Date().toISOString(),
      message: `File "${fileName}" has been approved`,
    });

  } catch (error) {
    console.error('[KB Approve] Error:', error);
    return res.status(500).json({ 
      error: 'Approval failed',
      message: error.message 
    });
  }
}