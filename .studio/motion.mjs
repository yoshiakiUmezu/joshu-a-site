// Only studio-owned styles reach this stylesheet; model CSS uses the normal validator.
const themes = {
  soft: { name: 'studio-drift', duration: '760ms', from: 'opacity:.72;translate:0 .85rem' },
  editorial: { name: 'studio-unfold', duration: '640ms', from: 'clip-path:inset(0 9% 0 0);translate:0 .4rem' },
  rhythmic: { name: 'studio-beat', duration: '520ms', from: 'opacity:.8;scale:.965;translate:0 1rem', accent: '68%{translate:0 -.15rem;scale:1}' },
};
export const motionModes = Object.keys(themes);

export function motionSheet(mode = 'soft') {
  const { name, duration, from, accent = '' } = Object.hasOwn(themes, mode) ? themes[mode] : themes.soft;
  const entrance = `animation:${name} ${duration} cubic-bezier(.2,.7,.25,1) backwards`;
  return `<style id="studio-motion">
@keyframes ${name}{from{${from}}${accent}to{opacity:1;translate:0 0;scale:1;clip-path:inset(0)}}
/* Keep each card in the tab order; native scrolling and fragment links work offline. */
main .studio-gallery{display:flex;align-items:flex-start;gap:clamp(.75rem,2vw,1.5rem);overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding-inline:.4rem;padding:.4rem .4rem 1rem;scrollbar-width:thin}
main .studio-gallery>*{box-sizing:border-box;flex:0 0 min(82%,33rem);min-width:0;scroll-snap-align:start;scroll-margin-block-start:5rem}
main .studio-gallery>:last-child{scroll-snap-align:end}
/* Vertically dealt deck. Each real summary remains the interactive face. */
main .studio-gallery.studio-deck{display:block;overflow:visible;scroll-snap-type:none;isolation:isolate;padding:0 0 12vh}
main .studio-deck>details{--accent:#f9bc59;--ink:#1d2027;position:relative;width:100%;max-width:none;margin:0 0 8vh;padding:0;border:0;background:var(--ink);color:var(--accent);border-radius:.4rem;box-shadow:0 .55rem 1.8rem #17191b32}
main .studio-deck>details:nth-of-type(3n + 2){--ink:#c9dfcb;--accent:#203c39}
main .studio-deck>details:nth-of-type(3n){--ink:#663446;--accent:#ffcca2}
main .studio-deck>details>summary{display:grid;grid-template-columns:minmax(0,1fr) auto;align-content:end;align-items:end;gap:.4em;position:relative;isolation:isolate;overflow:hidden;min-height:clamp(13rem,42svh,26rem);padding:clamp(1.3rem,4vw,3rem);background:transparent;color:inherit;cursor:pointer;list-style:none}
main .studio-deck>details>summary::before{content:"";position:absolute;z-index:-1;top:-22%;right:-10%;width:76%;height:130%;background:repeating-radial-gradient(ellipse at 100% 35%,transparent 0 9px,currentColor 10px 11px,transparent 12px 17px);mask-image:linear-gradient(120deg,transparent 8%,black 65%);transform:rotate(-14deg);opacity:.58;pointer-events:none}
main .studio-deck>details>summary>*{width:fit-content;max-width:100%;background:var(--ink);color:inherit}
main .studio-deck>details>summary>.studio-card-art{display:block;grid-column:1/-1;max-width:100%;min-height:0;height:auto;padding:0;font-size:clamp(2rem,8vw,5.2rem);line-height:1.05;font-variant-numeric:tabular-nums}
main .studio-deck>details>summary>:nth-child(2){font-size:clamp(1.25rem,4vw,2.8rem)}
main .studio-deck>details[open]>:not(summary){padding:1.25rem;color:inherit}
@supports (animation-timeline:view()){
 @media(prefers-reduced-motion:no-preference) and (min-height:480px){
  main .studio-deck>details:not([open]){position:sticky;top:clamp(5rem,17svh,9rem);animation:studio-deal linear both;animation-timeline:view();animation-range:entry 0% entry 100%;transform-origin:85% 100%}
  main .studio-deck>details:nth-of-type(even){--tilt:7deg;--slide:8%}
  main .studio-deck>details>summary::before{animation:studio-spool linear both;animation-timeline:view();animation-range:entry 0% exit 100%}
  main .studio-deck:has(details[open],:focus-visible)>details{position:relative;top:auto;animation:none}
 }
}
@keyframes studio-deal{from{transform:perspective(50rem) translateX(var(--slide,-8%)) rotateX(27deg) rotate(var(--tilt,-7deg)) scale(.85);clip-path:inset(0 0 20% 0 round .4rem)}to{transform:none;clip-path:inset(0 round .4rem)}}
@keyframes studio-spool{from{transform:translateX(9%) rotate(-26deg)}to{transform:translateX(-12%) rotate(12deg)}}
@keyframes studio-caption-in{from{opacity:.4;translate:0 .8rem}to{opacity:1;translate:0 0}}
@media screen and (prefers-reduced-motion:no-preference){
  main .studio-gallery{scroll-behavior:smooth}
  main .studio-gallery details[open]>:not(summary){animation:studio-caption-in .46s cubic-bezier(.2,.75,.2,1) both}
  main .studio-gallery summary .studio-card-art{transition:transform .55s cubic-bezier(.2,.75,.2,1)}
  main .studio-gallery details[open] .studio-card-art{transform:scale(.93) rotate(-2deg)}
  @media(hover:hover){main .studio-gallery summary:hover .studio-card-art{transform:scale(1.04) rotate(1deg)}}
}
main .studio-feature{padding-block:clamp(2rem,6vw,5rem);border-block-start:1px solid currentColor}
main .studio-feature p{max-inline-size:42em;line-height:1.85}
@media screen and (prefers-reduced-motion:no-preference){
  @supports(animation-timeline:view()){
    main .studio-feature::before{content:"";display:block;height:.22rem;background:currentColor;transform-origin:left;animation:studio-feature-line linear both;animation-timeline:view();animation-range:entry 0% cover 40%}
    main .studio-feature p{animation:studio-feature-rise linear backwards;animation-timeline:view();animation-range:entry 0% entry 85%}
  }
}
@keyframes studio-feature-line{from{transform:scaleX(.04)}to{transform:scaleX(1)}}
@keyframes studio-feature-rise{from{translate:0 1.5rem;opacity:.65}to{translate:0 0;opacity:1}}
main .studio-closeup{background:var(--studio-ink,CanvasText);color:var(--studio-paper,Canvas);padding-inline:clamp(1rem,5vw,4rem)}
main .studio-sequence p{border-inline-start:2px solid currentColor;padding-inline-start:1.2em}
@media(min-width:720px){main .studio-spread{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);column-gap:5vw}main .studio-spread h2{grid-column:1;grid-row:2 / span 3}main .studio-spread p{grid-column:2}main .studio-spread::before{grid-column:1/-1}}
@media screen and (prefers-reduced-motion:no-preference){
  @supports(animation-timeline:view()){
    main .studio-spread p{animation-name:studio-spread-in}
    main .studio-closeup h2{animation:studio-iris linear both;animation-timeline:view();animation-range:entry 0% entry 100%}
    main .studio-sequence::before{height:.5rem;background:repeating-linear-gradient(90deg,currentColor 0 2px,transparent 2px 12px)}
  }
}
@keyframes studio-spread-in{from{translate:1.5rem 0;clip-path:inset(0 12% 0 0)}to{translate:0 0;clip-path:inset(0)}}
@keyframes studio-iris{from{clip-path:inset(0 35% 0 0);translate:0 .5em}to{clip-path:inset(0);translate:0 0}}
/* Decorative graphics live in their own empty spans and never cover copy. */
.studio-reel,.studio-tide,.studio-track{display:block;position:relative;overflow:hidden;color:inherit}
.studio-reel{height:clamp(5rem,10vw,8rem);background:repeating-linear-gradient(90deg,currentColor 0 9px,transparent 9px 18px) left bottom/100% 5px no-repeat}
.studio-reel::after{content:"";position:absolute;width:4.4rem;aspect-ratio:1;bottom:8px;left:0;border-radius:50%;
  background:radial-gradient(circle,currentColor 0 7%,transparent 8% 62%,currentColor 63% 67%,transparent 68%),repeating-conic-gradient(from 10deg,transparent 0 17deg,currentColor 18deg 36deg,transparent 37deg 60deg);border:2px solid currentColor}
.studio-tide{height:clamp(4rem,8vw,7rem);background:linear-gradient(transparent 48%,currentColor 49% 50%,transparent 51%)}
.studio-tide::after,.studio-tide::before{content:"";position:absolute;inset:0 -80px;background:radial-gradient(ellipse at 50% 100%,transparent 61%,currentColor 63% 65%,transparent 67%) 0 50%/80px 52px repeat-x}
.studio-tide::after{opacity:.45;background-size:64px 34px}
.studio-track{height:.7rem;border-bottom:1px solid currentColor;background:repeating-linear-gradient(90deg,currentColor 0 1px,transparent 1px 5%)}
@keyframes studio-roll{from{transform:translateX(0) rotate(0)}to{transform:translateX(7rem) rotate(180deg)}}
@keyframes studio-wave{to{background-position:80px 50%}}
@keyframes studio-wave-back{to{background-position:-64px 50%}}
@keyframes studio-track-in{from{clip-path:inset(0 94% 0 0)}to{clip-path:inset(0)}}
@keyframes studio-page-in{from{transform:perspective(650px) rotateY(-12deg);opacity:.7}to{transform:none;opacity:1}}
@media screen and (prefers-reduced-motion:no-preference){
  .studio-reel::after{animation:studio-roll 3s cubic-bezier(.45,0,.55,1) infinite alternate}
  .studio-tide::before{animation:studio-wave 4s linear infinite}
  .studio-tide::after{animation:studio-wave-back 3s linear infinite}
  @supports (animation-timeline:view()){
    .studio-track,.studio-page{animation:studio-track-in linear both;animation-timeline:view();animation-range:entry 0% cover 45%}
    .studio-page{animation-name:studio-page-in;transform-origin:left center;animation-range:entry 0% entry 100%}
  }
  main h1{${entrance}}
  html{scroll-behavior:smooth}
  main :is(.studio-hero-visual,.studio-motion-lead){${entrance};animation-delay:80ms}
  @supports (animation-timeline:view()) and (animation-range:entry 0% entry 100%){
    main :is(h2,.studio-motion-detail,article h3,figure figcaption){animation:${name} linear backwards;animation-timeline:view();animation-range:entry 0% entry 100%}
  }
  a[href^="#"]{transition:color .18s ease,background-color .18s ease,text-underline-offset .18s ease}
  a[href^="#"]:is(:hover,:focus-visible){text-decoration:underline;text-underline-offset:.35em}
  main details[open]>:not(summary){animation:studio-answer .4s ease-out}
  main details.studio-fold[open]>:not(summary){transform-origin:top;animation:studio-fold .48s cubic-bezier(.16,.8,.3,1) backwards}
  main details.studio-slip[open]>:not(summary){animation:studio-slip .38s ease-out backwards}
  @keyframes studio-fold{from{opacity:.65;transform:perspective(800px) rotateX(-12deg);clip-path:inset(0 0 65% 0)}}
  @keyframes studio-slip{from{opacity:.6;translate:-.85rem 0;clip-path:inset(0 14% 0 0)}}
  @keyframes studio-answer{from{opacity:.4;translate:0 .65rem}to{opacity:1;translate:0 0}}
  @media(hover:hover){main :is(a,summary):hover{translate:0 -2px;transition:translate .2s ease}}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}*,*::before,*::after{animation:none!important;transition:none!important}}
</style>`;
}
