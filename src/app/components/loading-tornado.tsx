import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import * as THREE from "three";

interface LoadingTornadoProps {
  onComplete: () => void;
}

const vertexShader = `
  #define PI 3.14159265359

  uniform float u_time;
  uniform float u_height;
  uniform float u_density;
  uniform float u_curl;
  uniform vec2 u_wind;

  varying float vStripes;
  varying float vOpacity;

  vec2 random2(vec2 p) {
    return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
  }

  float voronoi(vec2 _uv, float time){
    vec2 i_uv = floor(_uv);
    vec2 f_uv = fract(_uv);
    float min_dist = 2.;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 tile_offset = vec2(float(i), float(j));
        vec2 cell_center = .5 + .5 * sin(time * .5 + PI * 2. * random2(i_uv + tile_offset));
        float dist = length(tile_offset + cell_center - f_uv);
        min_dist = min(min_dist, dist);
      }
    }
    return pow(min_dist, 2.);
  }

  mat2 rotate2d(float angle) {
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  }

  float cubic_pulse_shape(float center, float width, float x) {
    x = abs(x - center);
    if (x > width) return 0.;
    x /= width;
    return 1. - x * x * (3. - 2. * x);
  }

  float cone_shape(float x) {
    return .5 * cos(x * 3.1 + 2.6) + .5 + exp(-12. * x);
  }

  void main() {
    vec3 pos = position;
    float y_factor = uv.x;

    // Less visible on right and back
    float vertical_transparency = pow(3. * y_factor * (1. - y_factor), 2.5);
    float back_transparency = pow(pos.x + 1., 2.) * pow(pos.z + 1., 2.);
    vOpacity = vertical_transparency * back_transparency;

    // Spiral stuff over the cylinder
    vec2 voronoi_point = vec2(atan(pos.x, pos.z) - pos.y * u_curl, pos.y - u_time);
    float bumps = voronoi(u_density * voronoi_point, u_time);
    vec3 pos_no_bump = pos;
    pos -= (normal * .2 * bumps);
    vStripes = length(pos_no_bump - pos);

    // Shaping the cylinder
    float cone = cone_shape(y_factor);
    pos.x *= cone;
    pos.z *= cone;
    pos.y *= u_height;

    // Add slight constant rotation for central part
    vec2 wind = vec2(.04, 0.);
    wind = rotate2d(u_time * 2.) * wind;
    pos += (vec3(wind.x, 0., wind.y) * (1. - cone));

    // Make the central part to follow the mouse
    wind += u_wind;
    pos += vec3(wind.x, 0., wind.y) * cubic_pulse_shape(.35, .8, y_factor);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
  }
`;

const fragmentShader = `
  varying float vStripes;
  varying float vOpacity;

  void main() {
      gl_FragColor = vec4(vec3(vStripes * 15.), vOpacity);
  }
`;

export function LoadingTornado({ onComplete }: LoadingTornadoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasParentRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [isEntering, setIsEntering] = useState(false);
  const isEnteringRef = useRef(false);

  // Dynamic color configuration mirroring the climate severity scale
  const progressRatio = progress / 100;
  const themeColor =
    progress < 25
      ? "#4FC3F7" // Stable
      : progress < 50
      ? "#FFB74D" // Elevated
      : progress < 75
      ? "#FF7043" // Critical
      : "#E53935"; // Extreme

  // Animate the progress percentage loader
  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      // Simulate micro loading speed variance
      const step = Math.floor(Math.random() * 4) + 1;
      current = Math.min(current + step, 100);
      setProgress(current);

      if (current >= 100) {
        clearInterval(interval);
      }
    }, 80);

    return () => clearInterval(interval);
  }, []);

  // WebGL Three.js implementation
  useEffect(() => {
    const container = canvasParentRef.current;
    if (!container) return;

    // 1. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 2. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      1,
      1000
    );
    camera.position.set(0, 0.35, 3.5);
    camera.lookAt(0, 0, 0);

    const rotationY = -0.4 * Math.PI;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(0, 0);
    const mouseTarget = new THREE.Vector2(0, 0);
    const clock = new THREE.Timer();

    // 3. Environment (Floor Plane for Raycasting)
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, visible: false });
    const floorGeometry = new THREE.PlaneGeometry(2000, 1000);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.set(0, -2, 0);
    floor.rotation.set(-0.2 * Math.PI, 0, 0);
    scene.add(floor);

    // 4. Shader Material & Vortex Geometry Setup
    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_height: { value: 0.1 }, // starts small
        u_density: { value: 1.0 },
        u_curl: { value: 4.0 },
        u_wind: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
    });

    const curve = new THREE.LineCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0)
    );
    const geometry = new THREE.TubeGeometry(curve, 512, 0.28, 512, false);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, -0.65, 0);
    mesh.rotation.set(0, rotationY, 0);
    scene.add(mesh);

    // 5. Interaction Handlers
    const updateMousePosition = (eX: number, eY: number) => {
      const rect = container.getBoundingClientRect();
      const x = eX - rect.left;
      const y = eY - rect.top;
      mouseTarget.x = (x / rect.width) * 2 - 1;
      mouseTarget.y = -(y / rect.height) * 2 + 1;
    };

    const onMouseMove = (e: MouseEvent) => {
      updateMousePosition(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateMousePosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    // 6. Resize handler
    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // 7. Animation Loop
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Keep track of current loading progress to dynamically shape the tornado
      const currentProgressRatio = progressRef.current / 100;

      // Animate uniforms: height grows, curl tightens, density expands
      clock.update();
      material.uniforms.u_time.value = 1.3 * clock.getElapsed();
      material.uniforms.u_height.value = 0.1 + currentProgressRatio * 0.55; // scale up to 0.65
      material.uniforms.u_density.value = 1.2 + currentProgressRatio * 1.3; // scale up to 2.5
      material.uniforms.u_curl.value = 4.0 + currentProgressRatio * 8.0; // scale up to 12.0

      // Mouse damping and physics raycasting
      mouse.x += (mouseTarget.x - mouse.x) * 0.1;
      mouse.y += (mouseTarget.y - mouse.y) * 0.1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(floor);
      if (intersects.length) {
        const uv = intersects[0].uv;
        if (uv) {
          material.uniforms.u_wind.value = new THREE.Vector2(uv.x - 0.5, 0.5 - uv.y)
            .rotateAround(new THREE.Vector2(0, 0), rotationY)
            .multiplyScalar(200);
        }
      }

      renderer.render(scene, camera);
    };

    // Keep ref to avoid recreating effect when progress changes
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);

      floorGeometry.dispose();
      floorMaterial.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync ref to read progress in standard animation loop
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Auto transition to main dashboard when loading hits 100%
  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(() => {
        handleEnter();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [progress]);

  // Handle entry transition into dashboard
  const handleEnter = () => {
    if (isEnteringRef.current) return;
    isEnteringRef.current = true;
    setIsEntering(true);

    // Simple quick fade out
    gsap.to(containerRef.current, {
      opacity: 0,
      duration: 0.4,
      ease: "power1.out",
      onComplete: onComplete,
    });
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black text-white font-sans overflow-hidden select-none"
      style={{ position: "fixed" }}
    >
      {/* 3D WebGL Tornado Canvas Container */}
      <div
        ref={canvasParentRef}
        className="absolute inset-0 z-0 pointer-events-auto opacity-80"
      />

      {/* Centered Minimal Subtitle Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none mt-32">
        <h1 className="font-orbitron text-[9px] sm:text-[10px] tracking-[0.45em] font-medium text-white/40 uppercase">
          WELCOME TO THE DATA TORNADO
        </h1>
      </div>
    </div>
  );
}
