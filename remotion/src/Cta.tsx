import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background, Eyebrow, LogoImg, fadeUp} from './components';
import {ctaLogoBox, useLayout} from './layout';
import {C, FONT, LOGO_FC, config, progress, type AssetProps} from './theme';

export const Cta: React.FC<AssetProps & {dustOffset: number}> = ({dustOffset, ...assets}) => {
	const frame = useCurrentFrame();
	const {fps, width, height, durationInFrames} = useVideoConfig();
	const L = useLayout(width, height);
	const {u} = L;
	const end = durationInFrames / fps;

	const eyebrowP = progress(frame, fps, 0.0, 0.7);
	const kopP = progress(frame, fps, 0.2, 0.8);
	const knopP = progress(frame, fps, 0.8, 0.8);
	const urlP = progress(frame, fps, 1.2, 0.8);
	const sheen = interpolate(frame, [3.3 * fps, 4.1 * fps], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const fadeToNavy = interpolate(frame, [(end - 0.5) * fps, end * fps], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	const logo = ctaLogoBox(L, assets);
	const sheenPos = -40 + sheen * 180;

	return (
		<AbsoluteFill>
			<Background dustOffset={dustOffset} />
			<div
				style={{
					position: 'absolute',
					top: L.safe.top,
					bottom: height - (logo.cy - logo.h / 2) + 80 * u,
					left: L.safe.side,
					right: L.safe.side,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<Eyebrow text={config.cta.eyebrow_datum_locatie} L={L} style={fadeUp(eyebrowP, u)} />
				<div
					style={{
						...fadeUp(kopP, u),
						marginTop: 30 * u,
						fontFamily: FONT,
						fontWeight: 700,
						fontSize: 76 * u,
						lineHeight: 1.12,
						color: C.gold500,
						textAlign: 'center',
						textWrap: 'balance',
					}}
				>
					{config.cta.kop}
				</div>
				<div
					style={{
						marginTop: 72 * u,
						height: 96 * u,
						padding: `0 ${52 * u}px`,
						borderRadius: 999,
						background: C.white,
						color: C.gold500,
						fontFamily: FONT,
						fontWeight: 700,
						fontSize: 34 * u,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						whiteSpace: 'nowrap',
						boxShadow: `0 0 ${40 * u}px rgba(0, 0, 0, 0.5)`,
						position: 'relative',
						overflow: 'hidden',
						opacity: knopP,
						transform: `scale(${0.96 + 0.04 * knopP})`,
					}}
				>
					{config.cta.knop}
					{sheen > 0 && sheen < 1 ? (
						<div
							style={{
								position: 'absolute',
								inset: 0,
								background: `linear-gradient(115deg, rgba(247, 217, 142, 0) ${sheenPos - 18}%, rgba(247, 217, 142, 0.45) ${sheenPos}%, rgba(247, 217, 142, 0) ${sheenPos + 18}%)`,
							}}
						/>
					) : null}
				</div>
				<div
					style={{
						...fadeUp(urlP, u),
						marginTop: 40 * u,
						fontFamily: FONT,
						fontWeight: 400,
						fontSize: 30 * u,
						color: C.white70,
						textAlign: 'center',
					}}
				>
					{config.cta.url_weergave || config.cta.url}
				</div>
			</div>
			{assets.logoFc ? <LogoImg src={LOGO_FC} box={logo} /> : null}
			{config.cta.socials ? (
				<div
					style={{
						position: 'absolute',
						left: logo.cx + logo.w / 2 + 40 * u,
						top: logo.cy,
						transform: `translateY(-50%) translateY(${(1 - urlP) * 24 * u}px)`,
						opacity: urlP,
						fontFamily: FONT,
						fontWeight: 400,
						fontSize: 30 * u,
						color: C.white70,
						whiteSpace: 'nowrap',
					}}
				>
					{config.cta.socials}
				</div>
			) : null}
			<AbsoluteFill style={{background: C.navy950, opacity: fadeToNavy}} />
		</AbsoluteFill>
	);
};
