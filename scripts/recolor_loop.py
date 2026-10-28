# Leest rawvideo rgb24 1280x720 van stdin, kleurt de paarse achtergrond naar Topvrouwen-navy,
# maakt er een naadloze loop van (einde crossfade naar begin) en schrijft rawvideo naar stdout.
import sys, numpy as np
W, H, X = 1280, 720, 24
raw = sys.stdin.buffer.read()
f = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
navy = np.array([0.24, 0.216, 0.365], np.float32); navy /= (0.2126*navy[0] + 0.7152*navy[1] + 0.0722*navy[2])
def recolor(a):
    a = a.astype(np.float32) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1); mn = a.min(-1); d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    hw = np.clip(1 - np.abs(((h - 315 + 180) % 360) - 180) / 50, 0, 1)[..., None]
    L = (0.2126*r + 0.7152*g + 0.0722*b)[..., None]
    return np.clip(a*(1-hw) + np.clip(L*navy, 0, 1)*hw, 0, 1)
N = len(f)
out = [recolor(f[i]) for i in range(X, N - X)]
for j in range(X):
    t = (j + 0.5) / X; a = t*t*(3 - 2*t)
    out.append(recolor(f[N - X + j])*(1 - a) + recolor(f[j])*a)
seq = out + out[:3]  # paar frames extra zodat de interpolatie ook over de naad loopt
for o in seq:
    sys.stdout.buffer.write((o*255 + 0.5).astype(np.uint8).tobytes())
sys.stderr.write(f"{len(out)} loopframes\n")
# Gebruik (Motion_TVL_V2, 1280x720 @ 24 fps -> 30 s loop, 1920x1080 @ 30 fps):
#   ffmpeg -i motion.mp4 -f rawvideo -pix_fmt rgb24 - | python3 scripts/recolor_loop.py \
#     | ffmpeg -f rawvideo -pix_fmt rgb24 -s 1280x720 -r 24 -i - -c:v libx264 -crf 8 -pix_fmt yuv444p loopsrc.mp4
#   ffmpeg -i loopsrc.mp4 -vf "setpts=PTS*30/6.375,minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,\
#     trim=end_frame=900,scale=1920:1080:flags=lanczos,format=yuv420p" -c:v libx264 -crf 14 loop.mp4
