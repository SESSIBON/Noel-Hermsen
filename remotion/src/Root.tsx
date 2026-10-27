import React from 'react';
import {Composition} from 'remotion';
import {Intro} from './Intro';
import {Outro} from './Outro';
import {Cta} from './Cta';
import {Overgang} from './Overgang';
import {Loop} from './Loop';
import {RES_H, RES_W, config, defaultAssetProps} from './theme';

// fps komt van de bronvideo (build.sh geeft hem mee met --props); 25 is de terugvaloptie.
const FPS_FALLBACK = 25;
// Duur van de korte motion tussen quotes (config.overgangen.duur_seconden).
const OVERGANG_DUUR = (config as {overgangen?: {duur_seconden?: number}}).overgangen?.duur_seconden ?? 1.2;

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
				defaultProps={{...defaultAssetProps, fps: FPS_FALLBACK, foto: false}}
				calculateMetadata={({props}: {props: Record<string, unknown>}) => {
					// Met openingsfoto komt het oogcontact vóór de diamant-animatie.
					const fps = Number(props.fps) || FPS_FALLBACK;
					const extra = props.foto ? config.foto.oogcontact_seconden : 0;
					return {fps, durationInFrames: frames(config.intro.duur_seconden + extra, fps)};
				}}
			/>
			<Composition
				id="Overgang"
				component={Overgang}
				width={RES_W}
				height={RES_H}
				fps={FPS_FALLBACK}
				durationInFrames={frames(OVERGANG_DUUR, FPS_FALLBACK)}
				defaultProps={{beeldmerk: defaultAssetProps.beeldmerk, fps: FPS_FALLBACK}}
				calculateMetadata={meta(OVERGANG_DUUR)}
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
			{/* Achtergrondloop voor het scherm op de awardavond: 4K liggend, 30 s, naadloos. */}
			<Composition id="Loop" component={Loop} width={3840} height={2160} fps={30} durationInFrames={900} />
		</>
	);
};
