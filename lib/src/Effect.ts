import { HalfFloatType, LinearFilter, NearestFilter, OrthographicCamera, RGB, RGBAFormat, Vector2, Vector2Tuple, Vector3, WebGLRenderer, WebGLRenderTarget } from "three";
import { CurlPass } from "./passes/CurlPass";
import { VorticityPass } from "./passes/VorticityPass";
import { DivergencePass } from "./passes/DivergencePass";
import { ClearPass } from "./passes/ClearPass";
import { PressurePass } from "./passes/PressurePass";
import { GradienSubtractPass } from "./passes/GradienSubtractPass";
import { generateColor, generatePointerData, wrap } from "./helpers";
// import { ColorPass } from "./passes/ColorPass";
// import { CheckerBoardPass } from "./passes/CheckerBoardPass";
// import { DisplayMaterialPass } from "./passes/DisplayMaterialPass";
import { PointerData } from "./types";
import { SplatPass } from "./passes/SplatPass";
import { DoubleRenderTarget } from "./DoubleRenderTarget";
import { AdvectionPass } from "./passes/AdvectionPass";
// import GUI from "lil-gui";

// =============== Effect configuration options ===============
const config = {
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

const _v2 = new Vector2();
const _v3 = new Vector3();
// const _v4 = new Vector4();

export class Effect {

    private camera = new OrthographicCamera( -1, 1, 1, -1, 0, 1 );

    private dyeRT!: DoubleRenderTarget
    private velocityRT!: DoubleRenderTarget
    private divergenceRT!: WebGLRenderTarget
    private curlRT!: WebGLRenderTarget
    private pressureRT!: DoubleRenderTarget

    private advectionPass = new AdvectionPass();
    private curlPass = new CurlPass();
    private vorticityPass = new VorticityPass();
    private divergencePass = new DivergencePass();
    private clearPass = new ClearPass();
    private pressurePass = new PressurePass();
    private gradienSubtractPass = new GradienSubtractPass();
    // private colorPass = new ColorPass();
    // private checkerBoardPass = new CheckerBoardPass();
    // private displayPass = new DisplayMaterialPass();
    private splatPass = new SplatPass();

    // public readonly gui = new GUI();

    private pointers: PointerData[] = [generatePointerData()];
    private splatStack: number[] =  [];

    private colorUpdateTimer = 0.0;
    
    public readonly supportLinearFiltering: boolean;
    public readonly supportColorBufferFloat: boolean;

    private lastUpdateTime = 0;

    constructor(readonly renderer: WebGLRenderer) {

        this.supportColorBufferFloat = !!this.renderer.extensions.get('EXT_color_buffer_float');
        this.supportLinearFiltering = !!this.renderer.extensions.get('OES_texture_float_linear');

        this.init();

        // this.multipleSplats(Math.round(Math.random() * 20) + 5);

    }

    get texture(){
        return this.dyeRT.read.texture;
    }

    private init(){

        this.initRenderTargets();
        // this.initGUI();

        // const canvas = this.renderer.domElement;

        // canvas.addEventListener('pointerdown', e => {
        //     const posX = scaleByPixelRatio(e.offsetX);
        //     const posY = scaleByPixelRatio(e.offsetY);
        //     let pointer = this.pointers.find(p => p.id == -1);
        //     if (pointer == null)
        //         pointer = generatePointerData();
        //     updatePointerDownData(this.renderer.domElement, pointer, -1, posX, posY);
        // });
        
        // canvas.addEventListener('pointermove', e => {
        //     const pointer = this.pointers[0];
        //     if (!pointer.down) return;
        //     const posX = scaleByPixelRatio(e.offsetX);
        //     const posY = scaleByPixelRatio(e.offsetY);
        //     updatePointerMoveData(this.renderer.domElement, pointer, posX, posY);
        // });
        
        // window.addEventListener('pointerup', () => {
        //     updatePointerUpData(this.pointers[0]);
        // });
    }

    private disposeRTs() {

        if (this.dyeRT != null){
            this.dyeRT.dispose();
        }
        
        if (this.velocityRT != null){
            this.velocityRT.dispose();
        }

        if (this.divergenceRT != null){
            this.divergenceRT.dispose();
        }

        if (this.curlRT != null){
            this.curlRT.dispose();
        }

        if (this.pressureRT != null){
            this.pressureRT.dispose();
        }

    }

    private initRenderTargets(){

        this.disposeRTs();

        const dyeResWidth = config.DYE_RESOLUTION;
        const dyeResHeight = dyeResWidth / 2;

        const simResWidth = config.SIM_RESOLUTION;
        const simResHeight = simResWidth / 2;

        this.dyeRT = new DoubleRenderTarget(dyeResWidth, dyeResHeight, {
            format: RGBAFormat,
            type: HalfFloatType,
            internalFormat: 'RGBA16F',
            depthBuffer: false,
            stencilBuffer: false,
            minFilter: LinearFilter,
            magFilter: LinearFilter
        });

        this.velocityRT = new DoubleRenderTarget(simResWidth, simResHeight, {
            format: RGBAFormat,
            type: HalfFloatType,
            internalFormat: 'RGBA16F',
            depthBuffer: false,
            stencilBuffer: false,
            minFilter: LinearFilter,
            magFilter: LinearFilter
        });

        this.divergenceRT = new WebGLRenderTarget(simResWidth, simResHeight, {
            format: RGBAFormat,
            type: HalfFloatType,
            internalFormat: 'RGBA16F',
            depthBuffer: false,
            stencilBuffer: false,
            minFilter: NearestFilter,
            magFilter: NearestFilter,
        });

        this.curlRT = new WebGLRenderTarget(simResWidth, simResHeight, {
            format: RGBAFormat,
            type: HalfFloatType,
            internalFormat: 'RGBA16F',
            depthBuffer: false,
            stencilBuffer: false,
            minFilter: NearestFilter,
            magFilter: NearestFilter
        });

        this.pressureRT = new DoubleRenderTarget(simResWidth, simResHeight, {
            format: RGBAFormat,
            type: HalfFloatType,
            internalFormat: 'RGBA16F',
            depthBuffer: false,
            stencilBuffer: false,
            minFilter: NearestFilter,
            magFilter: NearestFilter

        });

    }

    // private initGUI () {
    //     this.gui.add(config, 'DYE_RESOLUTION', { 'high': 1024, 'medium': 512, 'low': 256, 'very low': 128 }).name('quality').onFinishChange(() => {
    //         this.initRenderTargets();
    //     });
    //     this.gui.add(config, 'SIM_RESOLUTION', { '32': 32, '64': 64, '128': 128, '256': 256 }).name('sim resolution').onFinishChange(() => {
    //         this.initRenderTargets();
    //     });
    //     this.gui.add(config, 'DENSITY_DISSIPATION', 0, 4.0).name('density diffusion');
    //     this.gui.add(config, 'VELOCITY_DISSIPATION', 0, 4.0).name('velocity diffusion');
    //     this.gui.add(config, 'PRESSURE', 0.0, 1.0).name('pressure');
    //     this.gui.add(config, 'CURL', 0, 50).name('vorticity').step(1);
    //     this.gui.add(config, 'SPLAT_RADIUS', 0.01, 1.0).name('splat radius');
    //     // this.gui.add(config, 'SHADING').name('shading').onFinishChange(() => {
    //     //     updateKeywords(config);
    //     // });
    //     // this.gui.add(config, 'COLORFUL').name('colorful');
    //     // this.gui.add(config, 'PAUSED').name('paused').listen();
    
    //     // this.gui.add({ fun: () => {
    //     //     // @ts-ignore
    //     //     this.splatStack.push(parseInt(Math.random() * 20) + 5);
    //     // } }, 'fun').name('Random splats');
    
    //     // const bloomFolder = this.gui.addFolder('Bloom');
    //     // bloomFolder.add(config, 'BLOOM').name('enabled').onFinishChange(() => {
    //     //     updateKeywords(config);
    //     // });
    //     // bloomFolder.add(config, 'BLOOM_INTENSITY', 0.1, 2.0).name('intensity');
    //     // bloomFolder.add(config, 'BLOOM_THRESHOLD', 0.0, 1.0).name('threshold');
    
    //     // const sunraysFolder = this.gui.addFolder('Sunrays');
    //     // sunraysFolder.add(config, 'SUNRAYS').name('enabled').onFinishChange(() => {
    //     //     updateKeywords(config);
    //     // });
    //     // sunraysFolder.add(config, 'SUNRAYS_WEIGHT', 0.3, 1.0).name('weight');
    
    //     // const captureFolder = this.gui.addFolder('Capture');
    //     // captureFolder.addColor(config, 'BACK_COLOR').name('background color');
    //     // captureFolder.add(config, 'TRANSPARENT').name('transparent');
    //     // captureFolder.add({ fun: captureScreenshot }, 'fun').name('take screenshot');
    
    // }

    public update(dt: number) {

        const deltaT = dt || this.calcDeltaTime();

        this.updateColors(deltaT);

        this.applyInputs();

        if (!config.PAUSED) {
            this.step(deltaT);
        }

        this.renderer.setRenderTarget(null);

        // this.render(null);

    }

    private step(dt: number){

        // ========== RENDER CURL_PASS to CURL_RT ==========
        {
            this.renderer.setRenderTarget(this.curlRT);
            this.curlPass.update({
                texelSize: this.velocityRT.texelSize,
                uVelocity: this.velocityRT.read.texture
            });
            this.renderer.render(this.curlPass.scene, this.camera);
        }


        // ========== RENDER VORTICITY_PASS to VELOCITY_RT ==========
        {
            this.renderer.setRenderTarget(this.velocityRT.write);
            this.vorticityPass.update({
                texelSize: this.velocityRT.texelSize,
                uVelocity: this.velocityRT.read.texture,
                uCurl: this.curlRT.texture,
                dt,
                curl: config.CURL
            });
            this.renderer.render(this.vorticityPass.scene, this.camera);
            this.velocityRT.swap();
        }

        
        // ========== RENDER DIVERGENCE_PASS to DIVERGENCE_RT ==========
        {
            this.renderer.setRenderTarget(this.divergenceRT);
            this.divergencePass.update({
                texelSize: this.velocityRT.texelSize,
                uVelocity: this.velocityRT.read.texture
            });
            this.renderer.render(this.divergencePass.scene, this.camera);
        }


        // ========== RENDER CLEAR_PASS to PRESSURE_RT ==========
        {
            this.renderer.setRenderTarget(this.pressureRT.write);
            this.clearPass.update({
                uTexture: this.pressureRT.read.texture,
                value: config.PRESSURE
            });
            this.renderer.render(this.clearPass.scene, this.camera);
            this.pressureRT.swap();
        }


        // ========== RENDER PRESSURE_PASS to PRESSURE_RT ==========
        {
            this.pressurePass.update({
                texelSize: this.velocityRT.texelSize,
                uDivergence: this.divergenceRT.texture
            });
    
            for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
                this.renderer.setRenderTarget(this.pressureRT.write);
                this.pressurePass.update({
                    uPressure: this.pressureRT.read.texture,
                });
                this.renderer.render(this.pressurePass.scene, this.camera); 
                this.pressureRT.swap();

            }    
        }

        // ========== RENDER GRADIENT_SUBSTRACT_PASS to VELOCITY_RT ==========
        {
            this.renderer.setRenderTarget(this.velocityRT.write);
            this.gradienSubtractPass.update({
                texelSize: this.velocityRT.texelSize,
                uPressure: this.pressureRT.read.texture,
                uVelocity: this.velocityRT.read.texture
            });
            this.renderer.render(this.gradienSubtractPass.scene, this.camera);  
            this.velocityRT.swap();
        }


        // ========== RENDER ADVECTION_PASS to VELOCITY_RT ==========
        {
            this.renderer.setRenderTarget(this.velocityRT.write);
            this.advectionPass.update({
                texelSize: this.velocityRT.texelSize,
                dyeTexelSize: this.velocityRT.texelSize,
                uVelocity: this.velocityRT.read.texture,
                uSource: this.velocityRT.read.texture,
                dt,
                dissipation: config.VELOCITY_DISSIPATION
            });
            this.renderer.render(this.advectionPass.scene, this.camera);
            this.velocityRT.swap();
        }

        // ========== RENDER ADVECTION_PASS to DYE_RT ==========
        {
            this.renderer.setRenderTarget(this.dyeRT.write);
            this.advectionPass.update({
                dyeTexelSize: this.dyeRT.texelSize,
                uVelocity: this.velocityRT.read.texture,
                uSource: this.dyeRT.read.texture,
                dt,
                dissipation: config.DENSITY_DISSIPATION
            });
            this.renderer.render(this.advectionPass.scene, this.camera);
            this.dyeRT.swap();
        }

    }

    // private render(target: WebGLRenderTarget | null){

    //     if (!config.TRANSPARENT){
    //         this.drawColor(target, config.BACK_COLOR);
    //     }

    //     if (target == null && config.TRANSPARENT){
    //         this.drawCheckerboard(target);
    //     }

    //     this.drawDisplay(target);

    // }

    // private drawColor(target: WebGLRenderTarget | null, color: RGB){
    //     this.renderer.setRenderTarget(target);
    //     this.colorPass.update({
    //         color: _v4.set(color.r, color.g, color.b, 1.0)
    //     });
    //     this.renderer.render(this.colorPass.scene, this.camera);
    // }

    // private drawCheckerboard(target: WebGLRenderTarget | null){
    //     this.renderer.setRenderTarget(target);
    //     this.checkerBoardPass.update({
    //         aspectRatio: this.renderer.domElement.width / this.renderer.domElement.height
    //     });
    //     this.renderer.render(this.checkerBoardPass.scene, this.camera);
    // }

    // private drawDisplay(target: WebGLRenderTarget | null){
    //     const width = target == null ? this.renderer.domElement.width : target.width;
    //     const height = target == null ? this.renderer.domElement.height : target.height;
    
    //     // displayMaterial.bind();
    //     // if (config.SHADING)
    //     //     gl.uniform2f(displayMaterial.uniforms.texelSize, 1.0 / width, 1.0 / height);
    //     // gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
    //     // if (config.BLOOM) {
    //     //     gl.uniform1i(displayMaterial.uniforms.uBloom, bloom.attach(1));
    //     //     gl.uniform1i(displayMaterial.uniforms.uDithering, ditheringTexture.attach(2));
    //     //     let scale = getTextureScale(ditheringTexture, width, height);
    //     //     gl.uniform2f(displayMaterial.uniforms.ditherScale, scale.x, scale.y);
    //     // }
    //     // if (config.SUNRAYS)
    //     //     gl.uniform1i(displayMaterial.uniforms.uSunrays, sunrays.attach(3));
    //     // blit(target);

    //     if (config.SHADING){
    //         this.displayPass.update({
    //             texelSize: _v2.set(1.0 / width, 1.0 / height),
    //         });
    //     }


    //     this.renderer.setRenderTarget(target);
    //     this.displayPass.update({
    //         uTexture: this.dyeRT.read.texture,
    //     });
    //     this.renderer.render(this.displayPass.scene, this.camera);

    // }

    private updateColors (dt: number) {
        if (!config.COLORFUL) return;
    
        this.colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
        if (this.colorUpdateTimer >= 1) {
            this.colorUpdateTimer = wrap(this.colorUpdateTimer, 0, 1);
            this.pointers.forEach(p => {
                p.color = generateColor();
            });
        }
    }

    private splat(x: number, y: number, dx: number, dy: number, color: RGB){
        this.renderer.setRenderTarget(this.velocityRT.write);
        this.splatPass.update({
            uTarget: this.velocityRT.read.texture,
            aspectRatio: this.renderer.domElement.width / this.renderer.domElement.height,
            point: _v2.set(x, y),
            color: _v3.set(dx, dy, 0),
            radius: config.SPLAT_RADIUS / 100.0
        });
        this.renderer.render(this.splatPass.scene, this.camera);
        this.velocityRT.swap();
        

        this.renderer.setRenderTarget(this.dyeRT.write);
        this.splatPass.update({
            uTarget: this.dyeRT.read.texture,
            color: _v3.set(color.r, color.g, color.b)
        });
        this.renderer.render(this.splatPass.scene, this.camera);
        this.dyeRT.swap();
    }

    private calcDeltaTime () {
        const now = performance.now();
        let dt = (now - this.lastUpdateTime) / 1000;
        dt = Math.min(dt, 0.016666);
        this.lastUpdateTime = now;
        return dt;
    }

    // private splatPointer = (pointer: PointerData) => {
    //     const dx = pointer.deltaX * config.SPLAT_FORCE;
    //     const dy = pointer.deltaY * config.SPLAT_FORCE;
    //     this.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
    // }

    private multipleSplats (amount: number) {
        for (let i = 0; i < amount; i++) {
            const color = generateColor();
            color.r *= 10.0;
            color.g *= 10.0;
            color.b *= 10.0;
            const x = Math.random();
            const y = Math.random();
            const dx = 1000 * (Math.random() - 0.5);
            const dy = 1000 * (Math.random() - 0.5);
            this.splat(x, y, dx, dy, color);
        }
    }

    public addSplat (color: RGB, position: Vector2Tuple, velocity: Vector2Tuple) {

        this.splat(position[0], position[1], velocity[0], velocity[1], color);
        
    }

    private applyInputs() {

        if (this.splatStack.length > 0){
            this.multipleSplats(this.splatStack.pop()!);
        }

        // this.pointers.forEach(p => {
        //     if (p.moved) {
        //         p.moved = false;
        //         this.splatPointer(p);
        //     }
        // });
    }

}