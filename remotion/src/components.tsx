import React, {useState} from 'react';
import {
	AbsoluteFill,
	Img,
	continueRender,
	delayRender,
	random,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {C, FONT} from './theme';
import type {Box, Layout} from './layout';

// Nachtverloop: navy-950 linksboven -> navy-900 -> navy-700 rechtsonder, met zachte vignettering.
export const Background: React.FC<{dustOffset?: number}> = ({dustOffset = 0}) => (
	<AbsoluteFill
		style={{
			background: `linear-gradient(to bottom right, ${C.navy950} 0%, ${C.navy900} 50%, ${C.navy700} 100%)`,
		}}
	>
		<AbsoluteFill
			style={{
				background:
					'radial-gradient(ellipse 85% 75% at 50% 45%, rgba(5, 0, 30, 0) 55%, rgba(5, 0, 30, 0.55) 100%)',
			}}
		/>
		<GoldDust offset={dustOffset} />
	</AbsoluteFill>
);

// Hooguit 16 heel zachte goudstofjes die langzaam omhoog zweven.
// `offset` (frames) laat de CTA naadloos doorlopen waar de outro ophoudt.
const DUST_COUNT = 16;
const GoldDust: React.FC<{offset: number}> = ({offset}) => {
	const frame = useCurrentFrame() + offset;
	const {fps, width, height} = useVideoConfig();
	const u = Math.min(width, height) / 1080;
	const t = frame / fps;
	return (
		<AbsoluteFill>
			{new Array(DUST_COUNT).fill(0).map((_, i) => {
				const x0 = random(`dust-x-${i}`) * width;
				const y0 = random(`dust-y-${i}`) * height;
				const speed = (8 + random(`dust-s-${i}`) * 14) * u;
				const size = (2 + random(`dust-r-${i}`) * 3) * u;
				const opacity = 0.06 + random(`dust-o-${i}`) * 0.14;
				const phase = random(`dust-p-${i}`) * Math.PI * 2;
				const span = height + 40 * u;
				const y = ((((y0 - speed * t) % span) + span) % span) - 20 * u;
				const x = x0 + Math.sin(t * 0.35 + phase) * 18 * u;
				const twinkle = 0.75 + 0.25 * Math.sin(t * 0.8 + phase);
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: x,
							top: y,
							width: size,
							height: size,
							borderRadius: '50%',
							background: C.gold300,
							opacity: opacity * twinkle,
							boxShadow: `0 0 ${size * 3}px ${C.gold300}`,
						}}
					/>
				);
			})}
		</AbsoluteFill>
	);
};

// Eyebrow: KAPITALEN, 500, gold-500, met dunne gouden lijn rechts ernaast.
export const Eyebrow: React.FC<{text: string; L: Layout; style?: React.CSSProperties}> = ({
	text,
	L,
	style,
}) => (
	<div
		style={{
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			gap: 22 * L.u,
			...style,
		}}
	>
		<span
			style={{
				fontFamily: FONT,
				fontWeight: 500,
				fontSize: 26 * L.u,
				letterSpacing: '0.18em',
				textTransform: 'uppercase',
				color: C.gold500,
				whiteSpace: 'nowrap',
			}}
		>
			{text}
		</span>
		<span
			style={{
				width: 72 * L.u,
				height: Math.max(1, 2 * L.u),
				background: C.gold500,
				opacity: 0.6,
				flexShrink: 0,
			}}
		/>
	</div>
);

// Fade + 24u omhoog schuiven.
export const fadeUp = (p: number, u: number): React.CSSProperties => ({
	opacity: p,
	transform: `translateY(${(1 - p) * 24 * u}px)`,
});

export const boxStyle = (b: Box): React.CSSProperties => ({
	position: 'absolute',
	left: b.cx - b.w / 2,
	top: b.cy - b.h / 2,
	width: b.w,
	height: b.h,
});

export const LogoImg: React.FC<{src: string; box: Box; opacity?: number}> = ({src, box, opacity = 1}) => (
	<Img src={staticFile(src)} style={{...boxStyle(box), objectFit: 'contain', opacity}} />
);

// Zorgt dat een PNG geladen is voordat hij als CSS-mask wordt gebruikt.
const usePreloaded = (src: string) => {
	const [handle] = useState(() => delayRender(`mask ${src}`));
	useState(() => {
		const img = new Image();
		img.onload = () => continueRender(handle);
		img.onerror = () => continueRender(handle);
		img.src = src;
		return null;
	});
};

// Eén gouden glans die diagonaal over de PNG strijkt (mask = de PNG zelf).
export const Sheen: React.FC<{src: string; box: Box; p: number}> = ({src, box, p}) => {
	const url = staticFile(src);
	usePreloaded(url);
	if (p <= 0 || p >= 1) return null;
	const pos = -60 + p * 220; // % : van links buiten beeld naar rechts buiten beeld
	const mask = `url(${url}) center / contain no-repeat`;
	return (
		<div
			style={{
				...boxStyle(box),
				background: `linear-gradient(115deg, rgba(253, 225, 150, 0) ${pos - 22}%, ${C.gold200} ${pos}%, rgba(253, 225, 150, 0) ${pos + 22}%)`,
				mixBlendMode: 'screen',
				WebkitMask: mask,
				mask,
			}}
		/>
	);
};
