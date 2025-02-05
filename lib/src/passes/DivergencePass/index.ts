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

type DivergencePassUniforms = {
    texelSize: Uniform<Vector2>;
    uVelocity: Uniform<Texture>;
};

type DivergencePassUpdateUniforms = {
    texelSize: Vector2;
    uVelocity: Texture;
};
  
export class DivergencePass {
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
            uVelocity: new Uniform(Texture.DEFAULT_IMAGE)
        } as DivergencePassUniforms,
        vertexShader: baseVertexShader,
        fragmentShader: /*glsl*/`
            precision mediump float;
            precision mediump sampler2D;

            varying highp vec2 vUv;
            varying highp vec2 vL;
            varying highp vec2 vR;
            varying highp vec2 vT;
            varying highp vec2 vB;
            uniform sampler2D uVelocity;

            void main () {
                float L = texture2D(uVelocity, vL).x;
                float R = texture2D(uVelocity, vR).x;
                float T = texture2D(uVelocity, vT).y;
                float B = texture2D(uVelocity, vB).y;

                vec2 C = texture2D(uVelocity, vUv).xy;
                if (vL.x < 0.0) { L = -C.x; }
                if (vR.x > 1.0) { R = -C.x; }
                if (vT.y > 1.0) { T = -C.y; }
                if (vB.y < 0.0) { B = -C.y; }

                float div = 0.5 * (R - L + T - B);
                gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
            }
        `,
        });
        this.mesh = new Mesh(geometry, this.material);
        this.mesh.frustumCulled = false; // Just here to silence a console error.
        this.scene.add(this.mesh);
    }

    public update(uniforms: Partial<DivergencePassUpdateUniforms>): void {
        const materialUniforms = this.material.uniforms as DivergencePassUniforms;
        if (uniforms.texelSize !== undefined) {
            materialUniforms.texelSize.value.copy(uniforms.texelSize);
        }
        if (uniforms.uVelocity !== undefined) {
            materialUniforms.uVelocity.value = uniforms.uVelocity;
        }
    }

    public dispose() {
        this.mesh.geometry.dispose();
        this.material.dispose();
    }
}