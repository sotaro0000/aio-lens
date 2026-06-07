// AIO（AI Optimization）診断のヒューリスティック分析エンジン。
// 6 つの診断軸ごとに、生成AIに「引用・参照されやすいか」をルールベースで採点する。
// LLM を使わずに完全に決定論的に動作するため、API キーが無くても結果が再現する。
import type { CheckResult, DimensionResult, PageSnapshot } from "./types";

/** チェック結果のスコアから重み付き平均を計算する */
function average(checks: CheckResult[]): number {
  if (checks.length === 0) return 0;
  const sum = checks.reduce((acc, c) => acc + c.score, 0);
  return Math.round(sum / checks.length);
}

/** status をスコアから自動判定するヘルパ */
function statusFromScore(score: number): CheckResult["status"] {
  if (score >= 80) return "pass";
  if (score >= 50) return "warn";
  return "fail";
}

// ─────────────────────────────────────────────────────────
// 1. 構造化データ (Structured Data)
// 生成AIは schema.org/JSON-LD を手がかりにコンテンツの意味を理解する。
// ─────────────────────────────────────────────────────────
function analyzeStructuredData(s: PageSnapshot): DimensionResult {
  const checks: CheckResult[] = [];

  const hasJsonLd = s.jsonLd.length > 0;
  checks.push({
    id: "jsonld-presence",
    label: "JSON-LD 構造化データ",
    status: hasJsonLd ? "pass" : "fail",
    score: hasJsonLd ? 100 : 0,
    detail: hasJsonLd
      ? `${s.jsonLd.length} 件の JSON-LD ブロックを検出（型: ${s.jsonLdTypes.join(", ") || "型未指定"}）。`
      : "JSON-LD 構造化データが見つかりませんでした。",
    recommendation: hasJsonLd
      ? undefined
      : "schema.org の JSON-LD を追加し、コンテンツの種類（Article / FAQPage / HowTo 等）を明示してください。AIがページの意味を解釈する精度が大きく向上します。",
  });

  // AI 引用に効く代表的な型の網羅性
  const valuableTypes = ["Article", "BlogPosting", "NewsArticle", "FAQPage", "QAPage", "HowTo", "Product", "Organization", "BreadcrumbList", "WebSite"];
  const matched = valuableTypes.filter((t) => s.jsonLdTypes.includes(t));
  const typeScore = Math.min(100, matched.length * 34);
  checks.push({
    id: "jsonld-types",
    label: "AI 引用に有効な型の採用",
    status: statusFromScore(typeScore),
    score: typeScore,
    detail: matched.length
      ? `有効な型を採用: ${matched.join(", ")}。`
      : "FAQPage / HowTo / Article など、AIが回答生成に活用しやすい型が見当たりません。",
    recommendation:
      matched.length >= 2
        ? undefined
        : "FAQPage（よくある質問）や HowTo（手順）など、AIが直接回答に転用しやすい構造化データの追加を検討してください。",
  });

  const ogCount = Object.keys(s.ogTags).length;
  const ogScore = Math.min(100, ogCount * 20);
  checks.push({
    id: "og-tags",
    label: "OGP（Open Graph）メタデータ",
    status: statusFromScore(ogScore),
    score: ogScore,
    detail: ogCount
      ? `${ogCount} 個の OGP タグを検出。`
      : "OGP タグが設定されていません。",
    recommendation:
      ogScore >= 80
        ? undefined
        : "og:title / og:description / og:type / og:image を設定し、AI・SNS 双方での要約精度を高めてください。",
  });

  return {
    key: "structuredData",
    label: "構造化データ",
    description: "schema.org / JSON-LD によるコンテンツの意味付け。AIの理解精度を左右する最重要軸。",
    weight: 0.2,
    score: average(checks),
    checks,
  };
}

// ─────────────────────────────────────────────────────────
// 2. コンテンツ引用性 (Citability)
// AIは「簡潔で、明快な答えを含む」コンテンツを引用しやすい。
// ─────────────────────────────────────────────────────────
function analyzeCitability(s: PageSnapshot): DimensionResult {
  const checks: CheckResult[] = [];

  // 十分な本文量があるか
  const wc = s.wordCount;
  const volumeScore = wc >= 600 ? 100 : wc >= 300 ? 70 : wc >= 100 ? 40 : 10;
  checks.push({
    id: "content-volume",
    label: "本文ボリューム",
    status: statusFromScore(volumeScore),
    score: volumeScore,
    detail: `本文は約 ${wc} 語。`,
    recommendation:
      volumeScore >= 80
        ? undefined
        : "トピックを十分に網羅した本文（目安 600 語以上）にすると、AIが文脈を理解し引用しやすくなります。",
  });

  // 質問形式の見出し（FAQ的構造は AI 引用に強い）
  const questionHeadings = s.headings.filter((h) =>
    /[?？]|とは|方法|なぜ|どうやって|how|what|why|when|which/i.test(h.text),
  ).length;
  const qScore = questionHeadings >= 3 ? 100 : questionHeadings === 2 ? 75 : questionHeadings === 1 ? 50 : 20;
  checks.push({
    id: "question-headings",
    label: "質問・トピック型の見出し",
    status: statusFromScore(qScore),
    score: qScore,
    detail: `「〜とは」「なぜ」「方法」等の質問型見出しを ${questionHeadings} 件検出。`,
    recommendation:
      qScore >= 75
        ? undefined
        : "ユーザーが AI に尋ねる質問をそのまま見出し化（例:「〇〇とは？」）し、直後に簡潔な回答を置くと引用率が上がります。",
  });

  // 簡潔な段落（1段落が極端に長いと引用しづらい）
  const avgParaLen =
    s.paragraphs.length > 0
      ? s.paragraphs.reduce((a, p) => a + p.length, 0) / s.paragraphs.length
      : 0;
  const concise = avgParaLen > 0 && avgParaLen <= 220;
  const paraScore = s.paragraphs.length === 0 ? 20 : concise ? 100 : avgParaLen <= 320 ? 65 : 35;
  checks.push({
    id: "paragraph-conciseness",
    label: "段落の簡潔さ",
    status: statusFromScore(paraScore),
    score: paraScore,
    detail:
      s.paragraphs.length === 0
        ? "段落要素（<p>）が検出できませんでした。"
        : `段落数 ${s.paragraphs.length}、平均 ${Math.round(avgParaLen)} 文字/段落。`,
    recommendation:
      paraScore >= 80
        ? undefined
        : "1 段落 1 メッセージを意識し、結論を先頭に置いた簡潔な段落に分割すると AI が要点を抽出しやすくなります。",
  });

  // リスト・表などの構造化された本文（AIが要素抽出しやすい）
  const listMatches = (s.html.match(/<li[\s>]/gi) || []).length;
  const tableMatches = (s.html.match(/<table[\s>]/gi) || []).length;
  const structuredBody = listMatches + tableMatches * 3;
  const listScore = structuredBody >= 10 ? 100 : structuredBody >= 4 ? 70 : structuredBody >= 1 ? 45 : 15;
  checks.push({
    id: "lists-tables",
    label: "リスト・表による構造化",
    status: statusFromScore(listScore),
    score: listScore,
    detail: `リスト項目 ${listMatches} 件、表 ${tableMatches} 件を検出。`,
    recommendation:
      listScore >= 70
        ? undefined
        : "箇条書きや比較表を活用すると、AIが情報を構造的に抽出・再利用しやすくなります。",
  });

  return {
    key: "citability",
    label: "コンテンツ引用性",
    description: "AIが回答に転用しやすい「簡潔・明快・構造的」な本文になっているか。",
    weight: 0.25,
    score: average(checks),
    checks,
  };
}

// ─────────────────────────────────────────────────────────
// 3. セマンティック構造 (Structure)
// ─────────────────────────────────────────────────────────
function analyzeStructure(s: PageSnapshot): DimensionResult {
  const checks: CheckResult[] = [];

  const h1Count = s.headings.filter((h) => h.level === 1).length;
  const h1Score = h1Count === 1 ? 100 : h1Count === 0 ? 20 : 55;
  checks.push({
    id: "single-h1",
    label: "H1 見出し",
    status: statusFromScore(h1Score),
    score: h1Score,
    detail: `H1 を ${h1Count} 件検出。`,
    recommendation:
      h1Count === 1
        ? undefined
        : h1Count === 0
        ? "ページの主題を表す H1 を 1 つ設置してください。"
        : "H1 は 1 ページ 1 つに統一し、主題を一意に伝えてください。",
  });

  // 見出し階層の連続性（H2 を飛ばして H4 に行く等を検出）
  let jumps = 0;
  for (let i = 1; i < s.headings.length; i++) {
    if (s.headings[i].level - s.headings[i - 1].level > 1) jumps += 1;
  }
  const hierarchyScore = s.headings.length < 2 ? 40 : jumps === 0 ? 100 : jumps <= 2 ? 65 : 35;
  checks.push({
    id: "heading-hierarchy",
    label: "見出し階層の整合性",
    status: statusFromScore(hierarchyScore),
    score: hierarchyScore,
    detail:
      s.headings.length < 2
        ? "見出しがほとんど使われていません。"
        : `見出し ${s.headings.length} 件、階層スキップ ${jumps} 箇所。`,
    recommendation:
      hierarchyScore >= 80
        ? undefined
        : "H1→H2→H3 と階層を飛ばさず構成すると、AIが文書のアウトラインを正確に把握できます。",
  });

  const semanticCount = Object.keys(s.semanticTags).length;
  const semanticScore = Math.min(100, semanticCount * 22);
  checks.push({
    id: "semantic-html",
    label: "セマンティック HTML",
    status: statusFromScore(semanticScore),
    score: semanticScore,
    detail: semanticCount
      ? `${Object.keys(s.semanticTags).join(", ")} を使用。`
      : "article / section / main などのセマンティックタグが使われていません。",
    recommendation:
      semanticScore >= 80
        ? undefined
        : "<main> <article> <section> などで本文領域を明示すると、AIクローラが本文とナビを区別しやすくなります。",
  });

  return {
    key: "structure",
    label: "セマンティック構造",
    description: "見出し階層とセマンティックタグによる、機械可読な文書構造。",
    weight: 0.15,
    score: average(checks),
    checks,
  };
}

// ─────────────────────────────────────────────────────────
// 4. 信頼性シグナル E-E-A-T (Trust)
// ─────────────────────────────────────────────────────────
function analyzeTrust(s: PageSnapshot): DimensionResult {
  const checks: CheckResult[] = [];

  checks.push({
    id: "author",
    label: "著者情報",
    status: s.hasAuthor ? "pass" : "fail",
    score: s.hasAuthor ? 100 : 25,
    detail: s.hasAuthor ? "著者情報を検出しました。" : "著者情報が見当たりません。",
    recommendation: s.hasAuthor
      ? undefined
      : "著者名・経歴（meta author や JSON-LD の author）を明記すると、AIが情報源の信頼性を評価しやすくなります。",
  });

  const hasDate = Boolean(s.publishedDate || s.modifiedDate);
  checks.push({
    id: "dates",
    label: "公開・更新日",
    status: hasDate ? "pass" : "warn",
    score: hasDate ? 100 : 35,
    detail: hasDate
      ? `公開: ${s.publishedDate ?? "—"} / 更新: ${s.modifiedDate ?? "—"}`
      : "公開日・更新日が構造的に取得できません。",
    recommendation: hasDate
      ? undefined
      : "article:published_time / <time datetime> で日付を明示すると、AIが情報の鮮度を判断できます。",
  });

  // 外部参照（出典リンク）は E-E-A-T のシグナル
  const ext = s.links.external;
  const citationScore = ext >= 3 ? 100 : ext >= 1 ? 65 : 30;
  checks.push({
    id: "citations",
    label: "出典・外部参照リンク",
    status: statusFromScore(citationScore),
    score: citationScore,
    detail: `外部リンク ${ext} 件、内部リンク ${s.links.internal} 件。`,
    recommendation:
      citationScore >= 65
        ? undefined
        : "一次情報や公的データへの出典リンクを添えると、コンテンツの信頼性シグナルが強化されます。",
  });

  return {
    key: "trust",
    label: "信頼性シグナル (E-E-A-T)",
    description: "著者・日付・出典など、AIが情報源の信頼性を判断する材料。",
    weight: 0.2,
    score: average(checks),
    checks,
  };
}

// ─────────────────────────────────────────────────────────
// 5. メタ・基本SEO (Meta)
// ─────────────────────────────────────────────────────────
function analyzeMeta(s: PageSnapshot): DimensionResult {
  const checks: CheckResult[] = [];

  const titleLen = s.title?.length ?? 0;
  const titleScore = titleLen === 0 ? 0 : titleLen >= 15 && titleLen <= 60 ? 100 : 60;
  checks.push({
    id: "title",
    label: "タイトルタグ",
    status: statusFromScore(titleScore),
    score: titleScore,
    detail: s.title ? `「${s.title}」（${titleLen} 文字）` : "タイトルが設定されていません。",
    recommendation:
      titleScore >= 80
        ? undefined
        : "主題を含む 15〜60 文字程度のタイトルを設定してください。",
  });

  const descLen = s.metaDescription?.length ?? 0;
  const descScore = descLen === 0 ? 10 : descLen >= 50 && descLen <= 160 ? 100 : 60;
  checks.push({
    id: "meta-description",
    label: "メタディスクリプション",
    status: statusFromScore(descScore),
    score: descScore,
    detail: s.metaDescription ? `${descLen} 文字。` : "メタディスクリプションがありません。",
    recommendation:
      descScore >= 80
        ? undefined
        : "ページの要約を 50〜160 文字で記述すると、AIの要約生成の出発点になります。",
  });

  checks.push({
    id: "lang",
    label: "言語属性 (lang)",
    status: s.lang ? "pass" : "warn",
    score: s.lang ? 100 : 40,
    detail: s.lang ? `lang="${s.lang}"` : "html lang 属性が未設定です。",
    recommendation: s.lang ? undefined : '<html lang="ja"> を設定し、コンテンツ言語を明示してください。',
  });

  checks.push({
    id: "canonical",
    label: "canonical URL",
    status: s.canonical ? "pass" : "warn",
    score: s.canonical ? 100 : 50,
    detail: s.canonical ? s.canonical : "canonical が未設定です。",
    recommendation: s.canonical
      ? undefined
      : "正規 URL を canonical で明示し、重複コンテンツの評価分散を防いでください。",
  });

  return {
    key: "meta",
    label: "メタ・基本SEO",
    description: "タイトル・ディスクリプション等、検索/AI 双方の基礎となるメタ情報。",
    weight: 0.1,
    score: average(checks),
    checks,
  };
}

// ─────────────────────────────────────────────────────────
// 6. AIクローラビリティ (Crawlability)
// ─────────────────────────────────────────────────────────
function analyzeCrawlability(s: PageSnapshot): DimensionResult {
  const checks: CheckResult[] = [];

  // 本文が HTML に直接含まれているか（JS レンダリング依存だと AI クローラが取りこぼす）
  const ratioScore = s.textHtmlRatio >= 0.1 ? 100 : s.textHtmlRatio >= 0.04 ? 65 : 30;
  checks.push({
    id: "text-ratio",
    label: "テキスト/HTML 比率",
    status: statusFromScore(ratioScore),
    score: ratioScore,
    detail: `本文テキストは HTML 全体の約 ${(s.textHtmlRatio * 100).toFixed(1)}%。`,
    recommendation:
      ratioScore >= 80
        ? undefined
        : "本文を SSR/SSG で HTML に含め、JavaScript レンダリング依存を減らすと、AIクローラが確実に本文を取得できます。",
  });

  const altRatio = s.images.total === 0 ? 1 : s.images.withAlt / s.images.total;
  const altScore = Math.round(altRatio * 100);
  checks.push({
    id: "image-alt",
    label: "画像の alt 属性",
    status: statusFromScore(altScore),
    score: altScore,
    detail:
      s.images.total === 0
        ? "画像なし（減点対象外）。"
        : `${s.images.total} 枚中 ${s.images.withAlt} 枚に alt を設定（${altScore}%）。`,
    recommendation:
      altScore >= 80
        ? undefined
        : "すべての画像に内容を説明する alt を付与すると、AIが画像の意味も理解できます。",
  });

  // 本文中の見出し密度（読み飛ばしやすさ）
  const headingDensity = s.wordCount > 0 ? s.headings.length / (s.wordCount / 300) : 0;
  const densityScore = headingDensity >= 1 ? 100 : headingDensity >= 0.5 ? 70 : 40;
  checks.push({
    id: "heading-density",
    label: "見出し密度",
    status: statusFromScore(densityScore),
    score: densityScore,
    detail: `およそ 300 語あたり ${headingDensity.toFixed(1)} 個の見出し。`,
    recommendation:
      densityScore >= 70
        ? undefined
        : "適度な間隔で見出しを挿入すると、AIが本文をセクション単位で抽出しやすくなります。",
  });

  return {
    key: "crawlability",
    label: "AIクローラビリティ",
    description: "AIクローラが本文を確実に取得・分割できるかどうかの技術的アクセス性。",
    weight: 0.1,
    score: average(checks),
    checks,
  };
}

/** 全 6 軸を実行して DimensionResult の配列を返す */
export function runHeuristics(s: PageSnapshot): DimensionResult[] {
  return [
    analyzeStructuredData(s),
    analyzeCitability(s),
    analyzeStructure(s),
    analyzeTrust(s),
    analyzeMeta(s),
    analyzeCrawlability(s),
  ];
}
