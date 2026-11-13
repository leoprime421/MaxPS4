// Las 5 ideas de la plantilla gratis. Cada una: número, título (el del archivo final) y su definición.
import { IdeaDef } from "../motor/video";
import { IDEA_1 } from "./1";
import { IDEA_2 } from "./2";
import { IDEA_3 } from "./3";
import { IDEA_4 } from "./4";
import { IDEA_5 } from "./5";

export const IDEAS: { n: number; titulo: string; idea: IdeaDef }[] = [
  { n: 1, titulo: "El despertador humano", idea: IDEA_1 },
  { n: 2, titulo: "Los colocadores de bolos", idea: IDEA_2 },
  { n: 3, titulo: "El hombre de la bandera roja", idea: IDEA_3 },
  { n: 4, titulo: "La piña de alquiler", idea: IDEA_4 },
  { n: 5, titulo: "El hielo que viajó a la India", idea: IDEA_5 },
];
