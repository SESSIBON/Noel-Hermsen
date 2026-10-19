import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background, Eyebrow, Sheen, boxStyle, fadeUp} from './components';
import {introLogoBox, useLayout, type Box} from './layout';
import {BEELDMERK, FONT, LOGO_FC, P, config, progress, type AssetProps} from './theme';

// Intro in de geest van de motion-referentie:
//  1. de gouden diamant gloeit op, met fonkelingen eromheen;
//  2. een lichtflits strijkt van links naar rechts over de diamant;
//  3. de diamant valt (van links naar rechts) uiteen in gouden vonkjes;
//  4. de vonkjes worden naar het logo toe gezogen; waar ze samenkomen volgt een gouden
//     lichtflits met een uitdijende ring, en het logo komt scherp uit het licht tevoorschijn;
//     één glans strijkt over het logo, daarna eyebrow en titel.
// Met een openingsfoto (config.foto) begint het met oogcontact: eerst even haar foto, met de
// naam die wordt ingetypt; daarna zakt de foto rustig weg naar de achtergrond (gedimd en zacht)
// en speelt de diamant-animatie eroverheen.
// intro.stijl "vlieg": de diamant komt draaiend binnenvliegen met een gouden spoor en landt
// in het midden; daarna dezelfde flits, vonkjes en logo-onthulling (iets later in de tijd).
const VLIEG = (config.intro as {stijl?: string}).stijl === 'vlieg';
const FLY_END = 1.5;
const T = VLIEG
	? {
			diamondIn: 0.0,
			flareStart: 1.45,
			flareEnd: 2.6,
			dissolveStart: 2.6,
			dissolveDur: 0.8,
			gatherStart: 3.0,
			burst: 3.8,
			logoIn: 3.72,
			logoSheen: 4.45,
			eyebrow: 4.5,
			title: 4.65,
		}
	: {
	diamondIn: 0.0,
	flareStart: 0.6,
	flareEnd: 2.1,
	dissolveStart: 2.0,
	dissolveDur: 0.8,
	gatherStart: 2.5, // vonkjes worden naar het logo gezogen
	burst: 3.3, // ze komen samen: lichtflits + ring
	logoIn: 3.22,
	logoSheen: 3.95,
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
	// Met foto schuift de hele diamant-animatie op met de duur van het oogcontact.
	const withFoto = Boolean(assets.foto);
	const off = withFoto ? config.foto.oogcontact_seconden : 0;
	const f = frame - off * fps;
	const t = f / fps;

	const bm = assets.beeldmerk ?? {w: 1, h: 1};
	const logo = introLogoBox(L, assets);

	// Diamant: groot, iets boven het midden, zoomt heel langzaam in.
	const dIn = progress(f, fps, T.diamondIn, 0.9);
	const zoom = interpolate(t, [0, T.dissolveStart + T.dissolveDur], [0.94, 1.02], clamp);
	const dw = 0.62 * Math.min(width, height) * zoom;
	const diamond: Box = {cx: width / 2, cy: height * 0.4, w: dw, h: (dw * bm.h) / bm.w};
	const dLeft = diamond.cx - diamond.w / 2;
	const dTop = diamond.cy - diamond.h / 2;

	// Vlucht: van linksonder buiten beeld, in een boog, draaiend om de verticale as; de draai
	// remt af en de diamant landt recht van voren op zijn plek.
	const flyPose = (time: number) => {
		const p = Math.min(Math.max(time / FLY_END, 0), 1);
		const e = 1 - Math.pow(1 - p, 3);
		const sx = -0.25 * width;
		const sy = 1.1 * height;
		const kx = 0.05 * width;
		const ky = 0.15 * height;
		const x = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * kx + e * e * diamond.cx;
		const y = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * ky + e * e * diamond.cy;
		return {
			x,
			y,
			scale: 0.18 + 0.82 * e,
			rotY: 1080 * Math.pow(1 - e, 1.6),
			tilt: -28 * (1 - e),
			opacity: interpolate(time, [0, 0.25], [0, 1], clamp),
			p,
		};
	};
	const pose = VLIEG ? flyPose(t) : null;
	const flyTransform = (q: ReturnType<typeof flyPose>) =>
		`translate(${q.x - diamond.cx}px, ${q.y - diamond.cy}px) perspective(${1400 * u}px) rotateY(${q.rotY}deg) rotateZ(${q.tilt}deg) scale(${q.scale})`;

	// Lichtflits: van links naar rechts over de gordel van de diamant, piek in het midden.
	const flareP = interpolate(t, [T.flareStart, T.flareEnd], [0, 1], {...clamp, easing: Easing.inOut(Easing.sin)});
	const flareI = Math.sin(Math.PI * flareP);
	const flareX = dLeft - 0.12 * width + flareP * (diamond.w + 0.24 * width);
	const flareY = dTop + diamond.h * 0.31;

	// Uiteenvallen: een zachte veeg van links naar rechts; wat weg is, wordt vonkjes.
	const wipe = interpolate(t, [T.dissolveStart, T.dissolveStart + T.dissolveDur], [-0.15, 1.15], clamp);
	const glow = 0.35 + 0.65 * flareI;
	const mask = `linear-gradient(to right, transparent ${(wipe - 0.08) * 100}%, black ${(wipe + 0.08) * 100}%)`;

	// Logo komt uit de flits: van groot, wazig en gloeiend naar scherp op zijn plek.
	const logoP = progress(f, fps, T.logoIn, 0.7);
	const logoGlow = 1 - progress(f, fps, T.logoIn, 1.4);
	const logoScale = 1.14 - 0.14 * logoP;
	const logoBox: Box = {...logo, w: logo.w * logoScale, h: logo.h * logoScale};
	const logoSheen = interpolate(t, [T.logoSheen, T.logoSheen + 0.7], [0, 1], clamp);
	const eyebrowP = progress(f, fps, T.eyebrow, 0.6);
	const titleP = progress(f, fps, T.title, 0.7);
	const textTop = logo.cy + logo.h / 2 + 72 * u;

	return (
		<AbsoluteFill>
			{withFoto ? <FotoAchtergrond frame={frame} fps={fps} off={off} u={u} /> : <Background />}

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
							background: `radial-gradient(circle, rgba(${P.fxMid}, ${0.22 * glow}) 0%, rgba(${P.fxMid}, 0) 55%)`,
							opacity: dIn * (pose ? Math.pow(pose.p, 3) : 1) * (1 - progress(f, fps, T.dissolveStart, 1.2)),
						}}
					/>
					{pose && pose.p < 1 ? <FlyTrail pose={flyPose} t={t} box={diamond} u={u} toTransform={flyTransform} /> : null}
					<Img
						src={staticFile(BEELDMERK)}
						style={{
							...boxStyle(diamond),
							objectFit: 'contain',
							opacity: pose ? pose.opacity : dIn,
							transform: pose ? flyTransform(pose) : undefined,
							filter: `drop-shadow(0 0 ${6 * u}px rgba(${P.fxHi}, ${0.9 * glow})) drop-shadow(0 0 ${22 * u}px rgba(${P.fxMid}, ${0.7 * glow}))`,
							WebkitMaskImage: mask,
							maskImage: mask,
						}}
					/>
					<Twinkles diamond={diamond} t={t} u={u} />
					<Sparks diamond={diamond} logo={logo} t={t} u={u} wipeStart={T.dissolveStart} wipeDur={T.dissolveDur} />
					{flareI > 0.001 ? <Flare x={flareX} y={flareY} i={flareI} u={u} width={width} /> : null}
				</>
			) : null}

			{withFoto && config.foto.naam_tonen ? <Naam frame={frame} fps={fps} off={off} L={L} /> : null}
			{assets.logoFc ? (
				<>
					<Img
						src={staticFile(LOGO_FC)}
						style={{
							...boxStyle(logoBox),
							objectFit: 'contain',
							opacity: Math.min(1, logoP * 1.6),
							filter: `blur(${(1 - logoP) * 10 * u}px) drop-shadow(0 0 ${14 * u}px rgba(${P.fxHi}, ${0.9 * logoGlow})) drop-shadow(0 0 ${40 * u}px rgba(${P.fxMid}, ${0.7 * logoGlow}))`,
						}}
					/>
					<Sheen src={LOGO_FC} box={logoBox} p={logoSheen} />
				</>
			) : null}
			<Burst cx={logo.cx} cy={logo.cy - logo.h * 0.1} t={t} at={T.burst} u={u} />
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
						color: P.accent,
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
					background: `radial-gradient(circle, rgba(${P.fxSoft}, ${0.75 * i}) 0%, rgba(${P.fxMid}, ${0.28 * i}) 30%, rgba(${P.fxMid}, 0) 70%)`,
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
					background: `linear-gradient(to right, rgba(${P.fxHi}, 0) 0%, rgba(${P.fxHi}, ${0.95 * i}) 50%, rgba(${P.fxHi}, 0) 100%)`,
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
					background: `radial-gradient(circle, rgba(255, 255, 255, ${i}) 0%, rgba(255, 255, 255, ${0.9 * i}) 15%, rgba(${P.fxHi}, ${0.8 * i}) 35%, rgba(${P.fxHi}, 0) 70%)`,
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
			const born = (VLIEG ? FLY_END - 0.2 : 0.3) + random(`tw-b-${i}`) * (VLIEG ? 0.9 : 1.6);
			const life = interpolate(t, [born, born + 0.4, 3.0, 3.6], [0, 1, 1, 0], clamp);
			const blink = 0.5 + 0.5 * Math.sin(t * (3 + random(`tw-f-${i}`) * 4) + i);
			const size = (3 + random(`tw-s-${i}`) * 6) * u;
			return <Dot key={i} x={x} y={y} size={size} opacity={0.95 * life * (0.3 + 0.7 * blink)} u={u} />;
		})}
	</>
);

// Vonkjes die op de lijnen van de diamant ontstaan wanneer de veeg langskomt. Een deel zweeft weg,
// de rest wordt daarna naar het logo gezogen en dooft precies als het logo uit de flits komt.
const Sparks: React.FC<{diamond: Box; logo: Box; t: number; u: number; wipeStart: number; wipeDur: number}> = ({
	diamond,
	logo,
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
			const gather = random(`sp-g-${i}`) < 0.7;
			const life = gather ? 2.5 : 1.0 + random(`sp-l-${i}`) * 0.9;
			if (age < 0 || age > life) return null;
			const dirX = x0 - diamond.cx;
			const dirY = y0 - diamond.cy;
			const len = Math.hypot(dirX, dirY) || 1;
			const speed = (60 + random(`sp-v-${i}`) * 160) * u;
			const span = gather ? 1.4 : life;
			const ease = 1 - Math.pow(1 - Math.min(age / span, 1), 2);
			let x = x0 + (dirX / len) * speed * ease * span + Math.sin(age * 3 + i) * 6 * u;
			let y = y0 + (dirY / len) * speed * ease * span - age * 40 * u;
			const size = (3 + random(`sp-s-${i}`) * 7) * u;
			if (!gather) {
				const opacity = interpolate(age, [0, 0.1, life * 0.5, life], [0, 1, 0.8, 0], clamp);
				return <Dot key={i} x={x} y={y} size={size} opacity={opacity} u={u} />;
			}
			// Aantrekken: versnellend naar een punt binnen het logo.
			const pull = Math.pow(interpolate(t, [T.gatherStart, T.burst], [0, 1], clamp), 3);
			const tx = logo.cx + (random(`sp-tx-${i}`) - 0.5) * logo.w * 0.7;
			const ty = logo.cy + (random(`sp-ty-${i}`) - 0.5) * logo.h * 0.7;
			x += (tx - x) * pull;
			y += (ty - y) * pull;
			const opacity = interpolate(age, [0, 0.1], [0, 1], clamp) * interpolate(t, [T.burst - 0.06, T.burst + 0.04], [1, 0], clamp);
			return <Dot key={i} x={x} y={y} size={size * (1 - 0.4 * pull)} opacity={opacity} u={u} />;
		})}
	</>
);

// Gouden lichtflits met twee uitdijende ringen op het moment dat de vonkjes samenkomen.
const Burst: React.FC<{cx: number; cy: number; t: number; at: number; u: number}> = ({cx, cy, t, at, u}) => {
	if (t < at - 0.1 || t > at + 1.2) return null;
	const flash = interpolate(t, [at - 0.06, at + 0.04, at + 0.7], [0, 1, 0], {...clamp, easing: Easing.out(Easing.quad)});
	const flashSize = 1200 * u;
	const ring = (delay: number, strength: number, maxR: number) => {
		const p = interpolate(t, [at + delay, at + delay + 1.0], [0, 1], clamp);
		if (p <= 0 || p >= 1) return null;
		const r = (40 + (maxR - 40) * Easing.out(Easing.cubic)(p)) * u;
		return (
			<div
				style={{
					position: 'absolute',
					left: cx - r,
					top: cy - r,
					width: r * 2,
					height: r * 2,
					borderRadius: '50%',
					border: `${Math.max(1, (4 - 3 * p) * u)}px solid ${P.ring}`,
					boxShadow: `0 0 ${18 * u}px ${P.dotGlow}, inset 0 0 ${18 * u}px ${P.dotGlow}`,
					opacity: strength * (1 - p),
				}}
			/>
		);
	};
	return (
		<AbsoluteFill style={{mixBlendMode: 'screen'}}>
			<div
				style={{
					position: 'absolute',
					left: cx - flashSize / 2,
					top: cy - flashSize / 2,
					width: flashSize,
					height: flashSize,
					borderRadius: '50%',
					background: `radial-gradient(circle, rgba(255, 255, 255, ${0.95 * flash}) 0%, rgba(${P.fxHi}, ${0.75 * flash}) 12%, rgba(${P.fxMid}, ${0.3 * flash}) 32%, rgba(${P.fxMid}, 0) 60%)`,
				}}
			/>
			{ring(0, 0.9, 620)}
			{ring(0.14, 0.5, 820)}
		</AbsoluteFill>
	);
};

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
				background: P.dot,
				opacity,
				boxShadow: `0 0 ${size * 2.5}px ${P.dotGlow}, 0 0 ${4 * u}px ${P.dotGlow2}`,
			}}
		/>
	);

// Openingsfoto: eerst helder (oogcontact), daarna zakt ze weg achter het nachtverloop.
const FotoAchtergrond: React.FC<{frame: number; fps: number; off: number; u: number}> = ({frame, fps, off, u}) => {
	const {durationInFrames} = useVideoConfig();
	const dim = progress(frame, fps, off, 0.8);
	const zoom = interpolate(frame, [0, durationInFrames], [1, 1.06]);
	return (
		<AbsoluteFill style={{backgroundColor: P.base}}>
			<AbsoluteFill style={{transform: `scale(${zoom})`, filter: `blur(${dim * 12 * u}px)`}}>
				<Img src={staticFile('foto.png')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
			</AbsoluteFill>
			<AbsoluteFill style={{opacity: dim * 0.86}}>
				<Background />
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

// Naam wordt letter voor letter ingetypt tijdens het oogcontact en fadet uit als de diamant uiteenvalt.
const Naam: React.FC<{frame: number; fps: number; off: number; L: ReturnType<typeof useLayout>}> = ({
	frame,
	fps,
	off,
	L,
}) => {
	const {u} = L;
	const t = frame / fps;
	const naam = config.persoon.naam;
	const typeStart = 0.15;
	const typeEnd = Math.max(typeStart + 0.3, off - 0.2);
	const typed = Math.round(interpolate(t, [typeStart, typeEnd], [0, naam.length], clamp));
	const out = progress(frame, fps, off + T.dissolveStart - 0.2, 0.5);
	const shade = interpolate(t, [0, typeStart + 0.2], [0, 1], clamp) * (1 - progress(frame, fps, off, 1.0));
	const caretOn = typed < naam.length && t >= typeStart;
	return (
		<>
			<AbsoluteFill
				style={{
					background:
						`linear-gradient(to top, rgba(${P.shade}, 0.92) 0%, rgba(${P.shade}, 0.8) 18%, rgba(${P.shade}, 0.45) 32%, rgba(${P.shade}, 0) 50%)`,
					opacity: shade,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: L.safe.side,
					right: L.safe.side,
					bottom: L.safe.bottom + 40 * u,
					textAlign: 'center',
					fontFamily: FONT,
					fontWeight: 700,
					fontSize: 88 * u,
					lineHeight: 1.1,
					color: P.accent,
					opacity: 1 - out,
					transform: `translateY(${-out * 12 * u}px)`,
					whiteSpace: 'pre',
					textShadow: `0 0 ${24 * u}px rgba(${P.shade}, 0.8)`,
				}}
			>
				{/* Volledige naam onzichtbaar erachter: zo staat de getypte tekst al op zijn eindplek. */}
				<span style={{position: 'relative'}}>
					<span style={{visibility: 'hidden'}}>{naam}</span>
					<span style={{position: 'absolute', left: 0, top: 0}}>
						{naam.slice(0, typed)}
						{caretOn ? (
							<span
								style={{
									display: 'inline-block',
									width: Math.max(2, 4 * u),
									height: '0.9em',
									marginLeft: 6 * u,
									background: P.accent,
									verticalAlign: '-0.08em',
								}}
							/>
						) : null}
					</span>
				</span>
			</div>
		</>
	);
};

// Gouden spoor achter de vliegende diamant: naglans-kopieën van de PNG en vonkjes die
// langs de baan achterblijven en langzaam uitdoven.
const TRAIL_COPIES = 12;
const TRAIL_SPARKS = 90;
type Pose = {x: number; y: number; scale: number; rotY: number; tilt: number; opacity: number; p: number};
const FlyTrail: React.FC<{
	pose: (time: number) => Pose;
	t: number;
	box: Box;
	u: number;
	toTransform: (q: Pose) => string;
}> = ({pose, t, box, u, toTransform}) => (
	<>
		{new Array(TRAIL_COPIES).fill(0).map((_, i) => {
			const k = TRAIL_COPIES - i;
			const q = pose(t - k * 0.03);
			if (t - k * 0.03 <= 0) return null;
			const fall = 1 - k / (TRAIL_COPIES + 1);
			return (
				<Img
					key={`c${k}`}
					src={staticFile(BEELDMERK)}
					style={{
						...boxStyle(box),
						objectFit: 'contain',
						opacity: q.opacity * 0.22 * fall * (1 - q.p * 0.6),
						transform: toTransform(q),
						filter: `blur(${(1 - fall) * 6 * u}px)`,
					}}
				/>
			);
		})}
		{new Array(TRAIL_SPARKS).fill(0).map((_, i) => {
			const born = 0.05 + random(`ft-b-${i}`) * (FLY_END - 0.1);
			const age = t - born;
			const life = 0.6 + random(`ft-l-${i}`) * 0.6;
			if (age < 0 || age > life) return null;
			const q = pose(born);
			const jx = (random(`ft-x-${i}`) - 0.5) * box.w * 0.5 * q.scale;
			const jy = (random(`ft-y-${i}`) - 0.5) * box.h * 0.5 * q.scale;
			const x = q.x + jx + (random(`ft-dx-${i}`) - 0.5) * 60 * u * age;
			const y = q.y + jy + 50 * u * age;
			const opacity = interpolate(age, [0, 0.08, life], [0, 1, 0], clamp);
			const size = (3 + random(`ft-s-${i}`) * 6) * u;
			return <Dot key={`s${i}`} x={x} y={y} size={size} opacity={opacity} u={u} />;
		})}
	</>
);
