declare module 'subset-font' {
  interface SubsetFontOptions {
    targetFormat?: 'sfnt' | 'truetype' | 'woff' | 'woff2';
    preserveNameIds?: number[];
    keepFeatures?: string[];
    variationAxes?: Record<string, number | { min: number; max: number; default?: number }>;
    noLayoutClosure?: boolean;
  }
  /** Subsets a font to the glyphs needed for `text` (harfbuzz hb-subset). */
  export default function subsetFont(font: Buffer | Uint8Array, text: string, options?: SubsetFontOptions): Promise<Buffer>;
}
