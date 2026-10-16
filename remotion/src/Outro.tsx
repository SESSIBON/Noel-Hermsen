import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background, Eyebrow, LogoImg, fadeUp} from './components';
import {ctaLogoBox, outroLogoBox, outroNameBottom, useLayout} from './layout';
import {FONT, LOGO_FC, P, config, progress, type AssetProps} from './theme';

export const Outro: React.FC<AssetProps> = (assets) => {
	const frame = useCurrentFrame();
	const {fps, width, height, durationInFrames} = useVideoConfig();
	const L = useLayout(width, height);
	const {u} = L;
	const end = durationInFrames / fps;

	const eyebrowP = progress(frame, fps, 0.4, 0.7);
	const nameP = progress(frame, fps, 0.6, 0.8);
	const logoP = progress(frame, fps, 1.4, 0.7);
	// Laatste 0,5 s: tekst fadet uit, het logo schuift door naar zijn plek in de CTA.
	const out = progress(frame, fps, end - 0.5, 0.5);
	const keep = 1 - out;

	const from = outroLogoBox(L, assets);
	const to = ctaLogoBox(L, assets);
	const lerp = (a: number, b: number) => a + (b - a) * out;
	const logo = {
		cx: lerp(from.cx, to.cx),
		cy: lerp(from.cy, to.cy) + (1 - logoP) * 24 * u,
		w: lerp(from.w, to.w),
		h: lerp(from.h, to.h),
	};

	return (
		<AbsoluteFill>
			<Background />
			<div
				style={{
					position: 'absolute',
					bottom: height - outroNameBottom(L),
					left: L.safe.side,
					right: L.safe.side,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 30 * u,
					opacity: keep,
				}}
			>
				<Eyebrow text={config.outro.eyebrow} L={L} style={fadeUp(eyebrowP, u)} />
				<div
					style={{
						...fadeUp(nameP, u),
						fontFamily: FONT,
						fontWeight: 700,
						fontSize: 88 * u,
						lineHeight: 1.1,
						color: P.accent,
						textAlign: 'center',
						textWrap: 'balance',
					}}
				>
					{config.persoon.naam}
				</div>
			</div>
			{assets.logoFc ? <LogoImg src={LOGO_FC} box={logo} opacity={logoP} /> : null}
			<div
				style={{
					position: 'absolute',
					top: from.cy + from.h / 2 + 40 * u,
					left: L.safe.side,
					right: L.safe.side,
					textAlign: 'center',
					fontFamily: FONT,
					fontWeight: 500,
					fontSize: 30 * u,
					letterSpacing: 4 * u,
					textTransform: 'uppercase',
					color: P.text,
					...fadeUp(logoP, u),
					opacity: logoP * keep,
				}}
			>
				{config.outro.payoff}
			</div>
		</AbsoluteFill>
	);
};
