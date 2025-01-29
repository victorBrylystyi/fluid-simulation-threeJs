import { BufferGeometry, Float32BufferAttribute, RGB } from "three";
import { PointerData } from "../types";

class FullscreenTriangleGeometry extends BufferGeometry {

	constructor() {

		super();

		this.setAttribute( 'position', new Float32BufferAttribute([ 
            -1,  3, 0, 
            -1, -1, 0, 
            3,  -1, 0 
        ], 3));

		this.setAttribute( 'uv', new Float32BufferAttribute([ 
            0, 2, 
            0, 0, 
            2, 0 
        ], 2));

	}

};

export const getBasicGeometry = () => new FullscreenTriangleGeometry();

export const normalizeColor = (input: RGB) => ({
    r: input.r / 255,
    g: input.g / 255,
    b: input.b / 255
});

export const scaleByPixelRatio = (input: number) => {
    const pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
};

export const generateColor = () => {
    const c = HSVtoRGB(Math.random(), 1.0, 1.0);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
};

export const HSVtoRGB = (h: number, s: number, v: number) => {
    let r = 0, 
        g = 0, 
        b = 0, 
        i, f, p, q, t;
    
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return {
        r,
        g,
        b
    };
};

export const generatePointerData = (): PointerData => ({
    id: -1,
    texcoordX: 0,
    texcoordY: 0,
    prevTexcoordX: 0,
    prevTexcoordY: 0,
    deltaX: 0,
    deltaY: 0,
    down: false,
    moved: false,
    color: { r: 0.3, g: 0, b: 0.7 }
});

export const updatePointerDownData = (canvas: HTMLCanvasElement, pointer: PointerData, id: number, posX: number, posY: number) => {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = generateColor();
};

export const  updatePointerMoveData = (canvas: HTMLCanvasElement, pointer: PointerData, posX: number, posY: number) => {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.deltaX = correctDeltaX(canvas, pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(canvas, pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
};

export const updatePointerUpData = (pointer: PointerData) => {
    pointer.down = false;
};

export const correctDeltaX = (canvas: HTMLCanvasElement, delta: number) => {
    const aspectRatio = canvas.width / canvas.height;
    if (aspectRatio < 1) delta *= aspectRatio;
    return delta;
};

export const correctDeltaY = (canvas: HTMLCanvasElement, delta: number) => {
    const aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) delta /= aspectRatio;
    return delta;
};

export const updateKeywords = (config: any) => {
    const displayKeywords = [];
    if (config.SHADING) displayKeywords.push("SHADING");
    if (config.BLOOM) displayKeywords.push("BLOOM");
    if (config.SUNRAYS) displayKeywords.push("SUNRAYS");
    // displayMaterial.setKeywords(displayKeywords);
};

export const wrap = (value: number, min: number, max: number) => {
    const range = max - min;
    if (range == 0) return min;
    return (value - min) % range + min;
};