"""Generate product screenshot mockups for Verby — updated April 2026."""
from PIL import Image, ImageDraw, ImageFont
import os
import random

DIR = os.path.dirname(os.path.abspath(__file__))

# Color palette (matches site CSS variables)
BG = (5, 5, 8)
CARD_BG = (14, 14, 22)
CARD_HOVER = (20, 20, 30)
BORDER = (255, 255, 255, 20)
BORDER_SOLID = (35, 35, 45)
WHITE = (241, 245, 249)
GRAY = (148, 163, 184)
DIM = (71, 85, 105)
ACCENT = (99, 102, 241)
ACCENT_2 = (139, 92, 246)
TEAL = (20, 184, 166)
RED = (244, 63, 94)
GREEN = (16, 185, 129)
ORANGE = (251, 146, 60)


def get_font(size: int) -> ImageFont.FreeTypeFont:
    paths = [
        '/System/Library/Fonts/SFCompact.ttf',
        '/System/Library/Fonts/Supplemental/Arial.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def get_bold(size: int) -> ImageFont.FreeTypeFont:
    paths = [
        '/System/Library/Fonts/SFCompact-Bold.otf',
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def rounded_rect(draw: ImageDraw.Draw, xy: list, radius: int, fill: tuple, outline: tuple | None = None) -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline)


def draw_waveform(draw: ImageDraw.Draw, x: int, y: int, w: int, h: int, color: tuple, num_bars: int = 20, seed: int = 42) -> None:
    random.seed(seed)
    bar_w = max(3, w // (num_bars * 2))
    gap = max(2, bar_w)
    for i in range(num_bars):
        bar_h = int(random.uniform(0.15, 1.0) * h)
        bx = x + i * (bar_w + gap)
        by = y + (h - bar_h) // 2
        r1, g1, b1 = TEAL
        r2, g2, b2 = ACCENT
        t = i / max(1, num_bars - 1)
        r = int(r1 + (r2 - r1) * t)
        g = int(g1 + (g2 - g1) * t)
        b = int(b1 + (b2 - b1) * t)
        draw.rounded_rectangle([bx, by, bx + bar_w, by + bar_h], radius=bar_w // 2, fill=(r, g, b))


def draw_logo(draw: ImageDraw.Draw, x: int, y: int, size: int = 24) -> None:
    """Draw stylized Verby waveform logo."""
    bars = [0.3, 0.55, 0.75, 0.9, 0.7, 1.0, 0.6, 0.45, 0.3, 0.15]
    bar_w = max(2, size // 8)
    gap = max(1, bar_w // 2 + 1)
    total_w = len(bars) * (bar_w + gap) - gap
    sx = x - total_w // 2
    for i, h_frac in enumerate(bars):
        bar_h = int(h_frac * size)
        bx = sx + i * (bar_w + gap)
        by = y + (size - bar_h) // 2
        t = i / (len(bars) - 1)
        r = int(129 + (20 - 129) * t)
        g = int(140 + (184 - 140) * t)
        b = int(248 + (166 - 248) * t)
        draw.rounded_rectangle([bx, by, bx + bar_w, by + bar_h], radius=bar_w // 2, fill=(r, g, b))


def draw_titlebar(draw: ImageDraw.Draw, x0: int, y0: int, x1: int, title: str = "Verby") -> None:
    """Draw macOS-style titlebar with dots and title."""
    for i, c in enumerate([(255, 95, 87), (255, 189, 46), (39, 201, 63)]):
        cx = x0 + 22 + i * 20
        cy = y0 + 18
        draw.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=c)
    mid = (x0 + x1) // 2
    draw_logo(draw, mid - 30, y0 + 8, 22)
    draw.text((mid - 12, y0 + 10), title, font=get_bold(14), fill=ACCENT)
    # Rainbow accent line
    line_y = y0 + 35
    lx0 = x0 + 40
    lx1 = x1 - 40
    colors_line = [ACCENT, ACCENT_2, TEAL, GREEN, TEAL, ACCENT_2, ACCENT]
    seg_w = (lx1 - lx0) // len(colors_line)
    for i, c in enumerate(colors_line):
        draw.line([(lx0 + i * seg_w, line_y), (lx0 + (i + 1) * seg_w, line_y)], fill=c, width=2)


def draw_badge(draw: ImageDraw.Draw, x: int, y: int, text: str, bg: tuple, fg: tuple) -> int:
    """Draw a pill badge. Returns the right edge x position."""
    tw = len(text) * 7 + 20
    rounded_rect(draw, [x, y, x + tw, y + 24], 8, bg)
    draw.text((x + 10, y + 5), text, font=get_bold(11), fill=fg)
    return x + tw


def generate_email_screenshot() -> None:
    """Voice → email generation."""
    W, H = 1200, 700
    img = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Window
    rounded_rect(draw, [40, 20, W - 40, H - 20], 20, CARD_BG, BORDER_SOLID)
    draw_titlebar(draw, 40, 25, W - 40)

    # Voice input section
    rounded_rect(draw, [70, 75, W - 70, 195], 14, (20, 18, 30), (45, 40, 60))
    draw.text((95, 88), "YOU SAID", font=get_bold(11), fill=DIM)
    draw_waveform(draw, 95, 115, 300, 28, ACCENT, 30)
    draw.text((95, 150), '"Tell John we need to push the meeting to Friday because the API isn\'t ready yet"',
              font=get_font(14), fill=GRAY)

    # Arrow
    draw.text((W // 2 - 10, 208), "↓", font=get_bold(24), fill=ACCENT)

    # Generated email
    rounded_rect(draw, [70, 240, W - 70, H - 50], 14, (10, 18, 16), (25, 50, 40))
    # Accent top border
    draw.line([(85, 240), (W - 85, 240)], fill=TEAL, width=2)
    draw.text((95, 258), "GENERATED EMAIL", font=get_bold(11), fill=TEAL)

    y = 295
    email_lines = [
        ("Hi John,", WHITE, True),
        ("", WHITE, False),
        ("I wanted to let you know we'll need to push our meeting to", GRAY, False),
        ("Friday. The API integration isn't quite ready yet, and I'd", GRAY, False),
        ("rather wait until we have something solid to show.", GRAY, False),
        ("", WHITE, False),
        ("Let me know if Friday works for you.", GRAY, False),
        ("", WHITE, False),
        ("Best,", GRAY, False),
        ("Stephen", WHITE, True),
    ]
    for text, color, bold in email_lines:
        if text:
            f = get_bold(14) if bold else get_font(14)
            draw.text((95, y), text, font=f, fill=color)
        y += 24

    # Badges
    bx = draw_badge(draw, W - 340, H - 72, "✓ Injected at cursor", (15, 35, 30), TEAL)
    draw_badge(draw, bx + 10, H - 72, "Gmail", (20, 20, 30), GRAY)

    # Waveform decoration
    draw_waveform(draw, W - 200, 88, 120, 24, ACCENT, 15, seed=99)

    img.save(os.path.join(DIR, 'verby-email-generation.png'), 'PNG', optimize=True)
    print('  ✓ verby-email-generation.png')


def generate_prompt_screenshot() -> None:
    """Voice → AI prompt enhancement."""
    W, H = 1200, 700
    img = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(img)

    rounded_rect(draw, [40, 20, W - 40, H - 20], 20, CARD_BG, BORDER_SOLID)
    draw_titlebar(draw, 40, 25, W - 40)

    mid = W // 2

    # Before (raw speech)
    rounded_rect(draw, [70, 75, mid - 20, 310], 14, (25, 15, 18), (60, 30, 35))
    draw.text((95, 90), "RAW SPEECH", font=get_bold(11), fill=RED)
    raw_lines = [
        '"uh hey build me a dashboard',
        'that shows my sales data with',
        'charts and stuff, maybe filters',
        'by date and product, something',
        'that looks professional"',
    ]
    y = 120
    for line in raw_lines:
        draw.text((95, y), line, font=get_font(14), fill=(190, 140, 140))
        y += 26

    # Arrow
    draw.text((mid - 12, 175), "→", font=get_bold(28), fill=ACCENT)

    # After (smart prompt)
    rounded_rect(draw, [mid + 20, 75, W - 70, 310], 14, (10, 18, 16), (25, 50, 40))
    draw.line([(mid + 35, 75), (W - 85, 75)], fill=ACCENT, width=2)
    draw.text((mid + 45, 90), "SMART PROMPT", font=get_bold(11), fill=TEAL)
    prompt_lines = [
        'Build a sales analytics dashboard',
        'with interactive charts. Include:',
        'revenue line chart, product breakdown',
        'pie chart, date range picker, product',
        'category filters, and summary cards',
        'showing total revenue, orders, and',
        'average order value.',
    ]
    y = 120
    for line in prompt_lines:
        draw.text((mid + 45, y), line, font=get_font(14), fill=WHITE)
        y += 26

    # App pills
    rounded_rect(draw, [70, 330, W - 70, 420], 14, (18, 18, 25), BORDER_SOLID)
    draw.text((95, 345), "WORKS IN ANY APP", font=get_bold(11), fill=DIM)
    apps = ["ChatGPT", "Claude", "VS Code", "Cursor", "Slack", "Notion", "Gmail"]
    x = 95
    for app in apps:
        pw = len(app) * 9 + 22
        rounded_rect(draw, [x, 370, x + pw, 398], 8, (30, 30, 42), BORDER_SOLID)
        draw.text((x + 11, 376), app, font=get_font(12), fill=GRAY)
        x += pw + 10

    # Waveform
    draw_waveform(draw, 95, 440, W - 230, 60, ACCENT, 50, seed=77)

    # Badges
    draw_badge(draw, 70, H - 65, "⚡ AI Enhancement: ON", (25, 20, 45), ACCENT)
    draw_badge(draw, 290, H - 65, "Hold Fn = AI Prompt", (20, 20, 28), DIM)
    draw_badge(draw, 510, H - 65, "Hold Ctrl = Cleanup", (20, 20, 28), DIM)

    img.save(os.path.join(DIR, 'verby-prompt-enhancement.png'), 'PNG', optimize=True)
    print('  ✓ verby-prompt-enhancement.png')


def generate_speech_cleanup() -> None:
    """Speech cleanup mode — before/after."""
    W, H = 1200, 520
    img = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(img)

    rounded_rect(draw, [40, 20, W - 40, H - 20], 20, CARD_BG, BORDER_SOLID)
    draw_titlebar(draw, 40, 25, W - 40, "Speech Cleanup")

    mid = W // 2

    # Before
    rounded_rect(draw, [70, 75, mid - 20, 250], 14, (25, 15, 18), (60, 30, 35))
    draw.text((95, 90), "BEFORE", font=get_bold(11), fill=RED)
    before = [
        '"So um basically what I think',
        'we should do is like, you know,',
        'refactor the authentication module',
        'because it\'s gotten kind of messy',
        'and uh we keep having bugs"',
    ]
    y = 118
    for line in before:
        draw.text((95, y), line, font=get_font(14), fill=(190, 140, 140))
        y += 24

    # Arrow
    draw.text((mid - 12, 150), "→", font=get_bold(28), fill=TEAL)

    # After
    rounded_rect(draw, [mid + 20, 75, W - 70, 250], 14, (10, 20, 16), (25, 50, 35))
    draw.text((mid + 45, 90), "AFTER", font=get_bold(11), fill=GREEN)
    after = [
        '"I think we should refactor the',
        'authentication module. It\'s gotten',
        'messy and we keep running into',
        'bugs."',
    ]
    y = 118
    for line in after:
        draw.text((mid + 45, y), line, font=get_font(14), fill=WHITE)
        y += 24

    # Stats bar
    rounded_rect(draw, [70, 270, W - 70, 340], 14, (18, 18, 25), BORDER_SOLID)
    stats = [
        ("Filler words", "5 removed", RED),
        ("Grammar", "3 fixed", TEAL),
        ("Words saved", "48%", GREEN),
    ]
    x = 95
    for label, val, color in stats:
        draw.text((x, 285), label, font=get_font(12), fill=DIM)
        draw.text((x, 305), val, font=get_bold(14), fill=color)
        x += 320

    # Waveform
    draw_waveform(draw, 95, 360, W - 230, 50, TEAL, 45, seed=33)

    # Badge
    draw_badge(draw, 70, H - 60, "Mode: Speech Cleanup (Ctrl)", (15, 30, 28), TEAL)

    img.save(os.path.join(DIR, 'verby-speech-cleanup.png'), 'PNG', optimize=True)
    print('  ✓ verby-speech-cleanup.png')


def generate_reddit_comments() -> None:
    """Reddit/social comments reply generation."""
    W, H = 1200, 700
    img = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(img)

    rounded_rect(draw, [40, 20, W - 40, H - 20], 20, CARD_BG, BORDER_SOLID)
    draw_titlebar(draw, 40, 25, W - 40)

    # Voice input
    rounded_rect(draw, [70, 75, W - 70, 210], 14, (20, 18, 30), (45, 40, 60))
    draw.text((95, 88), "YOU SAID", font=get_bold(11), fill=DIM)
    draw_waveform(draw, 95, 115, 300, 28, ACCENT, 30, seed=55)
    draw.text((95, 150),
              '"reply to this reddit comment, I actually tried that approach and the latency was"',
              font=get_font(14), fill=GRAY)
    draw.text((95, 172),
              '"way better after switching to websockets, also mention the benchmarks I ran"',
              font=get_font(14), fill=GRAY)

    # Arrow
    draw.text((W // 2 - 10, 222), "↓", font=get_bold(24), fill=ACCENT)

    # Generated comment
    rounded_rect(draw, [70, 255, W - 70, 500], 14, (10, 18, 16), (25, 50, 40))
    draw.line([(85, 255), (W - 85, 255)], fill=ACCENT, width=2)
    draw.text((95, 272), "REDDIT COMMENT", font=get_bold(11), fill=TEAL)

    y = 305
    comment_lines = [
        ("I actually went down this road and switching to WebSockets made a", WHITE, False),
        ("huge difference. Latency dropped from ~200ms to around 40ms in my", WHITE, False),
        ("benchmarks.", WHITE, False),
        ("", WHITE, False),
        ("The key was ditching the polling approach entirely — once you're on a", GRAY, False),
        ("persistent connection the overhead basically disappears. Happy to", GRAY, False),
        ("share my benchmark setup if you want to compare.", GRAY, False),
    ]
    for text, color, bold in comment_lines:
        if text:
            f = get_bold(14) if bold else get_font(14)
            draw.text((95, y), text, font=f, fill=color)
        y += 24

    # Platform pills
    rounded_rect(draw, [70, 520, W - 70, 610], 14, (18, 18, 25), BORDER_SOLID)
    draw.text((95, 535), "ALSO WORKS ON", font=get_bold(11), fill=DIM)
    platforms = ["Reddit", "YouTube", "LinkedIn", "Instagram", "TikTok", "Facebook", "Forums"]
    x = 95
    for plat in platforms:
        pw = len(plat) * 9 + 22
        is_reddit = plat == "Reddit"
        bg_c = (30, 25, 50) if is_reddit else (30, 30, 42)
        fg_c = ACCENT if is_reddit else GRAY
        outline = ACCENT if is_reddit else BORDER_SOLID
        rounded_rect(draw, [x, 562, x + pw, 590], 8, bg_c, outline)
        draw.text((x + 11, 568), plat, font=get_bold(12) if is_reddit else get_font(12), fill=fg_c)
        x += pw + 10

    # Badges
    draw_badge(draw, 70, H - 65, "Platform: Reddit", (25, 20, 45), ACCENT)
    draw_badge(draw, 250, H - 65, "Tone: matched", (15, 30, 28), TEAL)

    img.save(os.path.join(DIR, 'verby-reddit-comments.png'), 'PNG', optimize=True)
    print('  ✓ verby-reddit-comments.png')


def generate_menu_bar() -> None:
    """Verby in the macOS menu bar."""
    W, H = 800, 400
    img = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Menu bar
    draw.rectangle([0, 0, W, 30], fill=(25, 25, 32))
    draw.text((W - 200, 7), "Wi-Fi   🔋 96%   9:41 AM", font=get_font(12), fill=GRAY)

    # Verby icon in menu bar
    rounded_rect(draw, [W - 240, 4, W - 212, 26], 4, ACCENT)
    draw_waveform(draw, W - 238, 7, 22, 16, WHITE, 5, seed=11)

    # Dropdown
    rounded_rect(draw, [W - 380, 38, W - 50, H - 20], 16, CARD_BG, BORDER_SOLID)

    # Header
    draw_logo(draw, W - 340, 56, 20)
    draw.text((W - 322, 55), "Verby", font=get_bold(18), fill=WHITE)
    draw.text((W - 240, 58), "v0.7.2", font=get_font(11), fill=DIM)
    draw.text((W - 360, 82), "Ready to dictate", font=get_font(13), fill=TEAL)

    # Separator
    draw.line([(W - 365, 105), (W - 65, 105)], fill=BORDER_SOLID, width=1)

    # Stats
    y = 118
    items = [
        ("Today's dictations", "7 / 20", GRAY),
        ("Mode", "AI Enhanced (Fn)", ACCENT),
        ("Status", "Listening...", TEAL),
        ("Plan", "Free", GRAY),
    ]
    for label, val, color in items:
        draw.text((W - 360, y), label, font=get_font(13), fill=DIM)
        draw.text((W - 180, y), val, font=get_bold(13), fill=color)
        y += 28

    # Waveform
    draw_waveform(draw, W - 360, 240, 290, 40, ACCENT, 30, seed=22)

    # Separator
    draw.line([(W - 365, 295), (W - 65, 295)], fill=BORDER_SOLID, width=1)

    # Bottom controls
    draw.text((W - 360, 310), "Settings", font=get_font(13), fill=GRAY)
    draw.text((W - 260, 310), "Upgrade to Pro", font=get_bold(13), fill=ACCENT)
    draw.text((W - 130, 310), "Quit", font=get_font(13), fill=DIM)

    img.save(os.path.join(DIR, 'verby-menu-bar.png'), 'PNG', optimize=True)
    print('  ✓ verby-menu-bar.png')


if __name__ == '__main__':
    print('Generating Verby product screenshots...\n')
    generate_email_screenshot()
    generate_prompt_screenshot()
    generate_speech_cleanup()
    generate_reddit_comments()
    generate_menu_bar()
    print('\nDone! 5 screenshots generated.')
