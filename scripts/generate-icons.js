import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Crisp modern SVG markup for Vendy logo
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#09090b"/>
  <circle cx="256" cy="256" r="216" stroke="#27272a" stroke-width="6" fill="none"/>
  <!-- Minimalist Geometric V and Commerce chevron -->
  <path d="M148 160 L236 348 C244 364 268 364 276 348 L364 160" 
        stroke="#ffffff" stroke-width="44" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="256" cy="180" r="20" fill="#ffffff"/>
  <path d="M216 230 L256 266 L296 230" stroke="#ffffff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

// Maskable SVG with 20% safe margin padding (content within center 60% circle)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#09090b"/>
  <g transform="translate(64, 64) scale(0.75)">
    <!-- Content inside safe-zone -->
    <circle cx="256" cy="256" r="216" stroke="#27272a" stroke-width="8" fill="none"/>
    <path d="M148 160 L236 348 C244 364 268 364 276 348 L364 160" 
          stroke="#ffffff" stroke-width="48" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="256" cy="180" r="22" fill="#ffffff"/>
    <path d="M216 230 L256 266 L296 230" stroke="#ffffff" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>`;

async function generate() {
  console.log('Generating PWA icons...');
  
  // 1. Save standard SVG
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg, 'utf8');

  // 2. 192x192 PNG
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 3. 512x512 PNG
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 4. 512x512 Maskable PNG
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 5. Apple Touch Icon 180x180 (no transparency, solid black background)
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 6. Favicon 64x64 PNG
  await sharp(Buffer.from(standardSvg))
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  console.log('Successfully generated all PWA icons!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
