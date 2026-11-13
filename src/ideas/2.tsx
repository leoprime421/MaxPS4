// IDEA 2 · Los colocadores de bolos (boleras de los años 30). Fondos: sala, pista, foso.
// Guion: Guiones/2 - Los colocadores de bolos.txt
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { clamp, suave } from "../motor/cine";
import { EncuadreCuadro } from "../motor/parallax";
import { Copos, Fondo, Halo, Impacto, LineasVelocidad, Proyeccion, TextoEscena, escalaMuneco, useProyeccion } from "../motor/escena";
import { Luz, Muneco, Personaje, TINTA } from "../motor/muneco";
import { useVoz } from "../motor/voz";
import { IdeaDef } from "../motor/video";

// ---------------------------------------------------------------- personajes y luz
const CHAVAL: Personaje = { ropa: "#ece2cc", rayas: "#4a6fa5", sombrero: "gorra", colorSombrero: "#7a5230", pelo: "#5a3a22", alto: 0.8, piel: "#f7e2cc" };
const CLIENTE: Personaje = { ropa: "#6b2f3a", ropaOscura: "#4e2029", botones: "#e2b45a", sombrero: "bombin", colorSombrero: "#2f2f38", bigote: "#3b2a1e" };
const IMPACIENTE: Personaje = { ropa: "#2f4f6b", ropaOscura: "#22394f", botones: "#d9d2c0", bufanda: "#d9a05b", sombrero: "bombin", colorSombrero: "#5a3e2b", bigote: "#7a4a2a" };
const LUZ_BOLERA: Luz = { tinte: [1.0, 0.9, 0.76], borde: "#ffd08a", lado: 1, fuerza: 0.5 };
const LUZ_FOSO: Luz = { tinte: [0.86, 0.74, 0.6], borde: "#ffc46e", lado: 1, fuerza: 0.6 };

const lineal = (x: number) => x;

// ---------------------------------------------------------------- objetos (SVG con contorno de tinta)
/** Un bolo: (x, y) es la base; h es su alto en píxeles. */
const Bolo: React.FC<{ x: number; y: number; h: number; giro?: number; opacidad?: number }> = ({ x, y, h, giro = 0, opacidad = 1 }) => {
  const k = h / 100;
  return (
    <g transform={`translate(${x} ${y}) rotate(${giro}) scale(${k})`} opacity={opacidad}>
      <path
        d="M -9 0 C -18 -12, -16 -34, -11 -46 C -8 -54, -6 -60, -7 -68 C -9 -80, -9 -96, 0 -100 C 9 -96, 9 -80, 7 -68 C 6 -60, 8 -54, 11 -46 C 16 -34, 18 -12, 9 0 Z"
        fill="#fbf6ec"
        stroke={TINTA}
        strokeWidth={4.5}
        strokeLinejoin="round"
      />
      <path d="M -7.5 -64 L 7.5 -64 M -8 -71 L 8 -71" stroke="#c23b32" strokeWidth={4} />
    </g>
  );
};

/** La bola: (x, y) es el centro; r su radio en píxeles. */
const Bola: React.FC<{ x: number; y: number; r: number; giro?: number }> = ({ x, y, r, giro = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${giro})`}>
    <circle r={r} fill="#24304f" stroke={TINTA} strokeWidth={Math.max(2, r * 0.12)} />
    <circle cx={-r * 0.35} cy={-r * 0.38} r={r * 0.22} fill="rgba(255,255,255,0.35)" />
    {[
      [0.18, -0.1],
      [0.42, 0.02],
      [0.28, 0.26],
    ].map(([a, b], i) => (
      <circle key={i} cx={r * a} cy={r * b} r={r * 0.1} fill={TINTA} />
    ))}
  </g>
);

const BolaEnMano: React.ReactNode = <Bola x={0} y={-6} r={34} />;

/** Posiciones de los 10 bolos en triángulo (fila 0 = el de delante), en unidades de la imagen alrededor de (u, v). */
const triangulo = (u: number, v: number, sep: number, fondo: number) => {
  const out: { u: number; v: number; fila: number; orden: number }[] = [];
  let orden = 0;
  for (let fila = 0; fila < 4; fila++) for (let i = 0; i <= fila; i++) out.push({ u: u + (i - fila / 2) * sep, v: v - fila * fondo, fila, orden: orden++ });
  return out.sort((a, b) => b.fila - a.fila); // de atrás adelante (los de delante se pintan encima)
};

/** Los 10 bolos sobre un suelo proyectado; `golpe` es el fotograma del choque (o null). */
const Bolos: React.FC<{ pro: Proyeccion; u: number; v: number; d: number; sep: number; fondo: number; alto: number; golpe: number | null; visibles?: number }> = ({ pro, u, v, d, sep, fondo, alto, golpe, visibles = 10 }) => {
  const f = useCurrentFrame();
  const lista = triangulo(u, v, sep, fondo);
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} width={1} height={1}>
      {lista.map((b, i) => {
        if (b.orden >= visibles) return null;
        const p = pro(b.u, b.v, d);
        const h = p.px * alto;
        if (golpe === null || f < golpe) return <Bolo key={i} x={p.x} y={p.y} h={h} />;
        const t = (f - golpe) / 30;
        const s = Math.sin(b.orden * 12.9898 + 1) * 43758.5453;
        const azar = s - Math.floor(s);
        const vx = ((b.u - u) / sep) * 2.2 + (azar - 0.5) * 3;
        const vy = -2.4 - azar * 1.8;
        return <Bolo key={i} x={p.x + vx * h * t * 2.2} y={p.y + (vy * t + 7 * t * t) * h} h={h} giro={(azar - 0.5) * 900 * t + vx * 60 * t} opacidad={interpolate(t, [0.5, 0.8], [1, 0], clamp)} />;
      })}
    </svg>
  );
};

/** Bola rodando por una pista dibujada en perspectiva: su tamaño crece hacia abajo de la imagen (horizonte en vHor). */
const BolaRodando: React.FC<{ pro: Proyeccion; u0: number; v0: number; u1: number; v1: number; d0: number; d1: number; t: number; vHor: number; rAbajo: number }> = ({ pro, u0, v0, u1, v1, d0, d1, t, vHor, rAbajo }) => {
  if (t <= 0 || t >= 1) return null;
  const v = interpolate(t, [0, 1], [v0, v1]);
  const p = pro(interpolate(t, [0, 1], [u0, u1]), v, interpolate(t, [0, 1], [d0, d1]));
  const r = p.px * rAbajo * Math.max(0.05, (v - vHor) / (1 - vHor));
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} width={1} height={1}>
      <ellipse cx={p.x} cy={p.y + r * 0.9} rx={r * 1.1} ry={r * 0.3} fill="rgba(20,10,0,0.35)" />
      <Bola x={p.x} y={p.y} r={r} giro={t * 1400} />
    </svg>
  );
};

// ---------------------------------------------------------------- planos
const LAMPARAS_SALA: [number, number, number][] = [
  [0.17, 0.19, 0.11],
  [0.5, 0.19, 0.11],
  [0.84, 0.19, 0.11],
  [0.3, 0.29, 0.06],
  [0.5, 0.27, 0.06],
  [0.7, 0.29, 0.06],
];

// 1. La bolera: «Antes de que existieran las máquinas, en las boleras…». Un cliente espera con su bola.
const Sala: React.FC<{ dur: number }> = ({ dur }) => {
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.5, y: 0.5 - t * 0.02, zoom: 1.06 + t * 0.32 };
  };
  const pro = useProyeccion(encuadre);
  const cliente = pro(0.66, 0.66, 0.62);
  const cartel = pro(0.5, 0.355, 0.2);
  return (
    <>
      <Fondo nombre="sala" encuadre={encuadre} bloom={0.6} />
      {LAMPARAS_SALA.map(([u, v, r], i) => {
        const l = pro(u, v, 0.3);
        return <Halo key={i} x={l.x} y={l.y} r={l.px * r} semilla={i * 2} />;
      })}
      <TextoEscena x={cartel.x} y={cartel.y} tam={cartel.px * 0.026} color="#ffd98a">
        BOLERA
      </TextoEscena>
      <Bolos pro={pro} u={0.47} v={0.455} d={0.25} sep={0.011} fondo={0.004} alto={0.028} golpe={null} />
      <Muneco id="s1" x={cliente.x} y={cliente.y} escala={escalaMuneco(cliente, 0.21)} personaje={CLIENTE} luz={LUZ_BOLERA} pose={{ cara: "chulo", enMano: BolaEnMano, manoB: { x: 70, y: -150 }, parpadeo: 12, mira: -1 }} />
      <Copos n={45} velocidad={-0.12} color="#ffe2a8" tam={2.2} />
    </>
  );
};

// 2. El foso: «…trabajaba alguien escondido al final de la pista. Un chaval.» Asoma desde abajo.
const Escondido: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.42, y: 0.6 - t * 0.02, zoom: 1.12 + t * 0.2 };
  };
  const pro = useProyeccion(encuadre, 0.7);
  const sale = E("chaval") - 6;
  // en «escondido» ya asoma la cabeza por abajo (el plano no se queda vacío); en «chaval» sale entero
  const asoma = suave(f, E("escondido") - 2, E("escondido") + 8) * 0.3;
  const sube = Math.max(asoma, Easing.out(Easing.back(1.7))(suave(f, sale, sale + 9, lineal)));
  const pies = pro(0.3, 0.9 + (1 - sube) * 0.3, 0.8);
  const bombilla = pro(0.5, 0.265, 0.4);
  return (
    <>
      <Fondo nombre="foso" encuadre={encuadre} bloom={0.7} />
      <Halo x={bombilla.x} y={bombilla.y} r={bombilla.px * 0.13} semilla={3} />
      {sube > 0 && <Muneco id="e2" x={pies.x} y={pies.y} escala={escalaMuneco(pies, 0.38)} personaje={CHAVAL} luz={LUZ_FOSO} pose={f < sale ? { cara: "normal", mira: Math.sin(f * 0.15), parpadeo: 8 } : { cara: "feliz", manoB: { x: 110, y: -330 + Math.sin(f * 0.6) * 25 }, parpadeo: 8 }} />}
      <Copos n={35} velocidad={-0.1} color="#ffd9a0" tam={2} />
    </>
  );
};

// 3. La pista: «Cada vez que tirabas…» La bola rueda y se lleva los bolos.
const Tirada: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.5, y: 0.62 - t * 0.08, zoom: 1.1 + t * 0.55 };
  };
  const pro = useProyeccion(encuadre, 0.6);
  const tira = E("tirabas");
  const choque = E("él") - 2;
  const t = (f - tira + 6) / (choque - tira + 6);
  const lampara = pro(0.5, 0.18, 0.3);
  const centro = pro(0.5, 0.48, 0.3);
  return (
    <>
      <Fondo nombre="pista" encuadre={encuadre} />
      <Halo x={lampara.x} y={lampara.y} r={lampara.px * 0.12} semilla={4} />
      <Bolos pro={pro} u={0.5} v={0.496} d={0.3} sep={0.024} fondo={0.007} alto={0.052} golpe={choque} />
      <BolaRodando pro={pro} u0={0.52} v0={0.86} u1={0.5} v1={0.5} d0={0.85} d1={0.3} t={t} vHor={0.47} rAbajo={0.075} />
      <Impacto x={centro.x} y={centro.y} t={(f - choque) / 9} tam={centro.px * 0.14} />
      <Copos n={35} velocidad={-0.12} color="#ffe2a8" tam={2.2} />
    </>
  );
};

// 4. El foso: recoge los bolos, los coloca uno a uno y devuelve la bola.
const Coloca: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.55, y: 0.62, zoom: 1.25 + t * 0.1 };
  };
  const pro = useProyeccion(encuadre, 0.6);
  const ini = E("colocar") - 4;
  const finColoca = E("uno", 1) + 8;
  const visibles = Math.max(0, Math.min(10, Math.floor(interpolate(f, [ini, finColoca], [0, 10.99], clamp))));
  const devuelve = E("devolvía");
  const lanza = suave(f, devuelve + 4, devuelve + 22, Easing.in(Easing.quad));
  const pies = pro(0.7, 0.9, 0.82);
  const esc = escalaMuneco(pies, 0.36);
  const bombilla = pro(0.5, 0.265, 0.4);
  // la mano izquierda va y viene al poner cada bolo; luego la derecha sujeta la bola y la lanza fuera del plano, hacia la derecha
  const vaiven = f < finColoca && f > ini ? Math.sin(((f - ini) / (finColoca - ini)) * Math.PI * 10) : 0;
  const conBola = f >= devuelve - 4 && lanza < 0.05;
  const bolaVuela = lanza > 0.05 && lanza < 1 ? pro(0.84 + lanza * 0.4, 0.66 - Math.sin(lanza * Math.PI) * 0.05, 0.7) : null;
  return (
    <>
      <Fondo nombre="foso" encuadre={encuadre} bloom={0.7} />
      <Halo x={bombilla.x} y={bombilla.y} r={bombilla.px * 0.13} semilla={3} />
      <Bolos pro={pro} u={0.35} v={0.72} d={0.55} sep={0.05} fondo={0.018} alto={0.066} golpe={null} visibles={visibles} />
      <Muneco
        id="c4"
        x={pies.x}
        y={pies.y}
        escala={esc}
        personaje={CHAVAL}
        luz={LUZ_FOSO}
        pose={{
          cara: f > devuelve ? "chulo" : "normal",
          mira: -1,
          manoA: conBola ? null : { x: -120 + vaiven * 30, y: -120 + Math.abs(vaiven) * 40 },
          manoB: conBola ? { x: 125, y: -265 } : null,
          enMano: conBola ? BolaEnMano : null,
          parpadeo: 21,
        }}
      />
      {bolaVuela && (
        <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
          <Bola x={bolaVuela.x} y={bolaVuela.y} r={bolaVuela.px * 0.03} giro={lanza * 900} />
        </svg>
      )}
      <Copos n={35} velocidad={-0.1} color="#ffd9a0" tam={2} />
    </>
  );
};

/** Reloj de pared con las agujas girando muy deprisa (pasa la noche). */
const Reloj: React.FC<{ x: number; y: number; r: number; vueltas: number }> = ({ x, y, r, vueltas }) => (
  <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="#f3ead6" stroke={TINTA} strokeWidth={r * 0.1} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <line key={i} x1={Math.sin(a) * r * 0.78} y1={-Math.cos(a) * r * 0.78} x2={Math.sin(a) * r * 0.9} y2={-Math.cos(a) * r * 0.9} stroke={TINTA} strokeWidth={r * 0.05} />;
      })}
      <line x1={0} y1={0} x2={Math.sin(vueltas * Math.PI * 2) * r * 0.75} y2={-Math.cos(vueltas * Math.PI * 2) * r * 0.75} stroke={TINTA} strokeWidth={r * 0.07} strokeLinecap="round" />
      <line x1={0} y1={0} x2={Math.sin((vueltas / 12) * Math.PI * 2) * r * 0.5} y2={-Math.cos((vueltas / 12) * Math.PI * 2) * r * 0.5} stroke={TINTA} strokeWidth={r * 0.1} strokeLinecap="round" />
      <circle r={r * 0.07} fill={TINTA} />
    </g>
  </svg>
);

// 5. «Toda la noche, por unas monedas.» Cansado, con el reloj volando y unas monedas en la mano.
const Noche: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.55, y: 0.5, zoom: 1.35 + t * 0.12 };
  };
  const pro = useProyeccion(encuadre, 0.6);
  const monedas = E("monedas");
  const moneda = suave(f, monedas - 2, monedas + 6, Easing.out(Easing.back(2)));
  const pies = pro(0.5, 0.7, 0.7);
  const reloj = pro(0.72, 0.29, 0.35);
  const bombilla = pro(0.5, 0.265, 0.4);
  return (
    <>
      <Fondo nombre="foso" encuadre={encuadre} bloom={0.7} />
      <Halo x={bombilla.x} y={bombilla.y} r={bombilla.px * 0.13} semilla={3} />
      <Reloj x={reloj.x} y={reloj.y} r={reloj.px * 0.05} vueltas={f / 6} />
      <Muneco
        id="n5"
        x={pies.x}
        y={pies.y}
        escala={escalaMuneco(pies, 0.33)}
        personaje={CHAVAL}
        luz={LUZ_FOSO}
        pose={{
          cara: f > monedas + 4 ? "feliz" : "triste",
          gota: f < monedas ? suave(f, 0, dur, lineal) : 0,
          manoB: f > monedas - 2 ? { x: 110, y: -330 } : null,
          enMano:
            f > monedas - 2 ? (
              <g transform={`scale(${moneda})`}>
                {[-26, 0, 26].map((dx, i) => (
                  <circle key={i} cx={dx} cy={-34 - i * 6} r={20} fill="#f2c94c" stroke={TINTA} strokeWidth={5} />
                ))}
              </g>
            ) : null,
          parpadeo: 33,
        }}
      />
      <Copos n={35} velocidad={-0.1} color="#ffd9a0" tam={2} />
    </>
  );
};

// 6. La sala: «Y si un cliente impaciente tiraba antes de tiempo…» Tira con rabia.
const Impaciente: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.5, y: 0.56, zoom: 1.4 + t * 0.2 };
  };
  const pro = useProyeccion(encuadre);
  const tira = E("tiraba");
  const t = (f - tira) / 22;
  const cliente = pro(0.5, 0.74, 0.7);
  return (
    <>
      <Fondo nombre="sala" encuadre={encuadre} bloom={0.6} />
      {LAMPARAS_SALA.slice(3).map(([u, v, r], i) => {
        const l = pro(u, v, 0.3);
        return <Halo key={i} x={l.x} y={l.y} r={l.px * r} semilla={i * 2} />;
      })}
      <Bolos pro={pro} u={0.47} v={0.455} d={0.25} sep={0.011} fondo={0.004} alto={0.028} golpe={null} />
      <BolaRodando pro={pro} u0={0.52} v0={0.7} u1={0.48} v1={0.46} d0={0.65} d1={0.25} t={t} vHor={0.43} rAbajo={0.07} />
      <Muneco
        id="i6"
        x={cliente.x}
        y={cliente.y}
        escala={escalaMuneco(cliente, 0.3)}
        personaje={IMPACIENTE}
        luz={LUZ_BOLERA}
        pose={{
          cara: "enfadado",
          manoB: f < tira ? { x: 90, y: -120 + Math.sin(f * 0.8) * 12 } : { x: 135, y: -290 },
          enMano: f < tira ? BolaEnMano : null,
          salto: f >= tira ? Math.max(0, 1 - (f - tira) / 6) : 0,
          parpadeo: 17,
        }}
      />
      <Copos n={45} velocidad={-0.12} color="#ffe2a8" tam={2.2} />
    </>
  );
};

// 7. El foso: «…el chaval tenía que saltar a la pared para que no le diera.»
const Salto: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.5, y: 0.5, zoom: 1.04 + t * 0.06 };
  };
  const pro = useProyeccion(encuadre, 0.6);
  const salta = E("saltar") - 3;
  const choque = E("diera");
  const s = suave(f, salta, salta + 9, Easing.out(Easing.quad));
  const arco = Math.sin(s * Math.PI) * 0.1;
  const u = interpolate(s, [0, 1], [0.2, 0.62]);
  const v = interpolate(s, [0, 1], [0.8, 0.345]) - arco;
  const pies = pro(u, v, interpolate(s, [0, 1], [0.75, 0.45]));
  const susto = f >= salta;
  const temblor = f >= choque && f - choque < 10 ? Math.sin(f * 2.3) * 9 * (1 - (f - choque) / 10) : 0;
  const tBola = (f - (choque - 12)) / 12;
  const bolaP = tBola > 0 && tBola < 1.6 ? pro(interpolate(tBola, [0, 1], [0.1, 0.5], { extrapolateRight: "extend" }), interpolate(tBola, [0, 1], [0.63, 0.622], { extrapolateRight: "extend" }), 0.5) : null;
  const centro = pro(0.52, 0.595, 0.5);
  const bombilla = pro(0.5, 0.265, 0.4);
  const cabeza = pro(u, v - 0.27, 0.5);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateX(${temblor}px)` }}>
      <Fondo nombre="foso" encuadre={encuadre} bloom={0.7} />
      <Halo x={bombilla.x} y={bombilla.y} r={bombilla.px * 0.13} semilla={3} />
      <Bolos pro={pro} u={0.52} v={0.635} d={0.5} sep={0.045} fondo={0.014} alto={0.058} golpe={choque} />
      {bolaP && (
        <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
          <Bola x={bolaP.x} y={bolaP.y} r={bolaP.px * 0.035} giro={tBola * 1200} />
        </svg>
      )}
      <Impacto x={centro.x} y={centro.y} t={(f - choque) / 9} tam={centro.px * 0.1} />
      <LineasVelocidad cx={cabeza.x} cy={cabeza.y} t={(f - salta) / 12} />
      <Muneco
        id="j7"
        x={pies.x}
        y={pies.y}
        escala={escalaMuneco(pies, 0.28)}
        personaje={CHAVAL}
        luz={LUZ_FOSO}
        pose={{ cara: susto ? "susto" : "normal", manoA: susto ? { x: -110, y: -380 } : null, manoB: susto ? { x: 110, y: -380 } : null, salto: susto ? Math.max(0, 1 - (f - salta) / 8) : 0, gota: susto ? suave(f, salta + 6, dur, lineal) : 0, parpadeo: 2 }}
      />
      <Copos n={35} velocidad={-0.1} color="#ffd9a0" tam={2} />
    </div>
  );
};

export const IDEA_2: IdeaDef = {
  id: "2",
  fondos: ["sala", "pista", "foso"],
  musica: "mischief-maker.mp3",
  planos: [
    { C: Sala, empieza: null, entrada: "nada" },
    { C: Escondido, empieza: "trabajaba", entrada: "fundido" },
    { C: Tirada, empieza: "Cada vez", entrada: "barrido" },
    { C: Coloca, empieza: "los bolos", entrada: "fundido" },
    { C: Noche, empieza: "Toda la noche", entrada: "barrido" },
    { C: Impaciente, empieza: "Y si", entrada: "barrido" },
    { C: Salto, empieza: "el chaval", entrada: "barrido" },
  ],
  sonidos: [
    { archivo: "balon.wav", en: "tirabas", vol: 0.8 },
    { archivo: "golpe.wav", en: "él", retraso: -0.07 },
    { archivo: "tok.wav", en: "uno", vez: 0, vol: 0.6 },
    { archivo: "tok.wav", en: "uno", vez: 1, vol: 0.6 },
    { archivo: "balon.wav", en: "devolvía", retraso: 0.2, vol: 0.7 },
    { archivo: "tictac.wav", en: "Toda", vol: 0.8 },
    { archivo: "monedas.wav", en: "monedas" },
    { archivo: "balon.wav", en: "tiraba", vol: 0.9 },
    { archivo: "whoosh2.wav", en: "saltar", retraso: -0.1 },
    { archivo: "golpe.wav", en: "diera" },
  ],
};
