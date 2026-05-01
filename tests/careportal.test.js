'use strict';

require('should');
var benv = require('benv');
var moment = require('moment');

var nowData = {
  sgvs: [
    { mgdl: 100, mills: Date.now(), direction: 'Flat', type: 'sgv' }
  ]
  , treatments: []
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('careportal', function ( ) {
  this.timeout(60000); // TODO: see why this test takes longer on Travis to complete

  var headless = require('./fixtures/headless')(benv, this);

  before(function (done) {

    const t = Date.now();
    console.log('Starting headless setup for Careportal test');
    
    function d () {
      console.log('Done called by headless', Date.now() - t );
      done();
    }

    headless.setup({mockAjax: true}, d);
    console.log('Headless setup for Careportal test done');
  });

  after(function (done) {
    headless.teardown( );
    done( );
  });

  it ('open careportal, and enter a treatment', async () =>{

    console.log('Careportal test client start');

	  var client = window.Nightscout.client;
	
    var hashauth = require('../lib/client/hashauth');
    hashauth.init(client,$);
    hashauth.verifyAuthentication = function mockVerifyAuthentication(next) { 
      hashauth.authenticated = true;
      next(true); 
    };

    console.log('Careportal test client init');
    client.init();
    sleep(50);

    console.log('Careportal test client data update');
    client.dataUpdate(nowData, true);
    sleep(50);

    client.careportal.prepareEvents();

    $('#eventType').val('Snack Bolus');
    $('#glucoseValue').val('100');
    $('#carbsGiven').val('10');
    $('#insulinGiven').val('0.60');
    $('#preBolus').val(15);
    $('#notes').val('Testing');
    $('#enteredBy').val('Dad');

    //simulate some events
    client.careportal.eventTimeTypeChange();
    client.careportal.dateTimeFocus();
    client.careportal.dateTimeChange();

    window.confirm = function mockConfirm (message) {
      function containsLine (line) {
        message.indexOf(line + '\n').should.be.greaterThan(0);
      }

      containsLine('Event Type: Snack Bolus');
      containsLine('Blood Glucose: 100');
      containsLine('Carbs Given: 10');
      containsLine('Insulin Given: 0.60');
      containsLine('Carb Time: 15 mins');
      containsLine('Notes: Testing');
      containsLine('Entered By: Dad');

      return true;
    };

    window.alert = function mockAlert(messages) { messages.should.equal(''); };
    
    console.log('Careportal test saving');

    client.careportal.save();

  });

  it('uses local timezone date, not UTC, when saving an other-time treatment (8304)', function () {
    var client = window.Nightscout.client;
    client.init();

    var fakeNow = moment.parseZone('2024-10-25T23:00:00-05:00');
    client.ctx.moment = function mockMoment () {
      return fakeNow.clone();
    };

    client.careportal.prepare();

    $('#eventDateValue').val().should.equal('2024-10-25');
    $('#eventTimeValue').val().should.equal('23:00');

    $('#eventType').val('BG Check');
    $('#glucoseValue').val('100');
    $('#nowtime').removeAttr('checked').prop('checked', false);
    $('#othertime').attr('checked', 'checked').prop('checked', true);
    client.careportal.eventTimeTypeChange();

    var originalAjax = $.ajax;
    var originalConfirm = window.confirm;
    var originalAlert = window.alert;
    var postedTreatment;

    $.ajax = function mockAjax (request) {
      postedTreatment = request.data;

      return {
        done: function mockDone (fn) {
          fn({message: 'OK'});
          return this;
        }
        , fail: function mockFail () {
          return this;
        }
      };
    };

    window.confirm = function mockConfirm () {
      return true;
    };
    window.alert = function mockAlert (messages) {
      messages.should.equal('');
    };

    try {
      client.careportal.save();
    } finally {
      $.ajax = originalAjax;
      window.confirm = originalConfirm;
      window.alert = originalAlert;
    }

    var expectedCreatedAt = client.utils.mergeInputTime('23:00', '2024-10-25').toDate().toISOString();

    postedTreatment.eventType.should.equal('BG Check');
    postedTreatment.created_at.should.equal(expectedCreatedAt);
    postedTreatment.created_at.should.not.equal(client.utils.mergeInputTime('23:00', '2024-10-26').toDate().toISOString());
  });

});
