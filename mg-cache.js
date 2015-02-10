var _ = require('lodash');
var q = require('q');
var run1ceResolveAll = require('run-once-resolve-all');

var log = console.log;
// var log = function() {};

var DEFAULT_CACHE_VALUE_TTL = 300000;

var ONE_MINUTE = 60 * 1000;

var NEVER_EXPIRES = -1;

var cacheDurations = {
    ONE_SECOND: ONE_MINUTE / 60,
    ONE_MINUTE: ONE_MINUTE,
    FIFTEEN_MINUTES: 15 * ONE_MINUTE,
    ONE_HOUR: 60 * ONE_MINUTE,
    ONE_DAY: 1440 * ONE_MINUTE
};

function tryToJSONize(str) {
    try {
        return JSON.parse(str);
    } catch (err) {
        return str;
    }
}

function getStoreableValue(obj) {
    try {
        return JSON.stringify(obj);
    } catch (err) {
        return obj;
    }
}

function getFromCacheOrFetch(cacheKey, retrMethod, ttl) {
    return run1ceResolveAll.runOnceResolveAll(function() {
        return q.all([cache.get(cacheKey), expiresAt(cacheKey)]).
        then(function(results) {
            var cacheResult = results[0];
            var expiryDate = results[1];
            if (!(cacheResult && expiryDate)) {
                log(cacheKey + ' NOT found in cache');
                return retrMethod().
                then(function(result) {
                    ttl = ttl || DEFAULT_CACHE_VALUE_TTL;
                    return cache.put(cacheKey, getStoreableValue(result), ttl).
                    then(function () {
                        return result;
                    });
                });
            } else {
                log(cacheKey + ' was found in cache: ' + cacheResult.substring(0, 60), 'MY CACHE', 'info');
                return q.when(tryToJSONize(cacheResult));
            }
        }).
        fail(function(err) {
            log('error retrieving ' + cacheKey + ' from cache: ' + JSON.stringify(err) + '\n' + err.stack, 'MY CACHE', 'error');
        });
    }, cacheKey);
}

function expiresAt(cacheKey) {
    return cache.expiresAt(cacheKey).
    then(function(expiryDate) {
        if (expiryDate === NEVER_EXPIRES) {
            return NEVER_EXPIRES;
        } else if (expiryDate < _.now()) {
            return null;
        } else {
            return expiryDate;
        }
    });
}

function configure(configurationDetails) {
    switch (configurationDetails.cacheType) {
        case 'memory':
            cache = require('./memory-cache.js');
            break;
        case 'mongodb':
            cache = require('./mongo-cache.js');
            break;
        default:
            throw 'unknown cache type: ' + configurationDetails.cacheType;
    }
    return cache.configure(configurationDetails);
}

module.exports.getFromCacheOrFetch = getFromCacheOrFetch;
module.exports.expiresAt = expiresAt;
module.exports.cacheDurations = cacheDurations;
module.exports.configure = configure;
module.exports.NEVER_EXPIRES = NEVER_EXPIRES;

module.exports.put = function(cacheKey, value, ttl) {
    return cache.put(cacheKey, getStoreableValue(value), ttl || DEFAULT_CACHE_VALUE_TTL);
}
