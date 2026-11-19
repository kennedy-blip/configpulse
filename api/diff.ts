import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStore, validEnv, validate } from './_lib/config';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { sourceEnv, targetEnv } = req.body ?? {};
  if (!validEnv(sourceEnv) || !validEnv(targetEnv) || sourceEnv === targetEnv) {
    return res.status(400).json({ error: 'Choose two different valid environments' });
  }
  const store = getStore();
  const source = store[sourceEnv], target = store[targetEnv];
  const a = new Map(source.map(x => [x.key, x]));
  const b = new Map(target.map(x => [x.key, x]));
  const keys = [...new Set([...a.keys(), ...b.keys()])].sort();
  const changes = keys.flatMap(key => {
    const s = a.get(key), t = b.get(key);
    if (!s) return [{ key, kind: 'added', source: null, target: t }];
    if (!t) return [{ key, kind: 'missing', source: s, target: null }];
    if (s.type !== t.type) return [{ key, kind: 'type_mismatch', source: s, target: t }];
    const issue = validate(t);
    if (issue) return [{ key, kind: 'invalid', source: s, target: t, issue }];
    if (s.value !== t.value) return [{ key, kind: 'value_mismatch', source: s, target: t }];
    return [];
  });
  const missingRequired = target.filter(x => x.required && !source.some(s => s.key === x.key)).map(x => x.key);
  const schemaLines = target.map(x => {
    const validator = x.type === 'url' ? 'z.string().url()' : x.type === 'number' ? 'z.coerce.number()' : x.type === 'boolean' ? "z.enum(['true', 'false'])" : 'z.string()';
    return '  ' + x.key + ': ' + validator + (x.required ? '' : '.optional()') + ',';
  });
  const schema = ["import { z } from 'zod';", '', 'export const envSchema = z.object({', ...schemaLines, '});', '', 'export type Env = z.infer<typeof envSchema>;'].join('\n');
  return res.status(200).json({
    sourceEnv, targetEnv, changes,
    summary: {
      total: changes.length,
      added: changes.filter(x => x.kind === 'added').length,
      missing: changes.filter(x => x.kind === 'missing').length,
      mismatched: changes.filter(x => ['type_mismatch', 'value_mismatch', 'invalid'].includes(x.kind)).length
    },
    missingRequired, schema
  });
}