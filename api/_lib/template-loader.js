const fs = require('fs');
const path = require('path');
const config = require('./config');

const templates = new Map();

function loadTemplates() {
  templates.clear();
  const dataPath = config.DATA_ROOT;

  if (!fs.existsSync(dataPath)) {
    console.warn('Data directory not found:', dataPath);
    return;
  }

  const sources = fs.readdirSync(dataPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const source of sources) {
    const sourcePath = path.join(dataPath, source);
    const items = fs.readdirSync(sourcePath, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== 'fonts')
      .map(d => d.name);

    for (const name of items) {
      const templateDir = path.join(sourcePath, name);
      const dataFile = path.join(templateDir, 'data.json');

      if (!fs.existsSync(dataFile)) continue;

      try {
        const raw = fs.readFileSync(dataFile, 'utf-8');
        const data = JSON.parse(raw);
        data.key = name;
        data.url = templateDir;

        const frameFiles = fs.readdirSync(templateDir)
          .filter(f => /^\d+\.(png|jpg|jpeg|gif)$/i.test(f))
          .sort((a, b) => {
            const na = parseInt(a.match(/^\d+/)[0]);
            const nb = parseInt(b.match(/^\d+/)[0]);
            return na - nb;
          })
          .map(f => path.join(templateDir, f));

        data._frames = frameFiles;
        data._frameCount = frameFiles.length;

        templates.set(name, data);
      } catch (err) {
        console.error(`Failed to load template '${name}':`, err.message);
      }
    }
  }

  console.log(`Loaded ${templates.size} templates`);
}

function getTemplate(name) {
  return templates.get(name) || null;
}

function listTemplates() {
  const result = [];
  for (const [id, tpl] of templates) {
    result.push({
      id,
      type: tpl.type || 'IMG',
      alias: tpl.alias || [],
      avatar_slots: [...new Set((tpl.avatar || []).map(a => a.type))],
      text_slots: (tpl.text || []).length,
      delay: tpl.delay || 65,
    });
  }
  return result;
}

function getTemplateDetail(name) {
  const tpl = templates.get(name);
  if (!tpl) return null;

  return {
    id: tpl.key,
    type: tpl.type || 'IMG',
    frame_count: tpl._frameCount,
    avatar_slots: (tpl.avatar || []).map(a => ({
      type: a.type,
      pos_type: a.posType || 'ZOOM',
      crop: a.crop || null,
      style: a.style || [],
      avatar_on_top: a.avatarOnTop || false,
    })),
    text_slots: (tpl.text || []).map((t, i) => ({
      index: i,
      default_text: t.text,
      font: t.font || 'sans-serif',
      size: t.size || 16,
      align: t.align || 'LEFT',
      color: t.color || '#000000',
      wrap: t.wrap || 'NONE',
      pos: t.pos,
    })),
    delay: tpl.delay || 65,
    has_background: !!tpl.background,
    has_text: !!(tpl.text && tpl.text.length > 0),
  };
}

loadTemplates();

module.exports = { loadTemplates, getTemplate, listTemplates, getTemplateDetail };
