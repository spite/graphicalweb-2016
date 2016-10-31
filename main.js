'use strict'

const regions = {
	'Africa': { color: new THREE.Color( 0xfec92e ) },
	'Latin America': { color: new THREE.Color( 0xfec92e ) },
	'North America': { color: new THREE.Color( 0xcb3e1a ) },
	'West Asia': { color: new THREE.Color( 0xb41174 ) },
	'South Asia': { color: new THREE.Color( 0x245aa3 ) },
	'East Asia': { color: new THREE.Color( 0x18a492 ) },
	'South-East Asia': { color: new THREE.Color( 0x159c41 ) },
	'Former Soviet Union': { color: new THREE.Color( 0x674290 ) },
	'Europe': { color: new THREE.Color( 0x6fac34 ) },
	'Oceania': { color: new THREE.Color( 0x3b8874 ) },
};

const subregions = {
	'Australia and New Zealand': 'Oceania',
	'Caribbean': 'Latin America',
	'Central America': 'Latin America',
	'Central Asia': 'Former Soviet Union',
	'Central Europe': 'Europe',
	'Eastern Africa': 'Africa',
	'Eastern Asia': 'East Asia',
	'Eastern Europe': 'Former Soviet Union',
	'Melanesia': 'Oceania',
	'Micronesia': 'Oceania',
	'Middle Africa': 'Africa',
	'Northern Africa': 'Africa',
	'Northern America': 'North America',
	'Northern Europe': 'Europe',
	'Polynesia': 'Oceania',
	'South America': 'Latin America',
	'South-Eastern Asia': 'South-East Asia',
	'Southern Africa': 'Africa',
	'Southern Asia': 'South Asia',
	'Southern Europe': 'Europe',
	'Western Africa': 'Africa',
	'Western Asia': 'West Asia',
	'Western Europe': 'Europe'
};

const renderer = new THREE.WebGLRenderer( { antialias: true, preserveDrawingBuffer: true } );
var pixelRatioScale = 1;
renderer.setPixelRatio( pixelRatioScale * window.devicePixelRatio );
renderer.setClearColor( 0 );
renderer.sortObjects = false;

const atlasRobotoCondensed = new THREE.FontAtlas( {
	renderer: renderer,
	size: 160,
	fontName: 'Roboto Condensed',
	woffSrc: 'url(https://fonts.gstatic.com/s/robotocondensed/v13/Zd2E9abXLFGSr9G3YK2MsNxB8OB85xaNTJvVSB9YUjQ.woff)',
	woff2Src: 'url(https://fonts.gstatic.com/s/robotocondensed/v13/Zd2E9abXLFGSr9G3YK2MsIPxuqWfQuZGbz5Rz4Zu1gk.woff2)'
} );;

const effect = new THREE.VREffect( renderer );

const container = document.getElementById( 'container' );

const scene = new THREE.Scene();
const hitScene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera( 75, 1, .0001, 30 );
camera.target = new THREE.Vector3();
camera.position.set( 0, 0, 0.0001 );

const hitCamera = new THREE.PerspectiveCamera( .001, 1, .01, 3000 );

var controls;

const world = new THREE.Object3D();
const backdropLayer = new THREE.Object3D();
const labelsLayer = new THREE.Object3D();
const linesLayer = new THREE.Object3D();
world.add( backdropLayer );
world.add( labelsLayer );
world.add( linesLayer );

const codes = new Map();

const worldRadius = 2;

const hitTexture = new THREE.WebGLRenderTarget( 1, 1 );
hitTexture.texture.minFilter = THREE.NearestFilter;
hitTexture.texture.magFilter = THREE.NearestFilter;
hitTexture.generateMipMaps = false;

let hoveredCountry = null;
let currentCountry = null;

const fboHelper = new FBOHelper( renderer );

let controller1, controller2;

let globalMax = 0;
let globalMin = 10000000000;
var earthMesh;

const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

let counter = 0;
let hash = null;
const pixelBuffer = new Uint8Array( 4 );

let fade = 0;
let nFade = 0;
let opacity = 1;
let nOpacity = 1;
let textOpacity = 0;
let nTextOpacity = 0;
let bordersOpacity = 0;
let nBordersOpacity = 1;
let previousTime = 0;

let isVR = false;
let mouse = { x: 0, y: 0 };
let hasMoved = false;

function onMouseDown( event ) {

	hasMoved = false;
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

}

function onMouseMove( event ) {

	hasMoved = true;
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

}

var dummy = new THREE.Object3D();

function onMouseUp( event ) {

	if( !hasMoved ) {
		raycaster.setFromCamera( mouse, camera );
		var intersections = raycaster.intersectObject( earthMesh );
		var p = intersections[ 0 ].point;
		dummy.lookAt( p )
		dummy.rotation.y += Math.PI;
		hitTest( dummy ).then( res => selectCountry( res ) );
	}

}

function onTriggerDown( event ) {

	const controller = event.target;

	const intersections = getIntersections( controller );

	if ( intersections.length > 0 ) {

		const intersection = intersections[ 0 ];
		hitTest( controller ).then( res => selectCountry( res ) );

	}

}

function onTriggerUp( event ) {

	const controller = event.target;

}

function getIntersections( controller ) {

	tempMatrix.identity().extractRotation( controller.matrixWorld );

	raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
	raycaster.ray.direction.set( 0, 0, -1 ).applyMatrix4( tempMatrix );

	return raycaster.intersectObject( earthMesh );

}

function intersectObjects( controller ) {

	const line = controller.getObjectByName( 'line' );
	const intersections = getIntersections( controller );

	if ( intersections.length > 0 ) {

		const intersection = intersections[ 0 ];

		line.scale.z = intersection.distance;

	} else {

		line.scale.z = 5;

	}

}

function init() {

	container.appendChild( renderer.domElement );

	fboHelper.attach( hitTexture, 'HitMap' );

	controls = new THREE.OrbitControls( camera, renderer.domElement );

	if ( navigator.getVRDisplays ) {

		navigator.getVRDisplays()
			.then( function ( displays ) {

				controls = new THREE.VRControls( camera );

				effect.setVRDisplay( displays[ 0 ] );
				controls.setVRDisplay( displays[ 0 ] );

				scene.add( new THREE.HemisphereLight( 0x606060, 0x404040 ) );

				var light = new THREE.DirectionalLight( 0xffffff );
				light.position.set( 1, 1, 1 ).normalize();
				scene.add( light );

				var loader = new THREE.OBJLoader();
				loader.setPath( 'assets/' );
				loader.load( 'vr_controller_vive_1_5.obj', object => {

					var loader = new THREE.TextureLoader();
					loader.setPath( 'assets/' );

					var controller = object.children[ 0 ];
					controller.material.map = loader.load( 'onepointfive_texture.png' );
					controller.material.specularMap = loader.load( 'onepointfive_spec.png' );

					var lineGeometry = new THREE.Geometry();
					lineGeometry.vertices.push( new THREE.Vector3( 0, 0, 0 ) );
					lineGeometry.vertices.push( new THREE.Vector3( 0, 0, - 1 ) );

					var line = new THREE.Line( lineGeometry );
					line.name = 'line';
					line.scale.z = 5;

					function initController() {

						const controller = new THREE.ViveController( 0 );
						controller.standingMatrix = controls.getStandingMatrix();
						scene.add( controller );

						controller.addEventListener( 'triggerdown', onTriggerDown );
						controller.addEventListener( 'triggerup', onTriggerUp );

						controller.add( line.clone() );
						controller.add( object.clone() );

						return controller;

					}

					controller1 = initController();
					controller2 = initController();

					isVR = true;

				} );

			} )
			.catch( function () {
				// no displays
			} );

		document.body.appendChild( WEBVR.getButton( effect ) );

	}

	scene.add( world );

	window.addEventListener( 'mousedown', onMouseDown );
	window.addEventListener( 'mouseup', onMouseUp );
	window.addEventListener( 'mousemove', onMouseMove );

	window.addEventListener( 'resize', onWindowResize );

	onWindowResize();

	loadMap();

}

var countriesData, mapData, migrationData, inData, outData;

function createCountriesMap( data ) {

	var map = new Map();

	data.forEach( c => {
		map.set( c.cca3, c );
	} );

	return map;

}

function loadMap() {

	Promise.all( [
		fetch( 'assets/BlankMap-Equirectangular.svg' )
			.then( res => res.text() )
			.then( res => {
				return Promise.all( [
					drawSVG( res )
					.then( res => mapData = res ),
					createWorldMask( res )
					] )
			} ),
		fetch( 'assets/data.csv' )
			.then( res => res.text() )
			.then( res => parseData( res ) )
			.then( res => [ inData, outData ] = res ),
		fetch( 'assets/countries.json' )
			.then( res => res.json() )
			.then( res => createCountriesMap( res ) )
			.then( res => countriesData = res )
		] )
	.then( _ => aggregateMigrationData() )
	.then( _ => buildMap() )
	.then( _ => render() );

}

function createWorldMask( source ) {

	return new Promise( ( resolve, reject ) => {

		const d = new DOMParser();
		const doc = d.parseFromString( source, "image/svg+xml");
		const countries = doc.querySelectorAll( '.country path' );
		[].forEach.call( countries, ( l, i ) => {
			l.setAttribute( 'fill', `rgb(255,0,${i})` );
			l.setAttribute( 'stroke', `rgb(255,0,${i})` );
			l.setAttribute( 'stroke-width', 0 );
			codes.set( i, l.parentNode.className.baseVal.replace( 'country ', '' ) );
		} );
		//var src = doc.children[ 0 ].outerHTML; // works on FF & Ch

		const oSerializer = new XMLSerializer();
		const src = oSerializer.serializeToString(doc);

		const img = new Image();
		const svg = new Blob([ src ], {type: 'image/svg+xml;charset=utf-8'});
		const DOMURL = window.URL || window.webkitURL || window;
		const url = DOMURL.createObjectURL(svg);

		img.addEventListener( 'load', _ => {

			const canvas = document.createElement( 'canvas' );
			const ctx = canvas.getContext( '2d' );
			canvas.width = 4096;
			canvas.height = 2048;
			ctx.drawImage( img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height );
			DOMURL.revokeObjectURL( url );

			const texture = new THREE.Texture( canvas );
			texture.needsUpdate = true;

			const mesh = new THREE.Mesh(
				new THREE.IcosahedronGeometry( worldRadius, 6 ),
				new THREE.MeshBasicMaterial( { map: texture, side: THREE.DoubleSide } )
			);
			hitScene.add( mesh );
			mesh.scale.x = -1;

			console.log( 'createworldmask' )
			resolve();

		} );

		img.src = url;

		//createTextLabels();
	} );

}

function parseData( data ) {

	// region_orig, region_orig_id
	// region_dest, region_dest_id
	// country_orig, country_orid_id
	// country_dest, country_dest_id
	// region_flow_1990, regionflow_1995, region_flow_2000, region_flow_2005
	// country_flow_1990, country_flow_1995, country_flow_2000, country_flow_2005
	// metadata

	const inMap = new Map();
	const outMap = new Map();
	const inData = CSVToArray( data, ',' )
	const outData = CSVToArray( data, ',' )

	inData.forEach( s => {

		s[ 8 ] = parseInt( s[ 18 ], 10 );
		s[ 9 ] = parseInt( s[ 9 ], 10 );
		s[ 10 ] = parseInt( s[ 10 ], 10 );
		s[ 11 ] = parseInt( s[ 11 ], 10 );

		s[ 12 ] = parseInt( s[ 12 ], 10 );
		s[ 13 ] = parseInt( s[ 13 ], 10 );
		s[ 14 ] = parseInt( s[ 14 ], 10 );
		s[ 15 ] = parseInt( s[ 15 ], 10 );

		if( s[ 15 ] > globalMax ) globalMax = s[ 15 ];
		if( s[ 15 ] < globalMin ) globalMin = s[ 15 ]

	} );

	var globalRange = globalMax - globalMin;

	inData.forEach( s => {

		if( !outMap.has( s[ 5 ] ) ) {
			outMap.set( s[ 5 ], new Map() );
		}
		outMap.get( s[ 5 ] ).set( s[ 7 ], ( s[ 15 ] - globalMin ) / globalRange );

		if( !inMap.has( s[ 7 ] ) ) {
			inMap.set( s[ 7 ], new Map() );
		}
		inMap.get( s[ 7 ] ).set( s[ 5 ], ( s[ 15 ] - globalMin ) / globalRange );

	} );

	return [ inMap, outMap ];

}

function latLngToVec3( lat, lon ) {

	lat = Math.max( - 85, Math.min( 85, lat ) );
	const phi = ( 90 - lat ) * Math.PI / 180;
	const theta = ( 180 - lon ) * Math.PI / 180;
	const d = worldRadius;
	const x = -d * Math.sin( phi ) * Math.cos( theta );
	const y = d * Math.cos( phi );
	const z = d * Math.sin( phi ) * Math.sin( theta );

	return new THREE.Vector3( x, y, z );

}

function addTriangle( points, buffer, t ) {

	points.forEach( p => {

		buffer[ t + 0 ] = p.x;
		buffer[ t + 1 ] = p.y;
		buffer[ t + 2 ] = p.z;

		t += 3;

	} );

	return t;

}

function addUV( points, buffer, t ) {

	points.forEach( p => {

		buffer[ t + 0 ] = p.x;
		buffer[ t + 1 ] = p.y;

		t += 2;

	} );

	return t;

}

function join( a, b, w ) {

	const from = latLngToVec3( a.lat, a.lon );
	const to = latLngToVec3( b.lat, b.lon );

	const dir = to.clone().sub( from ).normalize();
	const d = from.distanceTo( to );

	const s = new THREE.ConstantSpline()

	s.p0 = from.clone();
	s.p1 = from.clone().add( from.clone().normalize().multiplyScalar( -.5 * d ) );
	s.p2 = to.clone().add( to.clone().normalize().multiplyScalar( -.5 * d ) );
	s.p3 = to.clone();

	const perpendicular = s.p1.clone().normalize().cross( dir );
	perpendicular.normalize().multiplyScalar( .05 * d );
	s.p1.add( perpendicular );
	s.p2.add( perpendicular );

	s.calculate();
	s.calculateDistances();
	s.reticulate( { distancePerStep: worldRadius / 40 } );

 	const geometry = new THREE.BufferGeometry();

	const triangles = s.lPoints.length;
	const positions = new Float32Array( triangles * 3 * 3 * 2 );
	const uvs = new Float32Array( triangles * 3 * 2 * 2 );

	const p0 = s.lPoints[ 0 ];
	const p1 = s.lPoints[ s.lPoints.length - 1 ];
	const dd = p1.clone().sub( p0 ).normalize();
	const up = p0.clone().normalize();
	const p = up.cross( dd ).normalize();

	let t = 0;
	let t2 = 0;

	let o = 0;//j / s.lPoints.length;
	let i = 1;//1 / s.lPoints.length;
	const ua = new THREE.Vector2( o, 0 );
	const ub = new THREE.Vector2( o + i, 0 );
	const uc = new THREE.Vector2( o, 1 );
	const ud = new THREE.Vector2( o + i, 1 );

	const width = w * worldRadius / 5;

	for( let j = 0; j < s.lPoints.length - 1; j++ ) {

		const from = s.lPoints[ j ];
		const to = s.lPoints[ j + 1 ];

		const pScaled1 = p.clone().multiplyScalar( j * width / s.lPoints.length );
		const pScaled2 = p.clone().multiplyScalar( ( j + 1 ) * width / s.lPoints.length );
		const a = from.clone().sub( pScaled1 );
		const b = to.clone().sub( pScaled2 );
		const c = from.clone().add( pScaled1 );
		const d = to.clone().add( pScaled2 );

		t = addTriangle( [ a, b, c ], positions, t );
		t = addTriangle( [ d, c, b ], positions, t );

		o = j / s.lPoints.length;
		i = 1 / s.lPoints.length;
		ua.set( o, 0 );
		ub.set( o + i, 0 );
		uc.set( o, 1 );
		ud.set( o + i, 1 );

		t2 = addUV( [ ua, ub, uc ], uvs, t2 );
		t2 = addUV( [ ud, uc, ub ], uvs, t2 );

	}

	geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
	geometry.addAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) );

	return [ geometry, s.lPoints.length ];

}

const backdropMaterial = new THREE.MeshBasicMaterial( { color: 0x0, transparent: true, opacity: .6, depthWrite: false } );

const bordersMaterial = new THREE.LineBasicMaterial( { transparent: true, linewidth: 2, color: 0x99d5f1 });
const shapesMaterial = new THREE.LineBasicMaterial( { transparent: true, linewidth: 2, color: 0x99d5f1 });

const lineMaterial = new THREE.RawShaderMaterial( {
	uniforms: {
		color: { type: 'c', value: new THREE.Color( 0xffba00 ) },
		opacity: { type: 'f', value: .5 },
		time: { type: 'f', value: 0 },
		fade: { type: 'f', value: 0 },
		fadeOpacity: { type: 'f', value: 0 },
		direction: { type: 'f', value: 0 },
		width: { type: 'f', value: 0 },
		steps: { type: 'f', value: 0 }
	},
	transparent: true,
	side: THREE.DoubleSide,
	depthWrite: false,
	vertexShader: document.getElementById( 'line-vs' ).textContent,
	fragmentShader: document.getElementById( 'line-fs' ).textContent
} );

let selectedCountry = null;
const linesObject = new THREE.Object3D();
linesLayer.add( linesObject );

let bordersMesh;

function selectCountry( country ) {

	if( country === selectedCountry ) return;

	if( selectedCountry ) {

		selectedCountry = country;

		hideConnections().then( _ => {
			createConnections( country );
		});

	} else {

		selectedCountry = country;
		createConnections( country );

	}

}

function hideConnections() {

	opacity = 1;
	nOpacity = 0;

	nTextOpacity = 0;
	nBordersOpacity = 1;

	return new Promise( ( resolve, reject ) => {
		setTimeout( function() {
			while( linesObject.children.length ) linesObject.remove( linesObject.children[ 0 ] )
			mapData.forEach( c => c.shape.visible = false );
			countriesData.forEach( c => {
				c.label.mesh.visible = false;
				c.labelIn.mesh.visible = false;
				c.labelOut.mesh.visible = false;
				c.backdrop.visible = false;
				textOpacity = 0;
				nTextOpacity = 0;
			} );
			resolve();
		}, 1000 );
	});

}

function formatNumber( value, sizes, decimals ) {

	if(value == 0) return '0';

	var k = 1000; // or 1024 for binary
	var dm = decimals || 2;
	var i = Math.floor(Math.log(value) / Math.log(k));

	return parseFloat((value / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];

}

var sizes = [ '', 'K', 'M', 'G' ];

function restoreValue( v ) {

	return globalMin + v * ( globalMax - globalMin );

}

function createConnections( country ) {

	if( country === null ) return;

	nOpacity = 1;
	nTextOpacity = 1;
	nBordersOpacity = .25;

	var ct = mapData.get( country );
	if( ct ) ct.shape.visible = true;

	const cty = countriesData.get( country );
	cty.label.mesh.visible = true;
	cty.backdrop.visible = true;
	cty.labelIn.set( `TOTAL OUT: ${formatNumber( restoreValue( cty.totalOut ), sizes, 2 )}` );
	cty.labelIn.mesh.visible = true;
	cty.labelOut.set( `TOTAL IN: ${formatNumber( restoreValue( cty.totalIn ), sizes, 2 )}` );
	cty.labelOut.mesh.visible = true;
	adjustWidth( cty );
	const from = cty.latlng;
	const w = .5;
	const min = 10000;

	let show = new Set();

	inData.get( country ).forEach( ( amount, toCountry ) => {

		if( toCountry != country ) {
			const c = countriesData.get( toCountry );
			if( c ) {
				var r = restoreValue( amount );
				const n = formatNumber( r, sizes, 2 );
				c.labelIn.set( `OUT: ${n}` );
				if( r >= min ) {
					const to = c.latlng;
					const [ g, d ] = join( { lat: from[ 0 ], lon: from[ 1 ] }, { lat: to[ 0 ], lon: to[ 1 ] }, w * amount );
					const mat = lineMaterial.clone();
					mat.uniforms.color.value.copy( regions[ subregions[ c.subregion ] ].color );
					mat.uniforms.opacity.value = amount;
					mat.uniforms.steps.value = d;
					mat.uniforms.width.value = w * amount;
					mat.uniforms.direction.value = -1;
					const line = new THREE.Mesh( g, mat );
					linesObject.add( line );
					show.add( c );
				}
			} else {
				console.log( 'Missing country ', toCountry );
			}
		}

	} );

	outData.get( country ).forEach( ( amount, toCountry ) => {

		if( toCountry !== country ) {
			const c = countriesData.get( toCountry );
			if( c ) {
				var r = restoreValue( amount );
				const n = formatNumber( r, sizes, 2 );
				c.labelOut.set( `IN: ${n}` );
				if( r >= min ) {
					const to = c.latlng;
					const [ g, d ] = join( { lat: to[ 0 ], lon: to[ 1 ] }, { lat: from[ 0 ], lon: from[ 1 ] }, w * amount );
					const mat = lineMaterial.clone();
					mat.uniforms.color.value.copy( regions[ subregions[ c.subregion ] ].color );
					mat.uniforms.opacity.value = amount;
					mat.uniforms.steps.value = d;
					mat.uniforms.width.value = w * amount;
					mat.uniforms.direction.value = 1;
					const line = new THREE.Mesh( g, mat );
					linesObject.add( line );
					show.add( c );
				}
			} else {
				console.log( 'Missing country ', toCountry );
			}
		}

	} );

	show.forEach( c => {
		adjustWidth( c );
		c.labelIn.mesh.visible = true;
		c.labelOut.mesh.visible = true;
		c.label.mesh.visible = true;
		c.backdrop.visible = true;
		var ct = mapData.get( c.cca3 );
		if( ct ) ct.shape.visible = true;
	})

	fade = 0;
	nFade = 1;

}

function toASCII(s){

	let r = s.toLowerCase();

	const non_asciis = {
		'a': '[àáâãäå]',
		'ae': 'æ',
		'c': 'ç',
		'e': '[èéêë]',
		'i': '[ìíîï]',
		'n': 'ñ',
		'o': '[òóôõö]',
		'oe': 'œ',
		'u': '[ùúûűü]',
		'y': '[ýÿ]'
	};

	for ( const i in non_asciis ) {
		r = r.replace( new RegExp( non_asciis[ i ], 'g' ), i );
	}

	return r;

};

function aggregateMigrationData() {

	countriesData.forEach( c => {

		let totalIn = 0;

		const inValues = inData.get( c.cca3 )
		if( inValues ) {
			inValues.forEach( inC => totalIn += inC );
		}

		c.totalIn = totalIn;

		let totalOut = 0;

		const outValues = outData.get( c.cca3 )
		if( outValues ) {
			outValues.forEach( inC => totalOut += inC );
		}

		c.totalOut = totalOut;

	} );

}

function memcpy (src, srcOffset, dst, dstOffset, length) {
	var i
	src = src.subarray || src.slice ? src : src.buffer
	dst = dst.subarray || dst.slice ? dst : dst.buffer
	src = srcOffset ? src.subarray ?
		src.subarray(srcOffset, length && srcOffset + length) :
		src.slice(srcOffset, length && srcOffset + length) : src
	if (dst.set) {
		dst.set(src, dstOffset)
	} else {
		for (i=0; i<src.length; i++) {
			dst[i + dstOffset] = src[i]
		}
	}
	return dst
}

function buildMap() {

	var min = 10000000, max = -10000000;

	var lines = 0;
	mapData.forEach( ( territory, id ) => {

		territory.forEach( path => {

			path.lines.forEach( line => {

				lines += line.length;

			} );

		} );

	} );

	var lineGeometry = new THREE.BufferGeometry();
	var positions = new Float32Array( lines * 2 * 3 );
	var gptr = 0;

	mapData.forEach( ( territory, id ) => {

		var territoryGeometry = new THREE.BufferGeometry();
		var parts = [];

		territory.forEach( path => {

			path.lines.forEach( line => {

				var partPositions = new Float32Array( line.length * 2 * 3 );
				var ptr = 0;

				for( var j = 0; j < line.length - 1; j++ ) {

					var p = line[ j ];
					if( p.y < min ) min = p.y;
					if( p.y > max ) max = p.x;

					var res = latLngToVec3( p.y, p.x );

					partPositions[ ptr ] = res.x;
					partPositions[ ptr + 1 ] = res.y;
					partPositions[ ptr + 2 ] = res.z;

					ptr += 3;

					var p = line[ j + 1 ];

					var res = latLngToVec3( p.y, p.x );

					partPositions[ ptr ] = res.x;
					partPositions[ ptr + 1 ] = res.y;
					partPositions[ ptr + 2 ] = res.z;

					ptr += 3;

				}

				parts.push( partPositions );

				memcpy( partPositions, 0, positions, gptr, partPositions.length );
				gptr += ptr;

			});

		} );

		var partPositions = new Float32Array( parts.reduce( ( a, b ) => a + b.length, 0 ) );

		var tPtr = 0;
		parts.forEach( p => {
			memcpy( p, 0, partPositions, tPtr, p.length );
			tPtr += p.length;
		});

		var partGeometry = new THREE.BufferGeometry();
		partGeometry.addAttribute( 'position', new THREE.BufferAttribute( partPositions, 3 ) );
		partGeometry.computeBoundingSphere();

		var mesh = new THREE.LineSegments( partGeometry, shapesMaterial );
		mesh.fustrumCulled = false;
		mesh.visible = false;
		backdropLayer.add( mesh );

		territory.shape = mesh;

	} );

	const scale = worldRadius / 5;
	const depth = .01;

	countriesData.forEach( capital => {

		var res = latLngToVec3( capital.latlng[ 0 ], capital.latlng[ 1 ] );

		var panel = new THREE.Object3D();
		labelsLayer.add( panel );
		panel.position.copy( res );
		panel.lookAt( world.position );

		var backdrop = new THREE.Mesh(
			new THREE.PlaneBufferGeometry( 1, .3 ),
			backdropMaterial
		);
		backdrop.position.set( .5 - .05, -0.025, 0 );
		backdrop.visible = false;
		capital.backdrop = backdrop;
		panel.add( backdrop );

		var label = new THREE.Text( atlasRobotoCondensed );
		label.mesh.scale.set( scale, scale, scale );
		label.mesh.position.set( .05, 0, depth );
		label.set( toASCII( capital.name.common ).toUpperCase() );
		panel.add( label.mesh );
		label.mesh.visible = false;
		capital.label = label;

		var labelIn = new THREE.Text( atlasRobotoCondensed );
		labelIn.mesh.position.set( .05, -.15 * scale, depth );
		labelIn.mesh.scale.set( scale * .85, scale * .85, scale * .85 );
		labelIn.mesh.material.uniforms.color.value.setHex( 0x99d5f1 );
		panel.add( labelIn.mesh );
		labelIn.mesh.visible = false;
		capital.labelIn = labelIn;

		var labelOut = new THREE.Text( atlasRobotoCondensed );
		labelOut.mesh.position.set( .05, -.3 * scale, depth );
		labelOut.mesh.scale.set( scale * .85, scale * .85, scale * .85 );
		labelOut.mesh.material.uniforms.color.value.setHex( 0xfd692b );
		panel.add( labelOut.mesh );
		labelOut.mesh.visible = false;
		capital.labelOut = labelOut;

		capital.panel = panel;

	});

	lineGeometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
	lineGeometry.computeBoundingSphere();

	bordersMesh = new THREE.LineSegments( lineGeometry, bordersMaterial );
	bordersMesh.fustrumCulled = false;
	backdropLayer.add( bordersMesh );

	/*var exporter = new THREE.OBJExporter();
	var result = exporter.parse( scene );

	var blobModel = new Blob( [ result ], { type: 'text/plain' } );
	var url = URL.createObjectURL( blobModel );

	window.location = url;*/

	var geometry = new THREE.IcosahedronGeometry( 0.05 + worldRadius, 6 );

	var loader = new THREE.TextureLoader()
	var heightMap = loader.load( 'assets/bathymetry_bw_composite_4k.jpg' );
	var diffuseMap = loader.load( 'assets/bathymetry_diffuse_4k.jpg' );

	var material = new THREE.RawShaderMaterial( {
		uniforms: {
			diffuseMap: { type: 't', value: diffuseMap },
			floorMap: { type: 't', value: heightMap }
		},
		vertexShader: document.getElementById( 'floor-vs' ).textContent,
		fragmentShader: document.getElementById( 'floor-fs' ).textContent,
		wireframe: true,
		side: THREE.DoubleSide
	} );

	earthMesh = new THREE.Mesh( geometry, material );
	earthMesh.scale.x = -1
	backdropLayer.add( earthMesh );

}

function hashCamera() {

	return `${camera.position.x}|${camera.position.y}|${camera.position.z}|${camera.rotation.x}|${camera.rotation.y}|${camera.rotation.z}`

}

function hitTest( obj ) {

	hitCamera.position.copy( obj.position );
	hitCamera.rotation.copy( obj.rotation );
	renderer.render( hitScene, hitCamera, hitTexture );

	return new Promise( ( resolve, reject ) => {

		requestAnimationFrame( function() {

			var res = null;
			var start = performance.now();

			renderer.readRenderTargetPixels( hitTexture, 0, 0, 1, 1, pixelBuffer );

			if( pixelBuffer[ 3 ] === 255 ) {
				if( pixelBuffer[ 0 ] === 255 ) {
					res = codes.get( pixelBuffer[ 2 ] )
				}
			}

			console.log( res, performance.now() - start );
			resolve( res );

		} );

	});

}

function adjustWidth( city ) {

	var w = Math.max( city.label.width, city.labelIn.width, city.labelOut.width );
	const scale = worldRadius / 5;
	city.backdrop.scale.x = .001 * ( scale * ( w + 300 ) );
	city.backdrop.position.x = .5 * city.backdrop.scale.x;

}

function render( timestamp ) {

	if( isVR ) {
		controller1.update();
		controller2.update();
	}

	controls.update();

	var time = performance.now();
	var dt = ( time - previousTime ) / 1000000;

	fade = nFade + (fade - nFade) * ( Math.pow( .02, 90 * dt ) );
	opacity = nOpacity + (opacity - nOpacity) * ( Math.pow( .02, 900 * dt ) );
	textOpacity = nTextOpacity + (textOpacity - nTextOpacity) * ( Math.pow( .02, 450 * dt ) );
	bordersOpacity = nBordersOpacity + (bordersOpacity - nBordersOpacity) * ( Math.pow( .02, 450 * dt ) );

	var t = performance.now();
	linesObject.children.forEach( l => {
		l.material.uniforms.time.value = t;
		l.material.uniforms.fade.value = fade;
		l.material.uniforms.fadeOpacity.value = opacity;
	} );

	backdropMaterial.opacity = .6 * textOpacity;

	bordersMesh.material.opacity = bordersOpacity;
	mapData.forEach( c => {
		//c.shape.material.opacity = textOpacity;
		var s = 1. - textOpacity * .01;
		c.shape.scale.set( s, s, s );
	});

	countriesData.forEach( c => {
		c.label.material.uniforms.opacity.value = textOpacity;
		c.labelIn.material.uniforms.opacity.value = textOpacity;
		c.labelOut.material.uniforms.opacity.value = textOpacity;
	});

	effect.render( scene, camera );

	if( isVR ) {
		intersectObjects( controller1 );
		intersectObjects( controller2 );
	}

	fboHelper.update();

	effect.requestAnimationFrame( render );

	previousTime = time;

}

function onWindowResize() {

	effect.setSize( container.clientWidth, container.clientHeight );
	camera.aspect = container.clientWidth / container.clientHeight;
	camera.updateProjectionMatrix();

	fboHelper.setSize( container.clientWidth, container.clientHeight );
	hitTexture.setSize( 100, 100 );
	fboHelper.refreshFBO( hitTexture );

}

window.addEventListener( 'load', init );
