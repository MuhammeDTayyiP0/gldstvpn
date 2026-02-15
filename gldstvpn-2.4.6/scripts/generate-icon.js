/**
 * Generate a proper VPN shield icon as PNG using raw pixel manipulation
 * Creates a 256x256 PNG with shield shape and checkmark
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;

// Helper: distance from point to line segment
function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

// Check if point is inside shield shape
function isInsideShield(x, y) {
    // Shield shape: top point at (128, 16), left at (28, 68), right at (228, 68)
    // Curves down to a point at bottom (128, 240)
    const cx = 128;
    const topY = 16;
    const sideY = 68;
    const bottomY = 240;
    const halfWidth = 100;

    // Normalize y
    if (y < topY || y > bottomY) return false;

    // Upper part (trapezoid from top to sideY)
    if (y <= sideY) {
        const t = (y - topY) / (sideY - topY);
        const w = t * halfWidth;
        return Math.abs(x - cx) <= w;
    }

    // Lower part (tapers from sideY to bottom)
    const t = (y - sideY) / (bottomY - sideY);
    const w = halfWidth * (1 - t * t); // Quadratic taper for nice curve
    return Math.abs(x - cx) <= w;
}

// Create pixel data
const pixels = Buffer.alloc(SIZE * SIZE * 4, 0); // RGBA

for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
        const idx = (y * SIZE + x) * 4;

        if (isInsideShield(x, y)) {
            // Shield color: indigo gradient
            const gradientT = y / SIZE;
            const r = Math.round(79 - gradientT * 20);   // 79 -> 59
            const g = Math.round(70 - gradientT * 25);   // 70 -> 45
            const b = Math.round(229 - gradientT * 30);  // 229 -> 199

            // Checkmark distance check first
            const d1 = distToSegment(x, y, 88, 135, 115, 162);
            const d2 = distToSegment(x, y, 115, 162, 172, 100);
            const minDist = Math.min(d1, d2);

            if (minDist < 12) {
                // Pure white checkmark with anti-aliasing
                const alpha = minDist < 8 ? 1.0 : Math.max(0, 1 - (minDist - 8) / 4);
                pixels[idx] = Math.round(r * (1 - alpha) + 255 * alpha);
                pixels[idx + 1] = Math.round(g * (1 - alpha) + 255 * alpha);
                pixels[idx + 2] = Math.round(b * (1 - alpha) + 255 * alpha);
            } else {
                // Left highlight (lighter area) - only outside checkmark
                if (x < 128) {
                    const highlightStrength = (128 - x) / 128 * 0.12;
                    pixels[idx] = Math.min(255, Math.round(r + highlightStrength * 150));
                    pixels[idx + 1] = Math.min(255, Math.round(g + highlightStrength * 150));
                    pixels[idx + 2] = Math.min(255, Math.round(b + highlightStrength * 80));
                } else {
                    pixels[idx] = r;
                    pixels[idx + 1] = g;
                    pixels[idx + 2] = b;
                }
            }
            pixels[idx + 3] = 255; // Alpha
        } else {
            // Anti-alias the shield edge
            let minEdgeDist = Infinity;
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    if (isInsideShield(x + dx, y + dy) !== isInsideShield(x, y)) {
                        const d = Math.sqrt(dx * dx + dy * dy);
                        minEdgeDist = Math.min(minEdgeDist, d);
                    }
                }
            }

            if (minEdgeDist < 2) {
                const alpha = Math.max(0, (2 - minEdgeDist) / 2);
                const gradientT = y / SIZE;
                pixels[idx] = Math.round(79 - gradientT * 20);
                pixels[idx + 1] = Math.round(70 - gradientT * 25);
                pixels[idx + 2] = Math.round(229 - gradientT * 30);
                pixels[idx + 3] = Math.round(alpha * 255);
            }
            // else stays transparent (0,0,0,0)
        }
    }
}

// Create PNG file manually
function createPNG(width, height, rgbaData) {
    // PNG signature
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8;  // bit depth
    ihdrData[9] = 6;  // color type (RGBA)
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace
    const ihdr = createChunk('IHDR', ihdrData);

    // IDAT chunk - prepare filtered data
    const rawData = Buffer.alloc(height * (1 + width * 4));
    for (let y = 0; y < height; y++) {
        rawData[y * (1 + width * 4)] = 0; // filter type: None
        rgbaData.copy(rawData, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
    }

    const compressed = zlib.deflateSync(rawData);
    const idat = createChunk('IDAT', compressed);

    // IEND chunk
    const iend = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const typeBuffer = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeBuffer, data]);

    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);

    return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
        }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

const pngBuffer = createPNG(SIZE, SIZE, pixels);
const outputPath = path.join(__dirname, '..', 'resources', 'icon.png');
fs.writeFileSync(outputPath, pngBuffer);
console.log(`Icon generated: ${outputPath} (${pngBuffer.length} bytes)`);
