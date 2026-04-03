from PIL import Image
import sys

img_path = sys.argv[1]
out_prefix = sys.argv[2]

img = Image.open(img_path)
width, height = img.size
half_w = width // 2
half_h = height // 2

# Top-Left: A
img.crop((0, 0, half_w, half_h)).save(f"{out_prefix}_a.png")
# Bottom-Left: B
img.crop((0, half_h, half_w, height)).save(f"{out_prefix}_b.png")
# Top-Right: C
img.crop((half_w, 0, width, half_h)).save(f"{out_prefix}_c.png")
# Bottom-Right: D
img.crop((half_w, half_h, width, height)).save(f"{out_prefix}_d.png")
