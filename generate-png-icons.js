import sharp from 'sharp';

async function run() {
  try {
    await sharp('public/icon.svg')
      .resize(192, 192)
      .png()
      .toFile('public/pwa-192x192.png');
    console.log('Generated pwa-192x192.png');

    await sharp('public/icon.svg')
      .resize(512, 512)
      .png()
      .toFile('public/pwa-512x512.png');
    console.log('Generated pwa-512x512.png');

    await sharp('public/icon-maskable.svg')
      .resize(512, 512)
      .png()
      .toFile('public/pwa-maskable-512x512.png');
    console.log('Generated pwa-maskable-512x512.png');

    await sharp('public/icon.svg')
      .resize(180, 180)
      .png()
      .toFile('public/apple-touch-icon.png');
    console.log('Generated apple-touch-icon.png');

    console.log('All PWA PNG icons generated successfully!');
  } catch (err) {
    console.error('Error generating icons:', err);
    process.exit(1);
  }
}

run();
