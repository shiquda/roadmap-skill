import React, { useState } from 'react';
import TagBadge from '../TagBadge.js';
import ColorPicker from '../ColorPicker.js';

interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt?: string;
  taskCount?: number;
}

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  tags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
}

const TagManagerModal: React.FC<TagManagerModalProps> = ({
  isOpen,
  onClose,
  projectId,
  tags,
  onTagsChange,
}) => {
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#74B9FF');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [editingTagColor, setEditingTagColor] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          onTagsChange([...tags, result.data]);
          setNewTagName('');
          setNewTagColor('#74B9FF');
        }
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTag = async (tagId: string) => {
    if (!editingTagName.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/tags/${tagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingTagName.trim(),
          color: editingTagColor,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          onTagsChange(tags.map(t => t.id === tagId ? result.data : t));
          setEditingTagId(null);
        }
      }
    } catch (error) {
      console.error('Failed to update tag:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/tags/${tagId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        onTagsChange(tags.filter(t => t.id !== tagId));
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
    setEditingTagColor(tag.color);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Manage Tags</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Create New Tag */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Create New Tag</h3>
            <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-slate-100">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Tag name..."
                  className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                />
                <button
                  onClick={handleCreateTag}
                  disabled={isLoading || !newTagName.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all font-semibold text-sm shadow-md shadow-blue-500/20 active:scale-95"
                >
                  Add
                </button>
              </div>
              <ColorPicker 
                selectedColor={newTagColor} 
                onChange={setNewTagColor}
                className="pt-2"
              />
            </div>
          </section>

          {/* Tag List */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Existing Tags ({tags.length})
            </h3>
            <div className="space-y-3">
              {tags.length === 0 ? (
                <div className="text-center py-8 text-slate-400 italic text-sm border-2 border-dashed border-slate-100 rounded-xl">
                  No tags created yet
                </div>
              ) : (
                tags.map((tag) => (
                  <div 
                    key={tag.id}
                    className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {editingTagId === tag.id ? (
                        <div className="flex flex-col gap-3 w-full mr-4">
                          <input
                            type="text"
                            value={editingTagName}
                            onChange={(e) => setEditingTagName(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateTag(tag.id)}
                          />
                          <ColorPicker 
                            selectedColor={editingTagColor} 
                            onChange={setEditingTagColor}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateTag(tag.id)}
                              className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTagId(null)}
                              className="text-xs bg-slate-200 text-slate-600 px-3 py-1 rounded-md font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <TagBadge name={tag.name} color={tag.color} variant="soft" />
                          <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full font-medium">
                            {tag.taskCount || 0} tasks
                          </span>
                        </>
                      )}
                    </div>
                    
                    {editingTagId !== tag.id && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditing(tag)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Tag"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Tag"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-sm shadow-sm active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagManagerModal;
