from PIL import Image
import sys

img_path = sys.argv[1]
out_prefix = sys.argv[2] # e.g. public/images/2019-10-

im = Image.open(img_path)
width, height = im.size

mid_w = width // 2
mid_h = height // 2

# crop(left, top, right, bottom)
im_F = im.crop((0, 0, mid_w, mid_h))
im_H = im.crop((mid_w, 0, width, mid_h))
im_G = im.crop((0, mid_h, mid_w, height))
im_J = im.crop((mid_w, mid_h, width, height))

im_F.save(out_prefix + "F.png")
im_H.save(out_prefix + "H.png")
im_G.save(out_prefix + "G.png")
im_J.save(out_prefix + "J.png")

print("Crop successful!")
