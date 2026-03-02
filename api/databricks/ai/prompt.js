/**
 * Databricks AI Prompt Execution API
 * 
 * Executes prompts using Databricks Model Serving endpoints.
 * Supports various foundation models available in Databricks.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      prompt,
      systemPrompt,
      modelEndpoint = 'databricks-claude-sonnet-4-6', // Default model
      maxTokens = 1000,
      temperature = 0.7,
      topP = 0.9,
      conversationHistory = [],
      
      // Knowledge Base context (optional)
      includeKnowledgeBase = false,
      knowledgeBaseQuery,
      
      // User info
      userEmail,
      userRole,
      
      // Auth
      accessToken,
      workspaceHost,
    } = req.body;

    if (!prompt || !userEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['prompt', 'userEmail']
      });
    }

    if (!accessToken || !workspaceHost) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`[AI Prompt] User: ${userEmail} (${userRole})`);
    console.log(`[AI Prompt] Model: ${modelEndpoint}`);
    console.log(`[AI Prompt] Prompt: ${prompt.substring(0, 100)}...`);

    let contextualPrompt = prompt;

    // Step 1: Optionally retrieve relevant Knowledge Base files
    if (includeKnowledgeBase && knowledgeBaseQuery) {
      console.log(`[AI Prompt] Fetching Knowledge Base context for: ${knowledgeBaseQuery}`);
      
      const warehouseId = '52742af9db71826d';
      
      // Query relevant files from Knowledge Base
      const kbSearchSQL = `
        SELECT file_name, content_summary, file_path, citation_count
        FROM knowledge_base.cohive.file_metadata
        WHERE is_approved = TRUE
          AND (
            file_name LIKE '%${knowledgeBaseQuery.replace(/'/g, "''")}%'
            OR content_summary LIKE '%${knowledgeBaseQuery.replace(/'/g, "''")}%'
            OR ARRAY_CONTAINS(tags, '${knowledgeBaseQuery.replace(/'/g, "''")}')
          )
        ORDER BY citation_count DESC
        LIMIT 5
      `;

      const kbResponse = await fetch(
        `https://${workspaceHost}/api/2.0/sql/statements`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            warehouse_id: warehouseId,
            statement: kbSearchSQL,
            wait_timeout: '30s',
          }),
        }
      );

      if (kbResponse.ok) {
        const kbResult = await kbResponse.json();
        
        if (kbResult.result && kbResult.result.data_array && kbResult.result.data_array.length > 0) {
          const contextFiles = kbResult.result.data_array.map(row => ({
            fileName: row[0],
            summary: row[1],
          }));
          
          const contextText = contextFiles.map(f => 
            `Document: ${f.fileName}\nSummary: ${f.summary}`
          ).join('\n\n');
          
          contextualPrompt = `Context from Knowledge Base:\n${contextText}\n\nUser Query: ${prompt}`;
          
          console.log(`[AI Prompt] Added context from ${contextFiles.length} Knowledge Base files`);
        }
      }
    }

    // Step 2: Build messages array for the model
    const messages = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Add conversation history if provided
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    // Add current prompt
    messages.push({
      role: 'user',
      content: contextualPrompt,
    });

    // Step 3: Call Databricks Model Serving endpoint
    const modelPayload = {
      model: modelEndpoint,
      messages: messages,
      max_tokens: maxTokens,
    };

    console.log(`[AI Prompt] Calling model endpoint: ${modelEndpoint}`);

    const modelResponse = await fetch(
      `https://${workspaceHost}/serving-endpoints/${modelEndpoint}/invocations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelPayload),
      }
    );

    if (!modelResponse.ok) {
      const errorData = await modelResponse.json().catch(() => ({}));
      console.error('[AI Prompt] Model invocation failed:', errorData);
      throw new Error(`Model invocation failed: ${errorData.message || modelResponse.statusText}`);
    }

    const modelResult = await modelResponse.json();

    // Extract the response
    let responseText = '';
    let usage = {};

    if (modelResult.choices && modelResult.choices.length > 0) {
      responseText = modelResult.choices[0].message?.content || modelResult.choices[0].text || '';
      usage = modelResult.usage || {};
    } else if (modelResult.predictions && modelResult.predictions.length > 0) {
      responseText = modelResult.predictions[0];
    } else {
      throw new Error('Unexpected model response format');
    }

    console.log(`[AI Prompt] SUCCESS - Generated ${responseText.length} characters`);
    console.log(`[AI Prompt] Usage: ${JSON.stringify(usage)}`);

    return res.status(200).json({
      success: true,
      response: responseText,
      model: modelEndpoint,
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
      },
      metadata: {
        kbContextUsed: includeKnowledgeBase,
        conversationLength: conversationHistory.length,
      },
    });

  } catch (error) {
    console.error('[AI Prompt] Error:', error);
    return res.status(500).json({ 
      error: 'Prompt execution failed',
      message: error.message 
    });
  }
}