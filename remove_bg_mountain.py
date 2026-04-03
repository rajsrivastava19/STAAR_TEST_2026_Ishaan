from PIL import Image

def remove_checkerboard(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    newData = []
    for item in data:
        r, g, b, a = item
        # Checkerboard is usually white and light grey.
        # We can just make anything that is relatively colorless and bright transparent.
        # The mountain has some light parts, but a threshold of 180 should be fine
        # Or even a higher threshold since it's a generated image, checkerboard is typically #CCCCCC and #FFFFFF.
        if r > 180 and g > 180 and b > 180 and abs(r-g) < 25 and abs(g-b) < 25:
            # We want to replace it with 0 alpha
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")

remove_checkerboard("client/public/dinos/mountain_vines.png", "client/public/dinos/mountain_vines_clean.png")
print("Background removed!")
