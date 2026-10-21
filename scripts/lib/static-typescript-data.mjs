import { readFileSync } from 'node:fs'
import ts from 'typescript'

export function unwrapStaticExpression(node) {
  if (ts.isSatisfiesExpression(node) || ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) {
    return unwrapStaticExpression(node.expression)
  }
  return node
}

function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text
  throw new Error(`Unsupported property name: ${node.getText()}`)
}

export function staticLiteralValue(input) {
  const node = unwrapStaticExpression(input)
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (ts.isNumericLiteral(node)) return Number(node.text)
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  if (node.kind === ts.SyntaxKind.NullKeyword) return null
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) {
    return -Number(staticLiteralValue(node.operand))
  }
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(staticLiteralValue)
  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(node.properties.map((property) => {
      if (!ts.isPropertyAssignment(property)) {
        throw new Error(`Only static property assignments are supported: ${property.getText()}`)
      }
      return [propertyName(property.name), staticLiteralValue(property.initializer)]
    }))
  }
  throw new Error(`Unsupported static expression: ${node.getText()}`)
}

export function findStaticVariable(sourcePath, variableName) {
  const source = readFileSync(sourcePath, 'utf8')
  const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  let initializer
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === variableName) {
      initializer = node.initializer
    }
    if (!initializer) ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  if (!initializer) throw new Error(`Missing ${variableName} in ${sourcePath}`)
  return unwrapStaticExpression(initializer)
}

export function readStaticDefaultExport(sourcePath) {
  const source = readFileSync(sourcePath, 'utf8')
  const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  let initializer
  sourceFile.forEachChild((node) => {
    if (ts.isExportAssignment(node) && !node.isExportEquals) initializer = node.expression
  })
  if (!initializer) throw new Error(`Missing default export in ${sourcePath}`)
  return staticLiteralValue(initializer)
}
