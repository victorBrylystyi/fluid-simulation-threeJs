import {ConfigType, Effect} from "@evenstar/fluid";
import { Camera, Mesh, Scene, Vector2, WebGLRenderer } from "three";
import { EffectComposer } from "three-stdlib";
import { OutputPass, RenderPass, UnrealBloomPass } from "three/examples/jsm/Addons.js";

export class Demo {
    // =============== Effect configuration options ===============
    config: ConfigType = {
        SIM_RESOLUTION: 256,
        DYE_RESOLUTION: 1024,
        CAPTURE_RESOLUTION: 512,
        DENSITY_DISSIPATION: 1,
        VELOCITY_DISSIPATION: 0.2,
        PRESSURE: 0.8,
        PRESSURE_ITERATIONS: 20,
        CURL: 30,
        SPLAT_RADIUS: 0.5,
        SPLAT_FORCE: 6000,
        SHADING: true,
        COLORFUL: true,
        COLOR_UPDATE_SPEED: 10,
        PAUSED: false,
        EVENT_PERMISSION: false,
        BACK_COLOR: { r: 0, g: 0, b: 0 },
        TRANSPARENT: false,
        BLOOM: true,
        BLOOM_ITERATIONS: 8,
        BLOOM_RESOLUTION: 256,
        BLOOM_INTENSITY: 0.8,
        BLOOM_THRESHOLD: 0.6,
        BLOOM_SOFT_KNEE: 0.7,
        SUNRAYS: true,
        SUNRAYS_RESOLUTION: 196,
        SUNRAYS_WEIGHT: 1.0,
    };
    rootElement: HTMLDivElement;
    canvas = document.createElement('canvas');
    renderer = new WebGLRenderer({ 
        canvas: this.canvas, 
        antialias: false, 
        alpha: false
    });
    scene = new Scene();
    effect!:Effect;
    processId = 0;
    lastUpdateTime = 0;
    composer = new EffectComposer(this.renderer);
    bloomPass!: UnrealBloomPass;
    
    resizeDemo = () => {
        this.resize();
    };

    constructor(rootElement: HTMLDivElement) {
        this.rootElement = rootElement;
    }
    mount(){
        this.rootElement.appendChild(this.canvas);
        window.addEventListener('resize', this.resizeDemo);
    }
    unmount(){
        window.removeEventListener('resize', this.resizeDemo);
        this.effect.unmount();

        this.scene.traverse(obj => {
            if (obj instanceof Mesh){
                obj.geometry.dispose();
                obj.material.dispose();
            }
        });

        while(this.scene.children.length > 0){ 
            this.scene.remove(this.scene.children[0]); 
        }

        this.renderer.dispose();
        this.rootElement.removeChild(this.canvas);
    }
    addPostProcessingPasses(scene: Scene, camera: Camera){
        this.bloomPass = new UnrealBloomPass(
            new Vector2(this.rootElement.clientWidth, this.rootElement.clientHeight),
            1,0.2,1
        );
        this.composer.addPass(new RenderPass(scene, camera));

        this.composer.addPass(this.bloomPass);
        this.composer.addPass(new OutputPass());
    }
    resize(){        
        const w = this.rootElement.clientWidth;
        const h = this.rootElement.clientHeight;
        const aspect = w / h;

        this.bloomPass.resolution.set(w, h);
        this.renderer.setSize(w, h, true);
        this.composer.setSize(w, h);

        return { w, h, aspect };
    }
    startAnimation(){}
    stopAnimation(){}
    update(){}
    render(dt: number){}
}