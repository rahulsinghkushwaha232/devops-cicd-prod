const http = require('node:http');

const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV || 'development';

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`App running in ${nodeEnv} mode 🚀`);
    return;
  }

  if (req.method === 'GET' && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

if (require.main === module) {
  server.listen(port, () => {
    console.log(`Server listening on port ${port} in ${nodeEnv} mode`);
  });

  const shutdown = (signal) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      console.log('Server closed successfully');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = server;
module.exports.server = server;
