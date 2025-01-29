import {
    Mesh,
    NoBlending,
    RawShaderMaterial,
    Scene,
    Texture,
    Uniform,
    Vector2
} from "three";

import { baseVertexShader } from "../../helpers/basicVertexShader";
import { getBasicGeometry } from "../../helpers";

type AdvectionPassUniforms = {
    uSource: Uniform<Texture>;
    uVelocity: Uniform<Texture>;
    texelSize: Uniform<Vector2>;
    dyeTexelSize: Uniform<Vector2>;
    dt: Uniform<number>;
    dissipation: Uniform<number>;
};

type AdvectionPassUpdateUniforms = {
    uSource: Texture;
    uVelocity: Texture;
    texelSize: Vector2;
    dyeTexelSize: Vector2;
    dt: number;
    dissipation: number;
};
  
export class AdvectionPass {
    public readonly scene: Scene;

    private material: RawShaderMaterial;
    private mesh: Mesh;

    constructor(){
        this.scene = new Scene();

        const geometry = getBasicGeometry();

        this.material = new RawShaderMaterial({
            blending: NoBlending,
            uniforms: {
            dt: new Uniform(0.0),
            uSource: new Uniform(Texture.DEFAULT_IMAGE),
            uVelocity: new Uniform(Texture.DEFAULT_IMAGE),
            texelSize: new Uniform(new Vector2(1.0, 1.0)),
            dyeTexelSize: new Uniform(new Vector2(1.0, 1.0)),
            dissipation: new Uniform(0.0)
            },
            vertexShader: baseVertexShader,
            fragmentShader: /* glsl */`
                precision highp float;
                precision highp sampler2D;

                varying vec2 vUv;
                uniform sampler2D uVelocity;
                uniform sampler2D uSource;
                uniform vec2 texelSize;
                uniform vec2 dyeTexelSize;
                uniform float dt;
                uniform float dissipation;

                vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
                    vec2 st = uv / tsize - 0.5;

                    vec2 iuv = floor(st);
                    vec2 fuv = fract(st);

                    vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
                    vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
                    vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
                    vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

                    return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
                }

                void main () {
                    #ifdef MANUAL_FILTERING
                        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
                        vec4 result = bilerp(uSource, coord, dyeTexelSize);
                    #else
                        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
                        vec4 result = texture2D(uSource, coord);
                    #endif
                        float decay = 1.0 + dissipation * dt;
                        gl_FragColor = result / decay;
                }
            `,
        });
        this.mesh = new Mesh(geometry, this.material);
        this.mesh.frustumCulled = false; // Just here to silence a console error.

        this.scene.add(this.mesh);
    }

    public update(uniforms: Partial<AdvectionPassUpdateUniforms>): void {

        const materialUniforms = this.material.uniforms as AdvectionPassUniforms;

        if (uniforms.dt !== undefined) {
            materialUniforms.dt.value = uniforms.dt;
        }
        
        if (uniforms.uSource !== undefined) {
            materialUniforms.uSource.value = uniforms.uSource;
        }

        if (uniforms.uVelocity !== undefined) {
            materialUniforms.uVelocity.value = uniforms.uVelocity;
        }

        if (uniforms.texelSize !== undefined) {
            materialUniforms.texelSize.value.copy(uniforms.texelSize);
        }

        if (uniforms.dyeTexelSize !== undefined) {
            materialUniforms.dyeTexelSize.value.copy(uniforms.dyeTexelSize);
        }

        if (uniforms.dissipation !== undefined) {
            materialUniforms.dissipation.value = uniforms.dissipation;
        }

    }
};