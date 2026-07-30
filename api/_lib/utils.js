const https = require('https');
const http = require('http');
const config = require('./config');

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.get(url, { timeout: config.IMAGE_DOWNLOAD_TIMEOUT }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`HTTP ${res.statusCode} downloading image`));
        return;
      }

      const contentType = res.headers['content-type'];
      if (contentType && !config.SUPPORTED_IMAGE_TYPES.includes(contentType)) {
        reject(new Error(`Unsupported content type: ${contentType}`));
        return;
      }

      const chunks = [];
      let size = 0;

      res.on('data', (chunk) => {
        chunks.push(chunk);
        size += chunk.length;
      });

      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Image download timed out'));
    });
  });
}

function parseMultipartForm(body, boundary) {
  const result = { fields: {}, files: {} };
  const parts = body.toString('binary').split(`--${boundary}`);
  const textDecoder = new TextDecoder('utf-8');

  for (const part of parts) {
    if (part.includes('Content-Disposition')) {
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;

      const headers = part.substring(0, headerEnd);
      const content = part.substring(headerEnd + 4);

      const nameMatch = headers.match(/name="([^"]+)"/);
      if (!nameMatch) continue;

      const name = nameMatch[1];
      const trimmedContent = content.replace(/\r\n--?\s*$/, '').trim();

      if (headers.includes('filename=')) {
        const filenameMatch = headers.match(/filename="([^"]+)"/);
        const contentTypeMatch = headers.match(/Content-Type:\s*(\S+)/i);
        result.files[name] = {
          filename: filenameMatch ? filenameMatch[1] : 'unknown',
          contentType: contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream',
          data: Buffer.from(trimmedContent, 'binary'),
        };
      } else {
        result.fields[name] = trimmedContent;
      }
    }
  }

  return result;
}

module.exports = { downloadImage, parseMultipartForm };
