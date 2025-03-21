import { useRef, useEffect, useState } from 'react';
import { Box } from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ModelViewerProps {
  url: string;
  width?: number;
  height?: number;
}

export default function ModelViewer({ url, width = 400, height = 300 }: ModelViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Extract filename from the url or data url
  const getFileName = (url: string) => {
    if (url.startsWith('data:')) {
      // For data URLs, try to extract the filename from the file extension mimetype part
      const match = url.match(/data:model\/(.*?);/);
      if (match && match[1]) {
        return `Model.${match[1]}`;
      }
      return 'Model file';
    }
    
    return url.split('/').pop() || 'Model file';
  };
  
  // Get the file extension
  const getFileType = () => {
    if (!url) return '';
    
    const fileName = url.split('/').pop() || '';
    if (fileName.toLowerCase().endsWith('.glb')) return 'GLB';
    if (fileName.toLowerCase().endsWith('.gltf')) return 'GLTF';
    
    // For data URLs, try to determine from the mimetype
    if (url.startsWith('data:')) {
      if (url.includes('model/gltf-binary')) return 'GLB';
      if (url.includes('model/gltf+json')) return 'GLTF';
    }
    
    return '3D';
  };
  
  useEffect(() => {
    if (!mountRef.current || !url) return;
    
    let isMounted = true;
    setLoading(true);
    setError(null);
    
    // Three.js scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa); // Light background color
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1);
    dirLight1.position.set(1, 2, 3);
    scene.add(dirLight1);
    
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight2.position.set(-1, -1, -1);
    scene.add(dirLight2);
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 5;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = true;
    
    // Load model
    const loader = new GLTFLoader();
    try {
      loader.load(
        url,
        (gltf) => {
          if (!isMounted) return;
          
          const model = gltf.scene;
          
          // Center the model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          // Adjust model position to center
          model.position.x -= center.x;
          model.position.y -= center.y;
          model.position.z -= center.z;
          
          // Adjust camera distance based on model size
          const maxDim = Math.max(size.x, size.y, size.z);
          camera.position.z = maxDim * 2.5;
          
          scene.add(model);
          setLoading(false);
          
          // Animation loop
          const animate = () => {
            if (!isMounted) return;
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
          };
          
          animate();
        },
        undefined,
        (e) => {
          if (!isMounted) return;
          console.error('Error loading 3D model:', e);
          setError('Failed to load 3D model');
          setLoading(false);
        }
      );
    } catch (err) {
      if (isMounted) {
        console.error('Error initializing 3D model viewer:', err);
        setError('Error initializing 3D viewer');
        setLoading(false);
      }
    }
    
    // Cleanup
    return () => {
      isMounted = false;
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [url, width, height]);
  
  if (error || loading) {
    return (
      <div 
        style={{ 
          width, 
          height, 
          margin: '0 auto', 
          position: 'relative',
          border: '1px solid',
          borderColor: 'rgba(201, 159, 116, 0.3)',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: 'rgba(30, 41, 59, 0.05)'
        }}
      >
        <div 
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            textAlign: 'center'
          }}
        >
          <Box className="w-16 h-16 mb-4 text-orange-600 dark:text-orange-400" />
          
          <div className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">
            {getFileType()} Model {loading ? 'Loading...' : error ? 'Error' : 'Preview'}
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {getFileName(url)}
          </div>
          
          <div className="mt-6 rounded-md bg-white dark:bg-navy-900 p-3 border border-orange-100 dark:border-navy-700 max-w-xs">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p className="mb-1"><span className="font-semibold">Size:</span> {url ? Math.round(url.length / 1024) + ' KB' : 'Unknown'}</p>
              <p><span className="font-semibold">Format:</span> {getFileType()}</p>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 text-xs text-red-500">
              {error}
            </div>
          )}
          
          {loading && (
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Loading 3D model...
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div 
      ref={mountRef}
      style={{ 
        width, 
        height, 
        margin: '0 auto', 
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'rgba(30, 41, 59, 0.05)'
      }}
    />
  );
}