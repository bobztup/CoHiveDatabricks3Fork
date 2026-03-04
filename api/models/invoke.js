/**
 * Unified Model Invocation API
 *
 * BJS: Routes AI requests to the correct provider based on the modelId in the
 * request body. Mirrors the Python cohive.py pattern where Persona() accepts
 * any model class (Ollama_model, Anthropic_Model, GPT_Model) and calls
 * model.infer(system, user) regardless of which provider is underneath.
 *
 * Supported providers:
 *   databricks  → Databricks Model Serving (existing pattern)
 *   anthropic   → Anthropic Messages API (direct, requires ANTHROPIC_API_KEY)
 *   openai      → OpenAI Chat Completions (direct, requires OPENAI_API_KEY)
 *   ollama      → Local Ollama REST API (requires OLLAMA_BASE_URL)
 *
 * Request body:
 *   modelId       string    — ID from AVAILABLE_MODELS in modelConfig.ts
 *   messages      array     — [{role, content}] conversation history
 *   systemPrompt  string    — system prompt (omitted for models that don't support it)
 *   maxTokens     number    — default 3000
 *   temperature   number    — default 0.8
 *   accessToken   string    — Databricks OAuth token (required for databricks provider)
 *   workspaceHost string    — Databricks workspace host (required for databricks provider)
 *
 * Response:
 *   { content: string, provider: string, modelId: string, usage?: object }
 *
 * Location: api/models/invoke.js
 */

// BJS: Model registry — must stay in sync with AVAILABLE_MODELS in modelConfig.ts.
// Defines provider routing and the model name/endpoint for each model ID.
const MODEL_REGISTRY = {
  // Databricks-hosted
  'databricks-claude-sonnet-4-6':               { provider: 'databricks', endpoint: 'databricks-claude-sonnet-4-6' },
  'databricks-meta-llama-3-1-70b-instruct':     { provider: 'databricks', endpoint: 'databricks-meta-llama-3-1-70b-instruct' },
  'databricks-meta-llama-3-1-405b-instruct':    { provider: 'databricks', endpoint: 'databricks-meta-llama-3-1-405b-instruct' },
  'databricks-mixtral-8x7b-instruct':           { provider: 'databricks', endpoint: 'databricks-mixtral-8x7b-instruct' },
  'databricks-dbrx-instruct':                   { provider: 'databricks', endpoint: 'databricks-dbrx-instruct' },
  // Anthropic direct
  'anthropic-claude-opus-4-6':                  { provider: 'anthropic',  modelName: 'claude-opus-4-6' },
  'anthropic-claude-sonnet-4-6':                { provider: 'anthropic',  modelName: 'claude-sonnet-4-6' },
  'anthropic-claude-haiku-4-5':                 { provider: 'anthropic',  modelName: 'claude-haiku-4-5-20251001' },
  // OpenAI direct
  'openai-gpt-4o':                              { provider: 'openai',     modelName: 'gpt-4o' },
  'openai-gpt-4o-mini':                         { provider: 'openai',     modelName: 'gpt-4o-mini' },
  'openai-o1':                                  { provider: 'openai',     modelName: 'o1', noSystem: true },
  // Ollama local
  'ollama-llama3':                              { provider: 'ollama',     modelName: 'llama3' },
  'ollama-mistral':                             { provider: 'ollama',     modelName: 'mistral' },
  'ollama-custom':                              { provider: 'ollama',     modelName: null }, // modelName comes from request
};

const DEFAULT_MODEL_ID = 'databricks-claude-sonnet-4-6';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    modelId = DEFAULT_MODEL_ID,
    messages = [],
    systemPrompt,
    maxTokens = 3000,
    temperature = 0.8,
    // Databricks-specific
    accessToken,
    workspaceHost,
    // Ollama custom model name override
    ollamaModelName,
  } = req.body;

  const modelDef = MODEL_REGISTRY[modelId];
  if (!modelDef) {
    return res.status(400).json({ error: `Unknown modelId: ${modelId}` });
  }

  console.log(`[ModelInvoke] provider=${modelDef.provider} modelId=${modelId}`);

  try {
    let content = '';
    let usage = null;

    switch (modelDef.provider) {

      // ── Databricks Model Serving ─────────────────────────────────────────
      // BJS: Same pattern as existing assessment/run.js. Auth via Databricks OAuth token.
      case 'databricks': {
        if (!accessToken || !workspaceHost) {
          return res.status(401).json({ error: 'Databricks accessToken and workspaceHost required' });
        }

        const dbMessages = systemPrompt
          ? [{ role: 'system', content: systemPrompt }, ...messages]
          : messages;

        const dbResp = await fetch(
          `https://${workspaceHost}/serving-endpoints/${modelDef.endpoint}/invocations`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages: dbMessages, max_tokens: maxTokens, temperature }),
          }
        );

        if (!dbResp.ok) {
          const err = await dbResp.json().catch(() => ({}));
          throw new Error(`Databricks invocation failed: ${err.message || dbResp.statusText}`);
        }

        const dbResult = await dbResp.json();
        content = dbResult.choices?.[0]?.message?.content || '';
        usage = dbResult.usage || null;
        break;
      }

      // ── Anthropic direct API ─────────────────────────────────────────────
      // BJS: Maps to Python's Anthropic_Model.infer(). Uses ANTHROPIC_API_KEY server env var.
      case 'anthropic': {
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicKey) {
          return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' });
        }

        const anthropicBody = {
          model: modelDef.modelName,
          max_tokens: maxTokens,
          messages,
        };
        if (systemPrompt) {
          anthropicBody.system = systemPrompt;
        }

        const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(anthropicBody),
        });

        if (!anthropicResp.ok) {
          const err = await anthropicResp.json().catch(() => ({}));
          throw new Error(`Anthropic API error: ${err.error?.message || anthropicResp.statusText}`);
        }

        const anthropicResult = await anthropicResp.json();
        content = anthropicResult.content?.[0]?.text || '';
        usage = anthropicResult.usage || null;
        break;
      }

      // ── OpenAI direct API ────────────────────────────────────────────────
      // BJS: Maps to Python's GPT_Model.infer(). Uses OPENAI_API_KEY server env var.
      case 'openai': {
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
          return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server' });
        }

        // BJS: o1 does not support system prompts — inject as first user message instead.
        let openaiMessages = [...messages];
        if (systemPrompt && !modelDef.noSystem) {
          openaiMessages = [{ role: 'system', content: systemPrompt }, ...openaiMessages];
        } else if (systemPrompt && modelDef.noSystem) {
          openaiMessages = [{ role: 'user', content: `Context: ${systemPrompt}` }, ...openaiMessages];
        }

        const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelDef.modelName,
            messages: openaiMessages,
            max_tokens: maxTokens,
            temperature: modelDef.noSystem ? undefined : temperature, // o1 doesn't support temperature
          }),
        });

        if (!openaiResp.ok) {
          const err = await openaiResp.json().catch(() => ({}));
          throw new Error(`OpenAI API error: ${err.error?.message || openaiResp.statusText}`);
        }

        const openaiResult = await openaiResp.json();
        content = openaiResult.choices?.[0]?.message?.content || '';
        usage = openaiResult.usage || null;
        break;
      }

      // ── Ollama (local) ───────────────────────────────────────────────────
      // BJS: Maps to Python's Ollama_model.infer(). Requires OLLAMA_BASE_URL env var
      // (default: http://localhost:11434). No API key required.
      case 'ollama': {
        const ollamaBase = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const resolvedModel = ollamaModelName || modelDef.modelName;

        if (!resolvedModel || resolvedModel === 'custom') {
          return res.status(400).json({ error: 'ollamaModelName is required for custom Ollama models' });
        }

        // BJS: Ollama uses /api/chat with OpenAI-compatible message format.
        const ollamaMessages = systemPrompt
          ? [{ role: 'system', content: systemPrompt }, ...messages]
          : messages;

        const ollamaResp = await fetch(`${ollamaBase}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: resolvedModel,
            messages: ollamaMessages,
            stream: false,
            options: { temperature, num_predict: maxTokens },
          }),
        });

        if (!ollamaResp.ok) {
          const err = await ollamaResp.text().catch(() => ollamaResp.statusText);
          throw new Error(`Ollama error: ${err}`);
        }

        const ollamaResult = await ollamaResp.json();
        content = ollamaResult.message?.content || '';
        break;
      }

      default:
        return res.status(400).json({ error: `Unsupported provider: ${modelDef.provider}` });
    }

    return res.status(200).json({
      content,
      provider: modelDef.provider,
      modelId,
      ...(usage && { usage }),
    });

  } catch (error) {
    console.error(`[ModelInvoke] Error (${modelDef.provider}):`, error.message);
    return res.status(500).json({
      error: 'Model invocation failed',
      message: error.message,
      provider: modelDef.provider,
      modelId,
    });
  }
}
