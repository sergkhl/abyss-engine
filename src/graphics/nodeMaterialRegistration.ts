import { extend } from '@react-three/fiber/webgpu';
import { MeshBasicNodeMaterial, MeshPhysicalNodeMaterial, MeshStandardNodeMaterial } from 'three/webgpu';

extend({ MeshBasicNodeMaterial, MeshStandardNodeMaterial, MeshPhysicalNodeMaterial });
