import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background, Eyebrow, Sheen, boxStyle, fadeUp, LogoImg} from './components';
import {introLogoBox, useLayout, type Box} from './layout';
import {BEELDMERK, C, FONT, LOGO_FC, config, progress, type AssetProps} from './theme';

// De diamant ("ster") zweeft rustig schuin door beeld en fadet voorbij;
// zodra hij voorbij is, verschijnt het logo.
const PASS_START = 0.2;
const PASS_DUR = 2.4;
const TRAIL = 12; // naglans: kopieën van de PNG met afnemende opacity
const TRAIL_STEP = 0.025; // s tussen de kopieën

export const Intro: React.FC<AssetProps> = (assets) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const L = useLayout(width, height);
	const {u} = L;
	const t = frame / fps;

	const logo = introLogoBox(L, assets);
	const bm = assets.beeldmerk ?? {w: 1, h: 1};
	const baseW = 0.2 * Math.min(width, height);

	// Baan: van linksonder naar rechtsboven, halverwege over de plek van de diamant in het logo.
	const midY = logo.cy - logo.h * 0.3;
	const from = {x: -0.15 * width, y: midY + 0.3 * height};
	const to = {x: 1.15 * width, y: midY - 0.3 * height};
	const starAt = (time: number) => {
		// Lineair door beeld: zweven, niet versnellen of stuiteren.
		const p = (time - PASS_START) / PASS_DUR;
		const x = from.x + (to.x - from.x) * p;
		const y = from.y + (to.y - from.y) * p;
		// Opacity: rustig op, piek in het midden, weer weg.
		const opacity = interpolate(p, [0, 0.35, 0.6, 1], [0, 1, 1, 0], {
			easing: Easing.inOut(Easing.sin),
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		});
		const w = baseW * interpolate(p, [0, 0.5, 1], [0.8, 1, 0.8], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		const box: Box = {cx: x, cy: y, w, h: (w * bm.h) / bm.w};
		return {box, opacity, p};
	};

	const star = starAt(t);
	const sheen = interpolate(star.p, [0.35, 0.65], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

	// Logo komt op zodra de ster er net voorbij is.
	const logoIn = progress(frame, fps, PASS_START + PASS_DUR * 0.56, 0.9);
	const logoBox: Box = {...logo, w: logo.w * (0.96 + 0.04 * logoIn), h: logo.h * (0.96 + 0.04 * logoIn)};

	const eyebrowP = progress(frame, fps, 2.4, 0.6);
	const titleP = progress(frame, fps, 2.55, 0.7);
	const textTop = logo.cy + logo.h / 2 + 72 * u;

	return (
		<AbsoluteFill>
			<Background />
			{assets.logoFc ? <LogoImg src={LOGO_FC} box={logoBox} opacity={logoIn} /> : null}
			{assets.beeldmerk ? (
				<>
					{new Array(TRAIL).fill(0).map((_, i) => {
						const k = TRAIL - i; // achterste eerst tekenen
						const s = starAt(t - k * TRAIL_STEP);
						const fall = 1 - k / (TRAIL + 1);
						const w = s.box.w * (0.7 + 0.3 * fall);
						return (
							<Img
								key={k}
								src={staticFile(BEELDMERK)}
								style={{
									...boxStyle({...s.box, w, h: (w * bm.h) / bm.w}),
									objectFit: 'contain',
									opacity: s.opacity * 0.12 * fall,
								}}
							/>
						);
					})}
					<Img src={staticFile(BEELDMERK)} style={{...boxStyle(star.box), objectFit: 'contain', opacity: star.opacity}} />
					<Sheen src={BEELDMERK} box={star.box} p={sheen} />
				</>
			) : null}
			<div
				style={{
					position: 'absolute',
					top: textTop,
					left: L.safe.side,
					right: L.safe.side,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 30 * u,
				}}
			>
				<Eyebrow text={config.intro.eyebrow} L={L} style={fadeUp(eyebrowP, u)} />
				<div
					style={{
						...fadeUp(titleP, u),
						fontFamily: FONT,
						fontWeight: 700,
						fontSize: 88 * u,
						lineHeight: 1.1,
						color: C.gold500,
						textAlign: 'center',
						textWrap: 'balance',
					}}
				>
					{config.intro.titel}
				</div>
			</div>
		</AbsoluteFill>
	);
};
