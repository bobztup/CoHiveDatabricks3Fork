/**
 * ModelSelector
 *
 * BJS: Dropdown UI for selecting the active AI model. Used in two places:
 *   1. Global settings (TemplateManager / settings panel) — persists to localStorage
 *   2. Per-assessment override (CentralHexView / AssessmentModal) — passed as prop
 *
 * Only renders the change controls when canChangeModel(userRole) is true.
 * Read-only display (showing current model) is shown to all users.
 *
 * Location: src/components/ModelSelector.tsx
 */

import { useState, useEffect } from 'react';
import { ChevronDown, Cpu, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import {
  AVAILABLE_MODELS,
  PROVIDER_LABELS,
  PROVIDER_ORDER,
  getActiveModel,
  getModelsByProvider,
  saveModelConfig,
  canChangeModel,
  type ModelDefinition,
  type ModelProvider,
} from '../utils/modelConfig';

interface ModelSelectorProps {
  userRole: string;
  userEmail: string;
  // If provided, this is a per-assessment override (not saved to localStorage)
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;
  // Display variant
  variant?: 'compact' | 'full';
  label?: string;
}

const PROVIDER_COLORS: Record<ModelProvider, string> = {
  databricks:  'bg-red-100 text-red-800 border-red-200',
  anthropic:   'bg-orange-100 text-orange-800 border-orange-200',
  openai:      'bg-green-100 text-green-800 border-green-200',
  ollama:      'bg-purple-100 text-purple-800 border-purple-200',
};

export function ModelSelector({
  userRole,
  userEmail,
  selectedModelId,
  onModelChange,
  variant = 'full',
  label,
}: ModelSelectorProps) {
  const canChange = canChangeModel(userRole);
  const isOverride = !!onModelChange; // True = per-assessment, False = global

  // BJS: Active model comes from prop (per-assessment) or global config (settings panel).
  const [activeModel, setActiveModel] = useState<ModelDefinition>(() => {
    if (selectedModelId) {
      return AVAILABLE_MODELS.find(m => m.id === selectedModelId) ?? getActiveModel();
    }
    return getActiveModel();
  });

  const [isOpen, setIsOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (selectedModelId) {
      const found = AVAILABLE_MODELS.find(m => m.id === selectedModelId);
      if (found) setActiveModel(found);
    }
  }, [selectedModelId]);

  const handleSelect = (model: ModelDefinition) => {
    setActiveModel(model);
    setIsOpen(false);

    if (isOverride && onModelChange) {
      // Per-assessment: just call the callback, don't persist
      onModelChange(model.id);
    } else {
      // Global: persist to localStorage
      saveModelConfig(model.id, userEmail);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const modelsByProvider = getModelsByProvider();

  if (variant === 'compact') {
    return (
      <div className="relative">
        <button
          onClick={() => canChange && setIsOpen(!isOpen)}
          disabled={!canChange}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm transition-colors ${
            canChange
              ? 'border-gray-300 bg-white hover:border-blue-400 cursor-pointer'
              : 'border-gray-200 bg-gray-50 cursor-not-allowed'
          }`}
          title={canChange ? 'Change AI model' : 'Only Admins and Data Scientists can change the model'}
        >
          <Cpu className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-gray-700 max-w-[160px] truncate">{activeModel.label}</span>
          {canChange
            ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            : <Lock className="w-3 h-3 text-gray-300" />
          }
        </button>

        {isOpen && canChange && (
          <ModelDropdown
            modelsByProvider={modelsByProvider}
            activeModel={activeModel}
            onSelect={handleSelect}
            onClose={() => setIsOpen(false)}
          />
        )}
      </div>
    );
  }

  // Full variant — used in settings panel
  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-gray-600" />
          <h4 className="text-gray-900 font-medium text-sm">{label}</h4>
        </div>
      )}

      {/* Current model display */}
      <div className={`border-2 rounded-lg p-4 ${canChange ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-900 font-semibold text-sm">{activeModel.label}</span>
              <span className={`px-1.5 py-0.5 rounded text-xs border ${PROVIDER_COLORS[activeModel.provider]}`}>
                {PROVIDER_LABELS[activeModel.provider]}
              </span>
              {saved && (
                <span className="flex items-center gap-1 text-green-700 text-xs">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Saved
                </span>
              )}
            </div>
            <p className="text-gray-600 text-xs">{activeModel.description}</p>
            <p className="text-gray-400 text-xs mt-1">
              Context: {(activeModel.contextWindow / 1000).toFixed(0)}k tokens
              {activeModel.requiresKey && (
                <span className="ml-2 text-amber-600">· Requires {activeModel.requiresKey}</span>
              )}
            </p>
          </div>
          {canChange && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="ml-3 px-3 py-1.5 border-2 border-gray-300 bg-white text-gray-700 rounded hover:border-blue-400 text-sm flex items-center gap-1.5 flex-shrink-0"
            >
              Change
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
          {!canChange && (
            <div className="flex items-center gap-1 text-gray-400 text-xs ml-3">
              <Lock className="w-3.5 h-3.5" />
              View only
            </div>
          )}
        </div>
      </div>

      {!canChange && (
        <p className="text-gray-500 text-xs">
          Model selection is restricted to Administrators and Data Scientists.
        </p>
      )}

      {/* Dropdown panel — inline in full variant */}
      {isOpen && canChange && (
        <div className="border-2 border-blue-200 rounded-lg overflow-hidden">
          {PROVIDER_ORDER.map(provider => {
            const models = modelsByProvider[provider];
            if (!models.length) return null;
            return (
              <div key={provider}>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {PROVIDER_LABELS[provider]}
                  </span>
                </div>
                {models.map(model => (
                  <ModelRow
                    key={model.id}
                    model={model}
                    isActive={model.id === activeModel.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            );
          })}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ModelRow({
  model,
  isActive,
  onSelect,
}: {
  model: ModelDefinition;
  isActive: boolean;
  onSelect: (m: ModelDefinition) => void;
}) {
  return (
    <button
      onClick={() => onSelect(model)}
      className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 ${
        isActive ? 'bg-blue-50' : 'bg-white'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-gray-900 text-sm font-medium">{model.label}</span>
          {isActive && <CheckCircle className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
          {model.requiresKey && (
            <span className="text-amber-600 text-xs flex items-center gap-0.5 flex-shrink-0">
              <AlertCircle className="w-3 h-3" />
              {model.requiresKey}
            </span>
          )}
        </div>
        <p className="text-gray-500 text-xs mt-0.5 truncate">{model.description}</p>
      </div>
      <span className="text-gray-400 text-xs ml-3 flex-shrink-0">
        {(model.contextWindow / 1000).toFixed(0)}k ctx
      </span>
    </button>
  );
}

function ModelDropdown({
  modelsByProvider,
  activeModel,
  onSelect,
  onClose,
}: {
  modelsByProvider: Record<ModelProvider, ModelDefinition[]>;
  activeModel: ModelDefinition;
  onSelect: (m: ModelDefinition) => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Click-away backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-full left-0 mt-1 w-80 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
        {PROVIDER_ORDER.map(provider => {
          const models = modelsByProvider[provider];
          if (!models.length) return null;
          return (
            <div key={provider}>
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 sticky top-0">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {PROVIDER_LABELS[provider]}
                </span>
              </div>
              {models.map(model => (
                <ModelRow
                  key={model.id}
                  model={model}
                  isActive={model.id === activeModel.id}
                  onSelect={onSelect}
                />
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
