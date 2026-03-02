/**
 * Knowledge Base Update Metadata API
 * 
 * Updates metadata for an existing file in the Knowledge Base.
 * Can update tags, content summary, and other non-structural fields.
 * 
 * Location: api/databricks/knowledge-base/update.js
 */

import { createClient } from '@databricks/sql';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      fileId,
      
      // Fields that can be updated
      tags,
      contentSummary,
      projectType,
      approvalNotes,
      citationCount,
      gemInclusionCount,
      
      // User info (for logging)
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

    // Log the update action (audit trail)
    console.log(`[KB Update] User: ${userEmail} (${userRole}) updating file: ${fileId}`);

    // Build SET clause dynamically based on provided fields
    const updates = [];

    if (tags !== undefined) {
      const tagsArray = Array.isArray(tags) ? tags : [];
      updates.push(`tags = ARRAY(${tagsArray.map(t => `'${t.replace(/'/g, "''")}'`).join(', ')})`);
      console.log(`[KB Update] New tags:`, tagsArray);
    }

    if (contentSummary !== undefined) {
      updates.push(`content_summary = '${contentSummary.replace(/'/g, "''")}'`);
    }

    if (projectType !== undefined) {
      updates.push(`project_type = '${projectType.replace(/'/g, "''")}'`);
    }

    if (approvalNotes !== undefined) {
      updates.push(`approval_notes = '${approvalNotes.replace(/'/g, "''")}'`);
    }

    if (citationCount !== undefined) {
      updates.push(`citation_count = ${parseInt(citationCount)}`);
    }

    if (gemInclusionCount !== undefined) {
      updates.push(`gem_inclusion_count = ${parseInt(gemInclusionCount)}`);
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP()`);

    if (updates.length === 1) { // Only updated_at
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Connect to Databricks SQL
    const client = createClient({
      host: workspaceHost,
      path: '/sql/1.0/warehouses/52742af9db71826d', // User needs to replace with their warehouse ID
      token: accessToken,
    });

    await client.connect();

    // Update the metadata
    const updateQuery = `
      UPDATE knowledge_base.cohive.file_metadata
      SET ${updates.join(', ')}
      WHERE file_id = '${fileId}'
    `;

    console.log('[KB Update] Query:', updateQuery);

    await client.executeStatement(updateQuery);

    // Get the updated file info
    const selectQuery = `
      SELECT file_name, tags, content_summary, citation_count, gem_inclusion_count, updated_at
      FROM knowledge_base.cohive.file_metadata
      WHERE file_id = '${fileId}'
    `;

    const result = await client.executeStatement(selectQuery);
    await client.close();

    if (result.result.data_array.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const [fileName, updatedTags, summary, citations, gemInclusions, updatedAt] = result.result.data_array[0];

    console.log(`[KB Update] SUCCESS: ${fileName} updated by ${userEmail}`);

    return res.status(200).json({
      success: true,
      fileId,
      fileName,
      updated: {
        tags: updatedTags,
        contentSummary: summary,
        citationCount: citations,
        gemInclusionCount: gemInclusions,
        updatedAt,
      },
      message: `Metadata updated for "${fileName}"`,
    });

  } catch (error) {
    console.error('[KB Update] Error:', error);
    return res.status(500).json({ 
      error: 'Update failed',
      message: error.message 
    });
  }
}
