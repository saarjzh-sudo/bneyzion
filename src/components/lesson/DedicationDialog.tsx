import { useState } from "react";
import { Heart, Flame, Cross, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateDedication } from "@/hooks/useLessonDedications";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const TYPES = [
  { value: "iluy_neshama", label: "לעילוי נשמת", icon: Flame, placeholder: "שם הנפטר/ת..." },
  { value: "refua", label: "לרפואה שלמה", icon: Heart, placeholder: "שם החולה..." },
  { value: "memory", label: "לזכרון", icon: BookOpen, placeholder: "שם המוקדש..." },
];

export default function DedicationDialog({ lessonId, lessonTitle }: { lessonId: string; lessonTitle: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("iluy_neshama");
  const [name, setName] = useState("");
  const [dedicator, setDedicator] = useState("");
  const [message, setMessage] = useState("");
  const { mutate, isPending } = useCreateDedication();
  const { user } = useAuth();
  const { toast } = useToast();

  const selectedType = TYPES.find((t) => t.value === type)!;

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: "נא למלא שם", variant: "destructive" });
      return;
    }
    mutate(
      {
        lesson_id: lessonId,
        dedication_type: type,
        dedicated_name: name.trim(),
        dedicator_name: dedicator.trim() || undefined,
        message: message.trim() || undefined,
        user_id: user?.id,
      },
      {
        onSuccess: () => {
          toast({ title: "ההקדשה נשמרה בהצלחה 💛" });
          setOpen(false);
          setName("");
          setDedicator("");
          setMessage("");
        },
        onError: (err: any) => toast({ title: "שגיאה", description: err.message, variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Heart className="h-3.5 w-3.5 text-primary" />
          הקדש שיעור
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">הקדשת שיעור</DialogTitle>
          <p className="text-sm text-muted-foreground">{lessonTitle}</p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Type selection */}
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`py-3 px-2 rounded-xl text-xs font-display transition-all border text-center ${
                  type === t.value
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/20"
                }`}
              >
                <t.icon className="h-4 w-4 mx-auto mb-1" />
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <Label>{selectedType.label}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={selectedType.placeholder}
              className="mt-1"
            />
          </div>

          <div>
            <Label>שם המקדיש (רשות)</Label>
            <Input
              value={dedicator}
              onChange={(e) => setDedicator(e.target.value)}
              placeholder="שמך..."
              className="mt-1"
            />
          </div>

          <div>
            <Label>הודעה אישית (רשות)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="תוכן ההקדשה..."
              rows={2}
              className="mt-1"
            />
          </div>

          <Button onClick={handleSubmit} disabled={isPending} className="w-full font-display gap-2">
            <Heart className="h-4 w-4" />
            {isPending ? "שומר..." : "שמור הקדשה"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
