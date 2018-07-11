"use strict";

var _require = require("guess-webpack"),
    GuessPlugin = _require.GuessPlugin;

var guessPlugin;

exports.onPreBootstrap = function (_, pluginOptions) {
  var period = pluginOptions.period,
      GAViewID = pluginOptions.GAViewID;
  period.startDate = new Date(period.startDate);
  period.endDate = new Date(period.endDate);
  guessPlugin = new GuessPlugin({
    // GA view ID.
    GA: GAViewID,
    // Hints Guess to not perform prefetching and delegate this logic to
    // its consumer.
    runtime: {
      delegate: true
    },
    // Since Gatsby already has the required metadata for pre-fetching,
    // Guess does not have to collect the routes and the corresponding
    // bundle entry points.
    routeProvider: false,
    // Optional argument. It takes the data for the last year if not
    // specified.
    period: period ? period : {
      startDate: new Date("2018-1-1"),
      endDate: new Date()
    }
  });
};

exports.onCreateWebpackConfig = function (_ref, pluginOptions) {
  var actions = _ref.actions,
      stage = _ref.stage;
  actions.setWebpackConfig({
    plugins: [guessPlugin]
  });
};