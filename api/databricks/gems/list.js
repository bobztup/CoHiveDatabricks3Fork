/**
 * Gems List API
 * 
 * Returns saved gems, optionally filtered by brand/hex.
 * 
 * Location: api/databricks/gems/list.js
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      brand,
      hexId,
      createdBy,
      limit = 100,
      offset = 0,
      accessToken,
      workspaceHost,
    } = req.query;

    if (!accessToken || !workspaceHost) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const conditions = [];
    if (brand) conditions.push(`brand = '${brand.replace(/'/g, "''")}'`);
    if (hexId) conditions.push(`hex_id = '${hexId.replace(/'/g, "''")}'`);
    if (createdBy) conditions.push(`created_by = '${createdBy.replace(/'/g, "''")}'`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const selectSQL = `
      SELECT 
        gem_id, gem_text, file_id, file_name, assessment_type,
        hex_id, hex_label, brand, project_type, created_by, created_at
      FROM knowledge_base.cohive.gems
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const response = await fetch(
      `https://${workspaceHost}/api/2.0/sql/statements`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          warehouse_id: '52742af9db71826d',
          statement: selectSQL,
          wait_timeout: '30s',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Query failed: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    const rows = result.result?.data_array || [];

    const gems = rows.map(row => ({
      gemId: row[0],
      gemText: row[1],
      fileId: row[2],
      fileName: row[3],
      assessmentType: row[4],
      hexId: row[5],
      hexLabel: row[6],
      brand: row[7],
      projectType: row[8],
      createdBy: row[9],
      createdAt: row[10],
    }));

    return res.status(200).json({ success: true, gems });

  } catch (error) {
    console.error('[Gems List] Error:', error);
    return res.status(500).json({ error: 'Query failed', message: error.message });
  }
}