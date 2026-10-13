import React from 'react';
import {Composition} from 'remotion';
import {Intro} from './Intro';
import {Outro} from './Outro';
import {Cta} from './Cta';
import {RES_H, RES_W, config, defaultAssetProps} from './theme';

// fps komt van de bronvideo (build.sh geeft hem mee met --props); 25 is de terugvaloptie.
const FPS_FALLBACK = 25;

export const Root: React.FC = () => {
	const frames = (s: number, fps: number) => Math.round(s * fps);
	const meta =
		(dur: number) =>
		({props}: {props: Record<string, unknown>}) => {
			const fps = Number(props.fps) || FPS_FALLBACK;
			return {fps, durationInFrames: frames(dur, fps)};
		};
	const outroFrames = (fps: number) => frames(config.outro.duur_seconden, fps);

	return (
		<>
			<Composition
				id="Intro"
				component={Intro}
				width={RES_W}
				height={RES_H}
				fps={FPS_FALLBACK}
				durationInFrames={frames(config.intro.duur_seconden, FPS_FALLBACK)}
				defaultProps={{...defaultAssetProps, fps: FPS_FALLBACK}}
				calculateMetadata={meta(config.intro.duur_seconden)}
			/>
			<Composition
				id="Outro"
				component={Outro}
				width={RES_W}
				height={RES_H}
				fps={FPS_FALLBACK}
				durationInFrames={frames(config.outro.duur_seconden, FPS_FALLBACK)}
				defaultProps={{...defaultAssetProps, fps: FPS_FALLBACK}}
				calculateMetadata={meta(config.outro.duur_seconden)}
			/>
			<Composition
				id="Cta"
				component={Cta}
				width={RES_W}
				height={RES_H}
				fps={FPS_FALLBACK}
				durationInFrames={frames(config.cta.duur_seconden, FPS_FALLBACK)}
				defaultProps={{...defaultAssetProps, fps: FPS_FALLBACK, dustOffset: outroFrames(FPS_FALLBACK)}}
				calculateMetadata={({props}: {props: Record<string, unknown>}) => {
					const fps = Number(props.fps) || FPS_FALLBACK;
					return {
						fps,
						durationInFrames: frames(config.cta.duur_seconden, fps),
						props: {...props, dustOffset: outroFrames(fps)} as never,
					};
				}}
			/>
		</>
	);
};
