# CoHive Agent Content Files

This folder contains rich, detailed agent configurations used throughout the CoHive workflow. Agents are AI-powered assistants that perform specific tasks or embody particular roles.

## 📁 File Structure

Each agent has its own JSON file:
```
/data/agent-content/
  ├── README.md (this file)
  ├── _TEMPLATE.json
  ├── analyst-competitive.json
  ├── analyst-consumer.json
  ├── strategist-brand.json
  ├── researcher-market.json
  └── ... (more agents)
```

## 🎯 What Are Agents?

**Agents** are specialized AI assistants configured with:
- **Role & Identity**: Who they are (e.g., "Competitive Intelligence Analyst")
- **Expertise**: What they know and excel at
- **Behavior**: How they think and communicate
- **Tools**: What capabilities they have access to
- **Context**: Domain knowledge and background

## 🤖 Types of Agents

### Analysis Agents
Perform specific types of analysis (competitive, consumer, market, financial)

### Strategy Agents
Provide strategic recommendations and planning

### Research Agents
Conduct research, synthesis, and knowledge organization

### Evaluation Agents
Assess, score, and validate insights

### Specialized Agents
Domain-specific experts (e.g., sustainability, technology, marketing)

## 📝 How to Add a New Agent

### Step 1: Create the JSON File

Create a new file: `{role}-{specialty}.json`

**Example:** `analyst-competitive.json`

```json
{
  "id": "analyst-competitive",
  "type": "agent",
  "role": "Competitive Intelligence Analyst",
  "specialty": "Competitive Analysis",
  "description": "Expert in analyzing competitors, market positioning, and competitive dynamics",
  
  "identity": {
    "name": "Competitive Intelligence Analyst",
    "background": "15+ years analyzing competitive landscapes across multiple industries",
    "expertise": [
      "Competitive positioning",
      "Market share analysis",
      "SWOT analysis",
      "Competitive strategy",
      "Market intelligence"
    ],
    "perspective": "Data-driven, strategic, pattern-focused"
  },
  
  "capabilities": {
    "analysis": [
      "Competitive landscape mapping",
      "Product feature comparison",
      "Pricing strategy analysis",
      "Market positioning assessment",
      "Threat identification"
    ],
    "insights": [
      "Competitive advantages identification",
      "Gap analysis",
      "Strategic recommendations",
      "Risk assessment"
    ],
    "outputs": [
      "Competitive analysis reports",
      "SWOT matrices",
      "Positioning maps",
      "Strategic recommendations"
    ]
  },
  
  "behavior": {
    "communicationStyle": "Clear, data-backed, strategic",
    "analyticalApproach": "Systematic comparison and pattern recognition",
    "decisionFramework": "Evidence-based with strategic foresight",
    "defaultPerspective": "How does this position us vs. competitors?"
  },
  
  "systemPrompt": "You are a Competitive Intelligence Analyst with 15+ years of experience analyzing competitive landscapes. Your role is to provide data-driven insights on competitive positioning, market dynamics, and strategic opportunities. Always ground your analysis in concrete evidence and provide actionable strategic recommendations.",
  
  "contextualKnowledge": [
    "Market dynamics and competitive forces",
    "Industry trends and disruptions",
    "Strategic frameworks (Porter's 5 Forces, Blue Ocean, etc.)",
    "Competitive intelligence best practices"
  ],
  
  "tools": [
    "Competitive matrix generator",
    "SWOT analysis framework",
    "Market positioning map",
    "Feature comparison table"
  ],
  
  "useCases": [
    "Competitors hex analysis",
    "War Games scenarios",
    "Competitive benchmarking",
    "Strategic planning support"
  ],
  
  "exampleQueries": [
    "Analyze our competitive position in the market",
    "What are our competitors' key advantages?",
    "How should we differentiate from Competitor X?",
    "What threats should we be aware of?"
  ],
  
  "metadata": {
    "lastUpdated": "2025-02-08",
    "author": "CoHive Team",
    "version": "1.0",
    "status": "active"
  }
}
```

### Step 2: Register in Code

Import and use in your agent system:

```typescript
import competitiveAnalyst from './data/agent-content/analyst-competitive.json';

const agent = new Agent(competitiveAnalyst);
agent.execute(task);
```

## 📋 JSON Structure

### Complete Agent Configuration

```json
{
  "id": "unique-agent-id",
  "type": "agent",
  "role": "Agent Role Title",
  "specialty": "Specific domain",
  "description": "Brief description of agent purpose",
  
  "identity": {
    "name": "Display name",
    "background": "Professional background",
    "expertise": ["Skill 1", "Skill 2"],
    "perspective": "How they view problems"
  },
  
  "capabilities": {
    "analysis": ["Types of analysis they perform"],
    "insights": ["Types of insights they provide"],
    "outputs": ["Formats they can deliver"]
  },
  
  "behavior": {
    "communicationStyle": "How they communicate",
    "analyticalApproach": "How they analyze",
    "decisionFramework": "How they make decisions",
    "defaultPerspective": "Their default viewpoint"
  },
  
  "systemPrompt": "The actual prompt used to configure the AI agent",
  
  "contextualKnowledge": [
    "Domain knowledge they possess"
  ],
  
  "tools": [
    "Tools and frameworks they can use"
  ],
  
  "useCases": [
    "Where and when to use this agent"
  ],
  
  "exampleQueries": [
    "Examples of tasks they can handle"
  ],
  
  "constraints": {
    "limitations": ["What they can't do"],
    "scope": "Boundaries of their expertise",
    "caveats": "Important considerations"
  },
  
  "integrations": {
    "hexes": ["Which hexes use this agent"],
    "workflows": ["Which workflows invoke this agent"],
    "dependencies": ["What this agent needs to function"]
  },
  
  "metadata": {
    "lastUpdated": "YYYY-MM-DD",
    "author": "Name",
    "version": "1.0",
    "status": "active"
  }
}
```

## 🎨 Best Practices

### 1. Define Clear Identity
Give agents a strong sense of who they are:
- ✅ "Senior Brand Strategist with 20 years experience in CPG"
- ❌ "Marketing person"

### 2. Be Specific About Capabilities
Define exactly what the agent can and can't do:
```json
"capabilities": {
  "can": ["Competitive analysis", "Market positioning"],
  "cannot": ["Financial modeling", "Legal review"]
}
```

### 3. Craft Effective System Prompts
The system prompt defines the agent's behavior:
```
You are a [role] with [experience].
Your expertise includes [areas].
When analyzing, you [approach].
Always [key behaviors].
Never [constraints].
```

### 4. Provide Rich Context
Include domain knowledge the agent should have:
```json
"contextualKnowledge": [
  "Porter's Five Forces framework",
  "Blue Ocean Strategy principles",
  "Contemporary market analysis methods"
]
```

### 5. Define Clear Use Cases
Help users know when to use this agent:
```json
"useCases": [
  "Competitive hex analysis",
  "Market positioning assessment",
  "Strategic planning workshops"
]
```

## 🔧 Agent Types and Templates

### Analyst Agents
**Focus**: Data analysis, pattern recognition, insights
**Examples**: Competitive Analyst, Consumer Analyst, Market Analyst

### Strategist Agents
**Focus**: Strategic thinking, planning, recommendations
**Examples**: Brand Strategist, Product Strategist, Growth Strategist

### Researcher Agents
**Focus**: Information gathering, synthesis, organization
**Examples**: Market Researcher, Trend Researcher, Academic Researcher

### Evaluator Agents
**Focus**: Assessment, scoring, validation
**Examples**: Quality Evaluator, Risk Assessor, Performance Evaluator

### Specialist Agents
**Focus**: Domain expertise, niche knowledge
**Examples**: Sustainability Expert, Tech Futurist, Cultural Anthropologist

## 🔗 Agent Collaboration

Agents can work together in workflows:

```json
{
  "workflow": "Competitive Analysis",
  "agents": [
    {
      "agent": "analyst-competitive",
      "role": "Primary analysis"
    },
    {
      "agent": "strategist-brand",
      "role": "Strategic implications"
    },
    {
      "agent": "evaluator-risk",
      "role": "Risk assessment"
    }
  ],
  "handoff": {
    "from": "analyst-competitive",
    "to": "strategist-brand",
    "data": "competitive-insights"
  }
}
```

## 💡 Writing Effective System Prompts

### Template Structure

```
You are a [ROLE] with [EXPERIENCE/BACKGROUND].

EXPERTISE:
- [Domain 1]
- [Domain 2]
- [Domain 3]

APPROACH:
When analyzing [SUBJECT], you:
1. [Step 1]
2. [Step 2]
3. [Step 3]

COMMUNICATION STYLE:
- [Characteristic 1]
- [Characteristic 2]
- [Characteristic 3]

CONSTRAINTS:
- Always [required behavior]
- Never [prohibited behavior]
- Focus on [priority]

OUTPUT FORMAT:
[Specify how responses should be structured]
```

### Example

```
You are a Senior Brand Strategist with 20 years of experience in consumer packaged goods.

EXPERTISE:
- Brand positioning and architecture
- Consumer insight translation
- Strategic brand planning
- Brand portfolio management

APPROACH:
When analyzing brand opportunities, you:
1. Start with consumer needs and motivations
2. Assess competitive positioning and differentiation
3. Identify unique value propositions
4. Develop strategic recommendations

COMMUNICATION STYLE:
- Clear and actionable
- Balance creativity with business pragmatism
- Use frameworks when helpful
- Ground recommendations in consumer insights

CONSTRAINTS:
- Always tie recommendations to business goals
- Never suggest without evidence
- Focus on differentiation and competitive advantage

OUTPUT FORMAT:
Provide structured recommendations with:
- Strategic rationale
- Consumer insight foundation
- Competitive context
- Implementation considerations
```

## 🔍 Testing Agents

### Test Scenarios

```json
{
  "testScenarios": [
    {
      "scenario": "Basic competitive analysis",
      "input": "Analyze Nike vs Adidas positioning",
      "expectedBehavior": "Structured competitive comparison with insights",
      "successCriteria": ["Evidence-based", "Strategic", "Actionable"]
    },
    {
      "scenario": "Complex multi-competitor analysis",
      "input": "Analyze athletic footwear market with 5+ competitors",
      "expectedBehavior": "Matrix comparison with strategic recommendations",
      "successCriteria": ["Comprehensive", "Prioritized", "Clear"]
    }
  ]
}
```

## 📊 Agent Performance Metrics

Track how well agents perform:

```json
{
  "metrics": {
    "relevance": "How relevant are outputs?",
    "accuracy": "How accurate is the analysis?",
    "actionability": "How actionable are recommendations?",
    "consistency": "How consistent across similar tasks?",
    "efficiency": "How quickly can tasks be completed?"
  }
}
```

## 🛠️ Advanced Configuration

### Multi-Modal Agents

Agents that can handle different input types:

```json
{
  "inputModes": {
    "text": true,
    "files": ["pdf", "docx", "xlsx"],
    "images": false,
    "voice": false
  },
  "outputModes": {
    "text": true,
    "structured": true,
    "visual": false
  }
}
```

### Adaptive Agents

Agents that adjust based on context:

```json
{
  "adaptations": {
    "userRole": {
      "researcher": "Detailed technical analysis",
      "non-researcher": "Executive summary focus"
    },
    "projectType": {
      "War Games": "Aggressive competitive stance",
      "Brand Refresh": "Creative differentiation focus"
    }
  }
}
```

## 🔄 Version Control

Track agent evolution:

```json
{
  "metadata": {
    "version": "2.1",
    "changeLog": [
      {
        "version": "2.1",
        "date": "2025-02-08",
        "changes": "Enhanced system prompt for better strategic recommendations",
        "author": "Jane Smith",
        "impact": "Improved actionability scores by 15%"
      },
      {
        "version": "2.0",
        "date": "2025-01-15",
        "changes": "Added War Games scenario support",
        "author": "John Doe"
      }
    ]
  }
}
```

## 📚 Integration Examples

### Using Agents in Hexes

```typescript
// In Competitors hex
import competitiveAnalyst from './data/agent-content/analyst-competitive.json';
import brandStrategist from './data/agent-content/strategist-brand.json';

// Execute with competitive analyst
const analysis = await executeWithAgent(competitiveAnalyst, context);

// Follow up with brand strategist
const strategy = await executeWithAgent(brandStrategist, {
  ...context,
  priorAnalysis: analysis
});
```

### Agent Workflows

```typescript
const workflow = {
  name: 'Complete Market Analysis',
  steps: [
    { agent: 'researcher-market', task: 'Gather market data' },
    { agent: 'analyst-competitive', task: 'Analyze competition' },
    { agent: 'strategist-brand', task: 'Develop strategy' },
    { agent: 'evaluator-risk', task: 'Assess risks' }
  ]
};
```

## 💡 Tips for Creating Agents

1. **Start with Use Cases**: Define what tasks the agent should handle
2. **Be Specific**: Clear expertise and constraints prevent scope creep
3. **Test Thoroughly**: Use multiple scenarios to validate behavior
4. **Iterate**: Refine based on real-world performance
5. **Document**: Keep metadata updated with learnings
6. **Collaborate**: Get feedback from users and stakeholders

## 🔍 Examples to Reference

**Analysis Agents:**
- `analyst-competitive.json` - Competitive intelligence
- `analyst-consumer.json` - Consumer behavior analysis

**Strategy Agents:**
- `strategist-brand.json` - Brand strategy and positioning
- `strategist-product.json` - Product strategy and innovation

**Research Agents:**
- `researcher-market.json` - Market research and trends
- `researcher-trends.json` - Trend identification and synthesis

## 📖 Related Documentation

- `/data/persona-content/` - Persona files for agent interactions
- `/data/prompt-content/` - Prompts used with agents
- `/data/prompts/` - Core prompt system

---

**Last Updated:** February 8, 2025  
**Maintained By:** CoHive Team
