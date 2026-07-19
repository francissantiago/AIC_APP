import fs from 'fs';

const controllers = [
  { file: 'src/modules/finance/finance.controller.ts', depth: '../' },
  { file: 'src/modules/assets/assets.controller.ts', depth: '../' },
  { file: 'src/modules/ministries/ministries.controller.ts', depth: '../' },
  { file: 'src/modules/classes/classes.controller.ts', depth: '../' },
  { file: 'src/modules/families/families.controller.ts', depth: '../' },
  { file: 'src/modules/small-groups/small-groups.controller.ts', depth: '../' },
  { file: 'src/modules/announcements/announcements.controller.ts', depth: '../' },
  { file: 'src/modules/member-transfers/member-transfers.controller.ts', depth: '../' },
  { file: 'src/modules/secretariat/documents/documents.controller.ts', depth: '../../' },
  { file: 'src/modules/secretariat/calendar/calendar.controller.ts', depth: '../../' },
  { file: 'src/modules/secretariat/visitors/visitors.controller.ts', depth: '../../' },
  { file: 'src/modules/secretariat/attendance/attendance.controller.ts', depth: '../../' },
  { file: 'src/modules/secretariat/secretariat.controller.ts', depth: '../' },
  { file: 'src/modules/members/members.controller.ts', depth: '../' },
];

function patchController({ file, depth }) {
  let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const guardImports = [
    `import { ActiveCongregation } from '${depth}congregations/decorators/active-congregation.decorator';`,
    `import { CongregationContextGuard } from '${depth}congregations/guards/congregation-context.guard';`,
  ];

  const permIdx = lines.findIndex((l) =>
    l.includes('import { PermissionsGuard }'),
  );
  if (permIdx >= 0 && !lines.some((l) => l.includes('CongregationContextGuard'))) {
    lines.splice(permIdx + 1, 0, ...guardImports);
  }

  lines = lines.map((line) =>
    line.replace(
      '@UseGuards(JwtAuthGuard, PermissionsGuard)',
      '@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)',
    ),
  );

  let inHandler = false;
  let handlerHasContextParam = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s+@(Get|Post|Put|Patch|Delete)\(/.test(line)) {
      inHandler = true;
      handlerHasContextParam = false;
      continue;
    }

    if (inHandler && line.includes('@ActiveCongregation()')) {
      handlerHasContextParam = true;
    }

    if (inHandler && /^\s+\):\s*Promise/.test(line) && !handlerHasContextParam) {
      lines.splice(i, 0, '    @ActiveCongregation() activeCongregationId?: string,');
      handlerHasContextParam = true;
      i++;
    }

    if (inHandler && /return this\.\w+\.\w+\(([^)]*)\);/.test(line)) {
      lines[i] = line.replace(
        /return this\.(\w+)\.(\w+)\(([^)]*)\);/,
        (full, svc, method, args) => {
          if (args.includes('activeCongregationId')) return full;
          const trimmed = args.trim();
          return trimmed
            ? `return this.${svc}.${method}(${trimmed}, activeCongregationId);`
            : `return this.${svc}.${method}(activeCongregationId);`;
        },
      );
    }

    if (inHandler && /^\s+\{\s*$/.test(line)) {
      // body started — keep processing until closing brace at method level
    }

    if (inHandler && /^\s+\}\s*$/.test(line)) {
      // could be end of handler or inner block — simplistic: reset after return seen
      if (lines.slice(Math.max(0, i - 5), i).some((l) => l.includes('return this.'))) {
        inHandler = false;
      }
    }
  }

  fs.writeFileSync(file, lines.join('\n'));
  console.log('Patched', file);
}

for (const c of controllers) patchController(c);

// members cross routes
const membersFile = 'src/modules/members/members.controller.ts';
let m = fs.readFileSync(membersFile, 'utf8');
m = m.replace(
  /return this\.ministriesService\.findByMemberId\(id\);/,
  'return this.ministriesService.findByMemberId(id, activeCongregationId);',
);
m = m.replace(
  /return this\.classesService\.findByMemberId\(id\);/,
  'return this.classesService.findByMemberId(id, activeCongregationId);',
);
if (m.includes('findMinistries') && !m.includes('findByMemberId(id, activeCongregationId)')) {
  // ensure findMinistries has param - line processor should handle
}
fs.writeFileSync(membersFile, m);

console.log('Done');
