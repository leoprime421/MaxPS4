// Kit de cine para las pruebas de géneros (historia, crimen, dinosaurios).
// Todo sale de useCurrentFrame(): nada se anima solo (regla de Remotion).
// - useRecursos: carga lo que haga falta ANTES de montar el lienzo 3D (el render espera).
// - LienzoCine: lienzo 3D con profundidad de campo, brillo y un "etalonaje" final en la GPU
//   (curva, tintes de sombras y luces, saturación, viñeta, aberración y grano de película).
// - TituloCine, Rotulo, Letterbox: textos y acabados 2D encima.
import React, { useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { AbsoluteFill, cancelRender, continueRender, delayRender, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { createContext } from "react";
// densidad de píxeles del lienzo 3D (1 = la del vídeo)
export const CalidadRender = createContext(1);

export type V3 = [number, number, number];
export type Toma = { pos: V3; mira: V3; fov: number; giro?: number };

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const suave = (f: number, a: number, b: number, e: (t: number) => number = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: e });
export const mezcla = (a: number, b: number, t: number) => a + (b - a) * t;
export const mezclaV = (a: V3, b: V3, t: number): V3 => [mezcla(a[0], b[0], t), mezcla(a[1], b[1], t), mezcla(a[2], b[2], t)];

/** Recorrido de cámara por puntos clave (fotograma → toma), con curvas suaves entre ellos. */
export const recorrido = (claves: { f: number; t: Toma }[], f: number): Toma => {
  if (f <= claves[0].f) return claves[0].t;
  for (let i = 0; i < claves.length - 1; i++) {
    const a = claves[i];
    const b = claves[i + 1];
    if (f <= b.f) {
      const t = Easing.inOut(Easing.sin)((f - a.f) / (b.f - a.f));
      return { pos: mezclaV(a.t.pos, b.t.pos, t), mira: mezclaV(a.t.mira, b.t.mira, t), fov: mezcla(a.t.fov, b.t.fov, t), giro: mezcla(a.t.giro ?? 0, b.t.giro ?? 0, t) };
    }
  }
  return claves[claves.length - 1].t;
};

/** Cámara en mano muy leve (determinista: seno de varias frecuencias). */
export const respirar = (t: Toma, f: number, cuanto = 1): Toma => {
  const s = (a: number, b: number) => Math.sin(f * a + b);
  const k = 0.012 * cuanto;
  const d = Math.hypot(t.pos[0] - t.mira[0], t.pos[1] - t.mira[1], t.pos[2] - t.mira[2]);
  return {
    ...t,
    mira: [t.mira[0] + d * k * (s(0.031, 1) + 0.5 * s(0.077, 2)), t.mira[1] + d * k * (s(0.027, 3) + 0.5 * s(0.069, 4)), t.mira[2]],
  };
};

export const camaraDe = (t: Toma, aspecto: number) => {
  const c = new THREE.PerspectiveCamera(t.fov, aspecto, 0.05, 4000);
  c.position.set(...t.pos);
  c.lookAt(...t.mira);
  if (t.giro) c.rotateZ(t.giro);
  c.updateProjectionMatrix();
  c.updateMatrixWorld();
  return c;
};

/** Punto 3D → píxel de la pantalla (y si está delante de la cámara). */
export const aPantalla = (p: V3, cam: THREE.PerspectiveCamera, ancho: number, alto: number) => {
  const v = new THREE.Vector3(...p).project(cam);
  return { x: ((v.x + 1) / 2) * ancho, y: ((1 - v.y) / 2) * alto, delante: v.z < 1 };
};

/** Pone la cámara de R3F en cada fotograma. */
export const CamaraCine: React.FC<{ toma: Toma; cerca?: number; lejos?: number }> = ({ toma, cerca = 0.05, lejos = 4000 }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.fov = toma.fov;
    camera.near = cerca;
    camera.far = lejos;
    camera.position.set(...toma.pos);
    camera.lookAt(...toma.mira);
    if (toma.giro) camera.rotateZ(toma.giro);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    camera.userData.enfoque = Math.hypot(toma.pos[0] - toma.mira[0], toma.pos[1] - toma.mira[1], toma.pos[2] - toma.mira[2]);
  });
  return null;
};

// ---------------- carga de recursos (el render espera) ----------------
const cache = new Map<string, unknown>();
const pendientes = new Map<string, Promise<unknown>>();

/** Carga una vez (por clave) lo que devuelva `cargar`; mientras tanto el render espera. */
export const useRecursos = <T,>(clave: string, cargar: () => Promise<T>): T | null => {
  const [valor, setValor] = useState<T | null>(() => (cache.get(clave) as T) ?? null);
  useEffect(() => {
    if (valor) return;
    const espera = delayRender(`Cargando ${clave}`, { timeoutInMilliseconds: 180000 });
    let p = pendientes.get(clave) as Promise<T> | undefined;
    if (!p) {
      p = cargar();
      pendientes.set(clave, p);
    }
    p.then((v) => {
      cache.set(clave, v);
      setValor(v);
      continueRender(espera);
    }).catch((e) => cancelRender(e));
  }, [clave]);
  return valor;
};

export const cargarTextura = (url: string, color = true, voltear = false) =>
  new THREE.TextureLoader().loadAsync(url).then((t) => {
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.flipY = voltear;
    t.anisotropy = 16;
    t.needsUpdate = true;
    return t;
  });

export const cargarImagen = (url: string) =>
  new Promise<HTMLImageElement>((ok, mal) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => ok(i);
    i.onerror = mal;
    i.src = url;
  });

/** Píxeles de una imagen (RGBA). */
export const pixeles = async (url: string) => {
  const i = await cargarImagen(url);
  const c = document.createElement("canvas");
  c.width = i.width;
  c.height = i.height;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.drawImage(i, 0, 0);
  return { ancho: i.width, alto: i.height, datos: x.getImageData(0, 0, i.width, i.height).data };
};

/** Float32 → textura de medio flotante con filtrado lineal (alturas, tiempos…). */
export const texturaFlotante = (datos: Float32Array, ancho: number, alto: number, canales: 1 | 2 | 4 = 1) => {
  const h = new Uint16Array(datos.length);
  for (let i = 0; i < datos.length; i++) h[i] = THREE.DataUtils.toHalfFloat(datos[i]);
  const formato = canales === 1 ? THREE.RedFormat : canales === 2 ? THREE.RGFormat : THREE.RGBAFormat;
  const t = new THREE.DataTexture(h, ancho, alto, formato, THREE.HalfFloatType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
};

// ---------------- etalonaje (pase final en la GPU) ----------------
export type Etalonaje = {
  sombras: V3; // tinte que se suma en las sombras
  luces: V3; // tinte que se suma en las luces
  saturacion: number;
  contraste: number;
  negros: number; // levanta (+) o aplasta (-) los negros
  exposicion: number;
  vineta: number;
  aberracion: number; // píxeles de separación de color en los bordes
  grano: number;
  barril?: number; // distorsión de objetivo gran angular (cámara de seguridad)
  lineas?: number; // líneas de barrido de monitor
  monocromo?: V3; // si está, la imagen pasa a un solo tono (p. ej. verde de cámara de seguridad)
};

export const ETALONAJES: Record<string, Etalonaje> = {
  // dorado, algo desaturado, negros de sepia: pintura antigua / documental histórico
  historia: { sombras: [0.05, 0.025, -0.01], luces: [0.05, 0.03, -0.02], saturacion: 0.86, contraste: 1.1, negros: 0.025, exposicion: 1.0, vineta: 0.55, aberracion: 1.2, grano: 0.06 },
  // mapa: casi neutro (el mapa ya trae su color), algo de contraste
  mapa: { sombras: [0.02, 0.01, 0.0], luces: [0.02, 0.015, -0.01], saturacion: 0.98, contraste: 1.06, negros: 0.0, exposicion: 1.0, vineta: 0.45, aberracion: 0.6, grano: 0.045 },
  // crimen: sombras verde azuladas, luces de farola de sodio, negros aplastados
  crimen: { sombras: [-0.03, 0.02, 0.05], luces: [0.06, 0.02, -0.04], saturacion: 0.72, contraste: 1.16, negros: -0.02, exposicion: 1.0, vineta: 0.65, aberracion: 1.6, grano: 0.075 },
  // dinosaurios: natural y cálido, verdes algo apagados, bruma
  dino: { sombras: [-0.015, 0.01, 0.03], luces: [0.05, 0.03, -0.015], saturacion: 0.92, contraste: 1.08, negros: 0.01, exposicion: 1.0, vineta: 0.5, aberracion: 0.9, grano: 0.05 },
  // cámara de seguridad: casi monocroma verdosa, mucho grano, líneas y gran angular
  cctv: { sombras: [0, 0.02, 0], luces: [0, 0.03, 0], saturacion: 0.0, contraste: 1.12, negros: 0.06, exposicion: 1.2, vineta: 0.6, aberracion: 2.2, grano: 0.14, barril: 0.12, lineas: 0.09, monocromo: [0.78, 1.0, 0.82] },
};

const SHADER_ETALONAJE = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uSombras: { value: new THREE.Vector3() },
    uLuces: { value: new THREE.Vector3() },
    uSat: { value: 1 },
    uContraste: { value: 1 },
    uNegros: { value: 0 },
    uExpo: { value: 1 },
    uVineta: { value: 0.5 },
    uAberr: { value: 1 },
    uGrano: { value: 0.05 },
    uBarril: { value: 0 },
    uLineas: { value: 0 },
    uMono: { value: new THREE.Vector3() },
    uUsaMono: { value: 0 },
    uSemilla: { value: 0 },
    uTam: { value: new THREE.Vector2(1920, 1080) },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec3 uSombras; uniform vec3 uLuces; uniform float uSat; uniform float uContraste;
    uniform float uNegros; uniform float uExpo; uniform float uVineta; uniform float uAberr; uniform float uGrano; uniform float uSemilla; uniform vec2 uTam;
    uniform float uBarril; uniform float uLineas; uniform vec3 uMono; uniform float uUsaMono;
    varying vec2 vUv;
    float hash(vec2 p){ p = fract(p*vec2(443.897,441.423)); p += dot(p, p.yx+19.19); return fract((p.x+p.y)*p.x); }
    void main(){
      vec2 c0 = vUv - 0.5;
      float r20 = dot(c0*vec2(uTam.x/uTam.y,1.0), c0*vec2(uTam.x/uTam.y,1.0));
      vec2 uv = 0.5 + c0 * (1.0 - uBarril * 0.6 + uBarril * r20) ;
      vec2 c = uv - 0.5;
      float r2 = dot(c*vec2(uTam.x/uTam.y,1.0), c*vec2(uTam.x/uTam.y,1.0));
      vec2 desv = c * (uAberr / uTam.x) * 2.0 * r2;
      vec3 col;
      col.r = texture2D(tDiffuse, uv - desv).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv + desv).b;
      col *= uExpo;
      float l = dot(col, vec3(0.2126,0.7152,0.0722));
      col += uSombras * pow(1.0 - clamp(l,0.0,1.0), 2.0) + uLuces * pow(clamp(l,0.0,1.0), 2.0);
      col = mix(vec3(l), col, uSat);
      col = mix(col, l * uMono, uUsaMono);
      col *= 1.0 - uLineas * (0.5 + 0.5 * sin(vUv.y * uTam.y * 1.6));
      col = (col - 0.5) * uContraste + 0.5;
      col = col + uNegros * (1.0 - col);
      col *= 1.0 - uVineta * smoothstep(0.15, 0.95, r2 * 1.1);
      // grano: más en los medios tonos, cambia en cada fotograma
      float g = hash(vUv * uTam + uSemilla * 17.13) + hash(vUv * uTam * 0.5 + uSemilla * 3.7) - 1.0;
      float lm = clamp(l, 0.0, 1.0);
      col += g * uGrano * (0.35 + lm * (1.0 - lm) * 2.4);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`,
};

// Un brillo especular extremo (charco o cristal muy liso frente a una luz fuerte) desborda el
// búfer de medio flotante (Inf/NaN) y el "bloom" lo esparce en manchas negras: se limpia antes.
const SHADER_LIMPIAR = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      if (any(isnan(c.rgb)) || any(isinf(c.rgb))) c.rgb = vec3(0.0);
      gl_FragColor = vec4(min(c.rgb, vec3(48.0)), c.a);
    }`,
};

// Profundidad de campo que ignora lo transparente (humo, nubes, rayos de luz)
class BokehLimpio extends BokehPass {
  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget, deltaTime?: number, maskActive?: boolean) {
    const ocultos: THREE.Object3D[] = [];
    (this as unknown as { scene: THREE.Scene }).scene.traverseVisible((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (o.userData.sinProfundidad === true || (m && !Array.isArray(m) && !o.userData.enProfundidad && (m.blending === THREE.AdditiveBlending || m.depthWrite === false))) ocultos.push(o);
    });
    for (const o of ocultos) o.visible = false;
    super.render(renderer, writeBuffer, readBuffer, deltaTime ?? 0, maskActive ?? false);
    for (const o of ocultos) o.visible = true;
  }
}

const PosprocesoCine: React.FC<{ dof: number; foco?: number; bloom: number; umbral: number; etalonaje: Etalonaje; semilla: number }> = ({ dof, foco, bloom, umbral, etalonaje, semilla }) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const cadena = useMemo(() => {
    const dpr = gl.getPixelRatio();
    const destino = new THREE.WebGLRenderTarget(size.width * dpr, size.height * dpr, { type: THREE.HalfFloatType, samples: 4 });
    const c = new EffectComposer(gl, destino);
    c.setPixelRatio(dpr);
    c.setSize(size.width, size.height);
    c.addPass(new RenderPass(scene, camera));
    c.addPass(new ShaderPass(SHADER_LIMPIAR));
    const bokeh = new BokehLimpio(scene, camera, { focus: 10, aperture: 0, maxblur: 0.008 });
    c.addPass(bokeh);
    const brillo = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.2 * bloom, 0.6, umbral);
    brillo.enabled = bloom > 0;
    c.addPass(brillo);
    c.addPass(new OutputPass());
    const grado = new ShaderPass(SHADER_ETALONAJE);
    c.addPass(grado);
    return { c, bokeh, grado };
  }, [gl, scene, camera, size.width, size.height, bloom, umbral]);
  useEffect(() => () => cadena.c.dispose(), [cadena]);
  useFrame(() => {
    const f = Math.max(foco ?? (camera.userData.enfoque as number | undefined) ?? 10, 0.3);
    cadena.bokeh.enabled = dof > 0;
    const u = cadena.bokeh.uniforms as Record<string, THREE.IUniform>;
    u.focus.value = f;
    u.aperture.value = (dof * 0.011) / f;
    u.maxblur.value = 0.008 * Math.min(1, dof);
    const g = cadena.grado.uniforms as Record<string, THREE.IUniform>;
    g.uSombras.value.set(...etalonaje.sombras);
    g.uLuces.value.set(...etalonaje.luces);
    g.uSat.value = etalonaje.saturacion;
    g.uContraste.value = etalonaje.contraste;
    g.uNegros.value = etalonaje.negros;
    g.uExpo.value = etalonaje.exposicion;
    g.uVineta.value = etalonaje.vineta;
    g.uAberr.value = etalonaje.aberracion;
    g.uGrano.value = etalonaje.grano;
    g.uBarril.value = etalonaje.barril ?? 0;
    g.uLineas.value = etalonaje.lineas ?? 0;
    g.uUsaMono.value = etalonaje.monocromo ? 1 : 0;
    if (etalonaje.monocromo) g.uMono.value.set(...etalonaje.monocromo);
    g.uSemilla.value = semilla % 97;
    g.uTam.value.set(size.width, size.height);
    cadena.c.render();
  }, 1);
  return null;
};

const REVELADOS = { agx: THREE.AgXToneMapping, aces: THREE.ACESFilmicToneMapping, neutral: THREE.NeutralToneMapping, ninguno: THREE.NoToneMapping } as const;

/** Lienzo 3D de cine: todo lo que va dentro se ve con desenfoque, brillo y etalonaje. */
export const LienzoCine: React.FC<{
  children: React.ReactNode;
  encima?: React.ReactNode;
  dof?: number;
  foco?: number;
  bloom?: number;
  umbral?: number;
  etalonaje?: keyof typeof ETALONAJES | Etalonaje;
  exposicion?: number;
  fondo?: string;
  sombras?: boolean;
  revelado?: "agx" | "aces" | "neutral" | "ninguno"; // curva de la cámara: "ninguno" para mapas y cuadros (color exacto)
}> = ({ children, encima, dof = 0.6, foco, bloom = 1, umbral = 0.85, etalonaje = "historia", exposicion = 1, fondo = "#000", sombras = false, revelado = "agx" }) => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const dpr = useContext(CalidadRender);
  const e = typeof etalonaje === "string" ? ETALONAJES[etalonaje] : etalonaje;
  return (
    <AbsoluteFill style={{ backgroundColor: fondo }}>
      <ThreeCanvas
        width={width}
        height={height}
        dpr={dpr}
        shadows={sombras ? "soft" : false}
        gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: REVELADOS[revelado], toneMappingExposure: exposicion }}
      >
        {children}
        <PosprocesoCine dof={dof} foco={foco} bloom={bloom} umbral={umbral} etalonaje={e} semilla={frame} />
      </ThreeCanvas>
      {encima}
    </AbsoluteFill>
  );
};

// ---------------- 2D encima ----------------
export const Letterbox: React.FC<{ alto?: number; entrada?: number }> = ({ alto = 0.1, entrada = 1 }) => {
  const { height } = useVideoConfig();
  const h = height * alto * entrada;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: h, background: "#000" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: h, background: "#000" }} />
    </AbsoluteFill>
  );
};

/** Fundido a negro de entrada/salida de un plano. */
export const Fundido: React.FC<{ dur: number; entra?: number; sale?: number; children: React.ReactNode; color?: string }> = ({ dur, entra = 12, sale = 12, children, color = "#000" }) => {
  const f = useCurrentFrame();
  const o = Math.min(entra > 0 ? interpolate(f, [0, entra], [0, 1], clamp) : 1, sale > 0 ? interpolate(f, [dur - sale, dur], [1, 0], clamp) : 1);
  return (
    <AbsoluteFill style={{ backgroundColor: color }}>
      <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Título de cine: letras que entran desenfocadas y se abren (tracking), con un brillo que las recorre. */
export const TituloCine: React.FC<{
  texto: string;
  sub?: string;
  desde?: number;
  hasta?: number;
  fuente: string;
  fuenteSub?: string;
  tam?: number;
  color?: string;
  colorSub?: string;
  y?: number;
  espaciado?: number;
  brillo?: boolean;
}> = ({ texto, sub, desde = 0, hasta = 99999, fuente, fuenteSub, tam = 150, color = "#e9d9b0", colorSub = "#cdb98f", y = 0.5, espaciado = 0.18, brillo = true }) => {
  const f = useCurrentFrame() - desde;
  const dur = hasta - desde;
  const entra = suave(f, 0, 40, Easing.out(Easing.cubic));
  const sale = 1 - suave(f, dur - 18, dur, Easing.in(Easing.cubic));
  const o = entra * sale;
  const barrido = interpolate(f, [18, 70], [-30, 130], clamp);
  const subE = suave(f, 22, 55, Easing.out(Easing.cubic)) * sale;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: `${y * 100}%`, transform: "translateY(-50%)", textAlign: "center", width: "100%" }}>
        <div
          style={{
            fontFamily: fuente,
            fontSize: tam,
            fontWeight: 600,
            letterSpacing: `${espaciado + (1 - entra) * 0.25}em`,
            paddingLeft: `${espaciado + (1 - entra) * 0.25}em`,
            color,
            opacity: o,
            filter: `blur(${(1 - entra) * 14}px)`,
            backgroundImage: brillo
              ? `linear-gradient(100deg, ${color} ${barrido - 12}%, #fff7e0 ${barrido}%, ${color} ${barrido + 12}%)`
              : undefined,
            WebkitBackgroundClip: brillo ? "text" : undefined,
            WebkitTextFillColor: brillo ? "transparent" : undefined,
            textShadow: brillo ? undefined : "0 6px 40px rgba(0,0,0,0.6)",
            lineHeight: 1,
          }}
        >
          {texto}
        </div>
        {sub && (
          <div
            style={{
              marginTop: tam * 0.28,
              fontFamily: fuenteSub ?? fuente,
              fontSize: tam * 0.2,
              letterSpacing: "0.45em",
              paddingLeft: "0.45em",
              color: colorSub,
              opacity: subE,
              textShadow: "0 2px 18px rgba(0,0,0,0.75)",
              transform: `translateY(${(1 - subE) * 12}px)`,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

/** Rótulo de documental (lugar y fecha) abajo a la izquierda, con una línea fina que crece. */
export const Rotulo: React.FC<{
  lineas: string[];
  desde: number;
  hasta: number;
  fuente: string;
  fuente2?: string;
  color?: string;
  acento?: string;
  x?: number;
  y?: number;
  tam?: number;
}> = ({ lineas, desde, hasta, fuente, fuente2, color = "#efe3c6", acento = "#c9a45c", x = 110, y = 820, tam = 46 }) => {
  const f = useCurrentFrame() - desde;
  const dur = hasta - desde;
  const e = suave(f, 0, 26, Easing.out(Easing.cubic));
  const s = 1 - suave(f, dur - 16, dur);
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: e * s, pointerEvents: "none" }}>
      <div style={{ width: 120 * e, height: 2, background: acento, marginBottom: 18 }} />
      {lineas.map((l, i) => (
        <div
          key={i}
          style={{
            fontFamily: i === 0 ? fuente : fuente2 ?? fuente,
            fontSize: i === 0 ? tam : tam * 0.55,
            letterSpacing: i === 0 ? "0.08em" : "0.32em",
            color: i === 0 ? color : acento,
            marginTop: i === 0 ? 0 : 10,
            textShadow: "0 3px 22px rgba(0,0,0,0.85)",
            transform: `translateX(${(1 - suave(f, 4 + i * 6, 34 + i * 6, Easing.out(Easing.cubic))) * -18}px)`,
            opacity: suave(f, 4 + i * 6, 30 + i * 6),
          }}
        >
          {l}
        </div>
      ))}
    </div>
  );
};

// ---------------- materiales y geometrías de apoyo ----------------
/** Ruido de valor + fbm en GLSL (para humo, nubes, papel…). */
export const GLSL_RUIDO = /* glsl */ `
  float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float ruido(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y); }
  float fbm(vec2 p){ float v = 0.0; float a = 0.5; mat2 m = mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<6;i++){ v += a*ruido(p); p = m*p; a *= 0.5; } return v; }
  float fbm3(vec2 p){ float v = 0.0; float a = 0.5; mat2 m = mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<3;i++){ v += a*ruido(p); p = m*p; a *= 0.5; } return v; }
`;

/** Partículas (polvo, ascuas, ceniza) deterministas: la posición sale del fotograma en el shader. */
export const Particulas: React.FC<{
  n: number;
  caja: [V3, V3]; // esquina mínima y máxima
  t: number; // segundos
  tam?: number;
  color?: string;
  opacidad?: number;
  deriva?: V3; // unidades por segundo
  remolino?: number;
  brillo?: boolean; // aditivas
  semilla?: number;
  parpadeo?: number;
}> = ({ n, caja, t, tam = 0.05, color = "#fff1d6", opacidad = 0.6, deriva = [0.02, 0.01, 0], remolino = 0.08, brillo = true, semilla = 1, parpadeo = 0.5 }) => {
  const obj = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3);
    const a = new Float32Array(n);
    let s = semilla * 9301 + 49297;
    const r = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let i = 0; i < n; i++) {
      p[i * 3] = r();
      p[i * 3 + 1] = r();
      p[i * 3 + 2] = r();
      a[i] = r();
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aAzar", new THREE.BufferAttribute(a, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: brillo ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uT: { value: 0 },
        uMin: { value: new THREE.Vector3(...caja[0]) },
        uMax: { value: new THREE.Vector3(...caja[1]) },
        uDeriva: { value: new THREE.Vector3(...deriva) },
        uRemolino: { value: remolino },
        uTam: { value: tam },
        uColor: { value: new THREE.Color(color) },
        uOpacidad: { value: opacidad },
        uParpadeo: { value: parpadeo },
        uAltoPantalla: { value: 1080 },
      },
      vertexShader: /* glsl */ `
        uniform float uT; uniform vec3 uMin; uniform vec3 uMax; uniform vec3 uDeriva; uniform float uRemolino; uniform float uTam; uniform float uAltoPantalla;
        attribute float aAzar; varying float vAzar; varying float vBorde;
        void main(){
          vec3 tam = uMax - uMin;
          vec3 q = position * tam + uDeriva * uT + uRemolino * vec3(sin(uT*0.7 + aAzar*40.0), sin(uT*0.9 + aAzar*23.0), cos(uT*0.6 + aAzar*31.0));
          q = mod(q, tam);
          vec3 w = uMin + q;
          // se apagan cerca de los bordes de la caja (así no aparecen de golpe al dar la vuelta)
          vec3 d = min(q, tam - q) / tam;
          vBorde = smoothstep(0.0, 0.08, min(min(d.x, d.y), d.z));
          vAzar = aAzar;
          vec4 mv = modelViewMatrix * vec4(w, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uTam * (0.5 + aAzar) * uAltoPantalla * projectionMatrix[1][1] / -mv.z;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uOpacidad; uniform float uT; uniform float uParpadeo;
        varying float vAzar; varying float vBorde;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float a = smoothstep(0.5, 0.0, d);
          a *= a;
          float tw = 1.0 - uParpadeo + uParpadeo * (0.5 + 0.5 * sin(uT * (1.5 + vAzar * 4.0) + vAzar * 60.0));
          gl_FragColor = vec4(uColor, a * uOpacidad * tw * vBorde);
        }`,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    pts.userData.sinProfundidad = true;
    return pts;
  }, [n, semilla, brillo]);
  const alto = useThree((s) => s.size.height);
  const mat = obj.material as THREE.ShaderMaterial;
  mat.uniforms.uT.value = t;
  mat.uniforms.uTam.value = tam;
  mat.uniforms.uOpacidad.value = opacidad;
  mat.uniforms.uColor.value.set(color);
  mat.uniforms.uMin.value.set(...caja[0]);
  mat.uniforms.uMax.value.set(...caja[1]);
  mat.uniforms.uDeriva.value.set(...deriva);
  mat.uniforms.uAltoPantalla.value = alto;
  return <primitive object={obj} />;
};

/** Humo o niebla: un plano con fbm que se mueve despacio (varios a distintas distancias dan volumen). */
export const Humo: React.FC<{
  pos: V3;
  tam: [number, number];
  t: number;
  color?: string;
  opacidad?: number;
  escala?: number;
  velocidad?: [number, number];
  semilla?: number;
  mirarA?: V3;
  rot?: V3;
  aditivo?: boolean;
  suavidad?: number;
}> = ({ pos, tam, t, color = "#cfc6b8", opacidad = 0.35, escala = 1.6, velocidad = [0.03, 0.012], semilla = 0, mirarA, rot, aditivo = false, suavidad = 0.55 }) => {
  const mesh = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uT: { value: 0 }, uColor: { value: new THREE.Color(color) }, uOpacidad: { value: opacidad }, uEscala: { value: escala }, uVel: { value: new THREE.Vector2(...velocidad) }, uSemilla: { value: semilla }, uSuave: { value: suavidad } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uT; uniform vec3 uColor; uniform float uOpacidad; uniform float uEscala; uniform vec2 uVel; uniform float uSemilla; uniform float uSuave;
        varying vec2 vUv;
        ${GLSL_RUIDO}
        void main(){
          vec2 p = vUv * uEscala * vec2(2.0, 1.0) + uSemilla * 7.31;
          float n = fbm(p + uVel * uT + vec2(fbm(p * 0.7 - uVel.yx * uT * 0.6), 0.0) * 0.6);
          float a = smoothstep(0.5 - uSuave * 0.5, 0.5 + uSuave * 0.5, n);
          vec2 e = min(vUv, 1.0 - vUv);
          a *= smoothstep(0.0, 0.22, e.x) * smoothstep(0.0, 0.22, e.y);
          gl_FragColor = vec4(uColor, a * uOpacidad);
        }`,
    });
    const me = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
    me.userData.sinProfundidad = true;
    me.frustumCulled = false;
    return me;
  }, [aditivo]);
  const u = (mesh.material as THREE.ShaderMaterial).uniforms;
  u.uT.value = t;
  u.uColor.value.set(color);
  u.uOpacidad.value = opacidad;
  u.uEscala.value = escala;
  u.uVel.value.set(...velocidad);
  u.uSemilla.value = semilla;
  u.uSuave.value = suavidad;
  mesh.position.set(...pos);
  mesh.scale.set(tam[0], tam[1], 1);
  if (mirarA) mesh.lookAt(...mirarA);
  else if (rot) mesh.rotation.set(...rot);
  return <primitive object={mesh} />;
};
