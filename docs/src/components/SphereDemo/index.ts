import { Layers, Mesh, PerspectiveCamera, PMREMGenerator, Scene, ShaderMaterial, SphereGeometry, Texture, Uniform, Vector2Tuple } from "three";
import { OrbitControls, RGBELoader } from 'three-stdlib';
import { Demo } from "../Demo/Demo";
import {Effect} from "@evenstar/fluid";

const BLOOM_SCENE = 1;

const bloomLayer = new Layers();
bloomLayer.set( BLOOM_SCENE );


export class SphereDemo extends Demo {

    camera!: PerspectiveCamera;

    effectMesh = new Mesh();
    sphereMesh = new Mesh();
    cameraControls!: OrbitControls;

    envTexture!: Texture;

    constructor(rootElement: HTMLDivElement, mountStats: boolean) {
        super(rootElement, mountStats);
        this.rootElement = rootElement;
        this.effect = new Effect(this.renderer, this.config);
        this.effect.setAspect(2);
        this.preLoad();
    }

    preLoad() {
        new RGBELoader().load('/assets/kiara_1_dawn_1k.hdr', (texture) => {

            const generator = new PMREMGenerator(this.renderer);
            this.envTexture = generator.fromEquirectangular(texture).texture;

            generator.dispose();
            texture.dispose();

            // this.scene.background = this.envTexture;

            this.mount();
            this.resizeDemo();
            this.startAnimation();
        });
    }

    mount() {
        super.mount();

        const aspect = this.rootElement.clientWidth / this.rootElement.clientHeight; 

        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.rootElement.clientWidth, this.rootElement.clientHeight, true);

        this.camera = new PerspectiveCamera( 70, aspect, 0.01, 10 );
        this.camera.position.set(0, 0, 0.6);

        this.cameraControls = new OrbitControls(this.camera, this.canvas);
        this.cameraControls.enableDamping = true;
        this.cameraControls.autoRotate = false;
        this.cameraControls.update();

        const width = 3 * Math.max( 256, 16 * 7 ); // 256 - PMREMGenerator._cubeSize
		const height = 4 * 256; // 256 - PMREMGenerator._cubeSize

        const effectMeshGeometry = new SphereGeometry(0.2, 64, 64);
        const effectMeshMaterial = new ShaderMaterial({
            transparent: true,
            defines:{
              ENVMAP_TYPE_CUBE_UV: true, 
              CUBEUV_MAX_MIP: '8.0', // PMREMGenerator._loadMax
              CUBEUV_TEXEL_WIDTH: 1 / width,
              CUBEUV_TEXEL_HEIGHT: 1 / height,
            },
            uniforms:{
                effectMap: new Uniform(this.effect.texture),
                enVMap2: new Uniform(this.envTexture),
                fresnelPower: new Uniform(1.5),
                backgroundBlurriness: new Uniform(0.0)
            },
            vertexShader:/* glsl */`

                precision highp float;
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vEyeVector;
                varying vec3 vPos;

                void main () {
                    vec4 worldPos = modelMatrix * vec4(position, 1.0);

                    vUv = uv * 2.0;
                    vNormal = normalize(modelMatrix * vec4(normal, 0.0)).xyz;
                    vEyeVector = normalize(worldPos.xyz - cameraPosition);
                    vPos = worldPos.xyz;

                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                } 
            `,
            fragmentShader:/* glsl */`

                precision highp float;
                #include <cube_uv_reflection_fragment>

                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vEyeVector;
                varying vec3 vPos;

                uniform float fresnelPower;
                uniform float backgroundBlurriness;

                uniform sampler2D effectMap;
                uniform sampler2D enVMap2;

                // Indices of refraction
                const float Air = 1.0;
                const float Glass = 1.51714;
                // const float Glass = 1.0;

                // Air to glass ratio of the indices of refraction (Eta)
                const float Eta = Air / Glass;
                const float EtaDelta = 1.0 - Eta;
                
                // see http://en.wikipedia.org/wiki/Refractive_index Reflectivity
                const float R0 = ((Air - Glass) * (Air - Glass)) / ((Air + Glass) * (Air + Glass));
    
                void main () {

                    vec3 v_refraction = refract(vEyeVector, vNormal, Eta);
                    vec3 v_reflection = reflect(vEyeVector, vNormal);

                    // custom repeat mirror uv
                    vec2 uv = vUv;

                    if (uv.x > 1.0) {
                        uv.x = 2.0 - uv.x;
                    }

                    if (uv.y > 1.0) {
                        uv.y = 2.0 - uv.y;
                    }

                    vec4 refractColor = texture2D(effectMap, uv);
                    refractColor.a = max(refractColor.r, max(refractColor.g, refractColor.b));
                
                    vec4 reflectColor = linearToOutputTexel(textureCubeUV(enVMap2, v_reflection, backgroundBlurriness));

                    float v_fresnel = clamp(1.0 - dot(-vEyeVector, vNormal), 0., 1.);
                    // see http://en.wikipedia.org/wiki/Schlick%27s_approximation
                    float v_fresnel_ratio = (R0 + ((1.0 - R0) * pow(v_fresnel, fresnelPower)));

                    vec4 color = mix(refractColor, reflectColor, v_fresnel_ratio);

                    gl_FragColor = color;
                }               
            `
        });

        this.effectMesh = new Mesh(effectMeshGeometry, effectMeshMaterial);
        this.effectMesh.layers.enable(BLOOM_SCENE);
        this.scene.add(this.effectMesh);
        this.addPostProcessingPasses(this.scene, this.camera);

    }

    unmount() {
        // dispose of all the things
        super.unmount();
    }

    animate(dt: number = 0) {
        this.stats.begin();
        this.render(dt);
        this.stats.end();
        this.processId = requestAnimationFrame((dt)=>{
            this.animate(dt);
        });
    }

    private getVelocity (dt: number): Vector2Tuple{
        // return [
        //     ((Math.random() * 2) - 1) * 25,
        //     ((Math.random() * 2) - 1) * 25,
        // ];
        // return [
        //     ((Math.sin(x) * 2) - 1) * 5,
        //     ((Math.cos(x) * 2) - 1) * 5,
        // ];
        return [
            Math.sin(dt) * 10,
            Math.cos(dt) * 10,
        ];
    }

    private calcDeltaTime () {
        const now = performance.now();
        const dt = Math.min(((now - this.lastUpdateTime) / 1000), 0.016666);
        this.lastUpdateTime = now;
        return dt;
    }

    render(dt: number) {
        const time = dt / 5000;
        // console.log(time);
        this.effect.addSplat({
            r: 0.0,
            g: 1.0,
            b: 0.0
        }, [0.5, 0.5], this.getVelocity(time));

        this.effect.addSplat({
            r: 1.0,
            g: 0.0,
            b: 0.0
        }, [0.25, 0.25], this.getVelocity(time));

        this.effect.addSplat({
            r: 0.0,
            g: 0.0,
            b: 1.0
        }, [0.75, 0.75], this.getVelocity(time));

        // this.effect.texture.wrapS = MirroredRepeatWrapping;
        // this.effect.texture.wrapT = MirroredRepeatWrapping;
        (this.effectMesh.material as ShaderMaterial).uniforms.effectMap.value = this.effect.texture;
      
        this.effect.update(this.calcDeltaTime());
        this.cameraControls.update();

        // this.renderer.render(this.scene, this.camera);
        this.composer.render();
    }

    startAnimation() {
        this.animate();
    }

    stopAnimation() {
        cancelAnimationFrame(this.processId);
    }

    resize() {

        const { w, h, aspect } = super.resize();

        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();

        return { w, h, aspect };
    }
}