var mongoClient = require('mongodb').MongoClient;
var _ = require('lodash');
var q = require('q');

var NEVER_EXPIRES = -1;

var db;
var MONGODB_COLLECTION_NAME = 'cache';
// var log = console.log;
var log = function () {};

function get(cacheKey) {
	return retrieveMongoDbDocument(cacheKey, 'value');
}

function put(cacheKey, value, ttl_ms) {
    if (ttl_ms && (ttl_ms === NEVER_EXPIRES)) {
        ttl_ms = null;
    }
	return removeMongoDbDocument(cacheKey).
	then(_.bind(insertMongoDbDocument, this, cacheKey, value, ttl_ms));
}

function configure(configuration) {
    var deferred = q.defer();

    mongoClient.connect(configuration.mongoDbUrl, function(err, _db) {
        if (err) {
        	console.log('configuration - ,mongodb - unable to connect - ' + JSON.stringify(err), 'MONGODB CACHE', 'error');
        	deferred.reject(err);
        } else {
            log('configuration successful', 'MONGODB CACHE', 'info');
            db = _db;
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function retrieveMongoDbDocument(cacheKey, field) {
    var deferred = q.defer();

    var collection = db.collection(MONGODB_COLLECTION_NAME);

    collection.find({
        "cache_key": cacheKey
    }).toArray(function(err, docs) {
    	if (err) {
    		deferred.reject(err);
    	} else {
    		deferred.resolve(docs.length === 1 ? docs[0][field] : void 0);
    	}
    });

    return deferred.promise;
}

function insertMongoDbDocument(cacheKey, value, ttl) {
    var deferred = q.defer();

    log('inserting document for key:' + cacheKey);
    var collection = db.collection(MONGODB_COLLECTION_NAME);
    collection.insert({
        "cache_key": cacheKey,
        "value": value,
        "expiryDate": (ttl !== NEVER_EXPIRES) ? _.now() + ttl : NEVER_EXPIRES
    }, function(err, result) {
        deferred[(err === null) ? 'resolve' : 'reject'](err || result);
    });

    return deferred.promise;
}

function removeMongoDbDocument(cacheKey) {
    var deferred = q.defer();

    log('removing document for key:' + cacheKey);
    var collection = db.collection(MONGODB_COLLECTION_NAME);
    collection.remove({
        "cache_key": cacheKey
    }, function(err, result) {
        deferred[(err === null) ? 'resolve' : 'reject'](err || result);
    });

    return deferred.promise;
}

module.exports.get = get;
module.exports.put = put;
module.exports.configure = configure;
module.exports.NEVER_EXPIRES = NEVER_EXPIRES;

module.exports.expiresAt = function(cacheKey) {
    return retrieveMongoDbDocument(cacheKey, 'expiryDate');
};

