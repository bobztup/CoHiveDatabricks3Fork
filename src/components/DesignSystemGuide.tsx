import { colors, hexagon, spacing, stepColors, typography } from '../styles/cohive-theme';
import { HexagonBreadcrumb } from './HexagonBreadcrumb';
import { Rocket, Database, CheckCircle, TestTube, Users, BarChart3, MessageSquare } from 'lucide-react';

/**
 * Design System Guide Component
 * 
 * Visual reference for CoHive design tokens and components.
 * Can be used during development or as a living style guide.
 */
export function DesignSystemGuide() {
  return (
    <div className="p-8 space-y-12 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-3xl mb-2">CoHive Design System</h1>
        <p className="text-gray-600">Visual reference for the CoHive AI tool interface</p>
      </div>

      {/* Color Palette */}
      <section>
        <h2 className="text-2xl mb-4">Color Palette</h2>
        
        <h3 className="mb-3">Primary Hexagon Colors</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <ColorSwatch label="Enter" color={colors.hex.Enter} />
          <ColorSwatch label="Research" color={colors.hex.research} />
          <ColorSwatch label="Findings" color={colors.hex.Findings} />
          <ColorSwatch label="Grade" color={colors.hex.Grade} />
        </div>

        <h3 className="mb-3">Purple Spectrum (Experts & Voices)</h3>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <ColorSwatch label="Light Purple" color={colors.hex.purple.light} />
          <ColorSwatch label="Medium Purple" color={colors.hex.purple.medium} />
          <ColorSwatch label="Dark Purple" color={colors.hex.purple.dark} />
        </div>

        <h3 className="mb-3">State Colors</h3>
        <div className="grid grid-cols-3 gap-4">
          <ColorSwatch label="Completed" color={colors.hex.completed} />
          <ColorSwatch label="Active" color={colors.hex.active} />
          <ColorSwatch label="Upcoming" color={colors.hex.upcoming} />
        </div>
      </section>

      {/* Hexagon States */}
      <section>
        <h2 className="text-2xl mb-4">Hexagon States</h2>
        <div className="flex flex-wrap gap-8 items-center bg-white p-6 rounded-lg">
          <div className="text-center">
            <HexagonBreadcrumb
              label="Completed"
              color={colors.hex.Enter}
              status="completed"
              icon={Rocket}
            />
            <p className="mt-2 text-sm text-gray-600">Completed</p>
          </div>
          <div className="text-center">
            <HexagonBreadcrumb
              label="Active"
              color={colors.hex.research}
              status="active"
              icon={Database}
            />
            <p className="mt-2 text-sm text-gray-600">Active</p>
          </div>
          <div className="text-center">
            <HexagonBreadcrumb
              label="Upcoming"
              color={colors.hex.Grade}
              status="upcoming"
              icon={TestTube}
            />
            <p className="mt-2 text-sm text-gray-600">Upcoming</p>
          </div>
        </div>
      </section>

      {/* Size Variants */}
      <section>
        <h2 className="text-2xl mb-4">Size Variants</h2>
        <div className="flex flex-wrap gap-8 items-center bg-white p-6 rounded-lg">
          <div className="text-center">
            <HexagonBreadcrumb
              label="Small"
              color={colors.hex.purple.light}
              status="active"
              size="small"
            />
            <p className="mt-2 text-sm text-gray-600">Small (140x70)</p>
          </div>
          <div className="text-center">
            <HexagonBreadcrumb
              label="Medium"
              color={colors.hex.purple.light}
              status="active"
              size="medium"
            />
            <p className="mt-2 text-sm text-gray-600">Medium (160x80)</p>
          </div>
          <div className="text-center">
            <HexagonBreadcrumb
              label="Large"
              color={colors.hex.purple.light}
              status="active"
              size="large"
            />
            <p className="mt-2 text-sm text-gray-600">Large (180x90)</p>
          </div>
        </div>
      </section>

      {/* All Step Colors */}
      <section>
        <h2 className="text-2xl mb-4">Workflow Step Colors</h2>
        <div className="flex flex-wrap gap-6 bg-white p-6 rounded-lg">
          <HexagonBreadcrumb label="Enter" color={stepColors.Enter} status="completed" size="small" />
          <HexagonBreadcrumb label="Research" color={stepColors.research} status="completed" size="small" />
          <HexagonBreadcrumb label="Luminaries" color={stepColors.Luminaries} status="completed" size="small" />
          <HexagonBreadcrumb label="Panelist" color={stepColors.panelist} status="completed" size="small" />
          <HexagonBreadcrumb label="Consumers" color={stepColors.Consumers} status="completed" size="small" />
          <HexagonBreadcrumb label="colleagues" color={stepColors.colleagues} status="completed" size="small" />
          <HexagonBreadcrumb label="Competitors" color={stepColors.competitors} status="completed" size="small" />
          <HexagonBreadcrumb label="Cultural" color={stepColors.cultural} status="completed" size="small" />
          <HexagonBreadcrumb label="Social" color={stepColors.social} status="completed" size="small" />
          <HexagonBreadcrumb label="Grade" color={stepColors.Grade} status="completed" size="small" />
          <HexagonBreadcrumb label="Findings" color={stepColors.Findings} status="completed" size="small" />
        </div>
      </section>

      {/* Spacing */}
      <section>
        <h2 className="text-2xl mb-4">Spacing Scale</h2>
        <div className="space-y-2 bg-white p-6 rounded-lg">
          <SpacingExample label="XS (4px)" size={spacing.xs} />
          <SpacingExample label="SM (8px)" size={spacing.sm} />
          <SpacingExample label="MD (16px)" size={spacing.md} />
          <SpacingExample label="LG (24px)" size={spacing.lg} />
          <SpacingExample label="XL (32px)" size={spacing.xl} />
          <SpacingExample label="XXL (48px)" size={spacing.xxl} />
          <SpacingExample label="XXXL (64px)" size={spacing.xxxl} />
        </div>
      </section>

      {/* Typography */}
      <section>
        <h2 className="text-2xl mb-4">Typography</h2>
        <div className="space-y-4 bg-white p-6 rounded-lg">
          <div>
            <p className="text-sm text-gray-600 mb-1">Sans-serif (Primary)</p>
            <p style={{ fontFamily: typography.fontFamily.sans }}>
              The quick brown fox jumps over the lazy dog
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Monospace (Code/Data)</p>
            <p style={{ fontFamily: typography.fontFamily.mono }}>
              const cohive = "databricks-ai-tool";
            </p>
          </div>
        </div>
      </section>

      {/* Status Colors */}
      <section>
        <h2 className="text-2xl mb-4">Status Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ColorSwatch label="Success" color={colors.status.success} />
          <ColorSwatch label="Warning" color={colors.status.warning} />
          <ColorSwatch label="Error" color={colors.status.error} />
          <ColorSwatch label="Info" color={colors.status.info} />
        </div>
      </section>

      {/* Technical Details */}
      <section>
        <h2 className="text-2xl mb-4">Technical Details</h2>
        <div className="bg-white p-6 rounded-lg space-y-4">
          <div>
            <h3 className="mb-2">Hexagon SVG Points</h3>
            <code className="bg-gray-100 px-3 py-2 rounded text-sm block">
              {hexagon.points}
            </code>
          </div>
          <div>
            <h3 className="mb-2">Import Theme</h3>
            <code className="bg-gray-100 px-3 py-2 rounded text-sm block">
              import &#123; colors, stepColors, hexagon &#125; from '@/styles/cohive-theme';
            </code>
          </div>
        </div>
      </section>
    </div>
  );
}

// Helper Components
function ColorSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div 
        className="h-24 w-full" 
        style={{ backgroundColor: color }}
      />
      <div className="p-3 bg-white">
        <p className="text-sm">{label}</p>
        <p className="text-xs text-gray-500 font-mono">{color}</p>
      </div>
    </div>
  );
}

function SpacingExample({ label, size }: { label: string; size: number }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-32 text-sm text-gray-600">{label}</div>
      <div 
        className="h-6 bg-blue-500 rounded"
        style={{ width: `${size}px` }}
      />
    </div>
  );
}
