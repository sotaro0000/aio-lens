# AIO Lens 🔍

> **あなたのWebページは、生成AIに「引用」されていますか？**
> URL を入力するだけで、ChatGPT・Google AI Overview・Perplexity などの生成AIが回答の根拠として引用しやすいページかを **6 つの観点**で診断し、具体的な改善提案を提示する **AIO（AI Optimization）診断ツール**です。

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)

---

## 🎯 なぜ作ったか（課題）

検索の主役が「青いリンクの一覧」から「AIが生成する要約・回答」へと移りつつあります。
従来の SEO（検索エンジン最適化）に加え、**生成AIに正しく理解され・引用されるための最適化＝AIO（AI Optimization / GEO）** が、Webコンテンツの可視性を左右する新しい論点になっています。

マーケティング業務で SEO/AIO 施策を担当する中で、
**「自分のページが“AIから見て”どう評価されるかを定量的に把握する手段がない」** という課題に直面しました。
そこで、**AIエンジニアリング × マーケティングの知見**を掛け合わせ、ページの AIO 適性をスコア化・可視化するツールを個人開発しました。

## ✨ 主な機能

| 機能 | 説明 |
| --- | --- |
| **6 軸の AIO スコアリング** | 任意の公開 URL を取得・解析し、生成AIへの「引用されやすさ」を 0–100 点で定量化 |
| **45+ の個別チェック** | JSON-LD、FAQ構造、見出し階層、E-E-A-T、メタ情報、クローラビリティ等を自動診断 |
| **LLM による定性評価** | API キー設定時、本文を踏まえた総評・優先度付き改善提案・**JSON-LD 自動生成**を出力 |
| **ハイブリッド設計** | ルールベース診断は **API キー不要**で完全動作。LLM はあくまで“強化レイヤー” |
| **改善提案** | 各指摘に「なぜ引用されやすさが上がるのか」という根拠付きの具体アクションを提示 |

## 🧭 診断する 6 つの観点

| 軸 | 重み | 評価内容 |
| --- | :--: | --- |
| **構造化データ** | 20% | JSON-LD / schema.org（Article・FAQPage・HowTo 等）、OGP |
| **コンテンツ引用性** | 25% | 本文ボリューム、質問型見出し、段落の簡潔さ、リスト・表による構造化 |
| **セマンティック構造** | 15% | 単一 H1、見出し階層の整合性、セマンティック HTML5 タグ |
| **信頼性 (E-E-A-T)** | 20% | 著者情報、公開・更新日、出典・外部参照リンク |
| **メタ・基本SEO** | 10% | title / description の最適長、lang 属性、canonical |
| **AIクローラビリティ** | 10% | テキスト/HTML 比率（SSR依存度）、画像 alt、見出し密度 |

各軸のスコアを重み付き合成し、総合スコア（S / A / B / C / D グレード）を算出します。

## 🏗 アーキテクチャ

```
[ブラウザ] ──POST /api/analyze──▶ [Next.js Route Handler (Node runtime)]
                                          │
                          ┌───────────────┼────────────────┐
                          ▼               ▼                ▼
                   1. fetcher        2. analyzers      3. llm（任意）
                   URL取得・          6軸ヒューリ        OpenAI / Anthropic
                   cheerioでDOM解析   スティック採点      で定性評価・JSON-LD生成
                   SSRF対策           （決定論的）        （未設定時はフォールバック）
                          └───────────────┼────────────────┘
                                          ▼
                                   4. scoring（重み付き合成）
                                          │
                                          ▼
                              [スコアダッシュボード UI]
```

**設計上の工夫:**

- **ハイブリッド診断（ルールベース + LLM）** — 社内 RAG 開発で得た「決定論的なロジックを土台に、LLM はコスト効率の良いモデルで補強する」設計思想を踏襲。LLM 障害時・キー未設定時もルールベース結果に**グレースフルに縮退**します。
- **プロバイダ非依存の LLM 抽象化** — `LLM_PROVIDER` 環境変数で OpenAI / Anthropic を切替。SDK 非依存（生 fetch）で依存を最小化。
- **JSON モードによる構造化出力** — LLM 出力を JSON スキーマに固定し、パース失敗時は正規表現でのリカバリを実装。
- **SSRF 対策** — 入力 URL を正規化し、内部ネットワーク（localhost / プライベート IP 帯）宛のリクエストを拒否。タイムアウト・サイズ上限も設定。

## 🛠 技術スタック

| 領域 | 技術 |
| --- | --- |
| フレームワーク | Next.js 16（App Router / Route Handlers） |
| 言語 | TypeScript 5（strict） |
| UI | React 19 / Tailwind CSS 3 / SVG ゲージ（依存ライブラリ追加なし） |
| HTML 解析 | cheerio |
| LLM | OpenAI / Anthropic（任意・プロバイダ切替可） |
| デプロイ | Vercel |

## 🚀 セットアップ

```bash
# 1. 依存関係のインストール
npm install

# 2. （任意）LLM 強化を使う場合は環境変数を設定
cp .env.example .env
#   → .env に OPENAI_API_KEY などを記入。未設定でもルールベース診断は動作します。

# 3. 開発サーバー
npm run dev          # http://localhost:3000

# 本番ビルド / 起動
npm run build
npm start

# 型チェック
npm run typecheck
```

### 環境変数（任意）

| 変数 | 説明 | 既定値 |
| --- | --- | --- |
| `LLM_PROVIDER` | `openai` または `anthropic` | `openai` |
| `OPENAI_API_KEY` | OpenAI を使う場合の API キー | — |
| `OPENAI_MODEL` | 使用モデル | `gpt-4o-mini` |
| `ANTHROPIC_API_KEY` | Anthropic を使う場合の API キー | — |
| `ANTHROPIC_MODEL` | 使用モデル | `claude-haiku-4-5-20251001` |

> 💡 **API キーが無くても完全に動作します。** ルールベースの 6 軸診断と、それに基づく優先改善アクションが表示されます。キーを設定すると、本文を踏まえた LLM 総評と JSON-LD 自動生成が追加で有効になります。

## 📁 ディレクトリ構成

```
src/
├── app/
│   ├── layout.tsx              # ルートレイアウト・メタデータ
│   ├── page.tsx                # 入力フォーム + 結果表示（Client Component）
│   ├── globals.css
│   └── api/analyze/route.ts    # 診断 API（オーケストレーション）
├── components/
│   ├── ScoreGauge.tsx          # 総合スコアの円形ゲージ（SVG）
│   ├── DimensionCard.tsx       # 軸別カード（展開でチェック詳細）
│   └── ResultView.tsx          # 結果ダッシュボード全体
└── lib/
    ├── types.ts                # 共通型定義
    ├── fetcher.ts              # URL取得・DOM解析・SSRF対策
    ├── analyzers.ts            # 6軸ヒューリスティック診断エンジン
    ├── scoring.ts              # 重み付きスコア合成・グレード判定
    └── llm.ts                  # LLM強化レイヤー（フォールバック付き）
```

## 🔭 今後の拡張

- [ ] 診断結果の履歴保存・スコア推移トラッキング（DB 連携）
- [ ] 競合 URL との並列比較ビュー
- [ ] `llms.txt` / `robots.txt` の実取得による AI クローラ許可状況の判定
- [ ] PDF / 共有用レポート出力

---

開発: **佐藤 颯太郎**（AIエンジニア / マーケター）
