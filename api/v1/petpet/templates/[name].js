const { getTemplateDetail } = require('../../../_lib/template-loader');

module.exports = (req, res) => {
  const name = req.query?.name;
  if (!name) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Template name is required' }));
    return;
  }

  const detail = getTemplateDetail(name);
  if (!detail) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `template '${name}' not found` }));
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(detail));
};
