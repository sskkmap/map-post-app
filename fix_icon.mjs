import fs from 'fs';
import sharp from 'sharp';

async function convertIcon() {
    try {
        await sharp('./app/favicon.ico')
            .ensureAlpha()
            .toFormat('png')
            .toFile('./app/icon.png');
        console.log('Successfully converted favicon.ico to icon.png');
    } catch (err) {
        console.error('Conversion failed:', err);
    }
}
convertIcon();
