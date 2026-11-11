import { handle } from '../backend/bundle.js';

export default function handler(req, res) {
  return handle(req, res);
}
