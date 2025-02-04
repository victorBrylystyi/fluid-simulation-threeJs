import { BufferGeometry, Float32BufferAttribute } from "three";

class FullscreenTriangleGeometry extends BufferGeometry {

	constructor() {

		super();

		this.setAttribute( 'position', new Float32BufferAttribute([ 
            -1,  3, 0, 
            -1, -1, 0, 
            3,  -1, 0 
        ], 3));

		this.setAttribute( 'uv', new Float32BufferAttribute([ 
            0, 2, 
            0, 0, 
            2, 0 
        ], 2));

	}

};

export const getBasicGeometry = () => new FullscreenTriangleGeometry();
