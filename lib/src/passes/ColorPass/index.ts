import {
    Mesh,
    NoBlending,
    RawShaderMaterial,
    Scene,
    Uniform,
    Vector4
} from "three";

import { baseVertexShader } from "../../helpers/basicVertexShader";
import { getBasicGeometry } from "../../helpers";

type ColorPassUniforms = {
    color: Uniform<Vector4>;
};

type ColorPassUpdateUniforms = {
    color: Vector4;
};
  
export class ColorPass {
    public readonly scene: Scene;

    private material: RawShaderMaterial;
    private mesh: Mesh;

    constructor(){
        this.scene = new Scene();

        const geometry = getBasicGeometry();

        this.material = new RawShaderMaterial({
            blending: NoBlending,
            uniforms: {
                color: new Uniform(new Vector4(0.0, 0.0, 0.0, 0.0)),
            } as ColorPassUniforms,
            vertexShader: baseVertexShader,
            fragmentShader: /* glsl */`
                precision mediump float;

                uniform vec4 color;

                void main () {
                    gl_FragColor = color;
                }
            `,
        });
        this.mesh = new Mesh(geometry, this.material);
        this.mesh.frustumCulled = false; // Just here to silence a console error.

        this.scene.add(this.mesh);
    }

    public update(uniforms: Partial<ColorPassUpdateUniforms>): void {

        const materialUniforms = this.material.uniforms as ColorPassUniforms;

        if (uniforms.color !== undefined) {
            materialUniforms.color.value.copy(uniforms.color);
        }

    }

    public dispose() {
        this.mesh.geometry.dispose();
        this.material.dispose();
    }
};