import React from 'react';

interface TagBadgeProps {
  name: string;
  color: string; // hex color like "#FF5733"
  size?: 'sm' | 'md';
  variant?: 'soft' | 'solid' | 'outline';
  onClick?: () => void;
  className?: string;
}

const TagBadge: React.FC<TagBadgeProps> = ({
  name,
  color,
  size = 'md',
  variant = 'soft',
  onClick,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  const getStyles = () => {
    switch (variant) {
      case 'solid':
        return {
          backgroundColor: color,
          color: '#ffffff',
          border: `1px solid ${color}`,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: color,
          border: `1px solid ${color}`,
        };
      case 'soft':
      default:
        return {
          backgroundColor: `${color}15`,
          color: color,
          border: `1px solid ${color}30`,
        };
    }
  };

  return (
    <span
      onClick={handleClick}
      className={`inline-flex items-center font-medium rounded-full transition-all duration-200 ${
        sizeClasses[size]
      } ${onClick ? 'cursor-pointer hover:brightness-95 active:scale-95' : ''} ${className}`}
      style={getStyles()}
    >
      {name}
    </span>
  );
};

export default TagBadge;
