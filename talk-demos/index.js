function loadFile( fileName ) {

	return fetch( fileName )
		.then( res => res.text() )
		.then( csv => parseCSV( csv ) )

}

function parseCSV( csvString ) {

	return CSVToArray( csvString, ',' );

}

function turnToStructure( data ) {

	return data.map( entry => {
		return {
			name: entry[ 6 ],
			latitude: parseFloat( entry[ 7 ] ),
			longitude: parseFloat( entry[ 8 ] ),
			position: null
		}
	});

}

function filterData( data ) {

	data.splice( 0, 1 );
	return data.filter( e => e[ 6 ] !== null && e.length === 9 );

}

function searchName( name ) {

	return entries.filter( item => item.name === name );

}

function searchPartialName( name ) {

	const regex = new RegExp( name, 'gmi' );

	return entries.filter( item => item.name.match( regex ) );

}

const worldRadius = 10;

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

function locateEntries( ) {

	entries.forEach( entry => {
		entry.position = latLngToVec3( entry.latitude, entry.longitude )
	});

}

var entries = [];

function init() {

	loadFile( 'data/worldcities.csv' )
		.then( res => filterData( res ) )
		.then( res => turnToStructure( res ) )
		.then( res => entries = res )
		.then( _ => locateEntries() )
		.then( _ => initScene() )
		.then( _ => initPointScene() )
		.then( _ => initLineScene() )
		.then( _ => initCubesScene() )
		.then( _ => render() );

}

var renderer, camera, controls, scene, box;
var points;

function initScene() {

	renderer = new THREE.WebGLRenderer( { antialias: true });
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setClearColor( 0x202020, 1 );
	document.body.appendChild( renderer.domElement );

	camera = new THREE.PerspectiveCamera( 50, 1, 1, 1000 );
	camera.position.z = -100;

	controls = new THREE.OrbitControls( camera );
	controls.damping = 0.2;

	scene = new THREE.Scene();

	box = new THREE.Mesh(
		new THREE.BoxGeometry( 10, 10, 10 ),
		new THREE.MeshNormalMaterial()
	);
	//scene.add( box );

	window.addEventListener( 'resize', onWindowResize );

	onWindowResize();

}

function initPointScene() {

	const pointsGeometry = new THREE.BufferGeometry();
	const positions = new Float32Array( entries.length * 3 );

	entries.forEach( ( entry, i ) => {
		positions[ i * 3 ] = entry.position.x;
		positions[ i * 3 + 1 ] = entry.position.y;
		positions[ i * 3 + 2 ] = entry.position.z;
	});

	pointsGeometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
	pointsGeometry.computeBoundingSphere();

	const pointsMaterial = new THREE.PointsMaterial({
		size: .01,
		sizeAttenuation: true
	});

	let pointsMesh = new THREE.PointCloud(
		pointsGeometry,
		pointsMaterial
	);

	pointsMesh.visible = false;
	window.points = pointsMesh;

	scene.add( pointsMesh );

}

function initLineScene() {

	const linesGeometry = new THREE.BufferGeometry();
	const positions = new Float32Array( entries.length * 2 * 3 );

	const tmp = new THREE.Vector3();
	entries.forEach( ( entry, i ) => {
		positions[ i * 6 ] = entry.position.x;
		positions[ i * 6 + 1 ] = entry.position.y;
		positions[ i * 6 + 2 ] = entry.position.z;
		tmp.copy( entry.position ).multiplyScalar( 1 + entry.name.length * .01 );
		positions[ i * 6 + 3 ] = tmp.x;
		positions[ i * 6 + 4 ] = tmp.y;
		positions[ i * 6 + 5 ] = tmp.z;
	});

	linesGeometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
	linesGeometry.computeBoundingSphere();

	const linesMaterial = new THREE.LineBasicMaterial();

	let linesMesh = new THREE.LineSegments(
		linesGeometry,
		linesMaterial
	);

	linesMesh.visible = false;
	window.lines = linesMesh;

	scene.add( linesMesh );

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

function initCubesScene() {

	const cube = new THREE.BoxGeometry( .01, .01, .01 );
	const cubeGeometry = new THREE.BoxBufferGeometry().fromGeometry( cube );

	const cubesGeometry = new THREE.BufferGeometry();
	const length = cubeGeometry.attributes.position.array.length;
	const positions = new Float32Array( entries.length * length );
	const normals = new Float32Array( entries.length * length );

	const tmp = new THREE.Vector3();
	const mat = new THREE.Matrix4();
	const rotationMat = new THREE.Matrix4();
	const up = new THREE.Vector3( 0, 1, 0 );

	entries.forEach( ( entry, i ) => {

		var geometry = cubeGeometry.clone();

		tmp.copy( entry.position ).multiplyScalar( 1 + entry.name.length * .01 );
		mat.identity().makeTranslation( tmp.x, tmp.y, tmp.z );
		rotationMat.lookAt( entry.position, scene.position, up );
		mat.multiply( rotationMat );
		geometry.applyMatrix( mat );

		memcpy( geometry.attributes.position.array, 0, positions, i * length, length );
		memcpy( geometry.attributes.normal.array, 0, normals, i * length, length );

	});

	cubesGeometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
	cubesGeometry.addAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );

	cubesGeometry.computeBoundingSphere();

	const cubesMaterial = new THREE.MeshNormalMaterial();

	let cubesMesh = new THREE.Mesh(
		cubesGeometry,
		cubesMaterial
	);

	cubesMesh.visible = false;
	window.cubes = cubesMesh;

	scene.add( cubesMesh );

}

function onWindowResize() {

	renderer.setSize( window.innerWidth, window.innerHeight );
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

}

function render() {

	requestAnimationFrame( render );

	box.rotation.y = .0001 * performance.now()
	renderer.render( scene, camera );

}

window.addEventListener( 'load', init );
