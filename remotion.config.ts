import { Config } from "@remotion/cli/config";

// El 3D usa la tarjeta gráfica si la hay; si no, Chrome lo pinta por software (más lento, mismo resultado).
Config.setChromiumOpenGlRenderer(process.platform === "darwin" ? "angle" : "angle");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
// en ordenadores lentos los fondos tardan en cargar
Config.setDelayRenderTimeoutInMilliseconds(300000);
