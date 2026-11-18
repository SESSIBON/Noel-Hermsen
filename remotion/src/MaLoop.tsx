import React from 'react';
import {AbsoluteFill, Img, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

// Maastricht Awards: achtergrondloop voor de finalepresentatie, één per categorie.
// Centraal het schild in de lichte categorietint met de rode ster, dat rustig zweeft; eromheen
// vlakke glitters (stipjes en kleine schittersterretjes in wit en de lichte tint) die opstijgen
// en twinkelen, af en toe een schittering op het schild en eenmaal per loop een lichtstreek erover.
// Huisstijl: vlak, geen verlopen of schaduwen. Alles is periodiek: naadloze loop.
export type MaCategorie = 'takeoff' | 'hospitality' | 'made' | 'algemeen';

const KLEUREN: Record<MaCategorie, {grond: string; tint: string; ster: string}> = {
	takeoff: {grond: '#3022ef', tint: '#a1c6f2', ster: 'ster-lichtrood.svg'},
	hospitality: {grond: '#7224b0', tint: '#dc9efd', ster: 'ster-lichtrood.svg'},
	made: {grond: '#6b966f', tint: '#d3ff9b', ster: 'ster-lichtrood.svg'},
	// Campagne-opbouw: rood schild op zwart met een witte ster.
	algemeen: {grond: '#000000', tint: '#e4163b', ster: 'ster-wit.svg'},
};

const TAU = Math.PI * 2;
const GLITTER = 110;
const BURST = 46; // glitters per uitbarsting achter het schild vandaan
const BURSTS = [0.12, 0.62]; // momenten in de loop
const frac = (x: number) => x - Math.floor(x);

// Vlakke schittering: vier smalle punten (een ruit-kruis), geen gloed.
const Glint: React.FC<{x: number; y: number; size: number; color: string; opacity: number; rot?: number}> = ({x, y, size, color, opacity, rot = 0}) => (
	<svg
		width={size}
		height={size}
		viewBox="-10 -10 20 20"
		style={{position: 'absolute', left: x - size / 2, top: y - size / 2, opacity, transform: `rotate(${rot}deg)`}}
	>
		<path d="M0,-10 L1.6,-1.6 L10,0 L1.6,1.6 L0,10 L-1.6,1.6 L-10,0 L-1.6,-1.6 Z" fill={color} />
	</svg>
);

export const MaLoop: React.FC<{categorie: MaCategorie}> = ({categorie}) => {
	const frame = useCurrentFrame();
	const {width, height, durationInFrames} = useVideoConfig();
	const p = frame / durationInFrames; // loopfase 0..1
	const k = KLEUREN[categorie];
	const u = height / 1080;

	// Schild centraal, zweeft rustig op en neer en ademt licht.
	const sw = 560 * u;
	const cx = width / 2;
	const cy = height * 0.44 + Math.sin(TAU * p * 2) * 10 * u;
	const breathe = 1 + 0.02 * Math.sin(TAU * p * 2 + 1);
	const left = cx - sw / 2;
	const top = cy - sw / 2;
	// Ster wiegt om zijn eigen middelpunt (niet exact symmetrisch, dus geen hele draai).
	const sterRot = 8 * Math.sin(TAU * p * 2);
	const sterW = 0.62 * sw;
	const schildMask = `url(${staticFile('ma/schild-wit.svg')}) center / contain no-repeat`;

	// Lichtstreek: een vlakke, schuine witte strook die eenmaal per loop over het schild schuift.
	const sq = Math.min(Math.max((p - 0.3) / 0.12, 0), 1);
	const streek = -40 + sq * 180; // procent van de schildbreedte

	// Schitteringen op het schild: kort oplichtend op vaste plekken (tip van de ster, hoeken).
	const glints = [
		{t: 0.08, x: 0.5, y: 0.2},
		{t: 0.36, x: 0.86, y: 0.06},
		{t: 0.58, x: 0.18, y: 0.72},
		{t: 0.82, x: 0.78, y: 0.52},
	];

	return (
		<AbsoluteFill style={{background: k.grond, overflow: 'hidden'}}>
			{/* glitters: opstijgend en twinkelend, elk een geheel aantal rondes per loop */}
			{new Array(GLITTER).fill(0).map((_, i) => {
				const laps = 1 + Math.floor(random(`mg-n-${i}`) * 3);
				const ring = 0.25 + random(`mg-r-${i}`) * 0.75; // hoe ver van het midden
				const side = random(`mg-s-${i}`) < 0.5 ? -1 : 1;
				const x = cx + side * (sw * 0.55 + ring * (width / 2 - sw * 0.55)) + Math.sin(TAU * (laps * p + random(`mg-w-${i}`))) * 20 * u;
				const y = (frac(random(`mg-y-${i}`) - laps * p) * 1.2 - 0.1) * height;
				const twinkle = 0.5 + 0.5 * Math.sin(TAU * (laps * 4 * p + random(`mg-t-${i}`)));
				const isGlint = random(`mg-g-${i}`) < 0.3;
				const color = random(`mg-c-${i}`) < 0.55 ? '#ffffff' : k.tint;
				const o = (0.45 + 0.55 * random(`mg-o-${i}`)) * twinkle;
				if (isGlint) {
					const size = (26 + random(`mg-z-${i}`) * 38) * u * (0.6 + 0.4 * twinkle);
					return <Glint key={i} x={x} y={y} size={size} color={color} opacity={o} rot={45 * twinkle} />;
				}
				const size = (6 + random(`mg-z-${i}`) * 10) * u;
				return (
					<div
						key={i}
						style={{position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: '50%', background: color, opacity: o}}
					/>
				);
			})}
			{/* uitbarsting: glitters schieten achter het schild vandaan naar buiten, remmen af en doven */}
			{BURSTS.map((bt, bi) =>
				new Array(BURST).fill(0).map((_, i) => {
					const life = 0.07 + random(`mb-l-${bi}-${i}`) * 0.05;
					const age = (p - bt - random(`mb-d-${bi}-${i}`) * 0.015) / life;
					if (age < 0 || age > 1) return null;
					const a = random(`mb-a-${bi}-${i}`) * TAU;
					const dist = (380 + random(`mb-v-${bi}-${i}`) * 520) * u * (1 - (1 - age) ** 3);
					const x = cx + Math.cos(a) * dist;
					const y = cy + Math.sin(a) * dist * 0.8 + 60 * u * age * age;
					const o = Math.min(1, age * 6) * (1 - age) ** 1.3;
					const color = random(`mb-c-${bi}-${i}`) < 0.5 ? '#ffffff' : k.tint;
					if (random(`mb-g-${bi}-${i}`) < 0.35) {
						const size = (30 + random(`mb-z-${bi}-${i}`) * 40) * u;
						return <Glint key={`b${bi}-${i}`} x={x} y={y} size={size} color={color} opacity={o} rot={120 * age} />;
					}
					const size = (8 + random(`mb-z-${bi}-${i}`) * 12) * u;
					return (
						<div
							key={`b${bi}-${i}`}
							style={{position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: '50%', background: color, opacity: o}}
						/>
					);
				}),
			)}
			<div style={{position: 'absolute', left, top, width: sw, height: sw, transform: `scale(${breathe})`}}>
				<div style={{position: 'absolute', inset: 0, background: k.tint, WebkitMask: schildMask, mask: schildMask}} />
				<Img
					src={staticFile(`ma/${k.ster}`)}
					style={{
						position: 'absolute',
						left: (sw - sterW) / 2 + 14 * u,
						top: sw * 0.17,
						width: sterW,
						height: sterW,
						transform: `rotate(${sterRot}deg)`,
						transformOrigin: '50.6% 51.7%', // middelpunt van de ster in ster-*.svg
					}}
				/>
				{sq > 0 && sq < 1 ? (
					<div
						style={{
							position: 'absolute',
							inset: 0,
							WebkitMask: schildMask,
							mask: schildMask,
							overflow: 'hidden',
						}}
					>
						<div
							style={{
								position: 'absolute',
								left: `${streek}%`,
								top: '-20%',
								width: '14%',
								height: '140%',
								background: 'rgba(255, 255, 255, 0.45)',
								transform: 'rotate(20deg)',
							}}
						/>
					</div>
				) : null}
				{glints.map((g, i) => {
					const age = (p - g.t) / 0.05;
					if (age < 0 || age > 1) return null;
					const s = Math.sin(Math.PI * age);
					return <Glint key={`g${i}`} x={g.x * sw} y={g.y * sw} size={70 * u * s} color="#ffffff" opacity={s} rot={90 * age} />;
				})}
			</div>
			<Img
				src={staticFile('ma/logo-wit-lichtrood.svg')}
				style={{position: 'absolute', left: cx - 280 * u, top: height * 0.44 + sw / 2 + 70 * u, width: 560 * u}}
			/>
		</AbsoluteFill>
	);
};
