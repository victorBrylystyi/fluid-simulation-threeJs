import {
    Mesh,
    NoBlending,
    RawShaderMaterial,
    Scene,
    Texture,
    Uniform,
} from "three";

import { baseVertexShader } from "../../helpers/basicVertexShader";
import { getBasicGeometry } from "../../helpers";

type CheckerBoardPassUniforms = {
    uTexture: Uniform<Texture>;
    aspectRatio: Uniform<number>;
};

type CheckerBoardPassUpdateUniforms = {
    uTexture: Texture;
    aspectRatio: number;
};
  
export class CheckerBoardPass {
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
                aspectRatio: new Uniform(1.0),
            } as CheckerBoardPassUniforms,
            vertexShader: baseVertexShader,
            fragmentShader: /* glsl */`
                precision highp float;
                precision highp sampler2D;

                varying vec2 vUv;
                uniform sampler2D uTexture;
                uniform float aspectRatio;

                #define SCALE 25.0

                void main () {
                    vec2 uv = floor(vUv * SCALE * vec2(aspectRatio, 1.0));
                    float v = mod(uv.x + uv.y, 2.0);
                    v = v * 0.1 + 0.8;
                    gl_FragColor = vec4(vec3(v), 1.0);
                }
            `,
        });
        this.mesh = new Mesh(geometry, this.material);
        this.mesh.frustumCulled = false; // Just here to silence a console error.

        this.scene.add(this.mesh);
    }

    public update(uniforms: Partial<CheckerBoardPassUpdateUniforms>): void {

        const materialUniforms = this.material.uniforms as CheckerBoardPassUniforms;

        if (uniforms.uTexture !== undefined) {
            materialUniforms.uTexture.value = uniforms.uTexture;
        }
        if (uniforms.aspectRatio !== undefined) {
            materialUniforms.aspectRatio.value = uniforms.aspectRatio;
        }

    }
};