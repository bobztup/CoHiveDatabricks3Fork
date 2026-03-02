export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      scope, category, brand, fileType, isApproved,
      projectType, uploadedBy, searchTerm,
      includeGeneral, includeCategory,
      limit = 50, offset = 0,
      sortBy = 'upload_date', sortOrder = 'DESC',
      accessToken, workspaceHost,
    } = req.query;

    if (!accessToken || !workspaceHost) {
      console.log('[KB List] Missing auth:', { hasToken: !!accessToken, hasHost: !!workspaceHost });
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('[KB List] Query params:', { scope, category, brand, fileType, isApproved, projectType, uploadedBy, searchTerm });

    // Build WHERE clause
    const conditions = [];
    if (scope) conditions.push(`scope = '${scope}'`);
    if (category) conditions.push(`category = '${category}'`);
    if (brand) conditions.push(`brand = '${brand}'`);
    if (fileType) conditions.push(`file_type = '${fileType}'`);
    if (isApproved !== undefined && isApproved !== '') {
      if (isApproved === 'true') {
        conditions.push(`is_approved = TRUE`);
      } else if (isApproved === 'false') {
        // Include both FALSE and NULL for unapproved files
        conditions.push(`(is_approved = FALSE OR is_approved IS NULL)`);
      }
      // If isApproved is undefined/empty, no filter = return all files
    }
    if (projectType) conditions.push(`project_type = '${projectType}'`);
    if (uploadedBy) conditions.push(`uploaded_by = '${uploadedBy}'`);
    if (searchTerm) {
      const s = searchTerm.replace(/'/g, "''");
      conditions.push(`(file_name LIKE '%${s}%' OR content_summary LIKE '%${s}%')`);
    }

    if (includeGeneral === 'true' || includeCategory === 'true') {
      const scopeConditions = [];
      if (includeGeneral === 'true') scopeConditions.push("scope = 'general'");
      if (includeCategory === 'true' && category) scopeConditions.push(`(scope = 'category' AND category = '${category}')`);
      if (brand) scopeConditions.push(`(scope = 'brand' AND brand = '${brand}')`);
      if (scopeConditions.length > 0) {
        const other = conditions.filter(c => !c.startsWith('scope ='));
        conditions.length = 0;
        conditions.push(...other);
        conditions.push(`(${scopeConditions.join(' OR ')})`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const validSortColumns = ['upload_date', 'citation_count', 'file_name', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'upload_date';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const selectQuery = `
      SELECT file_id, file_path, file_name, scope, category, brand, project_type,
        file_type, is_approved, upload_date, uploaded_by, approver_email, approval_date,
        approval_notes, tags, citation_count, gem_inclusion_count, file_size_bytes,
        content_summary, insight_type, input_method, created_at, updated_at
      FROM knowledge_base.cohive.file_metadata
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT ${limit} OFFSET ${offset}
    `;

    console.log('[KB List] Executing SQL query:', selectQuery);

    const sqlResponse = await fetch(
      `https://${workspaceHost}/api/2.0/sql/statements`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          warehouse_id: '52742af9db71826d',
          statement: selectQuery,
          wait_timeout: '30s',
        }),
      }
    );

    if (!sqlResponse.ok) {
      const errorData = await sqlResponse.json();
      throw new Error(`SQL failed: ${errorData.message || sqlResponse.statusText}`);
    }

    const sqlResult = await sqlResponse.json();
    const rows = sqlResult.result?.data_array || [];

    const files = rows.map(row => ({
      fileId: row[0],
      filePath: row[1],
      fileName: row[2],
      scope: row[3],
      category: row[4],
      brand: row[5],
      projectType: row[6],
      fileType: row[7],
      // Explicitly parse boolean - Databricks returns true/false/null
      isApproved: row[8] === true || row[8] === 'true' ? true : 
                  row[8] === null ? null : false,
      uploadDate: row[9],
      uploadedBy: row[10],
      approverEmail: row[11],
      approvalDate: row[12],
      approvalNotes: row[13],
      tags: row[14] || [],
      citationCount: row[15] || 0,
      gemInclusionCount: row[16] || 0,
      fileSizeBytes: row[17] || 0,
      contentSummary: row[18] || null,
      insightType: row[19],
      inputMethod: row[20],
      createdAt: row[21],
      updatedAt: row[22],
    }));

    console.log(`[KB List] Found ${files.length} files`);
    return res.status(200).json({ 
      success: true, 
      files, 
      pagination: { 
        total: files.length, 
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      } 
    });

  } catch (error) {
    console.error('[KB List] Error:', error);
    return res.status(500).json({ error: 'Query failed', message: error.message });
  }
}