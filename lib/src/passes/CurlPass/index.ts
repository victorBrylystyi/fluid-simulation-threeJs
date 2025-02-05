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

type CurlPassUniforms = {
    texelSize: Uniform<Vector2>;
    uVelocity: Uniform<Texture>;
};

type CurlPassUpdateUniforms = {
    texelSize: Vector2;
    uVelocity: Texture;
};
  
export class CurlPass {
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
            uVelocity: new Uniform(Texture.DEFAULT_IMAGE),
        } as CurlPassUniforms,
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
                float L = texture2D(uVelocity, vL).y;
                float R = texture2D(uVelocity, vR).y;
                float T = texture2D(uVelocity, vT).x;
                float B = texture2D(uVelocity, vB).x;
                float vorticity = R - L - T + B;
                gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
            }
        `,
        depthTest: false,
        depthWrite: false,
        });
        this.mesh = new Mesh(geometry, this.material);
        this.mesh.frustumCulled = false; // Just here to silence a console error.
        this.scene.add(this.mesh);
    }

    public update(uniforms: Partial<CurlPassUpdateUniforms>): void {

        const materialUniforms = this.material.uniforms as  CurlPassUniforms;

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