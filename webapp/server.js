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

// create dbConnection on visit
app.use(createConnection);

// enable body parser to read the forms correctly
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
 
  extended: true

})); 

//add monster on post
app.post('/test', addMonsters);


// ------------------ * render pages * ------------------

// index page
app.get('/', function(req, res) {

    res.render('pages/index');

});

// -----------------------------------------

// about page 
app.get('/about', function(req, res) {

	res.render('pages/about');

});


// ------------------ * functions section * ------------------

// create connection with db and store it in req.redbConn

function createConnection(req, res, next) {
	r.connect( 
	{ 
		host: 'localhost', 
		port: 28015 

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

	var monster = req.body;
	
	r.table('monsters').insert(monster).run(req._rdbConn, function(error, result) {

		if(error) {

			handleError(res, error);

		} else if(result.inserted !== 1) {

			handleError(res, new Error("Document was not inserted."));

		} else {

			res.redirect('/');

		}

		next();

	});
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