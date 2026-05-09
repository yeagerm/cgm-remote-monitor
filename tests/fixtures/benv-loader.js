'use strict';

/*
 * benv-loader.js
 *
 * Single chokepoint that selects between the real `benv` package and
 * our modern shim (`./benv-shim`) based on the USE_BENV_SHIM env var.
 *
 * Usage in test files (Phase 1c+):
 *   var benv = require('./fixtures/benv-loader');
 *
 * Phase 2 will flip the default to the shim. Phase 4 will delete this
 * loader and direct callers to the shim (or refactored modern fixture)
 * directly.
 */

if (process.env.USE_BENV_SHIM === '1') {
  module.exports = require('./benv-shim');
} else {
  module.exports = require('benv');
}
