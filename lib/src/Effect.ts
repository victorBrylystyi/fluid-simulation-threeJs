import { HalfFloatType, LinearFilter, NearestFilter, OrthographicCamera, RepeatWrapping, RGB, RGBAFormat, Vector2, Vector2Tuple, Vector3, WebGLRenderer, WebGLRenderTarget } from "three";
import { CurlPass } from "./passes/CurlPass";
import { VorticityPass } from "./passes/VorticityPass";
import { DivergencePass } from "./passes/DivergencePass";
import { ClearPass } from "./passes/ClearPass";
import { PressurePass } from "./passes/PressurePass";
import { GradienSubtractPass } from "./passes/GradienSubtractPass";
import { generateColor, generatePointerData, scaleByPixelRatio, updatePointerDownData, updatePointerMoveData, updatePointerUpData, wrap } from "./helpers";
// import { ColorPass } from "./passes/ColorPass";
// import { CheckerBoardPass } from "./passes/CheckerBoardPass";
// import { DisplayMaterialPass } from "./passes/DisplayMaterialPass";
import { ConfigType, PointerData } from "./types";
import { SplatPass } from "./passes/SplatPass";
import { DoubleRenderTarget } from "./DoubleRenderTarget";
import { AdvectionPass } from "./passes/AdvectionPass";

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

    private pointerDown = (e: PointerEvent) => {
        const posX = scaleByPixelRatio(e.offsetX);
        const posY = scaleByPixelRatio(e.offsetY);
        let pointer = this.pointers.find(p => p.id == -1);
        if (pointer == null)
            pointer = generatePointerData();
        updatePointerDownData(this.renderer.domElement, pointer, -1, posX, posY);
    };
    private pointerMove = (e: PointerEvent) => {
        const pointer = this.pointers[0];
        if (!pointer.down) return;
        const posX = scaleByPixelRatio(e.offsetX);
        const posY = scaleByPixelRatio(e.offsetY);
        updatePointerMoveData(this.renderer.domElement, pointer, posX, posY);
    };
    private pointerUp = () => {
        updatePointerUpData(this.pointers[0]);
    };

    private lastUpdateTime = 0;

    constructor(readonly renderer: WebGLRenderer, readonly config: ConfigType) {

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
        if (this.config.EVENT_PERMISSION){
            const canvas = this.renderer.domElement;

            canvas.addEventListener('pointerdown', this.pointerDown);
            canvas.addEventListener('pointermove', this.pointerMove);
            window.addEventListener('pointerup', this.pointerUp);
        }

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

    public unmount(){
        this.disposeRTs();

        if (this.config.EVENT_PERMISSION) {
            const canvas = this.renderer.domElement;

            canvas.removeEventListener('pointerdown', this.pointerDown);
            canvas.removeEventListener('pointermove', this.pointerMove);
            window.removeEventListener('pointerup', this.pointerUp);
        }
    }

    private initRenderTargets(){

        this.disposeRTs();

        const dyeResWidth = this.config.DYE_RESOLUTION;
        const dyeResHeight = dyeResWidth / 2;

        const simResWidth = this.config.SIM_RESOLUTION;
        const simResHeight = simResWidth / 2;

        this.dyeRT = new DoubleRenderTarget(dyeResWidth, dyeResHeight, {
            format: RGBAFormat,
            type: HalfFloatType,
            internalFormat: 'RGBA16F',
            depthBuffer: false,
            stencilBuffer: false,
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            wrapS: RepeatWrapping,
            wrapT: RepeatWrapping
        });

        this.velocityRT = new DoubleRenderTarget(simResWidth, simResHeight, {
            format: RGBAFormat,
            type: HalfFloatType,
            internalFormat: 'RGBA16F',
            depthBuffer: false,
            stencilBuffer: false,
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            wrapS: RepeatWrapping,
            wrapT: RepeatWrapping
        });

        this.divergenceRT = new WebGLRenderTarget(simResWidth, simResHeight, {
            format: RGBAFormat,
            type: HalfFloatType,
            internalFormat: 'RGBA16F',
            depthBuffer: false,
            stencilBuffer: false,
            minFilter: NearestFilter,
            magFilter: NearestFilter,
            wrapS: RepeatWrapping,
            wrapT: RepeatWrapping
        });

        this.curlRT = new WebGLRenderTarget(simResWidth, simResHeight, {
            format: RGBAFormat,
            type: HalfFloatType,
            internalFormat: 'RGBA16F',
            depthBuffer: false,
            stencilBuffer: false,
            minFilter: NearestFilter,
            magFilter: NearestFilter,
            wrapS: RepeatWrapping,
            wrapT: RepeatWrapping
        });

        this.pressureRT = new DoubleRenderTarget(simResWidth, simResHeight, {
            format: RGBAFormat,
            type: HalfFloatType,
            internalFormat: 'RGBA16F',
            depthBuffer: false,
            stencilBuffer: false,
            minFilter: NearestFilter,
            magFilter: NearestFilter,
            wrapS: RepeatWrapping,
            wrapT: RepeatWrapping
        });

    }

    // private initGUI () {
    //     this.gui.add(this.config, 'DYE_RESOLUTION', { 'high': 1024, 'medium': 512, 'low': 256, 'very low': 128 }).name('quality').onFinishChange(() => {
    //         this.initRenderTargets();
    //     });
    //     this.gui.add(this.config, 'SIM_RESOLUTION', { '32': 32, '64': 64, '128': 128, '256': 256 }).name('sim resolution').onFinishChange(() => {
    //         this.initRenderTargets();
    //     });
    //     this.gui.add(this.config, 'DENSITY_DISSIPATION', 0, 4.0).name('density diffusion');
    //     this.gui.add(this.config, 'VELOCITY_DISSIPATION', 0, 4.0).name('velocity diffusion');
    //     this.gui.add(this.config, 'PRESSURE', 0.0, 1.0).name('pressure');
    //     this.gui.add(this.config, 'CURL', 0, 50).name('vorticity').step(1);
    //     this.gui.add(this.config, 'SPLAT_RADIUS', 0.01, 1.0).name('splat radius');
    //     // this.gui.add(this.config, 'SHADING').name('shading').onFinishChange(() => {
    //     //     updateKeywords(this.config);
    //     // });
    //     // this.gui.add(this.config, 'COLORFUL').name('colorful');
    //     // this.gui.add(this.config, 'PAUSED').name('paused').listen();
    
    //     // this.gui.add({ fun: () => {
    //     //     // @ts-ignore
    //     //     this.splatStack.push(parseInt(Math.random() * 20) + 5);
    //     // } }, 'fun').name('Random splats');
    
    //     // const bloomFolder = this.gui.addFolder('Bloom');
    //     // bloomFolder.add(this.config, 'BLOOM').name('enabled').onFinishChange(() => {
    //     //     updateKeywords(this.config);
    //     // });
    //     // bloomFolder.add(this.config, 'BLOOM_INTENSITY', 0.1, 2.0).name('intensity');
    //     // bloomFolder.add(this.config, 'BLOOM_THRESHOLD', 0.0, 1.0).name('threshold');
    
    //     // const sunraysFolder = this.gui.addFolder('Sunrays');
    //     // sunraysFolder.add(this.config, 'SUNRAYS').name('enabled').onFinishChange(() => {
    //     //     updateKeywords(this.config);
    //     // });
    //     // sunraysFolder.add(this.config, 'SUNRAYS_WEIGHT', 0.3, 1.0).name('weight');
    
    //     // const captureFolder = this.gui.addFolder('Capture');
    //     // captureFolder.addColor(this.config, 'BACK_COLOR').name('background color');
    //     // captureFolder.add(this.config, 'TRANSPARENT').name('transparent');
    //     // captureFolder.add({ fun: captureScreenshot }, 'fun').name('take screenshot');
    
    // }

    public update(dt: number) {

        const deltaT = dt || this.calcDeltaTime();

        this.updateColors(deltaT);

        this.applyInputs();

        if (!this.config.PAUSED) {
            this.step(deltaT);
        }

        this.renderer.setRenderTarget(null);

        // if (this.config.EVENT_PERMISSION){
        //     this.render(null);
        // }


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
                curl: this.config.CURL
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
                value: this.config.PRESSURE
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
    
            for (let i = 0; i < this.config.PRESSURE_ITERATIONS; i++) {
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
                dissipation: this.config.VELOCITY_DISSIPATION
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
                dissipation: this.config.DENSITY_DISSIPATION
            });
            this.renderer.render(this.advectionPass.scene, this.camera);
            this.dyeRT.swap();
        }

    }

    // private render(target: WebGLRenderTarget | null){

    //     if (!this.config.TRANSPARENT){
    //         this.drawColor(target, this.config.BACK_COLOR);
    //     }

    //     if (target == null && this.config.TRANSPARENT){
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
    //     // if (this.config.SHADING)
    //     //     gl.uniform2f(displayMaterial.uniforms.texelSize, 1.0 / width, 1.0 / height);
    //     // gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
    //     // if (this.config.BLOOM) {
    //     //     gl.uniform1i(displayMaterial.uniforms.uBloom, bloom.attach(1));
    //     //     gl.uniform1i(displayMaterial.uniforms.uDithering, ditheringTexture.attach(2));
    //     //     let scale = getTextureScale(ditheringTexture, width, height);
    //     //     gl.uniform2f(displayMaterial.uniforms.ditherScale, scale.x, scale.y);
    //     // }
    //     // if (this.config.SUNRAYS)
    //     //     gl.uniform1i(displayMaterial.uniforms.uSunrays, sunrays.attach(3));
    //     // blit(target);

    //     if (this.config.SHADING){
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
        if (!this.config.COLORFUL) return;
    
        this.colorUpdateTimer += dt * this.config.COLOR_UPDATE_SPEED;
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
            radius: this.config.SPLAT_RADIUS / 100.0
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

    private splatPointer = (pointer: PointerData) => {
        const dx = pointer.deltaX * this.config.SPLAT_FORCE;
        const dy = pointer.deltaY * this.config.SPLAT_FORCE;
        this.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
    }

    public multipleSplats (amount: number) {
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

        if (this.config.EVENT_PERMISSION) {
            this.pointers.forEach(p => {
                if (p.moved) {
                    p.moved = false;
                    this.splatPointer(p);
                }
            });
        }


    }

}