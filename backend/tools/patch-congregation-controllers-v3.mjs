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
  let content = fs.readFileSync(file, 'utf8');
  const guardImports = `import { ActiveCongregation } from '${depth}congregations/decorators/active-congregation.decorator';\nimport { CongregationContextGuard } from '${depth}congregations/guards/congregation-context.guard';`;

  content = content.replace(
    /import { PermissionsGuard } from '[^']+';/,
    `$&\n${guardImports}`,
  );
  content = content.replace(
    /@UseGuards\(JwtAuthGuard, PermissionsGuard\)/,
    '@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)',
  );

  // Append activeCongregationId to service calls in return statements
  content = content.replace(
    /return this\.(\w+)\.(\w+)\(([^)]*)\);/g,
    (full, svc, method, args) => {
      if (args.includes('activeCongregationId')) return full;
      const trimmed = args.trim();
      return trimmed
        ? `return this.${svc}.${method}(${trimmed}, activeCongregationId);`
        : `return this.${svc}.${method}(activeCongregationId);`;
    },
  );

  // Add decorator param: empty params
  content = content.replace(
    /(\n\s+\w+)\(\): Promise/g,
    '$1(\n    @ActiveCongregation() activeCongregationId?: string,\n  ): Promise',
  );

  // Add decorator param: existing params — insert before closing ): Promise
  content = content.replace(
    /(\n(?:\s+@[^\n]+\n|\s+\w+[^(]*\([^)]*\),?\n)+)(\s+\): Promise)/g,
    (full, paramsBlock, closing) => {
      if (paramsBlock.includes('@ActiveCongregation')) return full;
      return `${paramsBlock}    @ActiveCongregation() activeCongregationId?: string,\n${closing}`;
    },
  );

  fs.writeFileSync(file, content);
  console.log('Patched', file);
}

for (const c of controllers) {
  patchController(c);
}

// members cross-calls
const membersFile = 'src/modules/members/members.controller.ts';
let m = fs.readFileSync(membersFile, 'utf8');
m = m.replace(
  /return this\.ministriesService\.findByMemberId\(id, activeCongregationId\);/,
  'return this.ministriesService.findByMemberId(id, activeCongregationId);',
);
if (!m.includes('findByMemberId(id, activeCongregationId)')) {
  m = m.replace(
    /return this\.ministriesService\.findByMemberId\(id\);/,
    'return this.ministriesService.findByMemberId(id, activeCongregationId);',
  );
  m = m.replace(
    /return this\.classesService\.findByMemberId\(id\);/,
    'return this.classesService.findByMemberId(id, activeCongregationId);',
  );
}
fs.writeFileSync(membersFile, m);

console.log('Done');
