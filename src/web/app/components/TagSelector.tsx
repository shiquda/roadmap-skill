import React from 'react';
import TagBadge from './TagBadge.js';

interface TagSelectorProps {
  tags: Array<{ id: string; name: string; color: string }>;
  selectedTagIds: string[];
  onChange: (selectedTagIds: string[]) => void;
  className?: string;
}

/**
 * TagSelector component for selecting multiple tags.
 * Displays all available tags and highlights selected ones.
 */
const TagSelector: React.FC<TagSelectorProps> = ({
  tags,
  selectedTagIds,
  onChange,
  className = '',
}) => {
  const handleToggleTag = (tagId: string) => {
    const isSelected = selectedTagIds.includes(tagId);
    if (isSelected) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => {
        const isSelected = selectedTagIds.includes(tag.id);
        return (
          <TagBadge
            key={tag.id}
            name={tag.name}
            color={tag.color}
            variant={isSelected ? 'solid' : 'outline'}
            onClick={() => handleToggleTag(tag.id)}
            className="select-none"
          />
        );
      })}
    </div>
  );
};

export default TagSelector;
