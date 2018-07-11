"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _stringify = _interopRequireDefault(require("@babel/runtime/core-js/json/stringify"));

var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));

var Promise = require("bluebird");

var _require = require("./fetch"),
    fetchNodesFromSearch = _require.fetchNodesFromSearch;

exports.sourceNodes = function (_ref, pluginOptions) {
  var actions = _ref.actions,
      createNodeId = _ref.createNodeId;
  var createNode = actions.createNode;
  return Promise.map(pluginOptions.queries, function (_ref2) {
    var query = _ref2.query,
        limit = _ref2.limit;
    return fetchNodesFromSearch({
      query: query,
      limit: limit
    }).then(function (results) {
      return results.forEach(function (result) {
        result.wikipediaId = result.id;
        result.id = createNodeId(result.id);
        var node = (0, _extends2.default)({}, result, {
          query: query,
          parent: null,
          children: [],
          internal: {
            type: "WikipediaArticle"
          }
        });
        node.internal.contentDigest = require("crypto").createHash("md5").update((0, _stringify.default)(node)).digest("hex");
        createNode(node);
      });
    });
  });
};