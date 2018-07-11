"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _keys = _interopRequireDefault(require("@babel/runtime/core-js/object/keys"));

var _require = require("guess-webpack/api"),
    guess = _require.guess;

exports.disableCorePrefetching = function () {
  return true;
};

var currentPathname = function currentPathname() {
  return window.location.pathname.slice(-1) === "/" ? window.location.pathname.slice(0, -1) : window.location.pathname;
};

var initialPath;
var notNavigated = true;

exports.onRouteUpdate = function (_ref) {
  var location = _ref.location;

  if (initialPath !== location.pathname) {
    notNavigated = false;
    return;
  }

  initialPath = location.pathname;
};

var chunksPromise;

var chunks = function chunks(pathPrefix) {
  if (!chunksPromise) {
    chunksPromise = fetch(window.location.origin + "/webpack.stats.json").then(function (res) {
      return res.json();
    });
  }

  return chunksPromise;
};

var hasPrefetched = {};

var prefetch = function prefetch(url) {
  if (hasPrefetched[url]) {
    return;
  }

  hasPrefetched[url] = true;
  var link = document.createElement("link");
  link.setAttribute("rel", "prefetch");
  link.setAttribute("href", url);
  var parentElement = document.getElementsByTagName("head")[0] || document.getElementsByName("script")[0].parentNode;
  parentElement.appendChild(link);
};

exports.onPrefetchPathname = function (_ref2, pluginOptions) {
  var pathname = _ref2.pathname,
      pathPrefix = _ref2.pathPrefix;

  if (process.env.NODE_ENV === "production") {
    var predictions = guess(currentPathname(), [pathname]);
    var matchedPaths = (0, _keys.default)(predictions).filter(function (match) {
      return (// If the prediction is below the minimum threshold for prefetching
        // we skip.
        pluginOptions.minimumThreshold && pluginOptions.minimumThreshold > predictions[match] ? false : true
      );
    }); // Don't prefetch from client for the initial path as we did that
    // during SSR

    if (notNavigated && initialPath === window.location.pathname) {
      return;
    }

    if (matchedPaths.length > 0) {
      matchedPaths.forEach(function (p) {
        chunks(pathPrefix).then(function (chunk) {
          // eslint-disable-next-line
          var page = ___loader.getPage(p);

          if (!page) return;
          var resources = [];

          if (chunk.assetsByChunkName[page.componentChunkName]) {
            resources = resources.concat(chunk.assetsByChunkName[page.componentChunkName]);
          } // eslint-disable-next-line


          resources.push("static/d/" + ___dataPaths[page.jsonName] + ".json"); // TODO add support for pathPrefix

          resources.forEach(function (r) {
            return prefetch("/" + r);
          });
        });
      });
    }
  }
};