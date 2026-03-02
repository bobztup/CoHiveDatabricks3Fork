/**
 * Databricks AI and Agent API Integration
 * 
 * Frontend utility functions for executing prompts and running AI agents.
 * 
 * Location: utils/databricksAI.ts
 */

import { getValidSession } from './databricksAuth';

export interface AIPromptParams {
  prompt: string;
  systemPrompt?: string;
  modelEndpoint?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  conversationHistory?: Array<{ role: string; content: string }>;
  includeKnowledgeBase?: boolean;
  knowledgeBaseQuery?: string;
  userEmail: string;
  userRole: string;
}

export interface AIAgentParams {
  task: string;
  systemPrompt?: string;
  modelEndpoint?: string;
  maxIterations?: number;
  enableKnowledgeBase?: boolean;
  enableSQLQuery?: boolean;
  enableWebSearch?: boolean;
  brand?: string;
  category?: string;
  userEmail: string;
  userRole: string;
}

export interface AIPromptResponse {
  success: boolean;
  response: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: {
    kbContextUsed: boolean;
    conversationLength: number;
  };
  error?: string;
}

export interface AIAgentResponse {
  success: boolean;
  response: string;
  iterations: number;
  model: string;
  toolsUsed: number;
  error?: string;
}

/**
 * Get auth session for API calls
 */
async function getAuthData() {
  const session = await getValidSession();
  if (!session) {
    throw new Error('Not authenticated. Please sign in to Databricks.');
  }
  return {
    accessToken: session.accessToken,
    workspaceHost: session.workspaceHost,
  };
}

/**
 * Execute an AI prompt using Databricks Model Serving
 */
export async function executeAIPrompt(params: AIPromptParams): Promise<AIPromptResponse> {
  try {
    console.log('🤖 Executing AI Prompt:', params.prompt.substring(0, 100) + '...');
    
    const auth = await getAuthData();
    
    const response = await fetch('/api/databricks/ai/prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        ...auth,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `AI prompt failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ AI Response received:', result.response.substring(0, 100) + '...');
    console.log('📊 Token usage:', result.usage);
    
    return result;
    
  } catch (error) {
    console.error('❌ AI Prompt error:', error);
    return { 
      success: false, 
      response: '',
      model: '',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      metadata: { kbContextUsed: false, conversationLength: 0 },
      error: error instanceof Error ? error.message : 'AI prompt failed' 
    };
  }
}

/**
 * Run an AI agent with function calling capabilities
 */
export async function runAIAgent(params: AIAgentParams): Promise<AIAgentResponse> {
  try {
    console.log('🤖 Running AI Agent:', params.task);
    console.log('🛠️ Tools enabled:', {
      kb: params.enableKnowledgeBase,
      sql: params.enableSQLQuery,
      web: params.enableWebSearch,
    });
    
    const auth = await getAuthData();
    
    const response = await fetch('/api/databricks/ai/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        ...auth,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Agent execution failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Agent completed in ${result.iterations} iterations`);
    console.log(`🛠️ Tools used: ${result.toolsUsed} function calls`);
    console.log('📝 Final response:', result.response.substring(0, 100) + '...');
    
    return result;
    
  } catch (error) {
    console.error('❌ AI Agent error:', error);
    return { 
      success: false, 
      response: '',
      iterations: 0,
      model: '',
      toolsUsed: 0,
      error: error instanceof Error ? error.message : 'Agent execution failed' 
    };
  }
}

/**
 * Available Databricks Foundation Model endpoints
 */
export const DATABRICKS_MODELS = {
  CLAUDE_SONNET: 'databricks-claude-sonnet-4-6',
  CLAUDE_OPUS: 'databricks-claude-opus-4-6',
  CLAUDE_HAIKU: 'databricks-claude-haiku-4-5',
} as const;

/**
 * Helper: Execute a simple prompt (no conversation history)
 */
export async function askAI(
  prompt: string,
  userEmail: string,
  userRole: string = 'user',
  includeKnowledgeBase: boolean = false
): Promise<string> {
  const result = await executeAIPrompt({
    prompt,
    userEmail,
    userRole,
    includeKnowledgeBase,
    knowledgeBaseQuery: includeKnowledgeBase ? prompt : undefined,
  });
  
  return result.success ? result.response : `Error: ${result.error}`;
}

/**
 * Helper: Run agent for a task
 */
export async function agentTask(
  task: string,
  userEmail: string,
  userRole: string = 'user',
  options: {
    enableKnowledgeBase?: boolean;
    enableSQLQuery?: boolean;
    brand?: string;
    category?: string;
  } = {}
): Promise<string> {
  const result = await runAIAgent({
    task,
    userEmail,
    userRole,
    enableKnowledgeBase: options.enableKnowledgeBase ?? true,
    enableSQLQuery: options.enableSQLQuery ?? true,
    brand: options.brand,
    category: options.category,
  });
  
  return result.success ? result.response : `Error: ${result.error}`;
}

/**
 * Example: Multi-turn conversation
 */
export class AIConversation {
  private history: Array<{ role: string; content: string }> = [];
  private userEmail: string;
  private userRole: string;

  constructor(userEmail: string, userRole: string = 'user', systemPrompt?: string) {
    this.userEmail = userEmail;
    this.userRole = userRole;
    
    if (systemPrompt) {
      this.history.push({ role: 'system', content: systemPrompt });
    }
  }

  async ask(prompt: string): Promise<string> {
    const result = await executeAIPrompt({
      prompt,
      userEmail: this.userEmail,
      userRole: this.userRole,
      conversationHistory: this.history,
    });

    if (result.success) {
      // Add to history
      this.history.push({ role: 'user', content: prompt });
      this.history.push({ role: 'assistant', content: result.response });
      return result.response;
    } else {
      throw new Error(result.error || 'Failed to get response');
    }
  }

  getHistory() {
    return [...this.history];
  }

  clear() {
    this.history = [];
  }
}