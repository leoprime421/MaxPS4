// IDEA 1 · El despertador humano (Inglaterra, ~1900). Fondos: calle, fachada, dormitorio.
// Guion: Guiones/1 - El despertador humano.txt
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { clamp, suave } from "../motor/cine";
import { EncuadreCuadro } from "../motor/parallax";
import { Copos, Fondo, Halo, Impacto, LineasVelocidad, Niebla, TextoEscena, escalaMuneco, useProyeccion } from "../motor/escena";
import { FiltroLuz, LINEA, LUZ_LUNA, LUZ_NOCHE, Luz, Muneco, Personaje, TINTA } from "../motor/muneco";
import { useVoz } from "../motor/voz";
import { IdeaDef } from "../motor/video";

// ---------------------------------------------------------------- personajes
const DESPERTADOR: Personaje = { ropa: "#3f6b4f", ropaOscura: "#2f5340", botones: "#e2b45a", bufanda: "#c23b32", sombrero: "gorra", colorSombrero: "#4a4a58", bigote: "#5b3a26" };
const VECINO: Personaje = { ropa: "#e9e2f2", ropaOscura: "#c9c0d8", sombrero: "gorro", colorSombrero: "#d9d2ea", piel: "#f4dcc4" };
const PALO_HOMBRO = { x: 160, y: -560 };

/** El vecino tumbado en la cama: cabeza con gorro de dormir sobre la almohada y manta de retales. */
type CaraCama = "dormido" | "despierta" | "enfadado";
const Tumbado: React.FC<{ cabeza: { x: number; y: number }; pies: { x: number; y: number }; escala: number; cara: CaraCama; luz: Luz; id: string }> = ({ cabeza, pies, escala, cara, luz, id }) => {
  const f = useCurrentFrame();
  const respira = cara === "dormido" ? Math.sin(f * 0.12) * 5 : 0;
  const lx = (pies.x - cabeza.x) / escala;
  const ly = (pies.y - cabeza.y) / escala;
  const alto = 70 + respira;
  const manta = `M 70 30 C 90 ${-alto}, ${lx - 60} ${ly - alto}, ${lx} ${ly - 20} L ${lx} ${ly + 40} L 60 70 Z`;
  const retales = ["#b65a43", "#d9a05b", "#6d84a8", "#8c4f6b", "#c97b4f"];
  const giro = cara === "dormido" ? -78 : cara === "despierta" ? -70 : -64;
  const sube = cara === "dormido" ? 0 : -12;
  const t = f / 30;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} width={1} height={1}>
      <defs>
        <FiltroLuz id={id} luz={luz} />
        <clipPath id={`${id}-manta`}>
          <path d={manta} />
        </clipPath>
      </defs>
      <g transform={`translate(${cabeza.x} ${cabeza.y}) scale(${escala})`} strokeLinejoin="round" filter={`url(#${id})`}>
        <g transform={`translate(0 ${sube}) rotate(${giro})`}>
          <path d="M -80 -50 C -60 -170, 70 -190, 96 -60 C 50 -80, -30 -80, -80 -50 Z" fill="#e9e2f2" stroke={TINTA} strokeWidth={LINEA} />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M ${-58 + i * 44} ${-78 - i * 18} C ${-40 + i * 44} ${-110 - i * 14}, ${-10 + i * 44} ${-118 - i * 10}, ${10 + i * 44} ${-104 - i * 6}`} stroke="#c23b32" strokeWidth={13} fill="none" />
          ))}
          <circle cx={0} cy={0} r={92} fill="#f4dcc4" stroke={TINTA} strokeWidth={LINEA} />
          <path d="M -80 -50 C -60 -120, 70 -130, 92 -40 C 50 -66, -30 -70, -80 -50 Z" fill="#e9e2f2" stroke={TINTA} strokeWidth={LINEA} />
          <ellipse cx={-44} cy={34} rx={14} ry={8} fill="#f2b3a8" opacity={0.75} />
          <ellipse cx={48} cy={34} rx={14} ry={8} fill="#f2b3a8" opacity={0.75} />
          {cara === "dormido" ? (
            <g stroke={TINTA} strokeWidth={LINEA} strokeLinecap="round" fill="none">
              <path d="M -44 0 Q -30 12 -16 0 M 16 0 Q 30 12 44 0" />
              <ellipse cx={0} cy={44} rx={9} ry={11} fill={TINTA} />
            </g>
          ) : (
            <g>
              {[-32, 32].map((dx) => (
                <g key={dx}>
                  <circle cx={dx} cy={-2} r={cara === "despierta" ? 26 : 20} fill="#fff" stroke={TINTA} strokeWidth={LINEA} />
                  <circle cx={dx + 2} cy={0} r={8} fill={TINTA} />
                </g>
              ))}
              {cara === "enfadado" && <path d="M -56 -40 L -14 -22 M 56 -40 L 14 -22" stroke={TINTA} strokeWidth={LINEA + 2} strokeLinecap="round" />}
              <path d={cara === "enfadado" ? "M -20 50 Q 0 38 20 50" : "M -12 46 L 12 46"} stroke={TINTA} strokeWidth={LINEA} fill="none" strokeLinecap="round" />
            </g>
          )}
        </g>
        <path d={manta} fill={retales[0]} stroke={TINTA} strokeWidth={LINEA} />
        <g clipPath={`url(#${id}-manta)`}>
          {Array.from({ length: 40 }, (_, i) => {
            const c = i % 8;
            const fila = Math.floor(i / 8);
            return <rect key={i} x={40 + c * ((lx - 20) / 7)} y={-alto - 20 + fila * 45} width={(lx - 20) / 7} height={45} fill={retales[(c + fila * 2) % retales.length]} stroke="rgba(20,16,24,0.35)" strokeWidth={3} />;
          })}
        </g>
        <path d={manta} fill="none" stroke={TINTA} strokeWidth={LINEA} />
        {cara === "dormido" &&
          [0, 1, 2].map((i) => {
            const k = (((t * 0.9 + i / 3) % 1) + 1) % 1;
            return (
              <text key={i} x={60 + k * 110} y={-150 - k * 160} fontFamily="Montserrat" fontWeight={900} fontSize={40 + k * 30} fill="#fff" stroke={TINTA} strokeWidth={6} paintOrder="stroke" opacity={Math.sin(k * Math.PI)}>
                Z
              </text>
            );
          })}
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------- planos
const lineal = (x: number) => x;

// 1. Calle de noche: viene andando con el palo al hombro.
const Calle: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.5 + t * 0.02, y: 0.55 + t * 0.05, zoom: 1.04 + t * 0.3 };
  };
  const pro = useProyeccion(encuadre);
  const t = suave(f, 0, dur, lineal);
  const p = pro(0.47 + t * 0.02, 0.68 + t * 0.04, 0.58 + t * 0.1);
  const lamparas = [pro(0.21, 0.335, 0.62), pro(0.385, 0.43, 0.35), pro(0.65, 0.43, 0.35)];
  return (
    <>
      <Fondo nombre="calle" encuadre={encuadre} />
      {lamparas.map((l, i) => (
        <Halo key={i} x={l.x} y={l.y} r={l.px * 0.09} semilla={i * 3} />
      ))}
      <Niebla y={1050} opacidad={0.5} />
      <Muneco id="c1" x={p.x} y={p.y} escala={escalaMuneco(p, 0.19)} personaje={DESPERTADOR} luz={LUZ_NOCHE} pose={{ cara: "normal", andar: f * 0.32, palo: PALO_HOMBRO, parpadeo: 20 }} />
      <Copos n={70} velocidad={1.2} color="#e8ecff" tam={4} />
    </>
  );
};

// 2. Dormitorio: el vecino ronca; la mesilla está vacía (no hay despertador).
const Dormitorio: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.36 - t * 0.04, y: 0.56, zoom: 1.45 + t * 0.35 };
  };
  const pro = useProyeccion(encuadre, 0.7);
  const cabeza = pro(0.3, 0.545, 0.62);
  const pies = pro(0.97, 0.6, 0.62);
  const mesilla = pro(0.11, 0.645, 0.75);
  const vela = pro(0.07, 0.57, 0.75);
  const pregunta = E("despertador");
  return (
    <>
      <Fondo nombre="dormitorio" encuadre={encuadre} bloom={0.35} />
      <Halo x={vela.x} y={vela.y} r={vela.px * 0.05} semilla={7} color="255,190,110" />
      <Tumbado id="d2" cabeza={cabeza} pies={pies} escala={(cabeza.px * 0.042) / 92} cara="dormido" luz={LUZ_LUNA} />
      <TextoEscena x={mesilla.x + 10} y={mesilla.y - mesilla.px * 0.08 - interpolate(f, [pregunta, pregunta + 8], [20, 0], clamp)} tam={mesilla.px * 0.07} opacidad={interpolate(f, [pregunta, pregunta + 6], [0, 1], clamp)}>
        ?
      </TextoEscena>
      <Copos n={30} velocidad={0.15} color="#cfe0ff" tam={2.5} />
    </>
  );
};

// 3. Fachada: el palo largo golpea la ventana. «Toc, toc, toc». La hora apuntada con tiza.
const Fachada: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.42 + t * 0.06, y: 0.6, zoom: 1.08 + t * 0.17 };
  };
  const pro = useProyeccion(encuadre, 0.6);
  const pies = pro(0.3, 0.9, 0.82);
  const esc = escalaMuneco(pies, 0.36);
  const golpes = [E("golpeara"), E("ventana")];
  const golpe = golpes.reduce((a, gi) => a + Math.max(0, 1 - Math.abs(f - gi) / 3), 0);
  const punta = pro(0.6 + golpe * 0.012, 0.29 - golpe * 0.006, 0.3);
  const ventana = pro(0.6, 0.29, 0.3);
  const tiza = pro(0.69, 0.58, 0.22);
  const farola = pro(0.098, 0.31, 0.55);
  return (
    <>
      <Fondo nombre="fachada" encuadre={encuadre} />
      <Halo x={farola.x} y={farola.y} r={farola.px * 0.13} semilla={5} />
      <TextoEscena x={tiza.x} y={tiza.y} tam={tiza.px * 0.036} giro={-5} letra="tiza">
        Despiérteme
        <br />a las
        <br />5:00
      </TextoEscena>
      <Niebla y={1250} opacidad={0.35} />
      <Muneco id="f3" x={pies.x} y={pies.y} escala={esc} personaje={DESPERTADOR} luz={LUZ_NOCHE} pose={{ cara: "normal", palo: { x: (punta.x - pies.x) / esc, y: (punta.y - pies.y) / esc }, parpadeo: 40 }} />
      {golpes.map((gi, i) => (
        <Impacto key={i} x={ventana.x} y={ventana.y} t={(f - gi) / 8} tam={ventana.px * 0.12} />
      ))}
      <Copos n={60} velocidad={1.1} color="#e8ecff" tam={4} />
    </>
  );
};

// 4. Dentro: «Toc, toc, toc», el palo golpea el cristal y el vecino se despierta enfadado.
const Despierta: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.6 - t * 0.22, y: 0.42 + t * 0.1, zoom: 1.3 + t * 0.3 };
  };
  const pro = useProyeccion(encuadre, 0.8);
  const golpes = [E("toc", 0), E("toc", 1), E("toc", 2)];
  const golpe = golpes.reduce((a, gi) => a + Math.max(0, 1 - Math.abs(f - gi) / 3), 0);
  const v0 = pro(0.62, 0.18, 0.3);
  const v1 = pro(0.91, 0.465, 0.3);
  const punta = pro(0.7 - golpe * 0.01, 0.38 - golpe * 0.01, 0.3);
  const cola = pro(0.6, 0.62, 0.3);
  const cabeza = pro(0.3, 0.545, 0.62);
  const pies = pro(0.97, 0.6, 0.62);
  const cara: CaraCama = f < golpes[1] ? "dormido" : f < golpes[2] + 6 ? "despierta" : "enfadado";
  return (
    <>
      <Fondo nombre="dormitorio" encuadre={encuadre} bloom={0.35} />
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
        <defs>
          <clipPath id="cristal4">
            <rect x={v0.x} y={v0.y} width={v1.x - v0.x} height={v1.y - v0.y} />
          </clipPath>
        </defs>
        <g clipPath="url(#cristal4)" opacity={0.8}>
          <line x1={cola.x} y1={cola.y} x2={punta.x} y2={punta.y} stroke={TINTA} strokeWidth={punta.px * 0.016} strokeLinecap="round" />
          <line x1={cola.x} y1={cola.y} x2={punta.x} y2={punta.y} stroke="#7d5a3c" strokeWidth={punta.px * 0.008} strokeLinecap="round" />
        </g>
      </svg>
      {golpes.map((gi, i) => (
        <Impacto key={i} x={punta.x} y={punta.y} t={(f - gi) / 8} tam={punta.px * 0.1} />
      ))}
      <Tumbado id="d4" cabeza={cabeza} pies={pies} escala={(cabeza.px * 0.042) / 92} cara={cara} luz={LUZ_LUNA} />
      <Copos n={30} velocidad={0.15} color="#cfe0ff" tam={2.5} />
    </>
  );
};

// 5. Fachada de cerca: no se va hasta que el vecino se asoma (enfadado) a la ventana encendida.
const Asoma: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.5, y: 0.38 + t * 0.01, zoom: 1.42 + t * 0.1 };
  };
  const pro = useProyeccion(encuadre, 0.6);
  const asoma = E("asomabas");
  const luz = suave(f, asoma - 4, asoma + 2);
  const sube = Easing.out(Easing.back(1.6))(suave(f, asoma, asoma + 8, lineal));
  const v0 = pro(0.27, 0.04, 0.22);
  const v1 = pro(0.71, 0.29, 0.22);
  // solo asoma de los hombros para arriba: los pies quedan muy por debajo del alféizar
  const vecino = pro(0.49, 0.4 + (1 - sube) * 0.2, 0.22);
  const pies = pro(0.3, 0.9, 0.82);
  const esc = escalaMuneco(pies, 0.36);
  const punta = pro(0.6, 0.29, 0.3);
  return (
    <>
      <Fondo nombre="fachada" encuadre={encuadre} />
      {luz > 0 && (
        <div
          style={{
            position: "absolute",
            left: v0.x,
            top: v0.y,
            width: v1.x - v0.x,
            height: v1.y - v0.y,
            background: "radial-gradient(ellipse at 50% 55%, rgba(255,214,140,0.95), rgba(255,170,80,0.55) 60%, rgba(255,150,60,0) 100%)",
            mixBlendMode: "screen",
            opacity: luz,
          }}
        />
      )}
      {sube > 0 && (
        <div style={{ position: "absolute", left: v0.x, top: v0.y, width: v1.x - v0.x, height: v1.y - v0.y, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: -v0.x, top: -v0.y }}>
            <Muneco id="v5" x={vecino.x} y={vecino.y} escala={escalaMuneco(vecino, 0.3)} personaje={VECINO} luz={LUZ_NOCHE} pose={{ cara: "enfadado", parpadeo: 11, manoA: { x: -110, y: -330 }, manoB: { x: 110, y: -330 } }} />
          </div>
        </div>
      )}
      <Muneco id="f5" x={pies.x} y={pies.y} escala={esc} personaje={DESPERTADOR} luz={LUZ_NOCHE} pose={{ cara: f > asoma + 6 ? "chulo" : "normal", palo: { x: (punta.x - pies.x) / esc, y: (punta.y - pies.y) / esc }, parpadeo: 3 }} />
      <Copos n={60} velocidad={1.1} color="#e8ecff" tam={5} />
    </>
  );
};

// 6. Calle, ya amaneciendo: «por unas monedas a la semana despertaba a toda la calle».
const Ronda: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.52 - t * 0.04, y: 0.6, zoom: 1.35 + t * 0.15 };
  };
  const pro = useProyeccion(encuadre);
  const t = suave(f, 0, dur, lineal);
  const p = pro(0.36 + t * 0.1, 0.8, 0.8);
  const monedas = E("monedas");
  const moneda = suave(f, monedas, monedas + 6, Easing.out(Easing.back(2)));
  const amanece = suave(f, E("amanecer") - 10, dur, lineal);
  return (
    <>
      <Fondo nombre="calle" encuadre={encuadre} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,150,120,0.55), rgba(255,190,140,0.25) 35%, rgba(255,190,140,0) 60%)", mixBlendMode: "screen", opacity: amanece }} />
      <Niebla y={1100} opacidad={0.4} />
      <Muneco
        id="r6"
        x={p.x}
        y={p.y}
        escala={escalaMuneco(p, 0.3)}
        personaje={DESPERTADOR}
        luz={LUZ_NOCHE}
        pose={{
          cara: f > monedas ? "feliz" : "normal",
          andar: f * 0.3,
          palo: PALO_HOMBRO,
          manoB: f > monedas ? { x: 90, y: -260 } : null,
          enMano:
            f > monedas ? (
              <g transform={`scale(${moneda})`}>
                <circle cx={0} cy={-36} r={30} fill="#f2c94c" stroke={TINTA} strokeWidth={6} />
                <text x={0} y={-24} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={34} fill="#a8741a">
                  $
                </text>
              </g>
            ) : null,
          parpadeo: 30,
        }}
      />
      <Copos n={40} velocidad={1.0} color="#fff4ea" tam={4} />
    </>
  );
};

// 7. Primer plano: «Pero había un problema. ¿Y a él? ¿Quién le despertaba?»
const PrimerPlano: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { E } = useVoz();
  const encuadre = (g: number): EncuadreCuadro => {
    const t = suave(g, 0, dur, lineal);
    return { x: 0.5, y: 0.6 - t * 0.02, zoom: 1.5 + t * 0.12 };
  };
  const pop = E("Quién");
  const susto = f >= pop;
  const salto = susto ? Math.max(0, 1 - (f - pop) / 6) : 0;
  const temblor = susto && f - pop < 8 ? Math.sin(f * 2.3) * 6 * (1 - (f - pop) / 8) : 0;
  const escala = 2.55 + suave(f, 0, dur, lineal) * 0.3 + (susto ? suave(f, pop, pop + 5) * 0.12 : 0);
  const senala = suave(f, E("él") - 4, E("él") + 2);
  const mejilla = suave(f, pop, pop + 4);
  const manoB = { x: interpolate(senala, [0, 1], [70, 18]) + mejilla * 70, y: interpolate(senala, [0, 1], [-150, -170]) - mejilla * 150 };
  const cara = susto ? "susto" : f >= E("él") - 4 ? "chulo" : "normal";
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateX(${temblor}px)` }}>
      <Fondo nombre="calle" encuadre={encuadre} bloom={0.7} desenfoque={9} />
      <Niebla y={1200} opacidad={0.4} />
      <LineasVelocidad cx={540} cy={880} t={(f - pop) / 10} />
      <Muneco
        id="p7"
        x={540}
        y={880 + 312 * escala}
        escala={escala}
        personaje={DESPERTADOR}
        luz={LUZ_NOCHE}
        pose={{ cara, palo: { x: -230, y: -660 }, manoB, salto, gota: susto ? suave(f, pop + 6, dur, lineal) : 0, parpadeo: 5 }}
      />
      <Copos n={45} velocidad={1.4} color="#e8ecff" tam={6} />
    </div>
  );
};

export const IDEA_1: IdeaDef = {
  id: "1",
  fondos: ["calle", "fachada", "dormitorio"],
  musica: "sneaky-snitch.mp3",
  planos: [
    { C: Calle, empieza: null, entrada: "nada" },
    { C: Dormitorio, empieza: "casi", entrada: "fundido" },
    { C: Fachada, empieza: "Así", entrada: "barrido" },
    { C: Despierta, empieza: "Toc", entrada: "fundido" },
    { C: Asoma, empieza: "Y no se iba", entrada: "barrido" },
    { C: Ronda, empieza: "Por unas", entrada: "barrido" },
    { C: PrimerPlano, empieza: "Pero", entrada: "barrido" },
  ],
  sonidos: [
    { archivo: "tok.wav", en: "golpeara" },
    { archivo: "tok.wav", en: "ventana" },
    { archivo: "tok.wav", en: "toc", vez: 0 },
    { archivo: "tok.wav", en: "toc", vez: 1 },
    { archivo: "tok.wav", en: "toc", vez: 2 },
    { archivo: "monedas.wav", en: "monedas" },
    { archivo: "pop.wav", en: "Quién" },
  ],
};
