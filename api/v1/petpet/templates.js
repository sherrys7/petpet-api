const { listTemplates } = require('../../_lib/template-loader');

module.exports = (req, res) => {
  const templates = listTemplates();
  const body = JSON.stringify({ templates });

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
};
