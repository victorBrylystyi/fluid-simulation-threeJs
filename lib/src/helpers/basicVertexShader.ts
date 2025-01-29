


export const baseVertexShader = /* glsl */`

    precision highp float;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;

    attribute vec2 uv;
    attribute vec3 position;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    uniform vec2 texelSize;

    void main () {

        vUv = uv;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);

        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    } 
`;