"use strict";

/* CAMBIA AQUÍ: reglas iniciales para el taller.
   velocidad: movimiento de la nave, de 3 a 12
   disparosPorSegundo: frecuencia del láser, de 2 a 8
   dificultad: "easy", "normal" o "hard"
   fondo: color del universo
   puntosPorAsteroide: puntos por cada roca destruida */
const CONFIG = {
  velocidad: 6,
  disparosPorSegundo: 5,
  dificultad: "normal",
  fondo: "#111b3b",
  duracion: 45,
  puntosPorAsteroide: 10,
};

const DIFICULTADES = {
  easy: { intervalo: 1.05, velocidad: 105 },
  normal: { intervalo: 0.72, velocidad: 155 },
  hard: { intervalo: 0.48, velocidad: 215 },
};

const obtenerElemento = (id) => document.getElementById(id);
const lienzo = obtenerElemento("board");
const contexto = lienzo.getContext("2d");
const Y_NAVE = 385;
const teclasPresionadas = new Set();

let partidaActiva = false;
let enPausa = false;
let puntuacion = 0;
let vidas = 3;
let tiempoRestante = CONFIG.duracion;
let posicionNave = lienzo.width / 2;
let asteroides = [];
let disparos = [];
let particulas = [];
let tiempoHastaAsteroide = 0;
let tiempoHastaDisparo = 0;
let tiempoDeProteccion = 0;
let tiempoAnterior = 0;
let disparoBoton = false;
let disparoLienzo = false;

const estrellasDelFondo = Array.from({ length: 75 }, () => ({
  x: Math.random() * lienzo.width,
  y: Math.random() * lienzo.height,
  radio: Math.random() * 1.8 + 0.3,
}));

/* Panel para experimentar con las variables. */
function actualizarCodigoVisible() {
  obtenerElemento("speed").value = CONFIG.velocidad;
  obtenerElemento("speedValue").textContent = CONFIG.velocidad;
  obtenerElemento("fireRate").value = CONFIG.disparosPorSegundo;
  obtenerElemento("fireRateValue").textContent = CONFIG.disparosPorSegundo;
  obtenerElemento("difficulty").value = CONFIG.dificultad;
  obtenerElemento("code").textContent = [
    "// CAMBIA AQUÍ",
    "velocidad: " + CONFIG.velocidad,
    "disparosPorSegundo: " + CONFIG.disparosPorSegundo,
    'dificultad: "' + CONFIG.dificultad + '"',
    'fondo: "' + CONFIG.fondo + '"',
    "puntosPorAsteroide: " + CONFIG.puntosPorAsteroide,
  ].join("\n");

  document.querySelectorAll(".swatch").forEach((boton) => {
    boton.setAttribute(
      "aria-pressed",
      String(boton.dataset.color === CONFIG.fondo),
    );
  });
}

obtenerElemento("speed").addEventListener("input", (evento) => {
  CONFIG.velocidad = Number(evento.target.value);
  actualizarCodigoVisible();
});

obtenerElemento("fireRate").addEventListener("input", (evento) => {
  CONFIG.disparosPorSegundo = Number(evento.target.value);
  actualizarCodigoVisible();
});

obtenerElemento("difficulty").addEventListener("change", (evento) => {
  CONFIG.dificultad = evento.target.value;
  actualizarCodigoVisible();
});

document.querySelectorAll(".swatch").forEach((boton) => {
  boton.addEventListener("click", () => {
    CONFIG.fondo = boton.dataset.color;
    actualizarCodigoVisible();
  });
});

/* Marcadores, inicio, pausa y final de la partida. */
function actualizarMarcadores() {
  obtenerElemento("score").textContent = puntuacion;
  obtenerElemento("time").textContent = Math.ceil(tiempoRestante) + " s";
  obtenerElemento("lives").textContent =
    "♥ ".repeat(vidas) + "♡ ".repeat(3 - vidas);
}

function mostrarMensaje(titulo, descripcion, textoBoton) {
  obtenerElemento("overlay").classList.remove("hidden");
  obtenerElemento("message").textContent = titulo;
  obtenerElemento("description").textContent = descripcion;
  obtenerElemento("start").textContent = textoBoton;
}

function ocultarMensaje() {
  obtenerElemento("overlay").classList.add("hidden");
}

function iniciarPartida() {
  if (enPausa) {
    enPausa = false;
    obtenerElemento("pause").textContent = "Ⅱ";
    ocultarMensaje();
    lienzo.focus({ preventScroll: true });
    return;
  }

  puntuacion = 0;
  vidas = 3;
  tiempoRestante = CONFIG.duracion;
  posicionNave = lienzo.width / 2;
  asteroides = [];
  disparos = [];
  particulas = [];
  tiempoHastaAsteroide = 0.5;
  tiempoHastaDisparo = 0;
  tiempoDeProteccion = 0;
  disparoBoton = false;
  disparoLienzo = false;
  teclasPresionadas.clear();
  partidaActiva = true;

  actualizarMarcadores();
  ocultarMensaje();
  lienzo.focus({ preventScroll: true });
}

function alternarPausa() {
  if (!partidaActiva) return;

  enPausa = !enPausa;
  teclasPresionadas.clear();
  disparoBoton = false;
  disparoLienzo = false;
  obtenerElemento("pause").textContent = enPausa ? "▶" : "Ⅱ";

  if (enPausa) {
    mostrarMensaje(
      "Misión en pausa",
      "Toma un respiro. La nave continuará cuando estés listo.",
      "Continuar →",
    );
  } else {
    ocultarMensaje();
    lienzo.focus({ preventScroll: true });
  }
}

function terminarPartida() {
  partidaActiva = false;
  enPausa = false;
  teclasPresionadas.clear();
  disparoBoton = false;
  disparoLienzo = false;
  obtenerElemento("pause").textContent = "Ⅱ";
  obtenerElemento("symbol").textContent = vidas > 0 ? "🏆" : "🚀";

  mostrarMensaje(
    vidas > 0 ? "¡Misión completada!" : "¡Volvamos a intentarlo!",
    "Destruiste asteroides y conseguiste " +
      puntuacion +
      " puntos. Cambia una variable y prueba otra estrategia.",
    "Volver a jugar →",
  );
}

obtenerElemento("start").addEventListener("click", iniciarPartida);
obtenerElemento("pause").addEventListener("click", alternarPausa);

/* Teclado y controles táctiles. */
window.addEventListener("keydown", (evento) => {
  const activo = document.activeElement;
  if (
    activo.isContentEditable ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(activo.tagName)
  )
    return;

  const tecla = evento.key.toLowerCase();
  if (
    !["arrowleft", "arrowright", "a", "d", " ", "p", "escape"].includes(tecla)
  ) {
    return;
  }
  if (tecla === " " && activo.tagName === "BUTTON" && activo.id !== "fire") {
    return;
  }
  if (tecla === " " && !partidaActiva) return;
  evento.preventDefault();

  if (tecla === "p" || tecla === "escape") {
    if (!evento.repeat) alternarPausa();
    return;
  }

  teclasPresionadas.add(tecla);
  if (tecla === " ") intentarDisparar();
});

window.addEventListener("keyup", (evento) => {
  teclasPresionadas.delete(evento.key.toLowerCase());
});

window.addEventListener("blur", () => {
  teclasPresionadas.clear();
  disparoBoton = false;
  disparoLienzo = false;
  if (partidaActiva && !enPausa) alternarPausa();
});

[
  ["left", "arrowleft"],
  ["right", "arrowright"],
].forEach(([id, tecla]) => {
  const boton = obtenerElemento(id);
  boton.addEventListener("pointerdown", (evento) => {
    evento.preventDefault();
    boton.setPointerCapture(evento.pointerId);
    teclasPresionadas.add(tecla);
  });
  const soltar = () => teclasPresionadas.delete(tecla);
  boton.addEventListener("pointerup", soltar);
  boton.addEventListener("pointercancel", soltar);
  boton.addEventListener("lostpointercapture", soltar);
});

const botonDisparo = obtenerElemento("fire");
botonDisparo.addEventListener("pointerdown", (evento) => {
  evento.preventDefault();
  botonDisparo.setPointerCapture(evento.pointerId);
  disparoBoton = true;
  intentarDisparar();
});
const soltarDisparo = () => {
  disparoBoton = false;
};
botonDisparo.addEventListener("pointerup", soltarDisparo);
botonDisparo.addEventListener("pointercancel", soltarDisparo);
botonDisparo.addEventListener("lostpointercapture", soltarDisparo);
botonDisparo.addEventListener("click", intentarDisparar);

function moverNaveConPuntero(evento) {
  if (!partidaActiva || enPausa) return;
  const rectangulo = lienzo.getBoundingClientRect();
  const x =
    ((evento.clientX - rectangulo.left) * lienzo.width) / rectangulo.width;
  posicionNave = Math.max(28, Math.min(lienzo.width - 28, x));
}

lienzo.addEventListener("pointerdown", (evento) => {
  if (!partidaActiva || enPausa) return;
  lienzo.setPointerCapture(evento.pointerId);
  moverNaveConPuntero(evento);
  disparoLienzo = true;
  intentarDisparar();
});
lienzo.addEventListener("pointermove", (evento) => {
  if (lienzo.hasPointerCapture(evento.pointerId)) {
    moverNaveConPuntero(evento);
  }
});
const soltarLienzo = () => {
  disparoLienzo = false;
};
lienzo.addEventListener("pointerup", soltarLienzo);
lienzo.addEventListener("pointercancel", soltarLienzo);
lienzo.addEventListener("lostpointercapture", soltarLienzo);

/* Movimiento, disparos y asteroides. */
function moverNave(deltaTiempo) {
  let direccion = 0;
  if (teclasPresionadas.has("arrowright") || teclasPresionadas.has("d")) {
    direccion++;
  }
  if (teclasPresionadas.has("arrowleft") || teclasPresionadas.has("a")) {
    direccion--;
  }
  posicionNave += direccion * CONFIG.velocidad * 65 * deltaTiempo;
  posicionNave = Math.max(28, Math.min(lienzo.width - 28, posicionNave));
}

function intentarDisparar() {
  if (!partidaActiva || enPausa || tiempoHastaDisparo > 0) return;
  disparos.push({ x: posicionNave, y: Y_NAVE - 32 });
  tiempoHastaDisparo = 1 / CONFIG.disparosPorSegundo;
}

function crearAsteroide() {
  const dificultad = DIFICULTADES[CONFIG.dificultad];
  const radio = 17 + Math.random() * 15;
  asteroides.push({
    x: radio + Math.random() * (lienzo.width - radio * 2),
    y: -radio,
    radio,
    velocidad: dificultad.velocidad * (0.8 + Math.random() * 0.4),
    giro: Math.random() * Math.PI * 2,
    rotacion: (Math.random() - 0.5) * 2,
    perfil: Array.from({ length: 9 }, () => 0.78 + Math.random() * 0.28),
  });
}

function crearParticulas(x, y, color) {
  for (let indice = 0; indice < 12; indice++) {
    particulas.push({
      x,
      y,
      velocidadX: (Math.random() - 0.5) * 220,
      velocidadY: (Math.random() - 0.5) * 220,
      vida: 0.5,
      color,
    });
  }
}

function actualizarAsteroides(deltaTiempo) {
  tiempoHastaAsteroide -= deltaTiempo;
  if (tiempoHastaAsteroide <= 0) {
    crearAsteroide();
    const intervalo = DIFICULTADES[CONFIG.dificultad].intervalo;
    tiempoHastaAsteroide += intervalo * (0.8 + Math.random() * 0.4);
  }

  for (let indice = asteroides.length - 1; indice >= 0; indice--) {
    const roca = asteroides[indice];
    roca.y += roca.velocidad * deltaTiempo;
    roca.giro += roca.rotacion * deltaTiempo;

    let destruido = false;
    for (let bala = disparos.length - 1; bala >= 0; bala--) {
      if (
        Math.hypot(disparos[bala].x - roca.x, disparos[bala].y - roca.y) <
        roca.radio + 5
      ) {
        disparos.splice(bala, 1);
        asteroides.splice(indice, 1);
        puntuacion += CONFIG.puntosPorAsteroide;
        crearParticulas(roca.x, roca.y, "#ffc58b");
        destruido = true;
        break;
      }
    }
    if (destruido) continue;

    if (Math.hypot(roca.x - posicionNave, roca.y - Y_NAVE) < roca.radio + 20) {
      asteroides.splice(indice, 1);
      crearParticulas(roca.x, roca.y, "#ff8296");
      if (tiempoDeProteccion <= 0) {
        vidas--;
        tiempoDeProteccion = 1.2;
      }
    } else if (roca.y > lienzo.height + roca.radio) {
      asteroides.splice(indice, 1);
    }
  }
}

function actualizarDisparos(deltaTiempo) {
  tiempoHastaDisparo = Math.max(0, tiempoHastaDisparo - deltaTiempo);
  if (disparoBoton || disparoLienzo || teclasPresionadas.has(" ")) {
    intentarDisparar();
  }
  for (let indice = disparos.length - 1; indice >= 0; indice--) {
    disparos[indice].y -= 620 * deltaTiempo;
    if (disparos[indice].y < -20) disparos.splice(indice, 1);
  }
}

function actualizarParticulas(deltaTiempo) {
  for (let indice = particulas.length - 1; indice >= 0; indice--) {
    const particula = particulas[indice];
    particula.vida -= deltaTiempo;
    particula.x += particula.velocidadX * deltaTiempo;
    particula.y += particula.velocidadY * deltaTiempo;
    if (particula.vida <= 0) particulas.splice(indice, 1);
  }
}

/* Dibujos hechos con canvas para funcionar sin internet. */
function dibujarPoligono(puntos, relleno, borde = "#ffffff") {
  contexto.beginPath();
  puntos.forEach(([x, y], indice) => {
    if (indice === 0) contexto.moveTo(x, y);
    else contexto.lineTo(x, y);
  });
  contexto.closePath();
  contexto.fillStyle = relleno;
  contexto.fill();
  contexto.strokeStyle = borde;
  contexto.lineWidth = 2;
  contexto.stroke();
}

function dibujarFondo() {
  contexto.fillStyle = CONFIG.fondo;
  contexto.fillRect(0, 0, lienzo.width, lienzo.height);
  estrellasDelFondo.forEach((estrella) => {
    contexto.globalAlpha = 0.35 + estrella.radio / 3;
    contexto.fillStyle = "#dce6ff";
    contexto.beginPath();
    contexto.arc(estrella.x, estrella.y, estrella.radio, 0, Math.PI * 2);
    contexto.fill();
  });
  contexto.globalAlpha = 1;
  contexto.strokeStyle = "#ffffff0c";
  for (let x = 0; x < lienzo.width; x += 50) {
    contexto.beginPath();
    contexto.moveTo(x, 0);
    contexto.lineTo(x, lienzo.height);
    contexto.stroke();
  }
}

function dibujarNave(tiempoActual) {
  const visible =
    tiempoDeProteccion <= 0 || Math.floor(tiempoActual / 90) % 2 === 0;
  if (!visible) return;

  contexto.save();
  contexto.translate(posicionNave, Y_NAVE);
  contexto.shadowColor = "#39d5ff";
  contexto.shadowBlur = 18;
  dibujarPoligono(
    [
      [-10, 22],
      [0, 39],
      [10, 22],
    ],
    "#ffbf37",
    "#ffed8d",
  );
  dibujarPoligono(
    [
      [-12, 2],
      [-26, 24],
      [-9, 20],
    ],
    "#ff577e",
  );
  dibujarPoligono(
    [
      [12, 2],
      [26, 24],
      [9, 20],
    ],
    "#ff577e",
  );
  dibujarPoligono(
    [
      [0, -30],
      [-13, -7],
      [-12, 23],
      [12, 23],
      [13, -7],
    ],
    "#63e0ff",
  );
  dibujarPoligono(
    [
      [0, -30],
      [-9, -14],
      [9, -14],
    ],
    "#ff577e",
  );
  contexto.fillStyle = "#163171";
  contexto.beginPath();
  contexto.arc(0, 0, 7, 0, Math.PI * 2);
  contexto.fill();
  contexto.strokeStyle = "#ffffff";
  contexto.stroke();
  contexto.restore();
}

function dibujarAsteroide(roca) {
  contexto.save();
  contexto.translate(roca.x, roca.y);
  contexto.rotate(roca.giro);
  contexto.shadowColor = "#ff9a65";
  contexto.shadowBlur = 12;
  const puntos = roca.perfil.map((factor, indice) => {
    const angulo = (indice * Math.PI * 2) / roca.perfil.length;
    return [
      Math.cos(angulo) * roca.radio * factor,
      Math.sin(angulo) * roca.radio * factor,
    ];
  });
  dibujarPoligono(puntos, "#b76f63", "#ffd0a2");
  contexto.shadowBlur = 0;
  contexto.fillStyle = "#8b4d55";
  for (const [x, y, factor] of [
    [-0.26, -0.18, 0.18],
    [0.32, 0.2, 0.13],
  ]) {
    contexto.beginPath();
    contexto.arc(
      x * roca.radio,
      y * roca.radio,
      factor * roca.radio,
      0,
      Math.PI * 2,
    );
    contexto.fill();
  }
  contexto.restore();
}

function dibujarDisparos() {
  contexto.save();
  contexto.shadowColor = "#77f6ff";
  contexto.shadowBlur = 16;
  contexto.fillStyle = "#a8fbff";
  disparos.forEach((bala) => {
    contexto.fillRect(bala.x - 3, bala.y - 13, 6, 18);
  });
  contexto.restore();
}

function dibujarParticulas() {
  particulas.forEach((particula) => {
    contexto.globalAlpha = Math.max(0, particula.vida * 2);
    contexto.fillStyle = particula.color;
    contexto.fillRect(particula.x, particula.y, 4, 4);
  });
  contexto.globalAlpha = 1;
}

function dibujarFotograma(tiempoActual) {
  const deltaTiempo = tiempoAnterior
    ? Math.min((tiempoActual - tiempoAnterior) / 1000, 0.04)
    : 0;
  tiempoAnterior = tiempoActual;

  if (partidaActiva && !enPausa) {
    tiempoRestante = Math.max(0, tiempoRestante - deltaTiempo);
    tiempoDeProteccion = Math.max(0, tiempoDeProteccion - deltaTiempo);
    moverNave(deltaTiempo);
    actualizarDisparos(deltaTiempo);
    actualizarAsteroides(deltaTiempo);
    actualizarParticulas(deltaTiempo);
    actualizarMarcadores();
    if (vidas <= 0 || tiempoRestante <= 0) terminarPartida();
  }

  dibujarFondo();
  asteroides.forEach(dibujarAsteroide);
  dibujarDisparos();
  dibujarParticulas();
  dibujarNave(tiempoActual);
  requestAnimationFrame(dibujarFotograma);
}

actualizarCodigoVisible();
actualizarMarcadores();
obtenerElemento("description").textContent =
  "Muévete con ← → o A / D. Dispara con espacio o con el botón y rompe " +
  "todos los asteroides que puedas en " +
  CONFIG.duracion +
  " segundos.";
requestAnimationFrame(dibujarFotograma);
