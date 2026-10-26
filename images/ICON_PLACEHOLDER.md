# Icon Placeholder

The biomni-icon.png file needs to be created from the biomni-icon.svg file.

To convert SVG to PNG (128x128), use one of these methods:

## Using ImageMagick:
```bash
convert -background transparent -size 128x128 images/biomni-icon.svg images/biomni-icon.png
```

## Using Node.js with sharp:
```bash
npm install sharp
node -e "
const sharp = require('sharp');
sharp('images/biomni-icon.svg')
  .resize(128, 128)
  .png()
  .toFile('images/biomni-icon.png');
"
```

## Using online converter:
Upload biomni-icon.svg to any SVG to PNG converter and save as biomni-icon.png (128x128 pixels)

The icon represents:
- DNA helix for bioinformatics
- Green color scheme for life sciences
- Clean, professional design suitable for VSCode marketplace