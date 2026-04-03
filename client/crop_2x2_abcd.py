from PIL import Image
import sys

img = Image.open(sys.argv[1])
w, h = img.size
w2, h2 = w // 2, h // 2

# A is top-left
im_A = img.crop((0, 0, w2, h2))
im_A.save(sys.argv[2] + 'A.png')

# C is top-right
im_C = img.crop((w2, 0, w, h2))
im_C.save(sys.argv[2] + 'C.png')

# B is bottom-left
im_B = img.crop((0, h2, w2, h))
im_B.save(sys.argv[2] + 'B.png')

# D is bottom-right
im_D = img.crop((w2, h2, w, h))
im_D.save(sys.argv[2] + 'D.png')
