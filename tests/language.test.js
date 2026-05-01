'use strict';

const fs = require('fs');

require('should');

describe('language', function ( ) {

  it('use English by default', function () {
    var language = require('../lib/language')();
    language.translate('Carbs').should.equal('Carbs');
  });

  it('replace strings in translations', function () {
    var language = require('../lib/language')();
    language.translate('%1 records deleted', '1').should.equal('1 records deleted');
    language.translate('%1 records deleted', 1).should.equal('1 records deleted');
    language.translate('%1 records deleted', {params: ['1']}).should.equal('1 records deleted');
    language.translate('Sensor age %1 days %2 hours', '1', '2').should.equal('Sensor age 1 days 2 hours');
  });

  it('translate to French', function () {
    var language = require('../lib/language')();
    language.set('fr');
    language.loadLocalization(fs);
    language.translate('Carbs').should.equal('Glucides');
  });

  it('translate to Czech', function () {
    var language = require('../lib/language')();
    language.set('cs');
    language.loadLocalization(fs);
    language.translate('Carbs').should.equal('Sacharidy');
  });

  it('translate to Czech uppercase', function () {
    var language = require('../lib/language')();
    language.set('cs');
    language.loadLocalization(fs);
    language.translate('carbs', { ci: true }).should.equal('Sacharidy');
  });

  it('translate to Taiwan Traditional Chinese', function () {
    var language = require('../lib/language')();
    language.set('zh_tw');
    language.loadLocalization(fs);
    language.translate('Carbs').should.equal('碳水化合物');
  });

  it('labels zh_tw as Taiwan Traditional Chinese', function () {
    var language = require('../lib/language')();
    language.get('zh_tw').language.should.equal('繁體中文（台灣）');
  });

});
