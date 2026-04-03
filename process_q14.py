import os
from PIL import Image

def find_horizontal_bands(img_path):
    img = Image.open(img_path).convert('L')
    w, h = img.size
    
    # We want to identify the dark blocks which correspond to each option box.
    row_d = [sum(1 for x in range(w) if img.getpixel((x,y)) < 240) for y in range(h)]
    
    bands = []
    in_band = False
    start = 0
    for y in range(h):
        if row_d[y] > 2 and not in_band:  # More than 2 dark pixels = we hit a block
            start = y
            in_band = True
        elif row_d[y] <= 2 and in_band:
            if y - start > 20: # Block must be tall enough to be an option
                bands.append((start, y))
            in_band = False
            
    if in_band and h - start > 20:
        bands.append((start, h))
        
    return bands, img

img_path = '/Users/rajsrivastava/.gemini/antigravity/brain/07839b9f-2007-4383-b2f1-93d8db96e602/media__1775149858320.png'
bands, img_L = find_horizontal_bands(img_path)
print("Found bands:", bands)

img_color = Image.open(img_path).convert('RGBA')
w, h = img_color.size

# We expect exactly 5 bands (A, B, C, D, E)
letters = ['A', 'B', 'C', 'D', 'E']

if len(bands) == 5:
    for i, band in enumerate(bands):
        # We also want to crop the left side. Notice there's a checkbox in the original image we want to keep?
        # Actually the user will select via the UI, so we should crop out the checkbox.
        # Let's see if we can just leave it as is for now and let the UI handle it.
        # Actually, if we leave the checkbox, it's confusing since the UI provides its own select mechanism!
        # The checkbox is likely on the far left. The total width is 222.
        # Let's crop the first 40 pixels from the left to remove the checkbox!
        
        top = max(0, band[0] - 5)
        bot = min(h, band[1] + 5)
        
        # Crop out checkbox which is usually on x < 40
        cropped = img_color.crop((40, top, w, bot))
        
        # Make white transparent
        datas = cropped.getdata()
        newData = []
        for item in datas:
            if item[0] > 235 and item[1] > 235 and item[2] > 235:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
        cropped.putdata(newData)
        
        out_path = f'/Users/rajsrivastava/Desktop/Code Projects/Math STAAR Test Prep/math-staar-ishaan/client/public/images/2023-14-{letters[i]}.png'
        cropped.save(out_path, "PNG")
        print(f"Saved option {letters[i]}!")
else:
    print(f"Error: expected 5 bands, found {len(bands)}")
