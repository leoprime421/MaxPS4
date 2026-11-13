// IDEA 4 · La piña de alquiler (Inglaterra, siglo XVIII). Fondos: comedor, tienda, puerto.
// Guion: Guiones/4 - La piña de alquiler.txt
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { clamp, suave } from "../motor/cine";
import { EncuadreCuadro } from "../motor/parallax";
import { Copos, Fondo, Halo, LineasVelocidad, TextoEscena, escalaMuneco, useProyeccion } from "../motor/escena";
import { LUZ_ATARDECER, LUZ_DIA, LUZ_INTERIOR, Muneco, Personaje, TINTA } from "../motor/muneco";
import { useVoz } from "../motor/voz";
import { IdeaDef } from "../motor/video";

// ---------------------------------------------------------------- personajes
const DAMA: Personaje = { ropa: "#d98aa8", ropaOscura: "#b86a88", vestido: "#c86b8f", pelo: "#f2f0ea", moño: true, botones: null };
const CABALLERO: Personaje = { ropa: "#3b5a8a", ropaOscura: "#2c4570", botones: "#e2b45a", bufanda: "#f2f0ea", sombrero: "chistera", colorSombrero: "#2d2a3a" };
const NOBLE: Personaje = { ropa: "#7a3b5a", ropaOscura: "#5e2c45", botones: "#e2b45a", bufanda: "#f2f0ea", sombrero: "peluca" };
const TENDERO: Personaje = { ropa: "#6b4a32", ropaOscura: "#53392a", delantal: "#efe6d2", pelo: "#3a2a22", bigote: "#3a2a22" };
const DAMA_AZUL: Personaje = { ropa: "#8fb4d9", ropaOscura: "#6d93ba", vestido: "#6f9ac8", pelo: "#f2f0ea", moño: true };
const NOBLE_VERDE: Personaje = { ropa: "#4f7a4a", ropaOscura: "#3c5f38", botones: "#e2b45a", bufanda: "#f2f0ea", sombrero: "peluca" };

const lineal = (x: number) => x;
type Pro = ReturnType<typeof useProyeccion>;

// ---------------------------------------------------------------- la piña (SVG con tinta)
const hex = (h: string) => h.match(/\w\w/g)!.map((v) => parseInt(v, 16));
const mezclaColor = (a: string, b: string, t: number) => `rgb(${hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t)).join(",")})`;

/** Piña con la base en (x,y) y ~200 unidades de alto. podrida: 0 fresca .. 1 podrida (marrón, hojas caídas, moscas). */
const Pina: React.FC<{ x: number; y: number; escala: number; podrida?: number; brillo?: boolean; id: string }> = ({ x, y, escala, podrida = 0, brillo, id }) => {
  const f = useCurrentFrame();
  const cuerpo = mezclaColor("e9b23a", "7a5530", podrida);
  const raya = mezclaColor("b5741f", "4a3220", podrida);
  const hoja = mezclaColor("4f9a3a", "6b5a2a", podrida);
  const caida = podrida * 40; // las hojas se doblan
  const encoge = 1 - podrida * 0.12;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} width={1} height={1}>
      <defs>
        <clipPath id={`pina-${id}`}>
          <ellipse cx={0} cy={-70} rx={52} ry={72} />
        </clipPath>
      </defs>
      <g transform={`translate(${x} ${y}) scale(${escala} ${escala * encoge})`} strokeLinejoin="round">
        <ellipse cx={0} cy={2} rx={46} ry={9} fill="rgba(10,6,30,0.35)" />
        {[-2, -1, 0, 1, 2].map((i) => {
          const ang = i * 22 + (i === 0 ? 0 : Math.sign(i) * caida);
          return (
            <path
              key={i}
              transform={`translate(0 -136) rotate(${ang})`}
              d={`M -10 0 C -14 -40, -6 ${-80 + Math.abs(i) * 10}, 0 ${-96 + Math.abs(i) * 14} C 6 ${-80 + Math.abs(i) * 10}, 14 -40, 10 0 Z`}
              fill={hoja}
              stroke={TINTA}
              strokeWidth={6}
            />
          );
        })}
        <ellipse cx={0} cy={-70} rx={52} ry={72} fill={cuerpo} stroke={TINTA} strokeWidth={7} />
        <g clipPath={`url(#pina-${id})`} stroke={raya} strokeWidth={5}>
          {[-90, -60, -30, 0, 30, 60, 90].map((d) => (
            <g key={d}>
              <line x1={d - 60} y1={-150} x2={d + 60} y2={10} />
              <line x1={d + 60} y1={-150} x2={d - 60} y2={10} />
            </g>
          ))}
        </g>
        <ellipse cx={0} cy={-70} rx={52} ry={72} fill="none" stroke={TINTA} strokeWidth={7} />
        {podrida > 0.3 &&
          [
            [-22, -40, 14],
            [18, -96, 10],
            [26, -30, 8],
          ].map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r * podrida} fill="#3e2a18" opacity={0.8} />)}
        {podrida > 0.85 && (
          <g stroke={TINTA} strokeWidth={6} strokeLinecap="round" fill="none">
            <path d="M -26 -78 Q -16 -70 -6 -78 M 8 -78 Q 18 -70 28 -78" />
            <path d="M -12 -48 Q 2 -56 16 -48" />
          </g>
        )}
        {podrida > 0.5 &&
          [0, 1, 2].map((i) => {
            const a = f * 0.25 + i * 2.1;
            const mx = Math.cos(a) * (70 + i * 12);
            const my = -150 + Math.sin(a * 1.3) * 40 - i * 14;
            return (
              <g key={i} transform={`translate(${mx} ${my})`} opacity={Math.min(1, (podrida - 0.5) * 4)}>
                <ellipse cx={-6} cy={-6} rx={7} ry={4} fill="rgba(255,255,255,0.8)" stroke={TINTA} strokeWidth={2} transform={`rotate(${Math.sin(f * 2 + i) * 30})`} />
                <circle cx={0} cy={0} r={6} fill={TINTA} />
              </g>
            );
          })}
        {brillo &&
          [
            [-80, -150, 0],
            [74, -110, 9],
            [-64, -20, 17],
            [70, -10, 25],
          ].map(([cx, cy, d], i) => {
            const k = Math.max(0, Math.sin((f + d) * 0.22));
            return <path key={i} transform={`translate(${cx} ${cy}) scale(${k})`} d="M 0 -22 Q 3 -3 22 0 Q 3 3 0 22 Q -3 3 -22 0 Q -3 -3 0 -22 Z" fill="#fff6c8" stroke={TINTA} strokeWidth={3} />;
          })}
      </g>
    </svg>
  );
};

/** Lluvia de monedas (£) desde arriba, a partir del fotograma `desde`. */
const LluviaMonedas: React.FC<{ desde: number }> = ({ desde }) => {
  const f = useCurrentFrame();
  if (f < desde) return null;
  const t = f - desde;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1080} height={1920}>
      {Array.from({ length: 22 }, (_, i) => {
        const s = Math.sin(i * 12.9898) * 43758.5453;
        const a = s - Math.floor(s);
        const x = 80 + a * 920;
        const y = -80 - (i % 7) * 90 + t * (22 + (i % 4) * 4);
        const g = (t * (6 + (i % 5) * 3) + i * 40) % 360;
        if (y > 1180) return null; // nunca bajan hasta los subtítulos
        return (
          <g key={i} opacity={Math.min(1, (1180 - y) / 200)} transform={`translate(${x} ${y}) scale(${Math.cos((g * Math.PI) / 180) * 0.8 + 0.2} 1)`}>
            <circle r={30} fill="#f2c94c" stroke={TINTA} strokeWidth={6} />
            <text y={12} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={34} fill="#a8741a">
              £
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/** Halos de las velas y la lámpara del comedor (posiciones medidas en la imagen). */
const VELAS: [number, number][] = [
  [0.245, 0.5],
  [0.37, 0.485],
  [0.385, 0.6],
  [0.755, 0.5],
  [0.7, 0.535],
  [0.62, 0.605],
  [0.5, 0.24],
];
const VelasComedor: React.FC<{ pro: Pro }> = ({ pro }) => (
  <>
    {VELAS.map(([u, v], i) => {
      const p = pro(u, v, 0.45);
      return <Halo key={i} x={p.x} y={p.y} r={p.px * (i === VELAS.length - 1 ? 0.14 : 0.05)} semilla={i * 2.3} />;
    })}
  </>
);

/** Invitados en primer término, anclados a la pantalla: la cara siempre por encima de los subtítulos (y < 1250). */
const PIES_Y = 1470;
const ESC_INV = 1.15;
const primerTermino = (lado: -1 | 1, f: number, dur: number) => {
  const deriva = suave(f, 0, dur, lineal) * 18 * -lado; // se mueven un poco con la cámara
  return { x: (lado < 0 ? 175 : 905) + deriva, y: PIES_Y };
};

// ---------------------------------------------------------------- planos
// 1. Comedor de gala: «una piña era el mayor lujo que podías tener». La piña brilla en el centro de la mesa.
const Lujo: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.5, y: 0.6 - t * 0.02, zoom: 1.06 + t * 0.34 };
  };
  const pro = useProyeccion(encuadre);
  const pina = pro(0.5, 0.64, 0.5);
  const asombro = E("lujo");
  const dama = primerTermino(-1, f, dur);
  const noble = primerTermino(1, f, dur);
  const aparece = Easing.out(Easing.back(1.8))(suave(f, E("piña") - 4, E("piña") + 6, lineal));
  return (
    <>
      <Fondo nombre="comedor" encuadre={encuadre} />
      <VelasComedor pro={pro} />
      {aparece > 0 && <Pina id="l1" x={pina.x} y={pina.y} escala={(pina.px * 0.11 * aparece) / 200} brillo />}
      <Muneco id="l1a" x={dama.x} y={dama.y} escala={ESC_INV} personaje={DAMA} luz={LUZ_INTERIOR} pose={{ cara: f > asombro ? "feliz" : "normal", mira: 1, parpadeo: 12, manoB: f > asombro ? { x: 60, y: -300 } : null }} />
      <Muneco id="l1b" x={noble.x} y={noble.y} escala={ESC_INV} personaje={NOBLE} luz={LUZ_INTERIOR} pose={{ cara: f > asombro ? "susto" : "normal", mira: -1, parpadeo: 40 }} />
      <Copos n={25} velocidad={-0.3} color="#ffe2a8" tam={3} />
    </>
  );
};

// 2. Puerto al atardecer: «Venían de muy lejos y costaban una fortuna». Llueven libras.
const Puerto: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.62 - t * 0.12, y: 0.44 + t * 0.12, zoom: 1.25 + t * 0.2 };
  };
  const pro = useProyeccion(encuadre, 0.7);
  const fortuna = E("fortuna");
  const p = { x: 400 + suave(f, 0, dur, lineal) * 30, y: 1500 };
  const sol = pro(0.5, 0.38, 0.05);
  return (
    <>
      <Fondo nombre="puerto" encuadre={encuadre} bloom={0.7} />
      <Halo x={sol.x} y={sol.y} r={sol.px * 0.12} semilla={3} color="255,190,140" />
      <Muneco
        id="p2"
        x={p.x}
        y={p.y}
        escala={1.3}
        personaje={CABALLERO}
        luz={LUZ_ATARDECER}
        pose={{
          cara: f > fortuna ? "susto" : "feliz",
          parpadeo: 22,
          manoB: { x: 110, y: -330 },
          enMano: <Pina id="p2m" x={18} y={40} escala={0.55} brillo />,
          gota: f > fortuna ? suave(f, fortuna + 4, dur, lineal) : 0,
        }}
      />
      <LluviaMonedas desde={fortuna - 2} />
    </>
  );
};

/** Tienda: el tendero detrás del mostrador (recortado por el mostrador) y el cartel en la tabla vacía. */
const MOSTRADOR_V = 0.605;
const TiendaBase: React.FC<{ pro: Pro; cara: "normal" | "chulo" | "feliz" | "susto"; pinas: number; agacha?: number }> = ({ pro, cara, pinas, agacha = 0 }) => {
  const cartel = pro(0.48, 0.21, 0.2);
  const t = pro(0.27, 0.74 + agacha * 0.3, 0.45); // agacha: se esconde tras el mostrador
  const borde = pro(0.27, MOSTRADOR_V, 0.5);
  return (
    <>
      <TextoEscena x={cartel.x} y={cartel.y} tam={cartel.px * 0.04} giro={-2} color="#f3e3b8">
        SE ALQUILAN
        <br />
        PIÑAS
      </TextoEscena>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: borde.y, overflow: "hidden" }}>
        <Muneco id="tend" x={t.x} y={t.y} escala={escalaMuneco(t, 0.36)} personaje={TENDERO} luz={LUZ_INTERIOR} pose={{ cara, parpadeo: 33 }} />
      </div>
      {Array.from({ length: pinas }, (_, i) => {
        const p = pro(0.43 + i * 0.09, 0.6, 0.55);
        return <Pina key={i} id={`t${i}`} x={p.x} y={p.y} escala={(p.px * 0.075) / 200} />;
      })}
    </>
  );
};

// 3. Tienda: «Así que mucha gente las alquilaba».
const Alquiler: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.5 + t * 0.04, y: 0.5, zoom: 1.08 + t * 0.14 };
  };
  const pro = useProyeccion(encuadre, 0.6);
  const alquila = E("alquilaba");
  const cliente = { x: 900 - suave(f, 0, alquila, lineal) * 80, y: 1500 };
  return (
    <>
      <Fondo nombre="tienda" encuadre={encuadre} />
      <TiendaBase pro={pro} cara={f > alquila ? "feliz" : "chulo"} pinas={3} />
      <Muneco id="a3" x={cliente.x} y={cliente.y} escala={1.4} personaje={CABALLERO} luz={LUZ_DIA} pose={{ cara: "feliz", andar: f < alquila ? f * 0.3 : undefined, parpadeo: 4 }} voltear />
    </>
  );
};

// 4. Comedor: la pone en el centro de la mesa y todos presumen.
const Presumir: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.5, y: 0.62, zoom: 1.5 - t * 0.28 };
  };
  const pro = useProyeccion(encuadre);
  const ponias = E("ponías");
  const baja = suave(f, ponias - 2, ponias + 8, Easing.out(Easing.bounce));
  const pina = pro(0.5, 0.64 - (1 - baja) * 0.12, 0.5);
  const presume = E("presumir");
  const izq = primerTermino(-1, f, dur);
  const der = primerTermino(1, f, dur);
  return (
    <>
      <Fondo nombre="comedor" encuadre={encuadre} />
      <VelasComedor pro={pro} />
      <Pina id="pr4" x={pina.x} y={pina.y} escala={(pina.px * 0.11) / 200} brillo={f > ponias + 6} />
      <Muneco id="pr4a" x={izq.x} y={izq.y} escala={ESC_INV} personaje={CABALLERO} luz={LUZ_INTERIOR} pose={{ cara: f > presume ? "chulo" : "feliz", mira: 1, parpadeo: 9, manoB: f > presume ? { x: 110, y: -330 } : null }} />
      <Muneco id="pr4b" x={der.x} y={der.y} escala={ESC_INV} personaje={DAMA_AZUL} luz={LUZ_INTERIOR} pose={{ cara: f > presume ? "feliz" : "normal", mira: -1, parpadeo: 50 }} />
      <Copos n={25} velocidad={-0.3} color="#ffe2a8" tam={3} />
    </>
  );
};

// 5. Tienda, al día siguiente: la devuelve. «Sin comer» (la cámara se acerca a la piña intacta).
const Devolver: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const sin = E("Sin");
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, sin, lineal);
    const cerca = suave(g, sin - 4, sin + 10);
    return { x: 0.56 + cerca * 0.08, y: 0.52 + cerca * 0.05, zoom: 1.12 + t * 0.1 + cerca * 0.35 + suave(g, sin, dur, lineal) * 0.05 };
  };
  const pro = useProyeccion(encuadre, 0.6);
  const devolvias = E("devolvías");
  const deja = suave(f, devolvias - 6, devolvias + 4);
  // tras dejarla, se va por la derecha
  const sale = suave(f, devolvias + 6, sin + 2);
  const cliente = { x: 820 + sale * 500, y: 1500 };
  const pinaSuelta = pro(0.66, 0.6, 0.55);
  return (
    <>
      <Fondo nombre="tienda" encuadre={encuadre} />
      <TiendaBase pro={pro} cara={f > devolvias ? "chulo" : "normal"} pinas={0} agacha={suave(f, sin - 8, sin + 2)} />
      {deja >= 1 && <Pina id="d5" x={pinaSuelta.x} y={pinaSuelta.y} escala={(pinaSuelta.px * 0.075) / 200} brillo={f > sin} />}
      <Muneco
        id="d5c"
        x={cliente.x}
        y={cliente.y}
        escala={1.4}
        personaje={CABALLERO}
        luz={LUZ_DIA}
        voltear
        pose={{
          cara: "feliz",
          parpadeo: 17,
          andar: sale > 0 && sale < 1 ? f * 0.35 : undefined,
          manoB: deja < 1 ? { x: 120 + deja * 40, y: -250 + deja * 30 } : null,
          enMano: deja < 1 ? <Pina id="d5m" x={0} y={30} escala={0.55} /> : null,
        }}
      />
    </>
  );
};

// 6. «Y la misma piña pasaba de fiesta en fiesta, hasta que se pudría»: cortes rápidos de fiestas y la piña cada vez peor.
type CaraFiesta = "feliz" | "chulo" | "normal" | "susto" | "enfadado";
const Fiestas: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const cortes = [0, E("pasaba"), E("fiesta", 1), E("fiesta", 2), E("pudría") - 2];
  let k = 0;
  for (let i = 0; i < cortes.length; i++) if (f >= cortes[i]) k = i;
  const tintes = ["rgba(0,0,0,0)", "rgba(255,120,170,0.22)", "rgba(120,200,140,0.22)", "rgba(120,150,255,0.22)", "rgba(110,90,40,0.25)"];
  const zooms = [1.3, 1.55, 1.4, 1.65, 2.2];
  const xs = [0.5, 0.46, 0.54, 0.5, 0.5];
  const ini = cortes[k];
  const fin = k + 1 < cortes.length ? cortes[k + 1] : dur;
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, ini, fin, lineal);
    return { x: xs[k] + (k % 2 ? t * 0.02 : -t * 0.02), y: 0.62, zoom: zooms[k] + t * 0.08 };
  };
  const pro = useProyeccion(encuadre);
  const podrida = Math.min(1, [0, 0.25, 0.5, 0.7, 1][k] + suave(f, ini, fin, lineal) * 0.1);
  const pina = pro(0.5, 0.64, 0.5);
  const invitados: [Personaje, Personaje][] = [
    [NOBLE, DAMA],
    [DAMA_AZUL, NOBLE_VERDE],
    [CABALLERO, DAMA],
    [NOBLE_VERDE, DAMA_AZUL],
    [NOBLE, DAMA],
  ];
  const [a, b] = invitados[k];
  const izq = primerTermino(-1, f - ini, fin - ini);
  const der = primerTermino(1, f - ini, fin - ini);
  const final = k === 4;
  const pop = cortes[4];
  const salto = final ? Math.max(0, 1 - (f - pop) / 6) : 0;
  const caras: CaraFiesta[] = ["feliz", "chulo", "feliz", "normal"];
  const ladoI = final ? { x: 150, y: 1560 } : izq;
  const ladoD = final ? { x: 930, y: 1560 } : der;
  const escI = final ? 1.4 : ESC_INV;
  const escD = final ? 1.4 : ESC_INV;
  return (
    <>
      <Fondo nombre="comedor" encuadre={encuadre} />
      <VelasComedor pro={pro} />
      <div style={{ position: "absolute", inset: 0, background: tintes[k], mixBlendMode: "multiply" }} />
      <Pina id={`fi${k}`} x={pina.x} y={pina.y} escala={(pina.px * 0.11) / 200} podrida={podrida} brillo={k < 2} />
      <Muneco id={`fi${k}a`} x={ladoI.x} y={ladoI.y} escala={escI} personaje={a} luz={LUZ_INTERIOR} pose={{ cara: final ? "susto" : caras[k], mira: 1, parpadeo: 7 + k * 9, salto, gota: final ? suave(f, pop + 4, dur, lineal) : 0 }} />
      <Muneco id={`fi${k}b`} x={ladoD.x} y={ladoD.y} escala={escD} personaje={b} luz={LUZ_INTERIOR} pose={{ cara: final ? "enfadado" : caras[(k + 1) % 4], mira: -1, parpadeo: 30 + k * 7, salto }} />
      {final && <LineasVelocidad cx={540} cy={pina.y - pina.px * 0.05} t={(f - pop) / 10} />}
      {!final && <Copos n={20} velocidad={-0.3} color="#ffe2a8" tam={3} />}
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: k > 0 ? interpolate(f, [ini, ini + 4], [0.28, 0], clamp) : 0 }} />
    </>
  );
};

export const IDEA_4: IdeaDef = {
  id: "4",
  fondos: ["comedor", "tienda", "puerto"],
  musica: "mischief-maker.mp3",
  planos: [
    { C: Lujo, empieza: null, entrada: "nada" },
    { C: Puerto, empieza: "Venían", entrada: "barrido" },
    { C: Alquiler, empieza: "Así que", entrada: "barrido" },
    { C: Presumir, empieza: "Te llevabas", entrada: "fundido" },
    { C: Devolver, empieza: "y al día", entrada: "barrido" },
    { C: Fiestas, empieza: "Y la misma", entrada: "fundido" },
  ],
  sonidos: [
    { archivo: "ding.wav", en: "piña", vol: 0.8 },
    { archivo: "monedas.wav", en: "fortuna" },
    { archivo: "pop.wav", en: "ponías", retraso: 0.25 },
    { archivo: "aplausos.wav", en: "presumir", vol: 0.6, corta: 40 },
    { archivo: "pop.wav", en: "Sin" },
    { archivo: "whoosh2.wav", en: "pasaba", retraso: -0.1, vol: 0.7 },
    { archivo: "whoosh2.wav", en: "fiesta", vez: 1, retraso: -0.1, vol: 0.7 },
    { archivo: "whoosh2.wav", en: "fiesta", vez: 2, retraso: -0.1, vol: 0.7 },
    { archivo: "impacto.wav", en: "pudría" },
  ],
};
