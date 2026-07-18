# コンポーネントメソッド定義 — spica Trace 層 v1

メソッドシグネチャと入出力の高水準定義。詳細なビジネスルール(判定条件・エッジケース)は
Functional Design(CONSTRUCTION)で定義する。

## AuditLogParser(src/core/parser.ts)

```typescript
/** audit.md の生テキストをエントリ列に分解する */
function parseAuditMarkdown(markdown: string): { entries: AuditEntry[]; skipped: SkippedEntry[] };

/** エントリ列を正規化イベントに変換する */
function toTraceEvents(entries: AuditEntry[]): TraceEvent[];

/** 上記 2 つをまとめた便宜関数 */
function parseAuditLog(markdown: string): ParseResult; // { events, skipped }
```

## EventStore(src/core/store.ts)

```typescript
/** events.jsonl を読み込む(ファイル不在なら空) */
function loadEvents(storePath: string): TraceEvent[];

/** 新規イベントのみ追記する(イベント ID で重複排除・冪等) */
function appendEvents(storePath: string, events: TraceEvent[]): { added: number; duplicates: number };
```

## TraceAnalyzer(src/core/analyzer.ts)

```typescript
/** イベント列 → タイムライン(区間所要時間・承認待ちの計測可否を含む) */
function buildTimeline(events: TraceEvent[]): Timeline;

/** イベント列 → セッション / ステージ別サマリー */
function buildSummary(events: TraceEvent[]): Summary;
```

## TraceService(src/cli/trace-service.ts — オーケストレーション)

```typescript
/** パース → 永続化 → 分析 の一連の流れを実行する(サービス層。詳細は services.md) */
function runTrace(aidlcDocsPath: string): TraceResult; // { timeline, summary, parseInfo, storeInfo }
```

## Renderers(src/cli/)

```typescript
function renderTimeline(timeline: Timeline, parseInfo: ParseInfo): string;
function renderSummary(summary: Summary, parseInfo: ParseInfo): string;
```

## 主要型(src/core/types.ts)

```typescript
type TraceEventType =
  | "stage-start"      // ステージ開始
  | "stage-complete"   // ステージ完了
  | "gate-prompt"      // 承認プロンプト提示
  | "gate-approved"    // 承認
  | "gate-rework"      // 差し戻し
  | "user-input";      // 上記に該当しないユーザー入力

interface TraceEvent {
  id: string;            // 冪等性のための決定的 ID(内容ハッシュ由来を想定)
  source: "audit-md";    // 将来 "hooks" 等を追加可能(NFR-5)
  type: TraceEventType;
  timestamp: string;     // ISO 8601
  stage?: string;        // 例: "INCEPTION - Requirements Analysis"
  detail?: string;
}
```
