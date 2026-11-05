import type { ESTree, Scope, SourceCode, Variable } from "@oxlint/plugins"

export function unwrapArrayExpression(node: ESTree.Node): ESTree.Node {
  while (
    node.type === "ParenthesizedExpression" ||
    node.type === "ChainExpression" ||
    node.type === "TSAsExpression" ||
    node.type === "TSTypeAssertion" ||
    node.type === "TSNonNullExpression" ||
    node.type === "TSSatisfiesExpression"
  ) {
    node = node.expression
  }
  return node
}

export function unreassignedLocalInit(definition: Variable["defs"][number]): ESTree.Expression | null {
  if (definition.type !== "Variable") return null
  let declarator = definition.node
  if (declarator.type !== "VariableDeclarator") return null
  if (declarator.id.type !== "Identifier" || declarator.init === null) return null
  if (declarator.parent.type !== "VariableDeclaration") return null
  if (declarator.parent.kind !== "const" && declarator.parent.kind !== "let") return null
  return declarator.init
}

export function resolveArrayBinding(sourceCode: SourceCode, node: ESTree.Node): Variable | null {
  node = unwrapArrayExpression(node)
  if (node.type !== "Identifier") return null
  let scope: Scope | null = sourceCode.getScope(node)
  while (scope !== null) {
    const variable = scope.set.get(node.name)
    if (variable !== undefined) return variable
    scope = scope.upper
  }
  return null
}

export function readStaticMember(
  node: ESTree.Node,
): { readonly name: string; readonly object: ESTree.Node } | null {
  node = unwrapArrayExpression(node)
  if (node.type !== "MemberExpression") return null
  const property = node.property
  if (!node.computed && property.type === "Identifier") {
    return { name: property.name, object: node.object }
  }
  if (node.computed && property.type === "Literal" && typeof property.value === "string") {
    return { name: property.value, object: node.object }
  }
  return null
}

function isArrayAnnotation(type: ESTree.TSType): boolean {
  if (type.type === "TSArrayType" || type.type === "TSTupleType") return true
  if (type.type === "TSParenthesizedType") return isArrayAnnotation(type.typeAnnotation)
  if (type.type === "TSTypeOperator" && type.operator === "readonly") {
    return isArrayAnnotation(type.typeAnnotation)
  }
  return (
    type.type === "TSTypeReference" &&
    type.typeName.type === "Identifier" &&
    (type.typeName.name === "Array" || type.typeName.name === "ReadonlyArray")
  )
}

export function isLocalArrayValue(
  sourceCode: SourceCode,
  node: ESTree.Node,
  visited = new Set<Variable>(),
): boolean {
  node = unwrapArrayExpression(node)
  if (node.type === "ArrayExpression") return true
  if (node.type === "CallExpression") {
    const method = readStaticMember(node.callee)
    return (
      method !== null &&
      [
        "map",
        "filter",
        "flatMap",
        "slice",
        "concat",
        "toSorted",
        "toReversed",
        "toSpliced",
      ].includes(method.name) &&
      isLocalArrayValue(sourceCode, method.object, visited)
    )
  }
  if (node.type !== "Identifier") return false
  const variable = resolveArrayBinding(sourceCode, node)
  if (variable === null || visited.has(variable)) return false
  visited.add(variable)
  if (variable.references.some((reference) => reference.isWrite() && !reference.init)) return false
  for (const identifier of variable.identifiers) {
    const annotation = identifier.typeAnnotation?.typeAnnotation
    if (annotation !== undefined) return isArrayAnnotation(annotation)
  }
  for (const definition of variable.defs) {
    const init = unreassignedLocalInit(definition)
    if (init !== null) return isLocalArrayValue(sourceCode, init, visited)
  }
  return false
}
