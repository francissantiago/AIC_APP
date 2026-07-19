import fs from 'fs';
import path from 'path';

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith('.controller.ts')) out.push(p);
  }
  return out;
}

for (const file of walk('src/modules')) {
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/);
  let changed = false;

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    if (!next.includes('activeCongregationId')) continue;
    if (line.includes('@ActiveCongregation')) continue;

    const m = line.match(/^(\s+)(\w+)\((.+)\): (Promise[^{]+)\{\s*$/);
    if (!m) continue;

    const [, indent, name, params, ret] = m;
    const paramBlock = params.trim()
      ? `${params.trim()},\n${indent}  @ActiveCongregation() activeCongregationId?: string,`
      : `@ActiveCongregation() activeCongregationId?: string,`;

    lines[i] = `${indent}${name}(`;
    lines.splice(
      i + 1,
      0,
      `${indent}  ${paramBlock}`,
      `${indent}): ${ret.trim()}{`,
    );
    changed = true;
    i += 2;
  }

  if (changed) {
    fs.writeFileSync(file, lines.join('\n'));
    console.log('fixed', file);
  }
}

console.log('done');
