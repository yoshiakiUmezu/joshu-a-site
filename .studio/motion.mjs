// Only studio-owned styles reach this stylesheet; model CSS uses the normal validator.
const themes = {
  soft: { name: 'studio-drift', duration: '760ms', from: 'opacity:.72;translate:0 .85rem' },
  editorial: { name: 'studio-unfold', duration: '640ms', from: 'clip-path:inset(0 9% 0 0);translate:0 .4rem' },
  rhythmic: { name: 'studio-beat', duration: '520ms', from: 'opacity:.8;scale:.965;translate:0 1rem', accent: '68%{translate:0 -.15rem;scale:1}' },
};
export const motionModes = Object.keys(themes);

export function motionSheet(mode = 'soft', withScenes = false) {
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
${withScenes ? sceneStyles : ''}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}*,*::before,*::after{animation:none!important;transition:none!important}}
</style>`;
}

const sceneStyles = `
main h2:is(.studio-leaves,.studio-water,.studio-letter,.studio-orbit){--stage:clamp(9rem,26vh,18rem);display:block;position:relative;isolation:isolate;overflow:clip;padding:calc(var(--stage) + 1rem) .65rem .7rem;line-height:1.3;animation:none}
main h2:is(.studio-leaves,.studio-water,.studio-letter,.studio-orbit)::before,
main h2:is(.studio-leaves,.studio-water,.studio-letter,.studio-orbit)::after{content:"";display:block;position:absolute;pointer-events:none;top:0;left:0;width:100%;height:var(--stage)}
main h2.studio-leaves::before{background:linear-gradient(125deg,#253d36,#516253)}
main h2.studio-leaves::after{width:46%;height:calc(var(--stage)*.72);left:28%;top:calc(var(--stage)*.14);background:repeating-linear-gradient(0deg,#f9eac7 0 12%,#918977 13%,#f9eac7 14%);border-left:.35rem solid #8d664b;box-shadow:10px 6px #aa9d7f,18px 10px #cfba93;transform:rotate(-8deg);transform-origin:left center}
main h2.studio-water::before{background:linear-gradient(#183d53,#206a76 60%,#b0d9c4)}
main h2.studio-water::after{background:repeating-radial-gradient(ellipse at 38% 116%,transparent 0 7%,#d1f3df 7.5% 8%,transparent 9% 12%);background-size:125% 140%}
main h2.studio-letter::before{background:repeating-linear-gradient(140deg,#e4ac95 0 3%,#f3e1bc 3% 6%,#57686b 6% 9%,#f3e1bc 9% 12%);border-block:.65rem solid #ece3cc}
main h2.studio-letter::after{width:42%;height:calc(var(--stage)*.57);top:calc(var(--stage)*.21);left:28%;background:linear-gradient(32deg,transparent 49%,#b49677 50%,transparent 51%) left top/50% 100%,linear-gradient(-32deg,transparent 49%,#b49677 50%,transparent 51%) right top/50% 100%,#fff3d9;background-repeat:no-repeat;box-shadow:5px 9px 0 #4b3c3544;transform:rotate(-8deg)}
main h2.studio-orbit::before{background:radial-gradient(circle at 52% 46%,#f7d38b 0 8%,#be8055 9% 13%,transparent 14%),radial-gradient(circle at 21% 25%,#fff 0 1px,transparent 2px),radial-gradient(circle at 84% 62%,#ffe4bc 0 2px,transparent 3px),#292843}
main h2.studio-orbit::after{width:52%;height:calc(var(--stage)*.28);left:26%;top:calc(var(--stage)*.33);border:3px double #efd7ac;border-radius:50%;transform:rotate(-18deg)}
main .studio-scene-caption{display:block}
main ul.studio-roll{padding:1rem clamp(1rem,5vw,3rem);background:#28282b;color:#fff2d4;border-block:.6rem dotted #b8ab96;list-style:none}
main ul.studio-roll li{padding:.9em 0;border-bottom:1px dashed #b8ab96}
main .studio-projector{position:relative;isolation:isolate}
main .studio-projector::after{content:"";display:block;width:100%;height:clamp(2.2rem,6vw,4rem);grid-column:1/-1;pointer-events:none;background:repeating-linear-gradient(90deg,#28272b 0 6px,transparent 6px 48px),repeating-linear-gradient(115deg,#ce8f59 0 12px,#e3b777 13px 22px,#596b61 23px 37px,#a45a43 38px 48px);background-size:48px 100%;border-block:6px dotted #2a282c}
@media(prefers-reduced-motion:no-preference){
 main .studio-projector h1,main .studio-projector h1+p{animation:studio-type-lift 1s cubic-bezier(.18,.7,.25,1) backwards}
 main .studio-projector h1{animation:studio-title-focus 1.25s cubic-bezier(.2,.65,.25,1) both;transform-origin:left center}
 main .studio-projector h1+p{animation-delay:.18s}
 main .studio-projector::after{animation:studio-project 1.8s linear infinite}
 main h2:is(.studio-leaves,.studio-water,.studio-letter,.studio-orbit)::after{animation:var(--scene) var(--period,3.6s) ease-in-out infinite alternate}
 main .studio-leaves{--scene:studio-leaf-turn}main .studio-water{--scene:studio-swell;--period:2.8s}main .studio-letter{--scene:studio-post;--period:3.1s}main .studio-orbit{--scene:studio-ring}
 @supports(animation-timeline:view()){
 main .studio-feature .studio-scene-caption,main .studio-feature:has(.studio-scene-caption)>p{animation:studio-type-lift linear both;animation-timeline:view();animation-range:entry 0% cover 26%}
 main .studio-feature:has(.studio-scene-caption)>p{animation-range:entry 0% cover 32%}
 main h2.studio-leaves .studio-scene-caption{animation-name:studio-type-unfold;transform-origin:50% 100%}
 main h2.studio-water .studio-scene-caption{animation-name:studio-title-focus}
 main h2.studio-letter .studio-scene-caption{animation-name:studio-ink-reveal}
 main h2.studio-orbit .studio-scene-caption{animation-name:studio-type-arc;transform-origin:0 100%}
 main ul.studio-roll li time{display:inline-block;transform-origin:center bottom;animation:studio-clock-flip linear both;animation-timeline:view();animation-range:entry 0% cover 22%}
 main ul.studio-roll li{animation:studio-feed linear both;animation-timeline:view();animation-range:entry 0% cover 70%}}
}
@keyframes studio-type-unfold{from{transform:perspective(25rem) rotateX(-74deg);opacity:.22}to{transform:perspective(25rem) rotateX(0);opacity:1}}
@keyframes studio-title-focus{from{filter:blur(6px);opacity:.18;transform:scale(.9)}to{filter:blur(0);opacity:1;transform:scale(1)}}
@keyframes studio-ink-reveal{from{clip-path:inset(0 96% 0 0);translate:-.4em 0}to{clip-path:inset(0);translate:0 0}}
@keyframes studio-type-arc{from{transform:translateX(1em) rotate(8deg);opacity:.25}to{transform:none;opacity:1}}
@keyframes studio-clock-flip{from{transform:perspective(14rem) rotateX(76deg);opacity:.35}to{transform:perspective(14rem) rotateX(0);opacity:1}}
@keyframes studio-type-lift{from{opacity:.16;translate:0 2.4rem}to{opacity:1;translate:0 0}}
@keyframes studio-project{to{background-position:48px 0,48px 0}}
@keyframes studio-leaf-turn{from{transform:perspective(35rem) rotateY(-80deg) rotate(-14deg)}to{transform:perspective(35rem) rotateY(20deg) rotate(6deg)}}
@keyframes studio-swell{from{background-position:0 90%}to{background-position:100% 0}}
@keyframes studio-post{from{transform:translate(-110%,40%) rotate(-29deg)}to{transform:translate(32%,-6%) rotate(6deg)}}
@keyframes studio-ring{from{transform:rotate(-42deg) scaleX(.65)}to{transform:rotate(23deg) scaleX(1.15)}}
@keyframes studio-feed{from{opacity:.68;transform:translateY(-.7em)}to{opacity:1;transform:translateY(0)}}
`;
