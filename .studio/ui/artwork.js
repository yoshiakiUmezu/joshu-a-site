const artwork = {
  coffee: { alt: "窓辺の光を受ける珈琲とトースト", caption: "珈琲とトーストのイメージ" },
  concert: { alt: "音のうねりをリボンの曲線と色で表した図版", caption: "音の波を重ねた公演イメージ" },
  architecture: { alt: "中庭を囲む住まいの模型を斜め上から見た構成", caption: "中庭のある住宅の模型イメージ" },
};

const plateCSS = `
.studio-art-plate{min-width:0;width:100%;align-self:center}
.studio-art-plate.studio-art-standalone{max-width:68rem;margin:clamp(1rem,3vw,2.5rem) auto}
.studio-art-plate>.studio-art-figure{display:block;position:static;margin:0;padding:0;width:100%;height:auto;border:0}
.studio-art-figure>img{display:block;position:static;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover}
.studio-art-figure>figcaption{display:block;position:static;background:transparent;color:inherit;text-align:end;margin:0;padding:.5rem 0;font:inherit;font-size:.8rem;line-height:1.5}
.studio-art-plate>details{border-top:1px solid currentColor;padding:.4rem 0 0}
.studio-art-plate>details>summary{display:list-item;width:fit-content;cursor:pointer;font-size:.9rem;line-height:1.8}
.studio-art-plate>details[open]>summary{margin-bottom:.65rem}
`;

async function readArtwork(choice) {
  const response = await fetch("/studio/art/" + choice + ".webp", { credentials: "same-origin" });
  if (!response.ok) throw new Error("制作素材を読み込めませんでした。");
  const blob = await response.blob();
  if (blob.type !== "image/webp") throw new Error("制作素材の形式を確認できませんでした。");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("制作素材を読み込めませんでした。"));
    reader.readAsDataURL(blob);
  });
}

export async function composeArtwork(html, choice = "auto") {
  if (choice === "auto") return html;
  if (!Object.hasOwn(artwork, choice)) throw new Error("制作素材を選んでください。");
  const art = artwork[choice];
  const src = await readArtwork(choice);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const originalImage = doc.querySelector("img");
  if (originalImage) {
    if (originalImage.getAttribute("src") === src) return html;
    originalImage.src = src;
    originalImage.alt = art.alt;
    const figure = originalImage.closest("figure");
    if (figure?.hasAttribute("aria-label")) figure.setAttribute("aria-label", art.caption);
    const caption = figure?.querySelector("figcaption");
    if (caption && !caption.querySelector("[id], a")) caption.textContent = art.caption;
  } else {
    const heading = doc.querySelector("h1");
    if (!heading) throw new Error("素材を配置する見出しが見つかりません。");
    const hero = heading.closest("section,article") ?? heading.closest("header");
    const diagram = hero?.querySelector('[role="img"]');
    const plate = doc.createElement("div");
    plate.className = "studio-art-plate";
    const figure = doc.createElement("figure");
    figure.className = "studio-art-figure";
    const img = doc.createElement("img");
    img.src = src;
    img.alt = art.alt;
    const caption = doc.createElement("figcaption");
    caption.textContent = art.caption;
    figure.append(img, caption);
    plate.append(figure);
    if (diagram && !diagram.contains(heading)) {
      diagram.replaceWith(plate);
      const details = doc.createElement("details");
      const summary = doc.createElement("summary");
      summary.textContent = diagram.getAttribute("aria-label")?.includes("平面図") ? "平面図を見る" : "図解を見る";
      details.append(summary, diagram);
      plate.append(details);
    } else {
      plate.classList.add("studio-art-standalone");
      (hero ?? heading).after(plate);
    }
    const style = doc.createElement("style");
    style.textContent = plateCSS;
    doc.head.append(style);
  }

  // Early text-only exports already have a restrictive CSP. Allow this embedded
  // WebP when a developer deliberately adds art to such a page.
  const policy = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (policy && !policy.content.includes("img-src")) policy.content += "; img-src data:";
  return "<!doctype html>\n" + doc.documentElement.outerHTML;
}
