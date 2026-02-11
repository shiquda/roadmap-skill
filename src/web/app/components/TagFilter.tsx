import React from 'react';
import TagBadge from './TagBadge.js';

interface TagFilterProps {
  tags: Array<{ id: string; name: string; color: string }>;
  selectedTags: string[]; // selected tag IDs
  onChange: (selectedTagIds: string[]) => void;
  className?: string;
}

const TagFilter: React.FC<TagFilterProps> = ({
  tags,
  selectedTags,
  onChange,
  className = '',
}) => {
  const handleTagClick = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter(id => id !== tagId));
    } else {
      onChange([...selectedTags, tagId]);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {tags.map((tag) => {
        const isSelected = selectedTags.includes(tag.id);
        return (
          <TagBadge
            key={tag.id}
            name={tag.name}
            color={tag.color}
            variant={isSelected ? 'solid' : 'outline'}
            onClick={() => handleTagClick(tag.id)}
            size="md"
          />
        );
      })}
      
      {selectedTags.length > 0 && (
        <button
          onClick={handleClearAll}
          className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 transition-colors font-medium ml-1"
        >
          Clear All
        </button>
      )}
    </div>
  );
};

export default TagFilter;
