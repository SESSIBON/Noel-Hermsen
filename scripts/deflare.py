# Maakt de felle lensflits in de diamant-motion minder fel; de rest van het beeld blijft origineel.
#  1) het brede lichtwaas van de flits gaat van de achtergrond af (draden en flitskern beschermd);
#  2) het allerfelste wordt zacht afgevlakt, kleur blijft gelijk.
# Werkt alleen tijdens de flits (sterkte volgt hoe fel het hele beeld is).
# rawvideo rgb24 1920x1080 via stdin -> stdout. Argument: referentieframes zonder flits (rgb24 raw).
import sys, numpy as np
from PIL import Image, ImageFilter
W, H = 1920, 1080
def lowfreq(a8):  # grof lichtniveau (blur r=40), op kwart-resolutie berekend voor snelheid
    im = Image.fromarray(a8).resize((W // 4, H // 4), Image.BILINEAR).filter(ImageFilter.GaussianBlur(10))
    return np.asarray(im.resize((W, H), Image.BILINEAR), np.float32) / 255
lum = lambda x: 0.3*x[..., 0] + 0.59*x[..., 1] + 0.11*x[..., 2]
ref_raw = np.fromfile(sys.argv[1], np.uint8).reshape(-1, H, W, 3)
ref = np.mean([lowfreq(r) for r in ref_raw], 0)
ref_mean = np.mean([r.mean() for r in ref_raw]) / 255
fs = W*H*3
while True:
    buf = sys.stdin.buffer.read(fs)
    if len(buf) < fs: break
    a8 = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    a = a8.astype(np.float32) / 255
    s = float(np.clip((a.mean() - ref_mean - 0.01) / 0.08, 0, 1))
    if s <= 0:
        sys.stdout.buffer.write(buf); continue
    b = lowfreq(a8)
    excess = np.clip(b - ref, 0, 1)
    protect = np.maximum(np.clip((lum(a) - lum(b))*5, 0, 1), np.clip((lum(a) - 0.55)/0.2, 0, 1))[..., None]
    o = a - excess*0.75*(1 - protect)*s
    L = o.max(-1, keepdims=True)
    o = np.where(L > 0.75, o*(1 - s + s*(0.75 + (L - 0.75)*0.4)/np.maximum(L, 1e-6)), o)
    sys.stdout.buffer.write((np.clip(o, 0, 1)*255 + 0.5).astype(np.uint8).tobytes())
