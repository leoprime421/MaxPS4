// La voz del usuario manda: cada plano, gesto y sonido se ancla a una PALABRA del guion, no a un segundo fijo.
// Así el short encaja con cualquier voz (más rápida o más lenta). Los tiempos salen de
// «curiosidades voz N» (public/voces/<id>/voz.tiempos.json: cada palabra del guion con su segundo).
import React, { createContext, useContext } from "react";

export const FPS = 30;
export type Palabra = { p: string; ini: number; fin: number };
export type Tiempos = { duracion: number; palabras: Palabra[] };

const limpia = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .split(" ")
    .filter(Boolean);

/** Segundo en que empieza a decirse `texto` (una o varias palabras seguidas), buscando desde `desde` s. */
export const segundoDe = (t: Tiempos, texto: string, desde = 0, vez = 0): number => {
  const q = limpia(texto);
  const ps = t.palabras.map((p) => ({ w: limpia(p.p).join(" "), ini: p.ini }));
  let n = 0;
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].ini < desde - 0.01) continue;
    if (q.every((w, k) => i + k < ps.length && ps[i + k].w === w)) {
      if (n === vez) return ps[i].ini;
      n++;
    }
  }
  throw new Error(`No encuentro «${texto}» (vez ${vez + 1}) en la voz. ¿La voz dice el guion tal cual?`);
};

type Ctx = { tiempos: Tiempos; desde: number };
const VozCtx = createContext<Ctx | null>(null);
export const VozProvider: React.FC<{ tiempos: Tiempos; desde: number; children: React.ReactNode }> = ({ tiempos, desde, children }) => (
  <VozCtx.Provider value={{ tiempos, desde }}>{children}</VozCtx.Provider>
);

/** Dentro de un plano: E("palo") → fotograma LOCAL del plano en que se dice «palo». */
export const useVoz = () => {
  const c = useContext(VozCtx);
  if (!c) throw new Error("useVoz fuera de un plano");
  /** vez: 0 = la primera vez que se dice, 1 = la segunda… */
  const E = (texto: string, vez = 0) => Math.round(segundoDe(c.tiempos, texto, 0, vez) * FPS) - c.desde;
  /** segundo de la voz → fotograma local */
  const S = (s: number) => Math.round(s * FPS) - c.desde;
  return { E, S, tiempos: c.tiempos };
};
