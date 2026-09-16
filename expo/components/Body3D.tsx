import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, DimensionValue } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { OrbitControls, useGLTF } from '@react-three/drei/native';
import * as THREE from 'three';

export interface UserBodyStats {
  gender: 'male' | 'female';
  age: number;
  heightCm: number;
  weightKg: number;
  bodyFatPercent?: number;
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function bmiToWeightMorph(bmi: number): number {
  const MIN_BMI = 18;
  const MAX_BMI = 35;
  const clamped = Math.max(MIN_BMI, Math.min(MAX_BMI, bmi));
  return (clamped - MIN_BMI) / (MAX_BMI - MIN_BMI);
}

export function estimateMuscleMorph(stats: UserBodyStats): number {
  if (stats.bodyFatPercent == null) return 0.4;
  const fat = stats.bodyFatPercent;
  const inverted = 1 - Math.max(0, Math.min(1, (fat - 6) / 30));
  return inverted;
}

interface BodyMeshProps {
  weight: number; 
  muscle: number; 
  modelUrl: any; 
}

const BodyMesh: React.FC<BodyMeshProps> = ({ weight, muscle, modelUrl }) => {
  const gltf = useGLTF(modelUrl) as any;
  const meshRef = useRef<THREE.Mesh | null>(null);

  const { weightIndex, muscleIndex, targetMesh } = useMemo(() => {
    let found: THREE.Mesh | null = null;
    let wIdx = -1;
    let mIdx = -1;

    gltf.scene.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.morphTargetDictionary) {
        found = mesh;
        if ('Weight' in mesh.morphTargetDictionary) {
          wIdx = mesh.morphTargetDictionary['Weight'];
        }
        if ('Muscle' in mesh.morphTargetDictionary) {
          mIdx = mesh.morphTargetDictionary['Muscle'];
        }
      }
    });

    return { weightIndex: wIdx, muscleIndex: mIdx, targetMesh: found };
  }, [gltf]);

  useEffect(() => {
    meshRef.current = targetMesh;
  }, [targetMesh]);

  const currentWeight = useRef(0);
  const currentMuscle = useRef(0);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh || !mesh.morphTargetInfluences) return;

    const lerpSpeed = Math.min(1, delta * 2);

    currentWeight.current += (weight - currentWeight.current) * lerpSpeed;
    currentMuscle.current += (muscle - currentMuscle.current) * lerpSpeed;

    if (weightIndex >= 0) {
      mesh.morphTargetInfluences[weightIndex] = currentWeight.current;
    }
    if (muscleIndex >= 0) {
      mesh.morphTargetInfluences[muscleIndex] = currentMuscle.current;
    }
  });

  return <primitive object={gltf.scene} />;
};

interface Body3DProps {
  stats: UserBodyStats;
  modelUrl: any; 
  width?: DimensionValue;
  height?: DimensionValue;
}

export const Body3D: React.FC<Body3DProps> = ({
  stats,
  modelUrl,
  width = '100%',
  height = 420,
}) => {
  const bmi = calculateBMI(stats.weightKg, stats.heightCm);
  const weight = bmiToWeightMorph(bmi);
  const muscle = estimateMuscleMorph(stats);

  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas camera={{ position: [0, 1.4, 2.6], fov: 35 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 4, 3]} intensity={1.1} />
        <directionalLight position={[-2, 2, -3]} intensity={0.4} />
        <Suspense fallback={null}>
          <BodyMesh weight={weight} muscle={muscle} modelUrl={modelUrl} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={1.5}
          maxDistance={4}
          target={[0, 1, 0]}
        />
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 16,
  },
});

export default Body3D;
