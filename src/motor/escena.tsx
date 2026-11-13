// Todo lo que hace falta para un plano: el fondo en 3D (imagen + mapa de profundidad), la proyección para colocar
// muñecos y objetos sobre él, las transiciones (barrido y fundido) y el ambiente que se mueve (nieve, niebla, halos…).
import React, { createContext, useContext } from "react";
import * as THREE from "three";
import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import { Etalonaje, LienzoCine, Toma, V3, aPantalla, camaraDe, respirar, suave } from "./cine";
import { CuadroParallax, EncuadreCuadro, tomaCuadro } from "./parallax";
import { azar, useVariante } from "./variante";

export const ASPECTO = 1536 / 2752; // los fondos son 9:16 (los genera la plantilla a ese tamaño)
export const RELIEVE = 0.22;
// densidad de la malla 3D del fondo: con 200 no se nota diferencia y en un PC sin tarjeta gráfica tarda casi la mitad que con 600
const SEGMENTOS = 200;
export const LIMPIO: Etalonaje = { sombras: [0, 0, 0.012], luces: [0.02, 0.012, 0], saturacion: 1.06, contraste: 1.04, negros: 0, exposicion: 1, vineta: 0.32, aberracion: 0, grano: 0 };

// ---------------------------------------------------------------- fondos cargados
export type Fondos = Record<string, { mapa: THREE.Texture; prof: THREE.Texture }>;
const FondosCtx = createContext<Fondos>({});
export const FondosProvider = FondosCtx.Provider;
export const useFondo = (nombre: string) => {
  const f = useContext(FondosCtx)[nombre];
  if (!f) throw new Error(`Falta el fondo «${nombre}»`);
  return f;
};

// ---------------------------------------------------------------- de la imagen a la pantalla
const puntoCuadro = (u: number, v: number, d: number, toma0: Toma): V3 => {
  const c = new THREE.Vector3(...toma0.pos);
  const p0 = new THREE.Vector3((u - 0.5) * ASPECTO, 0.5 - v, 0);
  const z = d * RELIEVE;
  return p0.sub(c).multiplyScalar((c.z - z) / c.z).add(c).toArray() as V3;
};

/** pro(u, v, d) → píxel de la pantalla (x, y) y px = píxeles por unidad de alto de la imagen en ese punto.
 *  u, v: posición en la imagen (0..1, v hacia abajo); d: profundidad (0 lejos .. 1 cerca, como el mapa). */
export type Proyeccion = (u: number, v: number, d: number) => { x: number; y: number; px: number };
/** Con variante, cada plano se encuadra un poco distinto (un poco más cerca o lejos y algo desplazado). Lo usan a la vez
 *  el fondo y la proyección, así que los muñecos siguen en su sitio. Límites pequeños: las caras no bajan a los subtítulos. */
const useEncuadreVariado = (encuadre: (f: number) => EncuadreCuadro) => {
  const { semilla, plano } = useVariante();
  if (!semilla) return encuadre;
  const dx = (azar(semilla, "x", plano) - 0.5) * 0.04;
  const kz = 0.97 + azar(semilla, "zoom", plano) * 0.07;
  return (g: number) => {
    const e = encuadre(g);
    return { ...e, x: e.x + dx, zoom: e.zoom * kz };
  };
};

export const useProyeccion = (encuadreBase: (f: number) => EncuadreCuadro, mano = 1): Proyeccion => {
  const encuadre = useEncuadreVariado(encuadreBase);
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const toma0 = tomaCuadro(encuadre(0), ASPECTO, width / height);
  const toma = respirar(tomaCuadro(encuadre(f), ASPECTO, width / height), f, mano);
  const cam = camaraDe(toma, width / height);
  return (u, v, d) => {
    const a = aPantalla(puntoCuadro(u, v, d, toma0), cam, width, height);
    const b = aPantalla(puntoCuadro(u, v - 0.05, d, toma0), cam, width, height);
    return { x: a.x, y: a.y, px: (a.y - b.y) / 0.05 };
  };
};

/** Escala de un muñeco de `alto` (en unidades de alto de la imagen) con los pies en el punto proyectado. */
export const escalaMuneco = (p: { px: number }, alto: number) => (p.px * alto) / 430;

export const Fondo: React.FC<{ nombre: string; encuadre: (f: number) => EncuadreCuadro; bloom?: number; desenfoque?: number }> = ({ nombre, encuadre: encuadreBase, bloom = 0.55, desenfoque = 0 }) => {
  const { mapa, prof } = useFondo(nombre);
  const encuadre = useEncuadreVariado(encuadreBase);
  return (
    <AbsoluteFill style={{ filter: desenfoque ? `blur(${desenfoque}px)` : undefined }}>
      <LienzoCine etalonaje={LIMPIO} revelado="ninguno" dof={0} bloom={bloom} umbral={0.72}>
        <CuadroParallax mapa={mapa} prof={prof} aspecto={ASPECTO} encuadre={encuadre} relieve={RELIEVE} segmentos={SEGMENTOS} />
      </LienzoCine>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- transiciones
export type Transicion = "nada" | "barrido" | "fundido";
export const SOLAPE = 5; // medio solape de cada transición (fotogramas)

/** Envuelve un plano: barrido (desenfoque lateral; el plano nuevo aparece en el pico del desenfoque) o fundido. */
// acercón de golpe a mitad de plano: crece desde la raya de arriba de los subtítulos, así ninguna cara baja hasta ellos
export const ACERCON = 1.1;
const EJE_ACERCON = "50% 1265px";

export const Transiciones: React.FC<{ id: string; dur: number; entrada: Transicion; salida: Transicion; golpe?: number; children: React.ReactNode }> = ({ id, dur, entrada, salida, golpe, children }) => {
  const f = useCurrentFrame();
  const O = SOLAPE;
  const sale = salida === "barrido" ? suave(f, dur - 2 * O, dur, Easing.in(Easing.quad)) : 0;
  const entra = entrada === "barrido" ? 1 - suave(f, 0, 2 * O, Easing.out(Easing.quad)) : 0;
  // el empujón lateral va con un poco de zoom para que nunca se vea el borde vacío detrás del plano
  const k = Math.max(sale, entra);
  const desp = sale * -260 + entra * 260;
  const zoom = 1 + k * 0.55;
  const blur = k * 80;
  const opacidad = entrada === "barrido" ? (f >= O ? 1 : 0) : entrada === "fundido" ? suave(f, 0, 2 * O) : 1;
  return (
    <AbsoluteFill style={{ opacity: opacidad, filter: blur > 0.5 ? `url(#${id})` : undefined }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="-20%" y="0" width="140%" height="100%">
          <feGaussianBlur stdDeviation={`${blur} 0`} edgeMode="duplicate" />
        </filter>
      </svg>
      <AbsoluteFill style={{ transform: `translateX(${desp}px) scale(${zoom})` }}>
        <AbsoluteFill style={{ transform: golpe !== undefined && f >= golpe ? `scale(${ACERCON})` : undefined, transformOrigin: EJE_ACERCON }}>{children}</AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- ambiente que se mueve
/** Copos, polvo o chispas que caen (o suben con velocidad negativa). Deterministas. */
export const Copos: React.FC<{ n: number; velocidad: number; color: string; tam: number }> = ({ n, velocidad, color, tam }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height}>
        {Array.from({ length: n }, (_, i) => {
          const s = Math.sin(i * 12.9898) * 43758.5453;
          const a = s - Math.floor(s);
          const b = Math.abs((Math.sin(i * 78.233) * 12345.678) % 1);
          const prof = 0.4 + a * 0.6;
          const y = ((((b * height + f * velocidad * prof * 3) % (height + 40)) + height + 40) % (height + 40)) - 20;
          const x = (a * width + Math.sin(f * 0.04 + i) * 18 * prof + width) % width;
          return <circle key={i} cx={x} cy={y} r={tam * prof} fill={color} opacity={0.35 + prof * 0.45} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** Bancos de niebla o vaho que pasan despacio. */
export const Niebla: React.FC<{ y: number; opacidad: number; color?: string }> = ({ y, opacidad, color = "170,180,230" }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: -900 + ((f * (1.2 + i * 0.5) + i * 520) % 2000),
            top: y + i * 120 - 80,
            width: 1300,
            height: 300,
            borderRadius: "50%",
            background: `radial-gradient(ellipse at center, rgba(${color},0.55), rgba(${color},0) 70%)`,
            opacity: opacidad,
            filter: "blur(30px)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/** Halo de una luz (farola, vela, lámpara) que titila. */
export const Halo: React.FC<{ x: number; y: number; r: number; semilla: number; color?: string }> = ({ x, y, r, semilla, color = "255,200,120" }) => {
  const f = useCurrentFrame();
  const vive = 0.75 + 0.15 * Math.sin(f * 0.9 + semilla) * Math.sin(f * 0.37 + semilla * 2) + 0.1 * Math.sin(f * 2.1 + semilla);
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: 2 * r,
        height: 2 * r,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(${color},0.55), rgba(${color},0.18) 45%, rgba(${color},0) 70%)`,
        mixBlendMode: "screen",
        opacity: vive,
        pointerEvents: "none",
      }}
    />
  );
};

/** Rayitas de impacto (un golpe, un «toc»). t de 0 a 1. */
export const Impacto: React.FC<{ x: number; y: number; t: number; tam: number; color?: string }> = ({ x, y, t, tam, color = "#fff4c8" }) => {
  if (t <= 0 || t >= 1) return null;
  const k = Easing.out(Easing.cubic)(t);
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
      {[-60, -20, 20, 60, 160, 200].map((g, i) => {
        const a = (g * Math.PI) / 180 - Math.PI / 2;
        const r0 = tam * (0.35 + k * 0.4);
        const r1 = r0 + tam * 0.45 * (1 - t);
        return <line key={i} x1={x + Math.cos(a) * r0} y1={y + Math.sin(a) * r0} x2={x + Math.cos(a) * r1} y2={y + Math.sin(a) * r1} stroke={color} strokeWidth={tam * 0.07} strokeLinecap="round" />;
      })}
    </svg>
  );
};

/** Líneas de velocidad radiales (sorpresa). t de 0 a 1. */
export const LineasVelocidad: React.FC<{ cx: number; cy: number; t: number; n?: number }> = ({ cx, cy, t, n = 26 }) => {
  if (t <= 0 || t >= 1) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: Math.sin(t * Math.PI) }}>
      <svg width="100%" height="100%">
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2 + (i % 3) * 0.07;
          const r0 = 380 + ((i * 97) % 160) + t * 60;
          const r1 = r0 + 260 + ((i * 53) % 220);
          return <line key={i} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * r1} y2={cy + Math.sin(a) * r1} stroke="#fff" strokeWidth={3 + (i % 3) * 2} strokeLinecap="round" opacity={0.85} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** Texto escrito EN el escenario (cartel, tiza, etiqueta), colocado con la proyección. */
export const TextoEscena: React.FC<{ x: number; y: number; tam: number; giro?: number; letra?: "tiza" | "cartel"; color?: string; children: React.ReactNode; opacidad?: number }> = ({ x, y, tam, giro = 0, letra = "cartel", color, children, opacidad = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `translate(-50%, -50%) rotate(${giro}deg)`,
      fontFamily: letra === "tiza" ? "Caveat" : "Montserrat",
      fontWeight: letra === "tiza" ? 700 : 900,
      fontSize: tam,
      lineHeight: 1,
      color: color ?? (letra === "tiza" ? "rgba(245,242,235,0.88)" : "#fff"),
      textAlign: "center",
      whiteSpace: "nowrap",
      opacity: opacidad,
      WebkitTextStroke: letra === "cartel" ? `${Math.max(3, tam * 0.1)}px #141018` : undefined,
      paintOrder: "stroke fill",
      textShadow: letra === "tiza" ? "0 0 2px rgba(255,255,255,0.4)" : undefined,
    }}
  >
    {children}
  </div>
);
