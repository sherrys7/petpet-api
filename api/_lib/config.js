const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

const DATA_ROOT = path.join(ROOT, 'data');
const INDEX_FILE = 'index.json';
const INDEX_MAP_FILE = 'index.map.json';

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_IMAGE_SIZE = 4096;
const MAX_FRAMES = 256;
const DEFAULT_QUALITY = 10;
const IMAGE_DOWNLOAD_TIMEOUT = 10000;

module.exports = {
  ROOT,
  DATA_ROOT,
  INDEX_FILE,
  INDEX_MAP_FILE,
  SUPPORTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  MAX_FRAMES,
  DEFAULT_QUALITY,
  IMAGE_DOWNLOAD_TIMEOUT,
};
