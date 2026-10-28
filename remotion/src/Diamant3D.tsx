import React, {useEffect, useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {C} from './theme';

// Realistische versie van de draaiende diamant (naar Motion_TVL_V2): draadmodel van glanzend
// metaalgoud in 3D, belicht met een omgevingskaart, met gloed en vonkjes op het nachtverloop.
// Per loop draait hij 90 graden (8-voudige symmetrie), dus de loop sluit naadloos.
const N = 8;
const TAU = Math.PI * 2;
const TURN = Math.PI / 2;
const SPARKS = 90;
const frac = (x: number) => x - Math.floor(x);
const rgba = (hex: string, a: number) =>
	`rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')}, ${a})`;

const ring = (r: number, y: number, off: number) =>
	new Array(N).fill(0).map((_, i) => {
		const a = (i / N) * TAU + off;
		return new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a));
	});
const TABLE = ring(0.66, 0.3, Math.PI / N);
const GIRDLE_T = ring(1, 0, 0);
const GIRDLE_B = ring(1, -0.07, 0);
const CULET = new THREE.Vector3(0, -0.92, 0);
const EDGES: [THREE.Vector3, THREE.Vector3][] = [];
for (let i = 0; i < N; i++) {
	const j = (i + 1) % N;
	EDGES.push([TABLE[i], TABLE[j]], [TABLE[i], GIRDLE_T[i]], [TABLE[i], GIRDLE_T[j]]);
	EDGES.push([GIRDLE_T[i], GIRDLE_T[j]], [GIRDLE_B[i], GIRDLE_B[j]], [GIRDLE_T[i], GIRDLE_B[i]]);
	EDGES.push([GIRDLE_B[i], CULET]);
}
const VERTS = [...TABLE, ...GIRDLE_T, ...GIRDLE_B, CULET];
const R = 0.02; // dikte van de staafjes

const Omgeving: React.FC = () => {
	const {gl, scene} = useThree();
	useEffect(() => {
		const pmrem = new THREE.PMREMGenerator(gl);
		const env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
		scene.environment = env;
		return () => env.dispose();
	}, [gl, scene]);
	return null;
};

const Draadmodel: React.FC<{rot: number}> = ({rot}) => {
	const mat = useMemo(
		() =>
			new THREE.MeshStandardMaterial({
				color: new THREE.Color('#ffd889'),
				metalness: 1,
				roughness: 0.28,
				emissive: new THREE.Color('#d08a32'),
				emissiveIntensity: 0.85,
				envMapIntensity: 2.2,
			}),
		[],
	);
	const staven = useMemo(
		() =>
			EDGES.map(([a, b]) => {
				const len = a.distanceTo(b);
				const mid = a.clone().add(b).multiplyScalar(0.5);
				const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
				return {len, mid, q};
			}),
		[],
	);
	return (
		<group rotation={[0.07, rot, 0]}>
			{staven.map((s, i) => (
				<mesh key={i} position={s.mid} quaternion={s.q} material={mat}>
					<cylinderGeometry args={[R, R, s.len, 20, 1]} />
				</mesh>
			))}
			{VERTS.map((v, i) => (
				<mesh key={`v${i}`} position={v} material={mat}>
					<sphereGeometry args={[R * 1.05, 20, 14]} />
				</mesh>
			))}
		</group>
	);
};

export const Diamant3D: React.FC = () => {
	const frame = useCurrentFrame();
	const {width, height, durationInFrames} = useVideoConfig();
	const u = Math.min(width, height) / 1080;
	const p = frame / durationInFrames;
	const rot = TURN * p;
	const cx = width / 2;
	const cy = height * 0.45;
	const S = 360 * u;
	const pulse = 0.85 + 0.15 * Math.sin(TAU * 2 * p);

	return (
		<AbsoluteFill style={{background: `linear-gradient(to bottom right, ${C.navy950} 0%, ${C.navy900} 50%, ${C.navy700} 100%)`}}>
			<AbsoluteFill style={{background: `radial-gradient(ellipse 38% 55% at 50% 42%, ${rgba(C.navy700, 0.75)} 0%, ${rgba(C.navy900, 0)} 100%)`}} />
			<AbsoluteFill style={{background: `radial-gradient(ellipse 80% 80% at 50% 45%, ${rgba(C.navy950, 0)} 55%, ${rgba(C.navy950, 0.65)} 100%)`}} />
			{/* gloed: de canvas zelf krijgt een gouden drop-shadow, die volgt dus precies de staafjes */}
			<AbsoluteFill
				style={{
					filter: `drop-shadow(0 0 ${3 * u}px ${rgba(C.gold200, 0.95)}) drop-shadow(0 0 ${12 * u}px ${rgba(C.gold300, 0.85 * pulse)}) drop-shadow(0 0 ${40 * u}px ${rgba(C.gold500, 0.75 * pulse)})`,
				}}
			>
				<ThreeCanvas width={width} height={height} gl={{alpha: true, antialias: true}} camera={{fov: 22, position: [0, 0.12, 7.2]}}>
					<Omgeving />
					<ambientLight intensity={0.6} color="#ffe6b8" />
					<directionalLight position={[3, 4, 5]} intensity={2.2} color="#fff1d0" />
					<directionalLight position={[-4, 1, 2]} intensity={1.2} color="#ffd9a0" />
					<pointLight position={[0, 0.2, 2.2]} intensity={6} distance={6} color="#ffe2a8" />
					<group position={[0, (0.5 - cy / height) * 2.6, 0]} scale={(S / (height / 2)) * 1.42}>
						<Draadmodel rot={rot} />
					</group>
				</ThreeCanvas>
			</AbsoluteFill>
			{/* vonkjes: elk een geheel aantal levens per loop, dus ook naadloos */}
			{new Array(SPARKS).fill(0).map((_, i) => {
				const lives = 3 + Math.floor(random(`d3-n-${i}`) * 4);
				const age = frac(lives * p + random(`d3-o-${i}`));
				const life = Math.floor(lives * p + random(`d3-o-${i}`)) % lives;
				const a = random(`d3-a-${i}-${life}`) * TAU;
				const r0 = 0.75 + random(`d3-r-${i}-${life}`) * 0.6;
				const x = cx + Math.cos(a) * S * r0 * (1 + 0.2 * age);
				const y = cy + 0.15 * S + Math.sin(a) * S * 0.75 * r0 - 60 * u * age;
				const size = (2 + random(`d3-s-${i}`) * 5) * u;
				const o = Math.sin(Math.PI * age) ** 2 * (0.35 + 0.65 * random(`d3-b-${i}`));
				return (
					<div
						key={i}
						style={{position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: '50%', background: C.gold200, opacity: o, boxShadow: `0 0 ${size * 2.5}px ${C.gold500}`}}
					/>
				);
			})}
		</AbsoluteFill>
	);
};
