from PIL import Image
import sys

img_path = sys.argv[1]
out_prefix = sys.argv[2] # e.g. public/images/2019-3-

im = Image.open(img_path)
width, height = im.size

# We want 4 quadrants:
# Top Left = A
# Bottom Left = B
# Top Right = C
# Bottom Right = D

mid_w = width // 2
mid_h = height // 2

# crop(left, top, right, bottom)
im_A = im.crop((0, 0, mid_w, mid_h))
im_B = im.crop((0, mid_h, mid_w, height))
im_C = im.crop((mid_w, 0, width, mid_h))
im_D = im.crop((mid_w, mid_h, width, height))

im_A.save(out_prefix + "A.png")
im_B.save(out_prefix + "B.png")
im_C.save(out_prefix + "C.png")
im_D.save(out_prefix + "D.png")

print("Crop successful!")
