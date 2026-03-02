/**
 * Action (Findings) Hex Prompts
 * Final synthesis and strategic recommendations
 */

import { PromptTemplate, TextPart, DynamicPart } from '../core';
import { BaseParts } from '../base-parts';

export const ActionPrompts = {
  /**
   * Execute - Generate findings report
   */
  execute: new PromptTemplate({
    id: 'action_execute',
    hexId: 'Action',
    trigger: 'execute',
    parts: [
      new TextPart('header', {
        en: '=== ACTION - GENERATE FINDINGS & RECOMMENDATIONS ==='
      }),
      
      new TextPart('intro', {
        en: `This is the final Action phase of the CoHive workflow.
Synthesize all previous hex analyses into comprehensive findings and strategic action plan.`
      }),
      
      BaseParts.projectContext,
      
      new DynamicPart('workflow_summary', (ctx) => {
        const hexes = ctx.allHexResponses ? Object.keys(ctx.allHexResponses) : [];
        
        if (hexes.length === 0) {
          return 'No prior hex analyses available.';
        }
        
        return `Workflow Completion Summary:
Hexes analyzed: ${hexes.join(', ')}

Synthesize insights from all completed analyses to generate actionable recommendations.`;
      }),
      
      BaseParts.chainContext,
      BaseParts.questionResponses,
      
      new TextPart('action_instructions', {
        en: `Action Phase Requirements:
1. SYNTHESIS
   - Integrate insights from all hex analyses
   - Identify overarching themes and patterns
   - Reconcile any conflicting findings
   - Assess confidence levels across insights

2. STRATEGIC RECOMMENDATIONS
   - Prioritize recommendations by impact and feasibility
   - Create clear, actionable initiatives
   - Define success metrics and KPIs
   - Outline implementation roadmap
   - Identify risks and mitigation strategies

3. EXECUTIVE SUMMARY
   - Concise summary of key findings
   - Top 3-5 strategic priorities
   - Expected outcomes and impact
   - Resource requirements

4. NEXT STEPS
   - Immediate actions (next 30 days)
   - Short-term initiatives (3-6 months)
   - Long-term strategic moves (6-12 months)`
      }),
      
      BaseParts.researcherInstructions,
      BaseParts.nonResearcherInstructions,
      BaseParts.pythonContext,
      
      new TextPart('output_format_action', {
        en: `Output Format:
{
  "executive_summary": "Concise overview of findings and recommendations",
  "key_findings": [
    {
      "finding": "Finding statement",
      "source_hexes": ["Hex1", "Hex2"],
      "confidence": "high|medium|low",
      "business_impact": "high|medium|low"
    }
  ],
  "strategic_priorities": [
    {
      "priority": "Priority statement",
      "rationale": "Why this matters",
      "expected_outcome": "What success looks like",
      "timeline": "Implementation timeframe",
      "resources_required": "Resource needs"
    }
  ],
  "action_plan": {
    "immediate": ["Action 1", "Action 2"],
    "short_term": ["Initiative 1", "Initiative 2"],
    "long_term": ["Strategy 1", "Strategy 2"]
  },
  "success_metrics": ["KPI 1", "KPI 2"],
  "risks": ["Risk 1", "Risk 2"],
  "knowledge_gaps": ["Gap 1", "Gap 2"]
}`
      })
    ]
  }),

  /**
   * Save - Store findings report
   */
  save: new PromptTemplate({
    id: 'action_save',
    hexId: 'Action',
    trigger: 'save',
    parts: [
      new TextPart('header', {
        en: '=== SAVE FINDINGS REPORT ==='
      }),
      
      BaseParts.projectContext,
      BaseParts.chainContext,
      
      new DynamicPart('workflow_context', (ctx) => {
        const hexes = ctx.allHexResponses ? Object.keys(ctx.allHexResponses) : [];
        return `Workflow Summary:
Completed hexes: ${hexes.length > 0 ? hexes.join(', ') : 'None'}`;
      }),
      
      new TextPart('save_instructions', {
        en: `Generate a comprehensive CoHive Findings Report:
- Executive Summary
- Project Overview and Context
- Methodology (hexes analyzed)
- Key Findings by Theme
- Strategic Recommendations with Priorities
- Implementation Roadmap
- Success Metrics and KPIs
- Risks and Mitigation Strategies
- Appendices with Supporting Data

Format as a professional markdown document suitable for stakeholder presentation.`
      })
    ]
  }),

  /**
   * Download - Export complete project data
   */
  download: new PromptTemplate({
    id: 'action_download',
    hexId: 'Action',
    trigger: 'download',
    parts: [
      new TextPart('header', {
        en: '=== EXPORT COMPLETE PROJECT DATA ==='
      }),
      
      BaseParts.projectContext,
      
      new DynamicPart('complete_export', (ctx) => {
        return `Generate a complete project export package:

Project Metadata:
- Brand: ${ctx.brand || 'Not specified'}
- Project Type: ${ctx.projectType || 'Not specified'}
- User Role: ${ctx.userRole || 'Not specified'}

Workflow Data:
- All hex analyses and results
- Complete response history
- Files analyzed across all hexes
- Execution timestamps and versions

Findings:
- Executive summary
- All strategic recommendations
- Complete action plan
- Success metrics

Format as comprehensive JSON with:
{
  "metadata": {...},
  "workflow": {...},
  "findings": {...},
  "raw_data": {...}
}`;
      })
    ]
  }),

  /**
   * Recommend - Suggest additional analyses
   */
  recommend: new PromptTemplate({
    id: 'action_recommend',
    hexId: 'Action',
    trigger: 'recommend',
    parts: [
      new TextPart('header', {
        en: '=== RECOMMEND ADDITIONAL ANALYSES ==='
      }),
      
      BaseParts.projectContext,
      BaseParts.chainContext,
      
      new DynamicPart('completed_hexes', (ctx) => {
        const completed = ctx.allHexResponses ? Object.keys(ctx.allHexResponses) : [];
        const allHexes = ['Launch', 'External Experts', 'Panel Homes', 'Buyers', 'Competitors', 'Colleagues', 'Knowledge Base', 'Test Against Segments'];
        const notCompleted = allHexes.filter(h => !completed.includes(h));
        
        return `Workflow Status:
Completed: ${completed.join(', ') || 'Launch only'}
Available: ${notCompleted.join(', ') || 'None'}`;
      }),
      
      new TextPart('recommend_instructions', {
        en: `Based on the current findings and analysis gaps:
1. Recommend additional hexes to explore
2. Suggest specific personas or competitors to analyze
3. Identify knowledge base files that should be reviewed
4. Propose synthesis opportunities across existing analyses
5. Highlight any critical gaps in the current workflow

Provide specific, actionable recommendations for next steps.`
      }),
      
      BaseParts.pythonContext,
      BaseParts.outputFormat
    ]
  })
};
