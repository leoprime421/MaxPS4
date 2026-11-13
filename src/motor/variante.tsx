// Variaciones: cada short sale distinto aunque dos personas hagan la misma idea. Una «semilla» (número) decide, siempre
// igual para el mismo número: qué versión de cada escenario se usa, los colores de la ropa, el encuadre de cada plano y
// la música. Semilla 0 = la versión original (la del ejemplo).
import { createContext, useContext } from "react";

/** Número entre 0 y 1 que depende solo de la semilla y de las claves (determinista: no usa Math.random). */
export const azar = (semilla: number, ...claves: (string | number)[]) => {
  let h = 2166136261 ^ semilla;
  for (const c of claves.join("|")) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export const elige = <T,>(lista: T[], semilla: number, ...claves: (string | number)[]) => lista[Math.floor(azar(semilla, ...claves) * lista.length)];

type Ctx = { semilla: number; plano: number };
const VarianteCtx = createContext<Ctx>({ semilla: 0, plano: 0 });
export const VarianteProvider = VarianteCtx.Provider;
export const useVariante = () => useContext(VarianteCtx);

/** Versión del escenario: «» (original), «-b» o «-c». */
export const versionFondo = (semilla: number, idea: string, fondo: string) => (semilla ? elige(["", "-b", "-c"], semilla, "fondo", idea, fondo) : "");

// Paletas de ropa (color y su sombra), sombreros, bufandas y pelo
const ROPAS: [string, string][] = [
  ["#3f6b4f", "#2f5340"], ["#2f4f6b", "#22394f"], ["#6b2f3a", "#4e2029"], ["#5b4a8a", "#433768"], ["#8a5a2f", "#684320"],
  ["#2f6b6b", "#1f5050"], ["#7a3f6b", "#5a2d4f"], ["#4a4a58", "#34343f"], ["#a0523a", "#7c3d2a"], ["#3a5a8a", "#2a4268"],
];
const SOMBREROS = ["#4a4a58", "#2f2f38", "#5a3e2b", "#3a4a3a", "#5a2a2a", "#2a3a5a"];
const BUFANDAS = ["#c23b32", "#d9a05b", "#3b7bc2", "#5fa04a", "#c2a03b", "#8a3bc2"];
const PELOS = ["#5a3a22", "#2a1e16", "#8a5a2a", "#c2a060", "#7a2a1a", "#3a3a3a"];

/** Misma persona → mismos colores en todo el vídeo (la clave es su color original). */
export const variarColores = <P extends { ropa: string; ropaOscura?: string; colorSombrero?: string; bufanda?: string | null; pelo?: string | null; vestido?: string | null; fijo?: boolean }>(p: P, semilla: number): P => {
  if (!semilla || p.fijo) return p;
  const [ropa, ropaOscura] = elige(ROPAS, semilla, "ropa", p.ropa);
  return {
    ...p,
    ropa,
    ropaOscura,
    colorSombrero: p.colorSombrero ? elige(SOMBREROS, semilla, "sombrero", p.ropa, p.colorSombrero) : p.colorSombrero,
    bufanda: p.bufanda ? elige(BUFANDAS, semilla, "bufanda", p.ropa, p.bufanda) : p.bufanda,
    pelo: p.pelo ? elige(PELOS, semilla, "pelo", p.ropa, p.pelo) : p.pelo,
    vestido: p.vestido ? elige(ROPAS, semilla, "vestido", p.ropa, p.vestido)[1] : p.vestido,
  };
};
