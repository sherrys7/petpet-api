const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');
const config = require('./config');

function resolveFontName(fontName) {
  const fontMap = {
    'Aller-Bold': 'Aller-Bold',
    'Aller': 'Aller',
    'arial': 'Arial',
    'Arial': 'Arial',
    'sans-serif': 'sans-serif',
  };
  return fontMap[fontName] || fontName;
}

function drawAvatar(ctx, img, coord, posType, style, opacity, angle, fit) {
  const [dx, dy, dw, dh] = coord.length >= 4
    ? coord
    : [coord[0], coord[1], img.width, img.height];

  const sx = 0, sy = 0;
  const sw = img.width, sh = img.height;

  ctx.save();

  if (opacity !== undefined && opacity !== null) {
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  }

  if (angle) {
    const cx = dx + dw / 2;
    const cy = dy + dh / 2;
    ctx.translate(cx, cy);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  if (style) {
    if (style.includes('FLIP')) {
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
    } else if (style.includes('MIRROR')) {
      ctx.translate(dx, dy + dh);
      ctx.scale(1, -1);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
    } else if (style.includes('GRAY') || style.includes('BINARIZATION')) {
      const canvas = createCanvas(img.width, img.height);
      const tempCtx = canvas.getContext('2d');
      tempCtx.drawImage(img, 0, 0);
      const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      if (style.includes('GRAY')) {
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }
      }

      if (style.includes('BINARIZATION')) {
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const val = gray > 128 ? 255 : 0;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
      }

      tempCtx.putImageData(imageData, 0, 0);
      const processed = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.putImageData(processed, dx, dy);
    } else {
      ctx.drawImage(img, dx, dy, dw, dh);
    }
  } else {
    if (posType === 'DEFORM') {
      ctx.drawImage(img, dx, dy, dw, dh);
    } else {
      const scaleX = dw / sw;
      const scaleY = dh / sh;
      const scale = Math.min(scaleX, scaleY);
      const drawW = sw * scale;
      const drawH = sh * scale;
      const offsetX = dx + (dw - drawW) / 2;
      const offsetY = dy + (dh - drawH) / 2;
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    }
  }

  ctx.restore();
}

function drawTextOnCanvas(ctx, textDef, overrides) {
  const text = overrides !== undefined ? overrides : textDef.text;
  if (!text) return;

  const pos = textDef.pos || [0, 0];
  const x = pos[0] || 0;
  const y = pos[1] || 0;
  const maxWidth = pos[2] || undefined;

  const color = textDef.color || '#000000';
  const size = textDef.size || 16;
  const fontName = resolveFontName(textDef.font || 'sans-serif');
  const align = (textDef.align || 'LEFT').toLowerCase();
  const wrap = textDef.wrap || 'NONE';
  const style = textDef.style || 'PLAIN';
  const strokeColor = textDef.strokeColor;
  const strokeSize = textDef.strokeSize || 0;

  let fontStyle = '';
  if (style === 'BOLD') fontStyle = 'bold ';
  else if (style === 'ITALIC') fontStyle = 'italic ';

  ctx.save();
  ctx.font = `${fontStyle}${size}px "${fontName}"`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;

  const lines = text.split('\n');
  let finalLines = lines;

  if (wrap === 'BREAK' && maxWidth) {
    finalLines = [];
    for (const line of lines) {
      const words = line.split(' ');
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          finalLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) finalLines.push(currentLine);
    }
  }

  if (wrap === 'ZOOM' && maxWidth) {
    let fontSize = size;
    ctx.font = `${fontStyle}${fontSize}px "${fontName}"`;
    let maxLineWidth = 0;
    for (const line of finalLines) {
      const w = ctx.measureText(line).width;
      if (w > maxLineWidth) maxLineWidth = w;
    }
    if (maxLineWidth > maxWidth) {
      const ratio = maxWidth / maxLineWidth;
      fontSize = Math.floor(fontSize * ratio);
      ctx.font = `${fontStyle}${fontSize}px "${fontName}"`;
    }
  }

  const lineHeight = size * 1.2;
  let currentY = y;

  for (const line of finalLines) {
    let drawX = x;
    if (align === 'center' && maxWidth) {
      drawX = x + maxWidth / 2;
    } else if (align === 'right' && maxWidth) {
      drawX = x + maxWidth;
    }

    if (strokeColor && strokeSize > 0) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeSize;
      ctx.lineJoin = 'round';
      ctx.strokeText(line, drawX, currentY);
    }

    ctx.fillText(line, drawX, currentY);
    currentY += lineHeight;
  }

  ctx.restore();
}

async function generateMeme(template, images, options) {
  const frameImages = template._frames || [];
  const frameCount = template._frameCount || Math.max(1, frameImages.length);

  if (frameCount > config.MAX_FRAMES) {
    throw new Error(`Frame count ${frameCount} exceeds maximum ${config.MAX_FRAMES}`);
  }

  let canvasWidth = 400;
  let canvasHeight = 300;

  if (template.background && template.background.size) {
    const [w, h] = template.background.size;
    canvasWidth = typeof w === 'number' ? w : parseInt(w) || canvasWidth;
    canvasHeight = typeof h === 'number' ? h : parseInt(h) || canvasHeight;
  } else if (template.avatar && template.avatar.length > 0) {
    const firstAvatar = template.avatar[0];
    if (firstAvatar.pos && firstAvatar.pos.length > 0) {
      const firstPos = Array.isArray(firstAvatar.pos[0])
        ? firstAvatar.pos[0]
        : firstAvatar.pos;
      const coords = Array.isArray(firstPos[0])
        ? firstPos
        : [firstPos];
      for (const c of coords) {
        if (c.length >= 4) {
          canvasWidth = Math.max(canvasWidth, c[0] + c[2]);
          canvasHeight = Math.max(canvasHeight, c[1] + c[3]);
        } else if (c.length >= 2) {
          canvasWidth = Math.max(canvasWidth, c[0] + 200);
          canvasHeight = Math.max(canvasHeight, c[1] + 200);
        }
      }
    }
  }

  const bgColor = options.bg_color || (template.background && template.background.color) || '#ffffff';

  const avatarImages = {};
  const avatarDefs = template.avatar || [];

  for (const def of avatarDefs) {
    const type = def.type;
    const imgData = images[type.toLowerCase()];
    if (imgData) {
      try {
        const img = await loadImage(imgData);
        avatarImages[type] = img;
      } catch (err) {
        console.error(`Failed to load image for ${type}:`, err.message);
      }
    }
  }

  const textDefs = template.text || [];
  const textOverrides = options.text || {};

  const renderedFrames = [];

  for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (frameImages.length > 0) {
      const frameFile = frameImages[frameIdx] || frameImages[frameImages.length - 1];
      try {
        const frameImg = await loadImage(frameFile);
        ctx.drawImage(frameImg, 0, 0, canvasWidth, canvasHeight);
      } catch (err) {
        console.error(`Failed to load frame ${frameIdx}:`, err.message);
      }
    }

    const bottomAvatars = avatarDefs.filter(a => !a.avatarOnTop);
    const topAvatars = avatarDefs.filter(a => a.avatarOnTop);

    for (const def of [...bottomAvatars, ...topAvatars]) {
      const type = def.type;
      const img = avatarImages[type];
      if (!img) continue;

      const posData = def.pos;
      const framePos = posData[frameIdx] || posData[posData.length - 1] || posData[0];
      if (!framePos) continue;

      const coords = Array.isArray(framePos[0])
        ? framePos
        : [framePos];

      for (const coord of coords) {
        drawAvatar(
          ctx, img, coord,
          def.posType || 'ZOOM',
          def.style || [],
          def.opacity,
          def.angle,
          def.fit
        );
      }
    }

    for (let ti = 0; ti < textDefs.length; ti++) {
      const textDef = textDefs[ti];
      const override = textOverrides[String(ti)] !== undefined ? textOverrides[String(ti)] : undefined;
      drawTextOnCanvas(ctx, textDef, override);
    }

    renderedFrames.push(canvas);
  }

  return renderedFrames;
}

async function encodeGIF(frames, options) {
  if (frames.length === 0) {
    throw new Error('No frames to encode');
  }

  if (frames.length === 1) {
    return frames[0].toBuffer('image/png');
  }

  const GIFEncoder = require('gif-encoder-2');
  const width = frames[0].width;
  const height = frames[0].height;

  return new Promise((resolve, reject) => {
    const encoder = new GIFEncoder(width, height, 'neuquant', false);
    encoder.setQuality(options.quality || config.DEFAULT_QUALITY);
    encoder.setDelay(options.delay || 65);
    encoder.setRepeat(0);

    encoder.on('error', reject);
    encoder.on('progress', () => {});
    encoder.on('finish', () => {
      const buf = encoder.out.getData();
      resolve(buf);
    });

    encoder.start();

    for (const frame of frames) {
      const ctx = frame.getContext('2d');
      encoder.addFrame(ctx);
    }

    encoder.finish();
  });
}

module.exports = { generateMeme, encodeGIF, drawAvatar, drawTextOnCanvas };
