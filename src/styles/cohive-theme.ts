/**
 * CoHive Design System
 * 
 * Centralized design tokens for the CoHive AI tool interface
 * Based on the hexagonal workflow design with honeycomb-like cluster pattern
 */

// ===================================
// COLOR PALETTE
// ===================================

export const colors = {
  // Primary Hex Colors - Core workflow stages
  hex: {                    // new     original
    Enter: '#FAC81E',      // F8C85B  FCD34D Gold/Yellow - Project initiation
    research: '#0A50AA',    // 0A78AA  60A5FA Light Blue - Data gathering
    Findings: '#0A7878',      // 196B24  10B981Teal Green - Final action/completion
    review: '#0AAAAA',      // 0D4F17  Dark Green - Review all results
    Grade: '#AAC864',        // 1C9D76   22D3EECyan - Testing phase
 
    Luminaries: '#78206E',      // 78206E   8B5CF6Gold/Yellow - Project initiation
    panelist: '#7E15A2',         // 7E15A2  8B5CF6
    Colleagues: '#684CC1',      // 684CC1  8B5CF6 Teal Green - Final action/completion
    social: '#8133D6',        // 8133D6  8B5CF6 Cyan - Testing phase
    Wisdom: '#0A78AA',          // 9B49EB  New purple shade for Wisdom
    Consumers: '#A02B93',         // A02B93  8B5CF6
    competitors: '#834FBF',     //834FBF   8B5CF6
    cultural: '#7E15A2',        // 7E15A2  8B5CF6
    
   // Purple spectrum for expert/voice hexagons
    purple: {
      light: '#8B5CF6',     // Light Purple - Luminaries/Panelist/Consumers/Colleagues 8B5CF6
      medium: '#8B5CF6',    // Medium Purple - Competitors/Cultural/Social  7C3AED
      dark: '#8B5CF6',      // Dark Purple - Reserved for future use  6D28D9
    },
    
    // Semantic colors
    completed: '#10B981',   // Green - Completed steps
    active: '8B5CF6',      // Teal - Currently active step
    upcoming: '8B5CF6',    // Gray - Future/upcoming steps
  },
  
  // UI Colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    dark: '#1F2937',
  },
  
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
  },
  
  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#9CA3AF',
  },
  
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  
  // Databricks brand (if needed)
  databricks: {
    red: '#FF3621',
    darkGray: '#1B3139',
  },
} as const;

// ===================================
// HEXAGON SPECIFICATIONS
// ===================================

export const hexagon = {
  // Size variants
  sizes: {
    small: {
      width: 112,
      height: 92,
      fontSize: '0.75rem', // 12px
    },
    medium: {
      width: 128,
      height: 106,
      fontSize: '0.875rem', // 14px
    },
    large: {
      width: 144,
      height: 118,
      fontSize: '1rem', // 16px
    },
  },
  
  // SVG polygon points for elongated hexagon
  points: '45,5 155,5 195,82.5 155,160 45,160 5,82.5',
  
  // Visual states
  states: {
    completed: {
      opacity: 1,
      ring: null,
    },
    active: {
      opacity: 1,
      ring: {
        color: colors.hex.active,
        width: 4,
        offset: 2,
      },
    },
    upcoming: {
      opacity: 0.6,
      ring: null,
    },
  },
  
  // Stroke styles
  stroke: {
    default: {
      color: 'rgba(255,255,255,0.3)',
      width: 2,
    },
    active: {
      color: colors.hex.active,
      width: 3,
    },
  },
} as const;

// ===================================
// SPACING & LAYOUT
// ===================================

export const spacing = {
  // Base spacing scale (in px)
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  
  // Hexagon-specific spacing
  hexagon: {
    gap: 20,          // Gap between hexagons in cluster
    rowGap: 100,      // Vertical gap between rows
    clusterPadding: 40, // Padding around hex cluster
  },
} as const;

// ===================================
// TYPOGRAPHY
// ===================================

export const typography = {
  fontFamily: {
    sans: '"Nunito Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  
  // Component-specific text styles
  hex: {
    label: {
      color: colors.text.inverse,
      textAlign: 'center' as const,
      lineHeight: 'tight' as const,
    },
  },
  
  header: {
    title: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    subtitle: {
      fontSize: '0.875rem',
      fontWeight: 400,
    },
  },
} as const;

// ===================================
// SHADOWS & EFFECTS
// ===================================

export const effects = {
  shadow: {
    hex: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
    hex3D: 'drop-shadow(0 8px 12px rgba(0, 0, 0, 0.4)) drop-shadow(0 4px 6px rgba(0, 0, 0, 0.25))',
    hexHover: 'drop-shadow(0 12px 20px rgba(0, 0, 0, 0.5)) drop-shadow(0 6px 8px rgba(0, 0, 0, 0.3))',
    card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    cardHover: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
  
  transition: {
    default: 'all 150ms ease-in-out',
    fast: 'all 100ms ease-in-out',
    slow: 'all 300ms ease-in-out',
  },
  
  hover: {
    scale: 1.05,
    opacity: 0.9,
  },
} as const;

// ===================================
// WORKFLOW STEP COLORS
// ===================================

/**
 * Maps workflow step IDs to their corresponding hex colors
 */
export const stepColors: Record<string, string> = {
  Enter: colors.hex.Enter,
  research: colors.hex.research,
  Findings: colors.hex.Findings,
  review: colors.hex.review,
  Grade: colors.hex.Grade,
  
  // Expert/Voice steps - purple spectrum
  Luminaries: colors.hex.Luminaries,
  panelist: colors.hex.panelist,
  Consumers: colors.hex.Consumers,
  Colleagues: colors.hex.Colleagues,
  competitors: colors.hex.competitors,
  cultural: colors.hex.cultural,
  social: colors.hex.social,
  Wisdom: colors.hex.Wisdom,
} as const;

// ===================================
// Z-INDEX SCALE
// ===================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// ===================================
// BREAKPOINTS
// ===================================

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
} as const;

// ===================================
// HELPER FUNCTIONS
// ===================================

/**
 * Get color for a specific workflow step
 */
export function getStepColor(stepId: string): string {
  return stepColors[stepId] || colors.hex.purple.light;
}

/**
 * Get hex state styles
 */
export function getHexStateStyles(status: 'completed' | 'active' | 'upcoming') {
  return hexagon.states[status];
}

/**
 * Generate gradient definition for hexagon
 */
export function generateHexGradient(color: string, id: string) {
  return {
    id: `gradient-${id}`,
    stops: [
      { offset: '0%', color: color, opacity: 1 },
      { offset: '100%', color: color, opacity: 0.8 },
    ],
  };
}