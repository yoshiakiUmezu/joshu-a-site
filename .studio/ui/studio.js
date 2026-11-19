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
const exampleList = byId("example-list");
const exampleStatus = byId("example-status");
const number = new Intl.NumberFormat("ja-JP");
const offerList = byId("offer-list");
const offerFeedback = byId("offer-feedback");
const offerStatuses = {
  review: "購入者の確認待ち",
  confirmed: "購入者が確認済み",
  released: "納品済み・HTML保存可",
};
const offerDate = new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" });

let currentSite = null;
let limits = null;
let remaining = false;
let liveEnabled = false;
let busy = false;
let previewWidth;
let offers = [];
let offersRequest = 0;

function updateControls() {
  byId("generate").disabled = busy || !remaining || !liveEnabled;
  byId("brief-fields").disabled = busy;
  byId("revise").disabled = busy || !remaining || !liveEnabled || !currentSite;
  revision.disabled = busy || !remaining || !liveEnabled || !currentSite;
  exampleList.disabled = busy;
  byId("load-example").disabled = busy || !exampleList.value;
  byId("download").disabled = busy || !currentSite;
  artwork.disabled = busy || !currentSite;
  byId("create-offer").disabled = busy || !currentSite?.draftId || Boolean(currentSite.offerId);
  byId("create-offer").textContent = currentSite?.offerId ? "この版は作成済み" : "この版の確認画面を作成";
  byId("refresh-offers").disabled = busy;
  offerList.disabled = busy || !offers.length;
  byId("release-offer").disabled = busy;
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

async function displayArtwork(choice, site = currentSite) {
  const html = await composeArtwork(site.modelHtml, choice);
  if (new Blob([html]).size > limits.maxHtmlBytes) throw new Error("表紙を含むHTMLが保存サイズの上限を超えます。");
  // Give the opaque sandbox its own document URL so #links scroll inside it.
  frame.src = "data:text/html;charset=utf-8," + encodeURIComponent(html);
  currentSite = { ...site, html, choice, offerId: null };
  showMessage(offerFeedback, "");
  offerList.value = "";
  showSelectedOffer();
  artwork.value = choice;
}

async function displayDraft(data, brief, choice) {
  const site = { brief, modelHtml: data.html, draftId: data.draftId };
  showMessage(artStatus, "");
  try {
    await displayArtwork(choice, site);
  } catch (error) {
    if (choice === "auto") throw error;
    await displayArtwork("auto", site);
    showMessage(artStatus, "選んだ表紙を読み込めなかったため、AIの構成で表示しました。", true);
  }
  canvas.hidden = false;
  byId("empty").hidden = true;
  fitPreview();
  revision.value = "";
  byId("generate").textContent = "新しいサイトを生成";
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
  if (busy || !remaining || !liveEnabled || (isRevision && !currentSite)) return;
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
    await displayDraft(data, brief, choice);
    showMessage(exampleStatus, "");
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

function showSelectedOffer() {
  const offer = offers.find((entry) => entry.id === offerList.value);
  const link = byId("open-review");
  link.hidden = !offer;
  if (offer) link.href = "/review/" + encodeURIComponent(offer.id) + "/";
  else link.removeAttribute("href");
  byId("release-offer").hidden = offer?.status !== "confirmed";
  byId("offer-state").textContent = offer ? "版 " + offer.id.slice(0, 8) + " · " + offerStatuses[offer.status] : "";
}

function showOffers(list, selection) {
  offers = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const options = offers.map((offer) => {
    const label = offer.name + " · 版 " + offer.id.slice(0, 8) + " · " + offerDate.format(new Date(offer.createdAt));
    return new Option(label, offer.id);
  });
  offerList.replaceChildren(new Option(options.length ? "保存した版を選択" : "保存した版はありません", ""), ...options);
  offerList.value = selection ?? options[0]?.value ?? "";
  showSelectedOffer();
  updateControls();
}

async function studioRequest(url, body) {
  const response = await fetch(url, body === undefined ? { cache: "no-store" } : {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "制作室から情報を取得できませんでした。");
  return data;
}

async function refreshOffers() {
  if (busy) return;
  const request = ++offersRequest;
  try {
    const { offers: list } = await studioRequest("/api/offers");
    if (request === offersRequest) showOffers(list, offers.length || currentSite ? offerList.value : undefined);
  } catch {
    if (request === offersRequest) showMessage(offerFeedback, "保存した版を読み込めませんでした。「状態を更新」で再読み込みしてください。", true);
  }
}

offerList.addEventListener("change", () => {
  showMessage(offerFeedback, "");
  showSelectedOffer();
});
byId("refresh-offers").addEventListener("click", () => {
  showMessage(offerFeedback, "");
  refreshOffers();
});
window.addEventListener("focus", refreshOffers);

async function saveOffer(release) {
  if (busy) return;
  const selected = offers.find((entry) => entry.id === offerList.value);
  if (release ? selected?.status !== "confirmed" : !currentSite?.draftId || currentSite.offerId) return;
  ++offersRequest;
  busy = true;
  updateControls();
  showMessage(offerFeedback, release ? "納品を準備しています…" : "PC・スマホの確認用画像を作成しています…");
  try {
    let result;
    if (release) {
      result = await studioRequest("/api/offers/" + encodeURIComponent(selected.id) + "/release", {});
    } else {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(currentSite.html));
      const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      result = await studioRequest("/api/offers", { draftId: currentSite.draftId, choice: currentSite.choice, sha256 });
      currentSite.offerId = result.offer.id;
    }
    showOffers([result.offer, ...offers.filter((offer) => offer.id !== result.offer.id)], result.offer.id);
    showMessage(offerFeedback, release ? "納品しました。購入者は確認画面を更新するとHTMLを保存できます。" : "この版を固定しました。購入者の確認画面を開けます。");
  } catch (error) {
    showMessage(offerFeedback, error instanceof SyntaxError || error instanceof TypeError
      ? "接続できませんでした。「状態を更新」で保存状況を確認してください。"
      : error.message, true);
  } finally {
    busy = false;
    updateControls();
  }
}
byId("create-offer").addEventListener("click", () => saveOffer(false));
byId("release-offer").addEventListener("click", () => saveOffer(true));
refreshOffers();

byId("load-example").addEventListener("click", async () => {
  if (busy || !exampleList.value) return;
  busy = true;
  updateControls();
  showMessage(exampleStatus, "作例を読み込んでいます…");
  try {
    const data = await studioRequest("/api/examples", { id: exampleList.value });
    await displayDraft(data, data.brief, data.choice);
    for (const field of ["purpose", "name", "mood", "request"]) byId(field).value = data.brief[field] || "";
    showMessage(byId("generate-status"), "");
    showMessage(byId("revision-status"), "");
    showMessage(exampleStatus, "「" + data.brief.name + "」を開きました。");
  } catch (error) {
    showMessage(exampleStatus, error instanceof SyntaxError || error instanceof TypeError
      ? "作例を読み込めませんでした。接続を確認してください。" : error.message, true);
  } finally {
    busy = false;
    updateControls();
  }
});

async function refreshLedger() {
  const response = await fetch("/api/status", { cache: "no-store" });
  if (!response.ok) throw new Error();
  const status = await response.json();
  limits = status.limits;
  liveEnabled = status.liveEnabled;
  const selection = exampleList.value;
  exampleList.replaceChildren(...status.examples.map(({ id, name }) => new Option(name, id)));
  if (selection) exampleList.value = selection;
  byId("examples").hidden = !status.examples.length;
  byId("live-mode").textContent = liveEnabled ? "AIによる新規生成と修正にはAPI料金が発生します。"
    : "作例モードです。上の「作例を開く」から始めてください。";
  showLedger(status.ledger);
}
refreshLedger().catch(() => {
  showMessage(byId("generate-status"), "利用状況を取得できませんでした。接続を確認して再読み込みしてください。", true);
});
