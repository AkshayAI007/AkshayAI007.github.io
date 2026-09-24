export const SITE = {
  name: 'Akshay Bawaliwale',
  shortName: 'AB',
  role: 'Senior Generative AI & LLM Engineer',
  jobTitle: 'Senior Generative AI & LLM Specialist',
  employer: 'BuzzBoard',
  locale: 'en_IN',
  themeColor: '#141310',
  email: 'akshay.aispecialist@gmail.com',
  github: 'https://github.com/AkshayAI007',
  linkedin: 'https://in.linkedin.com/in/akshaybawaliwale',
  medium: 'https://medium.com/@akshay.bawali09',
  resumePdf: '/Akshay_Bawaliwale_Resume.pdf',
} as const;

/** Primary navigation. `route` identifies the destination for aria-current. */
export const NAV = [
  { label: 'Home', href: '/', route: 'home' },
  { label: 'Systems', href: '/#systems', route: 'systems' },
  { label: 'Projects', href: '/#projects', route: 'projects' },
  { label: 'Writing', href: '/writing', route: 'writing' },
  { label: 'About', href: '/about', route: 'about' },
  { label: 'Resume', href: '/resume', route: 'resume' },
] as const;

export type NavRoute = (typeof NAV)[number]['route'] | 'reach' | 'case' | 'none';
