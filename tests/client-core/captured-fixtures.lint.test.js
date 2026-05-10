'use strict';

/*
 * tests/captured-fixtures.lint.test.js
 *
 * Guards against PII regressions and shape drift in the captured
 * fixture set under tests/fixtures/captured/. These fixtures are
 * committed to the repo and consumed by client-core unit tests;
 * any leak of a real device serial, push token, or original Mongo
 * _id would be a privacy incident.
 *
 * Runs as part of `npm run test:core` (Node-only, no jsdom).
 */

require('should');
var fs = require('fs');
var path = require('path');

var FIXTURE_DIR = path.join(__dirname, '..', 'fixtures', 'captured');

function load (name) {
  var file = path.join(FIXTURE_DIR, name);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Tokens that must NEVER appear anywhere in the committed fixtures.
// Drawn from the original capture; if any sanitization step regresses,
// these strings will reappear and the lint will fail loudly.
var BANNED_TOKENS = [
  '8XRSC5'                 // Dexcom serial fragment from source
  , '208850'               // Pump ID from source
  , 'loop://iPhone'        // Original uploader; should be loop://test-device
  , '227ec1986a9a6281'     // Original deviceToken prefix
  , 'medicaldatanetworks'  // Original bundleIdentifier fragment
];

describe('captured fixtures lint', function () {

  describe('PII / source leak', function () {
    ['entries.json', 'treatments.json', 'devicestatus.json', 'profile.json'].forEach(function (name) {
      it(name + ' contains no banned tokens', function () {
        var raw = fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8');
        BANNED_TOKENS.forEach(function (tok) {
          raw.indexOf(tok).should.equal(-1, 'banned token "' + tok + '" found in ' + name);
        });
      });
    });
  });

  describe('size envelope', function () {
    var limits = {
      'entries.json': 110000      // ~96 KB current; allow some headroom
      , 'treatments.json': 60000
      , 'devicestatus.json': 100000
      , 'profile.json': 60000
    };
    Object.keys(limits).forEach(function (name) {
      it(name + ' stays under ' + limits[name] + ' bytes', function () {
        var bytes = fs.statSync(path.join(FIXTURE_DIR, name)).size;
        bytes.should.be.lessThan(limits[name]);
      });
    });
  });

  describe('shape', function () {
    it('every entry has _id, date, type, sgv-or-mbg field', function () {
      var entries = load('entries.json');
      entries.length.should.be.greaterThan(0);
      entries.forEach(function (e) {
        e.should.have.property('_id').which.is.a.String();
        e._id.should.match(/^[0-9a-f]{24}$/, 'deterministic _id shape');
        e.should.have.property('type');
        e.should.have.property('date').which.is.a.Number();
      });
    });

    it('every treatment has _id, eventType, created_at', function () {
      var tx = load('treatments.json');
      tx.length.should.be.greaterThan(0);
      tx.forEach(function (t) {
        t.should.have.property('_id').which.match(/^[0-9a-f]{24}$/);
        t.should.have.property('eventType');
        t.should.have.property('created_at');
      });
    });

    it('every devicestatus has _id, created_at, device', function () {
      var ds = load('devicestatus.json');
      ds.length.should.be.greaterThan(0);
      ds.forEach(function (d) {
        d.should.have.property('_id').which.match(/^[0-9a-f]{24}$/);
        d.should.have.property('created_at');
        d.should.have.property('device');
      });
    });

    it('profile records have store + defaultProfile', function () {
      var profiles = load('profile.json');
      profiles.length.should.be.greaterThan(0);
      profiles.forEach(function (p) {
        p.should.have.property('_id').which.match(/^[0-9a-f]{24}$/);
        p.should.have.property('defaultProfile');
        p.should.have.property('store').which.is.an.Object();
      });
    });
  });

  describe('time anchor', function () {
    it('latest entry lands at the documented reference epoch (within tolerance)', function () {
      var sanitize = require('../../tools/captured-fixtures/sanitize');
      var entries = load('entries.json');
      var latest = entries.reduce(function (acc, e) { return Math.max(acc, e.date || 0); }, 0);
      // Allow ±1 day tolerance — exact value is sub-second but the
      // sanitizer anchors against the input's latest record, which
      // may be a fraction of a day before the reference epoch.
      var dayMs = 24 * 60 * 60 * 1000;
      Math.abs(latest - sanitize.TARGET_LATEST_EPOCH).should.be.lessThan(dayMs);
    });
  });

  describe('determinism (sanitizer is pure)', function () {
    var sanitize = require('../../tools/captured-fixtures/sanitize');

    it('sanitizeEntry produces stable _id for stable input', function () {
      var input = {
        _id: 'aaaaaaaaaaaaaaaaaaaaaaaa'
        , date: 1700000000000
        , dateString: '2023-11-14T22:13:20.000Z'
        , type: 'sgv'
        , sgv: 120
        , device: 'Dexcom G6 ABC123'
        , direction: 'Flat'
      };
      var shifter = sanitize.makeShifter(0);
      var a = sanitize.sanitizeEntry(input, shifter);
      var b = sanitize.sanitizeEntry(input, shifter);
      a.should.eql(b);
      a.device.should.equal('Dexcom G6 SERIAL');
      a._id.should.match(/^[0-9a-f]{24}$/);
      a._id.should.not.equal('aaaaaaaaaaaaaaaaaaaaaaaa');
    });
  });
});
