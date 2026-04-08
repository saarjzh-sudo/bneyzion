import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddMigrationItem } from "@/hooks/useMigrationItems";
import { SOURCE_TYPE_LABELS } from "@/types/migration";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMigrationItemDialog({ open, onOpenChange }: Props) {
  const [sourceType, setSourceType] = useState("page");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceId, setSourceId] = useState("");

  const addItem = useAddMigrationItem();

  const handleSubmit = async () => {
    if (!sourceTitle.trim()) {
      toast.error("נא להזין כותרת");
      return;
    }
    try {
      await addItem.mutateAsync({
        source_type: sourceType,
        source_title: sourceTitle.trim(),
        source_url: sourceUrl.trim() || null,
        source_id: sourceId.trim() || null,
      });
      toast.success("פריט נוסף בהצלחה");
      onOpenChange(false);
      setSourceTitle("");
      setSourceUrl("");
      setSourceId("");
    } catch {
      toast.error("שגיאה בהוספת פריט");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-display">הוספת פריט מיגרציה</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>סוג</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SOURCE_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>כותרת *</Label>
            <Input value={sourceTitle} onChange={(e) => setSourceTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>כתובת מקור</Label>
            <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label>מזהה מקור</Label>
            <Input value={sourceId} onChange={(e) => setSourceId(e.target.value)} dir="ltr" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
          <Button onClick={handleSubmit} disabled={addItem.isPending}>
            {addItem.isPending ? "מוסיף..." : "הוסף"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
