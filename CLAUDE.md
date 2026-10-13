# Opdracht: intro + outro (met call to action) voor een Topvrouwen Limburg-video

Je maakt van een bestaande voorstelvideo een complete video in deze **vaste volgorde**:

| # | Onderdeel | Wat | Duur |
|---|---|---|---|
| 1 | **Teaser** | Kort fragment uit de video: je ziet de persoon al even | ± 4 s |
| 2 | **Intro** | Geanimeerde merkintro Topvrouwen Limburg | ± 5 s |
| 3 | **Video** | De volledige voorstelvideo, van begin tot eind | origineel |
| 4 | **Outro** | Afsluiter: naam van de persoon, categorie, logo + payoff | ± 4 s |
| 5 | **Call to action** | Tickets: datum/locatie, knop "Koop hier je tickets", URL | ± 7 s |

Alles strikt in de huisstijl van Topvrouwen Limburg (zie "Huisstijl" hieronder).
Teksten en tijden staan in `config.json`.

## Stap 0 — Controleren voor je begint

1. Lees `config.json`. Staat er nog ergens tekst tussen `[HAKEN]`? **Stop dan en vraag
   de gebruiker om die teksten.** Verzin nooit zelf een datum, locatie of URL.
2. Controleer of `input/voorstelvideo.mp4` (of het pad in `config.json`) bestaat.
3. Controleer `ffmpeg`, `ffprobe` en Node.js 18+. Ontbreekt iets: zeg wat en hoe je het
   installeert (macOS: `brew install ffmpeg node`).
4. Staat `resolutie` in `config.json`, render dan alles op die maat (bron wordt geschaald). Meet daarnaast de bronvideo met `ffprobe`: breedte, hoogte, framerate, pixelformaat, audio
   (samplerate, kanalen, of er überhaupt audio is). **Intro en outro krijgen exact
   dezelfde resolutie en framerate** als de bron. Dus 1920×1080 → liggend ontwerp,
   1080×1920 → staand ontwerp, 1080×1350 → 4:5. Andere maat: vraag het even.

## Stap 0b — Teaserfragment kiezen

- Staat `teaser.start` ingevuld: gebruik dat tijdstip met `teaser.duur_seconden`.
- Staat hij op `null`: kies **3 kandidaten** uit de video en vraag de gebruiker welke.
  Werkwijze: exporteer elke 2 s een still (`ffmpeg -vf fps=0.5`), kijk waar de persoon
  goed en groot in beeld is, en zoek met `silencedetect` een stukje dat op een
  natuurlijke pauze begint en eindigt (geen afgebroken zin). Liefst een sterk, kort
  moment: een lach, een krachtige uitspraak. Niet de allereerste seconden van de video
  (die komen straks toch). Laat per kandidaat het tijdstip + een still zien.
- Het fragment wordt **niet** uit de hoofdvideo geknipt: de video speelt later gewoon
  volledig af.

## Stap 1 — Bouwen met Remotion

Gebruik **Remotion** (React → video) in een map `remotion/`:

- `npx create-video@latest remotion --blank` (of handmatig opzetten), TypeScript.
- Font: `@remotion/google-fonts/OpenSans`, gewichten 400, 500, 700. Geen ander font.
- Kopieer `assets/` naar `remotion/public/` en laad ze met `staticFile()`.
- Drie composities: `Intro`, `Outro` en `Cta`, met width/height/fps uit de ffprobe-meting
  en duur uit `config.json`. Lees teksten uit `config.json` (importeer het bestand),
  zet ze niet hard in de code.
- Maak alle maten **relatief aan de korte zijde** van het beeld (`const u = Math.min(width, height) / 1080`)
  zodat hetzelfde ontwerp werkt voor liggend én staand.

Render daarna:
```
npx remotion render Intro ../build/intro.mp4 --codec=h264
npx remotion render Outro ../build/outro.mp4 --codec=h264
npx remotion render Cta ../build/cta.mp4 --codec=h264
```

## Stap 2 — Samenvoegen met ffmpeg

- Knip de teaser uit de bron (`-ss <start> -t <duur>`, opnieuw encoderen, niet `-c copy`,
  anders klopt het beginframe niet). Audio van de teaser: 0,4 s fade-out aan het eind.
- Normaliseer alle vijf de stukken (teaser, intro, video, outro, cta) naar dezelfde codec/fps/pixelformaat
  (`libx264`, `yuv420p`, `-r <bron-fps>`), audio `aac` 48 kHz stereo.
- Intro, outro en CTA hebben geen eigen audio, tenzij `audio.muziek_intro_outro` is ingevuld:
  maak dan een muziekspoor met fade-in en fade-out (±0,8 s). Anders: stille audio
  (`anullsrc`) zodat concat werkt.
- **Overgangen** (audio telkens mee met `acrossfade` van dezelfde duur):
  - teaser → intro: `xfade=transition=fadeblack`, 0,5 s (korte "dip", voelt als een
    bewuste overgang van fragment naar merk);
  - intro → video: `xfade=transition=fade`, 0,6 s;
  - video → outro: `xfade=transition=fadeblack`, 0,8 s;
  - outro → CTA: **geen ffmpeg-overgang**. Beide hebben hetzelfde nachtverloop; laat
    de outro-tekst in Remotion zelf uitfaden (laatste 0,5 s) en de CTA-tekst inkomen,
    zodat de achtergrond doorloopt en het één vloeiend eindstuk lijkt. Gewoon concat.
- Het geluid van de bronvideo **nooit** harder/zachter maken of afkappen, behalve de
  korte crossfades.
- Schrijf naar het `output`-pad uit `config.json`. Eén ffmpeg-commando of een klein
  script `build.sh` dat alles van begin tot eind doet, zodat de gebruiker het later
  opnieuw kan draaien met andere teksten.

## Stap 3 — Zelf controleren

- Exporteer stills met ffmpeg op: eerste frame teaser, intro 0,5 s / 2 s / 4 s,
  outro 2 s, CTA 1 s / 4 s / laatste frame.
  Bekijk ze en loop de checklist onderaan na. Repareer wat niet klopt, render opnieuw.
- Controleer met ffprobe dat de eindvideo de juiste duur heeft
  (teaser + intro + bron + outro + cta − crossfades) en dat audio en beeld even lang zijn.
- Laat de gebruiker daarna weten: waar het bestand staat, de duur, en de stills.

---

## Huisstijl Topvrouwen Limburg (bron: design system "Topvrouwen Limburg")

**Gevoel:** feestelijk en waardig. Diep nachtblauw met goud, een diamant als
beeldmerk, veel ruimte, weinig ornament. Het gaat om de vrouwen, niet om de organisatie.

### Kleuren (gebruik alleen deze)
| Token | Hex | Gebruik in video |
|---|---|---|
| navy-950 | `#05001e` | Hoofdachtergrond |
| navy-900 | `#130e2e` | Middelste stop van het nachtverloop |
| navy-700 | `#3d375d` | Lichtste stop van het nachtverloop (rechtsonder) |
| gold-500 | `#caa54f` | Koppen, eyebrows, knoptekst, lijnen |
| gold-300 | `#f7d98e` | Hooglicht in glans-effect |
| gold-200 | `#fde196` | Lichtste hooglicht |
| gold-700 | `#ad7132` | Donkerste stop van goudverloop |
| wit | `#ffffff` | Tekst; lopende tekst in wit 70% |

- **Achtergrond = nachtverloop:** lineair, van navy-950 (linksboven) via navy-900 naar
  navy-700 (rechtsonder). `assets/achtergrond-nacht-referentie.png` laat zien hoe dat eruit
  ziet; bouw het verloop zelf na in CSS zodat het scherp is in elke resolutie. Niet die
  PNG uitrekken.
- Goud alleen als accent. Nooit goudkleurige tekst op een wit vlak behalve in de knop (zie onder).

### Typografie
- Alleen **Open Sans**. 700 voor koppen, 500 voor eyebrows, 400 voor lopende tekst.
- **Eyebrow** (`meta`): KAPITALEN, gewicht 500, letterspacing ≈ 0,18em, kleur gold-500,
  met een dunne gouden lijn rechts ernaast (heading-line, 1px-equivalent, opacity 0,6).
- **Koppen**: zinshoofdletter (geen kapitalen), gewicht 700, kleur gold-500.
- **Payoff** "Versterken & Inspireren": altijd letterlijk, met ampersand.
- Teksten in het Nederlands, je/jij. **Geen emoji.**

Richtmaten bij 1920×1080 (schaal met `u`):
| Element | Grootte |
|---|---|
| Hoofdkop intro | 88px / 700, line-height 1.1 |
| CTA-kop outro | 76px / 700 |
| Eyebrow | 26px / 500, letterspacing 4px |
| Payoff | 30px / 500, KAPITALEN, letterspacing 4px, wit |
| Knop | hoogte 96px, padding 0 52px, tekst 34px / 700 |
| URL / socials | 30px / 400, wit 70% |

(Webmaten uit het design system — 54px kop, 11px eyebrow — zijn voor schermen; op video
moet alles groter. Verhoudingen en gewichten blijven gelijk.)

### Knop (call to action)
Pilvorm (volledig afgerond), **witte pil met gold-500 tekst**, zinshoofdletter:
"Koop hier je tickets". Dit is de primaire knop op donker, exact zoals op de website.
Kleine ronde schaduw `0 0 40px rgba(0,0,0,0.5)` mag.

### Logo's (`assets/`)
- `logo-fc-wit.png` — volledig logo, wit + goud. **Dit is het logo op navy.**
- `beeldmerk-goud.png` — alleen de diamant. Voor de openingsanimatie en als klein merkteken.
- `logo-wit.png` — eenkleurig wit, alleen als het fc-logo niet leest.
- **Nooit** hertekenen, vervormen, herkleuren, of de diamant als SVG nabouwen.
  Animeren mag alleen met transform/opacity/mask op de PNG zelf.

### Beweging
- Rustig en waardig: easing `Easing.bezier(0.22, 1, 0.36, 1)` (ease-out), geen bounce,
  geen spring met overshoot, geen draaiende of stuiterende elementen.
- Tekst komt binnen met fade + 24px (× u) omhoog schuiven, 0,5–0,7 s, items 0,15 s na elkaar.
- Eén mag: een **gouden glans** die eenmaal diagonaal over de diamant strijkt
  (mask met lineair verloop transparant → gold-200 → transparant, `mix-blend-mode: screen`
  of als mask over de PNG). Eén keer, niet loopen.
- Heel subtiele "zwevende" goudstofjes op de achtergrond mag, maximaal 20 stipjes,
  opacity < 0,25, langzaam. Liever niets dan te veel.

---

## Scenario intro (standaard 5 s)

| Tijd | Wat |
|---|---|
| 0,0–0,6 s | Nachtverloop, leeg. Zachte vignettering. |
| 0,3–1,4 s | `beeldmerk-goud.png` verschijnt in het midden: opacity 0→1, scale 0,92→1. |
| 1,2–2,0 s | Gouden glans strijkt één keer over de diamant. |
| 1,8–2,6 s | Diamant schuift omhoog/kleiner; `logo-fc-wit.png` vervangt hem met een crossfade (de diamant in het logo landt op dezelfde plek). |
| 2,4–3,4 s | Eronder: eyebrow (`intro.eyebrow`) met gouden lijn, daarna de kop (`intro.titel`). |
| 3,4–4,4 s | Stilstaan, leesbaar. |
| 4,4–5,0 s | Hier start de crossfade naar de video (gebeurt in ffmpeg, dus de compositie moet tot het eind gewoon zichtbaar blijven). |

Staand (9:16): logo hoger in beeld (± 32% van boven), tekst eronder, gecentreerd.
Liggend (16:9): alles gecentreerd, logo max. 22% van de beeldhoogte.

## Scenario teaser (± 4 s)

Puur het fragment uit de video, onbewerkt beeld en geluid. Geen tekst, geen logo,
geen kader eroverheen: de persoon moet direct het gevoel geven "wie is dit?".
Eventueel heel licht inzoomen (scale 1 → 1,03 over de hele duur) mag, verder niets.

## Scenario outro (± 4 s)

| Tijd | Wat |
|---|---|
| 0,0–0,8 s | Nachtverloop komt op (ffmpeg doet de fade vanuit de video). |
| 0,4–1,2 s | Eyebrow `outro.eyebrow` (bijv. GENOMINEERD TOPVROUW LIMBURG 2026) met gouden lijn. |
| 0,6–1,6 s | Naam `persoon.naam` groot in gold-500, 700, zinshoofdletter (88px × u). |
| 1,4–2,2 s | Onder de naam: `logo-fc-wit.png` klein + payoff "Versterken & Inspireren". |
| 2,2–3,5 s | Stilstaan. |
| 3,5–4,0 s | Naam, eyebrow en payoff faden uit (0,5 s); **het logo blijft staan** en schuift door naar zijn plek in de CTA. Achtergrond blijft. |

Kleurregel per categorie: Topvrouw en Publieksfavoriet → nachtverloop zoals beschreven.
Young Female Talent → mag in de outro een dunne gouden lijn/accent extra krijgen, maar
de achtergrond blijft nachtblauw (anders sluit de CTA er niet op aan).

## Scenario call to action (± 7 s)

| Tijd | Wat |
|---|---|
| 0,0 s | Zelfde nachtverloop als de outro; het logo staat al klein onderaan (doorgeschoven uit de outro). |
| 0,0–0,8 s | Eyebrow `cta.eyebrow_datum_locatie` met gouden lijn. |
| 0,2–1,2 s | Kop `cta.kop` in goud. |
| 0,8–1,6 s | Knop `cta.knop` (witte pil, gouden tekst) schaalt licht in 0,96 → 1. |
| 1,2–2,0 s | Daaronder `cta.url` in wit 70%, iets kleiner; naast het logo onderaan `cta.socials`. |
| 2,0–7,0 s | **Alles blijft staan** zodat mensen de URL kunnen lezen. Eén subtiele glans over de knop rond 3,5 s. Laatste 0,5 s: geheel fade naar navy-950. |

---

## Checklist (doorlopen voor je oplevert)

- [ ] Geen `[HAKEN]`-tekst meer in beeld; geen verzonnen datum/locatie/URL.
- [ ] Alleen Open Sans; koppen in zinshoofdletter, eyebrows/payoff in KAPITALEN.
- [ ] Alleen de kleuren uit de tabel; achtergrond is het nachtverloop, geen zwart.
- [ ] Logo is de originele PNG, niet vervormd of herkleurd, niet op een goud vlak.
- [ ] Volgorde klopt: teaser → intro → volledige video → outro → CTA.
- [ ] Teaser begint en eindigt niet midden in een woord; de hoofdvideo is niet ingekort.
- [ ] Naam van de persoon correct gespeld (exact zoals in config).
- [ ] Outro → CTA voelt als één doorlopend eindstuk (geen flits of zwart ertussen).
- [ ] Knop: witte pil, gouden tekst, "Koop hier je tickets" (of tekst uit config).
- [ ] Alle tekst binnen de veilige marge: 6% rondom (staand: 12% onder, i.v.m. Instagram/TikTok-UI).
- [ ] Resolutie en fps van intro/outro = bronvideo; audio loopt synchroon tot het einde.
- [ ] Geen emoji, geen bounce, geen overdreven effecten.
