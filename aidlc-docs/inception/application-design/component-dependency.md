# コンポーネント依存関係 — spica Trace 層 v1

## 依存マトリクス

| 依存元 \ 依存先 | types | parser | store | analyzer | trace-service | renderers |
|---|---|---|---|---|---|---|
| parser (core) | ✔ | - | - | - | - | - |
| store (core) | ✔ | - | - | - | - | - |
| analyzer (core) | ✔ | - | - | - | - | - |
| trace-service (cli) | ✔ | ✔ | ✔ | ✔ | - | - |
| renderers (cli) | ✔ | - | - | - | - | - |
| index (cli) | - | - | - | - | ✔ | ✔ |

## 依存の原則

- **依存方向は cli → core の一方向のみ**。core は cli を知らない
- core 内のコンポーネント同士は直接依存しない(全員が types のみに依存)。組み合わせは trace-service が行う
- 外部ライブラリ(commander / chalk / cli-table3 等)への依存は **cli 層に限定**する。core はゼロ依存を保ち、公式 AI-DLC フォーマット変更時の追従を parser の修正だけで済ませる(NFR-1)

## データフロー

```
audit.md(読み取りのみ)
    |
    v
+--------------------------------------------------+
| trace-service (cli)                              |
|                                                  |
|  read file                                       |
|    |                                             |
|    v                                             |
|  parser ----> TraceEvent[] ----> store           |
|                                    |             |
|                     .spica/events.jsonl(追記)   |
|                                    |             |
|                                    v             |
|                                 analyzer         |
|                                    |             |
|                        Timeline / Summary        |
+------------------------------------|-------------+
                                     v
                           renderers (cli) --> stdout
```

## 通信パターン

- すべて同期の関数呼び出し(単一プロセスの CLI)。イベントバス・非同期メッセージングは不要
- ファイル I/O は「audit.md の読み取り」と「events.jsonl の読み書き」の 2 点のみ
