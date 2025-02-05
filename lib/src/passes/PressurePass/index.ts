import {
    Mesh,
    NoBlending,
    RawShaderMaterial,
    Scene,
    Texture,
    Uniform,
    Vector2
  } from "three";
import { getBasicGeometry } from "../../helpers";
import { baseVertexShader } from "../../helpers/basicVertexShader";

type PressurePassUniforms = {
    texelSize: Uniform<Vector2>;
    uPressure: Uniform<Texture>;
    uDivergence: Uniform<Texture>;
};

type PressurePassUpdateUniforms = {
    texelSize: Vector2;
    uPressure: Texture;
    uDivergence: Texture;
};
  
export class PressurePass {
    public readonly scene: Scene;
  
    private material: RawShaderMaterial;
    private mesh: Mesh;

    constructor() {
        this.scene = new Scene();
        const geometry = getBasicGeometry();

        this.material = new RawShaderMaterial({
        blending: NoBlending,
        uniforms: {
            texelSize: new Uniform(new Vector2(1.0, 1.0)),
            uPressure: new Uniform(Texture.DEFAULT_IMAGE),
            uDivergence: new Uniform(Texture.DEFAULT_IMAGE),
        } as PressurePassUniforms,
        vertexShader: baseVertexShader,
        fragmentShader: /*glsl*/`
            precision mediump float;
            precision mediump sampler2D;

            varying highp vec2 vUv;
            varying highp vec2 vL;
            varying highp vec2 vR;
            varying highp vec2 vT;
            varying highp vec2 vB;
            uniform sampler2D uPressure;
            uniform sampler2D uDivergence;

            void main () {
                float L = texture2D(uPressure, vL).x;
                float R = texture2D(uPressure, vR).x;
                float T = texture2D(uPressure, vT).x;
                float B = texture2D(uPressure, vB).x;
                float C = texture2D(uPressure, vUv).x;
                float divergence = texture2D(uDivergence, vUv).x;
                float pressure = (L + R + B + T - divergence) * 0.25;
                gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
            }
        `,
        });
        this.mesh = new Mesh(geometry, this.material);
        this.mesh.frustumCulled = false; // Just here to silence a console error.
        this.scene.add(this.mesh);
    }

    public update(uniforms: Partial<PressurePassUpdateUniforms>): void {
        const materialUniforms = this.material.uniforms as  PressurePassUniforms;
        if (uniforms.texelSize !== undefined) {
            materialUniforms.texelSize.value.copy(uniforms.texelSize);
        }
        if (uniforms.uPressure !== undefined) {
            materialUniforms.uPressure.value = uniforms.uPressure;
        }
        if (uniforms.uDivergence !== undefined) {
            materialUniforms.uDivergence.value = uniforms.uDivergence;
        }
    }

    public dispose() {
        this.mesh.geometry.dispose();
        this.material.dispose();
    }

}