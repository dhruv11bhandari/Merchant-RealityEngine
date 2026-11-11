import type { IncomingMessage, ServerResponse } from 'node:http';
import { getInvestigation, labelInvestigation, openInvestigation, respondInvestigation, reviewInvestigation, type ApiReply } from './workflow';

const LIMIT = 2_000_000;

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let n = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    n += buf.length;
    if (n > LIMIT) {
      const err = new Error('Body is larger than 2 MB.');
      (err as Error & { status?: number }).status = 413;
      throw err;
    }
    chunks.push(buf);
  }
  if (!n) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch {
    const err = new Error('Body is not JSON.');
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
}

function send(res: ServerResponse, reply: ApiReply): void {
  const json = JSON.stringify(reply.body);
  res.statusCode = reply.status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('content-length', Buffer.byteLength(json));
  res.end(json);
}

/** One router for the local server and the Vercel function. */
export async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname.replace(/\/+$/, '') || '/';
    const path = pathname.replace(/^\/api/, '') || '/';
    const match = path.match(/^\/investigations(?:\/([^/]+)(?:\/(review|response|label))?)?$/);
    const method = req.method || 'GET';
    if (!match) return send(res, { status: 404, body: { error: 'Unknown investigation route.' } });
    const [, id, action] = match;
    const url = new URL(req.url || '/', 'http://localhost');
    if (!id) {
      if (method === 'GET') {
        const caseId = url.searchParams.get('id');
        return send(res, caseId ? getInvestigation(caseId) : { status: 400, body: { error: 'Pass the case id.' } });
      }
      if (method !== 'POST') return send(res, { status: 405, body: { error: 'POST a dataset to open a case.' } });
      const body = await readBody(req);
      const step = body && typeof body === 'object' && !Array.isArray(body) ? body as { action?: unknown; id?: unknown } : {};
      if (typeof step.action === 'string') {
        if (typeof step.id !== 'string' || !step.id) return send(res, { status: 400, body: { error: 'This step needs the case id.' } });
        const reply = step.action === 'review' ? reviewInvestigation(step.id, body)
          : step.action === 'response' ? respondInvestigation(step.id, body)
          : step.action === 'label' ? labelInvestigation(step.id, body)
          : { status: 400, body: { error: 'action must be review, response, or label.' } };
        return send(res, reply);
      }
      return send(res, openInvestigation(body));
    }
    if (method === 'GET' && !action) return send(res, getInvestigation(id));
    if (method !== 'POST' || !action) return send(res, { status: 405, body: { error: 'Use GET for the case, or POST review, response, or label.' } });
    const body = await readBody(req);
    const reply = action === 'review' ? reviewInvestigation(id, body) : action === 'response' ? respondInvestigation(id, body) : labelInvestigation(id, body);
    send(res, reply);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    send(res, { status, body: { error: err instanceof Error ? err.message : 'Investigation API failed.' } });
  }
}
