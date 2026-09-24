// Every route of the site, with the v1 URL it replaces. Shared by the
// Playwright specs and the visual-parity script.
export const ROUTES = [
  { name: 'home', path: '/', legacy: '/#/', h1: 'I architect AI systems that survive reality.' },
  { name: 'about', path: '/about', legacy: '/#/about', h1: 'Machine learning got me here.' },
  { name: 'writing', path: '/writing', legacy: '/#/writing', h1: 'Making complex AI harder to misunderstand.' },
  { name: 'reach', path: '/reach', legacy: '/#/reach', h1: 'Have an AI problem that refuses to behave?' },
  { name: 'resume', path: '/resume', legacy: '/#/resume', h1: 'Everything above, compressed to one page.' },
  { name: 'case-voice-ai', path: '/case/voice-ai', legacy: '/#/case/voice-ai', h1: 'From a two-day service queue to three minutes.' },
  { name: 'case-agent', path: '/case/agent', legacy: '/#/case/agent', h1: 'An autonomous agent answering for 3M+ SMBs in under three seconds.' },
  { name: 'case-onboarding', path: '/case/onboarding', legacy: '/#/case/onboarding', h1: 'Four agents, one validated business profile.' },
  { name: 'project-cardiovascular', path: '/projects/cardiovascular', legacy: '/projects/cardiovascular.html', h1: 'Estimating a patient' },
  { name: 'project-netflix', path: '/projects/netflix', legacy: '/projects/netflix.html', h1: 'Eleven models benchmarked across 8,807 titles' },
  { name: 'project-image-enhancer', path: '/projects/image-enhancer', legacy: '/projects/image-enhancer.html', h1: '4× super-resolution built to' },
  { name: 'project-nyc-taxi', path: '/projects/nyc-taxi', legacy: '/projects/nyc-taxi.html', h1: 'Estimating how long a taxi ride will actually take' },
];

// Old links that must keep landing on the right page.
export const LEGACY_LINKS = [
  { from: '/#/', to: '/' },
  { from: '/#/home', to: '/' },
  { from: '/#/systems', to: '/#systems' },
  { from: '/#/projects', to: '/#projects' },
  { from: '/#/lab', to: '/#projects' },
  { from: '/#/about', to: '/about' },
  { from: '/#/writing', to: '/writing' },
  { from: '/#/reach', to: '/reach' },
  { from: '/#/resume', to: '/resume' },
  { from: '/#/case/voice-ai', to: '/case/voice-ai' },
  { from: '/#/case/agent', to: '/case/agent' },
  { from: '/#/case/b2b', to: '/case/agent' },
  { from: '/#/case/onboarding', to: '/case/onboarding' },
  { from: '/#/case/eval', to: '/case/onboarding' },
  { from: '/index.html#/about', to: '/about' },
  { from: '/projects/cardiovascular.html', to: '/projects/cardiovascular.html' },
  { from: '/projects/netflix.html', to: '/projects/netflix.html' },
  { from: '/projects/image-enhancer.html', to: '/projects/image-enhancer.html' },
  { from: '/projects/nyc-taxi.html', to: '/projects/nyc-taxi.html' },
];
