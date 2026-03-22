import { useState, useEffect } from 'react';
import { FolderPlus, FolderOpen, Trash2, Pencil, Check, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useCollections } from '../../hooks/useCollections';
import { useI18n } from '../../lib/i18n';
import type { Collection } from '../../lib/types';

const COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
  '#6b7280',
];

interface Props {
  selected: number | null;
  onSelect: (id: number | null) => void;
  totalCount: number;
}

export default function CollectionSidebar({ selected, onSelect, totalCount }: Props) {
  const { collections, isLoading, create, rename, remove, reorder } = useCollections();
  const { t } = useI18n();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const [localCollections, setLocalCollections] = useState<Collection[]>([]);

  useEffect(() => {
    setLocalCollections(collections);
  }, [collections]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const startIndex = result.source.index;
    const endIndex = result.destination.index;
    if (startIndex === endIndex) return;

    const newOrder = Array.from(localCollections);
    const [removed] = newOrder.splice(startIndex, 1);
    newOrder.splice(endIndex, 0, removed);

    setLocalCollections(newOrder);

    const updates = newOrder.map((col, index) => ({
      id: col.id,
      sort_order: index,
    }));

    try {
      await reorder(updates);
    } catch (e) {
      console.error('Reorder collection failed:', e);
      toast.error('Failed to reorder collections');
      setLocalCollections(collections);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await create({ name, color: newColor });
      setNewName('');
      setIsCreating(false);
    } catch (e) {
      console.error('Create collection failed:', e);
      toast.error(t.errors.collectionCreate);
    }
  };

  const handleRename = async (id: number) => {
    const name = editName.trim();
    if (!name) return;
    try {
      await rename({ id, name });
      setEditingId(null);
    } catch (e) {
      console.error('Rename collection failed:', e);
      toast.error(t.errors.collectionRename);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove(id);
      if (selected === id) onSelect(null);
    } catch (e) {
      console.error('Delete collection failed:', e);
      toast.error(t.errors.collectionDelete);
    }
  };

  const deleteConfirmTitle = t.collections.confirmDeleteTitle;
  const deleteConfirmDesc = t.collections.confirmDeleteDesc;
  const deleteLabel = t.collections.deleteButton;
  const cancelLabel = t.collections.cancelButton;

  return (
    <nav
      className="w-48 shrink-0 flex flex-col h-full"
      role="navigation"
      aria-label={t.a11y.collectionNav}
    >
      {/* All items */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
          selected === null
            ? 'bg-indigo-50 text-indigo-700 font-medium'
            : 'text-gray-700 hover:bg-gray-100',
        )}
      >
        {t.collections.all(totalCount)}
      </button>

      {/* Collection list */}
      {isLoading ? (
        <div className="mt-2 space-y-0.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center px-3 py-2 gap-2">
              <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-3 w-4 shrink-0" />
            </div>
          ))}
        </div>
      ) : localCollections.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-gray-400">
          <FolderOpen className="w-8 h-8 mb-2" />
          <p className="text-xs text-center">{t.collections.emptyList}</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="collections">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="mt-2 space-y-0.5 overflow-y-auto flex-1 min-h-[50px] pr-1"
                style={{ overflowX: 'hidden' }}
              >
                {localCollections.map((col, index) => (
                  <Draggable key={col.id.toString()} draggableId={col.id.toString()} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          'group flex items-center bg-white rounded-lg',
                          snapshot.isDragging &&
                            'shadow-md z-50 outline outline-1 outline-indigo-200',
                        )}
                        style={provided.draggableProps.style}
                      >
                        {editingId === col.id ? (
                          <div className="flex items-center gap-1 w-full px-1 py-1">
                            <Input
                              autoFocus
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              maxLength={200}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRename(col.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="flex-1 h-7 text-sm"
                            />
                            <button
                              onClick={() => handleRename(col.id)}
                              className="p-0.5 text-green-600"
                              aria-label={t.collections.rename}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-0.5 text-gray-400"
                              aria-label={t.collections.cancelButton}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div
                              {...provided.dragHandleProps}
                              className="px-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>
                            <button
                              onClick={() => onSelect(col.id)}
                              className={cn(
                                'flex-1 text-left py-2 pr-2 text-sm truncate transition-colors flex items-center gap-2',
                                selected === col.id
                                  ? 'text-indigo-700 font-medium'
                                  : 'text-gray-700 hover:text-indigo-600',
                              )}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: col.color }}
                              />
                              <span className="truncate">{col.name}</span>
                              <span className="text-xs text-gray-400 ml-auto shrink-0">
                                {col.item_count}
                              </span>
                            </button>
                            <div className="hidden group-hover:flex items-center shrink-0 pr-1">
                              <button
                                onClick={() => {
                                  setEditingId(col.id);
                                  setEditName(col.name);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                                aria-label={t.collections.rename}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button
                                    className="p-1 text-gray-400 hover:text-red-500"
                                    aria-label={t.collections.delete}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{deleteConfirmTitle}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {deleteConfirmDesc}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(col.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {deleteLabel}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Create new */}
      {isCreating ? (
        <div className="mt-3 space-y-2 pb-2">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setIsCreating(false);
            }}
            placeholder={t.collections.namePlaceholder}
            maxLength={200}
            className="h-8 text-sm"
          />
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={cn(
                  'w-5 h-5 rounded-full border-2',
                  newColor === c ? 'border-gray-800' : 'border-transparent',
                )}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <Button size="sm" onClick={handleCreate}>
              {t.collections.createButton}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
              {t.collections.cancelButton}
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="mt-3 mb-2 flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-indigo-600 w-full"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          {t.collections.create}
        </button>
      )}
    </nav>
  );
}
