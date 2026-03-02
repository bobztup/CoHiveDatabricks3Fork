/**
 * CoHive Prompt System - Prompt Manager
 * Central registry and retrieval system for all prompts
 */

import { PromptTemplate, PromptChain } from './core';
import { PromptContext, HexId, TriggerType, AssessmentType } from './types';

// Import all hex prompts
import { LaunchPrompts } from './templates/launch';
import { ExternalExpertsPrompts } from './templates/external-experts';
import { PanelHomesPrompts } from './templates/panel-homes';
import { BuyersPrompts } from './templates/buyers';
import { CompetitorsPrompts } from './templates/competitors';
import { ColleaguesPrompts } from './templates/colleagues';
import { KnowledgeBasePrompts } from './templates/knowledge-base';
import { TestAgainstSegmentsPrompts } from './templates/test-against-segments';
import { ActionPrompts } from './templates/action';

/**
 * Singleton PromptManager - manages all prompt templates
 */
export class PromptManager {
  private static instance: PromptManager;
  private templates: Map<string, PromptTemplate> = new Map();
  private chains: Map<string, PromptChain> = new Map();

  private constructor() {
    this.registerAllTemplates();
    this.registerCommonChains();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager();
    }
    return PromptManager.instance;
  }

  /**
   * Register all prompt templates
   */
  private registerAllTemplates() {
    // Launch hex
    Object.values(LaunchPrompts).forEach(t => this.register(t));

    // External Experts hex
    Object.values(ExternalExpertsPrompts).forEach(t => this.register(t));

    // Panel Homes hex
    Object.values(PanelHomesPrompts).forEach(t => this.register(t));

    // Buyers hex
    Object.values(BuyersPrompts).forEach(t => this.register(t));

    // Competitors hex
    Object.values(CompetitorsPrompts).forEach(t => this.register(t));

    // Colleagues hex
    Object.values(ColleaguesPrompts).forEach(t => this.register(t));

    // Knowledge Base hex
    Object.values(KnowledgeBasePrompts).forEach(t => this.register(t));

    // Test Against Segments hex
    Object.values(TestAgainstSegmentsPrompts).forEach(t => this.register(t));

    // Action hex
    Object.values(ActionPrompts).forEach(t => this.register(t));
  }

  /**
   * Register common prompt chains
   */
  private registerCommonChains() {
    // Example: External Experts → Action chain
    const expertsToAction = new PromptChain('experts_to_action')
      .addStep(ExternalExpertsPrompts.executeUnified)
      .addStep(ActionPrompts.execute);
    this.registerChain(expertsToAction);

    // Example: Multi-hex synthesis chain
    const fullWorkflow = new PromptChain('full_workflow')
      .addStep(LaunchPrompts.execute)
      .addStep(BuyersPrompts.executeUnified)
      .addStep(CompetitorsPrompts.executeUnified)
      .addStep(ActionPrompts.execute);
    this.registerChain(fullWorkflow);

    // Knowledge Base → Persona → Action chain
    const kbToAction = new PromptChain('kb_persona_action')
      .addStep(KnowledgeBasePrompts.executeUnified)
      .addStep(BuyersPrompts.executeUnified)
      .addStep(ActionPrompts.execute);
    this.registerChain(kbToAction);
  }

  /**
   * Register a single template
   */
  register(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Register a prompt chain
   */
  registerChain(chain: PromptChain): void {
    this.chains.set(chain.id, chain);
  }

  /**
   * Get a specific template by ID
   */
  getById(id: string): PromptTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * Get template by hex, trigger, and optional assessment type
   */
  get(
    hexId: HexId,
    trigger: TriggerType,
    assessmentType?: AssessmentType
  ): PromptTemplate | null {
    // Build lookup key
    const parts = [
      hexId.toLowerCase().replace(/\s+/g, '_'),
      trigger
    ];

    // Add assessment type if provided
    if (assessmentType) {
      parts.push(assessmentType);
    }

    const key = parts.join('_');

    // Try exact match first
    let template = this.templates.get(key);
    if (template) return template;

    // Try without assessment type
    if (assessmentType) {
      const generalKey = parts.slice(0, 2).join('_');
      template = this.templates.get(generalKey);
      if (template) return template;
    }

    return null;
  }

  /**
   * Generate a prompt for given context
   */
  generate(
    hexId: HexId,
    trigger: TriggerType,
    context: PromptContext,
    locale = 'en'
  ): string {
    // Determine assessment type from context
    const assessmentType = context.assessmentType?.[0];

    // Special case: Knowledge Base New Synthesis
    if (hexId === 'Knowledge Base' && context.synthesisSelections) {
      const template = this.getById('knowledge_base_execute_synthesis');
      if (template) {
        return template.generate(context, locale);
      }
    }

    // Get appropriate template
    const template = this.get(hexId, trigger, assessmentType);

    if (!template) {
      console.warn(`No prompt template found for ${hexId}_${trigger}${assessmentType ? `_${assessmentType}` : ''}`);
      return this.getDefaultPrompt(context);
    }

    return template.generate(context, locale);
  }

  /**
   * Get a registered chain
   */
  getChain(chainId: string): PromptChain | null {
    return this.chains.get(chainId) || null;
  }

  /**
   * List all registered templates
   */
  listTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * List all registered chains
   */
  listChains(): string[] {
    return Array.from(this.chains.keys());
  }

  /**
   * Default fallback prompt
   */
  private getDefaultPrompt(context: PromptContext): string {
    return `Execute ${context.hexId} analysis.

Project: ${context.brand || 'Unnamed'}
Type: ${context.projectType || 'Not specified'}
Files: ${context.selectedFiles?.join(', ') || 'None'}

Please provide analysis based on the available context.`;
  }

  /**
   * Create a custom chain from template IDs
   */
  createCustomChain(chainId: string, templateIds: string[]): PromptChain {
    const chain = new PromptChain(chainId);

    for (const id of templateIds) {
      const template = this.getById(id);
      if (template) {
        chain.addStep(template);
      } else {
        console.warn(`Template ${id} not found, skipping in chain`);
      }
    }

    return chain;
  }

  /**
   * Preview a prompt without full context
   */
  preview(hexId: HexId, trigger: TriggerType, assessmentType?: AssessmentType): string {
    const mockContext: PromptContext = {
      hexId,
      trigger,
      brand: 'Example Brand',
      projectType: 'Product Innovation',
      userRole: 'researcher',
      assessmentType: assessmentType ? [assessmentType] : undefined,
      selectedFiles: ['file1.pdf', 'file2.pdf'],
      selectedPersonas: ['Persona 1', 'Persona 2'],
      questionResponses: ['Sample response 1', 'Sample response 2']
    };

    return this.generate(hexId, trigger, mockContext);
  }
}
