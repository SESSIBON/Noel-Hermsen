import React from 'react';
import {AbsoluteFill, Img, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C} from './theme';

// Rustige achtergrondloop voor het scherm op de awardavond (naar Motion_TVL_V2): de gouden diamant
// staat de hele tijd in het midden, er strijkt langzaam licht langs de rand en goudstof zweeft rond.
// Alles is periodiek in de duur van de compositie: het laatste frame loopt naadloos over in het eerste.
const BM = {w: 834, h: 607};
const GIRDLE = 0.31; // hoogte (fractie) van de horizontale lijn in de diamant waarlangs de flare loopt
const SPARKS = 110;
const GLOED_W = 1382;
const GLOED_PAD = 320;
const DUST = 20;
const TAU = Math.PI * 2;
const frac = (x: number) => x - Math.floor(x);
const rgba = (hex: string, a: number) =>
	`rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')}, ${a})`;
// Zachte puls 0..1 binnen [a, b] van de loopfase (0 buiten dat venster).
const bump = (p: number, a: number, b: number) => (p <= a || p >= b ? 0 : Math.sin(Math.PI * ((p - a) / (b - a))) ** 2);

export const Loop: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height, durationInFrames} = useVideoConfig();
	const u = Math.min(width, height) / 1080;
	const p = frame / durationInFrames; // loopfase 0..1
	const breathe = 0.5 - 0.5 * Math.cos(TAU * p); // 0 aan begin/eind, 1 halverwege

	const w = 0.36 * width;
	const h = (w * BM.h) / BM.w;
	const cx = width / 2;
	const cy = height / 2 + Math.sin(TAU * p) * 6 * u;
	const left = cx - w / 2;
	const top = cy - h / 2;

	// Twee langzame flares langs de rand: heen (links -> rechts) en terug.
	const passes = [
		{a: 0.12, b: 0.42, dir: 1},
		{a: 0.6, b: 0.9, dir: -1},
	];
	const flares = passes.map(({a, b, dir}) => {
		const q = Math.min(Math.max((p - a) / (b - a), 0), 1);
		const e = q * q * (3 - 2 * q);
		const along = dir > 0 ? e : 1 - e;
		return {x: left + w * (0.03 + 0.94 * along), y: top + h * GIRDLE, k: bump(p, a, b), q};
	});
	const lit = Math.max(...flares.map((f) => f.k));
	const glow = 0.8 + 0.3 * breathe + 0.5 * lit;
	const mask = `url(${staticFile('beeldmerk-goud.png')}) center / contain no-repeat`;

	return (
		<AbsoluteFill style={{background: `linear-gradient(to bottom right, ${C.navy950} 0%, ${C.navy900} 50%, ${C.navy700} 100%)`}}>
			{/* zachte lichtwolk achter de diamant, ademt mee */}
			<AbsoluteFill
				style={{
					background: `radial-gradient(ellipse 42% 48% at 50% 45%, ${rgba(C.navy700, 0.55 + 0.25 * breathe)} 0%, ${rgba(C.navy900, 0)} 100%)`,
				}}
			/>
			<AbsoluteFill
				style={{background: `radial-gradient(ellipse 85% 80% at 50% 48%, ${rgba(C.navy950, 0)} 50%, ${rgba(C.navy950, 0.6)} 100%)`}}
			/>
			{/* goudstof op de achtergrond: zweeft omhoog, een geheel aantal rondes per loop */}
			{new Array(DUST).fill(0).map((_, i) => {
				const laps = 1 + Math.floor(random(`ld-n-${i}`) * 2);
				const y = (frac(random(`ld-y-${i}`) - laps * p) * 1.1 - 0.05) * height;
				const x = random(`ld-x-${i}`) * width + Math.sin(TAU * (p + random(`ld-ph-${i}`))) * 30 * u;
				const size = (2 + random(`ld-r-${i}`) * 3) * u;
				const o = (0.06 + random(`ld-o-${i}`) * 0.14) * (0.75 + 0.25 * Math.sin(TAU * (3 * p + random(`ld-t-${i}`))));
				return (
					<div
						key={`d${i}`}
						style={{position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%', background: C.gold300, opacity: o, boxShadow: `0 0 ${size * 3}px ${C.gold300}`}}
					/>
				);
			})}
			{/* gouden gloed: vooraf geblurde versie van de diamant (assets/loop-gloed.png, 1382 px diamant + 320 px rand),
			    veel sneller dan een drop-shadow per frame in 4K */}
			<Img
				src={staticFile('loop-gloed.png')}
				style={{
					position: 'absolute',
					left: left - GLOED_PAD * (w / GLOED_W),
					top: top - GLOED_PAD * (w / GLOED_W),
					width: w + 2 * GLOED_PAD * (w / GLOED_W),
					opacity: Math.min(1, glow / 1.6),
				}}
			/>
			<Img src={staticFile('beeldmerk-goud.png')} style={{position: 'absolute', left, top, width: w, height: h}} />
			{/* glans over de lijnen, gemaskeerd met de PNG zelf, volgt de flare */}
			{flares.map((f, i) =>
				f.k > 0 ? (
					<div
						key={`s${i}`}
						style={{
							position: 'absolute',
							left,
							top,
							width: w,
							height: h,
							WebkitMask: mask,
							mask,
							mixBlendMode: 'screen',
							opacity: f.k,
							background: `radial-gradient(circle at ${((f.x - left) / w) * 100}% ${GIRDLE * 100}%, ${rgba(C.white, 0.95)} 0%, ${rgba(C.gold200, 0.8)} 12%, ${rgba(C.gold300, 0)} 45%)`,
						}}
					/>
				) : null,
			)}
			{/* flare: lichtpunt, horizontale streep en vier zachte stralen */}
			{flares.map((f, i) =>
				f.k > 0 ? (
					<React.Fragment key={`f${i}`}>
						<div
							style={{
								position: 'absolute',
								left: f.x - width,
								top: f.y - 4 * u,
								width: width * 2,
								height: 8 * u,
								background: `linear-gradient(to right, ${rgba(C.gold300, 0)} 0%, ${rgba(C.gold200, 0.7 * f.k)} 50%, ${rgba(C.gold300, 0)} 100%)`,
								filter: `blur(${2 * u}px)`,
								mixBlendMode: 'screen',
							}}
						/>
						{[0, 90, 45, 135].map((deg, j) => (
							<div
								key={deg}
								style={{
									position: 'absolute',
									left: f.x - (j < 2 ? 260 : 120) * u,
									top: f.y - 1.5 * u,
									width: (j < 2 ? 520 : 240) * u,
									height: 3 * u,
									transform: `rotate(${deg + 12 * f.q}deg)`,
									background: `linear-gradient(to right, ${rgba(C.white, 0)} 0%, ${rgba(C.white, (j < 2 ? 0.7 : 0.35) * f.k)} 50%, ${rgba(C.white, 0)} 100%)`,
									mixBlendMode: 'screen',
								}}
							/>
						))}
						<div
							style={{
								position: 'absolute',
								left: f.x - 320 * u,
								top: f.y - 320 * u,
								width: 640 * u,
								height: 640 * u,
								borderRadius: '50%',
								background: `radial-gradient(circle, ${rgba(C.white, f.k)} 0%, ${rgba(C.gold200, 0.7 * f.k)} 10%, ${rgba(C.gold500, 0.25 * f.k)} 35%, ${rgba(C.gold500, 0)} 70%)`,
								mixBlendMode: 'screen',
							}}
						/>
					</React.Fragment>
				) : null,
			)}
			{/* vonkjes rond de diamant: elk een geheel aantal levens per loop */}
			{new Array(SPARKS).fill(0).map((_, i) => {
				const lives = 2 + Math.floor(random(`ls-n-${i}`) * 3);
				const age = frac(lives * p + random(`ls-o-${i}`));
				const life = Math.floor(lives * p + random(`ls-o-${i}`)) % lives;
				const a = random(`ls-a-${i}-${life}`) * TAU;
				const r0 = 0.5 + random(`ls-r-${i}-${life}`) * 0.25;
				const x = cx + Math.cos(a) * w * r0 * (1 + 0.25 * age);
				const y = cy + Math.sin(a) * h * r0 * 0.9 - 50 * u * age;
				const size = (3 + random(`ls-s-${i}`) * 6) * u;
				const o = Math.sin(Math.PI * age) ** 2 * (0.45 + 0.55 * random(`ls-b-${i}`));
				return (
					<div
						key={`p${i}`}
						style={{position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: '50%', background: C.gold200, opacity: o, boxShadow: `0 0 ${size * 2.5}px ${C.gold500}`}}
					/>
				);
			})}
		</AbsoluteFill>
	);
};
