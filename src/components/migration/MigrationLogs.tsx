import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMigrationLogs } from "@/hooks/useMigrationLogs";
import { LOG_LEVEL_LABELS, type LogLevel } from "@/types/migration";
import { Search, Info, AlertTriangle, XCircle } from "lucide-react";

const LEVEL_ICON: Record<string, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const LEVEL_COLOR: Record<string, string> = {
  info: "text-primary",
  warning: "text-accent",
  error: "text-destructive",
};

export function MigrationLogs({ batchId }: { batchId?: string }) {
  const [level, setLevel] = useState("all");
  const [search, setSearch] = useState("");

  const { data: logs, isLoading } = useMigrationLogs({ level, search, batchId });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש בלוגים..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="רמה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הרמות</SelectItem>
            {Object.entries(LOG_LEVEL_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">טוען...</div>
      ) : !logs?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">אין לוגים</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {logs.map((log) => {
            const Icon = LEVEL_ICON[log.level] || Info;
            return (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${LEVEL_COLOR[log.level] || ""}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {LOG_LEVEL_LABELS[log.level as LogLevel] || log.level}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("he-IL")}
                    </span>
                  </div>
                  <p className="text-sm">{log.message}</p>
                  {log.details && (
                    <pre className="text-xs mt-1 p-2 bg-muted rounded text-muted-foreground overflow-x-auto" dir="ltr">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
