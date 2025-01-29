import { useEffect, useRef, useState } from "react";
import { App } from "./App";


const SphereDemo = () => {

    const rootRef = useRef<HTMLDivElement>(null);

    const [init, setInit] = useState(false);

    useEffect(() => {
        if (init) return;
        if (!rootRef.current) return;
        setInit(true);

        const app = new App(rootRef.current);
    
        return () => {
            app.unmount();
        }

    }, [init])

    return (
        <div ref={rootRef} style={{
            width: '100%',
            aspectRatio: '16/9',
            position: 'relative',
            zIndex: 0
        }} />
    );
};

export default SphereDemo;