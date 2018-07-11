"use strict";

exports.__esModule = true;
exports.default = _default;
exports.getGraphQLTag = getGraphQLTag;

/*  eslint-disable new-cap */
const graphql = require(`gatsby/graphql`);

const murmurhash = require(`./murmur`);

const nodePath = require(`path`);

const isGlobalIdentifier = tag => tag.isIdentifier({
  name: `graphql`
}) && tag.scope.hasGlobal(`graphql`);

function getTagImport(tag) {
  const name = tag.node.name;
  const binding = tag.scope.getBinding(name);
  if (!binding) return null;
  const path = binding.path;
  const parent = path.parentPath;
  if (binding.kind === `module` && parent.isImportDeclaration() && parent.node.source.value === `gatsby`) return path;

  if (path.isVariableDeclarator() && path.get(`init`).isCallExpression() && path.get(`init.callee`).isIdentifier({
    name: `require`
  }) && path.get(`init`).node.arguments[0].value === `gatsby`) {
    const id = path.get(`id`);

    if (id.isObjectPattern()) {
      return id.get(`properties`).find(path => path.get(`value`).node.name === name);
    }

    return id;
  }

  return null;
}

function isGraphqlTag(tag) {
  const isExpression = tag.isMemberExpression();
  const identifier = isExpression ? tag.get(`object`) : tag;
  const importPath = getTagImport(identifier);
  if (!importPath) return isGlobalIdentifier(tag);

  if (isExpression && (importPath.isImportNamespaceSpecifier() || importPath.isIdentifier())) {
    return tag.get(`property`).node.name === `graphql`;
  }

  if (importPath.isImportSpecifier()) return importPath.node.imported.name === `graphql`;
  if (importPath.isObjectProperty()) return importPath.get(`key`).node.name === `graphql`;
  return false;
}

function removeImport(tag) {
  const isExpression = tag.isMemberExpression();
  const identifier = isExpression ? tag.get(`object`) : tag;
  const importPath = getTagImport(identifier);
  if (!importPath) return;
  const parent = importPath.parentPath;

  if (importPath.isImportSpecifier()) {
    if (parent.node.specifiers.length === 1) parent.remove();else importPath.remove();
  }

  if (importPath.isObjectProperty()) {
    var _importPath$findParen;

    if (parent.node.properties.length === 1) (_importPath$findParen = importPath.findParent(p => p.isVariableDeclaration())) === null || _importPath$findParen === void 0 ? void 0 : _importPath$findParen.remove();else importPath.remove();
  }

  if (importPath.isIdentifier()) {
    var _importPath$findParen2;

    (_importPath$findParen2 = importPath.findParent(p => p.isVariableDeclaration())) === null || _importPath$findParen2 === void 0 ? void 0 : _importPath$findParen2.remove();
  }
}

function getGraphQLTag(path) {
  const tag = path.get(`tag`);
  const isGlobal = isGlobalIdentifier(tag);
  if (!isGlobal && !isGraphqlTag(tag)) return {};
  const quasis = path.node.quasi.quasis;

  if (quasis.length !== 1) {
    throw new Error(`BabelPluginRemoveGraphQL: String interpolations are not allowed in graphql ` + `fragments. Included fragments should be referenced ` + `as \`...MyModule_foo\`.`);
  }

  const text = quasis[0].value.raw;
  const hash = murmurhash(text, `abc`);

  try {
    const ast = graphql.parse(text);

    if (ast.definitions.length === 0) {
      throw new Error(`BabelPluginRemoveGraphQL: Unexpected empty graphql tag.`);
    }

    return {
      ast,
      text,
      hash,
      isGlobal
    };
  } catch (err) {
    throw new Error(`BabelPluginRemoveGraphQLQueries: GraphQL syntax error in query:\n\n${text}\n\nmessage:\n\n${err.message}`);
  }
}

function _default({
  types: t
}) {
  return {
    visitor: {
      Program(path, state) {
        const nestedJSXVistor = {
          JSXIdentifier(path2) {
            if ([`production`, `test`].includes(process.env.NODE_ENV) && path2.isJSXIdentifier({
              name: `StaticQuery`
            }) && path2.referencesImport(`gatsby`)) {
              const identifier = t.identifier(`staticQueryData`);
              const filename = state.file.opts.filename;
              const shortResultPath = `public/static/d/${this.queryHash}.json`;
              const resultPath = nodePath.join(process.cwd(), shortResultPath); // Add query

              path2.parent.attributes.push(t.jSXAttribute(t.jSXIdentifier(`data`), t.jSXExpressionContainer(identifier))); // Add import

              const importDefaultSpecifier = t.importDefaultSpecifier(identifier);
              const importDeclaration = t.importDeclaration([importDefaultSpecifier], t.stringLiteral(filename ? nodePath.relative(nodePath.parse(filename).dir, resultPath) : shortResultPath));
              path.unshiftContainer(`body`, importDeclaration);
            }
          }

        };
        path.traverse({
          TaggedTemplateExpression(path2, state) {
            const {
              ast,
              text,
              hash,
              isGlobal
            } = getGraphQLTag(path2);
            if (!ast) return null;
            const queryHash = hash.toString();
            const query = text;
            const tag = path2.get(`tag`);
            if (!isGlobal) removeImport(tag); // Replace the query with the hash of the query.

            path2.replaceWith(t.StringLiteral(queryHash));
            path.traverse(nestedJSXVistor, {
              queryHash,
              query
            });
            return null;
          }

        });
      }

    }
  };
}