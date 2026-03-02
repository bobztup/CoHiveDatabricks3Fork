/**
 * Knowledge Base Process API
 * 
 * Processes uploaded files by:
 * 1. Reading file content (via read.js)
 * 2. Sending to Claude AI for summary and tags generation
 * 3. Updating metadata table with results
 * 
 * Location: /api/databricks/knowledge-base/process.js
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileId, accessToken, workspaceHost } = req.body;

    if (!fileId || !accessToken || !workspaceHost) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['fileId', 'accessToken', 'workspaceHost']
      });
    }

    console.log(`[KB Process] Starting processing for fileId: ${fileId}`);

    // Step 1: Read file content using the read API
    const readResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/databricks/knowledge-base/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        accessToken,
        workspaceHost,
      }),
    });

    if (!readResponse.ok) {
      const errorData = await readResponse.json();
      throw new Error(`File read failed: ${errorData.error || readResponse.statusText}`);
    }

    const fileData = await readResponse.json();
    const { fileName, content, extractionMethod } = fileData;

    console.log(`[KB Process] File content retrieved: ${fileName} (${extractionMethod})`);

    // Step 2: Generate AI summary and tags using Claude
    const aiPrompt = `Analyze the following document and provide:
1. A concise 2-3 sentence summary of the key content and insights
2. 3-5 relevant tags (comma-separated, lowercase, no hashtags)

Document Title: ${fileName}
Content:
${content.substring(0, 5000)}${content.length > 5000 ? '\n\n[Content truncated for processing...]' : ''}

Respond in this exact format:
SUMMARY: [your summary here]
TAGS: [tag1, tag2, tag3, tag4, tag5]`;

    console.log(`[KB Process] Sending to AI for analysis...`);

    // Call Databricks AI API using workspace serving endpoint (Claude Sonnet 4.6)
    const aiResponse = await fetch(
      `https://${workspaceHost}/serving-endpoints/databricks-claude-sonnet-4-6/invocations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'databricks-claude-sonnet-4-6',
          messages: [
            {
              role: 'user',
              content: aiPrompt,
            },
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json();
      console.error('[KB Process] AI API error:', errorData);
      throw new Error(`AI processing failed: ${errorData.message || aiResponse.statusText}`);
    }

    const aiResult = await aiResponse.json();
    const aiContent = aiResult.choices?.[0]?.message?.content || '';

    console.log(`[KB Process] AI response received:`, aiContent);

    // Step 3: Parse AI response
    let summary = 'AI-generated summary not available';
    let tags = '';

    const summaryMatch = aiContent.match(/SUMMARY:\s*(.+?)(?=\nTAGS:|$)/s);
    const tagsMatch = aiContent.match(/TAGS:\s*(.+?)$/s);

    if (summaryMatch) {
      summary = summaryMatch[1].trim();
    }
    if (tagsMatch) {
      tags = tagsMatch[1].trim();
    }

    console.log(`[KB Process] Parsed - Summary: "${summary.substring(0, 50)}..." Tags: "${tags}"`);

    // Step 4: Update metadata table with processing results
    const updateQuery = `
      UPDATE knowledge_base.cohive.file_metadata
      SET 
        content_summary = '${summary.replace(/'/g, "''")}',
        tags = '${tags.replace(/'/g, "''")}',
        cleaning_status = 'processed',
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
          warehouse_id: '52742af9db71826d',
          statement: updateQuery,
          wait_timeout: '30s',
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(`Update failed: ${errorData.message || updateResponse.statusText}`);
    }

    console.log(`[KB Process] ✅ Successfully processed file: ${fileName}`);

    return res.status(200).json({
      success: true,
      fileId,
      fileName,
      summary,
      tags,
      cleaningStatus: 'processed',
      message: `File "${fileName}" processed successfully`,
    });

  } catch (error) {
    console.error('[KB Process] Error:', error);
    return res.status(500).json({ 
      error: 'Processing failed',
      message: error.message 
    });
  }
}
