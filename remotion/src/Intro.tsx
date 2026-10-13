import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background, Eyebrow, boxStyle, fadeUp, LogoImg} from './components';
import {introLogoBox, useLayout, type Box} from './layout';
import {BEELDMERK, C, FONT, LOGO_FC, config, progress, type AssetProps} from './theme';

// Intro in de geest van de motion-referentie:
//  1. de gouden diamant gloeit op, met fonkelingen eromheen;
//  2. een lichtflits strijkt van links naar rechts over de diamant;
//  3. de diamant valt (van links naar rechts) uiteen in gouden vonkjes die wegzweven;
//  4. het logo met eyebrow en titel komt op.
const T = {
	diamondIn: 0.1,
	flareStart: 0.9,
	flareEnd: 2.7,
	dissolveStart: 2.6,
	dissolveDur: 0.9,
	logoIn: 3.5,
	eyebrow: 4.0,
	title: 4.15,
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Lijnen van de diamant in beeldmerk-goud.png (fracties van breedte/hoogte), zodat de vonkjes
// op de lijnen van het beeldmerk ontstaan.
const EDGES: [number, number, number, number][] = [
	[0.22, 0.02, 0.78, 0.02],
	[0.78, 0.02, 0.99, 0.31],
	[0.99, 0.31, 0.5, 0.98],
	[0.5, 0.98, 0.01, 0.31],
	[0.01, 0.31, 0.22, 0.02],
	[0.01, 0.31, 0.99, 0.31],
	[0.5, 0.03, 0.5, 0.95],
	[0.22, 0.02, 0.22, 0.31],
	[0.78, 0.02, 0.78, 0.31],
	[0.5, 0.03, 0.24, 0.31],
	[0.5, 0.03, 0.76, 0.31],
	[0.24, 0.31, 0.48, 0.93],
	[0.76, 0.31, 0.52, 0.93],
];
const SPARKS = 170;
const TWINKLES = 40;

export const Intro: React.FC<AssetProps> = (assets) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const L = useLayout(width, height);
	const {u} = L;
	const t = frame / fps;

	const bm = assets.beeldmerk ?? {w: 1, h: 1};
	const logo = introLogoBox(L, assets);

	// Diamant: groot, iets boven het midden, zoomt heel langzaam in.
	const dIn = progress(frame, fps, T.diamondIn, 0.9);
	const zoom = interpolate(t, [0, T.dissolveStart + T.dissolveDur], [0.94, 1.02], clamp);
	const dw = 0.62 * Math.min(width, height) * zoom;
	const diamond: Box = {cx: width / 2, cy: height * 0.4, w: dw, h: (dw * bm.h) / bm.w};
	const dLeft = diamond.cx - diamond.w / 2;
	const dTop = diamond.cy - diamond.h / 2;

	// Lichtflits: van links naar rechts over de gordel van de diamant, piek in het midden.
	const flareP = interpolate(t, [T.flareStart, T.flareEnd], [0, 1], {...clamp, easing: Easing.inOut(Easing.sin)});
	const flareI = Math.sin(Math.PI * flareP);
	const flareX = dLeft - 0.12 * width + flareP * (diamond.w + 0.24 * width);
	const flareY = dTop + diamond.h * 0.31;

	// Uiteenvallen: een zachte veeg van links naar rechts; wat weg is, wordt vonkjes.
	const wipe = interpolate(t, [T.dissolveStart, T.dissolveStart + T.dissolveDur], [-0.15, 1.15], clamp);
	const glow = 0.35 + 0.65 * flareI;
	const mask = `linear-gradient(to right, transparent ${(wipe - 0.08) * 100}%, black ${(wipe + 0.08) * 100}%)`;

	const logoP = progress(frame, fps, T.logoIn, 1.0);
	const eyebrowP = progress(frame, fps, T.eyebrow, 0.6);
	const titleP = progress(frame, fps, T.title, 0.7);
	const textTop = logo.cy + logo.h / 2 + 72 * u;

	return (
		<AbsoluteFill>
			<Background />

			{assets.beeldmerk ? (
				<>
					{/* zachte gouden gloed achter de diamant */}
					<div
						style={{
							position: 'absolute',
							left: diamond.cx - diamond.w,
							top: diamond.cy - diamond.w,
							width: diamond.w * 2,
							height: diamond.w * 2,
							background: `radial-gradient(circle, rgba(202, 165, 79, ${0.22 * glow}) 0%, rgba(202, 165, 79, 0) 55%)`,
							opacity: dIn * (1 - progress(frame, fps, T.dissolveStart, 1.2)),
						}}
					/>
					<Img
						src={staticFile(BEELDMERK)}
						style={{
							...boxStyle(diamond),
							objectFit: 'contain',
							opacity: dIn,
							filter: `drop-shadow(0 0 ${6 * u}px rgba(253, 225, 150, ${0.9 * glow})) drop-shadow(0 0 ${22 * u}px rgba(202, 165, 79, ${0.7 * glow}))`,
							WebkitMaskImage: mask,
							maskImage: mask,
						}}
					/>
					<Twinkles diamond={diamond} t={t} u={u} />
					<Sparks diamond={diamond} t={t} u={u} wipeStart={T.dissolveStart} wipeDur={T.dissolveDur} />
					{flareI > 0.001 ? <Flare x={flareX} y={flareY} i={flareI} u={u} width={width} /> : null}
				</>
			) : null}

			{assets.logoFc ? (
				<LogoImg
					src={LOGO_FC}
					box={{...logo, w: logo.w * (0.96 + 0.04 * logoP), h: logo.h * (0.96 + 0.04 * logoP)}}
					opacity={logoP}
				/>
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

// Lichtflits: heldere kern, gouden halo en een horizontale lichtstreep.
const Flare: React.FC<{x: number; y: number; i: number; u: number; width: number}> = ({x, y, i, u, width}) => {
	const core = 130 * u;
	const halo = 760 * u;
	const streakW = width * 1.1;
	return (
		<AbsoluteFill style={{mixBlendMode: 'screen'}}>
			<div
				style={{
					position: 'absolute',
					left: x - halo / 2,
					top: y - halo / 2,
					width: halo,
					height: halo,
					borderRadius: '50%',
					background: `radial-gradient(circle, rgba(247, 217, 142, ${0.75 * i}) 0%, rgba(202, 165, 79, ${0.28 * i}) 30%, rgba(202, 165, 79, 0) 70%)`,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: x - streakW / 2,
					top: y - 5 * u,
					width: streakW,
					height: 10 * u,
					borderRadius: '50%',
					background: `linear-gradient(to right, rgba(253, 225, 150, 0) 0%, rgba(253, 225, 150, ${0.95 * i}) 50%, rgba(253, 225, 150, 0) 100%)`,
					filter: `blur(${2 * u}px)`,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: x - core / 2,
					top: y - core / 2,
					width: core,
					height: core,
					borderRadius: '50%',
					background: `radial-gradient(circle, rgba(255, 255, 255, ${i}) 0%, rgba(255, 255, 255, ${0.9 * i}) 15%, rgba(253, 225, 150, ${0.8 * i}) 35%, rgba(253, 225, 150, 0) 70%)`,
				}}
			/>
		</AbsoluteFill>
	);
};

// Fonkelingen rond de diamant (voor en tijdens de flits), verdwijnen bij het uiteenvallen.
const Twinkles: React.FC<{diamond: Box; t: number; u: number}> = ({diamond, t, u}) => (
	<>
		{new Array(TWINKLES).fill(0).map((_, i) => {
			const a = random(`tw-a-${i}`) * Math.PI * 2;
			const r = 0.45 + random(`tw-r-${i}`) * 0.35;
			const x = diamond.cx + Math.cos(a + t * 0.12) * diamond.w * r;
			const y = diamond.cy + Math.sin(a + t * 0.12) * diamond.h * r * 1.1 - t * 6 * u;
			const born = 0.3 + random(`tw-b-${i}`) * 1.6;
			const life = interpolate(t, [born, born + 0.4, 3.0, 3.6], [0, 1, 1, 0], clamp);
			const blink = 0.5 + 0.5 * Math.sin(t * (3 + random(`tw-f-${i}`) * 4) + i);
			const size = (3 + random(`tw-s-${i}`) * 6) * u;
			return <Dot key={i} x={x} y={y} size={size} opacity={0.95 * life * (0.3 + 0.7 * blink)} u={u} />;
		})}
	</>
);

// Vonkjes die op de lijnen van de diamant ontstaan wanneer de veeg langskomt en dan wegzweven.
const Sparks: React.FC<{diamond: Box; t: number; u: number; wipeStart: number; wipeDur: number}> = ({
	diamond,
	t,
	u,
	wipeStart,
	wipeDur,
}) => (
	<>
		{new Array(SPARKS).fill(0).map((_, i) => {
			const e = EDGES[Math.floor(random(`sp-e-${i}`) * EDGES.length)];
			const k = random(`sp-k-${i}`);
			const fx = e[0] + (e[2] - e[0]) * k;
			const fy = e[1] + (e[3] - e[1]) * k;
			const x0 = diamond.cx + (fx - 0.5) * diamond.w;
			const y0 = diamond.cy + (fy - 0.5) * diamond.h;
			// Moment van loskomen volgt de veeg (die loopt van -0,15 naar 1,15 over wipeDur).
			const release = wipeStart + ((fx + 0.15) / 1.3) * wipeDur + random(`sp-d-${i}`) * 0.12;
			const age = t - release;
			const life = 1.0 + random(`sp-l-${i}`) * 0.9;
			if (age < 0 || age > life) return null;
			const dirX = x0 - diamond.cx;
			const dirY = y0 - diamond.cy;
			const len = Math.hypot(dirX, dirY) || 1;
			const speed = (60 + random(`sp-v-${i}`) * 160) * u;
			const ease = 1 - Math.pow(1 - age / life, 2);
			const x = x0 + (dirX / len) * speed * ease * life + Math.sin(age * 3 + i) * 6 * u;
			const y = y0 + (dirY / len) * speed * ease * life - age * 40 * u;
			const opacity = interpolate(age, [0, 0.1, life * 0.5, life], [0, 1, 0.8, 0], clamp);
			const size = (3 + random(`sp-s-${i}`) * 7) * u;
			return <Dot key={i} x={x} y={y} size={size} opacity={opacity} u={u} />;
		})}
	</>
);

const Dot: React.FC<{x: number; y: number; size: number; opacity: number; u: number}> = ({x, y, size, opacity, u}) =>
	opacity <= 0.001 ? null : (
		<div
			style={{
				position: 'absolute',
				left: x - size / 2,
				top: y - size / 2,
				width: size,
				height: size,
				borderRadius: '50%',
				background: C.gold200,
				opacity,
				boxShadow: `0 0 ${size * 2.5}px ${C.gold500}, 0 0 ${4 * u}px ${C.gold300}`,
			}}
		/>
	);
