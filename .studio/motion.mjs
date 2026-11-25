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
