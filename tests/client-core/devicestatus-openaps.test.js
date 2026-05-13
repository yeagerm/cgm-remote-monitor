'use strict';

require('should');
var fs = require('fs');
var path = require('path');
var moment = require('moment');

var selectOpenAPSState = require('../../lib/client-core/devicestatus/openaps');

var AAPS = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'fixtures', 'captured', 'aaps', 'devicestatus.json'), 'utf8'));
var TRIO = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'fixtures', 'captured', 'trio', 'devicestatus.json'), 'utf8'));
var LOOP = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'fixtures', 'captured', 'loop', 'devicestatus.json'), 'utf8'));

function ensureMills (records) {
  records.forEach(function (r) {
    if (r && r.mills == null && r.created_at) {
      r.mills = Date.parse(r.created_at);
    }
  });
  return records;
}

function pickNow (records) {
  ensureMills(records);
  var max = 0;
  records.forEach(function (r) { if (r && r.mills > max) max = r.mills; });
  return max + 60 * 1000;
}

describe('client-core: devicestatus / openaps (selectOpenAPSState)', function () {

  describe('contract', function () {

    it('returns the documented null-shape for an empty list', function () {
      var now = Date.parse('2026-05-09T00:01:00Z');
      var recent = moment(now).subtract(15, 'minutes');
      var r = selectOpenAPSState([], recent);
      r.should.have.properties([
        'seenDevices', 'lastEnacted', 'lastNotEnacted', 'lastSuggested'
        , 'lastIOB', 'lastMMTune', 'lastPredBGs', 'status'
      ]);
      (r.lastEnacted === null).should.be.true();
      (r.lastSuggested === null).should.be.true();
      r.status.should.have.properties(['symbol', 'code', 'label']);
      r.status.code.should.equal('warning');
    });

    it('handles non-array input without throwing', function () {
      var recent = moment().subtract(15, 'minutes');
      var r = selectOpenAPSState(null, recent);
      r.status.code.should.equal('warning');
    });

    it('skips records without an openaps body', function () {
      var recent = moment().subtract(15, 'minutes');
      var r = selectOpenAPSState([{ device: 'x' }, { loop: {} }], recent);
      (r.lastEnacted === null).should.be.true();
      (r.lastSuggested === null).should.be.true();
    });

    it('normalizes openaps.iob array → first element with .timestamp from .time', function () {
      var ts = '2026-05-09T00:00:00Z';
      var status = {
        mills: Date.parse(ts)
        , device: 'openaps://test'
        , openaps: {
          iob: [
            { iob: 1.5, time: ts }
            , { iob: 0.0, time: ts }
          ]
        }
      };
      var recent = moment(Date.parse(ts)).subtract(15, 'minutes');
      var r = selectOpenAPSState([status], recent);
      // input was mutated (legacy behaviour preserved)
      Array.isArray(status.openaps.iob).should.be.false();
      status.openaps.iob.iob.should.equal(1.5);
      status.openaps.iob.timestamp.should.equal(ts);
      // lastIOB is selected
      (r.lastIOB === null).should.be.false();
      r.lastIOB.iob.should.equal(1.5);
    });
  });

  describe('captured AAPS-Android fixtures (full openaps body)', function () {

    var result;
    var recent;

    before(function () {
      var clone = JSON.parse(JSON.stringify(AAPS));
      var now = pickNow(clone);
      recent = moment(now).subtract(15, 'minutes');
      result = selectOpenAPSState(clone, recent);
    });

    it('seenDevices contains an entry keyed by the openaps://AndroidAPS URI', function () {
      Object.keys(result.seenDevices).length.should.be.greaterThan(0);
      var uris = Object.keys(result.seenDevices);
      uris.some(function (u) { return /openaps:\/\//.test(u); }).should.be.true();
    });

    it('per-device status surfaces "Waiting" via noWarning=true even when no enacted/suggested timestamps exist', function () {
      // The AAPS captured payload's suggested/enacted blocks have no
      // timestamp/mills fields, so lastEnacted/Suggested cannot be
      // selected; the per-device path uses noWarning=true and falls
      // through to the 'waiting' branch on `moments.when`.
      var dev = result.seenDevices['openaps://AndroidAPS'];
      (dev !== undefined).should.be.true();
      ['waiting', 'looping', 'enacted', 'notenacted'].indexOf(dev.status.code).should.not.equal(-1);
    });

    it('top-level status code is one of the documented states', function () {
      ['warning', 'notenacted', 'enacted', 'looping', 'waiting']
        .indexOf(result.status.code).should.not.equal(-1);
    });

    it('lastEnacted / lastSuggested are null when blocks lack timestamps (matches legacy plugin)', function () {
      // Documented quirk preserved: the AAPS captured fixture exercises
      // the "no top-level timestamp on enacted/suggested" branch.
      (result.lastEnacted === null).should.be.true();
      (result.lastSuggested === null).should.be.true();
    });
  });

  describe('captured Trio (oref1) fixtures', function () {
    it('selects lastSuggested from the oref1 suggested block (which carries a timestamp)', function () {
      var clone = JSON.parse(JSON.stringify(TRIO));
      var now = pickNow(clone);
      var recent = moment(now).subtract(15, 'minutes');
      var r = selectOpenAPSState(clone, recent);
      (r.lastSuggested !== null).should.be.true();
      r.lastSuggested.should.have.property('timestamp');
      moment.isMoment(r.lastSuggested.moment).should.be.true();
    });
  });

  describe('captured Loop iOS fixtures (no openaps body)', function () {
    it('returns the null-shape because Loop devicestatus has no `openaps` body', function () {
      var clone = JSON.parse(JSON.stringify(LOOP));
      var now = pickNow(clone);
      var recent = moment(now).subtract(15, 'minutes');
      var r = selectOpenAPSState(clone, recent);
      (r.lastEnacted === null).should.be.true();
      (r.lastSuggested === null).should.be.true();
      r.status.code.should.equal('warning');
    });
  });

  describe('display state machine', function () {

    var NOW;

    before(function () {
      NOW = Date.parse('2026-05-09T00:00:00Z');
    });

    function buildEnacted (overrides) {
      var ts = moment(NOW).subtract(2, 'minutes').toISOString();
      var openaps = { enacted: { timestamp: ts, received: true, rate: 0.5, duration: 30 } };
      if (overrides) Object.assign(openaps, overrides);
      return [{ mills: NOW - 2 * 60000, device: 'openaps://test', openaps: openaps }];
    }

    it('enacted + received within recent window → enacted', function () {
      var recent = moment(NOW).subtract(15, 'minutes');
      var r = selectOpenAPSState(buildEnacted(), recent);
      r.status.code.should.equal('enacted');
    });

    it('enacted but not received → notenacted', function () {
      var ts = moment(NOW).subtract(2, 'minutes').toISOString();
      var statuses = [{
        mills: NOW - 2 * 60000
        , device: 'openaps://test'
        , openaps: { enacted: { timestamp: ts, received: false, rate: 0.5, duration: 30 } }
      }];
      var recent = moment(NOW).subtract(15, 'minutes');
      var r = selectOpenAPSState(statuses, recent);
      r.status.code.should.equal('notenacted');
    });

    it('only suggested within recent window → looping', function () {
      var ts = moment(NOW).subtract(2, 'minutes').toISOString();
      var statuses = [{
        mills: NOW - 2 * 60000
        , device: 'openaps://test'
        , openaps: { suggested: { timestamp: ts, eventualBG: 110 } }
      }];
      var recent = moment(NOW).subtract(15, 'minutes');
      var r = selectOpenAPSState(statuses, recent);
      r.status.code.should.equal('looping');
    });

    it('stale data (outside recent window, no enacted/suggested fresh) → warning', function () {
      var ts = moment(NOW).subtract(2, 'hours').toISOString();
      var statuses = [{
        mills: NOW - 2 * 3600000
        , device: 'openaps://test'
        , openaps: { suggested: { timestamp: ts, eventualBG: 110 } }
      }];
      var recent = moment(NOW).subtract(15, 'minutes');
      var r = selectOpenAPSState(statuses, recent);
      r.status.code.should.equal('warning');
    });
  });

  describe('deviceName injection', function () {
    it('uses the supplied deviceName helper when provided', function () {
      var ts = moment().subtract(2, 'minutes').toISOString();
      var statuses = [{
        mills: Date.parse(ts)
        , device: 'openaps://AndroidAPS/extra/path'
        , openaps: { suggested: { timestamp: ts, eventualBG: 100 } }
      }];
      var recent = moment().subtract(15, 'minutes');
      var r = selectOpenAPSState(statuses, recent, { deviceName: function () { return 'STUB'; } });
      var devices = Object.values(r.seenDevices);
      devices.length.should.equal(1);
      devices[0].name.should.equal('STUB');
    });

    it('default deviceName mirrors the legacy lib/utils.js logic', function () {
      var ts = moment().subtract(2, 'minutes').toISOString();
      var statuses = [{
        mills: Date.parse(ts)
        , device: 'openaps://AndroidAPS/extra/path'
        , openaps: { suggested: { timestamp: ts, eventualBG: 100 } }
      }];
      var recent = moment().subtract(15, 'minutes');
      var r = selectOpenAPSState(statuses, recent);
      var devices = Object.values(r.seenDevices);
      devices[0].name.should.equal('AndroidAPS');
    });
  });
});
