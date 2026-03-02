/**
 * CoHive Prompt System - Shared Base Parts
 * Reusable prompt components used across multiple hexes
 */

import { TextPart, DynamicPart, TemplatePart } from './core';
import { formatList, formatKeyValue } from './template-engine';

/**
 * Shared parts that can be reused across different hex prompts
 */
export const BaseParts = {
  /**
   * Project context - brand and project type
   */
  projectContext: new DynamicPart(
    'project_context',
    (ctx) => {
      if (!ctx.brand && !ctx.projectType) return '';
      
      const parts: string[] = [];
      if (ctx.brand) parts.push(`Brand: ${ctx.brand}`);
      if (ctx.projectType) parts.push(`Project Type: ${ctx.projectType}`);
      
      return parts.join('\n');
    }
  ),

  /**
   * Selected files from Knowledge Base
   */
  selectedFiles: new DynamicPart(
    'selected_files',
    (ctx) => {
      if (!ctx.selectedFiles || ctx.selectedFiles.length === 0) return '';
      
      return `Knowledge Base Files:\n${formatList(ctx.selectedFiles)}`;
    }
  ),

  /**
   * Instructions specific to researcher role
   */
  researcherInstructions: new TextPart(
    'researcher_instructions',
    {
      en: `Analysis Requirements:
- Provide detailed analytical insights with statistical rigor
- Include quantitative metrics where applicable
- Reference specific data points from the knowledge base
- Highlight methodological considerations
- Note confidence levels and limitations`
    },
    ['researcher']
  ),

  /**
   * Instructions specific to non-researcher role
   */
  nonResearcherInstructions: new TextPart(
    'non_researcher_instructions',
    {
      en: `Analysis Requirements:
- Provide clear, actionable recommendations
- Use plain language (avoid technical jargon)
- Focus on practical business implications
- Organize insights by priority
- Include specific next steps`
    },
    ['non-researcher']
  ),

  /**
   * Python execution context header
   */
  pythonContext: new TextPart(
    'python_context',
    {
      en: `Execute this analysis using Python in Databricks.
Available libraries: pandas, numpy, scikit-learn, matplotlib, seaborn

Output format: Return a structured JSON response with your analysis.`
    }
  ),

  /**
   * Assessment type instructions
   */
  assessmentType: new DynamicPart(
    'assessment_type',
    (ctx) => {
      if (!ctx.assessmentType || ctx.assessmentType.length === 0) return '';
      
      const typeMap = {
        'assess': 'Assess the knowledge base files against the selected criteria',
        'recommend': 'Generate recommendations based on the knowledge base',
        'unified': 'Combine all insights into a single unified assessment'
      };
      
      const instructions = ctx.assessmentType
        .map(type => typeMap[type])
        .filter(Boolean);
      
      if (instructions.length === 0) return '';
      
      return `Assessment Mode:\n${formatList(instructions)}`;
    }
  ),

  /**
   * Selected personas (for persona hexes)
   */
  selectedPersonas: new DynamicPart(
    'selected_personas',
    (ctx) => {
      if (!ctx.selectedPersonas || ctx.selectedPersonas.length === 0) return '';
      
      const parts: string[] = ['Selected Personas:'];
      
      // Show L1 categories if available
      if (ctx.selectedL1Categories && ctx.selectedL1Categories.length > 0) {
        parts.push(`\nLevel 1 Categories:\n${formatList(ctx.selectedL1Categories)}`);
      }
      
      // Show L2 categories if available
      if (ctx.selectedL2Categories && ctx.selectedL2Categories.length > 0) {
        parts.push(`\nLevel 2 Categories:\n${formatList(ctx.selectedL2Categories)}`);
      }
      
      // Show all selected personas
      parts.push(`\nSpecific Personas:\n${formatList(ctx.selectedPersonas)}`);
      
      return parts.join('\n');
    }
  ),

  /**
   * User question responses
   */
  questionResponses: new DynamicPart(
    'question_responses',
    (ctx) => {
      if (!ctx.questionResponses || ctx.questionResponses.length === 0) return '';
      
      const responses = ctx.questionResponses
        .map((response, idx) => `Question ${idx + 1} Response:\n${response}`)
        .join('\n\n');
      
      return `User Input:\n\n${responses}`;
    }
  ),

  /**
   * Chain context - show previous outputs
   */
  chainContext: new DynamicPart(
    'chain_context',
    (ctx) => {
      if (!ctx.previousOutput && (!ctx.chainResults || ctx.chainResults.length === 0)) {
        return '';
      }
      
      if (ctx.previousOutput) {
        return `Previous Step Output:\n${ctx.previousOutput}`;
      }
      
      const results = ctx.chainResults!
        .map((result, idx) => `Step ${idx + 1} Output:\n${result}`)
        .join('\n\n');
      
      return `Chain History:\n\n${results}`;
    }
  ),

  /**
   * Output format instructions
   */
  outputFormat: new TextPart(
    'output_format',
    {
      en: `Output Format:
Structure your response as JSON with the following schema:
{
  "summary": "Executive summary of key findings",
  "insights": ["Insight 1", "Insight 2", ...],
  "recommendations": ["Recommendation 1", "Recommendation 2", ...],
  "data": {
    // Supporting data and metrics
  },
  "confidence": "high|medium|low",
  "limitations": ["Limitation 1", "Limitation 2", ...]
}`
    }
  ),

  /**
   * Synthesis context (for Knowledge Base New Synthesis)
   */
  synthesisContext: new DynamicPart(
    'synthesis_context',
    (ctx) => {
      if (!ctx.synthesisSelections) return '';
      
      const { projects, hexes, executions } = ctx.synthesisSelections;
      const parts: string[] = ['Synthesis Scope:'];
      
      if (projects && projects.length > 0) {
        parts.push(`\nSelected Projects:\n${formatList(projects)}`);
      }
      
      if (hexes && hexes.length > 0) {
        parts.push(`\nSelected Hexes:\n${formatList(hexes)}`);
      }
      
      if (executions && executions.length > 0) {
        parts.push(`\nSelected Executions:\n${formatList(executions)}`);
      }
      
      return parts.join('\n');
    }
  )
};
