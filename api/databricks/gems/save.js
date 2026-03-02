/**
 * Gems Save API
 * 
 * Saves a selected gem (highlighted text) to the gems table
 * and increments gem_inclusion_count on the source file.
 * 
 * Location: api/databricks/gems/save.js
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      gemText,
      fileId,         // Source file ID (from citation match)
      fileName,       // Source file name
      assessmentType,
      hexId,
      hexLabel,
      brand,
      projectType,
      createdBy,
      accessToken,
      workspaceHost,
    } = req.body;

    if (!gemText || !createdBy) {
      return res.status(400).json({ error: 'gemText and createdBy are required' });
    }

    if (!accessToken || !workspaceHost) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const warehouseId = '52742af9db71826d';
    const gemId = `gem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[Gems Save] Saving gem from file: ${fileName} (${fileId})`);
    console.log(`[Gems Save] Gem text: "${gemText.substring(0, 80)}..."`);

    // Step 1: Insert gem into gems table
    const escapedText = gemText.replace(/'/g, "''");
    const escapedFileName = (fileName || '').replace(/'/g, "''");
    const escapedBrand = (brand || '').replace(/'/g, "''");
    const escapedProjectType = (projectType || '').replace(/'/g, "''");
    const escapedHexId = (hexId || '').replace(/'/g, "''");
    const escapedHexLabel = (hexLabel || '').replace(/'/g, "''");
    const escapedAssessmentType = (assessmentType || '').replace(/'/g, "''");
    const escapedCreatedBy = (createdBy || '').replace(/'/g, "''");

    const insertSQL = `
      INSERT INTO knowledge_base.cohive.gems (
        gem_id,
        gem_text,
        file_id,
        file_name,
        assessment_type,
        hex_id,
        hex_label,
        brand,
        project_type,
        created_by,
        created_at
      ) VALUES (
        '${gemId}',
        '${escapedText}',
        ${fileId ? `'${fileId}'` : 'NULL'},
        ${fileName ? `'${escapedFileName}'` : 'NULL'},
        '${escapedAssessmentType}',
        '${escapedHexId}',
        '${escapedHexLabel}',
        '${escapedBrand}',
        '${escapedProjectType}',
        '${escapedCreatedBy}',
        CURRENT_TIMESTAMP()
      )
    `;

    const insertResponse = await fetch(
      `https://${workspaceHost}/api/2.0/sql/statements`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          warehouse_id: warehouseId,
          statement: insertSQL,
          wait_timeout: '30s',
        }),
      }
    );

    if (!insertResponse.ok) {
      const errorData = await insertResponse.json();
      throw new Error(`Gem insert failed: ${errorData.message || insertResponse.statusText}`);
    }

    console.log(`[Gems Save] Gem inserted: ${gemId}`);

    // Step 2: Increment gem_inclusion_count on source file (if we have a fileId)
    if (fileId) {
      const incrementSQL = `
        UPDATE knowledge_base.cohive.file_metadata
        SET 
          gem_inclusion_count = gem_inclusion_count + 1,
          updated_at = CURRENT_TIMESTAMP()
        WHERE file_id = '${fileId}'
      `;

      const incrementResponse = await fetch(
        `https://${workspaceHost}/api/2.0/sql/statements`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            warehouse_id: warehouseId,
            statement: incrementSQL,
            wait_timeout: '30s',
          }),
        }
      );

      if (!incrementResponse.ok) {
        // Don't fail the whole request if increment fails — gem is already saved
        console.error('[Gems Save] Failed to increment gem_inclusion_count');
      } else {
        console.log(`[Gems Save] Incremented gem_inclusion_count for file: ${fileId}`);
      }
    }

    return res.status(200).json({
      success: true,
      gemId,
      message: 'Gem saved successfully',
    });

  } catch (error) {
    console.error('[Gems Save] Error:', error);
    return res.status(500).json({
      error: 'Gem save failed',
      message: error.message,
    });
  }
}
