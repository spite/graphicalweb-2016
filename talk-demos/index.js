var Papa = require( 'Papaparse' );

Papa.SCRIPT_PATH = 'node_modules/papaparse/papaparse.js';

var csvWorker = new Worker("csvWorker.js");

function loadFile( fileName ) {

	return fetch( fileName )
		.then( res => res.text() )
		.then( csv => parseCSV( csv ) )

}

function parseCSV( csvString ) {

	return Papa.parse( csvString );
	//return CSVToArray( csvString, ',' );

}

function parseCSVWorker( csvString ) {

	return new Promise( ( resolve, reject ) => {

		/*Papa.parse( csvString, {
			worker: true,
			complete: resolve
		} );*/

		console.log( 'main encoding', performance.now() );
		var te = new TextEncoder();
		var array = te.encode( csvString );

		console.log( 'main post', performance.now() );
		csvWorker.postMessage( array.buffer, [ array.buffer ] );

		var res = [];
		csvWorker.addEventListener('message', function(e) {
			if( e.data.msg === 'chunk' ) {
				var td = new TextDecoder();
				var line = td.decode( e.data.line );
				res.push( line );
			}
			if( e.data.msg === 'done' ){
				console.log( 'main back', performance.now() );
				resolve( res );
			}
		}, false);

	} );

}

function filterData( data ) {

	console.log( 'Ready', performance.now() - start );
	entries = data.data.filter( e => e[ 6 ] !== null && e.length === 9 );

}

function initScene() {

	console.log( '3d stuff...' );

}

function searchName( name ) {

	return entries.filter( item => item[ 6 ] === name );

}

function searchPartialName( name ) {

	const regex = new RegExp( name, 'gmi' );

	return entries.filter( item => item[ 6 ].match( regex ) );

}

var entries = [];

var start = performance.now();
loadFile( 'data/worldcities.csv' )
	.then( res => filterData( res ) )
	.then( res => initScene() );

function init() {

	var renderer = new THREE.WebGLRenderer( { antialias: true });
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	var camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 1000 );
	camera.position.z = -100;

	var controls = new THREE.OrbitControls( camera );
	controls.damping = 0.2;

	var scene = new THREE.Scene();

	var box = new THREE.Mesh(
		new THREE.BoxGeometry( 10, 10, 10 ),
		new THREE.MeshNormalMaterial()
	);
	scene.add( box );

	renderer.setClearColor( 0x202020, 1 );

	var startTime = Date.now();

	function render() {

		requestAnimationFrame( render );

		var t = Date.now() - startTime;

		box.rotation.y = .0001 * performance.now()
		renderer.render( scene, camera );

	}

	render();

	window.addEventListener( 'resize', function() {

		renderer.setSize( window.innerWidth, window.innerHeight );
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

	} );

}

window.addEventListener( 'load', init );
