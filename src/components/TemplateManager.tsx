import { Settings, User, Database, Save, X, Plus, Edit2, Check } from 'lucide-react';
import { useState } from 'react';
// BJS: ModelSelector for global model setting in the template panel
import { ModelSelector } from './ModelSelector';

export interface UserTemplate {
  id: string;
  name: string;
  description: string;
  // BJS: Added 'data-scientist' to role union type.
  // Same base access level as research-analyst per spec.
  role: 'administrator' | 'research-analyst' | 'research-leader' | 'marketing-manager' | 'product-manager' | 'executive-stakeholder' | 'data-scientist';
  visibleSteps: string[];
  questionConfig: {
    [stepId: string]: {
      visibleQuestions: number[];
      defaultResponses: { [questionIndex: number]: string };
      requiredQuestions: number[];
    };
  };
  databricksInstructions: {
    [stepId: string]: string;
  };
  permissions: {
    canEditTemplates: boolean;
    canApproveResearch: boolean;
    canViewAllProjects: boolean;
    canExportData: boolean;
  };
}

interface TemplateManagerProps {
  currentTemplate: UserTemplate;
  availableTemplates: UserTemplate[];
  onTemplateChange: (templateId: string) => void;
  onTemplateUpdate: (template: UserTemplate) => void;
  onTemplateCreate: (template: UserTemplate) => void;
  userRole?: string;   // BJS: for ModelSelector role gate
  userEmail?: string;  // BJS: for ModelSelector persistence
}

export function TemplateManager({
  currentTemplate,
  availableTemplates,
  onTemplateChange,
  onTemplateUpdate,
  onTemplateCreate,
  userRole = 'research-analyst',
  userEmail = '',
}: TemplateManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'select' | 'edit' | 'create'>('select');
  const [editingTemplate, setEditingTemplate] = useState<UserTemplate | null>(null);

  const handleEdit = (template: UserTemplate) => {
    setEditingTemplate({ ...template });
    setViewMode('edit');
  };

  const handleCreateNew = () => {
    const newTemplate: UserTemplate = {
      id: Date.now().toString(),
      name: 'New Template',
      description: 'Template description',
      role: 'marketing-manager',
      visibleSteps: ['Enter', 'research', 'Findings'],
      questionConfig: {},
      databricksInstructions: {},
      permissions: {
        canEditTemplates: false,
        canApproveResearch: false,
        canViewAllProjects: false,
        canExportData: false
      }
    };
    setEditingTemplate(newTemplate);
    setViewMode('create');
  };

  const handleSave = () => {
    if (editingTemplate) {
      if (viewMode === 'create') {
        onTemplateCreate(editingTemplate);
      } else {
        onTemplateUpdate(editingTemplate);
      }
      setViewMode('select');
      setEditingTemplate(null);
    }
  };

  if (!isOpen) {
    return (
      <button
        className="px-4 py-2 border-2 border-gray-400 bg-white text-gray-700 rounded flex items-center gap-2 hover:bg-gray-50"
        onClick={() => setIsOpen(true)}
      >
        <Settings className="w-4 h-4" />
        Template Settings
      </button>
    );
  }

  return (
    <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl w-full max-w-[128rem] max-h-[90vh] overflow-hidden flex flex-col border-2 border-gray-300 z-50">
      <div className="border-b-2 border-gray-300 p-6 flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 leading-tight">User Template Management</h2>
          <p className="text-gray-600 text-sm">Configure user roles, permissions, and workflow customization</p>
        </div>
        <button
          className="p-2 hover:bg-gray-100 rounded"
          onClick={() => { setIsOpen(false); setViewMode('select'); setEditingTemplate(null); }}
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {viewMode === 'select' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900">Available Templates</h3>
              {currentTemplate.permissions.canEditTemplates && (
                <button
                  className="px-3 py-1.5 bg-blue-600 text-white rounded flex items-center gap-2 hover:bg-blue-700 text-sm"
                  onClick={handleCreateNew}
                >
                  <Plus className="w-4 h-4" />
                  Create New Template
                </button>
              )}
            </div>

            {/* BJS: Global model selector — always visible in settings.
                ModelSelector self-gates: Admins and Data Scientists get the
                full change UI; all other roles see a read-only display. */}
            <div className="border-2 border-gray-200 rounded-lg p-4 mb-2">
              <ModelSelector
                userRole={userRole}
                userEmail={userEmail}
                variant="full"
                label="AI Model (Global Default)"
              />
            </div>
            <div className="space-y-3">
              {availableTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => { if (template.id !== currentTemplate.id) onTemplateChange(template.id); }}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    template.id === currentTemplate.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-25'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="radio"
                        name="template-selection"
                        checked={template.id === currentTemplate.id}
                        onChange={() => onTemplateChange(template.id)}
                        className="w-5 h-5 text-blue-600 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-gray-900 font-semibold">{template.name}</h4>
                          {/* BJS: data-scientist classified as Researcher alongside
                              research-analyst and research-leader */}
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            ['administrator', 'research-analyst', 'research-leader', 'data-scientist'].includes(template.role)
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {['administrator', 'research-analyst', 'research-leader', 'data-scientist'].includes(template.role) ? 'Researcher' : 'Non-Researcher'}
                          </span>
                          {template.id === currentTemplate.id && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            {template.visibleSteps.length} visible steps
                          </span>
                          {template.permissions.canApproveResearch && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">Can approve research</span>
                          )}
                          {template.permissions.canEditTemplates && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">Can edit templates</span>
                          )}
                          {template.permissions.canViewAllProjects && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">View all projects</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {currentTemplate.permissions.canEditTemplates && (
                        <button
                          className="px-3 py-1.5 border-2 border-gray-400 bg-white text-gray-700 rounded hover:bg-gray-50 text-sm"
                          onClick={(e) => { e.stopPropagation(); handleEdit(template); }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(viewMode === 'edit' || viewMode === 'create') && editingTemplate && (
          <div className="space-y-6">
            <div>
              <h3 className="text-gray-900 mb-4">
                {viewMode === 'create' ? 'Create New Template' : 'Edit Template'}
              </h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-gray-700 mb-1 text-sm">Template Name</label>
                  <input
                    type="text"
                    className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 text-sm">Description</label>
                  <textarea
                    className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 resize-none focus:outline-none focus:border-blue-500"
                    rows={2}
                    value={editingTemplate.description}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 text-sm">User Role</label>
                  {/* BJS: Added Data Scientist option to role dropdown */}
                  <select
                    className="w-full border-2 border-gray-300 bg-white rounded p-2 text-gray-700 focus:outline-none focus:border-blue-500"
                    value={editingTemplate.role}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, role: e.target.value as UserTemplate['role'] })}
                  >
                    <option value="administrator">Administrator</option>
                    <option value="research-analyst">Research Analyst</option>
                    <option value="research-leader">Research Leader</option>
                    <option value="data-scientist">Data Scientist</option>
                    <option value="marketing-manager">Marketing Manager</option>
                    <option value="product-manager">Product Manager</option>
                    <option value="executive-stakeholder">Executive / Stakeholder</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-gray-900 mb-2">Visible Workflow Steps</h4>
                <div className="grid grid-cols-3 gap-2">
                  {['Enter', 'research', 'Luminaries', 'panelist', 'Consumers', 'competitors', 'Colleagues', 'cultural', 'social', 'Wisdom', 'Grade', 'Findings'].map((step) => {
                    const isAlwaysVisible = step === 'research' || step === 'Wisdom';
                    return (
                      <label
                        key={step}
                        className={`flex items-center gap-2 p-2 border-2 rounded ${
                          isAlwaysVisible
                            ? 'border-green-300 bg-green-50 cursor-not-allowed'
                            : 'border-gray-300 cursor-pointer hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isAlwaysVisible || editingTemplate.visibleSteps.includes(step)}
                          disabled={isAlwaysVisible}
                          onChange={(e) => {
                            if (!isAlwaysVisible) {
                              setEditingTemplate({
                                ...editingTemplate,
                                visibleSteps: e.target.checked
                                  ? [...editingTemplate.visibleSteps, step]
                                  : editingTemplate.visibleSteps.filter(s => s !== step)
                              });
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className={`text-sm capitalize ${isAlwaysVisible ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
                          {step === 'research' ? 'Knowledge Base' : step}
                          {isAlwaysVisible && <span className="text-xs ml-1">(Always On)</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-gray-900 mb-2">Permissions</h4>
                <div className="space-y-2">
                  {[
                    { key: 'canEditTemplates', label: 'Can edit templates' },
                    { key: 'canApproveResearch', label: 'Can approve research files' },
                    { key: 'canViewAllProjects', label: 'Can view all projects' },
                    { key: 'canExportData', label: 'Can export data to Databricks' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTemplate.permissions[key as keyof typeof editingTemplate.permissions]}
                        onChange={(e) => setEditingTemplate({
                          ...editingTemplate,
                          permissions: { ...editingTemplate.permissions, [key]: e.target.checked }
                        })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-gray-600" />
                  <h4 className="text-gray-900">Databricks Instructions</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Define what data and instructions are sent to Databricks for each step
                </p>
                <div className="space-y-3">
                  {editingTemplate.visibleSteps.map((step) => (
                    <div key={step} className="border-2 border-gray-300 rounded p-3">
                      <label className="block text-sm text-gray-900 mb-1 capitalize">{step} Step</label>
                      <textarea
                        className="w-full border-2 border-gray-300 bg-white rounded p-2 text-sm text-gray-700 resize-none focus:outline-none focus:border-blue-500"
                        rows={2}
                        placeholder={`Instructions for ${step} step processing...`}
                        value={editingTemplate.databricksInstructions[step] || ''}
                        onChange={(e) => setEditingTemplate({
                          ...editingTemplate,
                          databricksInstructions: { ...editingTemplate.databricksInstructions, [step]: e.target.value }
                        })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t-2 border-gray-300">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                onClick={handleSave}
              >
                <Save className="w-4 h-4" />
                Save Template
              </button>
              <button
                className="px-4 py-2 border-2 border-gray-400 bg-white text-gray-700 rounded hover:bg-gray-50"
                onClick={() => { setViewMode('select'); setEditingTemplate(null); }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Default templates for initialization
export const defaultTemplates: UserTemplate[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full access to all features, template management, and research approval',
    role: 'administrator',
    visibleSteps: ['Enter', 'research', 'Luminaries', 'panelist', 'Consumers', 'competitors', 'Colleagues', 'cultural', 'social', 'Wisdom', 'Grade', 'Findings'],
    questionConfig: {
      Enter: { visibleQuestions: [0, 1], defaultResponses: {}, requiredQuestions: [0, 1] }
    },
    databricksInstructions: {
      Enter: 'Initialize project in Databricks workspace. Create project directory and metadata tables.',
      research: 'Process uploaded research files. Extract insights using NLP models. Store in Delta tables.',
      Findings: 'Generate final report. Execute recommendation models. Export to presentation format.'
    },
    permissions: { canEditTemplates: true, canApproveResearch: false, canViewAllProjects: true, canExportData: true }
  },
  {
    id: 'researcher',
    name: 'Research Analyst',
    description: 'Research-focused template with file management and approval capabilities',
    role: 'research-analyst',
    visibleSteps: ['Enter', 'research', 'Luminaries', 'Consumers', 'competitors', 'Wisdom', 'Grade', 'Findings'],
    questionConfig: {
      Enter: { visibleQuestions: [0, 1], defaultResponses: {}, requiredQuestions: [0, 1] },
      research: { visibleQuestions: [0, 1, 2, 3], defaultResponses: { 0: 'Mixed methods: surveys, interviews, and data analysis' }, requiredQuestions: [0, 1] }
    },
    databricksInstructions: {
      Enter: 'Create research project. Initialize data pipeline.',
      research: 'Upload and process research files. Run analysis workflows. Generate insights dashboard.',
      Luminaries: 'Process expert interview transcripts. Extract key themes.',
      Findings: 'Compile research findings. Generate executive summary.'
    },
    permissions: { canEditTemplates: false, canApproveResearch: false, canViewAllProjects: true, canExportData: true }
  },
  {
    id: 'research-leader',
    name: 'Research Leader',
    description: 'Senior research role with full read/edit/approve capabilities for all research assets',
    role: 'research-leader',
    visibleSteps: ['Enter', 'research', 'Luminaries', 'panelist', 'Consumers', 'competitors', 'Colleagues', 'Wisdom', 'Grade', 'Findings'],
    questionConfig: {
      Enter: { visibleQuestions: [0, 1], defaultResponses: {}, requiredQuestions: [0, 1] },
      research: { visibleQuestions: [0, 1, 2, 3], defaultResponses: {}, requiredQuestions: [0, 1] }
    },
    databricksInstructions: {
      Enter: 'Initialize research leadership project. Setup oversight dashboards.',
      research: 'Full access to read, edit, and approve all synthesis and persona files. Manage research quality.',
      Luminaries: 'Review and approve luminaries insights. Validate research quality.',
      Findings: 'Compile comprehensive research findings. Generate leadership reports.'
    },
    permissions: { canEditTemplates: false, canApproveResearch: true, canViewAllProjects: true, canExportData: true }
  },
  // BJS: Data Scientist template — same base access as Research Analyst.
  // Permissions: KB read/upload, run assessments, view/save gems,
  // Wisdom hex (interviews), model settings (swappable models).
  // canExportData: true — Data Scientists need direct Databricks access.
  // Model settings gate: check role === 'data-scientist' || role === 'administrator'
  // in the model selector UI once swappable models feature is built.
  {
    id: 'data-scientist',
    name: 'Data Scientist',
    description: 'Data-focused research role with KB access, assessments, gems, interviews, and model settings',
    role: 'data-scientist',
    visibleSteps: ['Enter', 'research', 'Luminaries', 'Consumers', 'Wisdom', 'Grade', 'Findings'],
    questionConfig: {
      Enter: { visibleQuestions: [0, 1], defaultResponses: {}, requiredQuestions: [0, 1] },
      research: { visibleQuestions: [0, 1, 2, 3], defaultResponses: {}, requiredQuestions: [0, 1] }
    },
    databricksInstructions: {
      Enter: 'Initialize data science project. Setup experiment tracking and model versioning.',
      research: 'Upload and process research files. Run statistical analysis workflows. Access raw Delta tables.',
      Luminaries: 'Analyze expert perspectives. Extract quantifiable insights and patterns.',
      Consumers: 'Run buyer segment analysis. Generate statistical persona profiles.',
      Wisdom: 'Conduct AI interviews. Capture and structure qualitative insights for modelling.',
      Grade: 'Run scoring and hypothesis validation. Generate statistical significance reports.',
      Findings: 'Compile data-driven findings. Export structured results to Databricks Delta tables.'
    },
    permissions: { canEditTemplates: false, canApproveResearch: false, canViewAllProjects: true, canExportData: true }
  },
  {
    id: 'marketing-manager',
    name: 'Marketing Manager',
    description: 'Marketing-focused template with consumer insights and competitive analysis',
    role: 'marketing-manager',
    visibleSteps: ['Enter', 'research', 'Grade', 'cultural', 'Colleagues', 'panelist', 'Luminaries', 'Consumers', 'competitors', 'social', 'Wisdom', 'Findings'],
    questionConfig: {
      Enter: { visibleQuestions: [0, 1], defaultResponses: {}, requiredQuestions: [0, 1] },
      Consumers: { visibleQuestions: [0, 1, 2], defaultResponses: {}, requiredQuestions: [0, 1] },
      competitors: { visibleQuestions: [0, 1, 2], defaultResponses: {}, requiredQuestions: [0, 1] }
    },
    databricksInstructions: {
      Enter: 'Initialize marketing campaign project.',
      research: 'Access approved research reports for brand.',
      Consumers: 'Run buyer persona analysis. Generate segment profiles.',
      competitors: 'Execute competitive intelligence queries. Update market share models.',
      social: 'Process social media sentiment. Generate trending topics report.',
      Findings: 'Create marketing strategy recommendations. Export to PowerPoint.'
    },
    permissions: { canEditTemplates: false, canApproveResearch: false, canViewAllProjects: false, canExportData: true }
  },
  {
    id: 'product-manager',
    name: 'Product Manager',
    description: 'Product development template with testing and user insights focus',
    role: 'product-manager',
    visibleSteps: ['Enter', 'research', 'panelist', 'Consumers', 'Wisdom', 'Grade', 'Findings'],
    questionConfig: {
      Enter: { visibleQuestions: [0, 1], defaultResponses: { 1: 'Product Development' }, requiredQuestions: [0, 1] },
      Grade: { visibleQuestions: [0, 1, 2, 3], defaultResponses: {}, requiredQuestions: [0, 1, 2] }
    },
    databricksInstructions: {
      Enter: 'Create product development project. Setup experiment tracking.',
      research: 'Load product research files. Access customer feedback data.',
      panelist: 'Analyze panel home usage data. Generate product adoption metrics.',
      Consumers: 'Process user research interviews. Extract feature requests.',
      Grade: 'Run A/B test analysis. Generate statistical significance reports.',
      Findings: 'Create product roadmap recommendations. Export feature priorities.'
    },
    permissions: { canEditTemplates: false, canApproveResearch: false, canViewAllProjects: false, canExportData: true }
  },
  {
    id: 'executive',
    name: 'Executive / Stakeholder',
    description: 'High-level view with focus on insights and action planning',
    role: 'executive-stakeholder',
    visibleSteps: ['Enter', 'research', 'Wisdom', 'Findings'],
    questionConfig: {
      Enter: { visibleQuestions: [0, 1], defaultResponses: {}, requiredQuestions: [0, 1] },
      Findings: { visibleQuestions: [0, 1, 2], defaultResponses: {}, requiredQuestions: [0, 1] }
    },
    databricksInstructions: {
      Enter: 'Initialize executive briefing project.',
      research: 'Access high-level research summaries and insights.',
      Findings: 'Generate executive summary. Create strategic recommendations deck.'
    },
    permissions: { canEditTemplates: false, canApproveResearch: false, canViewAllProjects: true, canExportData: false }
  }
];
