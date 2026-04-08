import { useState, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTopics, useCreateTopic, useUpdateTopic, useDeleteTopic, type Topic } from "@/hooks/useTopics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Plus, ChevronDown, ChevronLeft, Pencil, Trash2, FolderTree, BookOpen, Tag, GripVertical,
} from "lucide-react";
import { toast } from "sonner";

interface TopicNode extends Topic {
  children: TopicNode[];
  lessonCount: number;
  totalLessonCount: number;
}

type DropPosition = "inside" | "before" | "after";

interface DragState {
  draggedId: string | null;
  overId: string | null;
  dropPosition: DropPosition | null;
}

export function TagsManager() {
  const { data: topics, isLoading } = useTopics();
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Topic | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", parent_id: "" });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dragState, setDragState] = useState<DragState>({ draggedId: null, overId: null, dropPosition: null });
  const [isDragging, setIsDragging] = useState(false);

  const { data: lessonCounts } = useQuery({
    queryKey: ["topic-lesson-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lesson_topics").select("topic_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data || []) {
        counts[row.topic_id] = (counts[row.topic_id] || 0) + 1;
      }
      return counts;
    },
  });

  const tree = useMemo(() => {
    if (!topics) return [];
    const counts = lessonCounts || {};
    const nodeMap = new Map<string, TopicNode>();

    for (const t of topics) {
      nodeMap.set(t.id, { ...t, children: [], lessonCount: counts[t.id] || 0, totalLessonCount: counts[t.id] || 0 });
    }

    const roots: TopicNode[] = [];
    for (const node of nodeMap.values()) {
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        nodeMap.get(node.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    function calcTotal(node: TopicNode): number {
      let total = node.lessonCount;
      for (const child of node.children) total += calcTotal(child);
      node.totalLessonCount = total;
      return total;
    }
    roots.forEach(calcTotal);

    function sortChildren(nodes: TopicNode[]) {
      nodes.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "he"));
      nodes.forEach((n) => sortChildren(n.children));
    }
    sortChildren(roots);

    return roots;
  }, [topics, lessonCounts]);

  // Flatten tree for sibling calculations
  const flatNodes = useMemo(() => {
    const result: { node: TopicNode; parentId: string | null }[] = [];
    function walk(nodes: TopicNode[], parentId: string | null) {
      for (const n of nodes) {
        result.push({ node: n, parentId });
        walk(n.children, n.id);
      }
    }
    walk(tree, null);
    return result;
  }, [tree]);

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.trim().toLowerCase();
    function matches(node: TopicNode): boolean {
      if (node.name.toLowerCase().includes(q) || node.slug.toLowerCase().includes(q)) return true;
      return node.children.some(matches);
    }
    function filterNodes(nodes: TopicNode[]): TopicNode[] {
      return nodes.filter(matches).map((n) => ({ ...n, children: filterNodes(n.children) }));
    }
    return filterNodes(tree);
  }, [tree, search]);

  // ─── Drag & Drop handlers ────────────────────────

  const isDescendant = useCallback((nodeId: string, potentialAncestorId: string): boolean => {
    if (!topics) return false;
    let current = topics.find(t => t.id === nodeId);
    while (current?.parent_id) {
      if (current.parent_id === potentialAncestorId) return true;
      current = topics.find(t => t.id === current!.parent_id);
    }
    return false;
  }, [topics]);

  const handleDragStart = useCallback((e: React.DragEvent, nodeId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", nodeId);
    setDragState({ draggedId: nodeId, overId: null, dropPosition: null });
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragState.draggedId === nodeId) return;
    // Can't drop on own descendant
    if (dragState.draggedId && isDescendant(nodeId, dragState.draggedId)) {
      e.dataTransfer.dropEffect = "none";
      return;
    }
    e.dataTransfer.dropEffect = "move";

    // Determine drop position based on Y position within element
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    let position: DropPosition;
    if (y < h * 0.25) position = "before";
    else if (y > h * 0.75) position = "after";
    else position = "inside";

    setDragState(prev => ({ ...prev, overId: nodeId, dropPosition: position }));
  }, [dragState.draggedId, isDescendant]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the actual element
    const related = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(related)) {
      setDragState(prev => ({ ...prev, overId: null, dropPosition: null }));
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetId || !topics) return;

    // Can't drop on own descendant
    if (isDescendant(targetId, draggedId)) {
      toast.error("לא ניתן להעביר נושא לתוך תת-נושא שלו");
      resetDrag();
      return;
    }

    const { dropPosition } = dragState;
    const targetNode = flatNodes.find(f => f.node.id === targetId);
    if (!targetNode) { resetDrag(); return; }

    let newParentId: string | null;
    let siblings: TopicNode[];

    if (dropPosition === "inside") {
      // Drop inside target → becomes child of target
      newParentId = targetId;
      const targetTreeNode = findNode(tree, targetId);
      siblings = targetTreeNode?.children || [];
    } else {
      // Drop before/after target → same parent as target
      newParentId = targetNode.parentId;
      if (newParentId) {
        const parentTreeNode = findNode(tree, newParentId);
        siblings = parentTreeNode?.children || [];
      } else {
        siblings = tree;
      }
    }

    // Calculate new sort_order
    let newSortOrder: number;
    const filtered = siblings.filter(s => s.id !== draggedId);

    if (dropPosition === "inside") {
      // Append at end
      newSortOrder = filtered.length > 0 ? Math.max(...filtered.map(s => s.sort_order)) + 1 : 0;
    } else {
      const targetIdx = filtered.findIndex(s => s.id === targetId);
      if (dropPosition === "before") {
        if (targetIdx <= 0) newSortOrder = filtered[0]?.sort_order - 1 || 0;
        else newSortOrder = Math.floor((filtered[targetIdx - 1].sort_order + filtered[targetIdx].sort_order) / 2);
      } else {
        if (targetIdx >= filtered.length - 1) newSortOrder = (filtered[filtered.length - 1]?.sort_order || 0) + 1;
        else newSortOrder = Math.floor((filtered[targetIdx].sort_order + filtered[targetIdx + 1].sort_order) / 2);
      }
    }

    try {
      const { error } = await supabase
        .from("topics")
        .update({ parent_id: newParentId, sort_order: newSortOrder } as any)
        .eq("id", draggedId);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["topics"] });

      // Auto-expand new parent
      if (newParentId) {
        setExpandedIds(prev => new Set([...prev, newParentId!]));
      }

      const draggedName = topics.find(t => t.id === draggedId)?.name;
      const targetName = dropPosition === "inside"
        ? topics.find(t => t.id === targetId)?.name
        : (newParentId ? topics.find(t => t.id === newParentId)?.name : "שורש");
      toast.success(`"${draggedName}" הועבר ל"${targetName}"`);
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהעברה");
    }

    resetDrag();
  }, [dragState, topics, tree, flatNodes, isDescendant, queryClient]);

  const handleDragEnd = useCallback(() => resetDrag(), []);

  const resetDrag = () => {
    setDragState({ draggedId: null, overId: null, dropPosition: null });
    setIsDragging(false);
  };

  // ─── Other handlers ───────────────────────────────

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => topics && setExpandedIds(new Set(topics.map(t => t.id)));
  const collapseAll = () => setExpandedIds(new Set());

  const openAdd = (parentId?: string) => {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", parent_id: parentId || "" });
    setDialogOpen(true);
  };

  const openEdit = (t: Topic) => {
    setEditing(t);
    setForm({ name: t.name, slug: t.slug, description: t.description || "", parent_id: t.parent_id || "" });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.slug) { toast.error("שם ו-slug נדרשים"); return; }
    const payload = { name: form.name, slug: form.slug, description: form.description || null, parent_id: form.parent_id || null };
    try {
      if (editing) {
        await updateTopic.mutateAsync({ id: editing.id, ...payload });
        toast.success("הנושא עודכן");
      } else {
        await createTopic.mutateAsync(payload);
        toast.success("הנושא נוצר");
      }
      setDialogOpen(false);
    } catch (e: any) { toast.error(e.message || "שגיאה"); }
  };

  const handleDelete = async (t: Topic) => {
    const hasChildren = topics?.some(c => c.parent_id === t.id);
    if (hasChildren) { toast.error("לא ניתן למחוק נושא שיש לו תתי-נושאים"); return; }
    if (!confirm(`למחוק את "${t.name}"?`)) return;
    try {
      await deleteTopic.mutateAsync(t.id);
      toast.success("הנושא נמחק");
    } catch (e: any) { toast.error(e.message || "שגיאה במחיקה"); }
  };

  const handleNameChange = (name: string) => {
    setForm(prev => ({ ...prev, name, slug: editing ? prev.slug : name.replace(/\s+/g, "-").toLowerCase() }));
  };

  const totalTopics = topics?.length || 0;
  const rootTopics = tree.length;
  const totalLessonsTagged = Object.values(lessonCounts || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="text-2xl font-heading text-primary">{totalTopics}</div>
          <div className="text-xs text-muted-foreground">סה״כ נושאים</div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="text-2xl font-heading text-primary">{rootTopics}</div>
          <div className="text-xs text-muted-foreground">נושאי שורש</div>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <div className="text-2xl font-heading text-accent">{totalLessonsTagged}</div>
          <div className="text-xs text-muted-foreground">שיוכי שיעורים</div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="חיפוש נושאים..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Button size="sm" onClick={() => openAdd()}>
          <Plus className="h-4 w-4 ml-1" />
          נושא חדש
        </Button>
        <Button variant="outline" size="sm" onClick={expandAll}>
          <ChevronDown className="h-4 w-4 ml-1" />
          פתח הכל
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          <ChevronLeft className="h-4 w-4 ml-1" />
          סגור הכל
        </Button>
      </div>

      {/* Drag hint */}
      {!isLoading && totalTopics > 1 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <GripVertical className="h-3 w-3" />
          גרור נושא כדי לשנות סדר או להעביר לנושא אב אחר
        </p>
      )}

      {/* Tree */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">טוען...</div>
        ) : filteredTree.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FolderTree className="h-10 w-10 mx-auto mb-2 opacity-40" />
            {search ? "לא נמצאו תוצאות" : "אין נושאים עדיין"}
          </div>
        ) : (
          <div className="divide-y">
            {filteredTree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                onToggle={toggleExpand}
                onEdit={openEdit}
                onDelete={handleDelete}
                onAddChild={(parentId) => openAdd(parentId)}
                dragState={dragState}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        )}

        {/* Root drop zone */}
        {isDragging && (
          <div
            className="h-10 border-2 border-dashed border-primary/30 rounded-b-lg flex items-center justify-center text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/5"
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
            onDrop={async (e) => {
              e.preventDefault();
              const draggedId = e.dataTransfer.getData("text/plain");
              if (!draggedId) return;
              try {
                const { error } = await supabase
                  .from("topics")
                  .update({ parent_id: null, sort_order: tree.length } as any)
                  .eq("id", draggedId);
                if (error) throw error;
                queryClient.invalidateQueries({ queryKey: ["topics"] });
                toast.success("הנושא הועבר לשורש");
              } catch (err: any) { toast.error(err.message || "שגיאה"); }
              resetDrag();
            }}
          >
            שחרר כאן להפוך לנושא שורש
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading text-right">
              {editing ? "עריכת נושא" : "נושא חדש"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>שם *</Label>
              <Input value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="למשל: פרשת בראשית" />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} dir="ltr" placeholder="parsha-bereshit" />
            </div>
            <div className="space-y-2">
              <Label>תיאור</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="תיאור קצר של הנושא..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>נושא אב</Label>
              <Select value={form.parent_id || "none"} onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="ללא" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא (שורש)</SelectItem>
                  {topics?.filter(t => t.id !== editing?.id).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleSubmit} disabled={!form.name || !form.slug || createTopic.isPending || updateTopic.isPending}>
              {createTopic.isPending || updateTopic.isPending ? "שומר..." : editing ? "עדכן" : "צור"}
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Helper: find node in tree ──────────────────────────────

function findNode(nodes: TopicNode[], id: string): TopicNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

// ─── Tree Node Component ────────────────────────────────────

interface TreeNodeProps {
  node: TopicNode;
  depth: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (t: Topic) => void;
  onDelete: (t: Topic) => void;
  onAddChild: (parentId: string) => void;
  dragState: DragState;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
}

function TreeNode({
  node, depth, expandedIds, onToggle, onEdit, onDelete, onAddChild,
  dragState, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
}: TreeNodeProps) {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const isBeingDragged = dragState.draggedId === node.id;
  const isDropTarget = dragState.overId === node.id && dragState.draggedId !== node.id;

  // Visual drop indicator
  let dropIndicatorClass = "";
  if (isDropTarget) {
    switch (dragState.dropPosition) {
      case "before":
        dropIndicatorClass = "border-t-2 border-t-primary";
        break;
      case "after":
        dropIndicatorClass = "border-b-2 border-b-primary";
        break;
      case "inside":
        dropIndicatorClass = "bg-primary/10 ring-1 ring-primary/40 ring-inset";
        break;
    }
  }

  return (
    <div className={isBeingDragged ? "opacity-40" : ""}>
      <div
        className={`flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-all group ${dropIndicatorClass}`}
        style={{ paddingRight: `${depth * 24 + 12}px` }}
        draggable
        onDragStart={(e) => onDragStart(e, node.id)}
        onDragOver={(e) => onDragOver(e, node.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, node.id)}
        onDragEnd={onDragEnd}
      >
        {/* Drag handle */}
        <div className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Expand/collapse toggle */}
        <button
          className={`h-5 w-5 flex items-center justify-center rounded transition-colors ${
            hasChildren ? "hover:bg-muted cursor-pointer" : "opacity-0"
          }`}
          onClick={() => hasChildren && onToggle(node.id)}
        >
          {hasChildren && (
            isExpanded
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>

        {/* Icon */}
        {hasChildren ? (
          <FolderTree className="h-4 w-4 text-primary shrink-0" />
        ) : (
          <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
        )}

        {/* Name */}
        <span className="font-display text-sm flex-1 select-none">{node.name}</span>

        {/* Lesson count */}
        {node.totalLessonCount > 0 && (
          <Badge variant="secondary" className="text-xs gap-1">
            <BookOpen className="h-3 w-3" />
            {node.totalLessonCount}
            {node.lessonCount !== node.totalLessonCount && (
              <span className="text-muted-foreground">({node.lessonCount})</span>
            )}
          </Badge>
        )}

        {/* Children count */}
        {hasChildren && (
          <Badge variant="outline" className="text-xs">
            {node.children.length} תתי-נושאים
          </Badge>
        )}

        {/* Actions */}
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddChild(node.id)} title="הוסף תת-נושא">
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(node)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(node)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              dragState={dragState}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}
