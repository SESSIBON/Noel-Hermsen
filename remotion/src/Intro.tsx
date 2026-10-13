import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background, Eyebrow, Sheen, boxStyle, fadeUp, LogoImg} from './components';
import {introLogoBox, useLayout, type Box} from './layout';
import {
	BEELDMERK,
	C,
	DIAMANT_IN_LOGO,
	FONT,
	LOGO_FC,
	config,
	progress,
	type AssetProps,
} from './theme';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpBox = (a: Box, b: Box, t: number): Box => ({
	cx: lerp(a.cx, b.cx, t),
	cy: lerp(a.cy, b.cy, t),
	w: lerp(a.w, b.w, t),
	h: lerp(a.h, b.h, t),
});

export const Intro: React.FC<AssetProps> = (assets) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const L = useLayout(width, height);
	const {u} = L;

	const logo = introLogoBox(L, assets);
	const bm = assets.beeldmerk ?? {w: 1, h: 1};

	// Diamant: start groot in het midden, landt op de diamant in het logo.
	const startW = 0.34 * Math.min(width, height);
	const start: Box = {cx: width / 2, cy: height / 2, w: startW, h: (startW * bm.h) / bm.w};
	const landW = DIAMANT_IN_LOGO.w * logo.w;
	const landed: Box = {
		cx: logo.cx - logo.w / 2 + DIAMANT_IN_LOGO.cx * logo.w,
		cy: logo.cy - logo.h / 2 + DIAMANT_IN_LOGO.cy * logo.h,
		w: landW,
		h: (landW * bm.h) / bm.w,
	};

	const appear = progress(frame, fps, 0.3, 1.1);
	const move = progress(frame, fps, 1.8, 0.8);
	const sheen = interpolate(frame, [1.2 * fps, 2.0 * fps], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const logoIn = progress(frame, fps, 1.9, 0.7);
	const diamondOut = progress(frame, fps, 2.15, 0.5);

	const scale = lerp(0.92, 1, appear);
	const d = lerpBox(start, landed, move);
	const diamond: Box = {...d, w: d.w * scale, h: d.h * scale};

	const eyebrowP = progress(frame, fps, 2.4, 0.6);
	const titleP = progress(frame, fps, 2.55, 0.7);
	const textTop = logo.cy + logo.h / 2 + 72 * u;

	return (
		<AbsoluteFill>
			<Background />
			{assets.logoFc ? <LogoImg src={LOGO_FC} box={logo} opacity={logoIn} /> : null}
			{assets.beeldmerk ? (
				<>
					<Img
						src={staticFile(BEELDMERK)}
						style={{...boxStyle(diamond), objectFit: 'contain', opacity: appear * (1 - diamondOut)}}
					/>
					<Sheen src={BEELDMERK} box={diamond} p={sheen} />
				</>
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
