// Copyright © 2025 Jalapeno Labs

import {
  Project,
  VariableStatement,
  InterfaceDeclaration,
  TypeAliasDeclaration,
  EnumDeclaration,
  ClassDeclaration
} from 'ts-morph'
import ts from 'typescript'

export function extractExportTsMorph(
  rawFileContents: string,
  exportName: string
): string {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      allowJs: true,
      target: ts.ScriptTarget.ES2015,
      module: ts.ModuleKind.CommonJS,
      strict: true
    }
  })

  const sourceFile = project.createSourceFile(
    'source.ts',
    rawFileContents.trim()
  )

  // try grabbing a top-level variable/const
  const varDecl = sourceFile.getVariableDeclaration(exportName)
  if (varDecl) {
    // get the full const/let/var statement
    const varStmt = varDecl.getVariableStatement() as VariableStatement | undefined
    if (varStmt) {
      return varStmt.getText()
    }
  }

  // try grabbing a type alias
  const typeAlias = sourceFile.getTypeAlias(exportName) as TypeAliasDeclaration | undefined
  if (typeAlias) {
    return typeAlias.getText()
  }

  // try grabbing an interface
  const interfaceDecl = sourceFile.getInterface(exportName) as InterfaceDeclaration | undefined
  if (interfaceDecl) {
    return interfaceDecl.getText()
  }

  // try grabbing an enum
  const enumDecl = sourceFile.getEnum(exportName) as EnumDeclaration | undefined
  if (enumDecl) {
    return enumDecl.getText()
  }

  // try grabbing a class
  const classDecl = sourceFile.getClass(exportName) as ClassDeclaration | undefined
  if (classDecl) {
    return classDecl.getText()
  }

  return `This file has no export or declaration: '${exportName}'`
}
