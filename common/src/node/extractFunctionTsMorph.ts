// Copyright © 2026 Jalapeno Labs

import {
  Project,
  SyntaxKind,
  Statement,
  ImportDeclaration,
  VariableStatement,
  InterfaceDeclaration,
  TypeAliasDeclaration,
  EnumDeclaration,
  ClassDeclaration,
} from 'ts-morph'
import ts from 'typescript'

// Given raw JS/TS text and a top-level function name, return only:
//  • the imports/top-level consts/types/etc. that the function actually uses
//  • the JSDoc block(s) attached to that function (if any)
//  • the function declaration itself
export function extractFunctionTsMorph(
  rawFileContents: string,
  functionName: string,
): string {
  // 1) Create an in-memory ts-morph Project (no tsconfig needed on disk)
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      allowJs: true,
      target: ts.ScriptTarget.ES2015,
      module: ts.ModuleKind.CommonJS,
      strict: true,
    },
  })

  // 2) Add a “virtual” source file named source.ts
  const sourceFile = project.createSourceFile(
    'source.ts',
    rawFileContents.trim(),
  )

  // 3) Find the named top-level function
  const funcDecl = sourceFile.getFunction(functionName)
  if (!funcDecl) {
    return ''
  }

  // 4) Collect every identifier used inside that function (signature + body)
  const identifierNodes = funcDecl.getDescendantsOfKind(SyntaxKind.Identifier)
  const usedNames = new Set<string>(identifierNodes.map((id) => id.getText()))
  usedNames.add(functionName)

  // 5) Scan top-level statements in order, picking only those whose exported names
  //    appear in usedNames (imports, const/let/var, interfaces, types, enums, classes)
  const statementsToInclude: Statement[] = []
  for (const stmt of sourceFile.getStatements()) {
    // ——— ImportDeclaration ———
    if (stmt.getKind() === SyntaxKind.ImportDeclaration) {
      const importDecl = stmt as ImportDeclaration

      // default import?
      const defaultImport = importDecl.getDefaultImport()?.getText()
      if (defaultImport && usedNames.has(defaultImport)) {
        statementsToInclude.push(stmt)
        continue
      }

      // namespace import?
      const nsImport = importDecl.getNamespaceImport()?.getText()
      if (nsImport && usedNames.has(nsImport)) {
        statementsToInclude.push(stmt)
        continue
      }

      // named imports?
      for (const ni of importDecl.getNamedImports()) {
        if (usedNames.has(ni.getName())) {
          statementsToInclude.push(stmt)
          break
        }
      }
      continue
    }

    // ——— VariableStatement (const/let/var) ———
    if (stmt.getKind() === SyntaxKind.VariableStatement) {
      const varStmt = stmt as VariableStatement
      for (const decl of varStmt.getDeclarations()) {
        if (usedNames.has(decl.getName())) {
          statementsToInclude.push(stmt)
          break
        }
      }
      continue
    }

    // ——— InterfaceDeclaration ———
    if (stmt.getKind() === SyntaxKind.InterfaceDeclaration) {
      const interfaceDecl = stmt as InterfaceDeclaration
      if (usedNames.has(interfaceDecl.getName())) {
        statementsToInclude.push(stmt)
      }
      continue
    }

    // ——— TypeAliasDeclaration ———
    if (stmt.getKind() === SyntaxKind.TypeAliasDeclaration) {
      const typeAlias = stmt as TypeAliasDeclaration
      if (usedNames.has(typeAlias.getName())) {
        statementsToInclude.push(stmt)
      }
      continue
    }

    // ——— EnumDeclaration ———
    if (stmt.getKind() === SyntaxKind.EnumDeclaration) {
      const enumDecl = stmt as EnumDeclaration
      if (usedNames.has(enumDecl.getName())) {
        statementsToInclude.push(stmt)
      }
      continue
    }

    // ——— ClassDeclaration ———
    if (stmt.getKind() === SyntaxKind.ClassDeclaration) {
      const classDecl = stmt as ClassDeclaration
      const name = classDecl.getName()
      if (name && usedNames.has(name)) {
        statementsToInclude.push(stmt)
      }
      continue
    }
  }

  // 6) Build the final output:
  //    a) All selected imports/consts/types/etc.
  //    b) All JSDoc blocks attached to the function (if any)
  //    c) The function declaration itself
  const parts: string[] = []

  for (const stmt of statementsToInclude) {
    parts.push(stmt.getText())
  }

  // 6b) Emit JSDoc (if present)
  const jsDocs = funcDecl.getJsDocs()
  for (const doc of jsDocs) {
    // getText() returns the entire /** ... */ block
    parts.push(doc.getText())
  }

  // 6c) Finally, emit the function declaration (signature + body)
  parts.push(funcDecl.getText())

  // Join with a blank line between each block for readability
  return parts.join('\n\n')
}
