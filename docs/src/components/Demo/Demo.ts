import {ConfigType, Effect} from "@evenstar/fluid";
import GUI from "lil-gui";
import { Camera, Color, LinearFilter, Mesh, RGBAFormat, Scene, Vector2, WebGLRenderer, WebGLRenderTarget } from "three";
import { EffectComposer } from "three-stdlib";
import { OutputPass, RenderPass, UnrealBloomPass, FXAAShader, ShaderPass } from "three/examples/jsm/Addons.js";
import Stats from 'three/examples/jsm/libs/stats.module.js'

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
        alpha: true
    });
    scene = new Scene();
    stats = new Stats();
    gui!: GUI;
    effect!: Effect;
    processId = 0;
    lastUpdateTime = 0;
    composer!: EffectComposer;
    bloomPass!: UnrealBloomPass;
    fxaaPass!: ShaderPass;

    mountStats = true;

    scrollRoot = (e: Event) => {
        e.preventDefault();
    };
    resizeDemo = () => {
        this.resize();
    };

    constructor(rootElement: HTMLDivElement, mountStats: boolean) {
        this.rootElement = rootElement;
        this.mountStats = mountStats;

        this.canvas.style.touchAction = 'none';
        this.composer = new EffectComposer(this.renderer);
    }
    mount(){
        this.rootElement.appendChild(this.canvas);
        window.addEventListener('resize', this.resizeDemo);

        if (this.mountStats){
            this.stats.dom.style.position = 'absolute';
            this.stats.dom.style.userSelect = 'none';
            this.rootElement.appendChild(this.stats.dom);

            this.gui = new GUI({
                container: this.rootElement,
                width: 200,
            });
            this.gui.domElement.style.position = 'absolute';
            this.gui.domElement.style.top = '0';
            this.gui.domElement.style.right = '0';
            this.initGUI();
        }

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
            1,0.2,0.4
        );
        this.bloomPass.renderToScreen = false;
        const pixelRatio = this.renderer.getPixelRatio();
        this.fxaaPass = new ShaderPass(FXAAShader);

        this.fxaaPass.material.uniforms[ 'resolution' ].value.x = 1 / ( this.rootElement.offsetWidth * pixelRatio );
        this.fxaaPass.material.uniforms[ 'resolution' ].value.y = 1 / ( this.rootElement.offsetHeight * pixelRatio );

        this.composer.addPass(new RenderPass(scene, camera));
        this.composer.addPass(this.bloomPass);
        this.composer.addPass(new OutputPass());
        this.composer.addPass(this.fxaaPass);

    }
    resize(){        
        const w = this.rootElement.clientWidth;
        const h = this.rootElement.clientHeight;
        const aspect = w / h;

        const pixelRatio = this.renderer.getPixelRatio();
        this.fxaaPass.material.uniforms[ 'resolution' ].value.x = 1 / ( this.rootElement.offsetWidth * pixelRatio );
        this.fxaaPass.material.uniforms[ 'resolution' ].value.y = 1 / ( this.rootElement.offsetHeight * pixelRatio );

        this.bloomPass.resolution.set(w, h);
        this.renderer.setSize(w, h, true);
        this.composer.setSize(w, h);

        return { w, h, aspect };
    }
    private initGUI () {
        this.gui.add(this.config, 
            'DYE_RESOLUTION', { 'high': 1024, 'medium': 512, 'low': 256, 'very low': 128 })
            .name('quality')
            .onFinishChange(() => {
                this.effect.initRenderTargets();
            }
        );
        this.gui.add(this.config, 
            'SIM_RESOLUTION', { '32': 32, '64': 64, '128': 128, '256': 256 })
            .name('sim resolution')
            .onFinishChange(() => {
                this.effect.initRenderTargets();
            }
        );
        this.gui.add(this.config, 'DENSITY_DISSIPATION', 0, 4.0).name('density diffusion');
        this.gui.add(this.config, 'VELOCITY_DISSIPATION', 0, 4.0).name('velocity diffusion');
        this.gui.add(this.config, 'PRESSURE', 0.0, 1.0).name('pressure');
        this.gui.add(this.config, 'CURL', 0, 50).name('vorticity').step(1);
        this.gui.add(this.config, 'SPLAT_RADIUS', 0.01, 1.0).name('splat radius');
        // this.gui.add(this.config, 'SHADING').name('shading').onFinishChange(() => {
        //     updateKeywords(this.config);
        // });
        // this.gui.add(this.config, 'COLORFUL').name('colorful');
        // this.gui.add(this.config, 'PAUSED').name('paused').listen();

        // this.gui.add({ fun: () => {
        //     // @ts-ignore
        //     this.splatStack.push(parseInt(Math.random() * 20) + 5);
        // } }, 'fun').name('Random splats');

        // const bloomFolder = this.gui.addFolder('Bloom');
        // bloomFolder.add(this.config, 'BLOOM').name('enabled').onFinishChange(() => {
        //     updateKeywords(this.config);
        // });
        // bloomFolder.add(this.config, 'BLOOM_INTENSITY', 0.1, 2.0).name('intensity');
        // bloomFolder.add(this.config, 'BLOOM_THRESHOLD', 0.0, 1.0).name('threshold');

        // const sunraysFolder = this.gui.addFolder('Sunrays');
        // sunraysFolder.add(this.config, 'SUNRAYS').name('enabled').onFinishChange(() => {
        //     updateKeywords(this.config);
        // });
        // sunraysFolder.add(this.config, 'SUNRAYS_WEIGHT', 0.3, 1.0).name('weight');

        // const captureFolder = this.gui.addFolder('Capture');
        // captureFolder.addColor(this.config, 'BACK_COLOR').name('background color');
        // captureFolder.add(this.config, 'TRANSPARENT').name('transparent');
        // captureFolder.add({ fun: captureScreenshot }, 'fun').name('take screenshot');

    }
    startAnimation(){}
    stopAnimation(){}
    update(){}
    render(dt: number){}
}