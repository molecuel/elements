/**
 * Created by Dominic Böttger on 11.05.2014
 * INSPIRATIONlabs GmbH
 * http://www.inspirationlabs.com
 */
var elements;

var definition = function() {
  this.schemaName = 'page';
  this.options = {
    indexable: true
  };
  this.search = {
    mapping: {
      'location.geo': { type: 'geo_point' },
      url: {type: 'keyword'}
    }
  };
  this.schema = {
    title: {type: String, required: true},
    body: {type: String},
    url: {type: String},
    lang: {type: String},
    file: {type: elements.coreSchema.Types.Mixed, form: {type: 'fileuploader'}},
    'location': {
      'geo': {
        'lat': {type: Number},
        'lon': {type: Number}
      }
    }
  };
  return this;
};

var init = function(el) {
  elements = el;
  return new definition();
};

module.exports = init;