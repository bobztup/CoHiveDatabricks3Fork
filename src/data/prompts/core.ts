/**
 * CoHive Prompt System - Core Classes
 * Base classes for composable prompt system
 */

import { PromptContext, PromptPart, PromptTemplateConfig, UserRole, TriggerType, HexId } from './types';
import { template, conditionalTemplate } from './template-engine';

/**
 * TextPart - Static text that supports localization
 */
export class TextPart implements PromptPart {
  constructor(
    public id: string,
    private text: Record<string, string>, // { en: "...", es: "..." }
    public roles?: UserRole[]
  ) {}

  generate(context: PromptContext, locale = 'en'): string {
    return this.text[locale] || this.text['en'] || '';
  }
}

/**
 * DynamicPart - Generated content based on context
 */
export class DynamicPart implements PromptPart {
  constructor(
    public id: string,
    private builder: (context: PromptContext, locale?: string) => string,
    public roles?: UserRole[]
  ) {}

  generate(context: PromptContext, locale = 'en'): string {
    return this.builder(context, locale);
  }
}

/**
 * ConditionalPart - Show different content based on conditions
 */
export class ConditionalPart implements PromptPart {
  constructor(
    public id: string,
    private condition: (context: PromptContext) => boolean,
    private ifTrue: PromptPart,
    private ifFalse?: PromptPart,
    public roles?: UserRole[]
  ) {}

  generate(context: PromptContext, locale = 'en'): string {
    const part = this.condition(context) ? this.ifTrue : this.ifFalse;
    return part ? part.generate(context, locale) : '';
  }
}

/**
 * TemplatePart - Use template engine for string interpolation
 */
export class TemplatePart implements PromptPart {
  constructor(
    public id: string,
    private templateStr: Record<string, string>,
    private varsBuilder: (context: PromptContext) => Record<string, any>,
    public roles?: UserRole[]
  ) {}

  generate(context: PromptContext, locale = 'en'): string {
    const templateString = this.templateStr[locale] || this.templateStr['en'] || '';
    const vars = this.varsBuilder(context);
    return conditionalTemplate(templateString, vars);
  }
}

/**
 * PromptTemplate - Combines multiple parts into a complete prompt
 */
export class PromptTemplate {
  public id: string;
  public hexId: HexId;
  public trigger: TriggerType;
  private parts: PromptPart[];
  private separator: string;

  constructor(config: PromptTemplateConfig) {
    this.id = config.id;
    this.hexId = config.hexId;
    this.trigger = config.trigger;
    this.parts = config.parts;
    this.separator = config.separator || '\n\n';
  }

  /**
   * Generate the complete prompt from all parts
   */
  generate(context: PromptContext, locale = 'en'): string {
    const userRole = context.userRole || 'researcher';

    return this.parts
      .filter(part => !part.roles || part.roles.includes(userRole))
      .map(part => part.generate(context, locale))
      .filter(text => text && text.trim().length > 0)
      .join(this.separator)
      .trim();
  }

  /**
   * Chain this template with another
   */
  async chain(
    nextTemplate: PromptTemplate,
    context: PromptContext,
    executor: (prompt: string) => Promise<string>
  ): Promise<string> {
    const output = await executor(this.generate(context));
    const nextContext: PromptContext = {
      ...context,
      previousOutput: output,
      chainResults: [...(context.chainResults || []), output]
    };
    return nextTemplate.generate(nextContext);
  }
}

/**
 * PromptChain - Execute multiple templates in sequence
 */
export class PromptChain {
  private steps: PromptTemplate[] = [];
  public id: string;

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Add a template to the chain
   */
  addStep(template: PromptTemplate): this {
    this.steps.push(template);
    return this;
  }

  /**
   * Execute all steps in sequence
   */
  async execute(
    initialContext: PromptContext,
    executor: (prompt: string, stepIndex: number) => Promise<string>
  ): Promise<string[]> {
    const results: string[] = [];
    let context = { ...initialContext };

    for (let i = 0; i < this.steps.length; i++) {
      const template = this.steps[i];
      const prompt = template.generate(context, context.locale);
      const result = await executor(prompt, i);
      results.push(result);

      // Pass result to next step
      context = {
        ...context,
        previousOutput: result,
        chainResults: results
      };
    }

    return results;
  }

  /**
   * Generate all prompts without executing (for preview)
   */
  preview(initialContext: PromptContext): string[] {
    const prompts: string[] = [];
    let context = { ...initialContext };

    for (const template of this.steps) {
      const prompt = template.generate(context, context.locale);
      prompts.push(prompt);

      // Simulate passing result to next step
      context = {
        ...context,
        previousOutput: '[OUTPUT FROM PREVIOUS STEP]',
        chainResults: [...(context.chainResults || []), '[OUTPUT FROM PREVIOUS STEP]']
      };
    }

    return prompts;
  }
}
