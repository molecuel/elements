'use strict';
import should = require('should');
import assert = require('assert');
import elements = require('../dist')

describe('mlcl', function() {
  let el;

  describe('module', function() {
    it('should connect the databases', async function() {
      this.timeout(15000);
      el = new elements();
      try {
        await el.connect();
      } catch (e) {
        should.not.exist(e);
      }
    })
  })
});
