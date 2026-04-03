from PIL import Image
import sys

img_path = sys.argv[1]
num_slices = 4
out_prefix = sys.argv[2]

img = Image.open(img_path)
width, height = img.size
slice_height = height // num_slices

for i in range(num_slices):
    box = (0, i * slice_height, width, (i + 1) * slice_height)
    slice_img = img.crop(box)
    slice_img.save(f"{out_prefix}_{chr(97+i)}.png")
