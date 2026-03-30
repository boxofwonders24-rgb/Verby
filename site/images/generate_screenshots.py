"""Generate product screenshot mockups for Verby website SEO."""
from PIL import Image, ImageDraw, ImageFont
import os

DIR = os.path.dirname(os.path.abspath(__file__))

BG = (5, 5, 8)
CARD_BG = (15, 15, 22)
BORDER = (30, 30, 40)
WHITE = (241, 245, 249)
GRAY = (148, 163, 184)
DIM = (71, 85, 105)
ACCENT = (99, 102, 241)
TEAL = (20, 184, 166)
RED = (244, 63, 94)
GREEN = (16, 185, 129)

def get_font(size):
    for p in ['/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Helvetica.ttc']:
        try:
            return ImageFont.truetype(p, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()

def get_bold(size):
    for p in ['/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/System/Library/Fonts/Helvetica.ttc']:
        try:
            return ImageFont.truetype(p, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()

def draw_rounded_rect(draw, xy, radius, fill, outline=None):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline)

def draw_waveform(draw, x, y, w, h, color, num_bars=20):
    """Draw a simple audio waveform visualization."""
    import random
    random.seed(42)
    bar_w = max(2, w // (num_bars * 2))
    gap = max(1, bar_w)
    for i in range(num_bars):
        bar_h = int(random.uniform(0.2, 1.0) * h)
        bx = x + i * (bar_w + gap)
        by = y + (h - bar_h) // 2
        alpha = min(1.0, 0.4 + (i / num_bars) * 0.6)
        r = int(color[0] * alpha + BG[0] * (1 - alpha))
        g = int(color[1] * alpha + BG[1] * (1 - alpha))
        b = int(color[2] * alpha + BG[2] * (1 - alpha))
        draw.rounded_rectangle([bx, by, bx + bar_w, by + bar_h], radius=bar_w//2, fill=(r, g, b))


def generate_email_screenshot():
    """Screenshot showing voice → email generation."""
    W, H = 900, 560
    img = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(img)

    # App window frame
    draw_rounded_rect(draw, [40, 30, W-40, H-30], 16, CARD_BG, BORDER)

    # Title bar dots
    for i, c in enumerate([(255,95,87), (255,189,46), (39,201,63)]):
        draw.ellipse([60 + i*20, 48, 72 + i*20, 60], fill=c)

    # Title
    draw.text((W//2 - 30, 45), "Verby", font=get_bold(14), fill=ACCENT)

    # Step 1: Voice input
    draw_rounded_rect(draw, [60, 80, W-60, 165], 12, (20, 18, 30), (40, 38, 55))
    draw.text((80, 90), "YOU SAID", font=get_bold(10), fill=DIM)
    draw_waveform(draw, 80, 112, 200, 30, ACCENT)
    draw.text((80, 118), '"Tell John we need to push the meeting to Friday"', font=get_font(13), fill=GRAY)

    # Arrow
    draw.text((W//2 - 10, 175), "↓", font=get_bold(20), fill=ACCENT)

    # Step 2: Generated email
    draw_rounded_rect(draw, [60, 200, W-60, H-50], 12, (12, 20, 18), (30, 50, 40))
    draw.text((80, 212), "GENERATED EMAIL", font=get_bold(10), fill=TEAL)

    y = 240
    lines = [
        ("Hi John,", WHITE),
        ("", WHITE),
        ("I wanted to let you know we'll need to push our", GRAY),
        ("meeting to Friday. The API integration isn't quite", GRAY),
        ("ready yet, and I'd rather wait until we have", GRAY),
        ("something solid to show.", GRAY),
        ("", WHITE),
        ("Let me know if Friday works for you.", GRAY),
        ("", WHITE),
        ("Best,", GRAY),
        ("[Your name]", GRAY),
    ]
    for text, color in lines:
        if text:
            draw.text((80, y), text, font=get_font(13), fill=color)
        y += 20

    # "Injected at cursor" badge
    draw_rounded_rect(draw, [W-250, H-70, W-70, H-45], 8, (20, 35, 30), TEAL)
    draw.text((W-240, H-65), "✓ Injected at cursor in Gmail", font=get_bold(11), fill=TEAL)

    img.save(os.path.join(DIR, 'verby-email-generation.png'), 'PNG', optimize=True)
    print('  verby-email-generation.png')


def generate_prompt_screenshot():
    """Screenshot showing voice → AI prompt enhancement."""
    W, H = 900, 560
    img = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(img)

    # App window
    draw_rounded_rect(draw, [40, 30, W-40, H-30], 16, CARD_BG, BORDER)
    for i, c in enumerate([(255,95,87), (255,189,46), (39,201,63)]):
        draw.ellipse([60 + i*20, 48, 72 + i*20, 60], fill=c)
    draw.text((W//2 - 30, 45), "Verby", font=get_bold(14), fill=ACCENT)

    # Before (raw speech)
    draw_rounded_rect(draw, [60, 80, W//2 - 15, 260], 12, (25, 15, 15), (60, 30, 30))
    draw.text((80, 92), "RAW SPEECH", font=get_bold(10), fill=RED)
    raw_lines = [
        '"uh hey write me an app',
        'that tracks my daily habits',
        'and shows me a streak',
        'calendar thing"',
    ]
    y = 118
    for line in raw_lines:
        draw.text((80, y), line, font=get_font(13), fill=(180, 130, 130))
        y += 22

    # After (enhanced prompt)
    draw_rounded_rect(draw, [W//2 + 15, 80, W-60, 260], 12, (12, 20, 18), (30, 50, 40))
    draw.text((W//2 + 35, 92), "SMART PROMPT", font=get_bold(10), fill=TEAL)
    prompt_lines = [
        'Build a daily habit tracking app',
        'with a visual streak calendar.',
        'Include: habit creation, daily',
        'check-in, streak tracking with',
        'heat map, recovery options.',
    ]
    y = 118
    for line in prompt_lines:
        draw.text((W//2 + 35, y), line, font=get_font(13), fill=GRAY)
        y += 22

    # Arrow between them
    draw.text((W//2 - 8, 160), "→", font=get_bold(22), fill=ACCENT)

    # Bottom: target apps
    draw_rounded_rect(draw, [60, 280, W-60, H-50], 12, (18, 18, 25), (35, 35, 50))
    draw.text((80, 295), "WORKS IN ANY APP", font=get_bold(10), fill=DIM)

    apps = ["ChatGPT", "Claude", "VS Code", "Slack", "Gmail", "Notion"]
    x = 80
    for app in apps:
        pill_w = len(app) * 9 + 20
        draw_rounded_rect(draw, [x, 320, x + pill_w, 345], 8, (30, 30, 42))
        draw.text((x + 10, 325), app, font=get_font(12), fill=GRAY)
        x += pill_w + 10

    # Waveform at bottom
    draw_waveform(draw, 80, 370, 700, 50, ACCENT, 40)

    # Status indicator
    draw_rounded_rect(draw, [60, H-70, 230, H-45], 8, (25, 20, 40), ACCENT)
    draw.text((75, H-65), "⚡ AI Enhancement: ON", font=get_bold(11), fill=ACCENT)

    # Mode indicators
    draw_rounded_rect(draw, [W-350, H-70, W-60, H-45], 8, (20, 20, 28))
    draw.text((W-340, H-65), "Hold Fn = AI Prompt  |  Hold Ctrl = Cleanup", font=get_font(11), fill=DIM)

    img.save(os.path.join(DIR, 'verby-prompt-enhancement.png'), 'PNG', optimize=True)
    print('  verby-prompt-enhancement.png')


def generate_speech_cleanup():
    """Screenshot showing speech cleanup mode."""
    W, H = 900, 400
    img = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(img)

    draw_rounded_rect(draw, [40, 30, W-40, H-30], 16, CARD_BG, BORDER)
    for i, c in enumerate([(255,95,87), (255,189,46), (39,201,63)]):
        draw.ellipse([60 + i*20, 45, 72 + i*20, 57], fill=c)
    draw.text((W//2 - 50, 42), "Speech Cleanup", font=get_bold(14), fill=TEAL)

    # Before
    draw_rounded_rect(draw, [60, 75, W//2 - 15, 200], 12, (25, 15, 15), (60, 30, 30))
    draw.text((80, 87), "BEFORE", font=get_bold(10), fill=RED)
    before = [
        '"Um so basically I think',
        'we should, you know, push',
        'the uh deadline to Friday"',
    ]
    y = 112
    for line in before:
        draw.text((80, y), line, font=get_font(13), fill=(180, 130, 130))
        y += 22

    # After
    draw_rounded_rect(draw, [W//2 + 15, 75, W-60, 200], 12, (12, 20, 18), (30, 50, 40))
    draw.text((W//2 + 35, 87), "AFTER", font=get_bold(10), fill=GREEN)
    after = [
        '"I think we should push',
        'the deadline to Friday."',
    ]
    y = 112
    for line in after:
        draw.text((W//2 + 35, y), line, font=get_font(13), fill=WHITE)
        y += 22

    draw.text((W//2 - 8, 128), "→", font=get_bold(22), fill=TEAL)

    # Stats bar
    draw_rounded_rect(draw, [60, 220, W-60, 280], 12, (18, 18, 25), (35, 35, 50))
    stats = [
        ("Filler words removed:", "3", RED),
        ("Grammar fixed:", "2", TEAL),
        ("Words saved:", "40%", GREEN),
    ]
    x = 90
    for label, val, color in stats:
        draw.text((x, 238), label, font=get_font(12), fill=DIM)
        draw.text((x + len(label) * 7 + 5, 238), val, font=get_bold(12), fill=color)
        x += 230

    # Mode badge
    draw_rounded_rect(draw, [60, H-65, 250, H-40], 8, (20, 30, 28), TEAL)
    draw.text((75, H-58), "Mode: Speech Cleanup (Ctrl)", font=get_bold(11), fill=TEAL)

    img.save(os.path.join(DIR, 'verby-speech-cleanup.png'), 'PNG', optimize=True)
    print('  verby-speech-cleanup.png')


def generate_system_tray():
    """Screenshot showing Verby in the menu bar."""
    W, H = 600, 300
    img = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Menu bar
    draw.rectangle([0, 0, W, 28], fill=(25, 25, 30))

    # Menu bar items (right side)
    draw.text((W-180, 6), "Wi-Fi   🔋 96%   9:41 AM", font=get_font(12), fill=GRAY)

    # Verby icon in menu bar (active - glowing)
    draw.rounded_rectangle([W-220, 4, W-195, 24], radius=4, fill=ACCENT)
    draw_waveform(draw, W-218, 7, 20, 14, WHITE, 5)

    # Dropdown
    draw_rounded_rect(draw, [W-320, 35, W-60, H-20], 12, CARD_BG, BORDER)

    draw.text((W-300, 50), "Verby", font=get_bold(16), fill=WHITE)
    draw.text((W-300, 72), "Ready to dictate", font=get_font(12), fill=TEAL)

    # Stats
    y = 105
    items = [
        ("Today's dictations:", "7 / 20"),
        ("Mode:", "AI Enhanced (Fn)"),
        ("Status:", "Listening..."),
    ]
    for label, val in items:
        draw.text((W-300, y), label, font=get_font(12), fill=DIM)
        draw.text((W-300 + 145, y), val, font=get_bold(12), fill=GRAY)
        y += 25

    # Waveform animation
    draw_waveform(draw, W-300, 190, 220, 35, ACCENT, 25)

    # Bottom controls
    draw.line([(W-310, 240), (W-70, 240)], fill=BORDER, width=1)
    draw.text((W-300, 252), "Preferences", font=get_font(12), fill=GRAY)
    draw.text((W-160, 252), "Quit Verby", font=get_font(12), fill=DIM)

    img.save(os.path.join(DIR, 'verby-menu-bar.png'), 'PNG', optimize=True)
    print('  verby-menu-bar.png')


if __name__ == '__main__':
    print('Generating product screenshots...')
    generate_email_screenshot()
    generate_prompt_screenshot()
    generate_speech_cleanup()
    generate_system_tray()
    print('Done!')
