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

type VorticityPassUniforms = {
    texelSize: Uniform<Vector2>;
    uVelocity: Uniform<Texture>;
    uCurl: Uniform<Texture>;
    curl: Uniform<number>;
    dt: Uniform<number>;
};

type VorticityPassUpdateUniforms = {
    texelSize: Vector2;
    uVelocity: Texture;
    uCurl: Texture;
    curl: number;
    dt: number;
};
  
export class VorticityPass {
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
            uCurl: new Uniform(Texture.DEFAULT_IMAGE),
            curl: new Uniform(0.0),
            dt: new Uniform(0.0),
        } as VorticityPassUniforms,
        vertexShader: baseVertexShader,
        fragmentShader: /*glsl*/`
            precision highp float;
            precision highp sampler2D;

            varying vec2 vUv;
            varying vec2 vL;
            varying vec2 vR;
            varying vec2 vT;
            varying vec2 vB;
            uniform sampler2D uVelocity;
            uniform sampler2D uCurl;
            uniform float curl;
            uniform float dt;

            void main () {
                float L = texture2D(uCurl, vL).x;
                float R = texture2D(uCurl, vR).x;
                float T = texture2D(uCurl, vT).x;
                float B = texture2D(uCurl, vB).x;
                float C = texture2D(uCurl, vUv).x;

                vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
                force /= length(force) + 0.0001;
                force *= curl * C;
                force.y *= -1.0;

                vec2 velocity = texture2D(uVelocity, vUv).xy;
                velocity += force * dt;
                velocity = min(max(velocity, -1000.0), 1000.0);
                gl_FragColor = vec4(velocity, 0.0, 1.0);
            }
        `,
        depthTest: false,
        depthWrite: false,
        });
        this.mesh = new Mesh(geometry, this.material);
        this.mesh.frustumCulled = false; // Just here to silence a console error.
        this.scene.add(this.mesh);
    }

    public update(uniforms: Partial<VorticityPassUpdateUniforms>): void {
        const materialUniforms = this.material.uniforms as  VorticityPassUniforms;
        if (uniforms.texelSize !== undefined) {
            materialUniforms.texelSize.value.copy(uniforms.texelSize);
        }
        if (uniforms.uVelocity !== undefined) {
            materialUniforms.uVelocity.value = uniforms.uVelocity;
        }
        if (uniforms.uCurl !== undefined) {
            materialUniforms.uCurl.value = uniforms.uCurl;
        }
        if (uniforms.curl !== undefined) {
            materialUniforms.curl.value = uniforms.curl;
        }
        if (uniforms.dt !== undefined) {
            materialUniforms.dt.value = uniforms.dt;
        }
    }
}