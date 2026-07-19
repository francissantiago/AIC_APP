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
];

const standardHelperRe =
  /  private async getCongregationId\(\): Promise<string> \{\r?\n    return \(await this\.congregationsService\.getOrCreateBase\(\)\)\.id;\r?\n  \}/;
const standardHelperNew = `  private async getCongregationId(
    activeCongregationId?: string,
  ): Promise<string> {
    if (activeCongregationId) {
      return activeCongregationId;
    }
    return (await this.congregationsService.getOrCreateBase()).id;
  }`;

const financeHelperRe =
  /  private async getCongregationId\(\): Promise<string> \{\r?\n    const congregationId = \(await this\.congregationsService\.getOrCreateBase\(\)\)\r?\n      \.id;\r?\n    await this\.ensureDefaultCategories\(congregationId\);\r?\n    return congregationId;\r?\n  \}/;
const financeHelperNew = `  private async getCongregationId(
    activeCongregationId?: string,
  ): Promise<string> {
    if (activeCongregationId) {
      await this.ensureDefaultCategories(activeCongregationId);
      return activeCongregationId;
    }
    const congregationId = (await this.congregationsService.getOrCreateBase())
      .id;
    await this.ensureDefaultCategories(congregationId);
    return congregationId;
  }`;

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
      start: m.index,
      end: i,
      visibility: m[3] || 'public',
      name: m[5],
      params: m[6],
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

function patchService(filePath, isFinance = false) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (isFinance) {
    content = content.replace(financeHelperRe, financeHelperNew);
  } else if (standardHelperRe.test(content)) {
    content = content.replace(standardHelperRe, standardHelperNew);
  } else {
    console.log('No standard helper in', filePath);
    return;
  }

  content = content.replace(
    /await this\.getCongregationId\(\)/g,
    'await this.getCongregationId(activeCongregationId)',
  );

  for (let pass = 0; pass < 8; pass++) {
    const methods = extractMethods(content);
    let changed = false;
    for (const method of methods) {
      if (!method.body.includes('activeCongregationId')) continue;
      if (method.params.includes('activeCongregationId')) continue;
      const newParams = addParam(method.params);
      const newHeader = method.header.replace(
        `(${method.params})`,
        `(${newParams})`,
      );
      content = content.replace(method.header, newHeader);
      changed = true;
      break;
    }
    if (!changed) break;
  }

  const methods = extractMethods(content);
  for (const method of methods) {
    if (!method.params.includes('activeCongregationId')) continue;
    let body = method.body;
    const innerMethods = methods.filter(
      (x) => x.name !== method.name && x.params.includes('activeCongregationId'),
    );
    for (const inner of innerMethods) {
      const callRe = new RegExp(`this\\.${inner.name}\\(([^)]*)\\)`, 'g');
      body = body.replace(callRe, (full, args) => {
        if (args.includes('activeCongregationId')) return full;
        const a = args.trim();
        if (!a) return `this.${inner.name}(activeCongregationId)`;
        return `this.${inner.name}(${a}, activeCongregationId)`;
      });
    }
    body = body.replace(/this\.findAssets\(([^,)]+)\)/g, (full, arg) => {
      if (full.includes('activeCongregationId')) return full;
      return `this.findAssets(${arg}, activeCongregationId)`;
    });
    if (body !== method.body) {
      content = content.replace(method.full, method.full.replace(method.body, body));
    }
  }

  fs.writeFileSync(filePath, content);
  console.log('Patched', filePath);
}

for (const f of serviceFiles) {
  patchService(f, f.includes('finance'));
}

const secPath = 'src/modules/secretariat/secretariat.service.ts';
let sec = fs.readFileSync(secPath, 'utf8');
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
console.log('Patched secretariat.service.ts');

const membersPath = 'src/modules/members/members.service.ts';
let members = fs.readFileSync(membersPath, 'utf8');
if (!members.includes('private async getCongregationId')) {
  members = members.replace(
    /(\) \{\}\s*\n\s*async create)/,
    `) {}

  private async getCongregationId(
    activeCongregationId?: string,
  ): Promise<string> {
    if (activeCongregationId) {
      return activeCongregationId;
    }
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  async create`,
  );
}
members = members.replace(
  /const base = await this\.congregationsService\.getOrCreateBase\(\);/g,
  'const congregationId = await this.getCongregationId(activeCongregationId);',
);
members = members.replace(/congregationId: base\.id/g, 'congregationId');
members = members.replace(/base\.id/g, 'congregationId');
for (const name of ['create', 'findAll', 'findOne', 'update', 'remove']) {
  const re = new RegExp(`async ${name}\\(([^)]*)\\):`, 'g');
  members = members.replace(re, (full, params) => {
    if (params.includes('activeCongregationId')) return full;
    const trimmed = params.trim();
    const suffix = trimmed
      ? `${trimmed}, activeCongregationId?: string`
      : 'activeCongregationId?: string';
    return `async ${name}(${suffix}):`;
  });
}
members = members.replace(
  /private async getMemberOrFail\(id: string\): Promise<Member> \{/,
  'private async getMemberOrFail(id: string, activeCongregationId?: string): Promise<Member> {',
);
members = members.replace(
  /await this\.getMemberOrFail\((id)\)/g,
  'await this.getMemberOrFail($1, activeCongregationId)',
);
fs.writeFileSync(membersPath, members);
console.log('Patched members.service.ts');

const mtPath = 'src/modules/member-transfers/member-transfers.service.ts';
let mt = fs.readFileSync(mtPath, 'utf8');
mt = mt.replace(
  /await this\.documentsService\.createDocument\(\s*\{([\s\S]*?)\},\s*user,\s*\)/g,
  'await this.documentsService.createDocument({$1}, user, activeCongregationId)',
);
fs.writeFileSync(mtPath, mt);
console.log('Patched member-transfers documents call');
