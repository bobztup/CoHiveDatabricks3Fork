# CoHive Development Guidelines

## Overview

CoHive is an AI tool interface that runs on Databricks, featuring a unique hexagonal breadcrumb navigation system. This guide provides development standards and best practices for maintaining consistency across the application.

---

## Design System

**Location:** `/styles/cohive-theme.ts`

**Documentation:** `/styles/cohive-design-system.md`

**Visual Guide:** `/components/DesignSystemGuide.tsx`

### Using the Design System

Always import design tokens from the centralized theme file:

```typescript
import { 
  colors, 
  stepColors, 
  hexagon, 
  spacing,
  getStepColor,
  getHexStateStyles 
} from '../styles/cohive-theme';
```

### Key Principles

1. **Never hardcode colors** - Always use design tokens
2. **Use semantic naming** - Colors should indicate purpose (e.g., `colors.hex.active`)
3. **Maintain consistency** - All hexagons should use the same size variants
4. **Follow spacing scale** - Use defined spacing values, not arbitrary pixels

---

## Component Structure

### Hexagon Components

All hexagons should:
- Import from `/components/HexagonBreadcrumb.tsx`
- Use colors from `stepColors` object
- Support three states: `completed`, `active`, `upcoming`
- Include proper click handlers for navigation
- Use size variants: `small`, `medium`, `large`

Example:
```tsx
<HexagonBreadcrumb
  label="Enter"
  color={stepColors.Enter}
  status="active"
  size="medium"
  onClick={() => handleNavigation('Enter')}
/>
```

### Template System

Templates control:
- User roles (researcher vs non-researcher)
- Workflow step visibility
- Default responses for each step
- Data sent to Databricks

**Location:** `/components/TemplateManager.tsx`

---

## Workflow Logic

### Core Rules

1. **Enter is always first** - Required to start any workflow
2. **Action is always last** - Requires at least one other step completed
3. **All middle steps are optional** - Can be used multiple times
4. **Steps can be revisited** - Direct hex-to-hex navigation

### Step Categories

**Fixed Steps:**
- Enter (start)
- Action (end)

**Optional Steps (repeatable):**
- Research
- Luminaries
- Panelist
- Consumers
- Competitors
- Colleagues
- Cultural Voices
- Social Voices
- Wisdom (crowdsource insights)
- Grade

---

## File Organization

```
/
├── components/
│   ├── HexagonBreadcrumb.tsx      # Core hex component
│   ├── ProcessFlow.tsx             # Hex cluster layout
│   ├── ProcessWireframe.tsx        # Main application logic
│   ├── CentralHexView.tsx          # 3-step workflow view
│   ├── ResearchView.tsx            # Research file management
│   ├── TemplateManager.tsx         # Template system
│   ├── DesignSystemGuide.tsx       # Design system reference
│   └── ui/                         # shadcn/ui components
│
├── data/
│   ├── exampleResearchFiles.ts     # Example test data for research files
│   ├── stepContentData.ts          # Hexagon content definitions
│   └── prompts/                    # AI prompt templates
│
├── styles/
│   ├── cohive-theme.ts             # Design system tokens
│   ├── cohive-design-system.md     # Design documentation
│   └── globals.css                 # Global CSS styles
│
└── guidelines/
    └── Guidelines.md               # This file
```

### Data Files

Example and test data are now organized in separate files:

- **`/data/exampleResearchFiles.ts`**: Contains mock research files for Nike and Adidas brands, covering multiple project types (Creative Messaging, Product Launch, War Games, Packaging) and workflow hexagons (Luminaries, Panelist, Consumers, etc.)

- **`/data/stepContentData.ts`**: Contains content definitions for each hexagon, including titles, descriptions, and questions. Import this instead of defining step content inline.

**Usage:**
```typescript
import { exampleResearchFiles } from '../data/exampleResearchFiles';
import { stepContentData, type StepContent } from '../data/stepContentData';
```

---

## State Management

### LocalStorage Keys

All data is persisted using these keys:
- `cohive_responses` - User responses for each step
- `cohive_templates` - Custom templates
- `cohive_current_template` - Active template selection
- `cohive_projects` - Project files
- `cohive_ideas_files` - Ideas files uploaded via "Load Current Ideas"
- `cohive_research_files` - Research documents
- `cohive_edit_suggestions` - Edit suggestions
- `cohive_hex_executions` - Execution history

### Data Flow

1. User interacts with hex → updates state
2. State change triggers localStorage save
3. Save notification appears briefly
4. Data available for Databricks integration

---

## Databricks Integration

### Data Format

Each step sends structured data to Databricks:

```typescript
{
  hexId: string,
  brand: string,
  projectType: string,
  selectedFiles: string[],
  assessmentType: string[],
  assessment: string,
  timestamp: number,
  ideasFile: {
    fileName: string,
    content: string, // Base64 encoded
    fileType: string
  } | null
}
  responses: { [questionIndex: number]: string },
  timestamp: number,
  executionId: string
}
```

### Execution Types

- **Assess:** Evaluate selected research files
- **Recommend:** Get AI recommendations
- **Unified:** Combined assessment and recommendations

---

## Accessibility

### Requirements

- All hexagons must be keyboard navigable
- Focus states should be clearly visible
- Color is not the only indicator of state
- Text contrast meets WCAG AA standards

### Implementation

```tsx
<button
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  aria-label={`Navigate to ${stepName}`}
  className="focus:ring-4 focus:ring-blue-500"
>
  {/* Hexagon content */}
</button>
```

---

## Testing Checklist

Before committing changes:

- [ ] All hex states render correctly (completed, active, upcoming)
- [ ] Template system controls visibility properly
- [ ] Navigation works hex-to-hex
- [ ] localStorage persists correctly
- [ ] Export/Import functions work
- [ ] Research file upload/management works
- [ ] Restart button clears all data
- [ ] Design tokens used (no hardcoded colors)
- [ ] Responsive on different screen sizes
- [ ] Browser console has no errors

---

## Common Patterns

### Adding a New Workflow Step

1. Add step to `processSteps` array in `/components/ProcessFlow.tsx`
2. Add color to `stepColors` in `/styles/cohive-theme.ts`
3. Add content to `stepContent` array in `/components/ProcessWireframe.tsx`
4. Update template system if needed
5. Test navigation and state management

### Creating a Custom Template

1. Open Template Manager
2. Click "Create New Template"
3. Set template name and role
4. Configure visible steps
5. Set default responses
6. Define Databricks instructions
7. Save template

### Exporting/Importing Projects

**Export:**
- Click Download icon in header
- JSON file downloads with all project data

**Import:**
- Click Upload icon in header
- Select previously exported JSON file
- All data is restored

### Using the Wisdom Hex

The Wisdom hex allows users to contribute insights to the knowledge base:

1. Select **Insight Type**: Brand, Category, or General
2. Choose **Input Method**: Text, Voice, Photo, Video, or File
3. **Share Your Wisdom**: Enter content based on method
   - **Text**: Type in textarea, click "Save to Knowledge Base"
   - **Voice**: Click "Start Recording", speak, then "Stop" to auto-save
   - **Photo**: Choose "Upload Photo" OR "Capture with Camera"
   - **Video**: Choose "Upload Video" OR "Record Video"
   - **File**: Upload any document (PDF, Word, Excel, PowerPoint, Text, CSV)
4. **Auto-saved**: Voice, photo, video, and file uploads auto-save on completion

**Saved to Databricks Knowledge Base:**
- Stored in Databricks (not localStorage)
- Tagged with `fileType: 'Wisdom'`
- Available to all users across the organization
- Centralized, persistent storage
- Accessible from any device or session

**See:** 
- `/WISDOM_HEX_DOCUMENTATION.md` for Wisdom hex details
- `/DATABRICKS_KNOWLEDGE_BASE_INTEGRATION.md` for technical integration

---

## Version History

- **v28:** Reset point - CentralHexView component recreation
- **v29:** Design system implementation

---

## Support & Resources

- **Design System:** See `/styles/cohive-design-system.md`
- **Visual Reference:** Run DesignSystemGuide component
- **Template Documentation:** See TemplateManager component comments
- **Color Palette:** Check `/styles/cohive-theme.ts`

---

**Last Updated:** December 2024
