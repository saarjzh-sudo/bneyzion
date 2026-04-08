import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddRedirect, useUpdateRedirect } from "@/hooks/useRedirects";
import { REDIRECT_STATUS_LABELS, REDIRECT_PRIORITY_LABELS } from "@/types/migration";
import { toast } from "sonner";
import type { MigrationRedirect } from "@/types/migration";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: MigrationRedirect;
}

export function AddRedirectDialog({ open, onOpenChange, editData }: Props) {
  const [oldPath, setOldPath] = useState("");
  const [newPath, setNewPath] = useState("");
  const [status, setStatus] = useState("active");
  const [redirectType, setRedirectType] = useState("301");
  const [priority, setPriority] = useState("normal");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [notes, setNotes] = useState("");

  const addRedirect = useAddRedirect();
  const updateRedirect = useUpdateRedirect();

  useEffect(() => {
    if (editData) {
      setOldPath(editData.old_path);
      setNewPath(editData.new_path);
      setStatus(editData.status);
      setRedirectType(String(editData.redirect_type || 301));
      setPriority(editData.priority || "normal");
      setMetaTitle(editData.meta_title || "");
      setMetaDescription(editData.meta_description || "");
      setNotes(editData.notes || "");
    } else {
      setOldPath("");
      setNewPath("");
      setStatus("active");
      setRedirectType("301");
      setPriority("normal");
      setMetaTitle("");
      setMetaDescription("");
      setNotes("");
    }
  }, [editData, open]);

  const handleSubmit = async () => {
    if (!oldPath.trim()) {
      toast.error("נא להזין נתיב ישן");
      return;
    }
    try {
      const payload = {
        old_path: oldPath.trim(),
        new_path: newPath.trim(),
        status,
        redirect_type: parseInt(redirectType),
        priority,
        meta_title: metaTitle.trim() || null,
        meta_description: metaDescription.trim() || null,
        notes: notes.trim() || null,
      };
      if (editData) {
        await updateRedirect.mutateAsync({ id: editData.id, ...payload });
        toast.success("הפניה עודכנה");
      } else {
        await addRedirect.mutateAsync(payload);
        toast.success("הפניה נוספה");
      }
      onOpenChange(false);
    } catch {
      toast.error("שגיאה בשמירה");
    }
  };

  const isLoading = addRedirect.isPending || updateRedirect.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-display text-right">
            {editData ? "עריכת הפניה" : "הוספת הפניה חדשה"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>נתיב ישן *</Label>
              <Input value={oldPath} onChange={(e) => setOldPath(e.target.value)} dir="ltr" placeholder="/old/path" />
            </div>
            <div className="space-y-2">
              <Label>נתיב חדש</Label>
              <Input value={newPath} onChange={(e) => setNewPath(e.target.value)} dir="ltr" placeholder="/new/path" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>סוג הפניה</Label>
              <Select value={redirectType} onValueChange={setRedirectType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="301">301 (קבוע)</SelectItem>
                  <SelectItem value="302">302 (זמני)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>עדיפות</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(REDIRECT_PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>סטטוס</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(REDIRECT_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>כותרת מקורית (SEO)</Label>
            <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="כותרת העמוד המקורית" />
          </div>
          <div className="space-y-2">
            <Label>תיאור מקורי (SEO)</Label>
            <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="תיאור העמוד לשימור דירוג גוגל" rows={2} />
          </div>
          <div className="space-y-2">
            <Label>הערות</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="הערות פנימיות" />
          </div>
        </div>
        <DialogFooter className="flex-row-reverse gap-2">
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "שומר..." : editData ? "עדכן" : "הוסף"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
