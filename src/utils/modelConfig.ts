/**
 * Model Configuration
 *
 * BJS: Defines all swappable model providers and models, mirroring the
 * Python cohive.py pattern of Ollama_model / Anthropic_Model / GPT_Model
 * classes that are passed into Persona() at instantiation time.
 *
 * Supports four providers:
 *   - databricks  : Models served via Databricks Model Serving endpoints
 *   - anthropic   : Anthropic API called directly (requires ANTHROPIC_API_KEY)
 *   - openai      : OpenAI API called directly (requires OPENAI_API_KEY)
 *   - ollama      : Local Ollama instance (requires OLLAMA_BASE_URL)
 *
 * Role gating: only 'administrator' and 'data-scientist' can change the model.
 * All other roles read the current setting but cannot modify it.
 *
 * Storage: global default persisted in localStorage under MODEL_CONFIG_KEY.
 * Per-assessment override passed directly in the assessment request body.
 *
 * Location: src/utils/modelConfig.ts
 */

export type ModelProvider = 'databricks' | 'anthropic' | 'openai' | 'ollama';

export interface ModelDefinition {
  id: string;               // Unique ID used in API calls and localStorage
  provider: ModelProvider;
  label: string;            // Display name in UI
  description: string;      // Short capability description
  endpoint?: string;        // Databricks serving endpoint name (databricks provider only)
  modelName?: string;       // Model name for Anthropic / OpenAI / Ollama
  contextWindow: number;    // Max tokens (approximate)
  supportsSystem: boolean;  // Whether the model supports a system prompt
  isDefault?: boolean;      // Pre-selected default
  requiresKey?: string;     // Env var name required (shown in UI if missing)
}

// BJS: All available models across providers.
// Maps to Python: Ollama_model, Anthropic_Model, GPT_Model classes in cohive.py.
// Databricks-hosted models use the serving endpoint name as their identifier.
export const AVAILABLE_MODELS: ModelDefinition[] = [

  // ── Databricks-hosted ────────────────────────────────────────────────────
  {
    id: 'databricks-claude-sonnet-4-6',
    provider: 'databricks',
    label: 'Claude Sonnet 4.6 (Databricks)',
    description: 'Anthropic Claude via Databricks Model Serving — current default',
    endpoint: 'databricks-claude-sonnet-4-6',
    contextWindow: 200000,
    supportsSystem: true,
    isDefault: true,
  },
  {
    id: 'databricks-meta-llama-3-1-70b-instruct',
    provider: 'databricks',
    label: 'Llama 3.1 70B (Databricks)',
    description: 'Meta Llama 3.1 70B via Databricks Model Serving',
    endpoint: 'databricks-meta-llama-3-1-70b-instruct',
    contextWindow: 128000,
    supportsSystem: true,
  },
  {
    id: 'databricks-meta-llama-3-1-405b-instruct',
    provider: 'databricks',
    label: 'Llama 3.1 405B (Databricks)',
    description: 'Meta Llama 3.1 405B — highest capability open model',
    endpoint: 'databricks-meta-llama-3-1-405b-instruct',
    contextWindow: 128000,
    supportsSystem: true,
  },
  {
    id: 'databricks-mixtral-8x7b-instruct',
    provider: 'databricks',
    label: 'Mixtral 8x7B (Databricks)',
    description: 'Mistral MoE model — fast, efficient',
    endpoint: 'databricks-mixtral-8x7b-instruct',
    contextWindow: 32000,
    supportsSystem: true,
  },
  {
    id: 'databricks-dbrx-instruct',
    provider: 'databricks',
    label: 'DBRX Instruct (Databricks)',
    description: "Databricks' own foundation model",
    endpoint: 'databricks-dbrx-instruct',
    contextWindow: 32000,
    supportsSystem: true,
  },

  // ── Anthropic direct ─────────────────────────────────────────────────────
  {
    id: 'anthropic-claude-opus-4-6',
    provider: 'anthropic',
    label: 'Claude Opus 4.6 (Direct)',
    description: 'Highest capability Claude — called directly via Anthropic API',
    modelName: 'claude-opus-4-6',
    contextWindow: 200000,
    supportsSystem: true,
    requiresKey: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'anthropic-claude-sonnet-4-6',
    provider: 'anthropic',
    label: 'Claude Sonnet 4.6 (Direct)',
    description: 'Balanced Claude — called directly via Anthropic API',
    modelName: 'claude-sonnet-4-6',
    contextWindow: 200000,
    supportsSystem: true,
    requiresKey: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'anthropic-claude-haiku-4-5',
    provider: 'anthropic',
    label: 'Claude Haiku 4.5 (Direct)',
    description: 'Fast, lightweight Claude — called directly via Anthropic API',
    modelName: 'claude-haiku-4-5-20251001',
    contextWindow: 200000,
    supportsSystem: true,
    requiresKey: 'ANTHROPIC_API_KEY',
  },

  // ── OpenAI direct ────────────────────────────────────────────────────────
  {
    id: 'openai-gpt-4o',
    provider: 'openai',
    label: 'GPT-4o (Direct)',
    description: 'OpenAI GPT-4o — called directly via OpenAI API',
    modelName: 'gpt-4o',
    contextWindow: 128000,
    supportsSystem: true,
    requiresKey: 'OPENAI_API_KEY',
  },
  {
    id: 'openai-gpt-4o-mini',
    provider: 'openai',
    label: 'GPT-4o Mini (Direct)',
    description: 'Lightweight GPT-4o — fast and cost-effective',
    modelName: 'gpt-4o-mini',
    contextWindow: 128000,
    supportsSystem: true,
    requiresKey: 'OPENAI_API_KEY',
  },
  {
    id: 'openai-o1',
    provider: 'openai',
    label: 'o1 (Direct)',
    description: 'OpenAI o1 reasoning model — deep analysis',
    modelName: 'o1',
    contextWindow: 200000,
    supportsSystem: false, // o1 does not support system prompts
    requiresKey: 'OPENAI_API_KEY',
  },

  // ── Ollama (local) ───────────────────────────────────────────────────────
  {
    id: 'ollama-llama3',
    provider: 'ollama',
    label: 'Llama 3 (Local Ollama)',
    description: 'Locally hosted via Ollama — no data leaves your machine',
    modelName: 'llama3',
    contextWindow: 8000,
    supportsSystem: true,
    requiresKey: 'OLLAMA_BASE_URL',
  },
  {
    id: 'ollama-mistral',
    provider: 'ollama',
    label: 'Mistral 7B (Local Ollama)',
    description: 'Locally hosted Mistral via Ollama',
    modelName: 'mistral',
    contextWindow: 8000,
    supportsSystem: true,
    requiresKey: 'OLLAMA_BASE_URL',
  },
  {
    id: 'ollama-custom',
    provider: 'ollama',
    label: 'Custom Ollama Model',
    description: 'Any model installed in your local Ollama instance',
    modelName: 'custom',
    contextWindow: 8000,
    supportsSystem: true,
    requiresKey: 'OLLAMA_BASE_URL',
  },
];

// BJS: Provider display labels and grouping order for the UI dropdown.
export const PROVIDER_LABELS: Record<ModelProvider, string> = {
  databricks: 'Databricks Model Serving',
  anthropic: 'Anthropic (Direct API)',
  openai: 'OpenAI (Direct API)',
  ollama: 'Ollama (Local)',
};

export const PROVIDER_ORDER: ModelProvider[] = ['databricks', 'anthropic', 'openai', 'ollama'];

// ── Persistence ──────────────────────────────────────────────────────────────

const MODEL_CONFIG_KEY = 'cohive_model_config';

export interface ModelConfig {
  globalModelId: string;   // The currently selected global default model ID
  updatedAt: string;       // ISO timestamp of last change
  updatedBy: string;       // Email of user who last changed it
}

const DEFAULT_MODEL_ID = AVAILABLE_MODELS.find(m => m.isDefault)?.id
  ?? 'databricks-claude-sonnet-4-6';

// BJS: Read the current global model config from localStorage.
export function getModelConfig(): ModelConfig {
  try {
    const stored = localStorage.getItem(MODEL_CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Fall through to default
  }
  return {
    globalModelId: DEFAULT_MODEL_ID,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  };
}

// BJS: Persist a new global model selection.
// Only called after role check — the UI enforces this, but callers should
// also check canChangeModel() before calling.
export function saveModelConfig(modelId: string, userEmail: string): void {
  const config: ModelConfig = {
    globalModelId: modelId,
    updatedAt: new Date().toISOString(),
    updatedBy: userEmail,
  };
  localStorage.setItem(MODEL_CONFIG_KEY, JSON.stringify(config));
}

// BJS: Get the ModelDefinition for the current global selection.
export function getActiveModel(): ModelDefinition {
  const config = getModelConfig();
  return (
    AVAILABLE_MODELS.find(m => m.id === config.globalModelId)
    ?? AVAILABLE_MODELS.find(m => m.isDefault)!
  );
}

// BJS: Get a ModelDefinition by ID (used when assembling API request bodies).
export function getModelById(id: string): ModelDefinition | undefined {
  return AVAILABLE_MODELS.find(m => m.id === id);
}

// ── Role gating ──────────────────────────────────────────────────────────────

// BJS: Only administrators and data scientists can change the model.
// Mirrors the permission discussion — model settings is a Data Scientist permission.
const MODEL_CHANGE_ROLES = ['administrator', 'data-scientist'];

export function canChangeModel(role: string): boolean {
  return MODEL_CHANGE_ROLES.includes(role);
}

// ── Grouped helpers for UI ───────────────────────────────────────────────────

// BJS: Returns models grouped by provider in display order.
export function getModelsByProvider(): Record<ModelProvider, ModelDefinition[]> {
  const grouped = {} as Record<ModelProvider, ModelDefinition[]>;
  for (const provider of PROVIDER_ORDER) {
    grouped[provider] = AVAILABLE_MODELS.filter(m => m.provider === provider);
  }
  return grouped;
}
