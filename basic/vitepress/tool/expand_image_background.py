import sys
import os
from PIL import Image, ImageOps

def make_transparent_white(img):
    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
        alpha = img.convert('RGBA').split()[-1]
        bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
        bg.paste(img, mask=alpha)
        return bg.convert('RGB')
    else:
        return img

def expand_image_background(folder_path, padding=20):
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.lower().endswith(('.drawio.png', '.drawio.jpg', '.drawio.jpeg')):
                file_path = os.path.join(root, file)
                try:
                    img = Image.open(file_path)
                    # Add border
                    img_with_border = ImageOps.expand(img, border=padding, fill='white')
                    img_with_border = make_transparent_white(img_with_border)
                    img_with_border.save(file_path)
                    print(f"Processed: {file_path}")
                except Exception as e:
                    print(f"Failed to process {file_path}: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python", sys.argv[0], "<target_folder>")
        sys.exit(1)
    target_folder = sys.argv[1]
    expand_image_background(target_folder)