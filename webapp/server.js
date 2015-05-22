// server.js

// ------------------ * requires * ------------------

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var r = require('rethinkdb');


// ------------------ * express routes * ------------------

// set view engine
app.set('view engine', 'ejs');

// root (needed to beeing able to load js files etc. properly with script src)
app.use(express.static(__dirname + '/views'));

// create dbConnection
app.use(createConnection);

// enable body parser to read the forms
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
 
  extended: true

})); 

//add monster on post
app.post('/test', addMonsters);
app.post('/searchSimple', searchBar);


// ------------------ * render pages * ------------------

// index page
app.get('/', function(req, res) {
	
    res.render('pages/index', {

		simpleSearch: simpleSearch

    });
});


// -----------------------------------------

// about page 
app.get('/about', function(req, res) {

	res.render('pages/about');

});

// -----------------------------------------

/*app.get('/view', function(req, res) {

	res.render('pages/about');

});*/

// -----------------------------------------

// views page
app.get('/view/:name', function(req, res) {

	var nameReq = req.params.name;
		console.log(nameReq);
		r.table('monsters').filter(

			r.row('monsterName').match('(?i)^' + nameReq)

			).run(req._rdbConn, function(error, cursor) {

				if(error) throw(error);
				cursor.toArray(function(error, result) {

					if(error) throw(error);
					console.log(result);

				});

			});
});

// ------------------ * global variables * ------------------

var simpleSearch = [];


// ------------------ * functions section * ------------------

// create connection with db and store it in req.redbConn

function createConnection(req, res, next) {
	r.connect( 
	{ 
		host: 'localhost', 
		port: 28015,
		db: 'monsters' 

	}, function(error, conn) {

		if(error) {

			handleError(res, error);
		
		} else {

			req._rdbConn = conn;
			next();

		}

	});
}

// -----------------------------------------

// get form as json and add to db + redirect back
function addMonsters(req, res, next) {

	// stuff to insert
	var monster = req.body;
	monster.createdAt = r.now();
	monster.approved = 0;
	monster.rating = [];
	
	r.table('monsters').insert(monster).run(req._rdbConn, function(error, result) {

		if(error) {

			handleError(res, error);

		} else if(result.inserted !== 1) {

			handleError(res, new Error("Document was not inserted. If the problem purrsists, please go to contacts and report the problem."));

		} else {

			res.redirect('/');

		}

		next();

	});
}

// -----------------------------------------

function searchBar(req, res, next) {

	var query = req.body;

	r.table('monsters').filter(

		// make case insensitive search and see if monsterName or monsterdesc
		// contains matches to the query. Then make the returned cursor to an
		// array with objects (if there is any).
		r.row('monsterName').match('(?i)^' + query.searchQuery)
		.or(r.row('monsterDesc').match('(?i)^' + query.searchQuery))

		).run(req._rdbConn, function(error, cursor) {

			if(error) throw(error);
			cursor.toArray(function(error, result) {

				if(error) throw(error);
				res.redirect('/');
				return simpleSearch = result;

			});
		
		});

}


// -----------------------------------------

// just a simple search filtering by monsterName
function searchName(req, res) {



}

// -----------------------------------------

// get error message
function handleError(res, error) {

    return res.status(500).send({error: error.message});

}


// ------------------ * start the server * ------------------

// start listening
app.listen(7000);
console.log('listening to port 7000');