import sys
from PIL import Image

def make_white_transparent(input_path, output_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    datas = img.get_flattened_data() if hasattr(img, 'get_flattened_data') else img.getdata()
    
    newData = []
    for item in datas:
        # Check if pixel is near-white (background of vector art)
        if item[0] > 235 and item[1] > 235 and item[2] > 235:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")

if __name__ == '__main__':
    make_white_transparent(sys.argv[1], sys.argv[2])
    print("Done")
