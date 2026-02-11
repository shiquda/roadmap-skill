import React from 'react';

interface ColorPickerProps {
  selectedColor: string;
  onChange: (color: string) => void;
  className?: string;
}

const PRESET_COLORS = [
  '#FF6B6B', // 红色
  '#FF9F43', // 橙色
  '#FDCB6E', // 黄色
  '#6C5CE7', // 紫色
  '#74B9FF', // 蓝色
  '#00B894', // 绿色
  '#00CEC9', // 青色
  '#E17055', // 珊瑚
  '#FAB1A0', // 粉色
  '#55A3FF', // 天蓝
  '#A29BFE', // 淡紫
  '#FD79A8', // 玫瑰
];

/**
 * ColorPicker component for selecting from a set of preset colors
 */
const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex flex-wrap gap-2.5 ${className}`}>
      {PRESET_COLORS.map((color) => {
        const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
        
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-8 h-8 rounded-full transition-all duration-300 hover:scale-110 active:scale-90 ${
              isSelected 
                ? 'border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.1),0_8_16px_-4px_rgba(0,0,0,0.2)] scale-115 z-10' 
                : 'hover:shadow-md'
            }`}
            style={{ backgroundColor: color }}
            title={color}
            aria-label={`Select color ${color}`}
          />
        );
      })}
    </div>
  );
};

export default ColorPicker;
