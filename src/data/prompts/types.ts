/**
 * CoHive Prompt System - Type Definitions
 * Core types for the prompt template system
 */

export type HexId = 
  | 'Launch'
  | 'External Experts'
  | 'Panel Homes'
  | 'Buyers'
  | 'Competitors'
  | 'Colleagues'
  | 'Knowledge Base'
  | 'Test Against Segments'
  | 'Action';

export type TriggerType = 'execute' | 'save' | 'download' | 'recommend';

export type UserRole = 'researcher' | 'non-researcher';

export type AssessmentType = 'assess' | 'recommend' | 'unified';

export type ProjectType = 
  | 'Product Innovation'
  | 'War Games'
  | 'Brand Strategy'
  | 'Customer Experience'
  | 'Other';

export interface PromptContext {
  // Core identifiers
  hexId: HexId;
  trigger?: TriggerType;
  
  // Project info
  brand?: string;
  projectType?: ProjectType;
  userRole?: UserRole;
  
  // File selections
  selectedFiles?: string[];
  
  // Persona selections (for External Experts, Panel Homes, Buyers, Colleagues, Test Against Segments)
  selectedPersonas?: string[];
  selectedL1Categories?: string[];
  selectedL2Categories?: string[];
  
  // Assessment configuration
  assessmentType?: AssessmentType[];
  
  // User responses (question answers from hex content)
  questionResponses?: string[];
  
  // Competitor-specific
  selectedCompetitor?: string;
  competitorAnalysisType?: string;
  
  // Knowledge Base specific
  synthesisSelections?: {
    projects?: string[];
    hexes?: string[];
    executions?: string[];
  };
  
  // Chain support
  previousOutput?: string;
  chainResults?: string[];
  allHexResponses?: Record<string, any>;
  
  // Locale
  locale?: string;
}

export interface PromptPart {
  id: string;
  roles?: UserRole[];
  generate(context: PromptContext, locale?: string): string;
}

export interface PromptTemplateConfig {
  id: string;
  hexId: HexId;
  trigger: TriggerType;
  parts: PromptPart[];
  separator?: string;
}
