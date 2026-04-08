export interface MigrationItem {
  id: string;
  source_type: string;
  source_id: string | null;
  source_url: string | null;
  source_title: string | null;
  status: string;
  target_table: string | null;
  target_id: string | null;
  error_message: string | null;
  migrated_at: string | null;
  created_at: string;
}

export interface MigrationRedirect {
  id: string;
  old_path: string;
  new_path: string;
  status: string;
  hit_count: number;
  last_hit_at: string | null;
  redirect_type: number;
  meta_title: string | null;
  meta_description: string | null;
  priority: string;
  notes: string | null;
  created_at: string;
}

export interface MigrationBatch {
  id: string;
  name: string;
  description: string | null;
  source_type: string | null;
  total_items: number;
  completed_items: number;
  failed_items: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface MigrationLog {
  id: string;
  batch_id: string | null;
  item_id: string | null;
  level: string;
  message: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export type SourceType = 'rabbi' | 'lesson' | 'series' | 'image' | 'page' | 'qa';
export type RedirectPriority = 'critical' | 'high' | 'normal' | 'low';
export type RedirectType = 301 | 302;
export type ItemStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
export type RedirectStatus = 'active' | 'disabled' | 'broken';
export type BatchStatus = 'pending' | 'running' | 'completed' | 'failed';
export type LogLevel = 'info' | 'warning' | 'error';

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  rabbi: 'רב',
  lesson: 'שיעור',
  series: 'סדרה',
  image: 'תמונה',
  page: 'עמוד',
  qa: 'שו"ת',
};

export const REDIRECT_PRIORITY_LABELS: Record<RedirectPriority, string> = {
  critical: 'קריטי',
  high: 'גבוה',
  normal: 'רגיל',
  low: 'נמוך',
};

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  pending: 'ממתין',
  in_progress: 'בתהליך',
  completed: 'הושלם',
  failed: 'נכשל',
  skipped: 'דילוג',
};

export const REDIRECT_STATUS_LABELS: Record<RedirectStatus, string> = {
  active: 'פעיל',
  disabled: 'מושבת',
  broken: 'שבור',
};

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  pending: 'ממתין',
  running: 'רץ',
  completed: 'הושלם',
  failed: 'נכשל',
};

export const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
  info: 'מידע',
  warning: 'אזהרה',
  error: 'שגיאה',
};
