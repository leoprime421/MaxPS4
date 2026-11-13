// IDEA 3 · El hombre de la bandera roja (Inglaterra, 1865). Fondos: despacho, camino, pueblo.
// Guion: Guiones/3 - El hombre de la bandera roja.txt
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { clamp, suave } from "../motor/cine";
import { EncuadreCuadro } from "../motor/parallax";
import { Copos, Fondo, Impacto, TextoEscena, escalaMuneco, useProyeccion } from "../motor/escena";
import { FiltroLuz, LINEA, LUZ_DIA, LUZ_INTERIOR, Luz, Muneco, Personaje, TINTA } from "../motor/muneco";
import { useVoz } from "../motor/voz";
import { IdeaDef } from "../motor/video";

// ---------------------------------------------------------------- personajes
const ABANDERADO: Personaje = { ropa: "#7a5236", ropaOscura: "#5e3e28", botones: "#e2b45a", sombrero: "bombin", colorSombrero: "#3a3030", bigote: "#4a3020" };
const ROJA = "#d23a32";
const lineal = (x: number) => x;

// ---------------------------------------------------------------- la máquina de vapor de carretera (vista de frente)
/** Ruedas en (0,0); mide ~620 unidades de alto con la chimenea. `t` = segundos, para el humo y el traqueteo. */
const Maquina: React.FC<{ x: number; y: number; escala: number; t: number; luz: Luz; id: string; humo?: number }> = ({ x, y, escala, t, luz, id, humo = 1 }) => {
  const tiembla = Math.sin(t * 26) * 3;
  const gira = (t * 40) % 360;
  const rueda = (cx: number, cy: number, r: number, color: string) => (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#3b2a22" stroke={TINTA} strokeWidth={LINEA} />
      <circle cx={cx} cy={cy} r={r * 0.82} fill={color} stroke={TINTA} strokeWidth={5} />
      <g transform={`rotate(${gira} ${cx} ${cy})`}>
        {[0, 30, 60, 90, 120, 150].map((g) => (
          <line key={g} x1={cx + Math.cos((g * Math.PI) / 180) * r * 0.8} y1={cy + Math.sin((g * Math.PI) / 180) * r * 0.8} x2={cx - Math.cos((g * Math.PI) / 180) * r * 0.8} y2={cy - Math.sin((g * Math.PI) / 180) * r * 0.8} stroke={TINTA} strokeWidth={6} />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={r * 0.18} fill="#c9a24a" stroke={TINTA} strokeWidth={5} />
    </g>
  );
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} width={1} height={1}>
      <defs>
        <FiltroLuz id={id} luz={luz} />
      </defs>
      <g transform={`translate(${x} ${y}) scale(${escala})`} strokeLinejoin="round">
        <ellipse cx={0} cy={6} rx={260} ry={26} fill="rgba(30,20,10,0.35)" />
        <g filter={`url(#${id})`} transform={`translate(0 ${tiembla})`}>
          {/* techo con postes */}
          <line x1={-150} y1={-300} x2={-150} y2={-520} stroke={TINTA} strokeWidth={14} />
          <line x1={150} y1={-300} x2={150} y2={-520} stroke={TINTA} strokeWidth={14} />
          <path d="M -210 -520 Q 0 -560 210 -520 L 200 -500 Q 0 -536 -200 -500 Z" fill="#2f4a3a" stroke={TINTA} strokeWidth={LINEA} />
          {/* conductor asomado */}
          <circle cx={118} cy={-392} r={44} fill="#f7ead8" stroke={TINTA} strokeWidth={LINEA} />
          <path d="M 96 -398 L 108 -398 M 128 -398 L 140 -398" stroke={TINTA} strokeWidth={6} strokeLinecap="round" />
          <path d="M 70 -420 Q 118 -470 166 -420 Z" fill="#3a3030" stroke={TINTA} strokeWidth={LINEA} />
          <path d="M 56 -418 Q 118 -436 180 -418" stroke={TINTA} strokeWidth={LINEA} fill="none" />
          {/* ruedas grandes de atrás */}
          {rueda(-178, -150, 150, "#b5352c")}
          {rueda(178, -150, 150, "#b5352c")}
          {/* caldera de frente */}
          <rect x={-120} y={-360} width={240} height={250} rx={40} fill="#2f4a3a" stroke={TINTA} strokeWidth={LINEA} />
          <circle cx={0} cy={-240} r={112} fill="#2f4a3a" stroke={TINTA} strokeWidth={LINEA} />
          <circle cx={0} cy={-240} r={112} fill="none" stroke="#c9a24a" strokeWidth={10} />
          <circle cx={0} cy={-240} r={72} fill="#20352a" stroke={TINTA} strokeWidth={LINEA} />
          {Array.from({ length: 10 }, (_, i) => (
            <circle key={i} cx={Math.cos((i / 10) * Math.PI * 2) * 92} cy={-240 + Math.sin((i / 10) * Math.PI * 2) * 92} r={6} fill="#c9a24a" />
          ))}
          <rect x={-8} y={-250} width={60} height={14} rx={7} fill="#c9a24a" stroke={TINTA} strokeWidth={4} />
          {/* chimenea */}
          <rect x={-30} y={-600} width={60} height={250} fill="#1e1e24" stroke={TINTA} strokeWidth={LINEA} />
          <rect x={-44} y={-622} width={88} height={30} rx={6} fill="#c9a24a" stroke={TINTA} strokeWidth={LINEA} />
          {/* ruedas pequeñas de delante */}
          {rueda(-70, -56, 56, "#7b2a22")}
          {rueda(70, -56, 56, "#7b2a22")}
        </g>
        {/* humo: bolas que suben, crecen y se van */}
        {humo > 0 &&
          Array.from({ length: 7 }, (_, i) => {
            const k = (t * 0.55 + i / 7) % 1;
            const r = 30 + k * 90;
            return <circle key={i} cx={Math.sin(i * 2.1 + t) * 30 + k * 160} cy={-640 - k * 420} r={r} fill="#f4f1ec" stroke={TINTA} strokeWidth={5} opacity={(1 - k) * 0.9 * humo} />;
          })}
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------- un caballo de dibujo (de lado)
const Caballo: React.FC<{ x: number; y: number; escala: number; susto: number; luz: Luz; id: string; voltear?: boolean }> = ({ x, y, escala, susto, luz, id, voltear }) => {
  const f = useCurrentFrame();
  const giro = -susto * 24; // se encabrita sobre las patas de atrás
  const respira = Math.sin(f * 0.12) * 3;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} width={1} height={1}>
      <defs>
        <FiltroLuz id={id} luz={luz} />
      </defs>
      <g transform={`translate(${x} ${y}) scale(${(voltear ? -1 : 1) * escala} ${escala})`} strokeLinejoin="round">
        <ellipse cx={0} cy={4} rx={150} ry={16} fill="rgba(30,20,10,0.35)" />
        <g filter={`url(#${id})`} transform={`rotate(${giro} -110 -10)`}>
          {[-110, -80, 80, 110].map((px, i) => (
            <g key={i}>
              <path d={`M ${px} -150 L ${px + (i > 1 ? susto * 40 : 0)} -10`} stroke={TINTA} strokeWidth={20} strokeLinecap="round" />
              <ellipse cx={px + (i > 1 ? susto * 40 : 0)} cy={-6} rx={18} ry={10} fill="#2a1d16" stroke={TINTA} strokeWidth={4} />
            </g>
          ))}
          <path d="M -150 -220 C -210 -200, -220 -140, -196 -100" stroke="#3a261a" strokeWidth={26} fill="none" strokeLinecap="round" />
          <path d={`M -160 -170 C -170 -260, 150 -270, 160 -180 C 168 -120, -150 ${-110 + respira}, -160 -170 Z`} fill="#a8683c" stroke={TINTA} strokeWidth={LINEA} />
          <path d="M 110 -220 C 150 -300, 170 -340, 190 -360 L 240 -320 C 210 -290, 190 -240, 160 -190 Z" fill="#a8683c" stroke={TINTA} strokeWidth={LINEA} />
          <ellipse cx={240} cy={-340} rx={70} ry={42} transform="rotate(25 240 -340)" fill="#a8683c" stroke={TINTA} strokeWidth={LINEA} />
          <path d="M 170 -370 C 150 -320, 140 -280, 120 -230" stroke="#3a261a" strokeWidth={22} fill="none" strokeLinecap="round" />
          <path d="M 196 -392 L 206 -430 L 222 -388 Z" fill="#a8683c" stroke={TINTA} strokeWidth={5} />
          {susto > 0.3 ? (
            <g>
              <circle cx={240} cy={-356} r={16} fill="#fff" stroke={TINTA} strokeWidth={5} />
              <circle cx={244} cy={-356} r={6} fill={TINTA} />
              <ellipse cx={292} cy={-312} rx={12} ry={16} fill="#7a1f2b" stroke={TINTA} strokeWidth={5} />
            </g>
          ) : (
            <circle cx={240} cy={-354} r={7} fill={TINTA} />
          )}
          <circle cx={290} cy={-326} r={5} fill={TINTA} />
        </g>
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------- planos
// 1. Despacho del Parlamento: «En 1865, Inglaterra aprobó una ley muy rara». Sello: APROBADA.
const Despacho: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.46, y: 0.73 + t * 0.01, zoom: 1.3 + t * 0.35 };
  };
  const pro = useProyeccion(encuadre, 0.7);
  const papel = pro(0.45, 0.705, 0.62);
  const sello = E("ley");
  const baja = suave(f, sello - 8, sello, Easing.in(Easing.quad));
  const sube = suave(f, sello + 6, sello + 16, Easing.out(Easing.quad));
  const altura = (1 - baja) * 520 + sube * 560;
  const marca = f >= sello;
  const k = papel.px / 2100; // unidades del papel → píxeles
  const año = E("1865");
  return (
    <>
      <Fondo nombre="despacho" encuadre={encuadre} bloom={0.45} />
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} width={1} height={1}>
        <defs>
          <FiltroLuz id="papel1" luz={LUZ_INTERIOR} />
        </defs>
        <g transform={`translate(${papel.x} ${papel.y}) scale(${k}) rotate(-6)`} filter="url(#papel1)">
          <rect x={-120} y={-150} width={240} height={300} rx={8} fill="#f4ecd8" stroke={TINTA} strokeWidth={LINEA} />
          <text x={0} y={-80} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={54} fill="#2b2320">
            LEY
          </text>
          <text x={0} y={-24} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={40} fill="#2b2320" opacity={interpolate(f, [año, año + 6], [0, 1], clamp)}>
            1865
          </text>
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={-84} y1={20 + i * 26} x2={84 - (i % 2) * 30} y2={20 + i * 26} stroke="#8a7c68" strokeWidth={8} strokeLinecap="round" />
          ))}
          {marca && (
            <g transform={`rotate(-14) scale(${1 + Math.max(0, 1 - (f - sello) / 5) * 0.25})`}>
              <rect x={-110} y={34} width={220} height={74} rx={10} fill="none" stroke={ROJA} strokeWidth={10} opacity={0.9} />
              <text x={0} y={90} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={42} fill={ROJA} opacity={0.9}>
                APROBADA
              </text>
            </g>
          )}
          {/* el sello que baja */}
          {f > sello - 12 && f < sello + 16 && (
            <g transform={`translate(0 ${-altura}) rotate(-14)`}>
              <rect x={-90} y={40} width={180} height={50} rx={8} fill="#5a3a24" stroke={TINTA} strokeWidth={LINEA} />
              <rect x={-26} y={-110} width={52} height={150} rx={12} fill="#8a5a34" stroke={TINTA} strokeWidth={LINEA} />
              <circle cx={0} cy={-120} r={46} fill="#8a5a34" stroke={TINTA} strokeWidth={LINEA} />
            </g>
          )}
        </g>
      </svg>
      <Impacto x={papel.x} y={papel.y + 40 * k} t={(f - sello) / 9} tam={papel.px * 0.25} color="#fff" />
      <Copos n={30} velocidad={-0.12} color="#ffe9c0" tam={2.5} />
    </>
  );
};

// 2. Camino de campo: «para las primeras máquinas que circulaban por la carretera». Llega la máquina, humeando.
const Llega: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.5, y: 0.55 + t * 0.04, zoom: 1.05 + t * 0.25 };
  };
  const pro = useProyeccion(encuadre);
  const t = suave(f, 0, dur, lineal);
  const m = pro(0.505, 0.58 + t * 0.07, 0.35 + t * 0.15);
  return (
    <>
      <Fondo nombre="camino" encuadre={encuadre} />
      <Maquina id="m2" x={m.x} y={m.y} escala={(m.px * 0.17) / 620} t={f / 30} luz={LUZ_DIA} />
      <Copos n={25} velocidad={-0.2} color="#f6e7c4" tam={3} />
    </>
  );
};

// 3. Más cerca: «Cada una tenía que llevar a un hombre caminando delante, con una bandera roja».
const Delante: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.5, y: 0.66 - t * 0.02, zoom: 1.3 + t * 0.15 };
  };
  const pro = useProyeccion(encuadre);
  const t = suave(f, 0, dur, lineal);
  const m = pro(0.55, 0.66 + t * 0.02, 0.5 + t * 0.05);
  const entra = suave(f, E("hombre") - 14, E("hombre") + 6);
  const h = pro(0.4 - (1 - entra) * 0.5, 0.86 + t * 0.02, 0.78);
  const bandera = suave(f, E("bandera") - 4, E("bandera") + 4, Easing.out(Easing.back(2)));
  return (
    <>
      <Fondo nombre="camino" encuadre={encuadre} />
      <Maquina id="m3" x={m.x} y={m.y} escala={(m.px * 0.22) / 620} t={f / 30} luz={LUZ_DIA} />
      <Muneco
        id="h3"
        x={h.x}
        y={h.y}
        escala={escalaMuneco(h, 0.27)}
        personaje={ABANDERADO}
        luz={LUZ_DIA}
        pose={{ cara: "normal", andar: f * 0.3, palo: { x: -150 - bandera * 40, y: -470 - bandera * 120 }, bandera: ROJA, parpadeo: 12 }}
      />
      <Copos n={25} velocidad={-0.2} color="#f6e7c4" tam={3} />
    </>
  );
};

// 4. «para avisar a los caballos»: agita la bandera y un caballo se encabrita junto al seto.
const Caballos: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.62 + t * 0.02, y: 0.74, zoom: 1.32 + t * 0.1 };
  };
  const pro = useProyeccion(encuadre, 0.8);
  const aviso = E("caballos");
  const susto = suave(f, aviso - 4, aviso + 4) * (1 - suave(f, aviso + 20, aviso + 32));
  const agita = Math.sin(f * 0.6);
  const h = pro(0.43, 0.9, 0.8);
  const c = pro(0.82, 0.9, 0.8);
  return (
    <>
      <Fondo nombre="camino" encuadre={encuadre} />
      <Caballo id="c4" x={c.x} y={c.y} escala={(c.px * 0.24) / 400} susto={susto} luz={LUZ_DIA} voltear />
      <Muneco
        id="h4"
        x={h.x}
        y={h.y}
        escala={escalaMuneco(h, 0.27)}
        personaje={ABANDERADO}
        luz={LUZ_DIA}
        pose={{ cara: f > aviso ? "susto" : "normal", palo: { x: 170 + agita * 90, y: -560 + Math.abs(agita) * 40 }, bandera: ROJA, parpadeo: 22, salto: f > aviso ? Math.max(0, 1 - (f - aviso) / 6) : 0 }}
      />
      <TextoEscena x={c.x - 30} y={c.y - c.px * 0.2} tam={c.px * 0.07} opacidad={susto}>
        !
      </TextoEscena>
      <Impacto x={c.x - 20} y={c.y - c.px * 0.16} t={(f - aviso) / 9} tam={c.px * 0.14} />
      <Copos n={25} velocidad={-0.2} color="#f6e7c4" tam={3} />
    </>
  );
};

// 5. Pueblo: «Y en la ciudad no podían pasar de tres kilómetros por hora». Señal de MÁX 3 km/h.
const Ciudad: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.45, y: 0.62, zoom: 1.12 + t * 0.2 };
  };
  const pro = useProyeccion(encuadre);
  const t = suave(f, 0, dur, lineal);
  const m = pro(0.58, 0.66 + t * 0.015, 0.55);
  const h = pro(0.37, 0.84 + t * 0.02, 0.75);
  const s = pro(0.17, 0.79, 0.74);
  const cartel = suave(f, E("tres") - 6, E("tres") + 4, Easing.out(Easing.back(1.8)));
  const k = (s.px * 0.2) / 400;
  return (
    <>
      <Fondo nombre="pueblo" encuadre={encuadre} />
      <Maquina id="m5" x={m.x} y={m.y} escala={(m.px * 0.2) / 620} t={f / 30} luz={LUZ_DIA} />
      <Muneco id="h5" x={h.x} y={h.y} escala={escalaMuneco(h, 0.25)} personaje={ABANDERADO} luz={LUZ_DIA} pose={{ cara: "normal", andar: f * 0.12, palo: { x: -170, y: -560 }, bandera: ROJA, parpadeo: 31 }} />
      {/* la señal de velocidad: crece desde el suelo */}
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} width={1} height={1}>
        <defs>
          <FiltroLuz id="s5" luz={LUZ_DIA} />
        </defs>
        <g transform={`translate(${s.x} ${s.y}) scale(${k} ${k * cartel})`} filter="url(#s5)">
          <rect x={-10} y={-300} width={20} height={300} fill="#5a4a3a" stroke={TINTA} strokeWidth={LINEA} />
          <circle cx={0} cy={-380} r={110} fill="#fff" stroke={ROJA} strokeWidth={30} />
          <circle cx={0} cy={-380} r={125} fill="none" stroke={TINTA} strokeWidth={LINEA} />
          <text x={0} y={-366} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={96} fill="#141018">
            3
          </text>
          <text x={0} y={-318} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={36} fill="#141018">
            km/h
          </text>
        </g>
      </svg>
      <Copos n={20} velocidad={-0.15} color="#f6e7c4" tam={3} />
    </>
  );
};

// 6. Giro final: el señor de la bandera va más rápido y tiene que esperar a la máquina.
const Espera: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.5, y: 0.72 - t * 0.02, zoom: 1.5 + t * 0.15 };
  };
  const pro = useProyeccion(encuadre, 0.6);
  const t = suave(f, 0, dur, lineal);
  const m = pro(0.6, 0.6 + t * 0.012, 0.42);
  const lento = E("lento");
  const espera = f > E("iba");
  const h = pro(0.36, 0.97, 0.9);
  const pie = espera ? Math.max(0, Math.sin(f * 0.7)) * 14 : 0; // da golpecitos con el pie
  const final = E("bandera", 1);
  return (
    <>
      <Fondo nombre="camino" encuadre={encuadre} />
      <Maquina id="m6" x={m.x} y={m.y} escala={(m.px * 0.14) / 620} t={f / 30} luz={LUZ_DIA} />
      <Muneco
        id="h6"
        x={h.x}
        y={h.y}
        escala={escalaMuneco(h, 0.4)}
        personaje={ABANDERADO}
        luz={LUZ_DIA}
        pose={{
          cara: f >= final ? "chulo" : espera ? "triste" : "normal",
          andar: espera ? undefined : f * 0.3,
          palo: { x: -80, y: -570 },
          bandera: ROJA,
          manoB: f >= lento ? { x: 92, y: -250 } : espera ? { x: 70, y: -170 } : null,
          enMano:
            f >= lento ? (
              <g transform={`scale(${suave(f, lento, lento + 6, Easing.out(Easing.back(2)))})`}>
                <line x1={0} y1={0} x2={20} y2={-36} stroke="#c9a24a" strokeWidth={5} />
                <circle cx={26} cy={-60} r={34} fill="#f3e6c4" stroke={TINTA} strokeWidth={6} />
                <circle cx={26} cy={-60} r={34} fill="none" stroke="#c9a24a" strokeWidth={4} />
                <line x1={26} y1={-60} x2={26} y2={-84} stroke={TINTA} strokeWidth={5} strokeLinecap="round" />
                <line x1={26} y1={-60} x2={42} y2={-56} stroke={TINTA} strokeWidth={5} strokeLinecap="round" />
              </g>
            ) : null,
          arriba: pie * 0.2,
          mira: 0.8,
          gota: f >= lento ? suave(f, lento, dur, lineal) : 0,
          parpadeo: 9,
        }}
      />
      <Copos n={25} velocidad={-0.2} color="#f6e7c4" tam={3} />
    </>
  );
};

export const IDEA_3: IdeaDef = {
  id: "3",
  fondos: ["despacho", "camino", "pueblo"],
  musica: "sneaky-snitch.mp3",
  planos: [
    { C: Despacho, empieza: null, entrada: "nada" },
    { C: Llega, empieza: "para las", entrada: "barrido" },
    { C: Delante, empieza: "Cada", entrada: "fundido" },
    { C: Caballos, empieza: "para avisar", entrada: "barrido" },
    { C: Ciudad, empieza: "Y en la", entrada: "barrido" },
    { C: Espera, empieza: "O sea", entrada: "barrido" },
  ],
  sonidos: [
    { archivo: "golpe.wav", en: "ley" },
    { archivo: "silbato.wav", en: "máquinas", vol: 0.8 },
    { archivo: "paso_1.wav", en: "caminando" },
    { archivo: "paso_2.wav", en: "delante" },
    { archivo: "impacto.wav", en: "caballos" },
    { archivo: "pop.wav", en: "tres" },
    { archivo: "tictac.wav", en: "lento", vol: 0.8 },
    { archivo: "pop.wav", en: "bandera", vez: 1 },
  ],
};
