/**
 * Knowledge Base Upload API - Using REST API instead of SQL
 * 
 * Handles uploading files to Databricks Unity Catalog Volume
 * and inserting metadata using REST API (not SQL package)
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      // File info
      fileName,
      fileContent,      // Base64 encoded file content
      fileSize,
      
      // Metadata
      scope,            // 'general', 'category', or 'brand'
      category,
      brand,
      projectType,
      fileType,         // 'Synthesis' or 'Wisdom'
      tags = [],
      contentSummary,
      
      // For Wisdom files
      insightType,
      inputMethod,
      
      // NEW: Cleaning status
      cleaningStatus = 'cleaned',   // Default to 'cleaned' for backward compatibility
      allowUncleaned = false,       // Allow saving without brand/project
      
      // User info
      userEmail,
      userRole,
      
      // OAuth token
      accessToken,
      workspaceHost,
    } = req.body;

    // Validate required fields
    if (!fileName || !fileContent || !scope || !fileType || !userEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['fileName', 'fileContent', 'scope', 'fileType', 'userEmail']
      });
    }

    if (!accessToken || !workspaceHost) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate scope-specific requirements based on data model
    // NOTE: Brand and category are now OPTIONAL - AI will auto-classify files
    // Users can optionally provide hints, but it's not required
    // The AI processing step will analyze content and assign:
    // - scope: 'general' | 'category' | 'brand'
    // - category: detected category name (if applicable)
    // - brand: detected brand name (if applicable)
    
    // Skip all validation if allowUncleaned is true
    if (!allowUncleaned) {
      // No validation needed - AI will handle classification
      // Users can optionally provide brand/category as hints for AI
    }

    // Generate unique file ID
    const fileId = `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Construct file path based on scope
    let filePath;
    const baseVolumePath = '/Volumes/knowledge_base/cohive/files';
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // For uncleaned data, use a special 'uncleaned' folder
    if (cleaningStatus === 'uncleaned') {
      filePath = `${baseVolumePath}/uncleaned/${sanitizedFileName}`;
    } else {
      switch (scope) {
        case 'general':
          filePath = `${baseVolumePath}/general/${sanitizedFileName}`;
          break;
        case 'category':
          const catFolder = category ? category.toLowerCase().replace(/\s+/g, '-') : 'unknown';
          filePath = `${baseVolumePath}/category/${catFolder}/${sanitizedFileName}`;
          break;
        case 'brand':
          const brandFolder = brand ? brand.toLowerCase().replace(/[^a-z0-9-]/g, '-') : 'unknown';
          filePath = `${baseVolumePath}/brand/${brandFolder}/${sanitizedFileName}`;
          break;
        default:
          return res.status(400).json({ error: 'Invalid scope' });
      }
    }

    // Log the upload action (audit trail)
    console.log(`[KB Upload] User: ${userEmail} (${userRole})`);
    console.log(`[KB Upload] File: ${fileName} (${fileSize} bytes)`);
    console.log(`[KB Upload] Scope: ${scope}, Category: ${category || 'N/A'}, Brand: ${brand || 'N/A'}`);
    console.log(`[KB Upload] Cleaning Status: ${cleaningStatus}`);
    console.log(`[KB Upload] Path: ${filePath}`);

    // Step 1: Upload file to Unity Catalog Volume using Databricks Files API
    const uploadResponse = await fetch(
      `https://${workspaceHost}/api/2.0/fs/files${filePath}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/octet-stream',
        },
        body: Buffer.from(fileContent, 'base64'),
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[KB Upload] File upload failed:', errorText);
      throw new Error(`File upload failed: ${uploadResponse.statusText}`);
    }

    console.log('[KB Upload] File uploaded successfully to volume');

    // Step 2: Insert metadata using REST API (SQL Statement Execution)
    // Data Model:
    // - scope=general: category=NULL, brand=NULL
    // - scope=category: category=[name], brand=NULL
    // - scope=brand: category=[name], brand=[name]
    const warehouseId = '52742af9db71826d'; // Your warehouse ID
    
    // Prepare SQL insert statement
    const tagsArray = tags.length > 0 ? `ARRAY(${tags.map(t => `'${t.replace(/'/g, "''")}'`).join(', ')})` : 'ARRAY()';
    
    // Add 'Uncleaned' tag if cleaningStatus is 'uncleaned'
    const finalTags = cleaningStatus === 'uncleaned' 
      ? (tags.length > 0 ? [...tags, 'Uncleaned'] : ['Uncleaned'])
      : tags;
    const finalTagsArray = finalTags.length > 0 ? `ARRAY(${finalTags.map(t => `'${t.replace(/'/g, "''")}'`).join(', ')})` : 'ARRAY()';
    
    const insertSQL = `
      INSERT INTO knowledge_base.cohive.file_metadata (
        file_id,
        file_path,
        file_name,
        scope,
        category,
        brand,
        project_type,
        file_type,
        is_approved,
        upload_date,
        uploaded_by,
        tags,
        citation_count,
        gem_inclusion_count,
        file_size_bytes,
        content_summary,
        insight_type,
        input_method,
        created_at,
        updated_at
      ) VALUES (
        '${fileId}',
        '${filePath}',
        '${fileName.replace(/'/g, "''")}',
        '${scope}',
        ${category ? `'${category.replace(/'/g, "''")}'` : 'NULL'},
        ${brand ? `'${brand.replace(/'/g, "''")}'` : 'NULL'},
        ${projectType ? `'${projectType.replace(/'/g, "''")}'` : 'NULL'},
        '${fileType}',
        FALSE,
        CURRENT_TIMESTAMP(),
        '${userEmail.replace(/'/g, "''")}',
        ${finalTagsArray},
        0,
        0,
        ${fileSize},
        ${contentSummary ? `'${contentSummary.replace(/'/g, "''")}'` : 'NULL'},
        ${insightType ? `'${insightType.replace(/'/g, "''")}'` : 'NULL'},
        ${inputMethod ? `'${inputMethod.replace(/'/g, "''")}'` : 'NULL'},
        CURRENT_TIMESTAMP(),
        CURRENT_TIMESTAMP()
      )
    `;

    // Execute SQL via REST API
    const sqlResponse = await fetch(
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

    if (!sqlResponse.ok) {
      const errorData = await sqlResponse.json();
      console.error('[KB Upload] SQL execution failed:', errorData);
      throw new Error(`Metadata insert failed: ${errorData.message || sqlResponse.statusText}`);
    }

    const sqlResult = await sqlResponse.json();
    console.log('[KB Upload] Metadata inserted successfully');

    // Return success response
    return res.status(200).json({
      success: true,
      fileId,
      filePath,
      message: 'File uploaded successfully. Pending approval.',
    });

  } catch (error) {
    console.error('[KB Upload] Error:', error);
    return res.status(500).json({ 
      error: 'Upload failed',
      message: error.message 
    });
  }
}