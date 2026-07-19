import fs from 'fs';

const serviceFiles = [
  'src/modules/assets/assets.service.ts',
  'src/modules/finance/finance.service.ts',
  'src/modules/ministries/ministries.service.ts',
  'src/modules/classes/classes.service.ts',
  'src/modules/families/families.service.ts',
  'src/modules/small-groups/small-groups.service.ts',
  'src/modules/announcements/announcements.service.ts',
  'src/modules/member-transfers/member-transfers.service.ts',
  'src/modules/secretariat/documents/documents.service.ts',
  'src/modules/secretariat/calendar/calendar.service.ts',
  'src/modules/secretariat/visitors/visitors.service.ts',
  'src/modules/secretariat/attendance/attendance.service.ts',
  'src/modules/members/members.service.ts',
];

function extractMethods(content) {
  const methods = [];
  const re =
    /^(\s+)(?:(async)\s+)?(?:(private|public|protected)\s+)?(?:(async)\s+)?(\w+)\(([^)]*)\):\s*([^{;\n]+)\{/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    const bodyStart = m.index + m[0].length;
    let depth = 1;
    let i = bodyStart;
    for (; i < content.length; i++) {
      if (content[i] === '{') depth++;
      else if (content[i] === '}') {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    methods.push({
      name: m[5],
      params: m[6],
      visibility: m[3] || 'public',
      header: m[0],
      body: content.slice(bodyStart, i - 1),
      full: content.slice(m.index, i),
    });
  }
  return methods;
}

function addParam(params) {
  const trimmed = params.replace(/\r/g, '').trim();
  if (trimmed.includes('activeCongregationId')) return params;
  if (!trimmed) return 'activeCongregationId?: string';
  return `${trimmed}, activeCongregationId?: string`;
}

function propagateService(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  for (let pass = 0; pass < 20; pass++) {
    const methods = extractMethods(content);
    const needsParam = new Set(
      methods
        .filter(
          (m) =>
            m.body.includes('getCongregationId(activeCongregationId)') ||
            m.params.includes('activeCongregationId'),
        )
        .map((m) => m.name),
    );

    let changed = false;
    for (const method of methods) {
      for (const other of methods) {
        if (other.name === method.name) continue;
        if (!needsParam.has(other.name)) continue;
        const callRe = new RegExp(`this\\.${other.name}\\(([^)]*)\\)`, 'g');
        if (!callRe.test(method.body)) continue;
        callRe.lastIndex = 0;
        if (!needsParam.has(method.name)) {
          if (!method.params.includes('activeCongregationId')) {
            const newHeader = method.header.replace(
              `(${method.params})`,
              `(${addParam(method.params)})`,
            );
            content = content.replace(method.header, newHeader);
            changed = true;
            break;
          }
          needsParam.add(method.name);
        }
        const newBody = method.body.replace(
          callRe,
          (full, args) => {
            if (args.includes('activeCongregationId')) return full;
            const a = args.trim();
            if (!a) return `this.${other.name}(activeCongregationId)`;
            return `this.${other.name}(${a}, activeCongregationId)`;
          },
        );
        if (newBody !== method.body) {
          content = content.replace(method.full, method.full.replace(method.body, newBody));
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
    if (!changed) break;
  }

  fs.writeFileSync(filePath, content);
  console.log('Propagated', filePath);
}

for (const f of serviceFiles) propagateService(f);

// secretariat dashboard
const secPath = 'src/modules/secretariat/secretariat.service.ts';
let sec = fs.readFileSync(secPath, 'utf8');
if (!sec.includes('getDashboard(\n    activeCongregationId')) {
  sec = sec.replace(
    /async getDashboard\(\): Promise<SecretariatDashboardResponseDto> \{\r?\n    const congregationId = \(await this\.congregationsService\.getOrCreateBase\(\)\)\.id;/,
    `async getDashboard(
    activeCongregationId?: string,
  ): Promise<SecretariatDashboardResponseDto> {
    const congregationId =
      activeCongregationId ??
      (await this.congregationsService.getOrCreateBase()).id;`,
  );
  fs.writeFileSync(secPath, sec);
  console.log('Fixed secretariat.service.ts');
}

console.log('Done propagate');
