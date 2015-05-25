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

// -----------------
app.param('id', function(req, res, next, id) {

	r.table('monsters').filter(r.row('monsterName').match('(?i)^' + id))
	.run(req._rdbConn, function(error, cursor) {
		if(error) return next(error);
		if(!cursor) return next(new Error('Nothing is found'));
		req.monster = cursor.toArray(function(error, result) {
			if (error) return(error);
			return result;
		});
		next();
	});
	
});


//add monster on post
app.post('/test', addMonsters);
app.post('/searchSimple', searchBar);
app.post('/update', updateMonster);


// ------------------ * render pages * ------------------

// index page
app.get('/', latest, numberOfMonsters, function(req, res, next) {
	
	
    res.render('pages/index', {

    	latest: req.latest,
    	total: req.total,	
		simpleSearch: simpleSearch

    });
});


// -----------------------------------------

// about page 
app.get('/about', function(req, res) {

	res.render('pages/about');

});


// -----------------------------------------

// views page
app.get('/view/:id', function(req, res) {

	console.log(req.monster);
	res.render('pages/view', {
		monster: req.monster
	});


});

//------------------------

app.get('/all', function(req, res, next) {


	r.table('monsters').run(req._rdbConn, function(error, allMonsters) {
		if(error) return next(error);
		req.allMonsters = allMonsters.toArray(function(error, result) {
			if (error) return(error);
			return result;
		});
		console.log(req.allMonsters);
		res.render('pages/all', {
			allMonsters: req.allMonsters
		});
	}); 

});


app.get('/edit/:id', function(req, res) {

	console.log(req.monster);
	res.render('pages/edit', {
		monster: req.monster
	});


});


app.get('/update', function(req, res) {

	
	res.render('pages/update');

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

function latest(req, res, next) {
	r.table('monsters').orderBy(r.desc('createdAt')).limit(5)
	.run(req._rdbConn, function(error, latest) {

		if(error) return next(error);
		
		req.latest = latest;
		next();
	});

}

// -----------------------------------------

function numberOfMonsters(req, res, next) {

	 r.table('monsters').count()
	.run(req._rdbConn, function(error, result) {
		if(error) return next(error);
		
		req.total = result;
		next();
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

function updateMonster(req, res, next) {
	console.log(req.body);
	var monster = req.body;

	r.table('monsters').filter({monsterName: req.body.monsterName}).update(monster).run(req._rdbConn, function(err, result) {
		if(err) {
			return next(err);

		} 
		res.redirect('/view/'+req.body.id);
		
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
				//req.simpleSearch = result;
				res.redirect('/');
				

				return simpleSearch = result;

			});
		
		});

}


// -----------------------------------------

// just a simple search filtering by monsterName
/*function searchName(req, res) {
		var nameReq = req.params.name;
		r.table('monsters').filter(

			r.row('monsterName').match('(?i)^' + nameReq)

			).run(req._rdbConn, function(error, cursor) {

				if(error) throw(error);
				 cursor.toArray(function(error, result) {

					if(error) throw(error);
					return result;
				

				});

			});  

}*/

/*function searchName(req, res, next) {
	//var nameReq = req.params.name;
	r.table('monsters').filter(r.row('monsterName').match('(?i)^' + req.params.name)).run(req._rdbConn, function(err, cursor) {
		if(err) {
			return next(err);
		} else {
			cursor.toArray(function(err, result) {
				if(err) {
					return next(err);
				} else {
					req.test = result;
				}
			});
		} next();
	}); 
}*/

/*function getMonster(req, res, next) {

	var test = req.params.monsterName;

	r.table('monsters').filter(r.row('monsterName').match('(?i)^' + test)).run(req._rdbConn).then(function(cursor) {
		return cursor.toArray();
	}).then(function(result) {
		res.send(JSON.stringify(result));
	}).error(handleError(res))
	.finally(next);
}*/




// -----------------------------------------

// get error message
function handleError(res) {
    return function(error) {
        res.send(500, {error: error.message});
    }
}



// ------------------ * start the server * ------------------

// start listening
app.listen(7000);
console.log('listening to port 7000');