/**
 * Databricks AI Agent API
 * 
 * Executes AI agents with function calling capabilities.
 * Can interact with Knowledge Base, execute SQL, and call custom tools.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      task,
      systemPrompt = 'You are a helpful AI assistant with access to a Knowledge Base of brand and consumer insights.',
      modelEndpoint = 'databricks-claude-sonnet-4-6',
      maxIterations = 5,
      
      // Available tools/functions
      enableKnowledgeBase = true,
      enableSQLQuery = true,
      enableWebSearch = false,
      
      // Context
      brand,
      category,
      
      // User info
      userEmail,
      userRole,
      
      // Auth
      accessToken,
      workspaceHost,
    } = req.body;

    if (!task || !userEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['task', 'userEmail']
      });
    }

    if (!accessToken || !workspaceHost) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`[AI Agent] User: ${userEmail} (${userRole})`);
    console.log(`[AI Agent] Task: ${task}`);
    console.log(`[AI Agent] Model: ${modelEndpoint}`);
    console.log(`[AI Agent] Tools enabled: KB=${enableKnowledgeBase}, SQL=${enableSQLQuery}, Web=${enableWebSearch}`);

    const warehouseId = '52742af9db71826d';

    // Define available functions/tools
    const tools = [];

    if (enableKnowledgeBase) {
      tools.push({
        type: 'function',
        function: {
          name: 'search_knowledge_base',
          description: 'Search the Knowledge Base for relevant documents about brands, categories, and consumer insights',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query or keywords',
              },
              brand: {
                type: 'string',
                description: 'Filter by brand name (optional)',
              },
              category: {
                type: 'string',
                description: 'Filter by category (optional)',
              },
              limit: {
                type: 'integer',
                description: 'Maximum number of results (default: 5)',
              },
            },
            required: ['query'],
          },
        },
      });
    }

    if (enableSQLQuery) {
      tools.push({
        type: 'function',
        function: {
          name: 'execute_sql',
          description: 'Execute a SQL query against the Knowledge Base metadata table. Use for analytics, aggregations, and complex queries.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'SQL SELECT query to execute',
              },
            },
            required: ['query'],
          },
        },
      });
    }

    // Agent loop
    const conversationHistory = [];
    let iterations = 0;
    let finalResponse = null;

    // Add system message
    conversationHistory.push({
      role: 'system',
      content: systemPrompt,
    });

    // Add user task
    conversationHistory.push({
      role: 'user',
      content: task,
    });

    while (iterations < maxIterations && !finalResponse) {
      iterations++;
      console.log(`[AI Agent] Iteration ${iterations}/${maxIterations}`);

      // Call model with function calling
      const modelPayload = {
        model: modelEndpoint,
        messages: conversationHistory,
        tools: tools,
        tool_choice: 'auto',
        max_tokens: 2000,
      };

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
        throw new Error(`Model invocation failed: ${errorData.message || modelResponse.statusText}`);
      }

      const modelResult = await modelResponse.json();
      const choice = modelResult.choices[0];
      const message = choice.message;

      // Add assistant response to history
      conversationHistory.push(message);

      // Check if model wants to call a function
      if (choice.finish_reason === 'tool_calls' && message.tool_calls) {
        console.log(`[AI Agent] Model requested ${message.tool_calls.length} function call(s)`);

        // Execute each function call
        for (const toolCall of message.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          console.log(`[AI Agent] Executing: ${functionName}(${JSON.stringify(functionArgs)})`);

          let functionResult = null;

          // Execute the requested function
          if (functionName === 'search_knowledge_base') {
            functionResult = await searchKnowledgeBase(
              functionArgs,
              accessToken,
              workspaceHost,
              warehouseId
            );
          } else if (functionName === 'execute_sql') {
            functionResult = await executeSQLQuery(
              functionArgs,
              accessToken,
              workspaceHost,
              warehouseId
            );
          }

          // Add function result to conversation
          conversationHistory.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult),
          });

          console.log(`[AI Agent] Function result: ${JSON.stringify(functionResult).substring(0, 200)}...`);
        }
      } else {
        // Model provided final answer
        finalResponse = message.content;
        console.log(`[AI Agent] Final answer received (${finalResponse.length} chars)`);
      }
    }

    if (!finalResponse) {
      finalResponse = 'Agent reached maximum iterations without completing the task.';
    }

    console.log(`[AI Agent] SUCCESS - Completed in ${iterations} iterations`);

    return res.status(200).json({
      success: true,
      response: finalResponse,
      iterations,
      model: modelEndpoint,
      toolsUsed: conversationHistory.filter(m => m.role === 'tool').length,
    });

  } catch (error) {
    console.error('[AI Agent] Error:', error);
    return res.status(500).json({ 
      error: 'Agent execution failed',
      message: error.message 
    });
  }
}

/**
 * Search Knowledge Base function
 */
async function searchKnowledgeBase(args, accessToken, workspaceHost, warehouseId) {
  const { query, brand, category, limit = 5 } = args;

  const conditions = ['is_approved = TRUE'];
  
  if (brand) conditions.push(`brand = '${brand.replace(/'/g, "''")}'`);
  if (category) conditions.push(`category = '${category.replace(/'/g, "''")}'`);
  
  conditions.push(`(
    file_name LIKE '%${query.replace(/'/g, "''")}%'
    OR content_summary LIKE '%${query.replace(/'/g, "''")}%'
  )`);

  const searchSQL = `
    SELECT file_id, file_name, content_summary, tags, citation_count, scope, brand, category
    FROM knowledge_base.cohive.file_metadata
    WHERE ${conditions.join(' AND ')}
    ORDER BY citation_count DESC
    LIMIT ${limit}
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
        warehouse_id: warehouseId,
        statement: searchSQL,
        wait_timeout: '30s',
      }),
    }
  );

  if (!response.ok) {
    return { error: 'Knowledge Base search failed' };
  }

  const result = await response.json();

  if (!result.result || !result.result.data_array) {
    return { files: [] };
  }

  const files = result.result.data_array.map(row => ({
    fileId: row[0],
    fileName: row[1],
    summary: row[2],
    tags: row[3],
    citationCount: row[4],
    scope: row[5],
    brand: row[6],
    category: row[7],
  }));

  return { files, count: files.length };
}

/**
 * Execute SQL query function
 */
async function executeSQLQuery(args, accessToken, workspaceHost, warehouseId) {
  const { query } = args;

  // Safety check - only allow SELECT queries
  if (!query.trim().toUpperCase().startsWith('SELECT')) {
    return { error: 'Only SELECT queries are allowed' };
  }

  const response = await fetch(
    `https://${workspaceHost}/api/2.0/sql/statements`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        warehouse_id: warehouseId,
        statement: query,
        wait_timeout: '30s',
      }),
    }
  );

  if (!response.ok) {
    return { error: 'SQL execution failed' };
  }

  const result = await response.json();

  if (!result.result || !result.result.data_array) {
    return { rows: [], columns: [] };
  }

  return {
    rows: result.result.data_array,
    columns: result.result.manifest?.schema?.columns || [],
    rowCount: result.result.data_array.length,
  };
}