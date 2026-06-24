import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

function AmbientBlurShape({ position, color, size, speed }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.position.x = position[0] + Math.sin(elapsed * speed) * 0.8;
      meshRef.current.position.y = position[1] + Math.cos(elapsed * speed) * 0.6;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.06} />
    </mesh>
  );
}

export default function ThreeHeroScene() {
  return (
    <div className="w-full h-full absolute inset-0 -z-10 pointer-events-none select-none overflow-hidden">
      <Canvas>
        <ambientLight intensity={0.8} />
        
        {/* Soft, slow-moving blurred spheres acting as high-fidelity ambient gradients */}
        <AmbientBlurShape position={[-3, 2, -2]} color="#6D5DFC" size={2.5} speed={0.15} />
        <AmbientBlurShape position={[3, -1.5, -2]} color="#00C2FF" size={3.0} speed={0.1} />
        <AmbientBlurShape position={[0, 0, -3]} color="#00D084" size={2.2} speed={0.2} />
      </Canvas>
    </div>
  );
}
