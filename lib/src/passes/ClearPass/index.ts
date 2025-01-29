import {
    Mesh,
    NoBlending,
    RawShaderMaterial,
    Scene,
    Texture,
    Uniform,
  } from "three";
import { getBasicGeometry } from "../../helpers";
import { baseVertexShader } from "../../helpers/basicVertexShader";

type ClearPassUniforms = {
    uTexture: Uniform<Texture>;
    value: Uniform<number>;
};

type ClearPassUpdateUniforms = {
    uTexture: Texture;
    value: number;
};
  
export class ClearPass {
    public readonly scene: Scene;
  
    private material: RawShaderMaterial;
    private mesh: Mesh;
  
    constructor() {
        this.scene = new Scene();
  
        const geometry = getBasicGeometry();

        this.material = new RawShaderMaterial({
        blending: NoBlending,
        uniforms: {
            uTexture: new Uniform(Texture.DEFAULT_IMAGE),
            value: new Uniform(0.0),
        } as ClearPassUniforms,
        vertexShader: baseVertexShader,
        fragmentShader: /*glsl*/`
            precision mediump float;
            precision mediump sampler2D;

            varying highp vec2 vUv;
            uniform sampler2D uTexture;
            uniform float value;

            void main () {
                gl_FragColor = value * texture2D(uTexture, vUv);
            }
        `,
        depthTest: false,
        depthWrite: false,
        });
        this.mesh = new Mesh(geometry, this.material);
        this.mesh.frustumCulled = false; // Just here to silence a console error.
        this.scene.add(this.mesh);
    }

    public update(uniforms: Partial<ClearPassUpdateUniforms>): void {
        const materialUniforms = this.material.uniforms as  ClearPassUniforms;
        if (uniforms.uTexture !== undefined) {
            materialUniforms.uTexture.value = uniforms.uTexture;
        }
        if (uniforms.value !== undefined) {
            materialUniforms.value.value = uniforms.value;
        }
    }

}