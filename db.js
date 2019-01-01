const mongo = require('mongodb').MongoClient

module.exports = function initDb({dbName, user, password, url}, cb) {
 mongo.connect(url, {
   useNewUrlParser: true,
   authSource: dbName,
   auth: {
     user,
     password
   }},
   (err, client) => {
     if (err) return cb(err)
      
     const db = client.db(dbName)
     cb(null, db)
   }
 )
}