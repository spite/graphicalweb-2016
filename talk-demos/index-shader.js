
function init() {

	initScene();
	render();

}

var renderer, camera, controls, scene, box;
var points;

function initScene() {

	renderer = new THREE.WebGLRenderer( { antialias: true });
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setClearColor( 0x202020, 1 );
	document.body.appendChild( renderer.domElement );

	camera = new THREE.PerspectiveCamera( 50, 1, 1, 1000 );
	camera.position.set( 10, 10, 10 );

	controls = new THREE.OrbitControls( camera );
	controls.damping = 0.2;

	scene = new THREE.Scene();

	var geometry = new THREE.PlaneBufferGeometry( 1, 1, 2, 2 );

	var colors = new Float32Array( geometry.attributes.position.count * 3 );
	for( var j = 0; j < geometry.attributes.position.count * 3; j++ ) {
		colors[ j ] = Math.random();
	}
	for( var j = 2; j < geometry.attributes.position.count * 3; j += 3 ) {
		geometry.attributes.position.array[ j ] = .4 * Math.random();
	}
	geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );

	box = new THREE.Mesh(
		geometry,
		new THREE.RawShaderMaterial({
			vertexShader: document.getElementById( 'shader-vs' ).textContent,
			fragmentShader: document.getElementById( 'shader-fs' ).textContent,
			side: THREE.DoubleSide,
			wireframe: true
		})
	);
	box.rotation.x = Math.PI / 2;
	scene.add( box );

	window.addEventListener( 'dblclick', function() {
		box.material.wireframe = !box.material.wireframe;
	});

	window.addEventListener( 'resize', onWindowResize );

	onWindowResize();

}

function onWindowResize() {

	renderer.setSize( window.innerWidth, window.innerHeight );
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

}

function render() {

	requestAnimationFrame( render );

	renderer.render( scene, camera );

}

window.addEventListener( 'load', init );
