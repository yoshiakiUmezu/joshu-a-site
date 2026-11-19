import { composeArtwork } from './artwork.js';

const byId = (id) => document.getElementById(id);
const briefForm = byId("brief-form");
const revisionForm = byId("revision-form");
const canvas = byId("canvas");
const viewport = byId("viewport");
const frame = byId("preview");
const revision = byId("revision");
const artwork = byId("artwork");
const artStatus = byId("artwork-status");
const number = new Intl.NumberFormat("ja-JP");

let currentSite = null;
let limits = null;
let remaining = false;
let busy = false;
let previewWidth;

function updateControls() {
  byId("generate").disabled = busy || !remaining;
  byId("brief-fields").disabled = busy;
  byId("revise").disabled = busy || !remaining || !currentSite;
  revision.disabled = busy || !remaining || !currentSite;
  byId("download").disabled = busy || !currentSite;
  artwork.disabled = busy || !currentSite;
}

function showLedger(ledger) {
  const reserved = ledger.reservedTokens;
  remaining = ledger.calls < limits.maxCalls && ledger.totalTokens + reserved < limits.maxTotalTokens;
  byId("calls").textContent = number.format(ledger.calls) + " / " + number.format(limits.maxCalls);
  byId("tokens").textContent = number.format(ledger.totalTokens) + " / " + number.format(limits.maxTotalTokens);
  const details = [
    "累計入力 " + number.format(ledger.inputTokens) + "・出力 " + number.format(ledger.outputTokens) + " トークン",
    "1回の出力上限 " + number.format(limits.maxOutputTokens) + " トークン",
    "HTML上限 " + number.format(limits.maxHtmlBytes) + " バイト",
  ];
  if (reserved) details.push("使用量確定前の予約枠 " + number.format(reserved) + " トークン");
  if (!remaining) details.push("生成・修正の上限に達しました。");
  byId("limits").textContent = details.join("　/　");
  updateControls();
}

function fitPreview() {
  if (canvas.hidden || !canvas.clientWidth || !canvas.clientHeight) return;
  const scale = Math.min(1, canvas.clientWidth / previewWidth);
  viewport.style.width = previewWidth * scale + "px";
  viewport.style.height = canvas.clientHeight + "px";
  frame.style.width = previewWidth + "px";
  frame.style.height = Math.floor(canvas.clientHeight / scale) + "px";
  frame.style.transform = "scale(" + scale + ")";
}

const modes = document.querySelectorAll("[data-width]");
function selectWidth(width) {
  previewWidth = width;
  for (const mode of modes) {
    mode.setAttribute("aria-pressed", String(Number(mode.dataset.width) === width));
  }
  byId("dimension").textContent = "表示幅 " + number.format(width) + " px";
  fitPreview();
}
for (const mode of modes) {
  mode.addEventListener("click", () => selectWidth(Number(mode.dataset.width)));
}
selectWidth(matchMedia("(max-width: 42rem)").matches ? 390 : 1280);
new ResizeObserver(fitPreview).observe(canvas);

function showMessage(element, message, isError = false) {
  element.classList.toggle("error", isError);
  element.textContent = message;
}

async function displayArtwork(choice) {
  const html = await composeArtwork(currentSite.modelHtml, choice);
  if (new Blob([html]).size > limits.maxHtmlBytes) throw new Error("表紙を含むHTMLが保存サイズの上限を超えます。");
  // Give the opaque sandbox its own document URL so #links scroll inside it.
  frame.src = "data:text/html;charset=utf-8," + encodeURIComponent(html);
  currentSite.html = html;
  currentSite.choice = choice;
  artwork.value = choice;
}

artwork.addEventListener("change", async () => {
  if (busy || !currentSite) return;
  busy = true;
  updateControls();
  try {
    await displayArtwork(artwork.value);
    showMessage(artStatus, "表紙素材を反映しました。API使用量の追加はありません。");
  } catch (error) {
    artwork.value = currentSite.choice;
    showMessage(artStatus, error.message || "表紙素材を反映できませんでした。", true);
  } finally {
    busy = false;
    updateControls();
  }
});

async function generate(isRevision) {
  if (busy || !remaining || (isRevision && !currentSite)) return;
  const status = byId(isRevision ? "revision-status" : "generate-status");
  const brief = isRevision ? currentSite.brief : Object.fromEntries(new FormData(briefForm));
  const body = { brief };
  if (isRevision) {
    body.previousHtml = currentSite.modelHtml;
    body.revision = revision.value.trim();
  }
  busy = true;
  updateControls();
  showMessage(status, isRevision ? "修正を反映しています…" : "サイトを生成しています…");
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data.ledger) showLedger(data.ledger);
    if (!response.ok) throw new Error(data.error || "生成に失敗しました。");
    if (typeof data.html !== "string" || !data.html) throw new Error("HTMLを受信できませんでした。");
    const choice = isRevision ? currentSite.choice : "auto";
    currentSite = { brief, modelHtml: data.html };
    showMessage(artStatus, "");
    try {
      await displayArtwork(choice);
    } catch {
      await displayArtwork("auto");
      showMessage(artStatus, "選んだ表紙を読み込めなかったため、AIの構成で表示しました。", true);
    }
    canvas.hidden = false;
    byId("empty").hidden = true;
    fitPreview();
    revision.value = "";
    byId("generate").textContent = "新しいサイトを生成";
    if (!isRevision) showMessage(byId("revision-status"), "");
    const result = isRevision ? "修正しました。" : "生成しました。";
    showMessage(status, result + " 今回の使用量 " + number.format(data.usage.totalTokens) + " トークン");
  } catch (error) {
    showMessage(status, error instanceof SyntaxError || error instanceof TypeError
      ? "サーバーから結果を取得できませんでした。利用記録を確認してください。"
      : error.message, true);
    try {
      await refreshLedger();
    } catch {
      remaining = false;
      showMessage(byId("limits"), "最新の利用状況を取得できませんでした。接続を確認して再読み込みしてください。", true);
    }
  } finally {
    busy = false;
    updateControls();
  }
}

briefForm.addEventListener("submit", (event) => {
  event.preventDefault();
  generate(false);
});
revisionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  generate(true);
});

byId("download").addEventListener("click", () => {
  if (!currentSite) return;
  const url = URL.createObjectURL(new Blob([currentSite.html], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = (currentSite.brief.name.replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 60) || "site") + ".html";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

async function refreshLedger() {
  const response = await fetch("/api/status", { cache: "no-store" });
  if (!response.ok) throw new Error();
  const status = await response.json();
  limits = status.limits;
  showLedger(status.ledger);
}
refreshLedger().catch(() => {
  showMessage(byId("generate-status"), "利用状況を取得できませんでした。接続を確認して再読み込みしてください。", true);
});
