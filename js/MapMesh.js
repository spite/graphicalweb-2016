function readSVG() {

	return new Promise( function( resolve, reject ) {
		var ajax = new XMLHttpRequest();
		ajax.open("GET", "assets/BlankMap-Equirectangular.svg", true);
		ajax.send();
		ajax.addEventListener( 'load', function(e) {
			resolve( ajax.responseText );
		} );
	});

}

function drawSVG( source ) {

	return new Promise( function( resolve, reject ) {

		var countries = new Map();

	    var parser = new DOMParser();
	    var doc = parser.parseFromString( source, "image/svg+xml");

	    var pathNodes = doc.querySelectorAll('path');
	    [].forEach.call( pathNodes, function( p ) {

	    	if( p instanceof SVGPathElement && p.pathSegList ) {

	    		var countryCode = p.parentNode.className.baseVal.replace( 'country ', '' );
	    		var countryId = p.parentNode.id;

	    		//console.log( countryId, countryCode );

				var territory = { id: p.id, lines: [] };
	    		var line = []
	    		var vertices = line.vertices;
	    		var x, y;
	    		var ox, oy;
	    		var px, py;

	            var segments = p.pathSegList;
	            for( var i = 0; i < segments.numberOfItems; i++ ) {

	                var segment = segments.getItem( i );

	                var types = [ SVGPathSegMovetoAbs, SVGPathSegLinetoRel, SVGPathSegLinetoVerticalRel, SVGPathSegLinetoHorizontalRel, SVGPathSegLinetoHorizontalAbs, SVGPathSegLinetoVerticalAbs, SVGPathSegClosePath, SVGPathSegLinetoAbs /*, SVGPathSegMovetoRel, SVGPathSegCurvetoCubicRel*/ ];
	                var found = false;
	                types.forEach( function( t ) {
	                    if( segment instanceof t ) {
	                        found = true;
	                    }
	                } );
	                if( !found ) {
	                    console.log( segment );
	                }

	                if( segment instanceof SVGPathSegMovetoAbs ) {
	                    x = segment.x;
	                    y = segment.y;
	                    ox = x;
	                    oy = y;
	                    // add line;
	    				territory.lines.push( line );
	    				line = []
	                    line.push( new THREE.Vector2( x, y ) );
	                }
	                if( segment instanceof SVGPathSegLinetoRel ) {
	                    x = px + segment.x;
	                    y = py + segment.y;
	                    line.push( new THREE.Vector2( x, y ) );
	                }
	                if( segment instanceof SVGPathSegLinetoAbs ) {
	                    x = segment.x;
	                    y = segment.y;
	                    line.push( new THREE.Vector2( x, y ) );
	                }
	                if( segment instanceof SVGPathSegLinetoVerticalRel ) {
	                    x = px;
	                    y = py + segment.y;
	                    line.push( new THREE.Vector2( x, y ) );
	                }
	                if( segment instanceof SVGPathSegLinetoHorizontalRel ) {
	                    x = px + segment.x;
	                    y = py;
	                    line.push( new THREE.Vector2( x, y ) );
	                }
	                if( segment instanceof SVGPathSegLinetoHorizontalAbs ) {
	                    x = segment.x;
	                    y = py;
	                    line.push( new THREE.Vector2( x, y ) );
	                }
	                if( segment instanceof SVGPathSegLinetoVerticalAbs ) {
	                    x = px;
	                    y = segment.y;
	                    line.push( new THREE.Vector2( x, y ) );
	                }
	                if( segment instanceof SVGPathSegClosePath ) {
	                    //x = ox;
	                    //y = oy;
	                    //line.push( new THREE.Vector2( x, y ) );
	                    // add line
	    				territory.lines.push( line );
	    				line = []
	                }

	                px = x;
	                py = y;

	            }

				territory.lines = territory.lines.filter( function( l ) { return l.length > 0 } )
				//countries.push( territory );

				if( !countries.has( countryCode ) ) {
	    			countries.set( countryCode, [] );
	    		}
				countries.get( countryCode ).push( territory );

	    	}

	    } );

		resolve( countries );

	} )

}

function create() {

	return readSVG().then( drawSVG );

}
