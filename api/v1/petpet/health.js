const { listTemplates } = require('../../_lib/template-loader');

module.exports = (req, res) => {
  const templates = listTemplates();
  const body = JSON.stringify({ status: 'ok', templates_count: templates.length });

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(body);
};
