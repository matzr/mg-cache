var q = require('q');
var _ = require('lodash');
var cache = {};

var NEVER_EXPIRES = -1;
module.exports.NEVER_EXPIRES = NEVER_EXPIRES;

module.exports.get = function(cacheKey) {
    return q.when((cache[cacheKey] || {}).value);
};

module.exports.put = function(cacheKey, value, ttl) {
    cache[cacheKey] =  {
    	value: value,
    	expiryDate: (ttl !== NEVER_EXPIRES) ? _.now() + ttl : NEVER_EXPIRES;
    };
    return q.when();
};

module.exports.configure = function() {
    return q.when(true);
};

module.exports.expiresAt = function(cacheKey) {
	return q.when((cache[cacheKey] || {}).expiryDate);
};
