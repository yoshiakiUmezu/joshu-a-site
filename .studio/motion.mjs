// Only studio-owned styles reach this stylesheet; model CSS uses the normal validator.
const themes = {
  soft: { name: 'studio-drift', duration: '760ms', from: 'opacity:.72;translate:0 .85rem' },
  editorial: { name: 'studio-unfold', duration: '640ms', from: 'clip-path:inset(0 9% 0 0);translate:0 .4rem' },
  rhythmic: { name: 'studio-beat', duration: '520ms', from: 'opacity:.8;scale:.965;translate:0 1rem', accent: '68%{translate:0 -.15rem;scale:1}' },
};
export const motionModes = [...Object.keys(themes), 'still'];

export function motionSheet(mode = 'soft') {
  if (mode === 'still') return '';
  const { name, duration, from, accent = '' } = Object.hasOwn(themes, mode) ? themes[mode] : themes.soft;
  return `<style id="studio-motion">
@keyframes ${name}{from{${from}}${accent}to{opacity:1;translate:0 0;scale:1;clip-path:inset(0)}}
@media screen and (prefers-reduced-motion:no-preference){
  html{scroll-behavior:smooth}
  main h1,main .studio-hero-visual,main .studio-motion-lead{animation:${name} ${duration} cubic-bezier(.2,.7,.25,1) backwards}
  main .studio-hero-visual,main .studio-motion-lead{animation-delay:80ms}
  a[href^="#"]{transition:color .18s ease,background-color .18s ease,text-underline-offset .18s ease}
  a[href^="#"]:is(:hover,:focus-visible){text-decoration:underline;text-underline-offset:.35em}
  @supports (animation-timeline:view()) and (animation-range:entry 0% entry 100%){
    main :is(h2,.studio-motion-detail){animation:${name} linear backwards;animation-timeline:view();animation-range:entry 0% entry 100%}
  }
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}*,*::before,*::after{animation:none!important;transition:none!important}}
</style>`;
}
