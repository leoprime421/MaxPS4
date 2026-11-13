// Los muñecos del estilo: cabeza redonda, cuerpo de judía, brazos y piernas de goma, contorno negro grueso.
// Se dibujan en SVG con los pies en (0,0) y miden ~430 unidades de alto; la luz de cada plano los tiñe (FiltroLuz).
import React from "react";
import { useCurrentFrame } from "remotion";
import { useVariante, variarColores } from "./variante";

export const TINTA = "#141018";
export const LINEA = 7;
export type Punto = { x: number; y: number };

// ---------------------------------------------------------------- luz de la escena
export type Luz = { tinte: [number, number, number]; borde: string; lado: number; fuerza: number };
export const LUZ_NOCHE: Luz = { tinte: [0.8, 0.82, 1.0], borde: "#ffb46a", lado: -1, fuerza: 0.5 };
export const LUZ_LUNA: Luz = { tinte: [0.72, 0.8, 1.0], borde: "#bcd6ff", lado: 1, fuerza: 0.45 };
export const LUZ_DIA: Luz = { tinte: [1.0, 0.98, 0.95], borde: "#fff2c8", lado: -1, fuerza: 0.4 };
export const LUZ_INTERIOR: Luz = { tinte: [1.0, 0.92, 0.82], borde: "#ffc27a", lado: 1, fuerza: 0.45 };
export const LUZ_ATARDECER: Luz = { tinte: [1.0, 0.86, 0.78], borde: "#ff9a5a", lado: 1, fuerza: 0.55 };

export const FiltroLuz: React.FC<{ id: string; luz: Luz }> = ({ id, luz }) => {
  const [r, g, b] = luz.tinte;
  return (
    <filter id={id} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
      <feColorMatrix in="SourceGraphic" type="matrix" values={`${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`} result="tenido" />
      <feOffset in="SourceAlpha" dx={-luz.lado * 7} dy={3} result="movida" />
      <feComposite in="SourceAlpha" in2="movida" operator="out" result="media" />
      <feFlood floodColor={luz.borde} floodOpacity={luz.fuerza} />
      <feComposite in2="media" operator="in" result="borde" />
      <feGaussianBlur in="borde" stdDeviation={2.2} result="bordeSuave" />
      <feMerge>
        <feMergeNode in="tenido" />
        <feMergeNode in="bordeSuave" />
      </feMerge>
    </filter>
  );
};

// ---------------------------------------------------------------- aspecto del personaje
export type Sombrero = "gorra" | "chistera" | "bombin" | "gorro" | "peluca" | "ninguno";
export type Personaje = {
  piel?: string;
  ropa: string; // color del cuerpo
  ropaOscura?: string; // pliegue / sombra de la ropa
  botones?: string | null;
  bufanda?: string | null;
  delantal?: string | null; // delantal o chaleco por delante
  rayas?: string | null; // camiseta de rayas
  sombrero?: Sombrero;
  colorSombrero?: string;
  pelo?: string | null; // pelo visible bajo el sombrero o sin sombrero
  moño?: boolean; // pelo recogido (mujer)
  bigote?: string | null;
  vestido?: string | null; // falda larga (tapa las piernas)
  zapatos?: string;
  alto?: number; // 1 = normal; 0.8 = niño
  fijo?: boolean; // con variantes, NO cambiar sus colores (uniformes, ropa que cuenta la historia)
};

export type Cara = "normal" | "chulo" | "susto" | "feliz" | "enfadado" | "triste" | "dormido";
export type Pose = {
  cara: Cara;
  andar?: number; // fase del paso (radianes); sin valor, quieto
  correr?: boolean; // pasos más largos
  palo?: Punto | null; // punta de un palo largo (coordenadas locales, pies en 0,0); lo agarran las dos manos
  bandera?: string | null; // si hay palo, una bandera de este color en la punta
  manoA?: Punto | null; // mano izquierda (si está, manda sobre el palo)
  manoB?: Punto | null; // mano derecha
  enMano?: React.ReactNode; // algo dibujado en la mano derecha (coordenadas locales de la mano)
  gota?: number; // 0..1 gota de sudor
  salto?: number; // 0..1 estirón de susto
  arriba?: number; // levanta todo el muñeco (saltar)
  parpadeo?: number; // desfase del parpadeo
  mira?: number; // -1..1: hacia dónde mira (desplaza los ojos)
  habla?: boolean; // mueve la boca
};

const parpadea = (f: number, desfase: number) => (f + desfase) % 78 < 3;

export const Muneco: React.FC<{ x: number; y: number; escala: number; personaje: Personaje; pose: Pose; luz: Luz; id: string; voltear?: boolean }> = ({ x, y, escala, personaje, pose, luz, id, voltear }) => {
  const f = useCurrentFrame();
  const p = variarColores(personaje, useVariante().semilla);
  const alto = p.alto ?? 1;
  const paso = pose.andar ?? 0;
  const anda = pose.andar !== undefined;
  const zancada = pose.correr ? 46 : 30;
  const bote = anda ? Math.abs(Math.sin(paso)) * (pose.correr ? -18 : -10) : Math.sin(f * 0.11) * 2.5;
  const est = 1 + (pose.salto ?? 0) * 0.08;
  const piernas = 95 * alto;
  const cuerpoY = -piernas + bote - (pose.arriba ?? 0);
  const cabezaY = cuerpoY - 217 - (pose.salto ?? 0) * 18;
  const cierra = pose.cara === "dormido" || (pose.cara !== "susto" && parpadea(f, pose.parpadeo ?? 0));
  const mx = (pose.mira ?? 0) * 8;
  const pies = [-1, 1].map((lado) => {
    const fase = anda ? Math.sin(paso + (lado > 0 ? 0 : Math.PI)) : 0;
    return { px: lado * 24 + fase * zancada, py: (anda ? -Math.max(0, Math.cos(paso + (lado > 0 ? 0 : Math.PI))) * (pose.correr ? 22 : 12) : 0) - (pose.arriba ?? 0) };
  });
  const palo = pose.palo;
  const base = { x: -28, y: cuerpoY - 10 };
  const dir = palo ? { x: palo.x - base.x, y: palo.y - base.y } : { x: 0, y: -1 };
  const largo = Math.hypot(dir.x, dir.y) || 1;
  const enPalo = (d: number) => ({ x: base.x + (dir.x / largo) * d, y: base.y + (dir.y / largo) * d });
  const balanceo = anda ? Math.sin(paso) * (pose.correr ? 22 : 10) : 0;
  const manoA = pose.manoA ?? (palo ? enPalo(40) : { x: -78, y: cuerpoY - 40 + balanceo });
  const manoB = pose.manoB ?? (palo ? enPalo(105) : { x: 78, y: cuerpoY - 40 - balanceo });
  const hombroA = { x: -40, y: cuerpoY - 125 };
  const hombroB = { x: 40, y: cuerpoY - 125 };
  const brazo = (h: Punto, m: Punto, lado: number) => `M ${h.x} ${h.y} Q ${(h.x + m.x) / 2 + lado * 22} ${(h.y + m.y) / 2 + 18} ${m.x} ${m.y}`;
  const ropaOscura = p.ropaOscura ?? "rgba(0,0,0,0.18)";
  const piel = p.piel ?? "#f7ead8";
  const cy = cabezaY;

  const ojos = () => {
    if (pose.cara === "susto")
      return (
        <g>
          {[-36, 36].map((dx) => (
            <g key={dx}>
              <circle cx={dx} cy={cy - 4} r={27} fill="#fff" stroke={TINTA} strokeWidth={LINEA} />
              <circle cx={dx + 3 + mx} cy={cy - 2} r={8.5} fill={TINTA} />
            </g>
          ))}
          <path d={`M -46 ${cy - 46} L -22 ${cy - 40} M 46 ${cy - 46} L 22 ${cy - 40}`} stroke={TINTA} strokeWidth={LINEA} strokeLinecap="round" />
        </g>
      );
    if (cierra)
      return pose.cara === "feliz" || pose.cara === "dormido" ? (
        <path d={`M -44 ${cy} Q -30 ${cy - 14} -16 ${cy} M 16 ${cy} Q 30 ${cy - 14} 44 ${cy}`} stroke={TINTA} strokeWidth={LINEA} strokeLinecap="round" fill="none" />
      ) : (
        <path d={`M -40 ${cy - 4} L -20 ${cy - 4} M 20 ${cy - 4} L 40 ${cy - 4}`} stroke={TINTA} strokeWidth={LINEA} strokeLinecap="round" />
      );
    if (pose.cara === "feliz")
      return <path d={`M -44 ${cy} Q -30 ${cy - 16} -16 ${cy} M 16 ${cy} Q 30 ${cy - 16} 44 ${cy}`} stroke={TINTA} strokeWidth={LINEA} strokeLinecap="round" fill="none" />;
    if (pose.cara === "chulo")
      return (
        <g stroke={TINTA} strokeWidth={LINEA} strokeLinecap="round" fill="none">
          <path d={`M -52 ${cy - 8} L -18 ${cy - 8} M 18 ${cy - 8} L 52 ${cy - 8}`} />
          <circle cx={-30 + mx} cy={cy - 2} r={4} fill={TINTA} />
          <circle cx={36 + mx} cy={cy - 2} r={4} fill={TINTA} />
          <path d={`M -50 ${cy - 34} L -20 ${cy - 28} M 20 ${cy - 30} L 50 ${cy - 38}`} />
        </g>
      );
    const ceja = pose.cara === "enfadado" ? `M -48 ${cy - 40} L -16 ${cy - 24} M 48 ${cy - 40} L 16 ${cy - 24}` : pose.cara === "triste" ? `M -46 ${cy - 26} L -18 ${cy - 36} M 46 ${cy - 26} L 18 ${cy - 36}` : `M -44 ${cy - 32} L -18 ${cy - 30} M 18 ${cy - 30} L 44 ${cy - 32}`;
    return (
      <g fill={TINTA}>
        <ellipse cx={-30 + mx} cy={cy - 4} rx={7} ry={9} />
        <ellipse cx={30 + mx} cy={cy - 4} rx={7} ry={9} />
        <path d={ceja} stroke={TINTA} strokeWidth={LINEA} strokeLinecap="round" fill="none" />
      </g>
    );
  };
  const abre = pose.habla ? Math.abs(Math.sin(f * 0.9)) : 0;
  const boca =
    pose.cara === "susto" ? (
      <ellipse cx={4} cy={cy + 50} rx={13} ry={17} fill="#7a1f2b" stroke={TINTA} strokeWidth={LINEA} />
    ) : pose.cara === "feliz" ? (
      <path d={`M -26 ${cy + 40} Q 4 ${cy + 76} 34 ${cy + 40} Z`} fill="#7a1f2b" stroke={TINTA} strokeWidth={LINEA} strokeLinejoin="round" />
    ) : pose.cara === "chulo" ? (
      <path d={`M -16 ${cy + 48} Q 8 ${cy + 58} 30 ${cy + 40}`} stroke={TINTA} strokeWidth={LINEA} fill="none" strokeLinecap="round" />
    ) : pose.cara === "triste" || pose.cara === "enfadado" ? (
      <path d={`M -18 ${cy + 54} Q 4 ${cy + 40} 26 ${cy + 54}`} stroke={TINTA} strokeWidth={LINEA} fill="none" strokeLinecap="round" />
    ) : pose.cara === "dormido" ? (
      <ellipse cx={4} cy={cy + 48} rx={8} ry={9} fill={TINTA} />
    ) : abre > 0.2 ? (
      <ellipse cx={4} cy={cy + 48} rx={14} ry={4 + abre * 10} fill="#7a1f2b" stroke={TINTA} strokeWidth={LINEA - 1} />
    ) : (
      <path d={`M -14 ${cy + 48} L 18 ${cy + 48}`} stroke={TINTA} strokeWidth={LINEA} strokeLinecap="round" />
    );

  const sombrero = () => {
    const c = p.colorSombrero ?? "#4a4a58";
    switch (p.sombrero ?? "ninguno") {
      case "gorra":
        return (
          <g>
            <path d={`M -92 ${cy - 30} C -96 ${cy - 112}, 86 ${cy - 122}, 94 ${cy - 46} C 70 ${cy - 60}, -40 ${cy - 64}, -92 ${cy - 30} Z`} fill={c} stroke={TINTA} strokeWidth={LINEA} />
            <path d={`M 50 ${cy - 56} C 92 ${cy - 58}, 126 ${cy - 46}, 128 ${cy - 34} C 100 ${cy - 36}, 70 ${cy - 40}, 44 ${cy - 44} Z`} fill={c} stroke={TINTA} strokeWidth={LINEA} />
          </g>
        );
      case "chistera":
        return (
          <g>
            <rect x={-62} y={cy - 220} width={124} height={140} rx={8} fill={c} stroke={TINTA} strokeWidth={LINEA} />
            <rect x={-62} y={cy - 112} width={124} height={22} fill="#8a1f2a" stroke={TINTA} strokeWidth={4} />
            <path d={`M -118 ${cy - 78} Q 0 ${cy - 104} 118 ${cy - 78} Q 0 ${cy - 66} -118 ${cy - 78} Z`} fill={c} stroke={TINTA} strokeWidth={LINEA} />
          </g>
        );
      case "bombin":
        return (
          <g>
            <path d={`M -70 ${cy - 70} C -72 ${cy - 170}, 72 ${cy - 170}, 70 ${cy - 70} Z`} fill={c} stroke={TINTA} strokeWidth={LINEA} />
            <path d={`M -112 ${cy - 66} Q 0 ${cy - 92} 112 ${cy - 66} Q 0 ${cy - 54} -112 ${cy - 66} Z`} fill={c} stroke={TINTA} strokeWidth={LINEA} />
          </g>
        );
      case "gorro":
        return (
          <g>
            <path d={`M -86 ${cy - 44} C -70 ${cy - 140}, 60 ${cy - 150}, 90 ${cy - 60} C 120 ${cy - 30}, 140 ${cy + 10}, 120 ${cy + 40} L 96 ${cy - 30} C 50 ${cy - 74}, -30 ${cy - 76}, -86 ${cy - 44} Z`} fill={c} stroke={TINTA} strokeWidth={LINEA} />
            <circle cx={122} cy={cy + 44} r={16} fill="#fff" stroke={TINTA} strokeWidth={5} />
          </g>
        );
      case "peluca":
        return (
          <g fill="#f2f0ea" stroke={TINTA} strokeWidth={LINEA}>
            <path d={`M -100 ${cy + 10} C -120 ${cy - 140}, 120 ${cy - 140}, 100 ${cy + 10} C 92 ${cy - 40}, -92 ${cy - 40}, -100 ${cy + 10} Z`} />
            {[-1, 1].map((l) => (
              <g key={l}>
                <circle cx={l * 104} cy={cy + 6} r={20} />
                <circle cx={l * 106} cy={cy + 40} r={18} />
              </g>
            ))}
          </g>
        );
      default:
        return null;
    }
  };
  const pelo = () => {
    if (!p.pelo) return null;
    if (p.moño)
      return (
        <g fill={p.pelo} stroke={TINTA} strokeWidth={LINEA}>
          <circle cx={0} cy={cy - 108} r={36} />
          <path d={`M -94 ${cy - 6} C -100 ${cy - 120}, 100 ${cy - 120}, 94 ${cy - 6} C 70 ${cy - 70}, -70 ${cy - 70}, -94 ${cy - 6} Z`} />
        </g>
      );
    if ((p.sombrero ?? "ninguno") === "ninguno")
      return <path d={`M -96 ${cy - 4} C -104 ${cy - 118}, 104 ${cy - 118}, 96 ${cy - 4} C 76 ${cy - 56}, 10 ${cy - 76}, -20 ${cy - 60} C -50 ${cy - 46}, -80 ${cy - 34}, -96 ${cy - 4} Z`} fill={p.pelo} stroke={TINTA} strokeWidth={LINEA} />;
    return <path d={`M -94 ${cy - 10} C -96 ${cy - 40}, -90 ${cy - 56}, -80 ${cy - 62} L -70 ${cy - 30} Z M 94 ${cy - 10} C 96 ${cy - 40}, 90 ${cy - 56}, 80 ${cy - 62} L 70 ${cy - 30} Z`} fill={p.pelo} stroke={TINTA} strokeWidth={5} />;
  };

  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} width={1} height={1}>
      <defs>
        <FiltroLuz id={id} luz={luz} />
      </defs>
      <g transform={`translate(${x} ${y}) scale(${(voltear ? -1 : 1) * escala} ${escala * est})`} strokeLinejoin="round">
        <ellipse cx={0} cy={4} rx={70} ry={13} fill="rgba(10,6,30,0.42)" opacity={1 - Math.min(1, (pose.arriba ?? 0) / 200)} />
        <g filter={`url(#${id})`}>
          {palo && (
            <g>
              <line x1={base.x} y1={base.y} x2={palo.x} y2={palo.y} stroke={TINTA} strokeWidth={17} strokeLinecap="round" />
              <line x1={base.x} y1={base.y} x2={palo.x} y2={palo.y} stroke="#9a6a3c" strokeWidth={8} strokeLinecap="round" />
              {pose.bandera && (
                <path
                  d={`M ${palo.x} ${palo.y} q ${50} ${-12 + Math.sin(f * 0.5) * 8} ${110} ${4} q ${-10} ${36} ${-4} ${74} q ${-56} ${-14 + Math.sin(f * 0.5 + 1) * 8} ${-106} ${0} Z`}
                  fill={pose.bandera}
                  stroke={TINTA}
                  strokeWidth={LINEA}
                />
              )}
            </g>
          )}
          {!p.vestido &&
            pies.map((q, i) => (
              <g key={i}>
                <path d={`M ${i ? 22 : -22} ${cuerpoY - 6} Q ${(i ? 22 : -22) + q.px * 0.3} ${(cuerpoY + q.py) / 2} ${q.px} ${q.py - 6}`} stroke={TINTA} strokeWidth={LINEA + 2} fill="none" strokeLinecap="round" />
                <ellipse cx={q.px + (i ? 9 : -9)} cy={q.py - 4} rx={20} ry={10} fill={p.zapatos ?? "#3a2a22"} stroke={TINTA} strokeWidth={5} />
              </g>
            ))}
          {p.vestido && (
            <path d={`M -58 ${cuerpoY - 40} L -78 ${-4 - (pose.arriba ?? 0)} Q 0 ${10 - (pose.arriba ?? 0)} 78 ${-4 - (pose.arriba ?? 0)} L 58 ${cuerpoY - 40} Z`} fill={p.vestido} stroke={TINTA} strokeWidth={LINEA} />
          )}
          {/* tronco */}
          <path
            d={`M -62 ${cuerpoY - 120} C -70 ${cuerpoY - 40}, -66 ${cuerpoY}, -40 ${cuerpoY} L 40 ${cuerpoY} C 66 ${cuerpoY}, 70 ${cuerpoY - 40}, 62 ${cuerpoY - 120} C 56 ${cuerpoY - 158}, -56 ${cuerpoY - 158}, -62 ${cuerpoY - 120} Z`}
            fill={p.ropa}
            stroke={TINTA}
            strokeWidth={LINEA}
          />
          {p.rayas &&
            [0, 1, 2, 3].map((i) => <path key={i} d={`M -64 ${cuerpoY - 118 + i * 30} L 64 ${cuerpoY - 118 + i * 30}`} stroke={p.rayas!} strokeWidth={12} clipPath={`url(#${id}-tronco)`} />)}
          {p.rayas && (
            <clipPath id={`${id}-tronco`}>
              <path d={`M -62 ${cuerpoY - 120} C -70 ${cuerpoY - 40}, -66 ${cuerpoY}, -40 ${cuerpoY} L 40 ${cuerpoY} C 66 ${cuerpoY}, 70 ${cuerpoY - 40}, 62 ${cuerpoY - 120} C 56 ${cuerpoY - 158}, -56 ${cuerpoY - 158}, -62 ${cuerpoY - 120} Z`} />
            </clipPath>
          )}
          <path d={`M -46 ${cuerpoY - 112} C -30 ${cuerpoY - 90}, 30 ${cuerpoY - 90}, 46 ${cuerpoY - 112}`} stroke={ropaOscura} strokeWidth={10} fill="none" />
          {p.delantal && <path d={`M -36 ${cuerpoY - 104} L 36 ${cuerpoY - 104} L 42 ${cuerpoY - 4} L -42 ${cuerpoY - 4} Z`} fill={p.delantal} stroke={TINTA} strokeWidth={5} />}
          {p.botones &&
            [0, 1, 2].map((i) => <circle key={i} cx={6} cy={cuerpoY - 98 + i * 30} r={5.5} fill={p.botones!} stroke={TINTA} strokeWidth={3} />)}
          {p.bufanda && (
            <g>
              <path d={`M -48 ${cuerpoY - 136} C -20 ${cuerpoY - 116}, 20 ${cuerpoY - 116}, 48 ${cuerpoY - 136}`} stroke={p.bufanda} strokeWidth={22} fill="none" strokeLinecap="round" />
              <path d={`M 20 ${cuerpoY - 128} L 34 ${cuerpoY - 78}`} stroke={p.bufanda} strokeWidth={18} strokeLinecap="round" />
            </g>
          )}
          <path d={brazo(hombroA, manoA, -1)} stroke={TINTA} strokeWidth={LINEA + 1} fill="none" strokeLinecap="round" />
          {/* cabeza */}
          {p.moño && pelo()}
          <circle cx={0} cy={cy} r={96} fill={piel} stroke={TINTA} strokeWidth={LINEA} />
          <ellipse cx={-48} cy={cy + 30} rx={15} ry={9} fill="#f2b3a8" opacity={0.7} />
          <ellipse cx={52} cy={cy + 30} rx={15} ry={9} fill="#f2b3a8" opacity={0.7} />
          {!p.moño && pelo()}
          {ojos()}
          {boca}
          {p.bigote && (
            <path d={`M -34 ${cy + 30} Q -12 ${cy + 18} 4 ${cy + 28} Q 22 ${cy + 18} 42 ${cy + 30} Q 22 ${cy + 42} 4 ${cy + 34} Q -14 ${cy + 42} -34 ${cy + 30} Z`} fill={p.bigote} stroke={TINTA} strokeWidth={4} />
          )}
          {sombrero()}
          <path d={brazo(hombroB, manoB, 1)} stroke={TINTA} strokeWidth={LINEA + 1} fill="none" strokeLinecap="round" />
          <circle cx={manoA.x} cy={manoA.y} r={11} fill={TINTA} />
          <circle cx={manoB.x} cy={manoB.y} r={11} fill={TINTA} />
          {pose.enMano && <g transform={`translate(${manoB.x} ${manoB.y})`}>{pose.enMano}</g>}
          {(pose.gota ?? 0) > 0 && (
            <path
              transform={`translate(78 ${cy - 40 + (pose.gota ?? 0) * 40}) scale(${Math.min(1, (pose.gota ?? 0) * 4)})`}
              d="M 0 -26 C 10 -10, 18 0, 18 10 C 18 22, -18 22, -18 10 C -18 0, -10 -10, 0 -26 Z"
              fill="#7cc6ff"
              stroke={TINTA}
              strokeWidth={4}
            />
          )}
        </g>
      </g>
    </svg>
  );
};
