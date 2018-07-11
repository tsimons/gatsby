"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _keys = _interopRequireDefault(require("@babel/runtime/core-js/object/keys"));

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var Promise = require("bluebird");

var querystring = require("querystring");

var axios = require("axios");

var apiBase = "https://en.wikipedia.org/w/api.php?";
var viewBase = "https://en.m.wikipedia.org/wiki/";

var fetchNodesFromSearch = function fetchNodesFromSearch(_ref) {
  var query = _ref.query,
      _ref$limit = _ref.limit,
      limit = _ref$limit === void 0 ? 15 : _ref$limit;
  return search({
    query: query,
    limit: limit
  }).then(function (results) {
    return Promise.map(results,
    /*#__PURE__*/
    function () {
      var _ref2 = (0, _asyncToGenerator2.default)(
      /*#__PURE__*/
      _regenerator.default.mark(function _callee(result, queryIndex) {
        var rendered, metadata;
        return _regenerator.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return getArticle(result.id);

              case 2:
                rendered = _context.sent;
                _context.next = 5;
                return getMetaData(result.id);

              case 5:
                metadata = _context.sent;
                return _context.abrupt("return", {
                  id: result.id,
                  title: result.title,
                  description: result.description,
                  updatedAt: metadata.updated,
                  queryIndex: queryIndex + 1,
                  rendered: rendered
                });

              case 7:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      return function (_x, _x2) {
        return _ref2.apply(this, arguments);
      };
    }());
  });
};

var getMetaData = function getMetaData(name) {
  return axios(apiBase + querystring.stringify({
    action: "query",
    titles: name,
    format: "json",
    redirects: "resolve",
    prop: "extracts|revisions",
    explaintext: 1,
    exsentences: 1
  })).then(function (r) {
    return r.data;
  }).then(function (data) {
    var page = data.query.pages[(0, _keys.default)(data.query.pages)[0]];

    if ("missing" in page) {
      return {
        err: "Not found"
      };
    }

    var updated = new Date().toJSON();

    if (page.revisions) {
      updated = page.revisions[0].timestamp;
    } else {
      console.log({
        page: page,
        revisions: page.revisions
      });
    }

    return {
      title: page.title,
      extract: page.extract,
      urlId: page.title.replace(/\s/g, "_"),
      updated: updated
    };
  });
};

var search = function search(_ref3) {
  var query = _ref3.query,
      limit = _ref3.limit;
  return axios(apiBase + querystring.stringify({
    action: "opensearch",
    search: query,
    format: "json",
    redirects: "resolve",
    limit: limit
  })).then(function (r) {
    return r.data;
  }).then(function (_ref4) {
    var term = _ref4[0],
        pageTitles = _ref4[1],
        descriptions = _ref4[2],
        urls = _ref4[3];
    return pageTitles.map(function (title, i) {
      return {
        title: title,
        description: descriptions[i],
        id: /en.wikipedia.org\/wiki\/(.+)$/.exec(urls[i])[1]
      };
    });
  });
};

var getArticle = function getArticle(name) {
  return axios(viewBase + name + "?action=render").then(function (r) {
    return r.data.replace(/\/\/en\.wikipedia\.org\/wiki\//g, "/wiki/");
  });
};

module.exports = {
  fetchNodesFromSearch: fetchNodesFromSearch,
  getMetaData: getMetaData,
  getArticle: getArticle,
  search: search
};