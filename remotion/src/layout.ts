import {config, type AssetProps} from './theme';

// Alle maten relatief aan de korte zijde: u = 1 bij 1080 px.
export const useLayout = (width: number, height: number) => {
	const u = Math.min(width, height) / 1080;
	const portrait = height > width;
	const safe = {
		top: height * 0.06,
		side: width * 0.06,
		bottom: height * (portrait ? 0.12 : 0.06),
	};
	return {u, portrait, safe, width, height};
};

export type Layout = ReturnType<typeof useLayout>;

export type Box = {cx: number; cy: number; w: number; h: number};

const fitLogo = (L: Layout, assets: AssetProps, targetH: number): {w: number; h: number} => {
	const info = assets.logoFc ?? {w: 1, h: 1};
	let h = targetH;
	let w = (h * info.w) / info.h;
	const maxW = L.width * 0.8;
	if (w > maxW) {
		w = maxW;
		h = (w * info.h) / info.w;
	}
	return {w, h};
};

// Logo in de intro. Staand: ± 32% van boven. Liggend: gecentreerd, max. 22% beeldhoogte.
export const introLogoBox = (L: Layout, assets: AssetProps): Box => {
	const {w, h} = fitLogo(L, assets, L.portrait ? 360 * L.u : L.height * 0.22);
	const cy = L.portrait ? L.height * 0.32 : L.height * 0.36;
	return {cx: L.width / 2, cy, w, h};
};

// Klein logo in de outro, onder de naam.
export const outroNameBottom = (L: Layout) => L.height * (L.portrait ? 0.46 : 0.5);

export const outroLogoBox = (L: Layout, assets: AssetProps): Box => {
	const {w, h} = fitLogo(L, assets, 230 * L.u);
	const top = outroNameBottom(L) + 72 * L.u;
	return {cx: L.width / 2, cy: top + h / 2, w, h};
};

// Ruimte onder het CTA-logo voor de socials-regel.
export const CTA_SOCIALS_GAP = 18;
export const CTA_SOCIALS_LINE = 42;

// Logo onderaan in de CTA: klein en gecentreerd, met de socials eronder.
export const ctaLogoBox = (L: Layout, assets: AssetProps): Box => {
	const {w, h} = fitLogo(L, assets, 140 * L.u);
	const below = config.cta.socials ? (CTA_SOCIALS_GAP + CTA_SOCIALS_LINE) * L.u : 0;
	const cy = L.height - L.safe.bottom - below - h / 2;
	return {cx: L.width / 2, cy, w, h};
};
