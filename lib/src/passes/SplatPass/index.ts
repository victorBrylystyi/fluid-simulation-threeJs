import {
    Mesh,
    NoBlending,
    RawShaderMaterial,
    Scene,
    Texture,
    Uniform,
    Vector2,
    Vector3
} from "three";

import { baseVertexShader } from "../../helpers/basicVertexShader";
import { getBasicGeometry } from "../../helpers";

type SplatPassUniforms = {
    uTarget: Uniform<Texture>;
    aspectRatio: Uniform<number>;
    point: Uniform<Vector2>;
    color: Uniform<Vector3>;
    radius: Uniform<number>;

};

type SplatPassUpdateUniforms = {
    uTarget: Texture;
    aspectRatio: number;
    point: Vector2;
    color: Vector3;
    radius: number;
};
  
export class SplatPass {
    public readonly scene: Scene;

    private material: RawShaderMaterial;
    private mesh: Mesh;

    constructor() {
        this.scene = new Scene();

        const geometry = getBasicGeometry();

        this.material = new RawShaderMaterial({
            blending: NoBlending,
            uniforms: {
                uTarget: new Uniform(Texture.DEFAULT_IMAGE),
                aspectRatio: new Uniform(0.0),
                point: new Uniform(new Vector2(0.0, 0.0)),
                color: new Uniform(new Vector3(0.0, 0.0, 0.0)),
                radius: new Uniform(0.0)
            } as SplatPassUniforms,
            vertexShader: baseVertexShader,
            fragmentShader: /* glsl */`
                precision highp float;
                precision highp sampler2D;
            
                varying vec2 vUv;
                uniform sampler2D uTarget;
                uniform float aspectRatio;
                uniform vec3 color;
                uniform vec2 point;
                uniform float radius;
            
                void main () {
                    vec2 p = vUv - point.xy;
                    p.x *= aspectRatio;
                    vec3 splat = exp(-dot(p, p) / radius) * color;
                    vec3 base = texture2D(uTarget, vUv).xyz;
                    gl_FragColor = vec4(base + splat, 1.0);
                }
            `,
            depthTest: false,
            depthWrite: false
        });
        this.mesh = new Mesh(geometry, this.material);
        this.mesh.frustumCulled = false; // Just here to silence a console error.

        this.scene.add(this.mesh);
    }

    public update(uniforms: Partial<SplatPassUpdateUniforms>): void {

        const materialUniforms = this.material.uniforms as SplatPassUniforms;

        if (uniforms.uTarget !== undefined) {
            materialUniforms.uTarget.value = uniforms.uTarget;
        }

        if (uniforms.aspectRatio !== undefined) {
            materialUniforms.aspectRatio.value = uniforms.aspectRatio;
        }

        if (uniforms.point !== undefined) {
            materialUniforms.point.value.copy(uniforms.point);
        }

        if (uniforms.color !== undefined) {
            materialUniforms.color.value.copy(uniforms.color);
        }

        if (uniforms.radius !== undefined) {
            materialUniforms.radius.value = uniforms.radius;
        }
    }

    public dispose() {
        this.mesh.geometry.dispose();
        this.material.dispose();
    }
};