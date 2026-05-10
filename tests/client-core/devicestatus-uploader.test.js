'use strict';

require('should');
var fs = require('fs');
var path = require('path');

var classify = require('../../lib/client-core/devicestatus/uploader');

var CAPTURED = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'fixtures', 'captured', 'devicestatus.json'), 'utf8'));

describe('client-core: devicestatus / uploader (classifyUploader)', function () {

  it('returns "unknown" for null / undefined / non-object', function () {
    classify(null).should.equal('unknown');
    classify(undefined).should.equal('unknown');
    classify('string').should.equal('unknown');
    classify(42).should.equal('unknown');
  });

  it('classifies presence of `loop` block as "loop"', function () {
    classify({ loop: { timestamp: 't' } }).should.equal('loop');
  });

  it('classifies presence of `openaps` block as "openaps"', function () {
    classify({ openaps: { suggested: {} } }).should.equal('openaps');
  });

  it('falls back to device-string prefix when no body block is present', function () {
    classify({ device: 'loop://test' }).should.equal('loop');
    classify({ device: 'openaps://rig' }).should.equal('openaps');
    classify({ device: 'aaps://Pixel' }).should.equal('openaps');
  });

  it('returns "pump" for pump-only records (no loop/openaps body)', function () {
    classify({ pump: { reservoir: 100 } }).should.equal('pump');
  });

  it('returns "unknown" for an empty record', function () {
    classify({}).should.equal('unknown');
  });

  it('every captured devicestatus classifies to "loop" (Loop iOS only capture)', function () {
    CAPTURED.length.should.be.greaterThan(0);
    CAPTURED.forEach(function (ds, i) {
      classify(ds).should.equal('loop', 'devicestatus[' + i + ']');
    });
  });
});
