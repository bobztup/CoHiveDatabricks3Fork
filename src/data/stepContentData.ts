/**
 * Step Content Definitions for CoHive Hexagons
 * 
 * This file contains the content, questions, and descriptions for each
 * workflow hexagon in the CoHive application.
 * 
 * Location: /data/stepContentData.ts
 */

export interface StepContent {
  id: string;
  title: string;
  description: string;
  questions: string[];
}

/**
 * Content definitions for each hexagon in the workflow
 * Each step includes:
 * - id: Unique identifier matching the ProcessFlow step
 * - title: Display title for the hexagon
 * - description: Brief explanation of the step's purpose
 * - questions: Array of questions/prompts shown in the step view
 */
export const stepContentData: StepContent[] = [
  {
    id: 'Enter',
    title: 'Begin Project - Initialize your AI project',
    description: 'Define the brand, the project type and the knowledge files to use',
    questions: [
      'Brand',
      'Project Type'
    ]
  },
  {
    id: 'research',
    title: 'Manage Knowledge Assets',
    description: 'Define the knowledge files your project will be based on',
    questions: [
      'Which research studies to synthesize?',
      'Which personas to have available?',
      'Edit and Approve sytheses and personas.',
    ]
  },
  {
    id: 'Luminaries',
    title: 'Luminary Personas',
    description: 'Gather insights and recommendations from industry experts',
    questions: [
      'Which external experts should be consulted?',
      'What are their assessments?',
      'What are their recommendations?',
      'Can they produce a single unified review?'
    ]
  },
  {
    id: 'panelist',
    title: 'Panelist Personas',
    description: 'Leverage data from consumer panel households',
    questions: [
      'How would various panel members respond?',
      'What would various panel members recommend?',
      'What additional research would be helpful to collect from these panel households?',
    ]
  },
  {
    id: 'Consumers',
    title: 'Consumer Personas',
    description: 'Understand consumer preferences',
    questions: [
      'What are the key consumer personas?',
      'Does what is shared resonate with these key buyers?',
      'What message are they looking for?',
    ]
  },
  {
    id: 'competitors',
    title: 'Competitive Analysis',
    description: 'Analyze competitor strategies and market position',
    questions: [
      'Who are your main competitors?',
      'What are their key differentiators?',
      'What market share do they hold?',
      'What are their strengths and weaknesses?'
    ]
  },
  {
    id: 'Colleagues',
    title: 'Colleague Personas',
    description: 'Leverage knowledge from internal stakeholders',
    questions: [
      'Which departments should be consulted?',
      'What internal data sources are available?',
      'What institutional knowledge exists?',
      'How will internal insights be validated?'
    ]
  },
  {
    id: 'cultural',
    title: 'Cultural Personas',
    description: 'Understand cultural trends and influences',
    questions: [
      'What cultural trends are relevant?',
      'How do cultural factors influence behavior?',
      'What cultural segments should be analyzed?',
      'What cultural barriers might exist?'
    ]
  },
  {
    id: 'social',
    title: 'Social Listening',
    description: 'Social Listening monitored by agents will be added in the future.',
    questions: []
  },
  {
    id: 'Wisdom',
    title: 'Wisdom',
    description: 'Add your insights about brands, markets, flavors, consumers and any other insights that would help build a better foundation for results. This will also be deployed as a mobile app soon.',
    questions: [
      'Input Method',
      'Share Your Wisdom'
    ]
  },
  {
    id: 'Grade',
    title: 'Segment Testing',
    description: 'Score hypotheses against target segments',
    questions: [
      'What segments have been identified?',
      'What hypotheses need grading?',
      'What grading methodology will be used?',
      'What success metrics are defined?'
    ]
  },
  {
    id: 'Findings',
    title: 'Findings',
    description: 'Save iteration or create comprehensive findings report',
    questions: [
      'Save Iteration or Summarize',
      'Which files should we include in our findings?',
      'Output Options',
      'Save or Download'
    ]
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Review all my saved files and execution results',
    questions: [
      'Review all saved files',
      'Validate results accuracy',
      'Make final adjustments if needed'
    ]
  }
];

/**
 * Get content for a specific step by ID
 */
export function getStepContent(stepId: string): StepContent | undefined {
  return stepContentData.find(step => step.id === stepId);
}

/**
 * Get all step IDs
 */
export function getAllStepIds(): string[] {
  return stepContentData.map(step => step.id);
}

/**
 * Get steps with questions (excluding empty question arrays)
 */
export function getStepsWithQuestions(): StepContent[] {
  return stepContentData.filter(step => step.questions.length > 0);
}
