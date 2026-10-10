const { Jimp } = require('jimp');

async function removeWhiteBg(inputPath, outputPath) {
  try {
    const image = await Jimp.read(inputPath);
    
    // Convert to RGBA if not already (Jimp handles this internally)
    
    // Replace near-white pixels
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      
      // If pixel is very close to white, make it transparent
      if (red > 240 && green > 240 && blue > 240) {
        this.bitmap.data[idx + 3] = 0; // Alpha channel to 0
      }
    });

    await image.write(outputPath);
    console.log(`Saved transparent PNG to ${outputPath}`);
  } catch (err) {
    console.error(`Error processing ${inputPath}:`, err);
  }
}

async function main() {
  const brideIn = 'C:/Users/akhil/.gemini/antigravity-ide/brain/c10c28e4-3b7d-4658-ab0a-13ade45e6dc6/bride_white_bg_1791566369285.jpg';
  const groomIn = 'C:/Users/akhil/.gemini/antigravity-ide/brain/c10c28e4-3b7d-4658-ab0a-13ade45e6dc6/groom_white_bg_1791566381789.jpg';
  
  const brideOut = 'f:/wedding/wedding/public/assets/images/bride.png';
  const groomOut = 'f:/wedding/wedding/public/assets/images/groom.png';
  
  await removeWhiteBg(brideIn, brideOut);
  await removeWhiteBg(groomIn, groomOut);
}

main();
