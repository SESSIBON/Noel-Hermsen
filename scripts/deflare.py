# Haalt de felle lensflits uit de diamant-motion: het brede lichtwaas wordt per frame teruggeschaald
# naar het 'normale' licht (referentie = frames zonder flits), en een witte flitskern krijgt een goudtint.
# rawvideo rgb24 1920x1080 in -> uit.  Argument: pad naar referentieframes (rgb24 raw).
import sys, numpy as np
from PIL import Image, ImageFilter
W, H = 1920, 1080
w, h = W // 4, H // 4
def lowfreq(a):  # grof lichtniveau, op kwart-resolutie berekend en terug opgeschaald
    im = Image.fromarray(a).resize((w, h), Image.BILINEAR).filter(ImageFilter.GaussianBlur(10))
    return np.asarray(im.resize((W, H), Image.BILINEAR), np.float32) / 255
lum = lambda x: 0.3*x[..., 0] + 0.59*x[..., 1] + 0.11*x[..., 2]
ref_raw = np.fromfile(sys.argv[1], np.uint8).reshape(-1, H, W, 3)
ref = lum(np.mean([lowfreq(r) for r in ref_raw], 0))
gold = np.array([1, 0.85, 0.6], np.float32)
fs = W*H*3
while True:
    buf = sys.stdin.buffer.read(fs)
    if len(buf) < fs: break
    a8 = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    a = a8.astype(np.float32) / 255
    f = np.clip((ref + 0.02) / (lum(lowfreq(a8)) + 0.02), 0.35, 1) ** 0.7
    o = a * f[..., None]
    white = np.clip((o.min(-1, keepdims=True) - 0.5) / 0.4, 0, 1)
    o = o * (1 - white * (1 - gold) * 0.8)
    sys.stdout.buffer.write((np.clip(o, 0, 1)*255 + 0.5).astype(np.uint8).tobytes())
