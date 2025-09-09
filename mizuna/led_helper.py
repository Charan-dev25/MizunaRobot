import sys
import time
import board
import neopixel
import os
import random
import math

LED_COUNT = 64
pixels = neopixel.NeoPixel(board.D21, LED_COUNT, brightness=0.45, auto_write=False)

COLORS = {
    'listening': (0, 100, 255),     # Kept for reference, not directly used by new animations
    'wake_detected': (255, 165, 0),
    'conversation': (0, 255, 0),
    'speaking': (255, 0, 255),
    'thinking': (255, 255, 0),
    'off': (0, 0, 0)
}

def wheel(pos):
    # Generate rainbow colors across 0-255 positions.
    pos = pos % 256
    if pos < 85:
        return (int(pos * 3), int(255 - pos * 3), 0)
    elif pos < 170:
        pos -= 85
        return (int(255 - pos * 3), 0, int(pos * 3))
    else:
        pos -= 170
        return (0, int(pos * 3), int(255 - pos * 3))

# ---- Color helpers ----

def clamp(x, lo=0, hi=255):
    return max(lo, min(hi, x))

def hsv_to_rgb(h, s, v):
    # h in [0,1], s,v in [0,1]
    i = int(h * 6.0)
    f = h * 6.0 - i
    p = int(255 * v * (1.0 - s))
    q = int(255 * v * (1.0 - f * s))
    t = int(255 * v * (1.0 - (1.0 - f) * s))
    v = int(255 * v)
    i = i % 6
    if i == 0: return (v, t, p)
    if i == 1: return (q, v, p)
    if i == 2: return (p, v, t)
    if i == 3: return (p, q, v)
    if i == 4: return (t, p, v)
    return (v, p, q)

# Simple gamma correction LUT for smoother lows
_GAMMA = [int(((i / 255.0) ** 2.2) * 255 + 0.5) for i in range(256)]
def gamma(color):
    r, g, b = color
    return (_GAMMA[clamp(r)], _GAMMA[clamp(g)], _GAMMA[clamp(b)])

def fade(c, f):
    r, g, b = c
    return (int(r * f), int(g * f), int(b * f))

def add(c1, c2):
    return (clamp(c1[0] + c2[0]), clamp(c1[1] + c2[1]), clamp(c1[2] + c2[2]))

# ---- Animations ----

# Listening: enhanced aurora with multi-color waves and denser sparkles
def blue_dot(wait=0.018, steps=96, state_name=None):
    for j in range(steps):
        if state_name and read_state() != state_name:
            return
        t = j * 0.06
        for i in range(LED_COUNT):
            # Multi-hue cool range with layered waves
            hue = (0.52 + 0.12 * math.sin(i * 0.08 - t) + 0.06 * math.sin(i * 0.20 + t * 0.8) + 0.03 * math.sin(i * 0.30 - t * 0.5)) % 1.0
            v = 0.30 + 0.40 * (0.5 * (1 + math.sin(i * 0.25 + t))) + 0.20 * (0.5 * (1 + math.sin(i * 0.12 - t * 0.7))) + 0.10 * (0.5 * (1 + math.sin(i * 0.18 + t * 0.4)))
            s = 0.70 + 0.25 * (0.5 * (1 + math.sin(i * 0.15 - t * 0.9)))
            col = hsv_to_rgb(hue, min(1.0, s), min(1.0, v))
            pixels[i] = gamma(col)

        # Denser sparkles with varied colors
        for _ in range(max(2, LED_COUNT // 15)):
            idx = random.randint(0, LED_COUNT - 1)
            sparkle_hue = (0.55 + 0.20 * random.random()) % 1.0
            tw = hsv_to_rgb(sparkle_hue, 0.20, 1.0)
            pixels[idx] = add(pixels[idx], gamma(fade(tw, 0.30 + random.random() * 0.40)))

        pixels.show()
        time.sleep(wait)

# Wake detected: vibrant warm vortex with expanding rings and confetti
def chase(color1=None, color2=(0,0,0), wait=0.020, steps=72, state_name=None):
    tail = max(12, LED_COUNT // 3)
    for c in range(steps):
        if state_name and read_state() != state_name:
            return

        # Warm base with hue shifts
        phi = c * 0.30
        for i in range(LED_COUNT):
            hue = (0.08 + 0.08 * math.sin(i * 0.08 + phi) + 0.04 * math.sin(i * 0.15 - phi * 0.6)) % 1.0
            v = 0.20 + 0.30 * (0.5 * (1 + math.sin(i * 0.20 - phi * 1.5))) + 0.15 * (0.5 * (1 + math.sin(i * 0.10 + phi * 0.8)))
            s = 0.80 + 0.15 * (0.5 * (1 + math.sin(i * 0.12 + phi * 0.5)))
            pixels[i] = gamma(hsv_to_rgb(hue, s, v))

        # Bright arc with longer tail
        head = (c * 4) % LED_COUNT
        for k in range(tail):
            pos = (head - k) % LED_COUNT
            f = math.exp(-(k * k) / (2.0 * (tail * 0.35) ** 2))
            hue = 0.10 - 0.03 * (k / tail)
            col = hsv_to_rgb(hue % 1.0, 1.0, min(1.0, 0.5 + 0.9 * f))
            pixels[pos] = add(pixels[pos], gamma(col))

        # More confetti with varied hues
        for _ in range(max(3, LED_COUNT // 6)):
            idx = random.randint(0, LED_COUNT - 1)
            sparkle_h = 0.05 + 0.15 * random.random()
            sparkle = hsv_to_rgb(sparkle_h, 0.5 + 0.5 * random.random(), 0.8 + 0.2 * random.random())
            pixels[idx] = add(pixels[idx], gamma(sparkle))

        pixels.show()
        time.sleep(wait)

# Conversation: lush multi-green waves with floating highlights and twinkles
def green_pulse(wait=0.014, steps=96, state_name=None):
    for step in range(steps):
        if state_name and read_state() != state_name:
            return
        off = step * 0.12
        for i in range(LED_COUNT):
            hue = (0.32 + 0.12 * math.sin(i * 0.07 + off) + 0.06 * math.sin(i * 0.16 - off * 0.8) + 0.03 * math.sin(i * 0.25 + off * 0.6)) % 1.0
            v = 0.25 + 0.40 * (0.5 * (1 + math.sin(i * 0.23 + off))) + 0.25 * (0.5 * (1 + math.sin(i * 0.09 - off * 1.3))) + 0.10 * (0.5 * (1 + math.sin(i * 0.14 + off * 0.5)))
            s = 0.60 + 0.35 * (0.5 * (1 + math.sin(i * 0.12 - off * 1.0)))
            pixels[i] = gamma(hsv_to_rgb(hue, min(1.0, s), min(1.0, v)))

        # Wider highlight band
        band_center = (step * 3) % LED_COUNT
        band_sigma = max(4.0, LED_COUNT * 0.10)
        for i in range(LED_COUNT):
            dx = min((i - band_center) % LED_COUNT, (band_center - i) % LED_COUNT)
            f = math.exp(-(dx * dx) / (2.0 * band_sigma * band_sigma)) * 0.7
            if f > 0.02:
                col = hsv_to_rgb(0.45, 0.30, min(1.0, 0.6 + f))
                pixels[i] = add(pixels[i], gamma(col))

        # More twinkles
        for _ in range(max(2, LED_COUNT // 12)):
            idx = random.randint(0, LED_COUNT - 1)
            tw = hsv_to_rgb(0.20, 0.20, 1.0)
            pixels[idx] = add(pixels[idx], gamma(fade(tw, 0.30 + random.random() * 0.30)))

        pixels.show()
        time.sleep(wait)

# Speaking: dynamic magenta nebula with cascading sparks
def magenta_sparkle(wait=0.018, steps=96, state_name=None):
    palette = [
        (255, 0, 255), (230, 0, 255), (200, 0, 255),
        (255, 40, 200), (255, 80, 230), (190, 20, 210),
        (255, 100, 255), (220, 50, 255)
    ]
    buf = [0.0] * LED_COUNT
    colors = [random.choice(palette) for _ in range(LED_COUNT)]

    for t in range(steps):
        if state_name and read_state() != state_name:
            return

        for i in range(LED_COUNT):
            hue = (0.83 + 0.06 * math.sin(i * 0.10 + t * 0.14) + 0.03 * math.sin(i * 0.18 - t * 0.25)) % 1.0
            v = 0.25 + 0.30 * (0.5 * (1 + math.sin(i * 0.18 + t * 0.28))) + 0.20 * (0.5 * (1 + math.sin(i * 0.12 - t * 0.22)))
            s = 0.75 + 0.20 * (0.5 * (1 + math.sin(i * 0.15 + t * 0.18)))
            pixels[i] = gamma(hsv_to_rgb(hue, s, v))

        for i in range(LED_COUNT):
            buf[i] *= 0.85

        sparks = max(2, LED_COUNT // 6)
        for _ in range(sparks):
            i = random.randint(0, LED_COUNT - 1)
            buf[i] = min(1.0, buf[i] + 0.8 + random.random() * 0.4)
            colors[i] = random.choice(palette)

        blurred = [0.0] * LED_COUNT
        for i in range(LED_COUNT):
            blurred[i] = (
                0.50 * buf[i] +
                0.25 * buf[(i - 1) % LED_COUNT] +
                0.25 * buf[(i + 1) % LED_COUNT]
            )

        for i in range(LED_COUNT):
            spark = fade(colors[i], min(1.0, blurred[i]))
            pixels[i] = add(pixels[i], gamma(spark))

        pixels.show()
        time.sleep(wait)

# Thinking: full rainbow cascade with comets and glitter
def yellow_comet(wait=0.012, steps=120, state_name=None):
    tail = max(15, LED_COUNT // 3)
    for c in range(steps):
        if state_name and read_state() != state_name:
            return

        base_shift = (c * 5) % 256
        for i in range(LED_COUNT):
            col = wheel((base_shift + i * 4) % 256)
            v = 0.20 + 0.25 * (0.5 * (1 + math.sin(i * 0.16 - c * 0.14))) + 0.15 * (0.5 * (1 + math.sin(i * 0.08 + c * 0.10)))
            pixels[i] = gamma(fade(col, v))

        head1 = (c * 3) % LED_COUNT
        head2 = (-c * 3) % LED_COUNT
        for k in range(tail):
            f = math.exp(-(k * k) / (2.0 * (tail * 0.35) ** 2))
            pos1 = (head1 - k) % LED_COUNT
            pos2 = (head2 - k) % LED_COUNT
            col1 = wheel(int((k * 256 / tail + c * 8)) % 256)
            col2 = wheel(int((k * 256 / tail - c * 8)) % 256)
            pixels[pos1] = add(pixels[pos1], gamma(fade(col1, 0.5 + 0.9 * f)))
            pixels[pos2] = add(pixels[pos2], gamma(fade(col2, 0.5 + 0.9 * f)))

        for _ in range(max(3, LED_COUNT // 8)):
            idx = random.randint(0, LED_COUNT - 1)
            glitter = (240, 240, 240)
            pixels[idx] = add(pixels[idx], gamma(fade(glitter, 0.40 + random.random() * 0.40)))

        pixels.show()
        time.sleep(wait)

# Matrix-style: falling green characters simulation with trails
def matrix_fall(wait=0.015, steps=100, state_name=None):
    trails = [0] * LED_COUNT
    speeds = [random.uniform(0.5, 2.0) for _ in range(LED_COUNT)]
    for step in range(steps):
        if state_name and read_state() != state_name:
            return
        for i in range(LED_COUNT):
            trails[i] *= 0.92  # Decay
            if random.random() < 0.05:  # Chance to start new trail
                trails[i] = 1.0
        for i in range(LED_COUNT):
            if trails[i] > 0.01:
                hue = 0.35 + 0.05 * random.random()  # Green variations
                v = trails[i]
                pixels[i] = gamma(hsv_to_rgb(hue, 0.8, v))
            else:
                pixels[i] = (0, 0, 0)
        pixels.show()
        time.sleep(wait)

def write_state(state):
    with open(".led_state", "w") as f:
        f.write(state)

def read_state():
    try:
        with open(".led_state", "r") as f:
            return f.read().strip()
    except Exception:
        return None

def set_led_state(state):
    print(f"LED State: {state}")
    write_state(state)
    if state == 'listening':
        blue_dot(state_name=state)
    elif state == 'wake_detected':
        chase((255,165,0), (255,255,255), state_name=state)
    elif state == 'conversation':
        green_pulse(state_name=state)
    elif state == 'speaking':
        magenta_sparkle(state_name=state)
    elif state == 'thinking':
        yellow_comet(state_name=state)
    else:
        pixels.fill(COLORS['off'])
        pixels.show()

def led_pulse(color, duration=1.0, steps=20):
    r, g, b = color
    for i in range(steps):
        # Smooth triangle wave brightness
        phase = (i / steps) * 2 * math.pi
        brightness = 0.15 + 0.85 * (0.5 * (1 - math.cos(phase)))
        pulse_color = (int(r * brightness), int(g * brightness), int(b * brightness))
        pixels.fill(gamma(pulse_color))
        pixels.show()
        time.sleep(duration / steps)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: sudo python led_helper.py <set|pulse> ...")
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "set" and len(sys.argv) == 3:
        set_led_state(sys.argv[2])
    elif cmd == "pulse" and len(sys.argv) == 5:
        color = (int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]))
        led_pulse(color)
    else:
        print("Invalid command or arguments.")
        sys.exit(1)
