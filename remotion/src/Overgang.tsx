import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {BEELDMERK, P} from './theme';

// Korte overgang tussen twee quotes, met transparante achtergrond: build.sh legt hem over de
// video, met het midden precies op de knip. Een draaiende diamant schiet met een gouden spoor
// schuin door beeld; op de knip zelf valt een zachte gouden lichtflits die de overgang verbergt.
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const COPIES = 10;
const SPARKS = 70;

export const Overgang: React.FC<{beeldmerk: {w: number; h: number} | null; fps?: number}> = ({beeldmerk}) => {
	const frame = useCurrentFrame();
	const {fps, width, height, durationInFrames} = useVideoConfig();
	const u = Math.min(width, height) / 1080;
	const dur = durationInFrames / fps;
	const t = frame / fps;
	const bm = beeldmerk ?? {w: 834, h: 607};
	const w = 0.34 * Math.min(width, height);
	const h = (w * bm.h) / bm.w;

	// Baan: rechtsboven buiten beeld -> door het midden (op de knip) -> linksonder buiten beeld.
	const pose = (time: number) => {
		const p = Math.min(Math.max(time / dur, 0), 1);
		const e = Easing.inOut(Easing.sin)(p);
		const x = 1.25 * width + (-0.25 * width - 1.25 * width) * e;
		const y = 0.12 * height + (0.88 * height - 0.12 * height) * e;
		const scale = 0.7 + 0.5 * Math.sin(Math.PI * p);
		return {x, y, scale, rotY: 900 * p, tilt: 18 - 36 * p, p};
	};
	const tf = (q: ReturnType<typeof pose>) =>
		`translate(${q.x - w / 2}px, ${q.y - h / 2}px) perspective(${1400 * u}px) rotateY(${q.rotY}deg) rotateZ(${q.tilt}deg) scale(${q.scale})`;
	const now = pose(t);

	// Lichtflits gecentreerd op de knip (het midden van de overgang).
	const flash = interpolate(t, [dur * 0.32, dur * 0.5, dur * 0.72], [0, 1, 0], {...clamp, easing: Easing.inOut(Easing.quad)});
	const glowStyle = `drop-shadow(0 0 ${8 * u}px rgba(${P.fxHi}, 0.9)) drop-shadow(0 0 ${26 * u}px rgba(${P.fxMid}, 0.7))`;

	return (
		<AbsoluteFill style={{backgroundColor: 'transparent'}}>
			{/* zachte flits over het hele beeld, zodat de knip eronder wegvalt */}
			<AbsoluteFill
				style={{
					background: `radial-gradient(ellipse 75% 65% at 50% 50%, rgba(255, 255, 255, ${0.75 * flash}) 0%, rgba(${P.fxHi}, ${0.65 * flash}) 35%, rgba(${P.fxMid}, ${0.35 * flash}) 70%, rgba(${P.fxMid}, ${0.15 * flash}) 100%)`,
				}}
			/>
			{/* lichtstreep langs de baan */}
			<div
				style={{
					position: 'absolute',
					left: now.x - width,
					top: now.y - 6 * u,
					width: width * 2,
					height: 12 * u,
					transform: `rotate(${(Math.atan2(0.76 * height, -1.5 * width) * 180) / Math.PI + 180}deg)`,
					background: `linear-gradient(to right, rgba(${P.fxHi}, 0) 0%, rgba(${P.fxHi}, ${0.85 * Math.sin(Math.PI * now.p)}) 50%, rgba(${P.fxHi}, 0) 100%)`,
					filter: `blur(${3 * u}px)`,
					mixBlendMode: 'screen',
				}}
			/>
			{new Array(SPARKS).fill(0).map((_, i) => {
				const born = random(`og-b-${i}`) * dur * 0.9;
				const age = t - born;
				const life = 0.35 + random(`og-l-${i}`) * 0.45;
				if (age < 0 || age > life) return null;
				const q = pose(born);
				const x = q.x + (random(`og-x-${i}`) - 0.5) * w * 0.5 + (random(`og-dx-${i}`) - 0.5) * 120 * u * age;
				const y = q.y + (random(`og-y-${i}`) - 0.5) * h * 0.5 + 60 * u * age;
				const size = (3 + random(`og-s-${i}`) * 6) * u;
				const opacity = interpolate(age, [0, 0.06, life], [0, 1, 0], clamp);
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: x - size / 2,
							top: y - size / 2,
							width: size,
							height: size,
							borderRadius: '50%',
							background: P.dot,
							opacity,
							boxShadow: `0 0 ${size * 2.5}px ${P.dotGlow}, 0 0 ${4 * u}px ${P.dotGlow2}`,
						}}
					/>
				);
			})}
			{new Array(COPIES).fill(0).map((_, i) => {
				const k = COPIES - i;
				const tt = t - k * 0.025;
				if (tt <= 0) return null;
				const fall = 1 - k / (COPIES + 1);
				return (
					<Img
						key={`c${k}`}
						src={staticFile(BEELDMERK)}
						style={{
							position: 'absolute',
							left: 0,
							top: 0,
							width: w,
							height: h,
							objectFit: 'contain',
							opacity: 0.25 * fall,
							transform: tf(pose(tt)),
							filter: `blur(${(1 - fall) * 6 * u}px)`,
						}}
					/>
				);
			})}
			<Img
				src={staticFile(BEELDMERK)}
				style={{
					position: 'absolute',
					left: 0,
					top: 0,
					width: w,
					height: h,
					objectFit: 'contain',
					transform: tf(now),
					filter: glowStyle,
				}}
			/>
			{/* heldere kern van de flits op de diamant */}
			<div
				style={{
					position: 'absolute',
					left: now.x - 160 * u,
					top: now.y - 160 * u,
					width: 320 * u,
					height: 320 * u,
					borderRadius: '50%',
					background: `radial-gradient(circle, rgba(255, 255, 255, ${flash}) 0%, rgba(${P.fxHi}, ${0.6 * flash}) 35%, rgba(${P.fxHi}, 0) 70%)`,
					mixBlendMode: 'screen',
				}}
			/>
		</AbsoluteFill>
	);
};
