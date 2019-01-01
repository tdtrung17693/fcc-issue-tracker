/*
 *
 *
 *       Complete the API routing below
 *
 *
 */

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb');
var ObjectId = require('mongodb').ObjectID;
var { required } = require('../validator');
var xss = require('xss');

const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});

module.exports = function(app) {
  const fieldGuard = [
    '_id',
    'issue_title',
    'issue_text',
    'created_by',
    'assigned_to',
    'status_text',
    'open',
  ];
  
  var xssOptions = {
    whiteList: {
      a: ["href", "title", "target"]
    }
  };
  
  var xssFilter = new xss.FilterXSS(xssOptions)

  app
    .route('/api/issues/:project')

    .get(function(req, res, next) {
      var project = req.params.project;
      var fields = Object.keys(req.query)
      
      fields = fields.filter(field => fieldGuard.indexOf(field) > -1)
      
      var filterValue = {}
      
      fields.forEach(field => {
        if (field === '_id') return;
        
        if (field === 'open') {
          filterValue[field] = (req.query[field] === 'false' || req.query[field] === '0' || !req.query[field]) ? false : true
        } else {
          filterValue[field] = req.query[field]
        }
      })
    
      app.get('db').collection(project)
         .find(filterValue)
         .toArray((err, issues) => {
            if (err) return next(err)
            
            return res.json(issues)
      })
    })

    .post(required(['issue_title', 'issue_text', 'created_by']), function(
      req,
      res,
      next
    ) {
      var project = req.params.project;
      var newIssue = {}
    
      Object.keys(req.body).forEach(field => {
        if (fieldGuard.indexOf(field) > -1)
          newIssue[field] = xssFilter.process(req.body[field])
      })

      var {
        issue_title,
        issue_text,
        created_by,
        assigned_to = '',
        status_text = '',
      } = newIssue;
        
      const db = app.get('db');

      db.collection(project)
        .insertOne({
          issue_title,
          issue_text,
          created_by,
          assigned_to,
          status_text,
          created_on: new Date(),
          updated_on: new Date(),
          open: true,
        })
        .then((issue) => {
          res.status(200).json(issue.ops[0]);
        })
        .catch(next);
    })
    // I can PUT /api/issues/{projectname} with a _id and any fields in the object with a value to object said object. Returned will be 'successfully updated' or 'could not update '+_id. This should always update updated_on. If no fields are sent return 'no updated field sent'.
    .put(function(req, res, next) {
      var project = req.params.project;
      var fields = Object.keys(req.body).filter(
        (field) => fieldGuard.indexOf(field) > -1
      );

      if (
        fields.length === 0 ||
        (fields.length === 1 && fields.indexOf('_id') > -1)
      ) {
        return next({ error: 'No updated fields', message: `no updated field sent` });
      }

      if (fields.indexOf('_id') === -1)
        return next({ error: 'Missing _id', message: `_id error` });

      const { _id } = req.body;
      const updateValue = {};

      fields.forEach((field) => {
        if (field === '_id') return;

        updateValue[field] = xssFilter.process(req.body[field]);
      });

      app
        .get('db')
        .collection(project)
        .updateOne(
          { _id: ObjectId(_id) },
          { $set: { ...updateValue, updated_on: new Date() } }
        )
        .then(() => res.json({ success: true, message: `Successfully updated ${_id}` }))
        .catch(err =>
          next({ error: err, message:`Could not update ${_id} }` })
        );
    })
    // If no _id is sent return '_id error', success: 'deleted '+_id, failed: 'could not delete '+_id.
    .delete(function(req, res, next) {
      var project = req.params.project;

      if (!('_id' in req.body) && !('_id' in req.query)) {
        return next({ error: 'Missing _id', message: `_id error` });
      }

      const _id = req.body._id || req.query._id;
      app
        .get('db')
        .collection(project)
        .deleteOne({ _id: ObjectId(_id) })
        .then((e) => res.json({ success: true, message: `deleted ${_id}` }))
        .catch((err) => next({ error: err, message: `could not delete ${_id}. More info: ${err}` }));
    });

  app.use('/api', function(err, req, res, next) {
    if (err.error) {
      res.status(400);
    } else {
      res.status(err.status || 500);
      console.log(err);
    }

    res.json({ message: err.message || 'Internal Server Error', error: err });
  });
};
