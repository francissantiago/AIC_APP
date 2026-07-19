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

  const lines = content.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    out.push(line);

    if (/^\s+@(Get|Post|Put|Patch|Delete)\(/.test(line)) {
      // collect handler until opening brace
      const handlerLines = [];
      i++;
      while (i < lines.length && !/^\s+\{\s*$/.test(lines[i])) {
        handlerLines.push(lines[i]);
        i++;
      }
      if (i >= lines.length) break;
      const bodyOpen = lines[i];
      let handlerText = handlerLines.join('\n');

      if (!handlerText.includes('activeCongregationId')) {
        handlerText = handlerText.replace(
          /(\))\s*:\s*Promise/,
          ',\n    @ActiveCongregation() activeCongregationId?: string,\n  ): Promise',
        );
      }

      out.push(...handlerText.split('\n'));
      out.push(bodyOpen);

      // process body until closing brace at same indent
      const bodyIndent = bodyOpen.match(/^(\s+)/)?.[1] ?? '  ';
      i++;
      while (i < lines.length) {
        let bodyLine = lines[i];
        if (
          bodyLine.startsWith(bodyIndent + '}') &&
          bodyLine.trim() === '}'
        ) {
          out.push(bodyLine);
          i++;
          break;
        }
        bodyLine = bodyLine.replace(
          /return this\.(\w+)\.(\w+)\(([^)]*)\);/g,
          (full, svc, method, args) => {
            if (args.includes('activeCongregationId')) return full;
            const trimmed = args.trim();
            return trimmed
              ? `return this.${svc}.${method}(${trimmed}, activeCongregationId);`
              : `return this.${svc}.${method}(activeCongregationId);`;
          },
        );
        out.push(bodyLine);
        i++;
      }
      continue;
    }
    i++;
  }

  fs.writeFileSync(file, out.join('\n'));
  console.log('Patched', file);
}

for (const c of controllers) {
  patchController(c);
}

console.log('Done');
