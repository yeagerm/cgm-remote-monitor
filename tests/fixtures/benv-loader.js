'use strict';

/*
 * benv-loader.js
 *
 * Single chokepoint that selects between the modern jsdom shim and
 * the legacy `benv` package.
 *
 * As of Phase 2 the DEFAULT is the shim (`./benv-shim`). Set
 * USE_BENV_SHIM=0 to fall back to the real benv package — this
 * remains supported until Phase 3.6 modernizes the last test that
 * still depends on legacy bundle behavior (profileeditor).
 *
 * Phase 4 will delete this loader, drop the benv package, and direct
 * callers at the shim (or refactored modern fixture) directly.
 */

if (process.env.USE_BENV_SHIM === '0') {
  module.exports = require('benv');
} else {
  module.exports = require('./benv-shim');
}
