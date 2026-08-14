import os
from PIL import Image, ImageDraw, ImageFont

output_dir = r"C:\Users\ersul\ecomind-ai\release\store_assets"
os.makedirs(output_dir, exist_ok=True)

# Helper to draw a rich emerald green gradient background
def create_gradient_bg(width, height):
    img = Image.new("RGB", (width, height), (15, 23, 42))  # Dark Slate base
    draw = ImageDraw.Draw(img)
    
    for y in range(height):
        r = int(15 + (16 - 15) * (y / height))
        g = int(23 + (185 - 23) * (y / height) * 0.4)
        b = int(42 + (129 - 42) * (y / height) * 0.3)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    return img

# 1. Store Icon (128x128)
def make_icon_128():
    img = Image.new("RGB", (128, 128), (16, 185, 129)) # Emerald green
    draw = ImageDraw.Draw(img)
    draw.ellipse([8, 8, 120, 120], fill=(6, 78, 59), outline=(52, 211, 153), width=3)
    draw.text((36, 42), "🌿", fill=(255, 255, 255))
    draw.text((64, 46), "Eco", fill=(255, 255, 255))
    img.save(os.path.join(output_dir, "icon_128x128.png"), "PNG")
    print("Saved icon_128x128.png")

# 2. Screenshot (1280x800)
def make_screenshot_1280x800():
    img = create_gradient_bg(1280, 800)
    draw = ImageDraw.Draw(img)
    
    draw.rectangle([60, 60, 1220, 740], fill=(30, 41, 59), outline=(51, 65, 85), width=2)
    draw.rectangle([60, 60, 1220, 110], fill=(15, 23, 42))
    draw.ellipse([80, 80, 94, 94], fill=(239, 68, 68))    # Red dot
    draw.ellipse([104, 80, 118, 94], fill=(245, 158, 11)) # Amber dot
    draw.ellipse([128, 80, 142, 94], fill=(16, 185, 129)) # Green dot
    
    draw.rectangle([180, 72, 1000, 98], fill=(30, 41, 59), outline=(71, 85, 105))
    draw.text((200, 76), "https://www.amazon.co.uk/dp/B08N5L8484 - EcoMind AI Extension", fill=(148, 163, 184))
    
    draw.rectangle([750, 140, 1180, 700], fill=(15, 23, 42), outline=(16, 185, 129), width=3)
    
    draw.text((780, 170), "EcoMind AI Product Score", fill=(255, 255, 255))
    
    draw.rectangle([780, 210, 1150, 310], fill=(6, 78, 59), outline=(52, 211, 153), width=2)
    draw.text((800, 230), "GREEN SCORE: 78 / 100", fill=(52, 211, 153))
    draw.text((800, 265), "Grade A - Low Environmental Impact", fill=(226, 232, 240))
    
    draw.rectangle([780, 330, 1150, 370], fill=(30, 41, 59))
    draw.text((800, 342), "Confidence: 85% (High Transparency)", fill=(251, 191, 36))
    
    pillars = [
        ("Materials (35%)", "100% Organic Cotton", (16, 185, 129)),
        ("Recyclability (20%)", "Recyclable Fibres", (16, 185, 129)),
        ("Packaging (10%)", "Paper Envelope", (16, 185, 129)),
        ("Missing Data", "Fulfilment Carbon (Not Disclosed)", (148, 163, 184))
    ]
    
    y_pos = 400
    for name, detail, color in pillars:
        draw.rectangle([780, y_pos, 1150, y_pos + 50], fill=(30, 41, 59))
        draw.text((795, y_pos + 10), name, fill=color)
        draw.text((795, y_pos + 28), detail, fill=(203, 213, 225))
        y_pos += 60

    draw.rectangle([780, 640, 1150, 680], fill=(6, 78, 59))
    draw.text((800, 650), "+50 EcoPoints Earned for Green Choice", fill=(255, 255, 255))
    
    img.save(os.path.join(output_dir, "screenshot_1280x800.png"), "PNG")
    print("Saved screenshot_1280x800.png")

# 3. Small Promo Tile (440x280)
def make_small_promo_440x280():
    img = create_gradient_bg(440, 280)
    draw = ImageDraw.Draw(img)
    
    draw.rectangle([10, 10, 430, 270], outline=(16, 185, 129), width=2)
    draw.text((40, 50), "EcoMind AI", fill=(52, 211, 153))
    draw.text((40, 90), "Transparent Clothing Sustainability Score", fill=(255, 255, 255))
    
    draw.rectangle([40, 140, 400, 200], fill=(6, 78, 59), outline=(52, 211, 153), width=2)
    draw.text((60, 155), "Green Score and Confidence Score", fill=(255, 255, 255))
    draw.text((60, 175), "100% Local Browser Analysis", fill=(251, 191, 36))
    
    draw.text((40, 225), "Teens in AI Techathon 2026", fill=(148, 163, 184))
    
    img.save(os.path.join(output_dir, "small_promo_440x280.png"), "PNG")
    print("Saved small_promo_440x280.png")

# 4. Marquee Promo Tile (1400x560)
def make_large_promo_1400x560():
    img = create_gradient_bg(1400, 560)
    draw = ImageDraw.Draw(img)
    
    draw.rectangle([20, 20, 1380, 540], outline=(16, 185, 129), width=3)
    draw.text((80, 80), "EcoMind AI", fill=(52, 211, 153))
    draw.text((80, 140), "Real-Time Clothing Sustainability Scores on Amazon US & UK", fill=(255, 255, 255))
    
    cards = [
        ("Green Score Engine", "Weighted 3-pillar calculation: Materials, Recyclability & Longevity"),
        ("Confidence Score", "Transparently communicates data gaps & missing retailer disclosures"),
        ("100% Privacy First", "Parses product evidence locally. Zero personal browsing data collected"),
        ("EcoPoints Rewards", "Earn rewards and customize your Koala companion for green choices")
    ]
    
    x_pos = 80
    y_pos = 220
    for i, (title, desc) in enumerate(cards):
        col = i % 2
        row = i // 2
        cx = x_pos + col * 630
        cy = y_pos + row * 130
        
        draw.rectangle([cx, cy, cx + 590, cy + 110], fill=(30, 41, 59), outline=(51, 65, 85), width=2)
        draw.text((cx + 20, cy + 20), title, fill=(52, 211, 153))
        draw.text((cx + 20, cy + 55), desc, fill=(226, 232, 240))
        
    draw.text((80, 490), "Live Web Prototype: https://ecomind-ai-two.vercel.app  •  Teens in AI Techathon", fill=(148, 163, 184))
    
    img.save(os.path.join(output_dir, "large_promo_1400x560.png"), "PNG")
    print("Saved large_promo_1400x560.png")

if __name__ == "__main__":
    make_icon_128()
    make_screenshot_1280x800()
    make_small_promo_440x280()
    make_large_promo_1400x560()
    print("All Chrome Web Store promo assets generated successfully!")
