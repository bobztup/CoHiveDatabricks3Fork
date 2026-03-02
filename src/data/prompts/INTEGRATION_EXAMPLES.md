# CoHive Prompt System - Integration Examples

How to integrate the prompt system with existing CoHive components.

## Integration with CentralHexView

Update `CentralHexView.tsx` to use the prompt system:

```typescript
import { PromptManager, PromptContext } from '../data/prompts';

export function CentralHexView({ hexId, onBack, onExecute }: CentralHexViewProps) {
  const [responses, setResponses] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [assessmentType, setAssessmentType] = useState<string[]>(['unified']);
  
  const promptManager = PromptManager.getInstance();
  
  const handleExecute = async () => {
    // Build context from component state
    const context: PromptContext = {
      hexId: hexId as any,
      trigger: 'execute',
      brand: localStorage.getItem('cohive_brand') || undefined,
      projectType: (localStorage.getItem('cohive_project_type') as any) || undefined,
      userRole: isResearcher ? 'researcher' : 'non-researcher',
      assessmentType: assessmentType as any,
      selectedFiles,
      selectedPersonas,
      questionResponses: responses,
      // Add hex-specific context
      selectedCompetitor: hexId === 'Competitors' ? selectedCompetitor : undefined,
      synthesisSelections: hexId === 'Knowledge Base' ? synthesisSelections : undefined
    };
    
    // Generate prompt
    const prompt = promptManager.generate(
      hexId as any,
      'execute',
      context
    );
    
    console.log('Generated prompt:', prompt);
    
    // Send to Databricks
    await sendToDatabricks(prompt);
    
    // Trigger any callbacks
    onExecute?.(prompt);
  };
  
  const handleSave = () => {
    const context: PromptContext = {
      hexId: hexId as any,
      trigger: 'save',
      brand: localStorage.getItem('cohive_brand') || undefined,
      projectType: (localStorage.getItem('cohive_project_type') as any) || undefined,
      selectedFiles,
      selectedPersonas,
      questionResponses: responses,
      chainResults: getChainResultsFromHistory() // Get previous hex results
    };
    
    const prompt = promptManager.generate(hexId as any, 'save', context);
    
    // Generate markdown report and save
    generateAndSaveReport(prompt);
  };
  
  const handleDownload = () => {
    const context: PromptContext = {
      hexId: hexId as any,
      trigger: 'download',
      brand: localStorage.getItem('cohive_brand') || undefined,
      projectType: (localStorage.getItem('cohive_project_type') as any) || undefined,
      selectedFiles,
      selectedPersonas,
      questionResponses: responses,
      chainResults: getChainResultsFromHistory()
    };
    
    const prompt = promptManager.generate(hexId as any, 'download', context);
    
    // Generate JSON export
    generateAndDownloadJSON(prompt);
  };
  
  // Rest of component...
}
```

## Integration with ProcessWireframe

Add prompt generation to the main workflow controller:

```typescript
import { PromptManager, PromptContext, PromptChain } from '../data/prompts';

export function ProcessWireframe() {
  const [hexExecutionHistory, setHexExecutionHistory] = useState<Record<string, any>>({});
  
  const promptManager = PromptManager.getInstance();
  
  const executeHexChain = async (hexIds: string[]) => {
    // Create custom chain
    const templateIds = hexIds.map(hexId => 
      `${hexId.toLowerCase().replace(/\s+/g, '_')}_execute_unified`
    );
    
    const chain = promptManager.createCustomChain('user_workflow', templateIds);
    
    // Build initial context
    const initialContext: PromptContext = {
      hexId: hexIds[0] as any,
      trigger: 'execute',
      brand: currentBrand,
      projectType: currentProjectType,
      userRole: isResearcher ? 'researcher' : 'non-researcher',
      allHexResponses: hexExecutionHistory
    };
    
    // Execute chain
    const results = await chain.execute(initialContext, async (prompt, stepIndex) => {
      const hexId = hexIds[stepIndex];
      console.log(`Executing ${hexId}...`);
      
      // Send to Databricks
      const result = await sendToDatabricks(prompt);
      
      // Update history
      setHexExecutionHistory(prev => ({
        ...prev,
        [hexId]: {
          prompt,
          result,
          timestamp: Date.now()
        }
      }));
      
      return result;
    });
    
    return results;
  };
  
  // Rest of component...
}
```

## Integration with DatabricksFileBrowser

Use prompts when files are selected:

```typescript
import { PromptManager } from '../data/prompts';

export function DatabricksFileBrowser({ onFilesSelected, hexId }: Props) {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const promptManager = PromptManager.getInstance();
  
  const handleAnalyzeFiles = () => {
    const context: PromptContext = {
      hexId: hexId as any,
      trigger: 'execute',
      selectedFiles,
      assessmentType: ['assess'],
      brand: getCurrentBrand(),
      projectType: getCurrentProjectType()
    };
    
    const prompt = promptManager.generate(hexId as any, 'execute', context);
    
    onFilesSelected(selectedFiles, prompt);
  };
  
  // Rest of component...
}
```

## Action Hex - Findings Report

Special handling for the final Action hex:

```typescript
import { PromptManager } from '../data/prompts';

export function ActionHexView() {
  const promptManager = PromptManager.getInstance();
  
  const generateFindingsReport = async () => {
    // Collect all hex responses
    const allHexResponses = getAllHexResponsesFromStorage();
    
    const context: PromptContext = {
      hexId: 'Action',
      trigger: 'execute',
      brand: currentBrand,
      projectType: currentProjectType,
      userRole: currentUserRole,
      allHexResponses,
      chainResults: Object.values(allHexResponses).map((r: any) => r.result)
    };
    
    const prompt = promptManager.generate('Action', 'execute', context);
    
    // Send to Databricks for final synthesis
    const findingsReport = await sendToDatabricks(prompt);
    
    return findingsReport;
  };
  
  const downloadCompleteProject = () => {
    const context: PromptContext = {
      hexId: 'Action',
      trigger: 'download',
      brand: currentBrand,
      projectType: currentProjectType,
      allHexResponses: getAllHexResponsesFromStorage()
    };
    
    const prompt = promptManager.generate('Action', 'download', context);
    
    // This generates a prompt that creates complete export JSON
    generateCompleteExport(prompt);
  };
  
  const recommendNextSteps = async () => {
    const context: PromptContext = {
      hexId: 'Action',
      trigger: 'recommend',
      brand: currentBrand,
      projectType: currentProjectType,
      allHexResponses: getAllHexResponsesFromStorage()
    };
    
    const prompt = promptManager.generate('Action', 'recommend', context);
    
    // Get AI recommendations for what to analyze next
    const recommendations = await sendToDatabricks(prompt);
    
    return recommendations;
  };
  
  // Rest of component...
}
```

## Knowledge Base - New Synthesis

Special integration for synthesis mode:

```typescript
import { PromptManager } from '../data/prompts';

export function KnowledgeBaseView() {
  const [synthesisMode, setSynthesisMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedHexes, setSelectedHexes] = useState<string[]>([]);
  const [selectedExecutions, setSelectedExecutions] = useState<string[]>([]);
  
  const promptManager = PromptManager.getInstance();
  
  const handleExecuteSynthesis = async () => {
    const context: PromptContext = {
      hexId: 'Knowledge Base',
      trigger: 'execute',
      brand: currentBrand,
      projectType: currentProjectType,
      userRole: currentUserRole,
      synthesisSelections: {
        projects: selectedProjects,
        hexes: selectedHexes,
        executions: selectedExecutions
      }
    };
    
    // This will automatically use the synthesis-specific prompt
    const prompt = promptManager.generate('Knowledge Base', 'execute', context);
    
    const synthesisResult = await sendToDatabricks(prompt);
    
    return synthesisResult;
  };
  
  // Rest of component...
}
```

## Competitors Hex - War Games Mode

Automatic War Games detection:

```typescript
import { PromptManager } from '../data/prompts';

export function CompetitorsView({ projectType }: Props) {
  const promptManager = PromptManager.getInstance();
  
  const handleExecute = async () => {
    const context: PromptContext = {
      hexId: 'Competitors',
      trigger: 'execute',
      projectType, // If 'War Games', special prompts will be used
      brand: currentBrand,
      selectedCompetitor,
      competitorAnalysisType: projectType !== 'War Games' ? analysisType : undefined,
      selectedFiles,
      assessmentType: ['unified']
    };
    
    // Prompt automatically adapts to War Games mode
    const prompt = promptManager.generate('Competitors', 'execute', context);
    
    await sendToDatabricks(prompt);
  };
  
  // Rest of component...
}
```

## Custom Workflows with Chains

Create custom multi-hex workflows:

```typescript
import { PromptManager, PromptChain } from '../data/prompts';

export function CustomWorkflowBuilder() {
  const promptManager = PromptManager.getInstance();
  
  const executeResearchWorkflow = async () => {
    // Research-focused workflow: KB → External Experts → Buyers → Action
    const chain = promptManager.createCustomChain('research_workflow', [
      'knowledge_base_execute_unified',
      'external_experts_execute_unified',
      'buyers_execute_unified',
      'action_execute'
    ]);
    
    const results = await chain.execute(initialContext, sendToDatabricks);
    
    return results;
  };
  
  const executeCompetitiveWorkflow = async () => {
    // Competitive workflow: KB → Competitors → Test Segments → Action
    const chain = promptManager.createCustomChain('competitive_workflow', [
      'knowledge_base_execute_unified',
      'competitors_execute_unified',
      'test_segments_execute_unified',
      'action_execute'
    ]);
    
    const results = await chain.execute(initialContext, sendToDatabricks);
    
    return results;
  };
  
  // Rest of component...
}
```

## Preview Mode for Testing

Add preview functionality to your UI:

```typescript
import { PromptManager } from '../data/prompts';

export function PromptPreviewPanel({ hexId, trigger, assessmentType }: Props) {
  const [preview, setPreview] = useState('');
  const promptManager = PromptManager.getInstance();
  
  useEffect(() => {
    const previewText = promptManager.preview(
      hexId as any,
      trigger as any,
      assessmentType as any
    );
    setPreview(previewText);
  }, [hexId, trigger, assessmentType]);
  
  return (
    <div className="prompt-preview">
      <h3>Prompt Preview</h3>
      <pre>{preview}</pre>
    </div>
  );
}
```

## Utility Functions

Helper functions for common operations:

```typescript
import { PromptManager, PromptContext } from '../data/prompts';

// Get current brand from localStorage
function getCurrentBrand(): string | undefined {
  return localStorage.getItem('cohive_brand') || undefined;
}

// Get current project type
function getCurrentProjectType(): any {
  return (localStorage.getItem('cohive_project_type') as any) || undefined;
}

// Get user role (from template or default)
function getCurrentUserRole(): 'researcher' | 'non-researcher' {
  const template = localStorage.getItem('cohive_current_template');
  if (template) {
    const parsed = JSON.parse(template);
    return parsed.role || 'researcher';
  }
  return 'researcher';
}

// Build base context from current state
function buildBaseContext(hexId: string): PromptContext {
  return {
    hexId: hexId as any,
    brand: getCurrentBrand(),
    projectType: getCurrentProjectType(),
    userRole: getCurrentUserRole()
  };
}

// Get all hex responses from execution history
function getAllHexResponsesFromStorage(): Record<string, any> {
  const history = localStorage.getItem('cohive_hex_executions');
  if (!history) return {};
  return JSON.parse(history);
}

// Get chain results (just the outputs)
function getChainResultsFromHistory(): string[] {
  const history = getAllHexResponsesFromStorage();
  return Object.values(history).map((h: any) => h.result || '');
}

// Send prompt to Databricks (mock implementation)
async function sendToDatabricks(prompt: string): Promise<string> {
  console.log('Sending to Databricks:', prompt);
  
  // Replace with actual Databricks API call
  // const response = await fetch('/api/databricks/execute', {
  //   method: 'POST',
  //   body: JSON.stringify({ prompt }),
  //   headers: { 'Content-Type': 'application/json' }
  // });
  // return await response.text();
  
  // Mock response for development
  return `Mock response for: ${prompt.substring(0, 50)}...`;
}

// Generate and save markdown report
function generateAndSaveReport(prompt: string) {
  // Send prompt to Databricks to generate markdown
  sendToDatabricks(prompt).then(markdown => {
    // Save to localStorage or download
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cohive-report.md';
    a.click();
  });
}

// Generate and download JSON export
function generateAndDownloadJSON(prompt: string) {
  // Send prompt to Databricks to generate JSON
  sendToDatabricks(prompt).then(jsonStr => {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cohive-export.json';
    a.click();
  });
}
```

## TypeScript Type Guards

Add type safety helpers:

```typescript
import { HexId, TriggerType, AssessmentType } from '../data/prompts';

function isValidHexId(hexId: string): hexId is HexId {
  const validHexIds: HexId[] = [
    'Launch', 'External Experts', 'Panel Homes', 'Buyers',
    'Competitors', 'Colleagues', 'Knowledge Base',
    'Test Against Segments', 'Action'
  ];
  return validHexIds.includes(hexId as HexId);
}

function isValidTrigger(trigger: string): trigger is TriggerType {
  return ['execute', 'save', 'download', 'recommend'].includes(trigger);
}

function isValidAssessmentType(type: string): type is AssessmentType {
  return ['assess', 'recommend', 'unified'].includes(type);
}

// Usage
if (isValidHexId(userInput) && isValidTrigger(triggerInput)) {
  const prompt = promptManager.generate(userInput, triggerInput, context);
}
```

---

These examples show how to integrate the prompt system throughout your CoHive application. The system is designed to work seamlessly with your existing component architecture while providing powerful, composable prompt generation capabilities.
