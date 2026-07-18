/** audit.md の `## ` 見出し1つ分に対応するパース中間表現 */
export interface AuditEntry {
  heading: string;
  timestamp: string | null;
  userInput: string | null;
  aiResponse: string | null;
  context: string | null;
  order: number;
}

export type TraceEventType =
  | "stage-start"
  | "stage-complete"
  | "gate-prompt"
  | "gate-approved"
  | "gate-rework"
  | "user-input"
  | "unknown";

/** 正規化イベント・永続化単位 */
export interface TraceEvent {
  id: string;
  source: "audit-md";
  type: TraceEventType;
  timestamp: string;
  stage: string | null;
  heading?: string;
  hasUserInput: boolean;
  order: number;
  unknownReason?: string;
}

export interface SkippedEntry {
  heading: string;
  reason: string;
}

export interface ParseResult {
  events: TraceEvent[];
  skipped: SkippedEntry[];
}

export interface ApprovalWait {
  measurable: boolean;
  waitMs: number | null;
  respondedBy: string | null;
  unmeasurableReason?: "no-response-found";
}

export interface TimelineItem {
  event: TraceEvent;
  durationFromPrev: number | null;
  approvalWait: ApprovalWait | null;
}

export interface Timeline {
  items: TimelineItem[];
}

export interface StageSummary {
  stage: string;
  eventCount: number;
  durationMs: number | null;
  approvalWaits: {
    measurable: number;
    unmeasurable: number;
    totalWaitMs: number;
  };
}

export interface Summary {
  stages: StageSummary[];
  totalDurationMs: number | null;
}

/** EventStore.appendEvents の戻り値 */
export interface AppendResult {
  added: number;
  duplicates: number;
}

/** EventStore.loadEvents の戻り値(壊れた行のスキップ件数を含む) */
export interface LoadResult {
  events: TraceEvent[];
  skippedLines: number;
}
