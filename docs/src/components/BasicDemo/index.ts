import { Color, OrthographicCamera, Vector2, Vector2Tuple } from "three";
import { Demo } from "../Demo/Demo";
import { DisplayMaterialPass } from "./DisplayMaterialPass";
import {Effect} from "@evenstar/fluid";

export class BaseDemo extends Demo {

    camera = new OrthographicCamera( -1, 1, 1, -1, 0, 1 );
    displayPass!: DisplayMaterialPass;

    constructor(rootElement: HTMLDivElement, mountStats: boolean) {
        super(rootElement, mountStats);
        this.rootElement = rootElement;

        this.config.EVENT_PERMISSION = true;
        this.effect = new Effect(this.renderer, this.config);
        this.effect.setAspect(this.rootElement.clientWidth / this.rootElement.clientHeight);
        this.effect.multipleSplats(Math.round(Math.random() * 20) + 5);

        this.mount();
        this.resizeDemo();
        this.startAnimation();
    }

    mount() {
        super.mount();

        const aspect = this.rootElement.clientWidth / this.rootElement.clientHeight; 

        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.rootElement.clientWidth, this.rootElement.clientHeight, true);

        this.displayPass = new DisplayMaterialPass();
        this.addPostProcessingPasses(this.displayPass.scene, this.camera);

    }

    unmount() {
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

        // this.effect.addSplat({
        //     r: 0.0,
        //     g: 1.0,
        //     b: 0.0
        // }, [0.5, 0.5], this.getVelocity(time));

        // this.effect.addSplat({
        //     r: 1.0,
        //     g: 0.0,
        //     b: 0.0
        // }, [0.25, 0.25], this.getVelocity(time));

        // this.effect.addSplat({
        //     r: 0.0,
        //     g: 0.0,
        //     b: 1.0
        // }, [0.75, 0.75], this.getVelocity(time));

      
        this.effect.update(this.calcDeltaTime());

        this.renderer.setRenderTarget(null);
        this.displayPass.update({
            uTexture: this.effect.texture
        });
        this.composer.render();
        // this.renderer.render(this.displayPass.scene, this.camera);
    }

    startAnimation() {
        this.animate();
    }

    stopAnimation() {
        cancelAnimationFrame(this.processId);
    }

}