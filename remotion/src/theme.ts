import {Easing, interpolate, staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';
import config from '../../config.json';

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

export const BEELDMERK = 'beeldmerk-goud.png';
export const LOGO_FC = 'logo-fc-wit.png';
