/**
 * CoHive Persona System
 * 
 * This file defines the STRUCTURE of personas (categories, hierarchy, labels).
 * The CONTENT (descriptions, prompts, context) is stored in separate files 
 * in /data/persona-content/ for easy editing by non-technical users.
 * 
 * HOW IT WORKS:
 * 1. This file defines which hexes have personas and their dropdown structure
 * 2. Each persona references a content file by ID
 * 3. Content files can be edited without touching code
 * 4. Supports JSON (structured) or Markdown (rich text) formats
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PersonaContent {
  id: string;
  name: string;
  description: string;
  context: string; // Background for Databricks AI
  detailedProfile?: string; // Rich multi-paragraph description
  demographics?: {
    ageRange?: string;
    income?: string;
    education?: string;
    location?: string;
    [key: string]: any;
  };
  psychographics?: {
    values?: string[];
    interests?: string[];
    concerns?: string[];
    motivations?: string[];
    [key: string]: any;
  };
  suggestedPrompts: string[];
  exampleQuotes?: string[]; // Example things this persona might say
  keyInsights?: string[]; // Important facts about this persona
  metadata?: {
    lastUpdated?: string;
    author?: string;
    [key: string]: any;
  };
}

export interface PersonaLevel3 {
  id: string; // References content file: /data/persona-content/{id}.json
  name: string; // Display name
}

export interface PersonaLevel2 {
  id: string;
  name: string;
  description?: string;
  roles?: PersonaLevel3[]; // Level 3 options
}

export interface PersonaLevel1 {
  id: string;
  category: string;
  description?: string;
  subcategories?: PersonaLevel2[]; // Level 2 options
  roles?: PersonaLevel3[]; // Direct to Level 3 (skip Level 2)
}

export interface HexPersonaConfig {
  hexId: string;
  hexName: string;
  level1Label: string;
  level2Label?: string;
  level3Label?: string;
  description: string;
  options: PersonaLevel1[];
}

// ============================================================================
// PERSONA STRUCTURE DEFINITIONS
// ============================================================================

export const hexPersonas: HexPersonaConfig[] = [
  
  // --------------------------------------------------------------------------
  // LUMINARIES HEX - Advertising Legends & Creative Icons
  // --------------------------------------------------------------------------
  {
    hexId: 'Luminaries',
    hexName: 'Advertising Legends',
    level1Label: 'Era / Approach',
    level2Label: 'Philosophy',
    level3Label: 'Legend',
    description: 'Select legendary advertising minds to evaluate and critique your work',
    options: [
      {
        id: 'golden-age',
        category: 'Golden Age (1950s-1970s)',
        description: 'The founding fathers of modern advertising',
        subcategories: [
          {
            id: 'scientific-approach',
            name: 'Scientific & Research-Driven',
            description: 'Data, testing, and proven methods',
            roles: [
              { id: 'david-ogilvy', name: 'David Ogilvy' },
              { id: 'claude-hopkins', name: 'Claude Hopkins' },
              { id: 'rosser-reeves', name: 'Rosser Reeves' },
              { id: 'russell-colley', name: 'Russell Colley' }
            ]
          },
          {
            id: 'creative-revolution',
            name: 'Creative Revolution',
            description: 'Art, wit, and human truth',
            roles: [
              { id: 'bill-bernbach', name: 'Bill Bernbach' },
              { id: 'george-lois', name: 'George Lois' },
              { id: 'howard-gossage', name: 'Howard Gossage' },
              { id: 'mary-wells-lawrence', name: 'Mary Wells Lawrence' }
            ]
          },
          {
            id: 'inherent-drama',
            name: 'Inherent Drama & Iconography',
            description: 'Warmth, symbols, and timeless characters',
            roles: [
              { id: 'leo-burnett', name: 'Leo Burnett' }
            ]
          }
        ]
      },
      {
        id: 'modern-masters',
        category: 'Modern Masters (1980s-2000s)',
        description: 'The builders of iconic brands and cultural movements',
        subcategories: [
          {
            id: 'brand-builders',
            name: 'Brand Builders & Strategists',
            description: 'Creating cultural icons through design and storytelling',
            roles: [
              { id: 'dan-wieden', name: 'Dan Wieden' },
              { id: 'lee-clow', name: 'Lee Clow' },
              { id: 'jeff-goodby', name: 'Jeff Goodby' },
              { id: 'rich-silverstein', name: 'Rich Silverstein' },
              { id: 'john-hegarty', name: 'Sir John Hegarty' }
            ]
          },
          {
            id: 'disruptors',
            name: 'Disruptors & Provocateurs',
            description: 'Bold ideas and cultural hacking',
            roles: [
              { id: 'alex-bogusky', name: 'Alex Bogusky' },
              { id: 'dave-trott', name: 'Dave Trott' }
            ]
          }
        ]
      },
      {
        id: 'contemporary',
        category: 'Contemporary Voices (2010s-Present)',
        description: 'Modern thinkers shaping the future of brand communication',
        subcategories: [
          {
            id: 'system-thinkers',
            name: 'System Thinkers & Experience Designers',
            description: 'Platforms, ecosystems, and living brands',
            roles: [
              { id: 'tiffany-rolfe', name: 'Tiffany Rolfe' },
              { id: 'margaret-johnson', name: 'Margaret Johnson' }
            ]
          },
          {
            id: 'modern-craft',
            name: 'Modern Craft & Wit',
            description: 'Simple, smart, culturally fluent work',
            roles: [
              { id: 'greg-hahn', name: 'Greg Hahn' }
            ]
          }
        ]
      },
      {
        id: 'alternative-perspectives',
        category: 'Alternative Perspectives',
        description: 'Contrarian and evidence-based viewpoints',
        subcategories: [
          {
            id: 'behavioral-science',
            name: 'Behavioral Economics',
            description: 'Psychology over logic',
            roles: [
              { id: 'rory-sutherland', name: 'Rory Sutherland' },
              { id: 'byron-sharp', name: 'Byron Sharp' }
            ]
          },
          {
            id: 'design-craft',
            name: 'Design & Visual Language',
            description: 'Typography and visual systems as strategy',
            roles: [
              { id: 'paula-scher', name: 'Paula Scher' }
            ]
          }
        ]
      },
      {
        id: 'fictional-icons',
        category: 'Fictional Icons',
        description: 'Legendary characters from popular culture',
        roles: [
          { id: 'don-draper', name: 'Don Draper' }
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // COLLEAGUES HEX - Internal Stakeholders
  // --------------------------------------------------------------------------
  {
    hexId: 'Colleagues',
    hexName: 'Internal Stakeholders',
    level1Label: 'Department',
    level2Label: 'Team',
    level3Label: 'Role',
    description: 'Select internal colleagues and stakeholders for their perspectives',
    options: [
      {
        id: 'leadership',
        category: 'Leadership',
        description: 'Executive leadership team',
        subcategories: [
          {
            id: 'c-suite',
            name: 'C-Suite',
            description: 'Executive leadership',
            roles: [
              { id: 'colleagues-ceo', name: 'CEO' },
              { id: 'colleagues-cfo', name: 'CFO' },
              { id: 'colleagues-cmo', name: 'CMO' },
              { id: 'colleagues-cto', name: 'CTO' }
            ]
          },
          {
            id: 'directors',
            name: 'Directors',
            description: 'Department directors',
            roles: [
              { id: 'colleagues-director-product', name: 'Product Director' },
              { id: 'colleagues-director-sales', name: 'Sales Director' },
              { id: 'colleagues-director-ops', name: 'Operations Director' }
            ]
          }
        ]
      },
      {
        id: 'product',
        category: 'Product & Engineering',
        description: 'Product development and engineering teams',
        subcategories: [
          {
            id: 'product-management',
            name: 'Product Management',
            description: 'Product strategy and planning',
            roles: [
              { id: 'colleagues-product-manager', name: 'Product Manager' },
              { id: 'colleagues-product-owner', name: 'Product Owner' }
            ]
          },
          {
            id: 'engineering',
            name: 'Engineering',
            description: 'Technical development teams',
            roles: [
              { id: 'colleagues-engineer-lead', name: 'Engineering Lead' },
              { id: 'colleagues-engineer-architect', name: 'Solutions Architect' }
            ]
          }
        ]
      },
      {
        id: 'commercial',
        category: 'Commercial',
        description: 'Sales, marketing, and customer-facing teams',
        subcategories: [
          {
            id: 'sales',
            name: 'Sales',
            description: 'Sales and business development',
            roles: [
              { id: 'colleagues-sales-rep', name: 'Sales Representative' },
              { id: 'colleagues-sales-manager', name: 'Sales Manager' }
            ]
          },
          {
            id: 'marketing',
            name: 'Marketing',
            description: 'Marketing and brand teams',
            roles: [
              { id: 'colleagues-marketing-manager', name: 'Marketing Manager' },
              { id: 'colleagues-brand-manager', name: 'Brand Manager' }
            ]
          },
          {
            id: 'customer-success',
            name: 'Customer Success',
            description: 'Customer support and success',
            roles: [
              { id: 'colleagues-cs-manager', name: 'Customer Success Manager' },
              { id: 'colleagues-support-lead', name: 'Support Team Lead' }
            ]
          }
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // CULTURAL VOICES HEX - Cultural Trends & Influences
  // --------------------------------------------------------------------------
  {
    hexId: 'cultural',
    hexName: 'Cultural Voices',
    level1Label: 'Cultural Category',
    level2Label: 'Trend Area',
    level3Label: 'Cultural Voice',
    description: 'Select cultural trends and influences to analyze',
    options: [
      {
        id: 'Music and Art',
        category: 'Music and Art',
        description: 'Cultural perspectives by generation',
        subcategories: [
          {
            id: 'Music',
            name: 'Music',
            description: 'Digital-first, social justice focused',
            roles: [
              { id: 'cultural-genz-activist', name: 'Gen Z Activist' },
              { id: 'cultural-genz-creator', name: 'Content Creator' },
              { id: 'cultural-genz-entrepreneur', name: 'Young Entrepreneur' }
            ]
          },
          {
            id: 'Art',
            name: 'Art',
            description: 'Experience-driven, tech-savvy',
            roles: [
              { id: 'cultural-millennial-influencer', name: 'Lifestyle Influencer' },
              { id: 'cultural-millennial-professional', name: 'Urban Professional' }
            ]
          }
        ]
      },
      {
        id: 'Sports',
        category: 'Sports',
        description: 'Regional cultural perspectives',
        subcategories: [
          {
            id: 'Athletes',
            name: 'Athletes',
            description: 'City-based cultural trends',
            roles: [
              { id: 'cultural-urban-trendsetter', name: 'Urban Trendsetter' },
              { id: 'cultural-urban-artist', name: 'Street Artist' }
            ]
          },
          {
            id: 'Teams',
            name: 'Teams',
            description: 'Suburban lifestyle and values',
            roles: [
              { id: 'cultural-suburban-family', name: 'Suburban Family Voice' }
            ]
          },
          {
            id: 'Games',
            name: 'Games',
            description: 'Rural and small-town perspectives',
            roles: [
              { id: 'cultural-rural-community', name: 'Rural Community Leader' }
            ]
          }
        ]
      },
      {
        id: 'Influencers',
        category: 'Influencers',
        description: 'Niche cultural movements',
        subcategories: [
          {
            id: 'sustainability',
            name: 'Sustainability Movement',
            description: 'Eco-conscious cultural voices',
            roles: [
              { id: 'cultural-eco-advocate', name: 'Environmental Advocate' },
              { id: 'cultural-zero-waste', name: 'Zero-Waste Practitioner' }
            ]
          },
          {
            id: 'wellness',
            name: 'Wellness Culture',
            description: 'Health and mindfulness trends',
            roles: [
              { id: 'cultural-wellness-guru', name: 'Wellness Influencer' },
              { id: 'cultural-mindfulness', name: 'Mindfulness Coach' }
            ]
          },
          {
            id: 'tech-culture',
            name: 'Tech Culture',
            description: 'Innovation and tech communities',
            roles: [
              { id: 'cultural-tech-innovator', name: 'Tech Innovator' },
              { id: 'cultural-gamer', name: 'Gaming Community Voice' }
            ]
          }
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // CONSUMERS HEX - Buyers
  // --------------------------------------------------------------------------
  {
    hexId: 'Consumers',
    hexName: 'Buyers',
    level1Label: 'Buyer Type',
    level2Label: 'Purchase Context',
    level3Label: 'Buyer Profile',
    description: 'Select buyer personas based on purchase behavior',
    options: [
      {
        id: 'b2c',
        category: 'B2C Buyers',
        description: 'Individual consumers',
        subcategories: [
          {
            id: 'impulse',
            name: 'Impulse Buyers',
            description: 'Quick, emotion-driven purchases',
            roles: [
              { id: 'consumers-b2c-impulse', name: 'Spontaneous Shopper' }
            ]
          },
          {
            id: 'research',
            name: 'Research-Driven Buyers',
            description: 'Thorough evaluation before purchase',
            roles: [
              { id: 'consumers-b2c-research', name: 'Analytical Buyer' }
            ]
          },
          {
            id: 'loyal',
            name: 'Loyal Customers',
            description: 'Repeat buyers, brand loyal',
            roles: [
              { id: 'consumers-b2c-loyal', name: 'Brand Advocate' }
            ]
          }
        ]
      },
      {
        id: 'b2b',
        category: 'B2B Buyers',
        description: 'Business purchase decision-makers',
        subcategories: [
          {
            id: 'smb',
            name: 'Small Business',
            description: 'Small business owners/managers',
            roles: [
              { id: 'consumers-b2b-smb', name: 'Small Business Owner' }
            ]
          },
          {
            id: 'enterprise',
            name: 'Enterprise',
            description: 'Large organization buyers',
            roles: [
              { id: 'consumers-b2b-procurement', name: 'Procurement Manager' },
              { id: 'consumers-b2b-department', name: 'Department Head' }
            ]
          }
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // GRADE HEX - Segment Testing / Score Results
  // --------------------------------------------------------------------------
  {
    hexId: 'Grade',
    hexName: 'Score Results',
    level1Label: 'Segment Type',
    level2Label: 'Segment Category',
    level3Label: 'Target Segment',
    description: 'Select target segments to test hypotheses and strategies',
    options: [
      {
        id: 'lifestyle',
        category: 'Lifestyle',
        description: 'Lifestyle-based segments',
        subcategories: [
          {
            id: 'activities',
            name: 'Activities & Interests',
            description: 'Based on hobbies and activities',
            roles: [
              { id: 'grade-lifestyle-active', name: 'Active/Athletic' },
              { id: 'grade-lifestyle-creative', name: 'Creative/Artistic' },
              { id: 'grade-lifestyle-tech', name: 'Tech Enthusiast' },
              { id: 'grade-lifestyle-outdoors', name: 'Outdoor Adventurer' }
            ]
          },
          {
            id: 'consumption',
            name: 'Consumption Patterns',
            description: 'Based on purchase and consumption behavior',
            roles: [
              { id: 'grade-lifestyle-luxury', name: 'Luxury Consumer' },
              { id: 'grade-lifestyle-value', name: 'Value Seeker' },
              { id: 'grade-lifestyle-eco', name: 'Eco-Conscious Consumer' }
            ]
          },
          {
            id: 'life-stage',
            name: 'Life Stage',
            description: 'Based on current life circumstances',
            roles: [
              { id: 'grade-lifestyle-student', name: 'Student' },
              { id: 'grade-lifestyle-young-professional', name: 'Young Professional' },
              { id: 'grade-lifestyle-family', name: 'Growing Family' },
              { id: 'grade-lifestyle-empty-nester', name: 'Empty Nester' },
              { id: 'grade-lifestyle-retiree', name: 'Retiree' }
            ]
          }
        ]
      },
      {
        id: 'demographic',
        category: 'Demographic',
        description: 'Demographic-based segments',
        subcategories: [
          {
            id: 'age',
            name: 'Age Groups',
            description: 'Based on age ranges',
            roles: [
              { id: 'grade-demo-gen-z', name: 'Gen Z (18-26)' },
              { id: 'grade-demo-millennial', name: 'Millennials (27-42)' },
              { id: 'grade-demo-gen-x', name: 'Gen X (43-58)' },
              { id: 'grade-demo-boomer', name: 'Baby Boomers (59-77)' }
            ]
          },
          {
            id: 'income',
            name: 'Income Levels',
            description: 'Based on household income',
            roles: [
              { id: 'grade-demo-low-income', name: 'Low Income (<$35K)' },
              { id: 'grade-demo-middle-income', name: 'Middle Income ($35K-$100K)' },
              { id: 'grade-demo-upper-middle', name: 'Upper Middle ($100K-$200K)' },
              { id: 'grade-demo-high-income', name: 'High Income ($200K+)' }
            ]
          },
          {
            id: 'geography',
            name: 'Geographic',
            description: 'Based on location',
            roles: [
              { id: 'grade-demo-urban', name: 'Urban' },
              { id: 'grade-demo-suburban', name: 'Suburban' },
              { id: 'grade-demo-rural', name: 'Rural' }
            ]
          },
          {
            id: 'household',
            name: 'Household Composition',
            description: 'Based on family structure',
            roles: [
              { id: 'grade-demo-single', name: 'Single' },
              { id: 'grade-demo-couple', name: 'Couple (No Kids)' },
              { id: 'grade-demo-family-young', name: 'Family (Young Kids)' },
              { id: 'grade-demo-family-teen', name: 'Family (Teens)' },
              { id: 'grade-demo-multi-gen', name: 'Multi-Generational' }
            ]
          }
        ]
      },
      {
        id: 'psychographic',
        category: 'Psychographic',
        description: 'Psychographic-based segments',
        subcategories: [
          {
            id: 'values',
            name: 'Values & Beliefs',
            description: 'Based on core values',
            roles: [
              { id: 'grade-psycho-traditional', name: 'Traditional Values' },
              { id: 'grade-psycho-progressive', name: 'Progressive Values' },
              { id: 'grade-psycho-spiritual', name: 'Spiritual/Religious' },
              { id: 'grade-psycho-pragmatic', name: 'Pragmatic/Practical' }
            ]
          },
          {
            id: 'personality',
            name: 'Personality Traits',
            description: 'Based on personality characteristics',
            roles: [
              { id: 'grade-psycho-innovator', name: 'Innovator/Early Adopter' },
              { id: 'grade-psycho-cautious', name: 'Cautious/Risk-Averse' },
              { id: 'grade-psycho-social', name: 'Social Butterfly' },
              { id: 'grade-psycho-independent', name: 'Independent Thinker' }
            ]
          },
          {
            id: 'attitudes',
            name: 'Attitudes & Opinions',
            description: 'Based on attitudes toward key topics',
            roles: [
              { id: 'grade-psycho-health-conscious', name: 'Health-Conscious' },
              { id: 'grade-psycho-status-seeking', name: 'Status-Seeking' },
              { id: 'grade-psycho-convenience', name: 'Convenience-Oriented' },
              { id: 'grade-psycho-quality', name: 'Quality-Focused' },
              { id: 'grade-psycho-price', name: 'Price-Sensitive' }
            ]
          }
        ]
      }
    ]
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get persona configuration for a specific hex
 */
export function getPersonasForHex(hexId: string): HexPersonaConfig | undefined {
  return hexPersonas.find(p => p.hexId === hexId);
}

/**
 * Get all hex IDs that have persona configurations
 */
export function getHexesWithPersonas(): string[] {
  return hexPersonas.map(p => p.hexId);
}

/**
 * Check if a hex has persona configuration
 */
export function hexHasPersonas(hexId: string): boolean {
  return hexPersonas.some(p => p.hexId === hexId);
}

/**
 * Load persona content from file
 * In production, this would fetch from /data/persona-content/{personaId}.json
 * For now, returns a placeholder that can be replaced with actual file loading
 */
export async function loadPersonaContent(personaId: string): Promise<PersonaContent | null> {
  try {
    // In a real implementation, this would fetch the JSON file:
    // const response = await fetch(`/data/persona-content/${personaId}.json`);
    // return await response.json();
    
    // For now, return null - actual content will be loaded from files
    console.log(`Loading persona content for: ${personaId}`);
    return null;
  } catch (error) {
    console.error(`Failed to load persona content for ${personaId}:`, error);
    return null;
  }
}

/**
 * Get flattened list of all persona IDs for a hex
 */
export function getAllPersonaIdsForHex(hexId: string): string[] {
  const config = getPersonasForHex(hexId);
  if (!config) return [];

  const ids: string[] = [];
  
  config.options.forEach(level1 => {
    if (level1.subcategories) {
      level1.subcategories.forEach(level2 => {
        if (level2.roles) {
          level2.roles.forEach(level3 => {
            ids.push(level3.id);
          });
        }
      });
    } else if (level1.roles) {
      level1.roles.forEach(level3 => {
        ids.push(level3.id);
      });
    }
  });
  
  return ids;
}