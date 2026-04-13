import { useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { motion } from "framer-motion";
import { Send, Phone, Mail, MessageCircle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  useSEO({
    title: "צור קשר",
    description: "צרו קשר עם עמותת בני ציון – שאלות, הצעות, שיתופי פעולה.",
    url: "https://bneyzion.co.il/contact",
  });
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) {
      toast({ title: "שגיאה", description: "נא למלא שם והודעה", variant: "destructive" });
      return;
    }
    if (form.name.length > 100 || form.message.length > 5000 || form.email.length > 255) {
      toast({ title: "שגיאה", description: "אחד מהשדות ארוך מדי", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("contact_messages" as any).insert({
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      subject: form.subject.trim() || null,
      message: form.message.trim(),
    } as any);
    setLoading(false);

    if (error) {
      toast({ title: "שגיאה בשליחה", description: "נסו שוב מאוחר יותר", variant: "destructive" });
    } else {
      toast({ title: "ההודעה נשלחה בהצלחה! ✨", description: "נחזור אליכם בהקדם" });
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    }
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container py-12 md:py-20"
        dir="rtl"
      >
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-heading gradient-warm mb-3 text-center">צרו קשר</h1>
          <p className="text-muted-foreground text-center mb-10">נשמח לשמוע מכם — שאלות, הצעות, או סתם מילה טובה</p>

          {/* Contact info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <a href="mailto:office@bneyzion.co.il" className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors">
              <Mail className="h-5 w-5 text-primary shrink-0" />
              <div className="text-sm">
                <div className="font-semibold text-foreground">אימייל</div>
                <div className="text-muted-foreground" dir="ltr">office@bneyzion.co.il</div>
              </div>
            </a>
            <a href={`https://wa.me/972527368607`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors">
              <MessageCircle className="h-5 w-5 text-primary shrink-0" />
              <div className="text-sm">
                <div className="font-semibold text-foreground">וואטסאפ</div>
                <div className="text-muted-foreground" dir="ltr">052-736-8607</div>
              </div>
            </a>
            <a href="tel:+972527368607" className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition-colors">
              <Phone className="h-5 w-5 text-primary shrink-0" />
              <div className="text-sm">
                <div className="font-semibold text-foreground">טלפון</div>
                <div className="text-muted-foreground" dir="ltr">052-736-8607</div>
              </div>
            </a>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border rounded-xl p-6 md:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">שם מלא *</Label>
                <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={100} required />
              </div>
              <div>
                <Label htmlFor="email">אימייל</Label>
                <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} maxLength={255} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">טלפון</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} maxLength={20} dir="ltr" />
              </div>
              <div>
                <Label htmlFor="subject">נושא</Label>
                <Input id="subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} maxLength={200} />
              </div>
            </div>
            <div>
              <Label htmlFor="message">הודעה *</Label>
              <Textarea id="message" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={5} maxLength={5000} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full font-display">
              {loading ? "שולח..." : <>שליחה <Send className="h-4 w-4 mr-2" /></>}
            </Button>
          </form>
        </div>
      </motion.div>
    </Layout>
  );
};

export default Contact;
