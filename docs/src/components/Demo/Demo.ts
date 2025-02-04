import {Effect} from "@evenstar/fluid";
import { Mesh, Scene, WebGLRenderer } from "three";


export class Demo {
    // =============== Effect configuration options ===============
    config = {
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
    resize(){        
        const w = this.rootElement.clientWidth;
        const h = (w / 16) * 9; //this.rootElement.clientHeight;
        const aspect = w / h;

        this.renderer.setSize(w, h, true);

        return { w, h, aspect };
    }
    startAnimation(){}
    stopAnimation(){}
    update(){}
    render(dt: number){}
}