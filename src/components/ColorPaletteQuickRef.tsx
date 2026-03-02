import { useState } from 'react';
import { Palette, X } from 'lucide-react';
import { colors, stepColors } from '../styles/cohive-theme';

/**
 * Color Palette Quick Reference
 * 
 * A floating widget that displays the CoHive color palette for quick reference
 * during development. Can be toggled on/off with a button.
 */
export function ColorPaletteQuickRef() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors z-50"
        title="Show Color Palette"
      >
        <Palette className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl border-2 border-gray-200 p-4 w-80 z-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold">Color Palette</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {/* Workflow Steps */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Workflow Steps</p>
          <div className="grid grid-cols-2 gap-2">
            <ColorChip label="Enter" color={stepColors.Enter} />
            <ColorChip label="Research" color={stepColors.research} />
            <ColorChip label="Findings" color={stepColors.findings} />
            <ColorChip label="Grade" color={stepColors.Grade} />
          </div>
        </div>

        {/* Purple Spectrum */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Purple Spectrum</p>
          <div className="grid grid-cols-2 gap-2">
            <ColorChip label="Light" color={colors.hex.purple.light} />
            <ColorChip label="Medium" color={colors.hex.purple.medium} />
            <ColorChip label="Dark" color={colors.hex.purple.dark} />
          </div>
        </div>

        {/* States */}
        <div>
          <p className="text-xs text-gray-500 mb-1">States</p>
          <div className="grid grid-cols-2 gap-2">
            <ColorChip label="Completed" color={colors.hex.completed} />
            <ColorChip label="Active" color={colors.hex.active} />
            <ColorChip label="Upcoming" color={colors.hex.upcoming} />
          </div>
        </div>

        {/* Status */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Status</p>
          <div className="grid grid-cols-2 gap-2">
            <ColorChip label="Success" color={colors.status.success} />
            <ColorChip label="Warning" color={colors.status.warning} />
            <ColorChip label="Error" color={colors.status.error} />
            <ColorChip label="Info" color={colors.status.info} />
          </div>
        </div>

        {/* All Step Assignments */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Step Assignments</p>
          <div className="space-y-1 text-xs">
            <StepColorRow label="Luminaries" color={stepColors.Luminaries} />
            <StepColorRow label="Panelist" color={stepColors.panelist} />
            <StepColorRow label="Consumers" color={stepColors.Consumers} />
            <StepColorRow label="colleagues" color={stepColors.colleagues} />
            <StepColorRow label="Competitors" color={stepColors.competitors} />
            <StepColorRow label="Cultural" color={stepColors.cultural} />
            <StepColorRow label="Social" color={stepColors.social} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorChip({ label, color }: { label: string; color: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(color);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={copyToClipboard}
      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 transition-colors text-left border border-gray-200"
      title={`Click to copy ${color}`}
    >
      <div
        className="w-6 h-6 rounded flex-shrink-0 border border-gray-300"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate">{label}</p>
        <p className="text-xs text-gray-500 font-mono truncate">
          {copied ? 'Copied!' : color}
        </p>
      </div>
    </button>
  );
}

function StepColorRow({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-gray-700">{label}</span>
      <span className="text-gray-400 font-mono ml-auto">{color}</span>
    </div>
  );
}
