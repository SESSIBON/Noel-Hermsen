import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background, Eyebrow, LogoImg, fadeUp} from './components';
import {ctaLogoBox, outroLogoBox, outroNameBottom, useLayout} from './layout';
import {EASE, FONT, LOGO_FC, P, config, progress, type AssetProps} from './theme';

// outro.stijl "slide": het nachtpaneel schuift vanaf rechts over het laatste beeld van de video
// (laatste.png, door build.sh gemaakt) en daarop komen eyebrow, naam, functie en logo.
const SLIDE = (config.outro as {stijl?: string}).stijl === 'slide';
const FUNCTIE = (config.persoon as {functie?: string}).functie;

export const Outro: React.FC<AssetProps> = (assets) => {
	const frame = useCurrentFrame();
	const {fps, width, height, durationInFrames} = useVideoConfig();
	const L = useLayout(width, height);
	const {u} = L;
	const end = durationInFrames / fps;

	const d = SLIDE ? 0.45 : 0; // tekst start pas als het paneel er staat
	const slideP = interpolate(frame, [0, 0.75 * fps], [0, 1], {easing: EASE, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const eyebrowP = progress(frame, fps, 0.4 + d, 0.7);
	const nameP = progress(frame, fps, 0.6 + d, 0.8);
	const functieP = progress(frame, fps, 0.85 + d, 0.7);
	const logoP = progress(frame, fps, 1.4 + d, 0.7);
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
			{SLIDE ? (
				<>
					{assets.transparant ? null : <Img src={staticFile('laatste.png')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />}
					<AbsoluteFill style={{transform: `translateX(${(1 - slideP) * 100}%)`}}>
						<Background />
						{/* gouden rand aan de voorkant van het paneel tijdens het schuiven */}
						<div
							style={{
								position: 'absolute',
								left: 0,
								top: 0,
								bottom: 0,
								width: 6 * u,
								background: P.accent,
								opacity: 1 - slideP,
								boxShadow: `0 0 ${30 * u}px rgba(${P.fxMid}, 0.8)`,
							}}
						/>
					</AbsoluteFill>
				</>
			) : (
				<Background />
			)}
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
				{FUNCTIE ? (
					<div style={{...fadeUp(functieP, u), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 * u}}>
						<div style={{width: 120 * u * functieP, height: Math.max(1, 2 * u), background: P.accent, opacity: 0.6}} />
						<div
							style={{
								fontFamily: FONT,
								fontWeight: 500,
								fontSize: 40 * u,
								letterSpacing: 6 * u,
								textTransform: 'uppercase',
								color: P.text,
							}}
						>
							{FUNCTIE}
						</div>
					</div>
				) : null}
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
