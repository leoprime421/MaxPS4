// IDEA 5 · El hielo que viajó a la India (Boston → Calcuta, 1833). Fondos: lago, barco, calcuta.
// Guion: Guiones/5 - El hielo que viajó a la India.txt
import React from "react";
import { Easing, useCurrentFrame } from "remotion";
import { suave } from "../motor/cine";
import { EncuadreCuadro } from "../motor/parallax";
import { Copos, Fondo, Impacto, LineasVelocidad, Niebla, TextoEscena, escalaMuneco, useProyeccion } from "../motor/escena";
import { LINEA, LUZ_ATARDECER, LUZ_DIA, Luz, Muneco, Personaje, TINTA } from "../motor/muneco";
import { useVoz } from "../motor/voz";
import { IdeaDef } from "../motor/video";

// ---------------------------------------------------------------- personajes y luces
const COMERCIANTE: Personaje = { ropa: "#34406e", ropaOscura: "#262f55", botones: "#e2b45a", bufanda: "#e9dcb0", sombrero: "chistera", colorSombrero: "#24242e", bigote: "#5b3a26", pelo: "#5b3a26" };
const VECINO: Personaje = { ropa: "#8a5a3a", ropaOscura: "#6d4529", botones: "#d9c08a", sombrero: "bombin", colorSombrero: "#3a3030", bufanda: "#3f6b8f" };
const VECINA: Personaje = { ropa: "#a8455a", ropaOscura: "#86344a", vestido: "#8c3a4e", pelo: "#6b3a22", moño: true };
const OBRERO: Personaje = { ropa: "#6d7d8f", ropaOscura: "#55647a", rayas: "#56657a", sombrero: "gorra", colorSombrero: "#4a3a30", bufanda: "#b8483a" };
const MARINERO: Personaje = { ropa: "#f2f0ea", rayas: "#2f5d9a", sombrero: "gorro", colorSombrero: "#2f5d9a", piel: "#f2d7bd" };
const LOCAL_1: Personaje = { ropa: "#e0a030", ropaOscura: "#c08420", piel: "#c98e5e", pelo: "#1e1612" };
const LOCAL_2: Personaje = { ropa: "#2a8a7a", ropaOscura: "#1f6c60", piel: "#a8704a", pelo: "#1e1612", vestido: "#c04a7a", moño: true };
const LOCAL_3: Personaje = { ropa: "#d0503a", ropaOscura: "#a83e2c", piel: "#b67c52", pelo: "#1e1612", bigote: "#1e1612" };

const LUZ_FRIO: Luz = { tinte: [0.86, 0.93, 1.0], borde: "#e8f4ff", lado: -1, fuerza: 0.45 };
const LUZ_SOL: Luz = { ...LUZ_DIA, tinte: [1.0, 0.95, 0.84], borde: "#ffd27a", lado: -1, fuerza: 0.55 };
const lineal = (x: number) => x;

// ---------------------------------------------------------------- objetos
/** Bloque de hielo con contorno de tinta. (x, y) = centro de la base en píxeles; w = ancho; derrite 0..1. */
const Bloque: React.FC<{ x: number; y: number; w: number; derrite?: number; serrin?: number }> = ({ x, y, w, derrite = 0, serrin = 0 }) => {
  const f = useCurrentFrame();
  const h = w * 0.72 * (1 - derrite * 0.5);
  const ww = w * (1 - derrite * 0.25);
  const lin = Math.max(2, w * 0.035);
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} width={1} height={1}>
      <g transform={`translate(${x} ${y})`} strokeLinejoin="round">
        {derrite > 0 && <ellipse cx={0} cy={0} rx={ww * (0.6 + derrite * 0.5)} ry={w * 0.08 * (0.5 + derrite)} fill="rgba(150,210,255,0.55)" stroke="rgba(20,16,24,0.5)" strokeWidth={lin * 0.6} />}
        <rect x={-ww / 2} y={-h} width={ww} height={h} rx={w * 0.08} fill="#bfe6ff" stroke={TINTA} strokeWidth={lin} />
        <path d={`M ${-ww / 2 + w * 0.08} ${-h + w * 0.06} L ${ww / 2 - w * 0.12} ${-h + w * 0.06}`} stroke="#ffffff" strokeWidth={lin * 1.4} strokeLinecap="round" opacity={0.9} />
        <path d={`M ${-ww / 2 + w * 0.1} ${-h * 0.75} L ${-ww / 2 + w * 0.1} ${-h * 0.25}`} stroke="#ffffff" strokeWidth={lin} strokeLinecap="round" opacity={0.7} />
        <path d={`M ${ww / 2 - w * 0.15} ${-h * 0.5} L ${ww / 2 - w * 0.3} ${-h * 0.3}`} stroke="#8fc6ea" strokeWidth={lin * 0.8} strokeLinecap="round" />
        {serrin > 0 &&
          Array.from({ length: 22 }, (_, i) => {
            const s = Math.sin(i * 91.7) * 1000;
            const a = s - Math.floor(s);
            const b = Math.abs(Math.sin(i * 17.3));
            return <circle key={i} cx={-ww / 2 + w * 0.08 + a * (ww - w * 0.16)} cy={-h + w * 0.04 + b * h * 0.35 * serrin} r={w * 0.025} fill="#b98a4e" opacity={Math.min(1, serrin * 2)} />;
          })}
        {derrite > 0 &&
          [0, 1, 2].map((i) => {
            const k = (((f * 0.07 + i / 3) % 1) + 1) % 1;
            return <ellipse key={i} cx={-ww * 0.3 + i * ww * 0.3} cy={-h * 0.15 + k * h * 0.2} rx={w * 0.03} ry={w * 0.045} fill="#9fd4ff" stroke={TINTA} strokeWidth={lin * 0.5} opacity={1 - k} />;
          })}
      </g>
    </svg>
  );
};

/** Caja de madera para el barco. (x, y) = centro de la base. */
const Caja: React.FC<{ x: number; y: number; w: number }> = ({ x, y, w }) => {
  const lin = Math.max(2, w * 0.035);
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} width={1} height={1}>
      <g transform={`translate(${x} ${y})`} strokeLinejoin="round">
        <rect x={-w / 2} y={-w * 0.8} width={w} height={w * 0.8} rx={w * 0.04} fill="#b07a44" stroke={TINTA} strokeWidth={lin} />
        <path d={`M ${-w / 2} ${-w * 0.8} L ${w / 2} 0 M ${w / 2} ${-w * 0.8} L ${-w / 2} 0`} stroke="#8a5a2e" strokeWidth={lin * 1.3} />
        <rect x={-w / 2} y={-w * 0.8} width={w} height={w * 0.8} rx={w * 0.04} fill="none" stroke={TINTA} strokeWidth={lin} />
      </g>
    </svg>
  );
};

/** Bocadillo de pensamiento con una palmera, un sol y un bloque de hielo (la India). */
const Pensamiento: React.FC<{ x: number; y: number; tam: number; t: number }> = ({ x, y, tam, t }) => {
  if (t <= 0) return null;
  const k = Easing.out(Easing.back(1.8))(Math.min(1, t));
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} width={1} height={1}>
      <g transform={`translate(${x} ${y}) scale(${(k * tam) / 100})`} strokeLinejoin="round">
        <circle cx={-70} cy={60} r={9} fill="#fff" stroke={TINTA} strokeWidth={4} />
        <circle cx={-45} cy={35} r={14} fill="#fff" stroke={TINTA} strokeWidth={4} />
        <ellipse cx={20} cy={-40} rx={100} ry={72} fill="#fff" stroke={TINTA} strokeWidth={5} />
        <circle cx={60} cy={-75} r={16} fill="#ffcf4a" stroke={TINTA} strokeWidth={4} />
        <path d="M -40 10 L -48 -55" stroke="#8a5a2e" strokeWidth={9} strokeLinecap="round" />
        <path d="M -48 -55 q 30 -20 55 0 M -48 -55 q -30 -22 -52 2 M -48 -55 q 10 -30 38 -32 M -48 -55 q -16 -30 -40 -28" stroke="#2e8a4a" strokeWidth={10} fill="none" strokeLinecap="round" />
        <path d="M -60 12 Q 20 2 90 14" stroke="#e0b060" strokeWidth={8} fill="none" strokeLinecap="round" />
        <rect x={30} y={-30} width={36} height={28} rx={4} fill="#bfe6ff" stroke={TINTA} strokeWidth={4} />
      </g>
    </svg>
  );
};

/** Sierra de hielo (en la mano del obrero; coordenadas locales de la mano). */
const SIERRA = (
  <g>
    <rect x={-12} y={-18} width={24} height={36} rx={6} fill="#8a5a2e" stroke={TINTA} strokeWidth={5} />
    <g transform="scale(1.5)">
    <path d="M 0 18 L 0 190" stroke={TINTA} strokeWidth={16} strokeLinecap="round" />
    <path d="M 0 18 L 0 190" stroke="#c9ced6" strokeWidth={8} strokeLinecap="round" />
    {Array.from({ length: 8 }, (_, i) => (
      <path key={i} d={`M 6 ${30 + i * 20} l 12 6 l -12 6`} fill="#c9ced6" stroke={TINTA} strokeWidth={3} />
    ))}
    </g>
  </g>
);

/** Corona de hielo (x, y = centro de la base; w = ancho). */
const Corona: React.FC<{ x: number; y: number; w: number }> = ({ x, y, w }) => {
  const f = useCurrentFrame();
  const lin = Math.max(3, w * 0.035);
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} width={1} height={1}>
      <g transform={`translate(${x} ${y})`} strokeLinejoin="round">
        <path d={`M ${-w / 2} 0 L ${-w / 2} ${-w * 0.45} L ${-w / 4} ${-w * 0.2} L 0 ${-w * 0.55} L ${w / 4} ${-w * 0.2} L ${w / 2} ${-w * 0.45} L ${w / 2} 0 Z`} fill="#bfe6ff" stroke={TINTA} strokeWidth={lin} />
        <path d={`M ${-w / 2 + w * 0.08} ${-w * 0.08} L ${w / 2 - w * 0.08} ${-w * 0.08}`} stroke="#fff" strokeWidth={lin} strokeLinecap="round" />
        {[-w / 2, 0, w / 2].map((cx, i) => (
          <circle key={i} cx={cx} cy={i === 1 ? -w * 0.55 : -w * 0.45} r={w * 0.06} fill="#e8f7ff" stroke={TINTA} strokeWidth={lin * 0.7} />
        ))}
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + f * 0.05;
          const r = w * (0.7 + 0.08 * Math.sin(f * 0.3 + i));
          const s = w * 0.07 * (0.6 + 0.4 * Math.sin(f * 0.4 + i * 2));
          return <path key={i} transform={`translate(${Math.cos(a) * r} ${-w * 0.3 + Math.sin(a) * r * 0.5})`} d={`M 0 ${-s} L ${s * 0.3} 0 L 0 ${s} L ${-s * 0.3} 0 Z M ${-s} 0 L 0 ${s * 0.3} L ${s} 0 L 0 ${-s * 0.3} Z`} fill="#fff" />;
        })}
      </g>
    </svg>
  );
};

/** Sol abrasador: halo que late arriba a la izquierda. */
const Calor: React.FC<{ fuerza: number }> = ({ fuerza }) => {
  const f = useCurrentFrame();
  const late = 0.85 + 0.15 * Math.sin(f * 0.25);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(circle at 28% 6%, rgba(255,240,180,0.95), rgba(255,190,90,0.45) 25%, rgba(255,150,60,0.12) 55%, rgba(255,150,60,0) 75%)",
        mixBlendMode: "screen",
        opacity: fuerza * late,
        pointerEvents: "none",
      }}
    />
  );
};

// ---------------------------------------------------------------- planos
// 1. El lago helado: «un comerciante de Boston tuvo una idea que todos llamaron locura». Los vecinos se ríen.
const Locura: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.5, y: 0.47 + t * 0.03, zoom: 1.06 + t * 0.14 };
  };
  const pro = useProyeccion(encuadre);
  const risa = E("locura");
  const rie = f >= risa - 4;
  const sacude = rie ? Math.sin(f * 1.4) * 6 : 0;
  // abajo del todo: las caras quedan por debajo de los subtítulos
  const yo = pro(0.5, 0.955, 0.9);
  const v1 = pro(0.24, 0.96, 0.9);
  const v2 = pro(0.76, 0.96, 0.9);
  const bloque = pro(0.63, 0.955, 0.9);
  const ja = suave(f, risa, risa + 6);
  return (
    <>
      <Fondo nombre="lago" encuadre={encuadre} bloom={0.45} />
      <Niebla y={950} opacidad={0.3} color="230,240,255" />
      <Bloque x={bloque.x} y={bloque.y} w={bloque.px * 0.09} />
      <Muneco id="l1a" x={v1.x} y={v1.y - (rie ? Math.abs(sacude) : 0)} escala={escalaMuneco(v1, 0.24)} personaje={VECINO} luz={LUZ_FRIO} pose={{ cara: rie ? "feliz" : "normal", parpadeo: 12, mira: 1, manoB: rie ? { x: 120, y: -220 } : null }} />
      <Muneco id="l1b" x={v2.x} y={v2.y - (rie ? Math.abs(sacude) * 0.8 : 0)} escala={escalaMuneco(v2, 0.23)} personaje={VECINA} luz={LUZ_FRIO} pose={{ cara: rie ? "feliz" : "normal", parpadeo: 33, mira: -1, manoA: rie ? { x: -120, y: -220 } : null }} />
      <Muneco id="l1c" x={yo.x} y={yo.y} escala={escalaMuneco(yo, 0.26)} personaje={COMERCIANTE} luz={LUZ_FRIO} pose={{ cara: rie ? "chulo" : "normal", parpadeo: 50, habla: f > E("tuvo") && f < risa }} />
      {[v1, v2].map((v, i) => (
        <TextoEscena key={i} x={v.x + (i ? -1 : 1) * v.px * 0.03} y={v.y - v.px * 0.37 - ja * 14} tam={v.px * 0.032} giro={i ? 8 : -8} opacidad={ja}>
          ¡JA, JA!
        </TextoEscena>
      ))}
      <Copos n={60} velocidad={0.9} color="#ffffff" tam={4} />
    </>
  );
};

// 2. Más cerca: «vender hielo en la India». Levanta un bloque y sueña con palmeras.
const Sueno: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.5 - t * 0.02, y: 0.66, zoom: 1.4 + t * 0.15 };
  };
  const pro = useProyeccion(encuadre, 0.7);
  const yo = pro(0.38, 0.93, 0.88);
  const esc = escalaMuneco(yo, 0.3);
  const sube = suave(f, 0, 10, Easing.out(Easing.back(1.4)));
  const bloqueMano = { x: 170, y: -250 - sube * 60 };
  const india = E("India");
  return (
    <>
      <Fondo nombre="lago" encuadre={encuadre} bloom={0.45} />
      <Muneco
        id="l2"
        x={yo.x}
        y={yo.y}
        escala={esc}
        personaje={COMERCIANTE}
        luz={LUZ_FRIO}
        pose={{
          cara: f >= india ? "feliz" : "chulo",
          parpadeo: 8,
          manoB: bloqueMano,
          enMano: (
            <g transform="translate(0 -6)">
              <rect x={-60} y={-100} width={120} height={90} rx={10} fill="#bfe6ff" stroke={TINTA} strokeWidth={LINEA} />
              <path d="M -46 -88 L 36 -88" stroke="#fff" strokeWidth={9} strokeLinecap="round" />
            </g>
          ),
        }}
      />
      <Pensamiento x={Math.min(yo.x + esc * 330, 1080 - esc * 180)} y={Math.max(yo.y - esc * 560, esc * 170)} tam={esc * 150} t={(f - E("hielo") + 4) / 8} />
      <Copos n={50} velocidad={0.9} color="#ffffff" tam={5} />
    </>
  );
};

// 3. «Cortó bloques de lagos helados, los tapó con serrín»: el obrero sierra y se apilan bloques con serrín.
const Cortar: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.46 + t * 0.06, y: 0.66, zoom: 1.35 + t * 0.15 };
  };
  const pro = useProyeccion(encuadre, 0.8);
  const obrero = pro(0.28, 0.9, 0.86);
  const esc = escalaMuneco(obrero, 0.3);
  const sierra = Math.sin(f * 0.7) * 26;
  const b0 = E("bloques");
  const serrin = suave(f, E("serrín") - 2, E("serrín") + 14, lineal);
  const pila = [
    { u: 0.6, aparece: b0 },
    { u: 0.74, aparece: b0 + 5 },
    { u: 0.67, aparece: b0 + 10 },
  ];
  return (
    <>
      <Fondo nombre="lago" encuadre={encuadre} bloom={0.45} />
      <Muneco id="l3" x={obrero.x} y={obrero.y} escala={esc} personaje={OBRERO} luz={LUZ_FRIO} pose={{ cara: "enfadado", parpadeo: 21, manoA: { x: 60, y: -170 + sierra }, manoB: { x: 110, y: -150 + sierra }, enMano: SIERRA }} />
      {pila.map((b, i) => {
        const p = pro(b.u, 0.92, 0.86);
        const k = Easing.out(Easing.back(2))(suave(f, b.aparece, b.aparece + 6, lineal));
        const w = p.px * 0.12;
        if (k <= 0) return null;
        // el bloque de arriba se apoya sobre los dos de abajo
        const y = i === 2 ? p.y - w * 0.72 : p.y;
        return <Bloque key={i} x={p.x} y={y + (1 - k) * -40} w={w * Math.min(1, k)} serrin={serrin} />;
      })}
      <Copos n={50} velocidad={0.9} color="#ffffff" tam={4} />
    </>
  );
};

// 4. El barco: «los metió en un barco. Ciento ochenta toneladas». Cajas apiladas con la etiqueta «180 T».
const Carga: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.5, y: 0.66 - t * 0.04, zoom: 1.12 + t * 0.22 };
  };
  const pro = useProyeccion(encuadre);
  const yo = pro(0.27, 0.92, 0.9);
  const marinero = pro(0.82, 0.9, 0.88);
  const ciento = E("Ciento");
  const etiqueta = suave(f, ciento, ciento + 8, Easing.out(Easing.back(2)));
  const cajas = [
    { u: 0.44, arriba: false },
    { u: 0.58, arriba: false },
    { u: 0.51, arriba: true },
  ];
  const base = pro(0.51, 0.9, 0.88);
  const w = base.px * 0.13;
  return (
    <>
      <Fondo nombre="barco" encuadre={encuadre} bloom={0.6} />
      <Calor fuerza={0.35} />
      {cajas.map((c, i) => {
        const p = pro(c.u, 0.9, 0.88);
        const entra = suave(f, i * 5, i * 5 + 8, Easing.out(Easing.back(1.5)));
        return <Caja key={i} x={p.x} y={(c.arriba ? p.y - w * 0.8 : p.y) - (1 - entra) * 300} w={w} />;
      })}
      <Muneco id="b4a" x={yo.x} y={yo.y} escala={escalaMuneco(yo, 0.33)} personaje={COMERCIANTE} luz={LUZ_SOL} pose={{ cara: f >= ciento ? "feliz" : "normal", parpadeo: 14, mira: 1 }} />
      <Muneco id="b4b" x={marinero.x} y={marinero.y} escala={escalaMuneco(marinero, 0.31)} personaje={MARINERO} luz={LUZ_SOL} pose={{ cara: f >= ciento ? "susto" : "normal", parpadeo: 40, mira: -1, salto: f >= ciento ? Math.max(0, 1 - (f - ciento) / 6) : 0 }} />
      <TextoEscena x={base.x + w * 0.55} y={base.y - w * 3.0} tam={w * 0.48 * Math.max(0.01, etiqueta)} giro={-4} opacidad={Math.min(1, etiqueta * 2)}>
        180 T
      </TextoEscena>
      <Impacto x={base.x + w * 0.55} y={base.y - w * 3.0} t={(f - ciento) / 9} tam={w * 1.2} color="#ffffff" />
    </>
  );
};

// 5. «Cuatro meses de viaje cruzando el ecuador»: sol abrasador, el bloque se derrite y la cuenta baja.
const Ecuador: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.5 + t * 0.02, y: 0.64, zoom: 1.28 + t * 0.12 };
  };
  const pro = useProyeccion(encuadre, 0.7);
  const t = suave(f, 4, dur - 4, lineal);
  const yo = pro(0.31, 0.9, 0.9);
  const bloque = pro(0.71, 0.92, 0.9);
  const cuenta = Math.round(180 - 70 * t);
  const w = bloque.px * 0.13;
  return (
    <>
      <Fondo nombre="barco" encuadre={encuadre} bloom={0.75} />
      <Calor fuerza={0.85} />
      <Niebla y={700} opacidad={0.25} color="255,210,150" />
      <Bloque x={bloque.x} y={bloque.y} w={w} derrite={t} />
      <TextoEscena x={bloque.x} y={bloque.y - w * 2.5} tam={w * 0.36} giro={3}>
        {cuenta} T
      </TextoEscena>
      <Muneco id="b5" x={yo.x} y={yo.y} escala={escalaMuneco(yo, 0.3)} personaje={COMERCIANTE} luz={LUZ_SOL} pose={{ cara: t > 0.4 ? "susto" : "triste", parpadeo: 25, mira: 1, gota: ((f % 30) / 30) * Math.min(1, t * 3), manoA: { x: -90, y: -380 } }} />
    </>
  );
};

// 6. Calcuta: «¿Cuánto llegó? Cien toneladas. Y en Calcuta se lo quitaron de las manos».
const Calcuta: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const cien = E("Cien");
  const corre = E("Calcuta");
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    const gira = suave(g, corre - 6, corre + 20);
    return { x: 0.4 + gira * 0.18, y: 0.68, zoom: 1.3 + t * 0.12 };
  };
  const pro = useProyeccion(encuadre);
  const yo = pro(0.17, 0.94, 0.9);
  const etiqueta = suave(f, cien, cien + 8, Easing.out(Easing.back(2)));
  const pila = [0.47, 0.57, 0.52];
  const quitan = E("quitaron");
  const llegan = suave(f, corre - 2, quitan + 6, lineal);
  const locales = [
    { p: LOCAL_1, u: 1.0 - llegan * 0.48, id: "k1" },
    { p: LOCAL_2, u: 1.15 - llegan * 0.49, id: "k2" },
    { p: LOCAL_3, u: 1.3 - llegan * 0.5, id: "k3" },
  ];
  const base = pro(0.52, 0.92, 0.88);
  const w = base.px * 0.11;
  return (
    <>
      <Fondo nombre="calcuta" encuadre={encuadre} bloom={0.55} />
      <Calor fuerza={0.3} />
      <Niebla y={900} opacidad={0.2} color="255,220,170" />
      {pila.map((u, i) => {
        const p = pro(u, 0.92, 0.88);
        if (f > quitan + i * 4) return null;
        return <Bloque key={i} x={p.x} y={i === 2 ? p.y - w * 0.72 : p.y} w={w} derrite={0.15} />;
      })}
      <Muneco id="c6" x={yo.x} y={yo.y} escala={escalaMuneco(yo, 0.3)} personaje={COMERCIANTE} luz={LUZ_ATARDECER} pose={{ cara: f >= cien ? "feliz" : "susto", parpadeo: 9, mira: 1 }} />
      {locales.map((l, i) => {
        const p = pro(Math.min(l.u, 1.4), 0.875, 0.85);  // un poco atrás: las caras quedan por encima de los subtítulos
        const tiene = f > quitan + i * 4;
        return (
          <Muneco
            key={l.id}
            id={l.id}
            x={p.x}
            y={p.y}
            escala={escalaMuneco(p, 0.26)}
            personaje={l.p}
            luz={LUZ_ATARDECER}
            pose={{
              cara: "feliz",
              andar: llegan < 1 ? f * 0.5 + i : undefined,
              correr: true,
              parpadeo: i * 17,
              mira: -1,
              manoB: tiene ? { x: 70, y: -330 } : null,
              enMano: tiene ? (
                <g>
                  <rect x={-45} y={-80} width={90} height={66} rx={8} fill="#bfe6ff" stroke={TINTA} strokeWidth={LINEA} />
                  <path d="M -34 -70 L 26 -70" stroke="#fff" strokeWidth={8} strokeLinecap="round" />
                </g>
              ) : null,
            }}
            voltear
          />
        );
      })}
      <TextoEscena x={base.x} y={base.y - w * 2.0} tam={w * 0.45 * Math.max(0.01, etiqueta)} giro={-4} opacidad={Math.min(1, etiqueta * 2) * (1 - suave(f, corre, corre + 6))}>
        100 T
      </TextoEscena>
      <Impacto x={base.x} y={base.y - w * 2.0} t={(f - cien) / 9} tam={w * 1.1} color="#ffffff" />
    </>
  );
};

// 7. Primer plano: «Acabaron llamándole el rey del hielo». Corona de hielo.
const Rey: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.55, y: 0.6, zoom: 1.6 + t * 0.12 };
  };
  const rey = E("rey");
  const escala = 2.4 + suave(f, 0, dur, lineal) * 0.25;
  const pie = 880 + 312 * escala;
  const cabeza = pie - 312 * escala;
  const baja = Easing.out(Easing.bounce)(suave(f, rey - 8, rey + 4, lineal));
  const coronaY = cabeza - 92 * escala - (1 - baja) * 500;
  return (
    <>
      <Fondo nombre="calcuta" encuadre={encuadre} bloom={0.7} desenfoque={9} />
      <Calor fuerza={0.3} />
      <LineasVelocidad cx={540} cy={cabeza} t={(f - rey - 2) / 12} />
      <Muneco id="r7" x={540} y={pie} escala={escala} personaje={{ ...COMERCIANTE, sombrero: "ninguno" }} luz={LUZ_ATARDECER} pose={{ cara: f >= rey ? "feliz" : "chulo", parpadeo: 4 }} />
      {baja > 0 && <Corona x={540} y={coronaY} w={170 * escala} />}
      <Copos n={30} velocidad={-0.6} color="#fff6d8" tam={4} />
    </>
  );
};

export const IDEA_5: IdeaDef = {
  id: "5",
  fondos: ["lago", "barco", "calcuta"],
  musica: "sneaky-snitch.mp3",
  planos: [
    { C: Locura, empieza: null, entrada: "nada" },
    { C: Sueno, empieza: "vender", entrada: "barrido" },
    { C: Cortar, empieza: "Cortó", entrada: "fundido" },
    { C: Carga, empieza: "los metió", entrada: "barrido" },
    { C: Ecuador, empieza: "Cuatro", entrada: "fundido" },
    { C: Calcuta, empieza: "Cuánto", entrada: "barrido" },
    { C: Rey, empieza: "Acabaron", entrada: "barrido" },
  ],
  sonidos: [
    { archivo: "aplausos.wav", en: "locura", vol: 0.6 },
    { archivo: "pop.wav", en: "hielo" },
    { archivo: "golpe.wav", en: "bloques", vol: 0.7 },
    { archivo: "golpe.wav", en: "bloques", retraso: 0.17, vol: 0.6 },
    { archivo: "golpe.wav", en: "bloques", retraso: 0.33, vol: 0.6 },
    { archivo: "impacto.wav", en: "Ciento" },
    { archivo: "tictac.wav", en: "Cuatro", vol: 0.8 },
    { archivo: "ding.wav", en: "Cien" },
    { archivo: "monedas.wav", en: "quitaron" },
    { archivo: "ding.wav", en: "rey" },
    { archivo: "aplausos.wav", en: "rey", retraso: 0.2, vol: 0.8 },
  ],
};
