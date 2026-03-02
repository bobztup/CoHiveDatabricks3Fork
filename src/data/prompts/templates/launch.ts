/**
 * Launch (Enter) Hex Prompts
 * Starting point for all CoHive workflows
 */

import { PromptTemplate, TextPart, DynamicPart } from '../core';
import { BaseParts } from '../base-parts';

export const LaunchPrompts = {
  /**
   * Execute - Start the workflow
   */
  execute: new PromptTemplate({
    id: 'launch_execute',
    hexId: 'Launch',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== COHIVE WORKFLOW INITIALIZATION ==='
      }),
      
      new TextPart('intro', {
        en: `You are assisting with a CoHive analysis workflow.
This is the Launch phase where we establish the project foundation.`
      }),
      
      BaseParts.projectContext,
      BaseParts.questionResponses,
      
      new TextPart('instructions', {
        en: `Based on the project information provided:
1. Validate the project setup
2. Identify key research questions
3. Suggest relevant workflow paths through CoHive
4. Highlight any missing critical information

Provide a structured response that will guide the analysis process.`
      }),
      
      BaseParts.pythonContext,
      BaseParts.outputFormat
    ]
  }),

  /**
   * Save - Store launch configuration
   */
  save: new PromptTemplate({
    id: 'launch_save',
    hexId: 'Launch',
    trigger: 'save',
    parts: [
      new TextPart('header', {
        en: '=== SAVE LAUNCH CONFIGURATION ==='
      }),
      
      BaseParts.projectContext,
      BaseParts.questionResponses,
      
      new DynamicPart('save_instruction', (ctx) => {
        return `Generate a project summary document that captures:
- Project name: ${ctx.brand || 'Unnamed Project'}
- Type: ${ctx.projectType || 'Not specified'}
- Key objectives and questions
- Recommended next steps in the workflow

Format as a markdown document suitable for saving.`;
      })
    ]
  }),

  /**
   * Download - Export launch data
   */
  download: new PromptTemplate({
    id: 'launch_download',
    hexId: 'Launch',
    trigger: 'download',
    parts: [
      new TextPart('header', {
        en: '=== EXPORT LAUNCH DATA ==='
      }),
      
      new DynamicPart('export_data', (ctx) => {
        return `Generate a comprehensive project initialization report:

Project Details:
- Brand: ${ctx.brand || 'Not specified'}
- Project Type: ${ctx.projectType || 'Not specified'}
- User Role: ${ctx.userRole || 'Not specified'}

User Responses:
${ctx.questionResponses?.map((r, i) => `${i + 1}. ${r}`).join('\n') || 'No responses recorded'}

Format as a downloadable JSON structure with all metadata.`;
      })
    ]
  })
};
