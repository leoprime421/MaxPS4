#!/usr/bin/env python3
"""Curiosidades Animadas — órdenes que usa Claude para hacer un short (Mac y Windows).

    curiosidades comprobar          ¿está todo instalado?
    curiosidades ideas              las ideas de esta plantilla, con su guion
    curiosidades tsc                comprueba el código de las ideas (usa el Node de la plantilla)
    curiosidades voz N              coge el audio de «Pon aquí tu voz», lo nivela y apunta el segundo de cada palabra
    curiosidades montar N [--variante S]   hace el short N y lo deja en «Vídeos listos» (con su título y descripción).
                                    Cada vez sale distinto (escenario, ropa, encuadre y música al azar); con --variante S
                                    se repite exactamente la variante S

N es el número de la idea (curiosidades ideas las enseña). La voz la hace el usuario en ElevenLabs con el guion de
la carpeta «Guiones» (en el Club también puede ser automática: ver abajo).
"""
import difflib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import unicodedata
from pathlib import Path

for _flujo in (sys.stdout, sys.stderr):
    try:
        _flujo.reconfigure(encoding="utf-8")
    except Exception:
        pass

RAIZ = Path(__file__).resolve().parents[1]
GUIONES = RAIZ / "Guiones"
TU_VOZ = RAIZ / "Pon aquí tu voz"
LISTOS = RAIZ / "Vídeos listos"
RITMO_VOZ = 1.1
VOCES = RAIZ / "public" / "voces"
SALIDA = RAIZ / "salida"
WINDOWS = os.name == "nt"
COMUNIDAD = "https://www.skool.com/ccia"
AUDIOS = (".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac")

# título y descripción de cada short (para subirlo); la música va con su crédito (licencia CC BY 4.0)
IDEAS = {
    1: {"titulo": "El despertador humano", "subir": "Antes de los despertadores, alguien te despertaba con un palo 😳", "tags": "#curiosidades #historia #shorts", "musica": "sneaky-snitch.mp3"},
    2: {"titulo": "Los colocadores de bolos", "subir": "El trabajo más peligroso de las boleras 🎳", "tags": "#curiosidades #historia #shorts", "musica": "mischief-maker.mp3"},
    3: {"titulo": "El hombre de la bandera roja", "subir": "La ley más absurda de la historia del coche 🚩", "tags": "#curiosidades #historia #shorts", "musica": "sneaky-snitch.mp3"},
    4: {"titulo": "La piña de alquiler", "subir": "En el siglo XVIII la gente alquilaba piñas 🍍", "tags": "#curiosidades #historia #shorts", "musica": "mischief-maker.mp3"},
    5: {"titulo": "El hielo que viajó a la India", "subir": "Vendió hielo en la India… en 1833 🧊", "tags": "#curiosidades #historia #shorts", "musica": "sneaky-snitch.mp3"},
}


def fallo(msg):
    print("\n✗ " + msg)
    sys.exit(1)


def ffmpeg():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        fallo("No encuentro ffmpeg. Pide a Claude: «instala la plantilla otra vez».")


def node_bin():
    """Node portátil de la carpeta (lo instala Claude) o el del sistema."""
    local = RAIZ / "node" / ("npx.cmd" if WINDOWS else "bin/npx")
    if local.exists():
        return str(local)
    exe = shutil.which("npx.cmd" if WINDOWS else "npx") or shutil.which("npx")
    if not exe:
        fallo("No encuentro Node. Pide a Claude: «instala la plantilla».")
    return exe


def entorno():
    env = dict(os.environ)
    nodo = RAIZ / "node" / ("" if WINDOWS else "bin")
    if nodo.exists():
        env["PATH"] = str(nodo) + os.pathsep + env.get("PATH", "")
    return env


def duracion(audio):
    import av

    with av.open(str(audio)) as c:
        return float(c.duration / 1_000_000) if c.duration else 0.0


def normal(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9ñ]", "", s)


def numero(args):
    try:
        n = int(args[0])
    except (IndexError, ValueError):
        fallo("Dime el número de la idea. Ejemplo:  curiosidades montar 1")
    if n not in IDEAS:
        fallo("Esa idea no existe en esta plantilla (trae 5). En la comunidad tienes ideas infinitas: cualquier curiosidad que se te ocurra, Claude te la convierte en short. " + COMUNIDAD)
    return n


def guion(n):
    f = next(GUIONES.glob(f"{n} - *.txt"), None)
    if not f:
        fallo(f"No encuentro el guion de la idea {n} en la carpeta «Guiones».")
    return f.read_text(encoding="utf-8").strip()


# ---------------------------------------------------------------- órdenes
def cmd_comprobar(_):
    bien = True

    def linea(ok, texto):
        nonlocal bien
        bien = bien and ok
        print(("  ✓ " if ok else "  ✗ ") + texto)

    print("Curiosidades Animadas — comprobación")
    linea((RAIZ / "node").exists() or shutil.which("node") is not None, "Node (motor de vídeo)")
    linea((RAIZ / "node_modules" / "remotion").exists(), "Remotion instalado (node_modules)")
    for mod, nombre in (("faster_whisper", "faster-whisper (escucha la voz)"), ("av", "PyAV (lee el audio)"), ("imageio_ffmpeg", "ffmpeg")):
        try:
            __import__(mod)
            linea(True, nombre)
        except Exception:
            linea(False, nombre)
    for n, d in IDEAS.items():
        tiene = (VOCES / str(n) / "voz.tiempos.json").exists()
        print(f"  · Idea {n} «{d['titulo']}»: " + ("voz preparada" if tiene else "sin voz todavía"))
    print("\nTodo listo." if bien else "\nFalta algo: pide a Claude «instala la plantilla».")
    sys.exit(0 if bien else 1)


def cmd_ideas(_):
    for n, d in IDEAS.items():
        print(f"\n{n}. {d['titulo']}\n   {guion(n)}")


def cmd_voz(args):
    n = numero(args)
    audios = sorted([p for p in TU_VOZ.iterdir() if p.suffix.lower() in AUDIOS], key=lambda p: p.stat().st_mtime, reverse=True) if TU_VOZ.exists() else []
    if not audios:
        fallo("No hay ningún audio en la carpeta «Pon aquí tu voz». Haz la voz en ElevenLabs con el guion y déjala ahí (mp3).")
    original = audios[0]
    print(f"Uso la voz «{original.name}» para la idea {n}.")
    destino = VOCES / str(n)
    destino.mkdir(parents=True, exist_ok=True)
    voz = destino / "voz.mp3"
    # la voz un 10 % más rápida (ritmo de short, sin cambiar el tono) y a −20 LUFS (la música y los efectos están medidos para eso)
    subprocess.run([ffmpeg(), "-v", "error", "-y", "-i", str(original), "-af", f"atempo={RITMO_VOZ},loudnorm=I=-20:TP=-2:LRA=11", "-ar", "44100", "-ac", "1", "-b:a", "192k", str(voz)], check=True)
    texto = guion(n)
    palabras_guion = texto.split()
    print("Escuchando la voz palabra a palabra (la primera vez descarga el modelo, ~500 MB)…", flush=True)
    from faster_whisper import WhisperModel

    modelo = WhisperModel(os.environ.get("CURIOSIDADES_WHISPER", "small"), device="cpu", compute_type="int8")
    segs, _ = modelo.transcribe(str(voz), language="es", word_timestamps=True, vad_filter=False, condition_on_previous_text=False, initial_prompt=texto)
    oidas = [(w.word.strip(), float(w.start), float(w.end)) for s in segs for w in (s.words or []) if w.word.strip()]
    if not oidas:
        fallo("No se oye ninguna palabra en ese audio. Vuelve a generar la voz en ElevenLabs.")
    # cada palabra DEL GUION con el tiempo en que se ha oído; las que no se oyen, repartidas en su hueco
    a = [normal(w) for w in palabras_guion]
    b = [normal(w) for w, _, _ in oidas]
    tiempos = [None] * len(a)
    for blq in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(blq.size):
            tiempos[blq.a + k] = (oidas[blq.b + k][1], oidas[blq.b + k][2])
    total = duracion(voz)
    claras = sum(1 for t in tiempos if t is not None)
    i = 0
    while i < len(a):
        if tiempos[i] is None:
            j = i
            while j < len(a) and tiempos[j] is None:
                j += 1
            t0 = tiempos[i - 1][1] if i > 0 else 0.0
            t1 = tiempos[j][0] if j < len(a) else total
            paso = max(t1 - t0, 0.05) / (j - i)
            for k in range(i, j):
                tiempos[k] = (t0 + paso * (k - i), t0 + paso * (k - i + 1))
            i = j
        else:
            i += 1
    palabras = [{"p": w, "ini": round(t[0], 2), "fin": round(t[1], 2)} for w, t in zip(palabras_guion, tiempos)]
    (destino / "voz.tiempos.json").write_text(json.dumps({"duracion": round(total, 2), "palabras": palabras}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ Voz preparada: {len(palabras)} palabras en {total:.1f} s ({claras} oídas con claridad).")
    if claras < 0.7 * len(a):
        print("  ⚠ Parece que la voz no dice el guion tal cual. El short puede quedar descuadrado: vuelve a generar la voz pegando el guion exacto.")
    if total > 40:
        print("  ⚠ La voz dura más de 40 s: comprueba que solo has puesto el guion de esta idea.")
    if n > 10:
        print(f"  Siguiente (idea propia): fondos y planos según GUIA-IDEAS-PROPIAS.md; luego  curiosidades fotos {n}  y  montar {n}")
    else:
        print(f"  Siguiente:  curiosidades montar {n}")


def cmd_montar(args):
    n = numero(args)
    import random

    variante = int(args[args.index("--variante") + 1]) if "--variante" in args else random.randint(1, 9999)
    tiempos = VOCES / str(n) / "voz.tiempos.json"
    if not tiempos.exists():
        fallo(f"Antes hay que preparar la voz:  curiosidades voz {n}")
    dur = json.loads(tiempos.read_text(encoding="utf-8"))["duracion"]
    d = IDEAS[n]
    SALIDA.mkdir(exist_ok=True)
    bruto = SALIDA / f"short-{n}.mp4"
    registro = SALIDA / f"short-{n}.log"
    estimado = int(dur * (45 if WINDOWS else 4))  # medido 01-11: unos 15 min por short en un PC sin tarjeta gráfica
    print(f"Haciendo el short {n} «{d['titulo']}» (suele tardar unos {max(1, estimado // 60)} minutos)…", flush=True)
    inicio = time.time()
    with open(registro, "w", encoding="utf-8") as reg:
        r = subprocess.run(
            [node_bin(), "remotion", "render", "src/index.ts", f"short-{n}", str(bruto), "--props", json.dumps({"n": n, "sinVoz": True, "variante": variante, "fondo3d": float(os.environ.get("CURIOSIDADES_FONDO3D", "0.6" if WINDOWS else "1"))}), "--concurrency=50%", "--crf=20", "--timeout=180000", "--log=error"],
            cwd=RAIZ, stdout=reg, stderr=subprocess.STDOUT, env=entorno(),
        )
    if r.returncode != 0 or not bruto.exists():
        fallo(f"El motor no ha podido hacer el vídeo. Mira salida/short-{n}.log\n" + registro.read_text(encoding="utf-8")[-1500:])
    # la voz entra con ffmpeg desde el segundo 0 y todo a volumen de YouTube (−14 LUFS)
    LISTOS.mkdir(exist_ok=True)
    final = LISTOS / f"{n} - {d['titulo']} ({variante}).mp4"
    filtro = "[1:a]aresample=48000,aformat=channel_layouts=stereo[voz];[0:a][voz]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]"
    subprocess.run([ffmpeg(), "-v", "error", "-y", "-i", str(bruto), "-i", str(VOCES / str(n) / "voz.mp3"), "-filter_complex", filtro, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", str(final)], check=True)
    creditos = {}
    for linea in (RAIZ / "public" / "comun" / "musica" / "CREDITOS.tsv").read_text(encoding="utf-8").splitlines()[1:]:
        if "\t" in linea:
            k, v = linea.split("\t", 1)
            creditos[k] = v
    pista = musica_de(variante, n)
    desc = f"{d['descripcion']}\n\n" if d.get("descripcion") else ""
    final.with_suffix(".txt").write_text(f"{d['subir']}\n\n{desc}{d['tags']}\n\nMúsica: {creditos.get(pista, '')}\n", encoding="utf-8")
    print(f"✓ Short listo en {time.time() - inicio:.0f} s: «{LISTOS.name}/{final.name}» (con su título y descripción en el .txt)")
    if "nueva" not in ORDENES:  # en el Club no se anuncia el Club
        print(f"\nEsta plantilla trae 5 ideas. En la comunidad tienes IDEAS INFINITAS: dile a Claude «hazme un short sobre…» lo que se te ocurra y lo hace entero (guion, escenarios y voz automática): {COMUNIDAD}")


def _azar(semilla, *claves):
    """La misma función que src/motor/variante.tsx (FNV-1a + mezcla): misma semilla → misma elección."""
    m = 0xFFFFFFFF
    h = (2166136261 ^ semilla) & m
    for c in "|".join(str(k) for k in claves):
        h = ((h ^ ord(c)) * 16777619) & m
    h = ((h ^ (h >> 15)) * 2246822507) & m
    h = ((h ^ (h >> 13)) * 3266489909) & m
    return ((h ^ (h >> 16)) & m) / 4294967296


def musica_de(variante, n):
    lista = ["sneaky-snitch.mp3", "mischief-maker.mp3", "marty-gots-a-plan.mp3"]
    return lista[int(_azar(variante, "musica", str(n)) * len(lista))] if variante else IDEAS[n]["musica"]


def cmd_tsc(_):
    """Comprueba el código (TypeScript) con el Node de la plantilla, aunque no esté en el PATH."""
    r = subprocess.run([node_bin(), "tsc", "--noEmit", "-p", "."], cwd=RAIZ, env=entorno())
    print("✓ El código está bien." if r.returncode == 0 else "✗ Hay errores en el código (arriba).")
    sys.exit(r.returncode)


ORDENES = {"comprobar": cmd_comprobar, "ideas": cmd_ideas, "voz": cmd_voz, "montar": cmd_montar, "tsc": cmd_tsc}

# Lo del Club (ideas 6-10, voz automática, ideas propias) solo existe si está herramientas/club.py
try:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import club  # noqa: E402

    IDEAS.update(club.ideas_club())
    ORDENES.update(club.ORDENES)
except ImportError:
    pass

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ORDENES:
        print(__doc__)
        if "nueva" in ORDENES:
            print(club.__doc__)
        sys.exit(1)
    ORDENES[sys.argv[1]](sys.argv[2:])
