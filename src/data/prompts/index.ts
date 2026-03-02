/**
 * CoHive Prompt System - Main Entry Point
 * 
 * A comprehensive object-oriented prompt management system for CoHive workflows.
 * 
 * Features:
 * - Composable prompt parts (TextPart, DynamicPart, ConditionalPart, TemplatePart)
 * - Template-based prompt generation with role-based filtering
 * - Prompt chaining for multi-step workflows
 * - Multi-language support (English first, extensible)
 * - Python/Databricks execution context
 * 
 * Usage:
 * ```typescript
 * import { PromptManager } from './data/prompts';
 * 
 * const promptManager = PromptManager.getInstance();
 * 
 * // Generate a single prompt
 * const prompt = promptManager.generate('Buyers', 'execute', {
 *   hexId: 'Buyers',
 *   brand: 'Acme Corp',
 *   projectType: 'Product Innovation',
 *   selectedFiles: ['research.pdf'],
 *   selectedPersonas: ['Young Professionals'],
 *   assessmentType: ['unified'],
 *   userRole: 'researcher'
 * });
 * 
 * // Execute a prompt chain
 * const chain = promptManager.getChain('kb_persona_action');
 * const results = await chain.execute(context, sendToDatabricks);
 * 
 * // Preview a prompt
 * const preview = promptManager.preview('Competitors', 'execute', 'assess');
 * ```
 */

// Core types and interfaces
export type {
  HexId,
  TriggerType,
  UserRole,
  AssessmentType,
  ProjectType,
  PromptContext,
  PromptPart,
  PromptTemplateConfig
} from './types';

// Core classes
export {
  TextPart,
  DynamicPart,
  ConditionalPart,
  TemplatePart,
  PromptTemplate,
  PromptChain
} from './core';

// Template engine utilities
export {
  template,
  conditionalTemplate,
  formatList,
  formatKeyValue,
  escapePythonString,
  pythonCodeBlock
} from './template-engine';

// Base reusable parts
export { BaseParts } from './base-parts';

// All hex prompts
export { LaunchPrompts } from './templates/launch';
export { ExternalExpertsPrompts } from './templates/external-experts';
export { PanelHomesPrompts } from './templates/panel-homes';
export { BuyersPrompts } from './templates/buyers';
export { CompetitorsPrompts } from './templates/competitors';
export { ColleaguesPrompts } from './templates/colleagues';
export { KnowledgeBasePrompts } from './templates/knowledge-base';
export { TestAgainstSegmentsPrompts } from './templates/test-against-segments';
export { ActionPrompts } from './templates/action';

// Main prompt manager
export { PromptManager } from './prompt-manager';

// Convenience function for quick access
export function getPromptManager() {
  return PromptManager.getInstance();
}
