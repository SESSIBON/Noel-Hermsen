import React from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {C} from './theme';

// Achtergrondloop voor het scherm op de awardavond (naar Motion_TVL_V2): een gouden draadmodel-diamant
// (briljant: tafel, kroon, rondist, paviljoen) draait rustig rond op het nachtverloop, met wat vonkjes.
// De diamant heeft 8-voudige symmetrie; per loop draait hij 90 graden, dus het laatste frame sluit
// naadloos aan op het eerste.
const N = 8;
const TAU = Math.PI * 2;
const TURN = Math.PI / 2; // rotatie per loop
const TILT = -0.14; // camera iets boven de diamant (rad)
const SPARKS = 80;
const frac = (x: number) => x - Math.floor(x);
const rgba = (hex: string, a: number) =>
	`rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')}, ${a})`;

type V = [number, number, number];
const ring = (r: number, y: number, off: number): V[] =>
	new Array(N).fill(0).map((_, i) => {
		const a = (i / N) * TAU + off;
		return [r * Math.cos(a), y, r * Math.sin(a)];
	});
const TABLE = ring(0.66, -0.3, Math.PI / N);
const GIRDLE_T = ring(1, 0, 0);
const GIRDLE_B = ring(1, 0.07, 0);
const CULET: V = [0, 0.92, 0];
const EDGES: [V, V][] = [];
for (let i = 0; i < N; i++) {
	const j = (i + 1) % N;
	EDGES.push([TABLE[i], TABLE[j]]); // tafel
	EDGES.push([TABLE[i], GIRDLE_T[i]], [TABLE[i], GIRDLE_T[j]]); // kroon
	EDGES.push([GIRDLE_T[i], GIRDLE_T[j]], [GIRDLE_B[i], GIRDLE_B[j]], [GIRDLE_T[i], GIRDLE_B[i]]); // rondist
	EDGES.push([GIRDLE_B[i], CULET]); // paviljoen
}

export const Draailoop: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height, durationInFrames} = useVideoConfig();
	const u = Math.min(width, height) / 1080;
	const p = frame / durationInFrames;
	const rot = TURN * p;
	const S = 360 * u; // straal rondist in px
	const cx = width / 2;
	const cy = height * 0.43;
	const cam = 4.2; // afstand camera in diamant-eenheden

	const project = ([x, y, z]: V) => {
		const xr = x * Math.cos(rot) - z * Math.sin(rot);
		const zr = x * Math.sin(rot) + z * Math.cos(rot);
		const yt = y * Math.cos(TILT) - zr * Math.sin(TILT);
		const zt = y * Math.sin(TILT) + zr * Math.cos(TILT);
		const k = cam / (cam + zt);
		return {x: cx + xr * S * k, y: cy + yt * S * k, z: zt};
	};
	const lines = EDGES.map(([a, b]) => {
		const A = project(a);
		const B = project(b);
		return {A, B, z: (A.z + B.z) / 2};
	}).sort((l1, l2) => l2.z - l1.z); // achterste lijnen eerst
	const shade = (z: number) => 0.55 + 0.45 * Math.min(Math.max((1 - z) / 2, 0), 1); // voor helderder dan achter
	const pulse = 0.85 + 0.15 * Math.sin(TAU * 2 * p);

	return (
		<AbsoluteFill style={{background: `linear-gradient(to bottom right, ${C.navy950} 0%, ${C.navy900} 50%, ${C.navy700} 100%)`}}>
			{/* zacht spotlicht achter de diamant, zoals in de motion */}
			<AbsoluteFill
				style={{background: `radial-gradient(ellipse 38% 55% at 50% 40%, ${rgba(C.navy700, 0.7)} 0%, ${rgba(C.navy900, 0)} 100%)`}}
			/>
			<AbsoluteFill style={{background: `radial-gradient(ellipse 80% 80% at 50% 45%, ${rgba(C.navy950, 0)} 55%, ${rgba(C.navy950, 0.65)} 100%)`}} />
			<svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
				<defs>
					<filter id="gloed" x="-50%" y="-50%" width="200%" height="200%">
						<feGaussianBlur stdDeviation={14 * u} />
					</filter>
				</defs>
				{/* gloed */}
				<g filter="url(#gloed)" opacity={0.95 * pulse}>
					{lines.map((l, i) => (
						<line key={i} x1={l.A.x} y1={l.A.y} x2={l.B.x} y2={l.B.y} stroke={C.gold500} strokeWidth={20 * u} strokeLinecap="round" />
					))}
				</g>
				{/* gouden staafjes: donkere rand, goud, lichte kern */}
				{lines.map((l, i) => {
					const o = shade(l.z);
					return (
						<g key={i} opacity={o}>
							<line x1={l.A.x} y1={l.A.y} x2={l.B.x} y2={l.B.y} stroke={C.gold700} strokeWidth={11 * u} strokeLinecap="round" />
							<line x1={l.A.x} y1={l.A.y} x2={l.B.x} y2={l.B.y} stroke={C.gold500} strokeWidth={8 * u} strokeLinecap="round" />
							<line x1={l.A.x} y1={l.A.y} x2={l.B.x} y2={l.B.y} stroke={C.gold200} strokeWidth={3 * u} strokeLinecap="round" />
						</g>
					);
				})}
			</svg>
			{/* vonkjes: elk een geheel aantal levens per loop, dus ook naadloos */}
			{new Array(SPARKS).fill(0).map((_, i) => {
				const lives = 3 + Math.floor(random(`dl-n-${i}`) * 4);
				const age = frac(lives * p + random(`dl-o-${i}`));
				const life = Math.floor(lives * p + random(`dl-o-${i}`)) % lives;
				const a = random(`dl-a-${i}-${life}`) * TAU;
				const r0 = 0.75 + random(`dl-r-${i}-${life}`) * 0.6;
				const x = cx + Math.cos(a) * S * r0 * (1 + 0.2 * age);
				const y = cy + 0.2 * S + Math.sin(a) * S * 0.75 * r0 - 60 * u * age;
				const size = (3 + random(`dl-s-${i}`) * 6) * u;
				const o = Math.sin(Math.PI * age) ** 2 * (0.4 + 0.6 * random(`dl-b-${i}`));
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
