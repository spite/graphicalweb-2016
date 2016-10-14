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

const camera = new THREE.PerspectiveCamera( 75, 1, .01, 3000 );
camera.target = new THREE.Vector3();
camera.position.set( 0, 0, 0.0001 );

const hitCamera = new THREE.PerspectiveCamera( .001, 1, .01, 3000 );

var controls;

const world = new THREE.Object3D();
const codes = new Map();

const hitTexture = new THREE.WebGLRenderTarget( 1, 1 );
hitTexture.texture.minFilter = THREE.NearestFilter;
hitTexture.texture.magFilter = THREE.NearestFilter;
hitTexture.generateMipMaps = false;
hitTexture.flipY = true;

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
let previousTime = 0;

function onTriggerDown( event ) {

	const controller = event.target;

	const intersections = getIntersections( controller );

	if ( intersections.length > 0 ) {

		const intersection = intersections[ 0 ];
		const res = hitTest( controller );
		createConnections( res );

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

	//controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls = new THREE.VRControls( camera );

	if ( navigator.getVRDisplays ) {

		navigator.getVRDisplays()
			.then( function ( displays ) {
				effect.setVRDisplay( displays[ 0 ] );
				controls.setVRDisplay( displays[ 0 ] );
			} )
			.catch( function () {
				// no displays
			} );

		document.body.appendChild( WEBVR.getButton( effect ) );

	}

	scene.add( new THREE.HemisphereLight( 0x606060, 0x404040 ) );

	var light = new THREE.DirectionalLight( 0xffffff );
	light.position.set( 1, 1, 1 ).normalize();
	scene.add( light );

	controller1 = new THREE.ViveController( 0 );
	controller1.standingMatrix = controls.getStandingMatrix();
	scene.add( controller1 );

	controller1.addEventListener( 'triggerdown', onTriggerDown );
	controller1.addEventListener( 'triggerup', onTriggerUp );

	controller2 = new THREE.ViveController( 1 );
	controller2.standingMatrix = controls.getStandingMatrix();
	scene.add( controller2 );

	controller2.addEventListener( 'triggerdown', onTriggerDown );
	controller2.addEventListener( 'triggerup', onTriggerUp );

	var lineGeometry = new THREE.Geometry();
	lineGeometry.vertices.push( new THREE.Vector3( 0, 0, 0 ) );
	lineGeometry.vertices.push( new THREE.Vector3( 0, 0, - 1 ) );

	var line = new THREE.Line( lineGeometry );
	line.name = 'line';
	line.scale.z = 5;

	controller1.add( line.clone() );
	controller2.add( line.clone() );

	var loader = new THREE.OBJLoader();
	loader.setPath( 'assets/' );
	loader.load( 'vr_controller_vive_1_5.obj', object => {

		var loader = new THREE.TextureLoader();
		loader.setPath( 'assets/' );

		var controller = object.children[ 0 ];
		controller.material.map = loader.load( 'onepointfive_texture.png' );
		controller.material.specularMap = loader.load( 'onepointfive_spec.png' );

		controller1.add( object.clone() );
		controller2.add( object.clone() );

	} );

	scene.add( world );

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
		] ).then( _ => buildMap() ).then( _ => render() );

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
				new THREE.IcosahedronGeometry( 5, 6 ),
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
	const d = 5;
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
	s.reticulate( { distancePerStep: .2 } );

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

	for( let j = 0; j < s.lPoints.length - 1; j++ ) {

		const from = s.lPoints[ j ];
		const to = s.lPoints[ j + 1 ];

		const pScaled1 = p.clone().multiplyScalar( j * w / s.lPoints.length );
		const pScaled2 = p.clone().multiplyScalar( ( j + 1 ) * w / s.lPoints.length );
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

const lineMaterial = new THREE.RawShaderMaterial( {
	uniforms: {
		color: { type: 'c', value: new THREE.Color( 0xffba00 ) },
		opacity: { type: 'f', value: .5 },
		time: { type: 'f', value: 0 },
		fade: { type: 'f', value: 0 },
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

const linesObject = new THREE.Object3D();
world.add( linesObject );

function createConnections( country ) {

	fade = 0.;
	nFade = 0.;

	while( linesObject.children.length ) linesObject.remove( linesObject.children[ 0 ] )
	countriesData.forEach( c => { if( c.label ) c.label.mesh.visible = false; } );

	if( country === null ) return;

	const cty = countriesData.get( country );
	cty.label.mesh.visible = true;
	const from = cty.latlng;
	const w = .5;
	const min = .01;

	inData.get( country ).forEach( ( amount, toCountry ) => {

		if( amount > min ) {
			const c = countriesData.get( toCountry );
			if( c ) {
				if( c.label ) c.label.mesh.visible = true;
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
			} else {
				console.log( 'Missing country ', toCountry );
			}
		}

	} );

	outData.get( country ).forEach( ( amount, toCountry ) => {

		if( amount > min ) {
			const c = countriesData.get( toCountry );
			if( c ) {
				if( c.label ) c.label.mesh.visible = true;
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
			} else {
				console.log( 'Missing country ', toCountry );
			}
		}

	} );

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

function buildMap() {

	var material = new THREE.LineBasicMaterial( { linewidth: 2 });
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
	var ptr = 0;

	mapData.forEach( ( territory, id ) => {

		var territoryGeometry = new THREE.BufferGeometry();

		territory.forEach( path => {

			path.lines.forEach( line => {

				for( var j = 0; j < line.length - 1; j++ ) {

					var p = line[ j ];
					if( p.y < min ) min = p.y;
					if( p.y > max ) max = p.x;

					var res = latLngToVec3( p.y, p.x );

					positions[ ptr ] = res.x;
					positions[ ptr + 1 ] = res.y;
					positions[ ptr + 2 ] = res.z;

					ptr += 3;

					var p = line[ j + 1 ];

					var res = latLngToVec3( p.y, p.x );

					positions[ ptr ] = res.x;
					positions[ ptr + 1 ] = res.y;
					positions[ ptr + 2 ] = res.z;

					ptr += 3;

				}

				var capital = countriesData.get( id );
				if( capital ) {

					var res = latLngToVec3( capital.latlng[ 0 ], capital.latlng[ 1 ] );

					var sphere = new THREE.Mesh(
						new THREE.BoxBufferGeometry( .1, .1, .1 ),
						new THREE.MeshBasicMaterial( { color: 0x0ff00ff })
					)
					sphere.position.copy( res );
					//world.add( sphere );

					var label = new THREE.Text( atlasRobotoCondensed );
					label.set( toASCII( capital.name.common ).toUpperCase() );
					label.mesh.position.copy( res );
					label.mesh.lookAt( world.position )
					world.add( label.mesh );
					label.mesh.visible = false;
					capital.label = label;

				} else {
					console.log( id + ' not found')
				}

			})

		} );

	} );

	lineGeometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );

	lineGeometry.computeBoundingSphere();

	var mesh = new THREE.LineSegments( lineGeometry, material );
	mesh.fustrumCulled = false;
	world.add( mesh );

	/*var exporter = new THREE.OBJExporter();
	var result = exporter.parse( scene );

	var blobModel = new Blob( [ result ], { type: 'text/plain' } );
	var url = URL.createObjectURL( blobModel );

	window.location = url;*/

	var geometry = new THREE.IcosahedronGeometry( 5, 6 );

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
		wireframe: !true,
		depthWrite: false,
		side: THREE.DoubleSide
	} );

	earthMesh = new THREE.Mesh( geometry, material );
	earthMesh.scale.x = -1
	world.add( earthMesh );

}

function hashCamera() {

	return `${camera.position.x}|${camera.position.y}|${camera.position.z}|${camera.rotation.x}|${camera.rotation.y}|${camera.rotation.z}`

}

function hitTest( obj ) {

	let res = null;

	performance.mark( 'start' );

	hitCamera.position.copy( obj.position );
	hitCamera.rotation.copy( obj.rotation );

	renderer.render( hitScene, hitCamera, hitTexture );

	renderer.readRenderTargetPixels( hitTexture, 0, 0, 1, 1, pixelBuffer );

	if( pixelBuffer[ 3 ] === 255 ) {
		if( pixelBuffer[ 0 ] === 255 ) {
			res = codes.get( pixelBuffer[ 2 ] )
			console.log( hoveredCountry );
		}
	}

	performance.mark( 'end' );
	performance.measure( 'readpixels', 'start', 'end' );

	return res;

}

function render( timestamp ) {

	controller1.update();
	controller2.update();

	controls.update();

	var time = performance.now();
	var dt = ( time - previousTime ) / 1000000;

	fade = nFade + (fade - nFade) * ( Math.pow( .02, 90 * dt ) );

	var t = performance.now();
	linesObject.children.forEach( l => {
		l.material.uniforms.time.value = t;
		l.material.uniforms.fade.value = fade;
	} );

	effect.render( scene, camera );

	intersectObjects( controller1 );
	intersectObjects( controller2 );

	fboHelper.update();

	effect.requestAnimationFrame( render );

	previousTime = time;

}

function onWindowResize() {

	effect.setSize( container.clientWidth, container.clientHeight );
	camera.aspect = container.clientWidth / container.clientHeight;
	camera.updateProjectionMatrix();

	fboHelper.setSize( container.clientWidth, container.clientHeight );
	hitTexture.setSize( 1, 1 );
	fboHelper.refreshFBO( hitTexture );

}

window.addEventListener( 'load', init );
