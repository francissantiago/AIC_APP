import fs from 'fs';
import path from 'path';

const controllers = [
  'src/modules/finance/finance.controller.ts',
  'src/modules/assets/assets.controller.ts',
  'src/modules/ministries/ministries.controller.ts',
  'src/modules/classes/classes.controller.ts',
  'src/modules/families/families.controller.ts',
  'src/modules/small-groups/small-groups.controller.ts',
  'src/modules/announcements/announcements.controller.ts',
  'src/modules/member-transfers/member-transfers.controller.ts',
  'src/modules/secretariat/documents/documents.controller.ts',
  'src/modules/secretariat/calendar/calendar.controller.ts',
  'src/modules/secretariat/visitors/visitors.controller.ts',
  'src/modules/secretariat/attendance/attendance.controller.ts',
  'src/modules/secretariat/secretariat.controller.ts',
  'src/modules/members/members.controller.ts',
];

function patchController(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('CongregationContextGuard')) {
    console.log('Already patched', filePath);
    return;
  }

  const guardImport =
    "import { ActiveCongregation } from '../congregations/decorators/active-congregation.decorator';\nimport { CongregationContextGuard } from '../congregations/guards/congregation-context.guard';";
  const guardImportSecretariat =
    "import { ActiveCongregation } from '../../congregations/decorators/active-congregation.decorator';\nimport { CongregationContextGuard } from '../../congregations/guards/congregation-context.guard';";
  const guardImportMembers =
    "import { ActiveCongregation } from '../congregations/decorators/active-congregation.decorator';\nimport { CongregationContextGuard } from '../congregations/guards/congregation-context.guard';";

  if (filePath.includes('secretariat/secretariat')) {
    content = content.replace(
      /import { JwtAuthGuard } from '\.\.\/auth\/guards\/jwt-auth\.guard';/,
      `$&\n${guardImportSecretariat}`,
    );
  } else if (filePath.includes('secretariat/')) {
    content = content.replace(
      /import { JwtAuthGuard } from '\.\.\/\.\.\/auth\/guards\/jwt-auth\.guard';/,
      `$&\n${guardImportSecretariat}`,
    );
  } else {
    content = content.replace(
      /import { JwtAuthGuard } from '\.\.\/auth\/guards\/jwt-auth\.guard';/,
      `$&\n${guardImport}`,
    );
  }

  content = content.replace(
    /@UseGuards\(JwtAuthGuard, PermissionsGuard\)/,
    '@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)',
  );

  // Add @ActiveCongregation param before closing paren of each handler that returns this.*Service
  content = content.replace(
    /(\):\s*Promise<[^>]+>\s*\{\s*\n\s*return this\.(\w+Service)\.(\w+)\(([\s\S]*?)\);)/g,
    (full, _g, _svc, _method, args) => {
      if (full.includes('@ActiveCongregation')) return full;
      const withParam = full.replace(
        /\):\s*Promise/,
        ',\n    @ActiveCongregation() activeCongregationId?: string,\n  ): Promise',
      );
      const trimmedArgs = args.trim();
      const newArgs = trimmedArgs
        ? `${trimmedArgs}, activeCongregationId`
        : 'activeCongregationId';
      return withParam.replace(
        `return this.${_svc}.${_method}(${args});`,
        `return this.${_svc}.${_method}(${newArgs});`,
      );
    },
  );

  // handlers with block bodies (not single return)
  content = content.replace(
    /(\([^)]*\):\s*Promise<[^>]+>\s*\{)(?![\s\S]*@ActiveCongregation)/g,
    (header) => {
      if (!header.includes('this.')) return header;
      if (header.includes('activeCongregationId')) return header;
      return header.replace(
        /\):\s*Promise/,
        ',\n    @ActiveCongregation() activeCongregationId?: string,\n  ): Promise',
      );
    },
  );

  fs.writeFileSync(filePath, content);
  console.log('Patched controller', filePath);
}

for (const c of controllers) {
  if (fs.existsSync(c)) patchController(c);
}

// Manual fix for members controller cross-calls - read and patch separately
const membersCtrl = 'src/modules/members/members.controller.ts';
if (fs.existsSync(membersCtrl)) {
  let m = fs.readFileSync(membersCtrl, 'utf8');
  if (!m.includes('CongregationContextGuard')) {
    m = m.replace(
      /import { JwtAuthGuard } from '\.\.\/auth\/guards\/jwt-auth\.guard';/,
      `$&\nimport { ActiveCongregation } from '../congregations/decorators/active-congregation.decorator';\nimport { CongregationContextGuard } from '../congregations/guards/congregation-context.guard';`,
    );
    m = m.replace(
      /@UseGuards\(JwtAuthGuard, PermissionsGuard\)/,
      '@UseGuards(JwtAuthGuard, PermissionsGuard, CongregationContextGuard)',
    );
  }
  m = m.replace(
    /return this\.ministriesService\.findByMemberId\(id\);/g,
    'return this.ministriesService.findByMemberId(id, activeCongregationId);',
  );
  m = m.replace(
    /return this\.classesService\.findByMemberId\(id\);/g,
    'return this.classesService.findByMemberId(id, activeCongregationId);',
  );
  // add activeCongregation to findMinistries/findClasses signatures if missing
  m = m.replace(
    /findMinistries\(\s*\n\s*@Param\('id', ParseUUIDPipe\) id: string,\s*\n\s*\):/,
    "findMinistries(\n    @Param('id', ParseUUIDPipe) id: string,\n    @ActiveCongregation() activeCongregationId?: string,\n  ):",
  );
  m = m.replace(
    /findClasses\(\s*\n\s*@Param\('id', ParseUUIDPipe\) id: string,\s*\n\s*\):/,
    "findClasses(\n    @Param('id', ParseUUIDPipe) id: string,\n    @ActiveCongregation() activeCongregationId?: string,\n  ):",
  );
  fs.writeFileSync(membersCtrl, m);
  console.log('Patched members.controller.ts');
}

console.log('Controllers done');
