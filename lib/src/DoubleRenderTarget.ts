import { Vector2, WebGLRenderTarget } from "three";


export class DoubleRenderTarget {

    private index = 0;
    public textures: WebGLRenderTarget[] = [];
    public readonly texelSize = new Vector2(1.0, 1.0);

    constructor(...params: ConstructorParameters<typeof WebGLRenderTarget>){
        this.textures[0] = new WebGLRenderTarget(...params);
        this.textures[1] = this.textures[0].clone();
        const [width, height] = params;
        this.texelSize.set(1.0 / (width as number), 1.0 / (height as number));
    }

    get read() {
        return this.textures[this.index];
    }

    get write() {
        return this.textures[1 - this.index];
    }

    public swap() {
        this.index = 1 - this.index;
    }

    public dispose() {
        this.textures.forEach((texture) => {
            texture.dispose();
        });
    }

    public setSize(width: number, height: number) {
        this.texelSize.set(1.0 / width, 1.0 / height);
        this.textures.forEach((texture) => {
            texture.setSize(width, height);
        });
    }
}