// Cuadro o foto en 2.5D: la imagen se levanta en 3D con su mapa de profundidad
// (pruebas/profundidad.py) y la cámara se mueve dentro de ella. Desde la posición inicial
// se ve EXACTAMENTE la imagen original (cada punto se coloca sobre el rayo de la cámara);
// al moverse, lo cercano se desplaza más que lo lejano (paralaje de verdad).
import React, { useMemo } from "react";
import * as THREE from "three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { CamaraCine, Toma } from "./cine";

export type EncuadreCuadro = { x: number; y: number; zoom: number; giro?: number }; // x, y del centro en la imagen (0..1, y hacia abajo)

const FOV = 30;
export const distanciaBase = () => 0.5 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));

/** Encuadre → toma de cámara (el cuadro mide `aspecto` × 1 y está en z = 0). */
export const tomaCuadro = (e: EncuadreCuadro, aspecto: number, pantalla: number): Toma => {
  const zoom = Math.max(e.zoom, pantalla / aspecto + 0.005);
  const mw = aspecto / 2 - pantalla / (2 * zoom);
  const mh = 0.5 - 0.5 / zoom;
  const x = Math.min(Math.max((e.x - 0.5) * aspecto, -mw), mw);
  const y = Math.min(Math.max((0.5 - e.y), -mh), mh);
  const z = distanciaBase() / zoom;
  return { pos: [x, y, z], mira: [x, y, 0], fov: FOV, giro: e.giro ?? 0 };
};

const VERT = /* glsl */ `
  uniform sampler2D uProf; uniform float uRelieve; uniform vec3 uCam0; uniform float uAspecto;
  varying vec2 vUv; varying float vProf;
  void main(){
    vUv = uv;
    float d = texture2D(uProf, uv).r;
    vProf = d;
    vec3 p0 = vec3((uv.x - 0.5) * uAspecto, uv.y - 0.5, 0.0);
    float z = d * uRelieve;
    vec3 p = uCam0 + (p0 - uCam0) * ((uCam0.z - z) / uCam0.z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;

const FRAG = /* glsl */ `
  uniform sampler2D uMapa; uniform float uLuz; uniform vec3 uTinte; uniform float uBrilloCerca;
  varying vec2 vUv; varying float vProf;
  void main(){
    vec3 c = texture2D(uMapa, vUv).rgb;
    c *= uLuz * mix(vec3(1.0), uTinte, 0.5) * (1.0 + uBrilloCerca * (vProf - 0.5));
    gl_FragColor = vec4(c, 1.0);
  }`;

export const CuadroParallax: React.FC<{
  mapa: THREE.Texture;
  prof: THREE.Texture;
  aspecto: number;
  encuadre: (f: number) => EncuadreCuadro;
  relieve?: number;
  luz?: (f: number) => number;
  tinte?: string;
  brilloCerca?: number; // lo cercano un poco más claro (luz que "sale" del cuadro)
  segmentos?: number;
  children?: React.ReactNode;
}> = ({ mapa, prof, aspecto, encuadre, relieve = 0.2, luz, tinte = "#ffffff", brilloCerca = 0, segmentos = 600, children }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const pantalla = width / height;
  const toma0 = tomaCuadro(encuadre(0), aspecto, pantalla);
  const toma = tomaCuadro(encuadre(f), aspecto, pantalla);
  const mesh = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1, segmentos, Math.round(segmentos / aspecto));
    const m = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uMapa: { value: mapa },
        uProf: { value: prof },
        uRelieve: { value: relieve },
        uCam0: { value: new THREE.Vector3(...toma0.pos) },
        uAspecto: { value: aspecto },
        uLuz: { value: 1 },
        uTinte: { value: new THREE.Color(tinte) },
        uBrilloCerca: { value: brilloCerca },
      },
    });
    // la posición sale de las uv en el shader (v = 1 arriba, como la textura con flipY)
    const me = new THREE.Mesh(g, m);
    me.frustumCulled = false;
    return me;
  }, [mapa, prof, aspecto, segmentos]);
  const u = (mesh.material as THREE.ShaderMaterial).uniforms;
  u.uRelieve.value = relieve;
  u.uCam0.value.set(...toma0.pos);
  u.uLuz.value = luz ? luz(f) : 1;
  u.uTinte.value.set(tinte);
  u.uBrilloCerca.value = brilloCerca;
  return (
    <>
      <CamaraCine toma={toma} cerca={0.01} lejos={50} />
      <primitive object={mesh} />
      {children}
    </>
  );
};
