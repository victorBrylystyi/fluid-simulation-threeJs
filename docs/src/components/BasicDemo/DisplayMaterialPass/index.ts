import {
    Color,
    Mesh,
    NoBlending,
    RawShaderMaterial,
    Scene,
    Texture,
    Uniform,
    Vector2
} from "three";

import { baseVertexShader } from "./helpers/basicVertexShader";
import { getBasicGeometry } from "./helpers";

type DisplayMaterialPassUniforms = {
    uTexture: Uniform<Texture>;
    uSunrays: Uniform<Texture>;
    uBloom: Uniform<Texture>;
    uDithering: Uniform<Texture>;
    ditherScale: Uniform<Vector2>;
    texelSize: Uniform<Vector2>;
};

type DisplayMaterialPassUpdateUniforms = {
    uTexture: Texture;
    uSunrays: Texture;
    uBloom: Texture;
    uDithering: Texture;
    ditherScale: Vector2;
    texelSize: Vector2;
};
  
export class DisplayMaterialPass {
    public readonly scene: Scene;

    private material: RawShaderMaterial;
    private mesh: Mesh;

    constructor(){
        this.scene = new Scene();

        const geometry = getBasicGeometry();

        this.material = new RawShaderMaterial({
            blending: NoBlending,
            uniforms: {
                uTexture: new Uniform(Texture.DEFAULT_IMAGE),
                uBloom: new Uniform(Texture.DEFAULT_IMAGE),
                uSunrays: new Uniform(Texture.DEFAULT_IMAGE),
                uDithering: new Uniform(Texture.DEFAULT_IMAGE),
                ditherScale: new Uniform(new Vector2(1.0, 1.0)),
                texelSize: new Uniform(new Vector2(1.0, 1.0)),
            } as DisplayMaterialPassUniforms,
            vertexShader: baseVertexShader,
            fragmentShader: /* glsl */`
                precision highp float;
                precision highp sampler2D;

                varying vec2 vUv;
                varying vec2 vL;
                varying vec2 vR;
                varying vec2 vT;
                varying vec2 vB;
                uniform sampler2D uTexture;
                uniform sampler2D uBloom;
                uniform sampler2D uSunrays;
                uniform sampler2D uDithering;
                uniform vec2 ditherScale;
                uniform vec2 texelSize;

                vec3 linearToGamma (vec3 color) {
                    color = max(color, vec3(0));
                    return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
                }

                void main () {
                    vec3 c = texture2D(uTexture, vUv).rgb;

                #ifdef SHADING
                    vec3 lc = texture2D(uTexture, vL).rgb;
                    vec3 rc = texture2D(uTexture, vR).rgb;
                    vec3 tc = texture2D(uTexture, vT).rgb;
                    vec3 bc = texture2D(uTexture, vB).rgb;

                    float dx = length(rc) - length(lc);
                    float dy = length(tc) - length(bc);

                    vec3 n = normalize(vec3(dx, dy, length(texelSize)));
                    vec3 l = vec3(0.0, 0.0, 1.0);

                    float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
                    c *= diffuse;
                #endif

                #ifdef BLOOM
                    vec3 bloom = texture2D(uBloom, vUv).rgb;
                #endif

                #ifdef SUNRAYS
                    float sunrays = texture2D(uSunrays, vUv).r;
                    c *= sunrays;
                #ifdef BLOOM
                    bloom *= sunrays;
                #endif
                #endif

                #ifdef BLOOM
                    float noise = texture2D(uDithering, vUv * ditherScale).r;
                    noise = noise * 2.0 - 1.0;
                    bloom += noise / 255.0;
                    bloom = linearToGamma(bloom);
                    c += bloom;
                #endif

                    float a = max(c.r, max(c.g, c.b));
                    gl_FragColor = vec4(c, a);
                }
            `,
        });
        this.mesh = new Mesh(geometry, this.material);
        this.mesh.frustumCulled = false; // Just here to silence a console error.

        this.scene.add(this.mesh);
    }

    public update(uniforms: Partial<DisplayMaterialPassUpdateUniforms>): void {

        const materialUniforms = this.material.uniforms as DisplayMaterialPassUniforms;

        if (uniforms.uTexture !== undefined) {
            materialUniforms.uTexture.value = uniforms.uTexture;
        }

        if (uniforms.uSunrays !== undefined) {
            materialUniforms.uSunrays.value = uniforms.uSunrays;
        }

        if (uniforms.uBloom !== undefined) {
            materialUniforms.uBloom.value = uniforms.uBloom;
        }

        if (uniforms.uDithering !== undefined) {
            materialUniforms.uDithering.value = uniforms.uDithering;
        }

        if (uniforms.ditherScale !== undefined) {
            materialUniforms.ditherScale.value.copy(uniforms.ditherScale);
        }

        if (uniforms.texelSize !== undefined) {
            materialUniforms.texelSize.value.copy(uniforms.texelSize);
        }

    }
};