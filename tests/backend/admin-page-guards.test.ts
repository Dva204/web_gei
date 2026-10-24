import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

const root = join(process.cwd(), 'src/app/admin');
function pages(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? pages(join(directory, entry.name)) : entry.name === 'page.tsx' ? [join(directory, entry.name)] : []);
}
it('guards every private admin page before reading business data, not only its layout', () => {
  const privatePages = pages(root).filter(file => !['dang-nhap/page.tsx', '403/page.tsx'].includes(relative(root, file).replaceAll('\\', '/')));
  expect(privatePages).toHaveLength(24);
  for (const file of privatePages) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const component = source.statements.find(statement => ts.isFunctionDeclaration(statement)
      && statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword)) as ts.FunctionDeclaration;
    expect(component?.body, file).toBeDefined();
    const first = component.body!.statements[0];
    expect(ts.isExpressionStatement(first) && ts.isAwaitExpression(first.expression), file).toBe(true);
    const call = (first as ts.ExpressionStatement).expression as ts.AwaitExpression;
    expect(ts.isCallExpression(call.expression) && call.expression.expression.getText(source) === 'requireStaffPage', file).toBe(true);
    if (relative(root, file).replaceAll('\\', '/').startsWith('truyen/[id]/')) {
      expect((call.expression as ts.CallExpression).arguments[1]?.getText(source), file).toBe('(await params).id');
    }
  }
});
