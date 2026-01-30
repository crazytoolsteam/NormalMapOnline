import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

class Renderer3D {
    constructor(canvas) {
        console.log('[Renderer3D] Initializing with Three.js...');
        this.canvas = canvas;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.mesh = null;
        this.material = null;

        this.geometries = {};
        this.textureLoader = new THREE.TextureLoader();
        this.rgbeLoader = new RGBELoader();

        this.maps = {
            diffuse: null,
            normal: null,
            height: null,
            metallic: null,
            roughness: null,
            ao: null
        };

        this.uvRepeat = new THREE.Vector2(1, 1);

        this.init();
        this.animate();
    }

    init() {
        // 1. Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x333333);

        // 2. Camera
        const fov = 45;
        const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        const near = 0.1;
        const far = 100;
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.camera.position.set(0, 1.5, 3);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // 4. Controls
        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // 5. Material
        this.material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        // 6. State
        this.currentMeshType = 'sphere';
        this.subdivisionLevel = 128; // Default higher for better displacement

        // 7. Initial Mesh
        this.setMesh('sphere');

        // 8. Lighting (Fallback if HDR fails or initially)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(5, 5, 5);
        this.scene.add(dirLight);

        // 9. Initial Environment
        this.setEnvironment('hdr01');

        // 10. Resize Observer
        const resizeObserver = new ResizeObserver(() => {
            this.resize();
        });
        resizeObserver.observe(this.canvas);

        // 11. HDR Rotation via Right-Click Drag
        this.controls.enablePan = false; // Disable default pan
        this.envRotation = 0;
        this.isRightDragging = false;
        this.lastMouseX = 0;

        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 2) { // Right button
                this.isRightDragging = true;
                this.lastMouseX = e.clientX;
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isRightDragging) {
                const deltaX = e.clientX - this.lastMouseX;
                this.lastMouseX = e.clientX;
                this.envRotation += deltaX * 0.005; // Sensitivity
                this.updateEnvRotation();
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 2) {
                this.isRightDragging = false;
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isRightDragging = false;
        });

        // Prevent context menu on right-click
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    updateEnvRotation() {
        if (this.scene.background && this.scene.background.isTexture) {
            // We rotate by changing scene.backgroundRotation (Three.js r152+)
            // Or manually update texture offset/rotation for equirectangular maps
            this.scene.backgroundRotation.y = this.envRotation;
            this.scene.environmentRotation.y = this.envRotation;
        }
    }

    setMesh(type) {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
        }

        this.currentMeshType = type;
        let geometry;
        const seg = this.subdivisionLevel;

        switch (type) {
            case 'sphere':
                geometry = new THREE.SphereGeometry(1, seg, seg);
                break;
            case 'cube':
                geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5, seg, seg, seg);
                break;
            case 'plane':
                geometry = new THREE.PlaneGeometry(2, 2, seg, seg);
                geometry.rotateX(-Math.PI / 2); // Lay flat
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(1, 1, 2, seg, seg);
                break;
            default:
                geometry = new THREE.SphereGeometry(1, seg, seg);
        }

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.scene.add(this.mesh);
    }

    setSubdivision(level) {
        this.subdivisionLevel = parseInt(level);
        this.setMesh(this.currentMeshType);
    }

    setEnvironment(hdrName) {
        if (hdrName === 'custom') return; // Handled by loadCustomHDR

        const path = `public/hdr/${hdrName}.hdr`;
        console.log(`[Renderer3D] Loading environment: ${path}`);

        this.rgbeLoader.load(path, (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.environment = texture;
            this.scene.background = texture;
            console.log('[Renderer3D] Environment loaded');
        }, undefined, (err) => {
            console.error('[Renderer3D] Failed to load environment:', err);
        });
    }

    loadCustomHDR(file) {
        console.log('[Renderer3D] Loading custom HDR:', file.name);

        // Create blob URL and load via standard loader
        const blobUrl = URL.createObjectURL(file);

        this.rgbeLoader.load(blobUrl, (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.environment = texture;
            this.scene.background = texture;
            console.log('[Renderer3D] Custom HDR loaded successfully');

            // Clean up blob URL
            URL.revokeObjectURL(blobUrl);
        }, undefined, (err) => {
            console.error('[Renderer3D] Failed to load custom HDR:', err);
            URL.revokeObjectURL(blobUrl);
        });
    }

    setMaterial(type, canvas) {
        console.log(`[Renderer3D] Setting material map: ${type}`);

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = (type === 'diffuse') ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.copy(this.uvRepeat);

        // Update material
        switch (type) {
            case 'diffuse':
                this.material.map = texture;
                this.material.needsUpdate = true;
                break;
            case 'normal':
                this.material.normalMap = texture;
                this.material.normalScale.set(1, 1); // Can be adjusted
                this.material.needsUpdate = true;
                break;
            case 'height':
                this.material.displacementMap = texture;
                this.material.needsUpdate = true;
                break;
            case 'metallic':
                this.material.metalnessMap = texture;
                this.material.metalness = 1.0; // Needs to be 1 to let map control it
                this.material.needsUpdate = true;
                break;
            case 'roughness':
                this.material.roughnessMap = texture;
                this.material.roughness = 1.0; // Needs to be 1 to let map control it
                this.material.needsUpdate = true;
                break;
            case 'ao':
                this.material.aoMap = texture;
                this.material.aoMapIntensity = 1.0;
                this.material.needsUpdate = true;
                break;
            case 'combined':
                // ORM map: R=AO, G=Roughness, B=Metalness
                // Three.js StandardMaterial reads these channels automatically from these maps
                this.material.aoMap = texture;
                this.material.roughnessMap = texture;
                this.material.metalnessMap = texture;

                this.material.aoMapIntensity = 1.0;
                this.material.roughness = 1.0;
                this.material.metalness = 1.0;

                this.material.needsUpdate = true;
                break;
        }
    }

    resetMaterial() {
        console.log('[Renderer3D] Resetting material to default');
        // Reset material properties
        this.material.map = null;
        this.material.normalMap = null;
        this.material.displacementMap = null;
        this.material.metalnessMap = null;
        this.material.roughnessMap = null;
        this.material.aoMap = null;

        this.material.color.setHex(0xffffff);
        this.material.roughness = 0.5;
        this.material.metalness = 0.0;
        this.material.normalScale.set(1, 1);
        this.material.displacementScale = 0;
        this.material.aoMapIntensity = 1.0;

        // Reset UV
        this.uvRepeat.set(1, 1);

        this.material.needsUpdate = true;
    }

    setUVRepeat(u, v) {
        this.uvRepeat.set(u, v);

        if (!this.material) return;

        ['map', 'normalMap', 'displacementMap', 'metalnessMap', 'roughnessMap', 'aoMap'].forEach(mapName => {
            if (this.material[mapName]) {
                this.material[mapName].repeat.copy(this.uvRepeat);
                this.material[mapName].needsUpdate = true;
            }
        });

        this.material.needsUpdate = true;
    }

    setDisplacementScale(scale) {
        if (this.material) {
            this.material.displacementScale = scale;
            this.material.needsUpdate = true;
        }
    }

    resize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.renderer.setSize(width, height, false);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.controls) {
            this.controls.update();
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Expose to window for app.js
window.Renderer3D = Renderer3D;
