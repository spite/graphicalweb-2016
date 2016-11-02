self.importScripts('CSVToArray.js');

self.addEventListener('message', function(e) {

	console.log( 'worker start', performance.now() );
	var td = new TextDecoder();
	var string = td.decode( e.data );

	console.log( 'worker csvtoarray', performance.now() );
	var res = CSVToArray( string );

	debugger;
	console.log( 'worker encoding', performance.now() );
	var te = new TextEncoder();
	res.forEach( v => {
		var enc = te.encode( v );
		self.postMessage( { msg: 'chunk', line: enc.buffer }, [ enc.buffer ] );
	} );
	self.postMessage( { msg: 'done' } );

}, false);
