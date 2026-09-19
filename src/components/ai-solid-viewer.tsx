"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { buildSolidGeometry, type GeometryExtraction } from "@/lib/geometry-solid";

const VIEWER_HEIGHT = 260;

function makeLabelSprite(text: string, scale: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.font = "bold 40px sans-serif";
    ctx.fillStyle = "#1a1a2e";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 32, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

export function AiSolidViewer({ geometry }: { geometry: GeometryExtraction }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const solid = buildSolidGeometry(geometry);
    if (!solid) return; // бэкенд уже провалидировал параметры, но на всякий случай не рендерим мусор

    const width = container.clientWidth || 300;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / VIEWER_HEIGHT, 0.1, 1000);
    // Размер сцены заранее неизвестен (зависит от base_edge конкретной
    // задачи) — масштабируем позицию камеры/подписей по наибольшей
    // координате построенной модели, а не по фиксированным числам.
    const coords = Object.values(solid.vertices).flatMap(([x, y, z]) => [Math.abs(x), Math.abs(y), Math.abs(z)]);
    const maxCoord = Math.max(1, ...coords);
    camera.position.set(maxCoord * 2, maxCoord * 1.6, maxCoord * 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, VIEWER_HEIGHT);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, maxCoord * 0.3, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(maxCoord * 2, maxCoord * 3, maxCoord);
    scene.add(dirLight);

    // Рёбра как отрезки, а не сплошная непрозрачная поверхность — для
    // учебной диаграммы важнее видеть все точки и рёбра сразу (в т.ч. с
    // обратной стороны фигуры), а не красивую заливку граней.
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x6c25ff });
    const allEdges = [...solid.baseEdges, ...solid.lateralEdges, ...solid.topEdges];
    for (const [a, b] of allEdges) {
      const va = solid.vertices[a];
      const vb = solid.vertices[b];
      if (!va || !vb) continue;
      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...va),
        new THREE.Vector3(...vb),
      ]);
      scene.add(new THREE.Line(lineGeom, lineMaterial));
    }

    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
    for (const [label, pos] of Object.entries(solid.vertices)) {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(maxCoord * 0.02, 12, 12), pointMaterial);
      sphere.position.set(...pos);
      scene.add(sphere);

      const sprite = makeLabelSprite(label, maxCoord * 0.15);
      sprite.position.set(pos[0], pos[1] + maxCoord * 0.08, pos[2]);
      scene.add(sprite);
    }

    let frameId = 0;
    function animate() {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    animate();

    function handleResize() {
      if (!container) return;
      const w = container.clientWidth || 300;
      camera.aspect = w / VIEWER_HEIGHT;
      camera.updateProjectionMatrix();
      renderer.setSize(w, VIEWER_HEIGHT);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [geometry]);

  return (
    <div
      ref={containerRef}
      style={{ height: VIEWER_HEIGHT }}
      className="w-full overflow-hidden rounded-xl border border-border bg-white"
    />
  );
}