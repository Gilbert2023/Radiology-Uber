/**
 * Optional licensed photography.
 *
 * The build ships with original SVG illustrations so no unlicensed imagery is
 * used. To use real MRI photographs (recommended for production), place the
 * files in public/images/ and fill in the entries below with the source,
 * licence and attribution. Attribution is rendered automatically on the page
 * and on /resources/ (Image credits).
 *
 * Suitable sources: your own department photography (with consent and
 * information-governance approval), vendor press kits under their media
 * terms, or Wikimedia Commons files with a compatible licence.
 */
export interface Photo {
  src: string;
  alt: string;
  credit: string;
  license: string;
  sourceUrl?: string;
}

export const media: { hero: Photo | null; screening: Photo | null; signage: Photo | null } = {
  hero: null,
  screening: null,
  signage: null,
};
