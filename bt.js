import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.querySelector("#universe");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#05080d");

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 400);
const overviewPosition = new THREE.Vector3(0, 10, 32);
camera.position.copy(overviewPosition);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.18;
controls.minDistance = 2.2;
controls.maxDistance = 65;

const solarSystem = new THREE.Group();
scene.add(solarSystem);
scene.add(new THREE.HemisphereLight(0x9bbcd1, 0x17131a, 1.1));

function makeCanvasTexture(width, height, draw) {
	const source = document.createElement("canvas");
	source.width = width;
	source.height = height;
	draw(source.getContext("2d"));
	const texture = new THREE.CanvasTexture(source);
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
}

function addStarField(count) {
	const positions = new Float32Array(count * 3);
	const colors = new Float32Array(count * 3);
	const colorChoices = ["#d7eaff", "#ffe4bd", "#b4ded9", "#ffffff"].map(color => new THREE.Color(color));

	for (let i = 0; i < count; i++) {
		const radius = 90 + Math.random() * 190;
		const theta = Math.random() * Math.PI * 2;
		const vertical = Math.random() * 2 - 1;
		const spread = Math.sqrt(1 - vertical * vertical);
		const index = i * 3;
		positions[index] = radius * spread * Math.cos(theta);
		positions[index + 1] = radius * vertical;
		positions[index + 2] = radius * spread * Math.sin(theta);
		const color = colorChoices[Math.floor(Math.random() * colorChoices.length)];
		colors[index] = color.r;
		colors[index + 1] = color.g;
		colors[index + 2] = color.b;
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
	scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({
		vertexColors: true,
		size: 0.8,
		sizeAttenuation: true,
		transparent: true,
		opacity: 0.85,
		depthWrite: false
	})));
}

function makeEarthTexture() {
	return makeCanvasTexture(512, 256, context => {
		const ocean = context.createLinearGradient(0, 0, 0, 256);
		ocean.addColorStop(0, "#2d8ca8");
		ocean.addColorStop(0.5, "#13557b");
		ocean.addColorStop(1, "#1a456d");
		context.fillStyle = ocean;
		context.fillRect(0, 0, 512, 256);
		context.fillStyle = "#76b96f";
		const continents = [
			[[56, 55], [78, 39], [106, 44], [123, 57], [113, 76], [94, 82], [88, 104], [71, 97], [64, 78]],
			[[111, 112], [130, 122], [137, 148], [128, 174], [119, 199], [108, 182], [103, 154]],
			[[225, 55], [249, 44], [273, 48], [291, 62], [312, 57], [336, 68], [361, 64], [389, 78], [374, 95], [347, 91], [331, 108], [303, 105], [283, 119], [266, 107], [245, 113], [227, 96]],
			[[254, 116], [277, 124], [286, 148], [276, 172], [265, 198], [251, 180], [246, 151]],
			[[399, 165], [421, 155], [444, 164], [454, 183], [439, 199], [416, 195], [403, 182]]
		];
		continents.forEach(points => {
			context.beginPath();
			points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
			context.closePath();
			context.fill();
		});
		context.fillStyle = "rgba(238, 247, 218, .42)";
		context.fillRect(0, 0, 512, 12);
		context.fillRect(0, 244, 512, 12);
	});
}

function makeMoonTexture() {
	return makeCanvasTexture(256, 128, context => {
		context.fillStyle = "#aaa69b";
		context.fillRect(0, 0, 256, 128);
		for (let i = 0; i < 110; i++) {
			const radius = 1 + Math.random() * 7;
			context.fillStyle = `rgba(54, 52, 49, ${0.08 + Math.random() * 0.2})`;
			context.beginPath();
			context.arc(Math.random() * 256, Math.random() * 128, radius, 0, Math.PI * 2);
			context.fill();
		}
	});
}

function makeBandTexture(baseColor, stripeColor) {
	return makeCanvasTexture(256, 128, context => {
		context.fillStyle = baseColor;
		context.fillRect(0, 0, 256, 128);
		for (let i = 0; i < 16; i++) {
			context.fillStyle = i % 2 ? stripeColor : "rgba(255,255,255,.12)";
			context.fillRect(0, i * 9, 256, 3 + Math.random() * 5);
		}
	});
}

function makeLabel(text, width = 2.2) {
	const texture = makeCanvasTexture(512, 96, context => {
		context.font = "600 42px Trebuchet MS, sans-serif";
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.shadowColor = "rgba(123, 205, 230, .85)";
		context.shadowBlur = 16;
		context.fillStyle = "#f2f1e9";
		context.fillText(text, 256, 48);
	});
	const label = new THREE.Sprite(new THREE.SpriteMaterial({
		map: texture,
		transparent: true,
		depthTest: false
	}));
	label.scale.set(width, width * 0.19, 1);
	return label;
}

function addOrbit(radius) {
	const points = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2).getPoints(180);
	const geometry = new THREE.BufferGeometry().setFromPoints(
		points.map(point => new THREE.Vector3(point.x, 0, point.y))
	);
	solarSystem.add(new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({
		color: 0xb5c3c7,
		transparent: true,
		opacity: 0.22
	})));
}

const sun = new THREE.Mesh(
	new THREE.SphereGeometry(0.92, 48, 40),
	new THREE.MeshBasicMaterial({ color: 0xffd77c })
);
solarSystem.add(sun);
solarSystem.add(new THREE.PointLight(0xffd49a, 170, 52, 1.25));

const solarGlow = new THREE.Sprite(new THREE.SpriteMaterial({
	map: makeCanvasTexture(128, 128, context => {
		const glow = context.createRadialGradient(64, 64, 3, 64, 64, 64);
		glow.addColorStop(0, "rgba(255,250,214,1)");
		glow.addColorStop(0.16, "rgba(255,198,91,.78)");
		glow.addColorStop(1, "rgba(255,104,35,0)");
		context.fillStyle = glow;
		context.fillRect(0, 0, 128, 128);
	}),
	transparent: true,
	blending: THREE.AdditiveBlending,
	depthWrite: false
}));
solarGlow.scale.set(6.5, 6.5, 1);
solarSystem.add(solarGlow);
const sunLabel = makeLabel("MẶT TRỜI", 3.2);
sunLabel.position.set(0, 1.65, 0);
solarSystem.add(sunLabel);

const earthTexture = makeEarthTexture();
const moonTexture = makeMoonTexture();
const planetSpecs = [
	{ name: "SAO THỦY", orbit: 2.1, size: 0.16, color: 0xaaa49b, speed: 0.31 },
	{ name: "SAO KIM", orbit: 3.2, size: 0.25, color: 0xd4a56f, speed: 0.23 },
	{ name: "TRÁI ĐẤT", orbit: 4.5, size: 0.32, color: 0xffffff, speed: 0.18, earth: true },
	{ name: "SAO HỎA", orbit: 5.9, size: 0.23, color: 0xc7674e, speed: 0.14 },
	{ name: "SAO MỘC", orbit: 8, size: 0.68, color: 0xd8bd91, speed: 0.09, texture: makeBandTexture("#c9a47c", "#83634e") },
	{ name: "SAO THỔ", orbit: 10.5, size: 0.57, color: 0xd8c28f, speed: 0.067, texture: makeBandTexture("#d0b782", "#9d8059"), rings: true },
	{ name: "SAO THIÊN VƯƠNG", orbit: 13, size: 0.4, color: 0x83d8d5, speed: 0.048 },
	{ name: "SAO HẢI VƯƠNG", orbit: 15.2, size: 0.39, color: 0x5389e6, speed: 0.038 }
];

const movingPlanets = [];
let earthGroup;
let earthOrbit;
planetSpecs.forEach(spec => {
	addOrbit(spec.orbit);
	const orbitPivot = new THREE.Group();
	solarSystem.add(orbitPivot);
	const planetGroup = new THREE.Group();
	planetGroup.position.x = spec.orbit;
	orbitPivot.add(planetGroup);

	const material = spec.earth
		? new THREE.MeshStandardMaterial({ map: earthTexture, roughness: 0.82 })
		: new THREE.MeshStandardMaterial({
			color: spec.color,
			map: spec.texture || null,
			roughness: 0.88
		});
	const planet = new THREE.Mesh(new THREE.SphereGeometry(spec.size, 40, 32), material);
	planetGroup.add(planet);
	const label = makeLabel(spec.name, spec.name.length > 12 ? 4 : 2.6);
	label.position.y = spec.size + 0.42;
	planetGroup.add(label);

	if (spec.rings) {
		const rings = new THREE.Mesh(
			new THREE.RingGeometry(spec.size * 1.35, spec.size * 2.25, 96),
			new THREE.MeshStandardMaterial({
				color: 0xd4bb8d,
				side: THREE.DoubleSide,
				transparent: true,
				opacity: 0.76,
				roughness: 1
			})
		);
		rings.rotation.x = -Math.PI / 2.35;
		planetGroup.add(rings);
	}

	if (spec.earth) {
		earthGroup = planetGroup;
		earthOrbit = orbitPivot;
		const moonOrbit = new THREE.Group();
		moonOrbit.name = "moonOrbit";
		planetGroup.add(moonOrbit);
		const moon = new THREE.Mesh(
			new THREE.SphereGeometry(0.095, 32, 24),
			new THREE.MeshStandardMaterial({ map: moonTexture, roughness: 1 })
		);
		moon.position.set(0.72, 0.04, 0);
		moonOrbit.add(moon);
		const moonLabel = makeLabel("MẶT TRĂNG", 2.8);
		moonLabel.position.set(0.72, 0.33, 0);
		planetGroup.add(moonLabel);
	}

	movingPlanets.push({ orbitPivot, planet, speed: spec.speed });
});

addStarField(2600);

const earthButton = document.querySelector("#earth-view");
const intro = document.querySelector(".intro");
const cameraDestination = overviewPosition.clone();
const lookDestination = new THREE.Vector3();
let focusedEarth = false;
let transitioning = false;

earthButton.addEventListener("click", () => {
	focusedEarth = !focusedEarth;
	transitioning = true;
	controls.autoRotate = !focusedEarth;
	earthButton.textContent = focusedEarth ? "Quay lại toàn hệ" : "Đến Trái Đất";
	intro.textContent = focusedEarth
		? "Trái Đất xanh và Mặt Trăng đang cùng chuyển động quanh Mặt Trời."
		: "Tám hành tinh chuyển động quanh Mặt Trời. Tìm Trái Đất và người bạn đồng hành Mặt Trăng.";

	if (focusedEarth) {
		earthGroup.getWorldPosition(lookDestination);
		cameraDestination.copy(lookDestination).add(new THREE.Vector3(0, 1.35, 4.6));
	} else {
		lookDestination.set(0, 0, 0);
		cameraDestination.copy(overviewPosition);
	}
});

document.querySelector("#reset-view").addEventListener("click", () => {
	focusedEarth = false;
	controls.autoRotate = true;
	earthButton.textContent = "Đến Trái Đất";
	intro.textContent = "Tám hành tinh chuyển động quanh Mặt Trời. Tìm Trái Đất và người bạn đồng hành Mặt Trăng.";
	lookDestination.set(0, 0, 0);
	cameraDestination.copy(overviewPosition);
	transitioning = true;
});

window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
	const delta = Math.min(clock.getDelta(), 0.05);
	if (transitioning) {
		camera.position.lerp(cameraDestination, 1 - Math.exp(-3.2 * delta));
		controls.target.lerp(lookDestination, 1 - Math.exp(-3.2 * delta));
		if (camera.position.distanceTo(cameraDestination) < 0.025 && controls.target.distanceTo(lookDestination) < 0.025) {
			camera.position.copy(cameraDestination);
			controls.target.copy(lookDestination);
			transitioning = false;
		}
	}
	controls.update();
	planetSpecs.forEach((spec, index) => {
		movingPlanets[index].orbitPivot.rotation.y += spec.speed * delta;
		movingPlanets[index].planet.rotation.y += delta * 0.35;
	});
	const moonOrbit = earthGroup.getObjectByName("moonOrbit");
	moonOrbit.rotation.y += delta * 1.2;
	renderer.render(scene, camera);
});
