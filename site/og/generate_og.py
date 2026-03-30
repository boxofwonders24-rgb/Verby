"""Generate PNG OG images (1200x630) for all Verby pages."""
from PIL import Image, ImageDraw, ImageFont
import os

DIR = os.path.dirname(os.path.abspath(__file__))

# Try to load Inter font, fall back to default
def get_font(size, bold=False):
    fonts_dir = os.path.join(DIR, '..', 'fonts')
    if bold:
        paths = [
            os.path.join(fonts_dir, 'Inter-Bold.woff2'),
            os.path.join(fonts_dir, 'Inter-Bold.ttf'),
            '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
            '/System/Library/Fonts/Helvetica.ttc',
        ]
    else:
        paths = [
            os.path.join(fonts_dir, 'Inter-Regular.woff2'),
            os.path.join(fonts_dir, 'Inter-Regular.ttf'),
            '/System/Library/Fonts/Supplemental/Arial.ttf',
            '/System/Library/Fonts/Helvetica.ttc',
        ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()

BG = (5, 5, 8)
WHITE = (241, 245, 249)
GRAY = (148, 163, 184)
DIM = (71, 85, 105)
ACCENT = (99, 102, 241)
TEAL = (20, 184, 166)

def create_base(w=1200, h=630):
    img = Image.new('RGB', (w, h), BG)
    draw = ImageDraw.Draw(img)
    # Ambient glow circles
    for cx, cy, r, color, alpha in [
        (200, 150, 300, ACCENT, 15),
        (900, 500, 250, TEAL, 12),
    ]:
        overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(*color, alpha))
        img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
    # Bottom accent bar
    draw = ImageDraw.Draw(img)
    for x in range(w):
        t = x / w
        r = int(ACCENT[0] * (1-t) + TEAL[0] * t)
        g = int(ACCENT[1] * (1-t) + TEAL[1] * t)
        b = int(ACCENT[2] * (1-t) + TEAL[2] * t)
        draw.rectangle([x, 612, x+1, 630], fill=(r, g, b))
    # Waveform bars
    bars = [
        (-80, 12, 10), (-60, 28, 10), (-40, 45, 12),
        (-18, 55, 12), (4, 40, 12), (26, 50, 14),
        (50, 35, 12), (72, 22, 10),
    ]
    cx_base, cy_base = 600, 120
    for dx, half_h, bw in bars:
        x = cx_base + dx
        alpha_factor = min(half_h / 55, 1.0)
        r = int(ACCENT[0] * alpha_factor + BG[0] * (1 - alpha_factor))
        g = int(ACCENT[1] * alpha_factor + BG[1] * (1 - alpha_factor))
        b = int(ACCENT[2] * alpha_factor + BG[2] * (1 - alpha_factor))
        draw.rounded_rectangle(
            [x, cy_base - half_h, x + bw, cy_base + half_h],
            radius=bw // 2, fill=(r, g, b)
        )
    # Teal dot
    draw.ellipse([cx_base + 87, cy_base - 3, cx_base + 93, cy_base + 3], fill=TEAL)
    return img, draw

def center_text(draw, y, text, font, fill):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((1200 - tw) // 2, y), text, font=font, fill=fill)

def generate_homepage():
    img, draw = create_base()
    center_text(draw, 230, 'Verby', get_font(72, bold=True), ACCENT)
    center_text(draw, 320, 'AI Voice-to-Text for Mac & Windows', get_font(28), GRAY)
    center_text(draw, 370, 'Talk to any app. Verby handles the rest.', get_font(20), DIM)
    img.save(os.path.join(DIR, 'homepage.png'), 'PNG', optimize=True)

def generate_page(filename, subtitle, tagline=None):
    img, draw = create_base()
    center_text(draw, 210, 'Verby', get_font(72, bold=True), ACCENT)
    center_text(draw, 300, subtitle, get_font(36, bold=True), WHITE)
    if tagline:
        center_text(draw, 360, tagline, get_font(22), GRAY)
    img.save(os.path.join(DIR, filename), 'PNG', optimize=True)

def generate_blog_post(filename, line1, line2, tagline, author='By Stephen Grandy | verbyai.com'):
    img, draw = create_base()
    center_text(draw, 180, 'Verby Blog', get_font(22, bold=True), ACCENT)
    center_text(draw, 260, line1, get_font(44, bold=True), WHITE)
    center_text(draw, 320, line2, get_font(44, bold=True), WHITE)
    center_text(draw, 400, tagline, get_font(22), GRAY)
    center_text(draw, 460, author, get_font(16), DIM)
    img.save(os.path.join(DIR, filename), 'PNG', optimize=True)

if __name__ == '__main__':
    print('Generating OG images...')

    generate_homepage()
    print('  homepage.png')

    generate_page('features.png', 'Features',
                  'AI Dictation | Email Generation | Voice Prompts')
    print('  features.png')

    generate_page('pricing.png', 'Simple Pricing',
                  'Free forever | Pro $9/mo')
    print('  pricing.png')

    generate_page('download.png', 'Download Free',
                  'AI Voice-to-Text for Mac & Windows')
    print('  download.png')

    generate_page('blog.png', 'Blog',
                  'Voice-to-Text Tips, AI Dictation Guides')
    print('  blog.png')

    generate_blog_post('blog-type-faster.png',
                       'How to Type 3x Faster',
                       'with Voice Dictation',
                       'The complete guide to AI-powered voice typing in 2026')
    print('  blog-type-faster.png')

    generate_blog_post('blog-voice-email.png',
                       'Voice to Email:',
                       'Never Type Again',
                       'Turn your voice into polished emails in seconds')
    print('  blog-voice-email.png')

    generate_blog_post('blog-best-apps.png',
                       '7 Best Voice-to-Text',
                       'Apps for Mac in 2026',
                       'Tested and compared: features, accuracy, pricing')
    print('  blog-best-apps.png')

    generate_blog_post('blog-chatgpt.png',
                       'Voice Dictation with',
                       'ChatGPT & AI Tools',
                       'Stop typing prompts. Start speaking them 3x faster.')
    print('  blog-chatgpt.png')

    print('Done! All 9 OG images generated.')
