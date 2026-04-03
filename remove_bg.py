from PIL import Image

def remove_checkerboard(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    newData = []
    for item in data:
        r, g, b, a = item
        # Checkerboard is usually white (255,255,255) and light grey (around 204,204,204 or 230,230,230)
        # The pterodactyl is bright blue, orange, green.
        # So we can just make anything that is relatively colorless and bright transparent.
        if r > 180 and g > 180 and b > 180 and abs(r-g) < 15 and abs(g-b) < 15:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")

remove_checkerboard("client/public/dinos/pterodactyl.png", "client/public/dinos/pterodactyl_clean.png")
print("Done!")
