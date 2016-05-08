var express = require('express');
var Search = require('bing.search');
var mongo = require('mongodb').MongoClient;
var dbUrl = process.env.MONGODB_URI;
var path = require('path');
var DateTime = require('date-time-string');

app = express();
search = new Search(process.env.BING_KEY);
var port = process.env.PORT;

mongo.connect(dbUrl, function(err, db) {
  console.log("Connected to database");

  app.use(express.static(path.join(__dirname, 'public')))

  app.get('/search/:search*', function(req, res) {
    var searchQuery = req.params.search;
    var offset = req.query.offset||0;
    console.log("Hitting bing for: " + searchQuery + ", with an offset of: " + offset );
    var history = db.collection("history");
    var d = new Date;
    history.insert({query: process.env.HOST_NAME + req.originalUrl, time: DateTime.toHttpDate(d)}, function(err, result){
      if (err) throw err;
      console.log("Saved search to history: " + req.originalUrl);
    });

    search.images(searchQuery, {top: 10, skip: offset}, function(err, result) {
      if(err) throw err
      res.json(result.map(shortenRaw));
    });
  });

  app.get('/latest', function(req, res) {
    console.log("sending last queries from db.history");
    var history = db.collection("history");
    history.find({'time': {$exists: true}}).sort({_id: -1}).limit(10).toArray(function(err, docs) {
      if (err) throw err;
      res.json(docs.map(cleanHistory));
    });
  });

  var server = app.listen(port, function() {
    console.log('Server listening on port ' + port)
  });
});

//Helper methods
function shortenRaw(hit) {
  return {
    "url": hit.url,
    "snippet": hit.title,
    "thumbnail": hit.thumbnail.url,
    "context": hit  .sourceUrl
  };
}

function cleanHistory(hit) {
  return {
    "term": hit.query,
    "when": hit.time
  };
}
