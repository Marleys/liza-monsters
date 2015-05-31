// server.js

// ------------------ * requires * ------------------

var express = require( 'express' ),
	app = express(),
	bodyParser = require( 'body-parser' ),
	r = require( 'rethinkdb' );


// ------------------ * on first usage * ------------------

// set view engine
app.set( 'view engine', 'ejs' );

// root (needed to beeing able to load js files etc. properly with script src)
app.use( express.static(__dirname + '/views') );

// create dbConnection
app.use( createConnection);

// enable body parser to read the forms
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
 
  extended: true

})); 


// ------------------ * param * ------------------

// get monsters from url
app.param('name', function(req, res, next, name) {

	r.table('monsters').filter(r.row('monsterName').match('(?i)^' + name))
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


// ------------------ * posts * ------------------

//add monster on post
app.post( '/test', addMonsters );
app.post( '/searchSimple', searchBar );
app.post( '/update', updateMonster );

// ------------------ * render pages * ------------------

// index page
app.get( '/', latest, numberOfMonsters, function( req, res, next ) {
	
	// functions defined below - simpleSearch is a global var.
	// total = total number of monsters in db
	// latest = 5 latest monsters added
    res.render( 'pages/index', {

    	latest: req.latest,
    	total: req.total,	
		simpleSearch: simpleSearch

    });
});


// -----------------------------------------

// not visible to the user, contains the add form. Need to rename this
app.get( '/about', function( req, res ) {

	res.render( 'pages/about' );

});


// -----------------------------------------

// views page for individual monster
app.get( '/view/:name', function( req, res ) {

	// uses the param above to get the individual monster
	res.render( 'pages/view', {

		monster: req.monster

	});


});

//------------------------

// gets all monsters in the db
app.get( '/all', function( req, res, next ) {


	r.table( 'monsters' ).run( req._rdbConn, function( error, allMonsters ) {
		
		if( error ) return next( error );

		req.allMonsters = allMonsters.toArray( function( error, result ) {

			if ( error ) return( error );

			return result;

		});

		res.render( 'pages/all', {

			allMonsters: req.allMonsters

		});
	}); 

});

//------------------------

app.get( '/edit/:name', function( req, res ) {

	// uses the param above to get separate monster to enable editing
	res.render( 'pages/edit', {

		monster: req.monster

	});

});

//------------------------

// when monster is updated user get transfered here and displays
// the monsters so they can watch the changes.
app.get( '/update/:id', function( req, res, next ) {

	var id = req.params.id;

	r.table( 'monsters' ).get( id )
	.run( req._rdbConn, function( error, monster ) {

		if (error) throw(error);

		res.render('pages/update', {

		monster: monster

		});

	});

});

//------------------------

// display all monsters to chose which one to edit
app.get( '/allEdit', function( req, res, next ) {

	r.table( 'monsters' ).run(req._rdbConn, function( error, allMonsters ) {

		if( error ) return next( error );
		req.allMonsters = allMonsters.toArray( function( error, result ) {

			if( error ) return( error );
			return result;

		});

		res.render('pages/allEdit', {

			allMonsters: req.allMonsters

		});
	}); 

});

// ------------------ * global variables * ------------------

var simpleSearch = [];

// ------------------ * functions section * ------------------

// create connection with db and store it in req._redbConn

function createConnection( req, res, next ) {
	r.connect( 
	{ 
		host: 'localhost', 
		port: 28015,
		db: 'monsters' 

	}, function( error, conn ) {

		if( error ) {

			handleError( res, error );
		
		} else {

			req._rdbConn = conn;
			next();

		}

	});
}

// -----------------------------------------

// get the 5 latest monsters and order them from most recently created
function latest( req, res, next ) {

	r.table( 'monsters' ).orderBy( r.desc( 'createdAt' )).limit( 5 )
	.run( req._rdbConn, function( error, latest ) {

		if(error) return next(error);
		
		req.latest = latest;
		next();

	});

}

// -----------------------------------------

// counts all monsters in the DB and returns a number
function numberOfMonsters( req, res, next ) {

	 r.table( 'monsters' ).count()
	.run( req._rdbConn, function( error, result ) {

		if(error) return next(error);
		
		req.total = result;
		next();

	});

}

// -----------------------------------------

// get form as json and add to db + redirect back to '/'
function addMonsters( req, res, next ) {

	// stuff to insert
	var monster = req.body;
	monster.createdAt = r.now();
	monster.approved = 0;
	monster.rating = [];
	
	r.table( 'monsters' ).insert( monster ).run( req._rdbConn, function( error, result ) {

		if( error ) {

			handleError( res, error );

		} else if( result.inserted !== 1 ) {

			handleError( res, new Error( "Document was not inserted. If the problem purrsists, please go to contacts and report the problem." ));

		} else {

			res.redirect('/');

		}

		next();

	});
}

// -----------------------------------------

// updates existig monsters in the db. Filters by monserId
function updateMonster( req, res, next ) {

	// get data from form
	var monster = req.body;

	r.table( 'monsters' ).filter( { id: req.body.id } ).update( monster ).run( req._rdbConn, function( error, result ) {

		if( error ) {
			return next( error );

		} 

		res.redirect( '/update/'+req.body.id );
		
	});
}

// -----------------------------------------

/* // for reference only. Should work but returns empty <--- check this out later
function searchBar(req, res, next) {

	var query = req.body.searchQuery;
	//query = query.split(' ');
	r.table('monsters').getAll(query, {index:"monstersAll"})
	.run(req._rdbConn, function(error, cursor) {

		if(error) throw(error);
		console.log(cursor.toArray());

	});
}
*/

// -----------------------------------------

// the search bar on the index page ('/')
function searchBar( req, res, next ) {

	var query = req.body.searchQuery;

	if( req.body.searchQuery !== '' ) {

	r.table('monsters').filter(

		// goes through all fields in the db until match founded
		// '(?i)^' = case insensitive search. Only seem to work on strings with
		// one word. Multi-word strings can only use "query"? Need to look further
		// into this.
		r.row( 'monsterName' ).match( '(?i)^' + query )
		.or( r.row( 'monsterCharacteristic' ).match( '(?i)^' + query ))
		.or( r.row( 'monsterKill' ).match( query ))
		.or( r.row( 'monsterFood' ).match( query ))
		.or (r.row( 'monsterLocation' ).match( '(?i)^' + query ))

		).run( req._rdbConn, function( error, cursor ) {

			if ( error ) throw( error );
			cursor.toArray( function( error, result ) {

				if( error ) throw( error );
				res.redirect('/');
				
				return simpleSearch = result;

			});
		
		});

	} else { res.redirect('/'); }
}

// -----------------------------------------

// handle error message
function handleError( res ) {
    return function( error ) {
        res.send( 500, { error: error.message } );
    }
}

// ------------------ * start the server * ------------------

// start listening
app.listen( 7000 );
console.log( 'listening to port 7000' );