import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

// Maastricht Awards: achtergrondloop voor de finalepresentatie, één per categorie.
// Centraal het schild in de lichte categorietint, dat rustig zweeft, met in het midden de rode ster
// die continu ronddraait. Af en toe licht een punt van de ster op en twee keer per loop schuift er
// een lichtstreek over het schild.
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
// De vijf punten van de ster, als fractie van ster-*.svg (viewBox 500).
const PUNTEN: [number, number][] = [
	[0.44, 0.07],
	[0.9, 0.29],
	[0.84, 0.83],
	[0.33, 0.91],
	[0.07, 0.4],
];

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
	// Ster draait continu: twee hele rondes per loop, dus het laatste frame sluit aan op het eerste.
	const sterRot = 720 * p;
	const sterW = 0.58 * sw;
	const schildMask = `url(${staticFile('ma/schild-wit.svg')}) center / contain no-repeat`;

	// Lichtstreek: een vlakke, schuine witte strook die twee keer per loop over het schild schuift.
	const sp = p < 0.5 ? p : p - 0.5;
	const sq = Math.min(Math.max((sp - 0.2) / 0.1, 0), 1);
	const streek = -40 + sq * 180; // procent van de schildbreedte

	// Lichtpuntjes: lichten kort op een punt van de ster op.
	const glints = [
		{t: 0.05, punt: 0},
		{t: 0.21, punt: 2},
		{t: 0.38, punt: 4},
		{t: 0.55, punt: 1},
		{t: 0.71, punt: 3},
		{t: 0.88, punt: 0},
	];

	return (
		<AbsoluteFill style={{background: k.grond, overflow: 'hidden'}}>
			<div style={{position: 'absolute', left, top, width: sw, height: sw, transform: `scale(${breathe})`}}>
				<div style={{position: 'absolute', inset: 0, background: k.tint, WebkitMask: schildMask, mask: schildMask}} />
				{/* ster in het midden van het schild, draait continu rond zijn eigen middelpunt; de lichtpuntjes
				    zitten op de punten van de ster en draaien mee */}
				<div
					style={{
						position: 'absolute',
						left: sw * 0.491 - sterW * 0.506,
						top: sw * 0.47 - sterW * 0.517,
						width: sterW,
						height: sterW,
						transform: `rotate(${sterRot}deg)`,
						transformOrigin: '50.6% 51.7%', // middelpunt van de ster in ster-*.svg
					}}
				>
					<Img src={staticFile(`ma/${k.ster}`)} style={{position: 'absolute', inset: 0, width: sterW, height: sterW}} />
					{glints.map((g, i) => {
						const age = (p - g.t) / 0.045;
						if (age < 0 || age > 1) return null;
						const s = Math.sin(Math.PI * age);
						const [tx, ty] = PUNTEN[g.punt];
						return <Glint key={`g${i}`} x={tx * sterW} y={ty * sterW} size={130 * u * s} color="#ffffff" opacity={s} rot={-sterRot + 90 * age} />;
					})}
				</div>
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
			</div>
			<Img
				src={staticFile('ma/logo-wit-lichtrood.svg')}
				style={{position: 'absolute', left: cx - 280 * u, top: height * 0.44 + sw / 2 + 70 * u, width: 560 * u}}
			/>
		</AbsoluteFill>
	);
};
