// Only studio-owned styles reach this stylesheet; model CSS uses the normal validator.
const themes = {
  soft: { name: 'studio-drift', duration: '760ms', from: 'opacity:.72;translate:0 .85rem' },
  editorial: { name: 'studio-unfold', duration: '640ms', from: 'clip-path:inset(0 9% 0 0);translate:0 .4rem' },
  rhythmic: { name: 'studio-beat', duration: '520ms', from: 'opacity:.8;scale:.965;translate:0 1rem', accent: '68%{translate:0 -.15rem;scale:1}' },
};
export const motionModes = [...Object.keys(themes), 'still'];

export function motionSheet(mode = 'soft', volume = 'strong') {
  if (volume === 'off') return '<style id="studio-motion">html{scroll-behavior:auto!important}*,*::before,*::after{animation:none!important;transition:none!important}</style>';
  if (mode === 'still') return '';
  const { name, duration, from, accent = '' } = Object.hasOwn(themes, mode) ? themes[mode] : themes.soft;
  if (volume === 'subtle') return `<style id="studio-motion">
@media (prefers-reduced-motion:no-preference){@keyframes studio-light{from{opacity:.85}to{opacity:1}}main h1{animation:studio-light .28s ease-out}a:focus-visible{text-decoration:underline}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}*,*::before,*::after{animation:none!important;transition:none!important}}
</style>`;
  const strong = volume === 'strong';
  return `<style id="studio-motion">
@keyframes ${name}{from{${strong ? ({soft:"opacity:.2;translate:0 2.4rem",editorial:"clip-path:inset(0 85% 0 0);translate:0 1rem",rhythmic:"opacity:.4;scale:.90;translate:0 2.2rem"}[mode] || from) : from}}${accent}to{opacity:1;translate:0 0;scale:1;clip-path:inset(0)}}
@media screen and (prefers-reduced-motion:no-preference){
  html{scroll-behavior:smooth}
  main h1,main .studio-hero-visual,main .studio-motion-lead{animation:${name} ${strong ? "980ms" : duration} cubic-bezier(.2,.7,.25,1) backwards}
  main .studio-hero-visual,main .studio-motion-lead{animation-delay:80ms}
  a[href^="#"]{transition:color .18s ease,background-color .18s ease,text-underline-offset .18s ease}
  a[href^="#"]:is(:hover,:focus-visible){text-decoration:underline;text-underline-offset:.35em}
  ${strong ? `main .studio-hero-visual,main .studio-motion-lead{animation-delay:160ms}
  main details[open]>:not(summary){animation:studio-answer .4s ease-out}
  @keyframes studio-answer{from{opacity:.4;translate:0 .65rem}to{opacity:1;translate:0 0}}
  @media(hover:hover){main :is(a,summary):hover{translate:0 -2px;transition:translate .2s ease}}` : ''}
  @supports (animation-timeline:view()) and (animation-range:entry 0% entry 100%){
    main :is(h2,.studio-motion-detail){animation:${name} linear backwards;animation-timeline:view();animation-range:entry 0% entry 100%}
  }
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}*,*::before,*::after{animation:none!important;transition:none!important}}
</style>`;
}
