const { getTemplate } = require('../../_lib/template-loader');
const { generateMeme, encodeGIF } = require('../../_lib/engine');
const { downloadImage } = require('../../_lib/utils');
const config = require('../../_lib/config');

function sendJSON(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

async function resolveImages(fields) {
  const images = {};
  const avatarTypes = ['from', 'to', 'group', 'bot'];

  for (const type of avatarTypes) {
    const source = fields[type];
    if (!source) continue;

    if (typeof source === 'string' && source.startsWith('http')) {
      try {
        images[type] = await downloadImage(source);
      } catch (err) {
        throw new Error(`Failed to download image for '${type}': ${err.message}`);
      }
    } else if (Buffer.isBuffer(source) || source instanceof Buffer) {
      images[type] = source;
    }
  }

  return images;
}

function parseTextOverrides(fields) {
  if (fields.text) {
    try {
      return typeof fields.text === 'string' ? JSON.parse(fields.text) : fields.text;
    } catch {
      return {};
    }
  }
  return {};
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJSON(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const fields = req.body || {};

    const templateName = fields.template;
    let templateJson = fields.template_json;

    let template;

    if (templateJson) {
      try {
        template = typeof templateJson === 'string' ? JSON.parse(templateJson) : templateJson;
      } catch (err) {
        sendJSON(res, 400, { error: `Invalid template_json: ${err.message}` });
        return;
      }
    } else if (templateName) {
      template = getTemplate(templateName);
      if (!template) {
        sendJSON(res, 404, { error: `template '${templateName}' not found` });
        return;
      }
    } else {
      sendJSON(res, 400, { error: "Either 'template' or 'template_json' is required" });
      return;
    }

    const images = await resolveImages(fields);

    const textOverrides = parseTextOverrides(fields);

    const options = {
      delay: fields.delay ? parseInt(fields.delay) : (template.delay || 65),
      quality: fields.quality ? parseInt(fields.quality) : config.DEFAULT_QUALITY,
      bg_color: fields.bg_color || (template.background && template.background.color) || '#ffffff',
      text: textOverrides,
    };

    const frames = await generateMeme(template, images, options);

    if (frames.length === 1) {
      const buffer = frames[0].toBuffer('image/png');
      res.writeHead(200, { 'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*' });
      res.end(buffer);
    } else {
      const gifBuffer = await encodeGIF(frames, options);
      res.writeHead(200, { 'Content-Type': 'image/gif', 'Access-Control-Allow-Origin': '*' });
      res.end(gifBuffer);
    }
  } catch (err) {
    console.error('Generation error:', err);
    sendJSON(res, 500, { error: `Failed to generate meme: ${err.message}` });
  }
};
