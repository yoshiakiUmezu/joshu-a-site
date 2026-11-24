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
@media screen and (prefers-reduced-motion:no-preference){
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
