"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _keys = _interopRequireDefault(require("@babel/runtime/core-js/object/keys"));

var _ = require("lodash");

var nodePath = require("path");

var fs = require("fs");

var React = require("react");

var _require = require("guess-webpack/api"),
    guess = _require.guess; // Google Analytics removes trailing slashes from pathnames


var removeTrailingSlash = function removeTrailingSlash(pathname) {
  return pathname.slice(-1) === "/" ? pathname.slice(0, -1) : pathname;
};

function urlJoin() {
  for (var _len = arguments.length, parts = new Array(_len), _key = 0; _key < _len; _key++) {
    parts[_key] = arguments[_key];
  }

  return parts.reduce(function (r, next) {
    var segment = next == null ? "" : String(next).replace(/^\/+/, "");
    return segment ? r.replace(/\/$/, "") + "/" + segment : r;
  }, "");
}

var pd = [];

var readPageData = function readPageData() {
  if (pd.length > 0) {
    return pd;
  } else {
    pd = JSON.parse(fs.readFileSync(nodePath.join(process.cwd(), ".cache", "data.json")));
    return pd;
  }
};

var s;

var readStats = function readStats() {
  if (s) {
    return s;
  } else {
    s = JSON.parse(fs.readFileSync(process.cwd() + "/public/webpack.stats.json", "utf-8"));
    return s;
  }
};

exports.onRenderBody = function (_ref, pluginOptions) {
  var setHeadComponents = _ref.setHeadComponents,
      pathname = _ref.pathname,
      pathPrefix = _ref.pathPrefix;

  if (process.env.NODE_ENV === "production") {
    var pagesData = readPageData();
    var stats = readStats();
    var path = removeTrailingSlash(pathname);
    var predictions = guess(path);

    if (!_.isEmpty(predictions)) {
      var matchedPaths = (0, _keys.default)(predictions).filter(function (match) {
        return (// If the prediction is below the minimum threshold for prefetching
          // we skip.
          pluginOptions.minimumThreshold && pluginOptions.minimumThreshold > predictions[match] ? false : true
        );
      });
      var matchedPages = matchedPaths.map(function (match) {
        return _.find(pagesData.pages, function (page) {
          return removeTrailingSlash(page.path) === match;
        });
      });
      var componentUrls = [];
      matchedPages.forEach(function (p) {
        if (p && p.componentChunkName) {
          var fetchKey = "assetsByChunkName[" + p.componentChunkName + "]";

          var chunks = _.get(stats, fetchKey);

          componentUrls = componentUrls.concat(chunks);
        }
      });
      componentUrls = _.uniq(componentUrls);
      var components = componentUrls.map(function (c) {
        return React.createElement("Link", {
          as: c.slice(-2) === "js" ? "script" : undefined,
          rel: c.slice(-2) === "js" ? "prefetch" : "prefetch alternate stylesheet",
          key: c,
          href: urlJoin(pathPrefix, c)
        });
      });
      setHeadComponents(components);
    }

    return true;
  }

  return false;
};