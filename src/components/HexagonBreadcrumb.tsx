import { LucideIcon } from 'lucide-react';
import { hexagon, getHexStateStyles, effects } from '../styles/cohive-theme';

interface HexagonBreadcrumbProps {
  label: string;
  color: string;
  status: 'completed' | 'active' | 'upcoming';
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
  textColor?: string;
  className?: string;
  usageCount?: number; // Number of times this hex has been used
  hideTextOutline?: boolean; // Whether to hide the text outline
}

export function HexagonBreadcrumb({ 
  label, 
  color, 
  status, 
  onClick,
  size = 'medium',
  textColor = 'white',
  className = '',
  usageCount = 0,
  hideTextOutline = false
}: HexagonBreadcrumbProps) {
  
  const dimensions = hexagon.sizes[size];
  const stateStyles = getHexStateStyles(status);
  
  // Sanitize label for use in IDs (remove newlines and special characters)
  const sanitizedLabel = label.replace(/\n/g, '-').replace(/[^a-zA-Z0-9-]/g, '-');
  
  const getOpacity = () => {
    switch (status) {
      case 'completed':
        return 'opacity-100';
      case 'active':
        return 'opacity-100 ring-4 ring-purple-400 ring-offset-2';
      case 'upcoming':
        return 'opacity-100'; // Full opacity for all clickable hexes
    }
  };

  const strokeColor = status === 'active' ? hexagon.stroke.active.color : hexagon.stroke.default.color;
  const strokeWidth = status === 'active' ? hexagon.stroke.active.width : hexagon.stroke.default.width;

  return (
    <button
      onClick={onClick}
      className={`group cursor-pointer transition-all ${getOpacity()} hover:scale-105 ${className} relative`}
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      <div className="relative w-full h-full">
        {/* SVG Elongated Hexagon */}
        <svg
          viewBox="0 0 200 165"
          className="w-full h-full transition-all duration-200"
          style={{ 
            filter: effects.shadow.hex3D,
            transition: 'filter 200ms ease-in-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = effects.shadow.hexHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = effects.shadow.hex3D;
          }}
        >
          <defs>
            <linearGradient id={`gradient-${sanitizedLabel}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: color, stopOpacity: 0.95 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.75 }} />
            </linearGradient>
            {/* Inner shadow filter for 3D depth */}
            <filter id={`innerShadow-${sanitizedLabel}`} x="-50%" y="-50%" width="200%" height="200%">
              <feOffset in="SourceAlpha" dx="0" dy="2" result="offsetBlur"/>
              <feFlood floodColor="#000000" floodOpacity="0.3" result="offsetColor"/>
              <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="offsetBlur"/>
              <feComposite in="SourceGraphic" in2="offsetBlur" operator="over"/>
            </filter>
            {/* Highlight for top edge */}
            <linearGradient id={`highlight-${sanitizedLabel}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 0.4 }} />
              <stop offset="30%" style={{ stopColor: '#ffffff', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {/* Main hexagon shape with gradient */}
          <polygon
            points={hexagon.points}
            fill={`url(#gradient-${sanitizedLabel})`}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            filter={`url(#innerShadow-${sanitizedLabel})`}
          />
          
          {/* Bevels on all sides for 3D effect */}
          {/* Top bevel (highlight) */}
          <polygon
            points="45,5 155,5 149,11 51,11"
            fill="rgba(255, 255, 255, 0.6)"
            stroke="none"
          />
          
          {/* Top-right bevel (light) */}
          <polygon
            points="155,5 195,82.5 189,82.5 149,11"
            fill="rgba(255, 255, 255, 0.4)"
            stroke="none"
          />
          
          {/* Bottom-right bevel (shadow) */}
          <polygon
            points="195,82.5 155,160 149,154 189,82.5"
            fill="rgba(0, 0, 0, 0.2)"
            stroke="none"
          />
          
          {/* Bottom bevel (shadow) */}
          <polygon
            points="155,160 45,160 51,154 149,154"
            fill="rgba(0, 0, 0, 0.25)"
            stroke="none"
          />
          
          {/* Bottom-left bevel (shadow) */}
          <polygon
            points="45,160 5,82.5 11,82.5 51,154"
            fill="rgba(0, 0, 0, 0.2)"
            stroke="none"
          />
          
          {/* Top-left bevel (light) */}
          <polygon
            points="5,82.5 45,5 51,11 11,82.5"
            fill="rgba(255, 255, 255, 0.4)"
            stroke="none"
          />
          
          {/* Top highlight for 3D effect */}
          <polygon
            points={hexagon.points}
            fill={`url(#highlight-${sanitizedLabel})`}
            stroke="none"
          />
        </svg>
        
        {/* Content centered in hexagon */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          <span 
            className="text-white text-center leading-tight font-bold" 
            style={{ 
              fontSize: dimensions.fontSize, 
              color: textColor,
              whiteSpace: 'pre-line',
              WebkitTextStroke: hideTextOutline ? '0px black' : '1px black',
              textStroke: hideTextOutline ? '0px black' : '1px black',
              paintOrder: 'stroke fill'
            }}
          >
            {label}
          </span>
          {usageCount > 0 && (
            <span 
              className="text-white text-center mt-0.5 font-bold" 
              style={{ 
                fontSize: '9px', 
                opacity: 0.9, 
                color: textColor,
                WebkitTextStroke: '0.5px black',
                textStroke: '0.5px black',
                paintOrder: 'stroke fill'
              }}
            >
              Used {usageCount}x
            </span>
          )}
        </div>
      </div>
    </button>
  );
}