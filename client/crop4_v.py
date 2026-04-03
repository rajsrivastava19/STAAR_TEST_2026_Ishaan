from PIL import Image
import sys

img = Image.open(sys.argv[1])
w, h = img.size
chunk = h // 4
for i, l in enumerate(['A', 'B', 'C', 'D']):
    im = img.crop((0, chunk*i, w, chunk*(i+1)))
    im.save(sys.argv[2] + l + '.png')
