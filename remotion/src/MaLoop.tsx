import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

// Maastricht Awards: minimalistische achtergrondloop voor de finalepresentatie, één per categorie.
// Huisstijl: recht en vlak, geen verlopen of schaduwen. Een groot schild in de lichte categorietint
// loopt links buiten beeld, met de rode ster erin; een schuine band in de lichte tint schuift één keer
// per loop rustig door beeld; wit logo rechtsonder. Alles is periodiek: naadloze loop.
export type MaCategorie = 'takeoff' | 'hospitality' | 'made' | 'algemeen';

const KLEUREN: Record<MaCategorie, {grond: string; tint: string; ster: string}> = {
	takeoff: {grond: '#3022ef', tint: '#a1c6f2', ster: 'ster-lichtrood.svg'},
	hospitality: {grond: '#7224b0', tint: '#dc9efd', ster: 'ster-lichtrood.svg'},
	made: {grond: '#6b966f', tint: '#d3ff9b', ster: 'ster-lichtrood.svg'},
	// Campagne-opbouw: rood schild op zwart met een uitgespaarde witte ster.
	algemeen: {grond: '#000000', tint: '#e4163b', ster: 'ster-wit.svg'},
};

const TAU = Math.PI * 2;
// Ease in-out voor de band: rustig binnen, rustig weg.
const smooth = (x: number) => x * x * (3 - 2 * x);

export const MaLoop: React.FC<{categorie: MaCategorie}> = ({categorie}) => {
	const frame = useCurrentFrame();
	const {width, height, durationInFrames} = useVideoConfig();
	const p = frame / durationInFrames; // loopfase 0..1
	const k = KLEUREN[categorie];
	const u = height / 1080;

	// Schild: groot, links half buiten beeld, ademt heel licht.
	const sw = 1180 * u;
	const breathe = 1 + 0.015 * Math.sin(TAU * p);
	const sx = -360 * u;
	const sy = -330 * u;
	// Ster: 5-voudig symmetrisch, dus 72 graden per loop sluit naadloos aan.
	const sterRot = 72 * p;
	const sterW = 0.62 * sw;

	// Schuine band (-4 graden, zoals op de categorie-introslides): schuift van rechts naar links door
	// beeld tussen 15% en 75% van de loop; daarbuiten staat hij buiten beeld.
	const bq = Math.min(Math.max((p - 0.15) / 0.6, 0), 1);
	const bandX = width + 200 * u - smooth(bq) * (width * 2 + 800 * u);

	return (
		<AbsoluteFill style={{background: k.grond, overflow: 'hidden'}}>
			<div
				style={{
					position: 'absolute',
					left: bandX,
					top: 760 * u,
					width: width + 400 * u,
					height: 56 * u,
					background: k.tint,
					transform: 'rotate(-4deg)',
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: sx,
					top: sy,
					width: sw,
					height: sw,
					transform: `scale(${breathe})`,
					transformOrigin: '60% 40%',
				}}
			>
				{/* het schild als masker over een vlak in de lichte tint (vorm uit schild-wit.svg) */}
				<div
					style={{
						position: 'absolute',
						inset: 0,
						background: k.tint,
						WebkitMask: `url(${staticFile('ma/schild-wit.svg')}) center / contain no-repeat`,
						mask: `url(${staticFile('ma/schild-wit.svg')}) center / contain no-repeat`,
					}}
				/>
				<Img
					src={staticFile(`ma/${k.ster}`)}
					style={{
						position: 'absolute',
						left: (sw - sterW) / 2 + 30 * u,
						top: sw * 0.22,
						width: sterW,
						height: sterW,
						transform: `rotate(${sterRot}deg)`,
					}}
				/>
			</div>
			<Img
				src={staticFile('ma/logo-wit-lichtrood.svg')}
				style={{position: 'absolute', right: 128 * u, bottom: 96 * u, width: 520 * u}}
			/>
		</AbsoluteFill>
	);
};
