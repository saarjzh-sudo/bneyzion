/**
 * ContentLocationPicker — Visual location picker for the upload wizard.
 *
 * Three modes:
 *   "existing_series"      — user picks an existing series node
 *   "new_series_in_node"   — user picks a parent node and names a new series
 *   "standalone"           — lesson with no series affiliation
 *
 * Critique fixes applied:
 *   I  — bookCategoryId used ONLY for pre-expand, not as parent_id
 *   L  — parent_id comes exclusively from the node the user clicks in the tree
 *   K  — Feature 1 autocomplete restricted to book-nodes only (no series titles)
 *   Feature 4 — search field above tabs
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, ChevronDown, ChevronLeft, AlertCircle, Plus, FolderOpen, Check, Loader2 } from "lucide-react";
import { useContentSidebar } from "@/hooks/useContentSidebar";

// ─── design tokens (match ContentUpload) ────────────────────────────
const GOLD   = "#8B6F47";
const GOLD_L = "#C4A265";
const GOLD_S = "#E8D5A0";
const PARCH  = "#FAF6F0";
const PARCH_D = "#F5F0E8";
const NAVY   = "#1A2744";
const TXT    = "#2D1F0E";
const TXT_M  = "#6B5C4A";

// ─── exported types ──────────────────────────────────────────────────
export interface SelectedLocation {
  mode: "existing_series" | "new_series_in_node" | "standalone";
  seriesId?: string;
  seriesTitle?: string;
  parentNodeId?: string;
  parentNodeTitle?: string;
}

interface ContentLocationPickerProps {
  /** audience tags from step 1 — used to show teacher-content warning */
  audienceTags: string[];
  /** book node id from feature-1 autocomplete — pre-expand only */
  initialBookId?: string;
  onSelect: (loc: SelectedLocation) => void;
  value: SelectedLocation | null;
}

// ─── NodeSeriesPanel ─────────────────────────────────────────────────
interface NodeSeriesPanelProps {
  nodeId: string;
  nodeTitle: string;
  onSelect: (loc: SelectedLocation) => void;
  currentValue: SelectedLocation | null;
}

function NodeSeriesPanel({ nodeId, nodeTitle, onSelect, currentValue }: NodeSeriesPanelProps) {
  const { useSeriesForNode } = useContentSidebar();
  const { data: series, isLoading } = useSeriesForNode(nodeId);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleSelectExisting = (id: string, title: string) => {
    onSelect({ mode: "existing_series", seriesId: id, seriesTitle: title });
  };

  const handleCreateNew = () => {
    const t = newTitle.trim();
    if (!t) return;
    onSelect({ mode: "new_series_in_node", parentNodeId: nodeId, parentNodeTitle: nodeTitle });
    // We pass the title back via a special field the caller can read
    // Actually — caller needs newSeriesTitle separately. We expose it via parentNodeTitle
    // and the caller reads form.newSeriesTitle from its own state. So here just set the loc.
    // But spec says the caller needs the title for createSeries. We embed it in parentNodeTitle
    // using a delimiter the caller knows about — no, cleaner: add seriesTitle to loc too.
    onSelect({ mode: "new_series_in_node", parentNodeId: nodeId, parentNodeTitle: nodeTitle, seriesTitle: t });
    setCreatingNew(false);
    setNewTitle("");
  };

  return (
    <div
      className="rounded-xl p-4 mt-2 space-y-3"
      style={{ background: PARCH_D, border: `1px solid ${GOLD_S}` }}
    >
      <p className="text-xs font-display font-semibold" style={{ color: GOLD }}>
        {nodeTitle}
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs" style={{ color: TXT_M }}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          טוען סדרות...
        </div>
      ) : (series && series.length > 0) ? (
        <ul className="space-y-1.5 max-h-48 overflow-y-auto">
          {series.map(s => {
            const isSelected = currentValue?.mode === "existing_series" && currentValue.seriesId === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => handleSelectExisting(s.id, s.title)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm text-right transition-all"
                  style={{
                    background: isSelected ? `${GOLD}18` : "#fff",
                    border: `1px solid ${isSelected ? GOLD : GOLD_S}`,
                    color: isSelected ? GOLD : TXT,
                  }}
                >
                  <span className="flex-1 truncate">{s.title}</span>
                  <span className="shrink-0 text-xs font-display" style={{ color: TXT_M }}>
                    {s.lessonCount ?? 0} שיעורים
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD }} />}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs" style={{ color: TXT_M }}>אין סדרות קיימות בצומת זה.</p>
      )}

      {/* create new series in this node */}
      {!creatingNew ? (
        <button
          type="button"
          onClick={() => setCreatingNew(true)}
          className="flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: GOLD, border: `1px solid ${GOLD_S}`, background: "#fff" }}
        >
          <Plus className="h-3.5 w-3.5" />
          צור סדרה חדשה כאן
        </button>
      ) : (
        <div className="space-y-2">
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleCreateNew(); } }}
            placeholder="שם הסדרה החדשה..."
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              direction: "rtl",
              borderColor: GOLD_S,
              background: "#fff",
              color: TXT,
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateNew}
              disabled={!newTitle.trim()}
              className="flex-1 py-1.5 rounded-lg text-xs font-display transition-opacity"
              style={{
                background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_L} 100%)`,
                color: "#fff",
                opacity: newTitle.trim() ? 1 : 0.5,
              }}
            >
              אישור
            </button>
            <button
              type="button"
              onClick={() => { setCreatingNew(false); setNewTitle(""); }}
              className="flex-1 py-1.5 rounded-lg text-xs font-display border"
              style={{ borderColor: GOLD_S, color: TXT_M }}
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────
export function ContentLocationPicker({
  audienceTags,
  initialBookId,
  onSelect,
  value,
}: ContentLocationPickerProps) {
  const { categories, extraSections, isLoading } = useContentSidebar();

  type TabId = "tanach" | "topics" | "standalone";
  const [activeTab, setActiveTab] = useState<TabId>("tanach");

  // accordion open state: set of ids
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [openBooks, setOpenBooks] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeTitle, setSelectedNodeTitle] = useState<string>("");

  // Feature 4 — search
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isTeacherContent = audienceTags.includes("teachers");

  // Pre-expand when initialBookId changes (feature 1 integration — critique I/L)
  useEffect(() => {
    if (!initialBookId || !categories.length) return;
    for (const cat of categories) {
      const book = cat.books.find(b => b.id === initialBookId);
      if (book) {
        setOpenCategories(prev => new Set([...prev, cat.id]));
        setOpenBooks(prev => new Set([...prev, initialBookId]));
        setActiveTab("tanach");
        break;
      }
    }
  }, [initialBookId, categories]);

  // ── search logic (Feature 4) ────────────────────────────────────
  interface SearchResult {
    nodeId: string;
    nodeTitle: string;
    breadcrumb: string;
    tabId: TabId;
    categoryId?: string;
    bookId?: string;
  }

  const searchResults = useMemo<SearchResult[]>(() => {
    const q = searchTerm.trim();
    if (q.length < 2) return [];
    const lower = q.toLowerCase();
    const results: SearchResult[] = [];

    // Tanach: categories → books → children
    for (const cat of categories) {
      for (const book of cat.books) {
        // book level itself
        if (book.title.toLowerCase().includes(lower)) {
          results.push({
            nodeId: book.id,
            nodeTitle: book.title,
            breadcrumb: `${cat.title} › ${book.title}`,
            tabId: "tanach",
            categoryId: cat.id,
            bookId: book.id,
          });
        }
        // children (parshiot / chapters)
        for (const child of book.children) {
          if (child.title.toLowerCase().includes(lower)) {
            results.push({
              nodeId: child.id,
              nodeTitle: child.title,
              breadcrumb: `${cat.title} › ${book.title} › ${child.title}`,
              tabId: "tanach",
              categoryId: cat.id,
              bookId: book.id,
            });
          }
        }
      }
    }

    // Extra sections
    for (const section of extraSections) {
      if (section.title.toLowerCase().includes(lower)) {
        results.push({
          nodeId: section.id,
          nodeTitle: section.title,
          breadcrumb: `נושאים › ${section.title}`,
          tabId: "topics",
        });
      }
      for (const child of section.children) {
        if (child.title.toLowerCase().includes(lower)) {
          results.push({
            nodeId: child.id,
            nodeTitle: child.title,
            breadcrumb: `נושאים › ${section.title} › ${child.title}`,
            tabId: "topics",
          });
        }
      }
    }

    return results.slice(0, 12);
  }, [searchTerm, categories, extraSections]);

  const handleSearchResultClick = (result: SearchResult) => {
    setSearchTerm("");
    setActiveTab(result.tabId);
    if (result.tabId === "tanach") {
      if (result.categoryId) setOpenCategories(prev => new Set([...prev, result.categoryId!]));
      if (result.bookId) setOpenBooks(prev => new Set([...prev, result.bookId!]));
    }
    setSelectedNodeId(result.nodeId);
    setSelectedNodeTitle(result.nodeTitle);
  };

  const toggleCategory = (id: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleBook = (id: string) => {
    setOpenBooks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleNodeClick = (nodeId: string, nodeTitle: string) => {
    setSelectedNodeId(nodeId);
    setSelectedNodeTitle(nodeTitle);
  };

  const handleStandaloneSelect = () => {
    onSelect({ mode: "standalone" });
  };

  // ── tabs ──────────────────────────────────────────────────────────
  const TABS: { id: TabId; label: string }[] = [
    { id: "tanach", label: 'תנ"ך' },
    { id: "topics", label: "נושאים ומועדים" },
    { id: "standalone", label: "ללא שיוך" },
  ];

  if (isLoading) {
    return (
      <div className="rounded-xl p-6 space-y-3" style={{ background: PARCH, border: `1px solid ${GOLD_S}` }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: PARCH_D }} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${GOLD_S}`, background: PARCH }}
    >
      {/* teacher-content warning */}
      {isTeacherContent && (
        <div
          className="flex items-start gap-2 px-4 py-2.5 text-xs"
          style={{ background: "#F0FDF4", borderBottom: `1px solid #86EFAC` }}
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#15803D" }} />
          <span style={{ color: "#166534" }}>
            תוכן עם תיוג "מורים" לא יופיע בעץ הציבורי — יוצג באגף המורים בלבד.
          </span>
        </div>
      )}

      {/* search — Feature 4 */}
      <div className="p-3 relative" style={{ borderBottom: `1px solid ${GOLD_S}` }}>
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ right: 10, color: TXT_M }} />
          <input
            ref={searchInputRef}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="חפש מיקום... (ספר, פרשה, נושא)"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              direction: "rtl",
              paddingRight: 34,
              borderColor: GOLD_S,
              background: "#fff",
              color: TXT,
            }}
          />
        </div>
        {searchResults.length > 0 && (
          <div
            className="absolute left-3 right-3 z-20 mt-1 rounded-xl shadow-lg overflow-hidden"
            style={{ background: "#fff", border: `1px solid ${GOLD_S}`, top: "100%" }}
          >
            {searchResults.map(r => (
              <button
                key={r.nodeId}
                type="button"
                onClick={() => handleSearchResultClick(r)}
                className="w-full flex flex-col gap-0.5 px-4 py-2.5 text-right hover:bg-amber-50 transition-colors"
              >
                <span className="text-sm font-display" style={{ color: TXT }}>{r.nodeTitle}</span>
                <span className="text-xs" style={{ color: TXT_M }}>{r.breadcrumb}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* tabs */}
      <div className="flex" style={{ borderBottom: `1px solid ${GOLD_S}` }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 text-sm font-display transition-colors"
            style={{
              color: activeTab === tab.id ? GOLD : TXT_M,
              borderBottom: activeTab === tab.id ? `2px solid ${GOLD}` : "2px solid transparent",
              background: activeTab === tab.id ? `${GOLD}08` : "transparent",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-3 max-h-[420px] overflow-y-auto">

        {/* ── tab: תנ"ך ─────────────────────────────────────────── */}
        {activeTab === "tanach" && (
          <div className="space-y-1">
            {categories.map(cat => (
              <div key={cat.id}>
                {/* category row */}
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-display font-semibold transition-colors"
                  style={{ color: NAVY, background: openCategories.has(cat.id) ? `${GOLD}10` : "transparent" }}
                >
                  <span>{cat.title}</span>
                  {openCategories.has(cat.id)
                    ? <ChevronDown className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
                    : <ChevronLeft className="h-4 w-4 shrink-0" style={{ color: TXT_M }} />
                  }
                </button>

                {openCategories.has(cat.id) && (
                  <div className="mr-3 space-y-0.5 mt-0.5">
                    {cat.books.map(book => (
                      <div key={book.id}>
                        {/* book row */}
                        <button
                          type="button"
                          onClick={() => toggleBook(book.id)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-sm font-display transition-colors"
                          style={{
                            color: openBooks.has(book.id) ? GOLD : TXT,
                            background: openBooks.has(book.id) ? `${GOLD}08` : "transparent",
                          }}
                        >
                          <span>{book.title}</span>
                          {openBooks.has(book.id)
                            ? <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: GOLD }} />
                            : <ChevronLeft className="h-3.5 w-3.5 shrink-0" style={{ color: TXT_M }} />
                          }
                        </button>

                        {openBooks.has(book.id) && (
                          <div className="mr-3 mt-0.5 space-y-0.5">
                            {/* book itself as target (for book-level series) */}
                            <button
                              type="button"
                              onClick={() => handleNodeClick(book.id, book.title)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-display transition-all"
                              style={{
                                color: selectedNodeId === book.id ? GOLD : TXT_M,
                                background: selectedNodeId === book.id ? `${GOLD}12` : "transparent",
                                border: `1px solid ${selectedNodeId === book.id ? GOLD_S : "transparent"}`,
                              }}
                            >
                              <FolderOpen className="h-3 w-3 shrink-0" />
                              {book.title} (ספר כולו)
                              {selectedNodeId === book.id && <Check className="h-3 w-3 mr-auto" style={{ color: GOLD }} />}
                            </button>
                            {/* children (parshiot / chapters) */}
                            {book.children.map(child => (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => handleNodeClick(child.id, child.title)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-display transition-all"
                                style={{
                                  color: selectedNodeId === child.id ? GOLD : TXT,
                                  background: selectedNodeId === child.id ? `${GOLD}12` : "transparent",
                                  border: `1px solid ${selectedNodeId === child.id ? GOLD_S : "transparent"}`,
                                }}
                              >
                                <span className="flex-1 text-right">{child.title}</span>
                                {selectedNodeId === child.id && <Check className="h-3 w-3 shrink-0" style={{ color: GOLD }} />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── tab: נושאים ומועדים ──────────────────────────────── */}
        {activeTab === "topics" && (
          <div className="space-y-1">
            {extraSections.map(section => {
              const open = openCategories.has(section.id);
              return (
                <div key={section.id}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(section.id)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-display transition-colors"
                    style={{
                      color: open ? GOLD : TXT,
                      background: open ? `${GOLD}08` : "transparent",
                    }}
                  >
                    <span>{section.title}</span>
                    {open
                      ? <ChevronDown className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
                      : <ChevronLeft className="h-4 w-4 shrink-0" style={{ color: TXT_M }} />
                    }
                  </button>
                  {open && (
                    <div className="mr-3 mt-0.5 space-y-0.5">
                      {/* section itself */}
                      <button
                        type="button"
                        onClick={() => handleNodeClick(section.id, section.title)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-display transition-all"
                        style={{
                          color: selectedNodeId === section.id ? GOLD : TXT_M,
                          background: selectedNodeId === section.id ? `${GOLD}12` : "transparent",
                          border: `1px solid ${selectedNodeId === section.id ? GOLD_S : "transparent"}`,
                        }}
                      >
                        <FolderOpen className="h-3 w-3 shrink-0" />
                        {section.title} (כולו)
                        {selectedNodeId === section.id && <Check className="h-3 w-3 mr-auto" style={{ color: GOLD }} />}
                      </button>
                      {section.children.map(child => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => handleNodeClick(child.id, child.title)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-display transition-all"
                          style={{
                            color: selectedNodeId === child.id ? GOLD : TXT,
                            background: selectedNodeId === child.id ? `${GOLD}12` : "transparent",
                            border: `1px solid ${selectedNodeId === child.id ? GOLD_S : "transparent"}`,
                          }}
                        >
                          <span className="flex-1 text-right">{child.title}</span>
                          {selectedNodeId === child.id && <Check className="h-3 w-3 shrink-0" style={{ color: GOLD }} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── tab: ללא שיוך ─────────────────────────────────────── */}
        {activeTab === "standalone" && (
          <div className="space-y-4 py-2">
            <div
              className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
            >
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#D97706" }} />
              <p className="text-sm" style={{ color: "#92400E" }}>
                שיעור ללא סדרה לא יופיע בעץ הניווט של האתר. ניתן להוסיף לסדרה מאוחר יותר דרך עמוד הניהול.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStandaloneSelect}
              className="w-full py-3 rounded-xl text-sm font-display transition-colors"
              style={{
                background: value?.mode === "standalone" ? `${GOLD}18` : "#fff",
                border: `1px solid ${value?.mode === "standalone" ? GOLD : GOLD_S}`,
                color: value?.mode === "standalone" ? GOLD : TXT,
              }}
            >
              {value?.mode === "standalone" ? "✓ נבחר — ללא שיוך" : "המשך ללא שיוך"}
            </button>
          </div>
        )}
      </div>

      {/* NodeSeriesPanel — shown when a node is selected (not standalone) */}
      {selectedNodeId && activeTab !== "standalone" && (
        <div className="p-3 pt-0">
          <NodeSeriesPanel
            nodeId={selectedNodeId}
            nodeTitle={selectedNodeTitle}
            onSelect={onSelect}
            currentValue={value}
          />
        </div>
      )}

      {/* current selection summary */}
      {value && (
        <div
          className="px-4 py-2.5 flex items-center gap-2 text-xs font-display"
          style={{ borderTop: `1px solid ${GOLD_S}`, color: GOLD }}
        >
          <Check className="h-3.5 w-3.5 shrink-0" />
          {value.mode === "existing_series" && `סדרה נבחרה: ${value.seriesTitle}`}
          {value.mode === "new_series_in_node" && `סדרה חדשה תחת: ${value.parentNodeTitle}`}
          {value.mode === "standalone" && "ללא שיוך לסדרה"}
        </div>
      )}
    </div>
  );
}
