import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'src');
const errors = [];
const modules = new Map();

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
function label(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}
function resolveLocal(specifier, file) {
  const base = specifier.startsWith('@/')
    ? path.join(source, specifier.slice(2))
    : path.resolve(path.dirname(file), specifier);
  return [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]
    .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

for (const legacy of ['components', 'lib', 'hooks', 'types']) {
  if (fs.existsSync(path.join(source, legacy))) errors.push(`Legacy folder remains: src/${legacy}`);
}
for (const file of walk(source).filter(file => /\.tsx?$/.test(file))) {
  const content = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  const directives = new Set(ast.statements
    .filter(node => ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression))
    .map(node => node.expression.text));
  const imports = [];
  function visit(node) {
    let literal;
    let typeOnly = false;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      literal = node.moduleSpecifier;
      typeOnly = ts.isImportDeclaration(node) ? Boolean(node.importClause?.isTypeOnly) : node.isTypeOnly;
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings) && !node.importClause.name && bindings.elements.length) {
        typeOnly ||= bindings.elements.every(binding => binding.isTypeOnly);
      }
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      literal = node.arguments[0];
    }
    if (literal && ts.isStringLiteral(literal)) {
      const specifier = literal.text;
      if (/^@\/(components|lib|hooks|types)(\/|$)/.test(specifier)) {
        errors.push(`${label(file)}: legacy import ${specifier}`);
      }
      if (specifier.startsWith('@/') || specifier.startsWith('.')) {
        const target = resolveLocal(specifier, file);
        if (!target) errors.push(`${label(file)}: unresolved import ${specifier}`);
        else imports.push({ target, typeOnly });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  const serverOnly = ast.statements.some(node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === 'server-only');
  if (label(file).startsWith('src/server/') && !serverOnly) {
    errors.push(`${label(file)}: server infrastructure must import 'server-only'`);
  }
  modules.set(file, { imports, directives, serverOnly });
}

// Follow client runtime imports transitively. Server Actions are an intentional boundary.
for (const [entry, module] of modules) {
  if (!module.directives.has('use client')) continue;
  const visited = new Set();
  function inspect(file, trail) {
    if (visited.has(file)) return;
    visited.add(file);
    const current = modules.get(file);
    if (!current || current.directives.has('use server')) return;
    if (current.serverOnly || label(file).startsWith('src/server/')) {
      errors.push(`Client imports server code: ${trail.map(label).join(' -> ')}`);
      return;
    }
    for (const dependency of current.imports.filter(dependency => !dependency.typeOnly)) {
      inspect(dependency.target, [...trail, dependency.target]);
    }
  }
  inspect(entry, [entry]);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Structure check: ${modules.size} modules, imports and client/server boundaries OK.`);
}
