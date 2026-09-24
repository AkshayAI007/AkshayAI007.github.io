import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import sharp from 'sharp';

/**
 * 1200×630 Open Graph card in the site's own type and palette (dark tokens):
 * Newsreader for the headline, Geist Mono for the labels. Rendered at build.
 */
export interface OgCard {
  kicker: string;
  title: string;
  /** Second headline line, set in italic accent (the site's <em>). */
  em?: string;
  /** Proof line at the foot, e.g. "2 days → 3 min · service-queue latency". */
  metric?: string;
}

const T = {
  ground: '#141310',
  ink: '#ece6d7',
  ink2: '#b6ad9b',
  ink3: '#928979',
  line: 'rgba(236,230,215,.14)',
  accent: '#7f9dff',
  flag: '#e8724a',
};

const font = (file: string) => readFile(join(process.cwd(), 'node_modules', file));
let fonts: Promise<Parameters<typeof satori>[1]['fonts']> | undefined;
const loadFonts = () =>
  (fonts ??= Promise.all([
    font('@fontsource/newsreader/files/newsreader-latin-300-normal.woff'),
    font('@fontsource/newsreader/files/newsreader-latin-300-italic.woff'),
    font('@fontsource/geist-mono/files/geist-mono-latin-500-normal.woff'),
    font('@fontsource/geist-mono/files/geist-mono-symbols2-500-normal.woff'), // arrows (→)
  ]).then(([serif, serifItalic, mono, monoSymbols]) => [
    { name: 'Newsreader', data: serif, weight: 300 as const, style: 'normal' as const },
    { name: 'Newsreader', data: serifItalic, weight: 300 as const, style: 'italic' as const },
    { name: 'Geist Mono', data: mono, weight: 500 as const, style: 'normal' as const },
    { name: 'Geist Mono Symbols', data: monoSymbols, weight: 500 as const, style: 'normal' as const },
  ]));

export async function renderOg(card: OgCard, host: string): Promise<Buffer> {
  const long = card.title.length + (card.em?.length ?? 0) > 70;
  const size = long ? 62 : 76;
  const svg = await satori(
    <div
      style={{
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px 72px 56px',
        backgroundColor: T.ground,
        backgroundImage: `radial-gradient(60% 50% at 88% 6%, rgba(127,157,255,.16), transparent 70%), radial-gradient(45% 40% at 4% 100%, rgba(232,114,74,.10), transparent 70%)`,
        color: T.ink,
        fontFamily: 'Geist Mono, Geist Mono Symbols',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Newsreader', fontSize: 40, letterSpacing: 1 }}>AB</span>
          <span style={{ width: 9, height: 9, borderRadius: 9, marginLeft: 12, backgroundColor: T.accent, boxShadow: `0 0 14px ${T.accent}` }} />
        </div>
        <span style={{ fontSize: 18, letterSpacing: 3, color: T.ink3 }}>{host.toUpperCase()}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 20, letterSpacing: 4, color: T.flag, marginBottom: 26, textTransform: 'uppercase' }}>{card.kicker}</span>
        <span style={{ fontFamily: 'Newsreader', fontSize: size, lineHeight: 1.04, letterSpacing: -1.5, maxWidth: 1040 }}>{card.title}</span>
        {card.em && (
          <span style={{ fontFamily: 'Newsreader', fontStyle: 'italic', fontSize: size, lineHeight: 1.04, letterSpacing: -1.5, color: T.accent, maxWidth: 1040 }}>
            {card.em}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${T.line}`, paddingTop: 22 }}>
        <span style={{ fontSize: 19, letterSpacing: 2, color: T.ink2 }}>{card.metric ?? 'SENIOR GENERATIVE AI & LLM ENGINEER'}</span>
        <span style={{ fontSize: 19, letterSpacing: 3, color: T.ink3 }}>AKSHAY BAWALIWALE</span>
      </div>
    </div>,
    { width: 1200, height: 630, fonts: await loadFonts() },
  );
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
