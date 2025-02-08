import { useEffect, useRef } from "react";
import { BaseDemo } from "../BasicDemo";
import { SphereDemo } from "../SphereDemo";


const Demo = (props: {demo: string}) => {

    const { demo } = props;

    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!rootRef.current) return;

        let app: BaseDemo | SphereDemo = null;

        switch (demo) {
            case 'Basic':
                app = new BaseDemo(rootRef.current, true);
                break;
            case 'Sphere':
                app = new SphereDemo(rootRef.current, true);
                break;
        
            default:
                break;
        }
    
        return () => {

            if (app){
                app.unmount();
            }
        }

    }, [demo]);

    return (
        <div 
            ref={rootRef} 
            style={{
                width: '100%',
                aspectRatio: '16/9',
                position: 'relative',
                zIndex: 0,
                overflow: 'hidden',
                userSelect: 'none',
                background: 'transparent',
            }} 
        />
    );
};

export default Demo;
