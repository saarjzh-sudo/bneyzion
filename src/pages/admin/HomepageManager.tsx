import { useState } from "react";
import { motion } from "framer-motion";
import {
  GripVertical, Eye, EyeOff, LayoutDashboard, Pencil, Save, RotateCcw,
  PartyPopper, Plus, Trash2, Link as LinkIcon, ExternalLink, X, Megaphone
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────
interface SectionConfig {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
}

interface BannerConfig {
  id: string;
  text: string;
  link: string;
  bgColor: string;
  textColor: string;
  enabled: boolean;
}

interface HomepageConfig {
  sections: SectionConfig[];
  holidayMode: boolean;
  holidayName: string;
  banners: BannerConfig[];
}

const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: "hero", label: "Hero ראשי", icon: "🎬", enabled: true },
  { id: "learning-dashboard", label: "דשבורד למידה", icon: "📊", enabled: true },
  { id: "recommendations", label: "המלצות / פופולרי", icon: "🎯", enabled: true },
  { id: "parasha-holiday", label: "פרשה וחג", icon: "📖", enabled: true },
  { id: "quiz", label: "חידון תנ״ך", icon: "❓", enabled: true },
  { id: "strength", label: "כוחו של תנ״ך", icon: "💪", enabled: true },
  { id: "rabbis", label: "סליידר רבנים", icon: "👤", enabled: true },
  { id: "whatsapp", label: "קהילת ווטסאפ", icon: "💬", enabled: true },
  { id: "memorial", label: "הנצחה", icon: "🕯️", enabled: true },
  { id: "dedication", label: "הקדשות", icon: "✨", enabled: true },
];

const DEFAULT_CONFIG: HomepageConfig = {
  sections: DEFAULT_SECTIONS,
  holidayMode: false,
  holidayName: "",
  banners: [],
};

// ─── Component ──────────────────────────────────────────
const HomepageManager = () => {
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionConfig | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [bannerDialog, setBannerDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerConfig | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ["homepage-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "homepage_config")
        .maybeSingle();
      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value) as HomepageConfig;
          return { ...DEFAULT_CONFIG, ...parsed, sections: parsed.sections || DEFAULT_SECTIONS };
        } catch { return DEFAULT_CONFIG; }
      }
      return DEFAULT_CONFIG;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newConfig: HomepageConfig) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "homepage_config", value: JSON.stringify(newConfig) }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-config"] });
      setHasChanges(false);
      toast.success("הגדרות דף הבית נשמרו בהצלחה");
    },
    onError: () => toast.error("שגיאה בשמירה"),
  });

  const updateConfig = (partial: Partial<HomepageConfig>) => {
    if (!config) return;
    const updated = { ...config, ...partial };
    queryClient.setQueryData(["homepage-config"], updated);
    setHasChanges(true);
  };

  const sections = config?.sections || DEFAULT_SECTIONS;

  // ─── Drag & Drop ────────────────────────────────────
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => setDraggedIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newSections = [...sections];
    const [dragged] = newSections.splice(draggedIndex, 1);
    newSections.splice(index, 0, dragged);
    updateConfig({ sections: newSections });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => setDraggedIndex(null);

  const toggleSection = (id: string) => {
    updateConfig({
      sections: sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    });
  };

  // ─── Quick Edit ─────────────────────────────────────
  const openQuickEdit = (section: SectionConfig) => {
    setEditingSection({ ...section });
    setEditDialog(true);
  };

  const saveQuickEdit = () => {
    if (!editingSection) return;
    updateConfig({
      sections: sections.map((s) => (s.id === editingSection.id ? editingSection : s)),
    });
    setEditDialog(false);
    setEditingSection(null);
  };

  // ─── Banners ────────────────────────────────────────
  const banners = config?.banners || [];

  const openBannerEdit = (banner?: BannerConfig) => {
    setEditingBanner(
      banner || {
        id: crypto.randomUUID(),
        text: "",
        link: "",
        bgColor: "hsl(var(--primary))",
        textColor: "hsl(var(--primary-foreground))",
        enabled: true,
      }
    );
    setBannerDialog(true);
  };

  const saveBanner = () => {
    if (!editingBanner) return;
    const exists = banners.find((b) => b.id === editingBanner.id);
    const updated = exists
      ? banners.map((b) => (b.id === editingBanner.id ? editingBanner : b))
      : [...banners, editingBanner];
    updateConfig({ banners: updated });
    setBannerDialog(false);
    setEditingBanner(null);
  };

  const deleteBanner = (id: string) => {
    updateConfig({ banners: banners.filter((b) => b.id !== id) });
  };

  const toggleBanner = (id: string) => {
    updateConfig({
      banners: banners.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b)),
    });
  };

  // ─── Save / Reset ──────────────────────────────────
  const handleSave = () => {
    if (config) saveMutation.mutate(config);
  };

  const resetToDefault = () => {
    queryClient.setQueryData(["homepage-config"], DEFAULT_CONFIG);
    setHasChanges(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-heading flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              ניהול דף הבית
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              סדר סקשנים, באנרים ומצב חג — הכל נשמר ב-DB
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              <RotateCcw className="h-4 w-4 ml-1" />
              איפוס
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || saveMutation.isPending}
              className="gap-1.5"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? "שומר..." : "שמור שינויים"}
            </Button>
          </div>
        </div>

        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center gap-2 text-sm text-primary"
          >
            <Save className="h-4 w-4" />
            יש שינויים שלא נשמרו — לחץ "שמור שינויים"
          </motion.div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ═══ Left: Sections + Settings ═══ */}
          <div className="xl:col-span-2 space-y-6">
            {/* Holiday Mode */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PartyPopper className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">מצב חג 🎉</p>
                      <p className="text-xs text-muted-foreground">עיצוב מיוחד, רקע חגיגי ואייקונים</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {config?.holidayMode && (
                      <Input
                        value={config.holidayName || ""}
                        onChange={(e) => updateConfig({ holidayName: e.target.value })}
                        placeholder="שם החג (פסח, סוכות...)"
                        className="w-40 h-8 text-sm"
                      />
                    )}
                    <Switch
                      checked={config?.holidayMode || false}
                      onCheckedChange={(checked) => updateConfig({ holidayMode: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sections */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">סקשנים בדף הבית</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sections.map((section, index) => (
                      <motion.div
                        key={section.id}
                        layout
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e: any) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          draggedIndex === index
                            ? "border-primary bg-primary/5 shadow-md"
                            : section.enabled
                            ? "border-border bg-card hover:border-primary/20"
                            : "border-border bg-muted/50 opacity-60"
                        }`}
                      >
                        <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors">
                          <GripVertical className="h-5 w-5" />
                        </div>

                        <span className="text-xl">{section.icon}</span>

                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground">{section.label}</span>
                          <span className="text-xs text-muted-foreground mr-2">#{index + 1}</span>
                          {section.title && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              כותרת: {section.title}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openQuickEdit(section)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {section.enabled ? (
                            <Eye className="h-4 w-4 text-primary" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Switch
                            checked={section.enabled}
                            onCheckedChange={() => toggleSection(section.id)}
                            disabled={section.id === "hero"}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Banners */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" />
                    באנרים
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => openBannerEdit()} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    באנר חדש
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {banners.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>אין באנרים פעילים</p>
                    <p className="text-xs mt-1">הוסף באנר עם טקסט וקישור</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {banners.map((banner) => (
                      <div
                        key={banner.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border"
                      >
                        <div
                          className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: banner.bgColor, color: banner.textColor }}
                        >
                          B
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{banner.text || "ללא טקסט"}</p>
                          {banner.link && (
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <LinkIcon className="h-3 w-3" />
                              {banner.link}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={banner.enabled}
                            onCheckedChange={() => toggleBanner(banner.id)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openBannerEdit(banner)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteBanner(banner.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ═══ Right: Live Preview ═══ */}
          <div className="space-y-4">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  תצוגה מקדימה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-xl p-3 space-y-1.5 max-h-[60vh] overflow-y-auto">
                  {config?.holidayMode && (
                    <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-2 text-center text-xs font-medium text-amber-700 dark:text-amber-300">
                      🎉 מצב חג: {config.holidayName || "פעיל"}
                    </div>
                  )}

                  {banners
                    .filter((b) => b.enabled)
                    .map((b) => (
                      <div
                        key={b.id}
                        className="rounded-lg p-2 text-center text-xs font-medium"
                        style={{ backgroundColor: b.bgColor, color: b.textColor }}
                      >
                        {b.text}
                      </div>
                    ))}

                  {sections
                    .filter((s) => s.enabled)
                    .map((section, i) => (
                      <div
                        key={section.id}
                        className="bg-card border border-border rounded-lg p-2.5 flex items-center gap-2"
                      >
                        <span className="text-sm">{section.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium">
                            {section.title || section.label}
                          </span>
                          {section.subtitle && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {section.subtitle}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {i + 1}
                        </Badge>
                      </div>
                    ))}

                  {sections.filter((s) => !s.enabled).length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <p className="text-[10px] text-muted-foreground text-center">
                        {sections.filter((s) => !s.enabled).length} סקשנים מוסתרים
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ═══ Quick Edit Dialog ═══ */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              עריכה מהירה — {editingSection?.label}
            </DialogTitle>
          </DialogHeader>
          {editingSection && (
            <div className="space-y-4">
              <div>
                <Label>כותרת מותאמת</Label>
                <Input
                  value={editingSection.title || ""}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, title: e.target.value })
                  }
                  placeholder={editingSection.label}
                />
              </div>
              <div>
                <Label>תיאור / כותרת משנה</Label>
                <Textarea
                  value={editingSection.subtitle || ""}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, subtitle: e.target.value })
                  }
                  rows={2}
                  placeholder="תיאור קצר..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>טקסט כפתור</Label>
                  <Input
                    value={editingSection.ctaText || ""}
                    onChange={(e) =>
                      setEditingSection({ ...editingSection, ctaText: e.target.value })
                    }
                    placeholder="לכל השיעורים"
                  />
                </div>
                <div>
                  <Label>קישור כפתור</Label>
                  <Input
                    value={editingSection.ctaLink || ""}
                    onChange={(e) =>
                      setEditingSection({ ...editingSection, ctaLink: e.target.value })
                    }
                    placeholder="/series"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              ביטול
            </Button>
            <Button onClick={saveQuickEdit}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Banner Edit Dialog ═══ */}
      <Dialog open={bannerDialog} onOpenChange={setBannerDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              {editingBanner && banners.find((b) => b.id === editingBanner.id)
                ? "עריכת באנר"
                : "באנר חדש"}
            </DialogTitle>
          </DialogHeader>
          {editingBanner && (
            <div className="space-y-4">
              <div>
                <Label>טקסט הבאנר</Label>
                <Input
                  value={editingBanner.text}
                  onChange={(e) =>
                    setEditingBanner({ ...editingBanner, text: e.target.value })
                  }
                  placeholder="הירשמו עכשיו לקורס חדש!"
                />
              </div>
              <div>
                <Label>קישור</Label>
                <Input
                  value={editingBanner.link}
                  onChange={(e) =>
                    setEditingBanner({ ...editingBanner, link: e.target.value })
                  }
                  placeholder="/chapter-weekly"
                  dir="ltr"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>צבע רקע</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editingBanner.bgColor.startsWith("#") ? editingBanner.bgColor : "#3b82f6"}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, bgColor: e.target.value })
                      }
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={editingBanner.bgColor}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, bgColor: e.target.value })
                      }
                      className="flex-1"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div>
                  <Label>צבע טקסט</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editingBanner.textColor.startsWith("#") ? editingBanner.textColor : "#ffffff"}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, textColor: e.target.value })
                      }
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={editingBanner.textColor}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, textColor: e.target.value })
                      }
                      className="flex-1"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div>
                <Label>תצוגה מקדימה</Label>
                <div
                  className="rounded-lg p-3 text-center text-sm font-medium mt-1"
                  style={{ backgroundColor: editingBanner.bgColor, color: editingBanner.textColor }}
                >
                  {editingBanner.text || "טקסט הבאנר..."}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBannerDialog(false)}>
              ביטול
            </Button>
            <Button onClick={saveBanner}>שמור באנר</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default HomepageManager;
