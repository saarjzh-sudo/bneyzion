import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMigrationItems, useUpdateMigrationItemStatus } from "@/hooks/useMigrationItems";
import { SOURCE_TYPE_LABELS, ITEM_STATUS_LABELS, type SourceType, type ItemStatus } from "@/types/migration";
import { AddMigrationItemDialog } from "./AddMigrationItemDialog";
import { Search, Plus, ChevronRight, ChevronLeft, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  in_progress: "secondary",
  pending: "outline",
  failed: "destructive",
  skipped: "outline",
};

export function MigrationItemsTable() {
  const [sourceType, setSourceType] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [page, setPage] = useState(1);
  const [rescanning, setRescanning] = useState<string | null>(null);

  const { data, isLoading } = useMigrationItems({ sourceType, status, search, page, pageSize: 50 });
  const updateStatus = useUpdateMigrationItemStatus();
  const queryClient = useQueryClient();

  const items = data?.items;
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  const handleRescan = async (itemId: string) => {
    setRescanning(itemId);
    try {
      const { data, error } = await supabase.functions.invoke("migrate-content", {
        body: { action: "rescan-item", options: { itemId } },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "שגיאה");
      toast.success(`עודכן בהצלחה: ${data.title}`);
      queryClient.invalidateQueries({ queryKey: ["migration-items"] });
    } catch (err: any) {
      toast.error(`שגיאה בסריקה מחדש: ${err.message}`);
    } finally {
      setRescanning(null);
    }
  };



  // Reset page when filters change
  const handleFilterChange = (setter: (v: string) => void) => (val: string) => {
    setter(val);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי כותרת או כתובת..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pr-10"
          />
        </div>
        <Select value={sourceType} onValueChange={handleFilterChange(setSourceType)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="סוג" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסוגים</SelectItem>
            {Object.entries(SOURCE_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={handleFilterChange(setStatus)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="סטטוס" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            {Object.entries(ITEM_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus className="h-4 w-4 ml-1" />
          הוסף פריט
        </Button>
        <span className="text-sm text-muted-foreground">{total.toLocaleString()} פריטים</span>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>כותרת</TableHead>
              <TableHead>סוג</TableHead>
              <TableHead>כתובת מקור</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>טבלת יעד</TableHead>
              <TableHead>שגיאה</TableHead>
              <TableHead>פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  טוען...
                </TableCell>
              </TableRow>
            ) : !items?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  אין פריטים
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.source_title || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {SOURCE_TYPE_LABELS[item.source_type as SourceType] || item.source_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs" dir="ltr">
                    {item.source_url || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[item.status] || "outline"}>
                      {ITEM_STATUS_LABELS[item.status as ItemStatus] || item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{item.target_table || "—"}</TableCell>
                  <TableCell className="max-w-[150px] truncate text-xs text-destructive">
                    {item.error_message || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Select
                        value={item.status}
                        onValueChange={(val) => updateStatus.mutate({ id: item.id, status: val })}
                      >
                        <SelectTrigger className="w-[100px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ITEM_STATUS_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={rescanning === item.id}
                        onClick={() => handleRescan(item.id)}
                        title="סרוק מחדש מאומברקו"
                      >
                        {rescanning === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            עמוד {page} מתוך {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronRight className="h-4 w-4" />
              הקודם
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              הבא
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AddMigrationItemDialog open={showAdd} onOpenChange={setShowAdd} />
    </div>
  );
}
