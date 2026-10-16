#!/usr/bin/env bash
# Topvrouwen Limburg: (teaser ->) intro (eventueel met openingsfoto) -> volledige video -> outro -> CTA. Volgorde: zie config.json.
# Gebruik:  ./build.sh                              (alles, met config.json)
#           ./build.sh personen/margo-de-kock.json   (andere persoon: eigen config-bestand)
#           ./build.sh --preview [config]           (rendert ook als logo-PNG's ontbreken; alleen om de opmaak te bekijken)
set -euo pipefail
cd "$(dirname "$0")"

PREVIEW=0
[[ "${1:-}" == "--preview" ]] && { PREVIEW=1; shift; }
CONFIG="${1:-config.json}"
[[ -f "$CONFIG" ]] || { echo "Config niet gevonden: $CONFIG"; exit 1; }
export CONFIG_PATH="$(cd "$(dirname "$CONFIG")" && pwd)/$(basename "$CONFIG")"
echo "Config: $CONFIG"

need() { command -v "$1" >/dev/null || { echo "Ontbreekt: $1 (macOS: brew install ffmpeg node)"; exit 1; }; }
need ffmpeg; need ffprobe; need node
node -e 'process.exit(+process.versions.node.split(".")[0] < 18 ? 1 : 0)' || { echo "Node.js 18+ nodig"; exit 1; }

cfg() { node -e "const c=require(process.env.CONFIG_PATH);const v=$1;process.stdout.write(v===null||v===undefined?'':String(v))"; }

# --- Stap 0: config controleren --------------------------------------------------
if node -e '
  const c=require(process.env.CONFIG_PATH);
  const bad=[];
  (function walk(o,p){for(const[k,v]of Object.entries(o)){if(k.startsWith("_"))continue;
    if(typeof v==="string"&&/\[[^\]]+\]/.test(v))bad.push(p+k+": "+v);
    else if(v&&typeof v==="object")walk(v,p+k+".");}})(c,"");
  if(bad.length){console.log("Nog in te vullen in "+process.env.CONFIG_PATH+":\n  "+bad.join("\n  "));process.exit(1)}'; then :; else exit 1; fi

SRC=$(cfg c.bronvideo)
OUT=$(cfg c.output)
[[ -f "$SRC" ]] || { echo "Bronvideo niet gevonden: $SRC"; exit 1; }

USE_TEASER=$(cfg "c.volgorde.includes('teaser')?1:0")
TEASER_START=$(cfg c.teaser.start)
if [[ $USE_TEASER == 1 && -z "$TEASER_START" ]]; then
  echo "teaser.start staat op null: kies eerst een teaserfragment."; exit 1
fi
TEASER_DUR=$(cfg c.teaser.duur_seconden)
# Openingsfoto: de intro begint met een stilstaand beeld uit de video (oogcontact),
# dat daarna als gedimde achtergrond onder de intro blijft staan.
USE_FOTO=$(cfg "c.volgorde.includes('foto')?1:0")
[[ $USE_FOTO == 1 ]] && USE_TEASER=0
FOTO_T=$(cfg "c.foto&&c.foto.tijdstip")
INTRO_DUR=$(cfg "c.intro.duur_seconden+(c.volgorde.includes('foto')?c.foto.oogcontact_seconden:0)")
OUTRO_DUR=$(cfg c.outro.duur_seconden)
CTA_DUR=$(cfg c.cta.duur_seconden)
MUZIEK=$(cfg c.audio.muziek_intro_outro)
RES=$(cfg c.resolutie)

# --- Bron meten -------------------------------------------------------------------
probe() { ffprobe -v error -select_streams "$1" -show_entries "stream=$2" -of default=nw=1:nk=1 "$SRC" | head -1; }
SRC_W=$(probe v:0 width); SRC_H=$(probe v:0 height)
FPS_RAW=$(probe v:0 r_frame_rate)
FPS=$(node -e "const[a,b]='$FPS_RAW'.split('/').map(Number);process.stdout.write(String(Math.round(a/(b||1)*1000)/1000))")
SRC_RANGE=$(probe v:0 color_range)
HAS_AUDIO=$([[ -n "$(probe a:0 codec_type)" ]] && echo 1 || echo 0)
if [[ -n "$RES" ]]; then W=${RES%x*}; H=${RES#*x}; else W=$SRC_W; H=$SRC_H; fi
echo "Bron: ${SRC_W}x${SRC_H} @ ${FPS} fps, audio: $HAS_AUDIO, range: ${SRC_RANGE:-tv}  ->  render ${W}x${H}"

# Seconden <-> frames (alles op hele frames, zodat beeld en geluid niet uit elkaar lopen).
fr() { node -e "process.stdout.write(String(Math.round($1*$FPS)))"; }
sec() { node -e "process.stdout.write(String($1/$FPS))"; }
tosec() { node -e "const s='$1';process.stdout.write(String(s.includes(':')?s.split(':').reduce((a,x)=>a*60+Number(x),0):Number(s)))"; }

BUILD=build
mkdir -p "$BUILD" "$(dirname "$OUT")"

# --- Assets en config naar Remotion -------------------------------------------------
mkdir -p remotion/public
cp -f "$CONFIG_PATH" remotion/src/actief.json
cp -f assets/*.png remotion/public/ 2>/dev/null || true
imginfo() {
  local f="assets/$1"
  if [[ -f "$f" ]]; then
    ffprobe -v error -show_entries stream=width,height -of csv=p=0:s=x "$f" | head -1 | awk -Fx '{printf "{\"w\":%s,\"h\":%s}", $1, $2}'
  else
    echo null
  fi
}
# YFTL (gouden thema): wit logo en witte diamant, want het fc-logo mag niet op goud.
if [[ "$(cfg c.thema)" == yftl ]]; then BM=$(imginfo beeldmerk-wit.png); LOGO=$(imginfo logo-wit.png)
else BM=$(imginfo beeldmerk-goud.png); LOGO=$(imginfo logo-fc-wit.png); fi
if [[ "$BM" == null || "$LOGO" == null ]]; then
  if [[ $PREVIEW == 1 ]]; then
    echo "LET OP: logo-PNG's ontbreken in assets/; preview zonder logo."
  else
    echo "Ontbreekt in assets/: beeldmerk-goud.png en/of logo-fc-wit.png"; exit 1
  fi
fi
FOTO_PROP=$([[ $USE_FOTO == 1 ]] && echo true || echo false)
PROPS="{\"beeldmerk\":$BM,\"logoFc\":$LOGO,\"fps\":$FPS,\"foto\":$FOTO_PROP}"
COMPS=(Intro Outro Cta)
if [[ $USE_FOTO == 1 ]]; then
  [[ -n "$FOTO_T" ]] || { echo "foto.tijdstip ontbreekt in $CONFIG"; exit 1; }
  # "Screenshot" uit de bronvideo, beeldvullend op de eindmaat.
  ffmpeg -v error -y -ss "$(tosec "$FOTO_T")" -i "$SRC" -frames:v 1 \
    -vf "scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos:in_range=${SRC_RANGE:-tv},crop=${W}:${H}" \
    remotion/public/foto.png
fi

# --- Stap 1: Remotion --------------------------------------------------------------
(
  cd remotion
  [[ -d node_modules ]] || npm install --no-audit --no-fund
  BROWSER=()
  for b in /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell; do
    [[ -x "$b" ]] && BROWSER=(--browser-executable="$b") && break
  done
  for comp in "${COMPS[@]}"; do
    lc=$(echo "$comp" | tr '[:upper:]' '[:lower:]')
    npx remotion render src/index.ts "$comp" "../$BUILD/$lc.mp4" --codec=h264 \
      --props="$PROPS" --log=error "${BROWSER[@]}"
  done
)

# --- Stap 2: ffmpeg ------------------------------------------------------------------
VENC=(-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r "$FPS"
      -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv)
AENC=(-c:a aac -b:a 192k -ar 48000 -ac 2)
SCALE="scale=${W}:${H}:force_original_aspect_ratio=decrease:flags=lanczos:in_range=${SRC_RANGE:-tv}:out_range=tv,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x05001e,setsar=1"

if [[ $USE_TEASER == 1 ]]; then
# Teaser: opnieuw encoderen (exact beginframe), heel licht inzoomen 1 -> 1,03, audio 0,4 s fade-out.
T_START=$(tosec "$TEASER_START")
T_FR=$(fr "$TEASER_DUR"); T_DUR=$(sec "$T_FR")
ZOOM="scale=w='trunc(${W}*(1+0.03*t/${T_DUR})/2)*2':h=-2:eval=frame:flags=lanczos,crop=${W}:${H}"
if [[ $HAS_AUDIO == 1 ]]; then TA=(-map 0:a:0); TAF="atrim=0:${T_DUR},afade=t=out:st=$(node -e "process.stdout.write(String($T_DUR-0.4))"):d=0.4"
else TA=(-map 1:a); TAF="atrim=0:${T_DUR}"; fi
ffmpeg -v error -y -ss "$T_START" -i "$SRC" -f lavfi -i anullsrc=r=48000:cl=stereo \
  -t "$T_DUR" -map 0:v:0 "${TA[@]}" -vf "fps=${FPS},${SCALE},${ZOOM},trim=end_frame=${T_FR}" -af "$TAF" \
  -frames:v "$T_FR" "${VENC[@]}" "${AENC[@]}" "$BUILD/n_teaser.mp4"
fi

# Hoofdvideo: volledig. Is het geluid langer dan het beeld, dan wordt het laatste frame
# vastgehouden (geluid wordt nooit afgekapt); daarna alles op hele frames.
# bron_start_seconden: zoveel stilte aan het begin van de bron wordt overgeslagen (0 = niets).
TRIM=$(cfg "c.bron_start_seconden||0")
# bron_voorloop_seconden: houd het eerste beeld zo lang vast (met stilte) als iemand direct begint
# te praten, zodat het eerste woord niet in de overgang vanuit de intro valt. Hele frames.
LEAD_FR=$(fr "$(cfg "c.bron_voorloop_seconden||0")"); LEAD=$(sec "$LEAD_FR")
V_DUR=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=nw=1:nk=1 "$SRC")
A_DUR=$([[ $HAS_AUDIO == 1 ]] && ffprobe -v error -select_streams a:0 -show_entries stream=duration -of default=nw=1:nk=1 "$SRC" || echo 0)
M_FR=$(node -e "process.stdout.write(String(Math.ceil((Math.max($V_DUR,$A_DUR)-$TRIM)*$FPS-1e-6)+$LEAD_FR))")
M_DUR=$(sec "$M_FR")
if [[ $HAS_AUDIO == 1 ]]; then MA=(-map 0:a:0); else MA=(-map 1:a); fi
# Watermerk: klein, half-transparant logo over de voorstelvideo (binnen de veilige marge).
WM_LOGO=$(cfg "c.watermerk&&c.watermerk.logo"); WM_IN=(); VFILT="[0:v]fps=${FPS},${SCALE},tpad=start_mode=clone:start_duration=${LEAD}:stop_mode=clone:stop_duration=5,trim=end_frame=${M_FR}"
if [[ -n "$WM_LOGO" && -f "$WM_LOGO" ]]; then
  WM_W=$(node -e "process.stdout.write(String(Math.round(${W}*$(cfg c.watermerk.breedte_procent)/100/2)*2))")
  WM_A=$(cfg c.watermerk.zichtbaarheid)
  MX=$(node -e "process.stdout.write(String(Math.round(${W}*0.06)))")
  MT=$(node -e "process.stdout.write(String(Math.round(${H}*0.06)))")
  MB=$(node -e "process.stdout.write(String(Math.round(${H}*(${H}>${W}?0.12:0.06))))")
  case $(cfg c.watermerk.positie) in
    rechtsboven) WX="W-w-${MX}"; WY="${MT}";;
    linksonder)  WX="${MX}";     WY="H-h-${MB}";;
    rechtsonder) WX="W-w-${MX}"; WY="H-h-${MB}";;
    *)           WX="${MX}";     WY="${MT}";;
  esac
  WM_IN=(-i "$WM_LOGO")
  VFILT+="[base];[2:v]scale=${WM_W}:-1:flags=lanczos,format=rgba,colorchannelmixer=aa=${WM_A}[wm];[base][wm]overlay=${WX}:${WY}:format=auto"
fi
ffmpeg -v error -y -ss "$TRIM" -i "$SRC" -f lavfi -i anullsrc=r=48000:cl=stereo "${WM_IN[@]}" \
  -filter_complex "${VFILT}[mv]" -map "[mv]" "${MA[@]}" \
  -af "aresample=48000,adelay=delays=$(node -e "process.stdout.write(String(Math.round($LEAD*1000)))"):all=1,apad,atrim=0:${M_DUR}" \
  -frames:v "$M_FR" "${VENC[@]}" "${AENC[@]}" "$BUILD/n_video.mp4"

# Intro, outro, CTA: stilte of muziek (fade in/uit 0,8 s).
for part in intro outro cta; do
  case $part in intro) D=$INTRO_DUR;; outro) D=$OUTRO_DUR;; cta) D=$CTA_DUR;; esac
  P_FR=$(fr "$D"); P_DUR=$(sec "$P_FR")
  if [[ -n "$MUZIEK" ]]; then
    AIN=(-stream_loop -1 -i "$MUZIEK")
    AF="atrim=0:${P_DUR},afade=t=in:d=0.8,afade=t=out:st=$(node -e "process.stdout.write(String($P_DUR-0.8))"):d=0.8"
  else
    AIN=(-f lavfi -i anullsrc=r=48000:cl=stereo)
    AF="atrim=0:${P_DUR}"
  fi
  ffmpeg -v error -y -i "$BUILD/$part.mp4" "${AIN[@]}" -map 0:v:0 -map 1:a:0 \
    -vf "fps=${FPS},scale=${W}:${H}:flags=lanczos,setsar=1,trim=end_frame=${P_FR}" -af "$AF" \
    -frames:v "$P_FR" "${VENC[@]}" "${AENC[@]}" "$BUILD/n_$part.mp4"
done

# Samenvoegen. Overgangen op hele frames; audio telkens mee met acrossfade van dezelfde duur.
#   teaser -> intro: fadeblack 0,5 s | intro -> video: fade 0,6 s | video -> outro: fadeblack 0,8 s
#   outro -> CTA: gewone concat (de achtergrond loopt in Remotion door).
X1=$(sec "$(fr 0.5)"); X2=$(sec "$(fr 0.6)"); X3=$(sec "$(fr 0.8)")
ID=$(sec "$(fr "$INTRO_DUR")"); OD=$(sec "$(fr "$OUTRO_DUR")"); CD=$(sec "$(fr "$CTA_DUR")")
off() { node -e "process.stdout.write(String(Math.round(($1)*1e6)/1e6))"; }

INPUTS=(); VF=""; AF=""
if [[ $USE_TEASER == 1 ]]; then
  TD=$(sec "$T_FR")
  INPUTS+=(-i "$BUILD/n_teaser.mp4" -i "$BUILD/n_intro.mp4")
  VF+="[0:v][1:v]xfade=transition=fadeblack:duration=${X1}:offset=$(off "$TD-$X1")[vi];"
  AF+="[0:a][1:a]acrossfade=d=${X1}:c1=tri:c2=tri[ai];"
  HEAD=$(off "$TD+$ID-$X1"); N=2
else
  INPUTS+=(-i "$BUILD/n_intro.mp4")
  VF+="[0:v]null[vi];"; AF+="[0:a]anull[ai];"
  HEAD=$ID; N=1
fi
INPUTS+=(-i "$BUILD/n_video.mp4" -i "$BUILD/n_outro.mp4" -i "$BUILD/n_cta.mp4")
O2=$(off "$HEAD-$X2")
O3=$(off "$HEAD+$M_DUR-$X2-$X3")
EXPECT=$(off "$HEAD+$M_DUR+$OD+$CD-$X2-$X3")
VF+="[vi][$N:v]xfade=transition=fade:duration=${X2}:offset=${O2}[v2];"
VF+="[v2][$((N+1)):v]xfade=transition=fadeblack:duration=${X3}:offset=${O3}[v3];"
VF+="[v3][$((N+2)):v]concat=n=2:v=1:a=0,format=yuv420p[v];"
AF+="[ai][$N:a]acrossfade=d=${X2}:c1=tri:c2=tri[a2];"
AF+="[a2][$((N+1)):a]acrossfade=d=${X3}:c1=tri:c2=tri[a3];"
AF+="[a3][$((N+2)):a]concat=n=2:v=0:a=1,apad,atrim=0:${EXPECT}[a]"

ffmpeg -v error -y "${INPUTS[@]}" -filter_complex "${VF}${AF}" \
  -map "[v]" -map "[a]" "${VENC[@]}" "${AENC[@]}" -movflags +faststart "$OUT"

echo "Klaar: $OUT"
echo "Verwachte duur: ${EXPECT}s"
ffprobe -v error -show_entries stream=codec_type,duration -of compact=p=0 "$OUT"
