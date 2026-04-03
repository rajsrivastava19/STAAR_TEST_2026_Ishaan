const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const dir = 'client/public/dinos';

async function processImages() {
  const images = ['dino5.png', 'dino6.png', 'dino7.png'];
  for (const file of images) {
    console.log(`Processing ${file}...`);
    try {
      const image = await Jimp.read(path.join(dir, file));
      
      image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        const r = this.bitmap.data[idx + 0];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];
        
        if (r > 230 && g > 230 && b > 230) {
          this.bitmap.data[idx + 3] = 0; // Set alpha to 0 (transparent)
        }
      });
      
      const name = path.basename(file, path.extname(file));
      await image.writeAsync(path.join(dir, `${name}_trans.png`));
      console.log(`Saved ${name}_trans.png`);
    } catch (err) {
      console.error(`Failed on ${file}:`, err.message);
    }
  }
}

processImages();
