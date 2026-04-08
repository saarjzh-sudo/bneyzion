import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useJoinCommunity } from "@/hooks/useMembership";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, CheckCircle2, BookOpen, Users, Flame } from "lucide-react";

interface JoinCommunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JoinCommunityDialog = ({ open, onOpenChange }: JoinCommunityDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const joinMutation = useJoinCommunity();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: "נא למלא שם פרטי ושם משפחה", variant: "destructive" });
      return;
    }
    try {
      await joinMutation.mutateAsync({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() });
      toast({ title: "ברוכים הבאים לקהילה!", description: "החברות שלך הופעלה בהצלחה" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "שגיאה בהרשמה", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-xl font-heading flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            הצטרפות לקהילת הלומדים
          </DialogTitle>
          <DialogDescription>
            הצטרפו לקהילה ותיהנו מגישה לתכנים בלעדיים, מעקב התקדמות ועוד
          </DialogDescription>
        </DialogHeader>

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="text-center p-3 bg-muted/50 rounded-xl">
            <BookOpen className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-[11px] text-muted-foreground">קורסים בלעדיים</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-xl">
            <Flame className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-[11px] text-muted-foreground">מעקב Streak</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-xl">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-[11px] text-muted-foreground">קהילת לומדים</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">שם פרטי *</Label>
              <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="ישראל" required />
            </div>
            <div>
              <Label htmlFor="lastName">שם משפחה *</Label>
              <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="ישראלי" required />
            </div>
          </div>
          <div>
            <Label htmlFor="phone">טלפון (אופציונלי)</Label>
            <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="050-1234567" type="tel" />
          </div>
          <div className="text-xs text-muted-foreground">
            <p>כתובת האימייל: <strong>{user?.email}</strong></p>
          </div>
          <Button type="submit" className="w-full gap-2" disabled={joinMutation.isPending}>
            {joinMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />מצטרף...</>
            ) : (
              <><CheckCircle2 className="h-4 w-4" />הצטרפות לקהילה</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JoinCommunityDialog;
