import {Easing, interpolate, staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';
// actief.json = kopie van de config waarmee build.sh draait (config.json of personen/*.json).
import config from './actief.json';

export {config};

export const [RES_W, RES_H] = config.resolutie.split('x').map(Number);

// Open Sans (Google Fonts, OFL) staat lokaal in public/fonts, zodat renderen ook offline
// en achter een proxy werkt. Variabel font: één bestand voor 400, 500 en 700.
export const FONT = 'Open Sans';
for (const weight of ['400', '500', '700']) {
	loadFont({family: FONT, url: staticFile('fonts/OpenSans-latin.woff2'), weight, format: 'woff2'});
}

// Huisstijl Topvrouwen Limburg: alleen deze kleuren.
export const C = {
	navy950: '#05001e',
	navy900: '#130e2e',
	navy700: '#3d375d',
	gold500: '#caa54f',
	gold300: '#f7d98e',
	gold200: '#fde196',
	gold700: '#ad7132',
	white: '#ffffff',
	white70: 'rgba(255, 255, 255, 0.7)',
};

export const EASE = Easing.bezier(0.22, 1, 0.36, 1);

// Voortgang 0..1 van een animatie die op `start` (s) begint en `dur` (s) duurt.
export const progress = (frame: number, fps: number, start: number, dur: number) =>
	interpolate(frame, [start * fps, (start + dur) * fps], [0, 1], {
		easing: EASE,
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

export type ImgInfo = {w: number; h: number} | null;

// Props die build.sh meegeeft: welke logo-PNG's aanwezig zijn en hun afmetingen.
export type AssetProps = {
	beeldmerk: ImgInfo;
	logoFc: ImgInfo;
	fps?: number;
	// true = de intro opent met de openingsfoto (config.foto) als achtergrond.
	foto?: boolean;
};

export const defaultAssetProps: AssetProps = {
	beeldmerk: {w: 834, h: 606},
	logoFc: {w: 1250, h: 880},
};

// Thema per categorie (design system): Topvrouw = donker (navy met goud),
// Young Female Talent = goud (gouden verloop met navy). config.thema: "topvrouw" (standaard) of "yftl".
export const YFTL = (config as {thema?: string}).thema === 'yftl';

// Het fc-logo mag nooit op goud (goud op goud). Op het gouden YFTL-verloop gebruiken we daarom
// het eenkleurig witte logo, en voor de diamant-animatie de diamant uit dat witte logo
// (beeldmerk-wit.png = uitsnede van logo-wit.png, niet hertekend of herkleurd).
export const BEELDMERK = YFTL ? 'beeldmerk-wit.png' : 'beeldmerk-goud.png';
export const LOGO_FC = YFTL ? 'logo-wit.png' : 'logo-fc-wit.png';

// rgb-tripels voor lichteffecten (flits, gloed, vonkjes), zodat ze met elke opacity werken.
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ');

export const P = YFTL
	? {
			bg: `linear-gradient(to bottom right, ${C.gold700} 0%, ${C.gold500} 42%, ${C.gold300} 78%, ${C.gold200} 100%)`,
			vignette: 'rgba(173, 113, 50, 0)',
			vignetteEdge: 'rgba(173, 113, 50, 0.35)',
			base: C.gold700,
			accent: C.navy950,
			text: C.navy950,
			textMuted: 'rgba(5, 0, 30, 0.75)',
			btnBg: C.navy950,
			btnText: C.gold300,
			btnSheen: rgb(C.white),
			end: C.gold700,
			fxHi: rgb(C.white),
			fxMid: rgb(C.white),
			fxSoft: rgb(C.white),
			dot: C.white,
			dotGlow: 'rgba(255, 255, 255, 0.9)',
			dotGlow2: 'rgba(255, 255, 255, 0.9)',
			dust: C.white,
			ring: C.white,
			shade: rgb(C.gold200),
		}
	: {
			bg: `linear-gradient(to bottom right, ${C.navy950} 0%, ${C.navy900} 50%, ${C.navy700} 100%)`,
			vignette: 'rgba(5, 0, 30, 0)',
			vignetteEdge: 'rgba(5, 0, 30, 0.55)',
			base: C.navy950,
			accent: C.gold500,
			text: C.white,
			textMuted: C.white70,
			btnBg: C.white,
			btnText: C.gold500,
			btnSheen: rgb(C.gold300),
			end: C.navy950,
			fxHi: rgb(C.gold200),
			fxMid: rgb(C.gold500),
			fxSoft: rgb(C.gold300),
			dot: C.gold200,
			dotGlow: C.gold500,
			dotGlow2: C.gold300,
			dust: C.gold300,
			ring: C.gold300,
			shade: rgb(C.navy950),
		};
