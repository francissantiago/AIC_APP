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

  if (!content.includes('CongregationContextGuard')) {
    content = content.replace(
      /import { PermissionsGuard } from '[^']+';/,
      `$&\n${guardImports}`,
    );
    content = content.replace(
      /@UseGuards\(JwtAuthGuard, PermissionsGuard\)/,
      '@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)',
    );
  }

  const blocks = content.split(/(?=\n  @(Get|Post|Put|Patch|Delete)\()/);
  content = blocks
    .map((block, idx) => {
      if (idx === 0) return block;

      let updated = block;

      // Add @ActiveCongregation to handler signature if missing
      if (
        updated.includes('this.') &&
        !updated.includes('@ActiveCongregation()')
      ) {
        updated = updated.replace(
          /(\))\s*:\s*Promise/,
          ',\n    @ActiveCongregation() activeCongregationId?: string,\n  ): Promise',
        );
        updated = updated.replace(
          /\(\s*\)\s*:\s*Promise/,
          '(\n    @ActiveCongregation() activeCongregationId?: string,\n  ): Promise',
        );
      }

      // Append activeCongregationId to service calls
      updated = updated.replace(
        /return this\.(\w+)\.(\w+)\(([^)]*)\);/g,
        (full, svc, method, args) => {
          if (args.includes('activeCongregationId')) return full;
          const trimmed = args.trim();
          return trimmed
            ? `return this.${svc}.${method}(${trimmed}, activeCongregationId);`
            : `return this.${svc}.${method}(activeCongregationId);`;
        },
      );

      return updated;
    })
    .join('');

  fs.writeFileSync(file, content);
  console.log('Patched', file);
}

for (const c of controllers) patchController(c);

console.log('Done');
