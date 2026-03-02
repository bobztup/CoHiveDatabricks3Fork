/**
 * Knowledge Base File Classification API
 * 
 * Uses AI to automatically classify uploaded files and assign:
 * - scope: 'general' | 'category' | 'brand'
 * - category: detected category name (if applicable)
 * - brand: detected brand name (if applicable)
 * - tags: relevant keywords and topics
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      fileId,
      fileName,
      fileContent,      // Base64 or text content
      contentSummary,   // Optional: existing summary
      userHints,        // Optional: user-provided hints { brand?, category?, scope? }
      accessToken,
      workspaceHost,
    } = req.body;

    if (!fileId || !fileName || !fileContent) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['fileId', 'fileName', 'fileContent']
      });
    }

    if (!accessToken || !workspaceHost) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`[KB Classify] Classifying file: ${fileName} (ID: ${fileId})`);
    console.log(`[KB Classify] User hints:`, userHints);

    // Prepare AI prompt for classification
    const classificationPrompt = `
You are a knowledge management AI assistant. Analyze the following content and classify it:

FILE: ${fileName}
${contentSummary ? `SUMMARY: ${contentSummary}` : ''}
${userHints?.brand ? `USER HINT - Brand: ${userHints.brand}` : ''}
${userHints?.category ? `USER HINT - Category: ${userHints.category}` : ''}

CONTENT PREVIEW:
${typeof fileContent === 'string' ? fileContent.substring(0, 5000) : '[Binary file]'}

---

TASK: Classify this content into one of three scopes:

1. GENERAL: Content that applies to ALL brands and categories
   - Industry research, market trends, general methodologies
   - No specific brand or category mentioned
   
2. CATEGORY: Content that applies to a specific product category but ALL brands
   - Category: Running Shoes, Basketball, Athletic Apparel, etc.
   - Mentions category but not specific to one brand
   
3. BRAND: Content specific to ONE brand
   - Brand: Nike, Adidas, Puma, etc.
   - Brand-specific research, product information, or insights

AVAILABLE CATEGORIES:
- Running Shoes
- Basketball
- Athletic Apparel
- Lifestyle Footwear
- Training & Gym
- Soccer/Football
- Tennis
- Golf
- Outdoor & Hiking
- Kids & Youth

AVAILABLE BRANDS:
- Nike, Adidas, Puma, New Balance, Under Armour, Brooks, Asics, Saucony, Hoka
- Lululemon, Reebok, Vans, Converse, Merrell, Columbia, Salomon
- FootJoy, Callaway

RESPOND IN THIS EXACT JSON FORMAT:
{
  "scope": "general|category|brand",
  "category": "category name or null",
  "brand": "brand name or null",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "suggestedTags": ["tag1", "tag2", "tag3"]
}

RULES:
- If scope is "general", both category and brand must be null
- If scope is "category", category must have a value, brand must be null
- If scope is "brand", both category and brand must have values
- Use exact category/brand names from the lists above
- Be conservative: if unsure, classify as "general"
`;

    // Call Databricks AI/SQL for classification
    const warehouseId = '52742af9db71826d';
    
    // Use AI_QUERY or similar Databricks AI function
    const classificationSQL = `
      SELECT ai_query(
        'databricks-meta-llama-3-1-70b-instruct',
        '${classificationPrompt.replace(/'/g, "''")}'
      ) as classification
    `;

    console.log('[KB Classify] Executing AI classification...');

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
          statement: classificationSQL,
          wait_timeout: '60s',
        }),
      }
    );

    if (!sqlResponse.ok) {
      const errorData = await sqlResponse.json();
      console.error('[KB Classify] AI query failed:', errorData);
      throw new Error(`AI classification failed: ${errorData.message || sqlResponse.statusText}`);
    }

    const sqlResult = await sqlResponse.json();
    const aiResponse = sqlResult.result?.data_array?.[0]?.[0];

    console.log('[KB Classify] AI Response:', aiResponse);

    // Parse AI response (it should be JSON)
    let classification;
    try {
      classification = JSON.parse(aiResponse);
    } catch (e) {
      console.error('[KB Classify] Failed to parse AI response:', e);
      // Fallback to general if parsing fails
      classification = {
        scope: userHints?.scope || 'general',
        category: userHints?.category || null,
        brand: userHints?.brand || null,
        confidence: 0.5,
        reasoning: 'Auto-classified based on user hints',
        suggestedTags: []
      };
    }

    // Validate classification
    if (classification.scope === 'general') {
      classification.category = null;
      classification.brand = null;
    } else if (classification.scope === 'category') {
      classification.brand = null;
      if (!classification.category) {
        classification.category = userHints?.category || 'Uncategorized';
      }
    } else if (classification.scope === 'brand') {
      if (!classification.brand) {
        classification.brand = userHints?.brand || 'Unknown Brand';
      }
      if (!classification.category) {
        classification.category = userHints?.category || 'General';
      }
    }

    // Update file metadata in database
    const updateSQL = `
      UPDATE knowledge_base.cohive.file_metadata
      SET 
        scope = '${classification.scope}',
        category = ${classification.category ? `'${classification.category.replace(/'/g, "''")}'` : 'NULL'},
        brand = ${classification.brand ? `'${classification.brand.replace(/'/g, "''")}'` : 'NULL'},
        tags = ARRAY_UNION(tags, ARRAY(${classification.suggestedTags.map(t => `'${t.replace(/'/g, "''")}'`).join(', ')})),
        updated_at = CURRENT_TIMESTAMP()
      WHERE file_id = '${fileId}'
    `;

    console.log('[KB Classify] Updating file metadata...');

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
      console.error('[KB Classify] Update failed:', errorData);
      // Don't throw - classification still succeeded
    }

    console.log('[KB Classify] Classification complete:', classification);

    return res.status(200).json({
      success: true,
      fileId,
      classification: {
        scope: classification.scope,
        category: classification.category,
        brand: classification.brand,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        tags: classification.suggestedTags
      }
    });

  } catch (error) {
    console.error('[KB Classify] Error:', error);
    return res.status(500).json({ 
      error: 'Classification failed',
      message: error.message 
    });
  }
}
