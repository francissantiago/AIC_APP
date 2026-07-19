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

const helpersWithOptionalBool = {
  getMinistryOrFail: 'true',
  getGroupOrFail: 'true',
  getFamilyOrFail: 'true',
};

const helpersDirect = [
  'getClassOrFail',
  'getAnnouncementOrFail',
  'getMemberOrFail',
  'getTransferOrFail',
  'getDocumentOrFail',
  'getEventOrFail',
  'getVisitorOrFail',
  'getRecordOrFail',
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

function appendContextArg(args, helperName) {
  if (args.includes('activeCongregationId')) return null;
  const a = args.trim();
  if (helpersWithOptionalBool[helperName]) {
    const parts = a ? a.split(',').map((p) => p.trim()) : [];
    if (parts.length === 0) {
      return `${helpersWithOptionalBool[helperName]}, activeCongregationId`;
    }
    if (parts.length === 1) {
      return `${parts[0]}, ${helpersWithOptionalBool[helperName]}, activeCongregationId`;
    }
    return `${a}, activeCongregationId`;
  }
  return a ? `${a}, activeCongregationId` : 'activeCongregationId';
}

function propagate(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const allHelpers = [
    ...Object.keys(helpersWithOptionalBool),
    ...helpersDirect,
  ];

  for (let pass = 0; pass < 30; pass++) {
    const methods = extractMethods(content);
    let changed = false;

    for (const method of methods) {
      let body = method.body;
      let needsParam = method.params.includes('activeCongregationId');

      for (const helper of allHelpers) {
        const callRe = new RegExp(`this\\.${helper}\\(([^)]*)\\)`, 'g');
        let match;
        while ((match = callRe.exec(body)) !== null) {
          const newArgs = appendContextArg(match[1], helper);
          if (newArgs === null) continue;
          needsParam = true;
          body = body.replace(match[0], `this.${helper}(${newArgs})`);
          changed = true;
          break;
        }
        if (changed) break;
      }

      if (!changed) continue;

      if (!method.params.includes('activeCongregationId')) {
        const newHeader = method.header.replace(
          `(${method.params})`,
          `(${addParam(method.params)})`,
        );
        content = content.replace(method.header, newHeader);
      } else {
        content = content.replace(method.full, method.full.replace(method.body, body));
      }
      break;
    }

    if (!changed) break;
  }

  // findAssets in getAssetReport
  content = content.replace(
    /this\.findAssets\((query)\)/g,
    'this.findAssets($1, activeCongregationId)',
  );

  fs.writeFileSync(filePath, content);
  console.log('Propagated', filePath);
}

for (const f of serviceFiles) propagate(f);
console.log('Done');
