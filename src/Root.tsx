// Un short por idea (id «short-N»). La duración sale de la voz del usuario (public/voces/N/voz.tiempos.json).
import React from "react";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { IDEAS } from "./ideas/lista";
import { VideoCuriosidad, duracionDe } from "./motor/video";
import { CalidadRender } from "./motor/cine";
import { Tiempos } from "./motor/voz";

// fondo3d: resolución del fondo 3D (1 = completa). En Windows sin tarjeta gráfica se usa menos: los muñecos y los
// subtítulos siguen nítidos y el vídeo sale mucho antes.
type Props = { n: number; tiempos?: Tiempos; sinVoz?: boolean; fondo3d?: number; variante?: number };

const metadatos: CalculateMetadataFunction<Props> = async ({ props }) => {
  const r = await fetch(staticFile(`voces/${props.n}/voz.tiempos.json`));
  if (!r.ok) throw new Error(`Falta la voz del short ${props.n}. Deja tu audio en «Pon aquí tu voz» y pide a Claude que lo prepare.`);
  const tiempos = (await r.json()) as Tiempos;
  return { durationInFrames: duracionDe(tiempos), props: { ...props, tiempos } };
};

const Short: React.FC<Props> = ({ n, tiempos, sinVoz, fondo3d, variante }) => {
  const def = IDEAS.find((i) => i.n === n);
  if (!def || !tiempos) return null;
  return (
    <CalidadRender.Provider value={fondo3d ?? 1}>
      <VideoCuriosidad idea={def.idea} tiempos={tiempos} sinVoz={sinVoz} variante={variante ?? 0} />
    </CalidadRender.Provider>
  );
};

export const Root: React.FC = () => (
  <>
    {IDEAS.map(({ n }) => (
      <Composition key={n} id={`short-${n}`} component={Short} durationInFrames={600} fps={30} width={1080} height={1920} defaultProps={{ n, sinVoz: false } as Props} calculateMetadata={metadatos} />
    ))}
  </>
);
