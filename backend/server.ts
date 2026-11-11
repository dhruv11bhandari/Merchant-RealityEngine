import { createServer } from 'node:http';
import { handle } from './http';

const port = Number(process.env.PORT || 8787);
createServer((req, res) => {
  handle(req, res).catch(err => {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Investigation API failed.' }));
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`Investigation API at http://127.0.0.1:${port}`);
});
