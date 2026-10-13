import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {useLayout} from './layout';
import {C, FONT, config, progress} from './theme';

// Opening: stilstaand beeld uit de video ("screenshot"), heel licht inzoomend.
// Optioneel wordt de naam letter voor letter ingetypt en fadet daarna weer uit,
// zodat de overgang naar de intro over een schone foto loopt.
const TYPE_START = 0.2;
const TYPE_DUR = 0.7;
const FADE_START = 1.3;
const FADE_DUR = 0.4;

export const Foto: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps, width, height, durationInFrames} = useVideoConfig();
	const L = useLayout(width, height);
	const {u} = L;
	const t = frame / fps;

	const zoom = interpolate(frame, [0, durationInFrames], [1, 1.04]);
	const naam = config.persoon.naam;
	const showName = config.foto.naam_tonen;

	const typed = Math.round(interpolate(t, [TYPE_START, TYPE_START + TYPE_DUR], [0, naam.length], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	}));
	const out = progress(frame, fps, FADE_START, FADE_DUR);
	const shade = interpolate(t, [0, TYPE_START + 0.2], [0, 1], {extrapolateRight: 'clamp'}) * (1 - out);
	const caretOn = typed < naam.length && t >= TYPE_START;

	return (
		<AbsoluteFill style={{backgroundColor: C.navy950}}>
			<AbsoluteFill style={{transform: `scale(${zoom})`}}>
				<Img src={staticFile('foto.png')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
			</AbsoluteFill>
			{showName ? (
				<>
					{/* zacht nachtblauw verloop onderin, zodat de naam leesbaar is */}
					<AbsoluteFill
						style={{
							background: `linear-gradient(to top, rgba(5, 0, 30, 0.92) 0%, rgba(5, 0, 30, 0.8) 18%, rgba(5, 0, 30, 0.45) 32%, rgba(5, 0, 30, 0) 50%)`,
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
							color: C.gold500,
							opacity: 1 - out,
							transform: `translateY(${-out * 12 * u}px)`,
							whiteSpace: 'pre',
							textShadow: `0 0 ${24 * u}px rgba(5, 0, 30, 0.8)`,
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
											background: C.gold500,
											verticalAlign: '-0.08em',
										}}
									/>
								) : null}
							</span>
						</span>
					</div>
				</>
			) : null}
		</AbsoluteFill>
	);
};
