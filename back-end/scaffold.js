const fs = require('fs');
const path = require('path');

const modules = [
  'plans',
  'platform-admin-users',
  'companies',
  'subscriptions',
  'platform-support-access',
  'permissions',
  'role-templates',
  'role-assignments',
  'branches',
  'compliance-categories',
  'compliance-bindings',
  'comments',
  'attachments'
];

const basePath = path.join(__dirname, 'src', 'modules');

if (!fs.existsSync(basePath)) {
  fs.mkdirSync(basePath, { recursive: true });
}

modules.forEach(mod => {
  const modPath = path.join(basePath, mod);
  if (!fs.existsSync(modPath)) {
    fs.mkdirSync(modPath);
  }

  // dto folder
  const dtoPath = path.join(modPath, 'dto');
  if (!fs.existsSync(dtoPath)) fs.mkdirSync(dtoPath);

  // Class names
  const className = mod.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');

  // 1. Module
  const moduleContent = `import { Module } from '@nestjs/common';
import { ${className}Service } from './${mod}.service';
import { ${className}Controller } from './${mod}.controller';

@Module({
  controllers: [${className}Controller],
  providers: [${className}Service],
})
export class ${className}Module {}
`;
  fs.writeFileSync(path.join(modPath, `${mod}.module.ts`), moduleContent);

  // 2. Controller
  const controllerContent = `import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ${className}Service } from './${mod}.service';

@Controller('${mod}')
export class ${className}Controller {
  constructor(private readonly ${mod.replace(/-/g, '')}Service: ${className}Service) {}

  @Get()
  findAll() {
    return this.${mod.replace(/-/g, '')}Service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.${mod.replace(/-/g, '')}Service.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.${mod.replace(/-/g, '')}Service.remove(id);
  }
}
`;
  fs.writeFileSync(path.join(modPath, `${mod}.controller.ts`), controllerContent);

  // 3. Service
  const serviceContent = `import { Injectable } from '@nestjs/common';

@Injectable()
export class ${className}Service {
  findAll() {
    return \`This action returns all ${mod}\`;
  }

  findOne(id: string) {
    return \`This action returns a #${mod}\`;
  }

  remove(id: string) {
    return \`This action removes a #${mod}\`;
  }
}
`;
  fs.writeFileSync(path.join(modPath, `${mod}.service.ts`), serviceContent);
});

console.log('All modules generated successfully.');
