import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      if (!dismissed) setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", "1");
  };

  return (
    <>
      {/* Offline Banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-0 inset-x-0 z-[100] bg-amber-600 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-2"
          >
            <WifiOff className="h-4 w-4" />
            אנחנו עובדים על חיבור, בינתיים תוכל לגשת לתוכן השמור
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[90] bg-card border border-border rounded-2xl shadow-2xl p-4"
          >
            <button onClick={handleDismiss} className="absolute top-3 left-3 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-sm font-bold text-foreground">הוסף למסך הבית</h3>
                <p className="text-xs text-muted-foreground">גישה מהירה לשיעורים גם ללא חיבור</p>
              </div>
            </div>
            <Button onClick={handleInstall} className="w-full" size="sm">
              <Download className="h-4 w-4 ml-2" />
              התקן את בני ציון
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InstallPrompt;
