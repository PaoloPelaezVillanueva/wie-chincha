"use strict";

/* CAMBIA AQUÍ: reglas iniciales para el taller.
   velocidad: movimiento de la nave, de 3 a 12
   disparosPorSegundo: frecuencia del láser, de 2 a 8
   dificultad: "easy", "normal" o "hard"
   fondo: color del universo
   puntosPorAsteroide y puntosPorAlien: puntos por enemigo */
const CONFIG = {
  velocidad: 6,
  disparosPorSegundo: 5,
  dificultad: "normal",
  fondo: "#111b3b",
  duracion: 45,
  puntosPorAsteroide: 10,
  puntosPorAlien: 20,
  puntosPorJefe: 150,
};

const DIFICULTADES = {
  easy: {
    intervalo: 1.05,
    velocidad: 105,
    intervaloAlien: 2.4,
    velocidadAlien: 75,
    vidaJefe: 7,
    disparoJefe: 2.4,
  },
  normal: {
    intervalo: 0.72,
    velocidad: 155,
    intervaloAlien: 1.8,
    velocidadAlien: 95,
    vidaJefe: 9,
    disparoJefe: 1.9,
  },
  hard: {
    intervalo: 0.48,
    velocidad: 215,
    intervaloAlien: 1.35,
    velocidadAlien: 115,
    vidaJefe: 11,
    disparoJefe: 1.5,
  },
};

const obtenerElemento = (id) => document.getElementById(id);
const lienzo = obtenerElemento("board");
const contexto = lienzo.getContext("2d");
const Y_NAVE = 385;
const SEGUNDOS_FINALES = 13;
const teclasPresionadas = new Set();

let partidaActiva = false;
let enPausa = false;
let puntuacion = 0;
let vidas = 3;
let tiempoRestante = CONFIG.duracion;
let posicionNave = lienzo.width / 2;
let asteroides = [];
let aliens = [];
let disparos = [];
let disparosEnemigos = [];
let particulas = [];
let tiempoHastaAsteroide = 0;
let tiempoHastaAlien = 0;
let tiempoHastaDisparo = 0;
let tiempoDeProteccion = 0;
let tiempoAnterior = 0;
let disparoBoton = false;
let disparoLienzo = false;
let miniJefe = null;
let jefeAparecio = false;
let sacudida = 0;

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
    "puntosPorAlien: " + CONFIG.puntosPorAlien,
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
    obtenerElemento("start").blur();
    return;
  }

  puntuacion = 0;
  vidas = 3;
  tiempoRestante = CONFIG.duracion;
  posicionNave = lienzo.width / 2;
  asteroides = [];
  aliens = [];
  disparos = [];
  disparosEnemigos = [];
  particulas = [];
  tiempoHastaAsteroide = 0.5;
  tiempoHastaAlien = 1.2;
  tiempoHastaDisparo = 0;
  tiempoDeProteccion = 0;
  miniJefe = null;
  jefeAparecio = false;
  sacudida = 0;
  disparoBoton = false;
  disparoLienzo = false;
  teclasPresionadas.clear();
  partidaActiva = true;
  obtenerElemento("symbol").textContent = "🚀";
  obtenerElemento("missionStatus").textContent = "ASTEROIDES + ALIENS";
  obtenerElemento("bossHud").classList.add("hidden");
  document.querySelector(".game").classList.remove("boss-phase");

  actualizarMarcadores();
  ocultarMensaje();
  obtenerElemento("start").blur();
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
    obtenerElemento("start").blur();
  }
}

function terminarPartida(resultado) {
  partidaActiva = false;
  enPausa = false;
  teclasPresionadas.clear();
  disparoBoton = false;
  disparoLienzo = false;
  obtenerElemento("pause").textContent = "Ⅱ";
  obtenerElemento("bossHud").classList.add("hidden");
  document.querySelector(".game").classList.remove("boss-phase");

  if (resultado === "victoria") {
    obtenerElemento("symbol").textContent = "🏆";
    obtenerElemento("missionStatus").textContent = "MISIÓN CUMPLIDA";
    mostrarMensaje(
      "¡Mini jefe derrotado!",
      "Salvaste la misión y conseguiste " +
        puntuacion +
        " puntos. ¡Prueba otra dificultad!",
      "Volver a jugar →",
    );
  } else {
    obtenerElemento("symbol").textContent = "🚀";
    obtenerElemento("missionStatus").textContent = "INTÉNTALO DE NUEVO";
    mostrarMensaje(
      resultado === "vidas" ? "¡La nave necesita ayuda!" : "¡El jefe escapó!",
      "Conseguiste " +
        puntuacion +
        " puntos. Esquiva los disparos y vuelve a intentarlo.",
      "Volver a jugar →",
    );
  }
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

function crearAlien() {
  const dificultad = DIFICULTADES[CONFIG.dificultad];
  const baseX = 55 + Math.random() * (lienzo.width - 110);
  aliens.push({
    x: baseX,
    baseX,
    y: -32,
    edad: 0,
    fase: Math.random() * Math.PI * 2,
    velocidad: dificultad.velocidadAlien,
    tiempoDisparo: 1.5 + Math.random() * 1.3,
    color: Math.random() < 0.5 ? "#6af0d2" : "#b89bff",
  });
}

function crearDisparoEnemigo(x, y, velocidad, angulo, color) {
  disparosEnemigos.push({
    x,
    y,
    vx: Math.sin(angulo) * velocidad,
    vy: Math.cos(angulo) * velocidad,
    color,
  });
}

function recibirImpacto(x, y) {
  crearParticulas(x, y, "#ff8296");
  sacudida = 8;
  if (tiempoDeProteccion <= 0) {
    vidas = Math.max(0, vidas - 1);
    tiempoDeProteccion = 1.2;
  }
}

function actualizarAliens(deltaTiempo) {
  tiempoHastaAlien -= deltaTiempo;
  if (tiempoHastaAlien <= 0) {
    crearAlien();
    tiempoHastaAlien += DIFICULTADES[CONFIG.dificultad].intervaloAlien;
  }

  for (let indice = aliens.length - 1; indice >= 0; indice--) {
    const alien = aliens[indice];
    alien.edad += deltaTiempo;
    alien.y += alien.velocidad * deltaTiempo;
    alien.x = Math.max(
      30,
      Math.min(
        lienzo.width - 30,
        alien.baseX + Math.sin(alien.edad * 2.8 + alien.fase) * 42,
      ),
    );

    if (alien.y > 50 && alien.y < 270) {
      alien.tiempoDisparo -= deltaTiempo;
      if (alien.tiempoDisparo <= 0) {
        const angulo = Math.atan2(posicionNave - alien.x, Y_NAVE - alien.y);
        crearDisparoEnemigo(alien.x, alien.y + 18, 205, angulo, "#8af4d7");
        alien.tiempoDisparo = 2.7 + Math.random() * 0.9;
      }
    }

    let destruido = false;
    for (let bala = disparos.length - 1; bala >= 0; bala--) {
      if (
        Math.hypot(disparos[bala].x - alien.x, disparos[bala].y - alien.y) < 24
      ) {
        disparos.splice(bala, 1);
        aliens.splice(indice, 1);
        puntuacion += CONFIG.puntosPorAlien;
        crearParticulas(alien.x, alien.y, alien.color);
        destruido = true;
        break;
      }
    }
    if (destruido) continue;

    if (Math.hypot(alien.x - posicionNave, alien.y - Y_NAVE) < 42) {
      aliens.splice(indice, 1);
      recibirImpacto(alien.x, alien.y);
    } else if (alien.y > lienzo.height + 30) {
      aliens.splice(indice, 1);
    }
  }
}

function iniciarMiniJefe() {
  jefeAparecio = true;
  asteroides = [];
  aliens = [];
  disparosEnemigos = [];
  const vidaMaxima = DIFICULTADES[CONFIG.dificultad].vidaJefe;
  miniJefe = {
    x: lienzo.width / 2,
    y: -60,
    edad: 0,
    vida: vidaMaxima,
    vidaMaxima,
    tiempoDisparo: 1.5,
    brillo: 0,
  };
  obtenerElemento("missionStatus").textContent = "¡MINI JEFE FINAL!";
  const barra = obtenerElemento("bossHud");
  barra.classList.remove("hidden");
  barra.setAttribute("aria-valuemax", String(vidaMaxima));
  barra.setAttribute("aria-valuenow", String(vidaMaxima));
  obtenerElemento("bossHealth").style.width = "100%";
  document.querySelector(".game").classList.add("boss-phase");
}

function actualizarMiniJefe(deltaTiempo) {
  if (!miniJefe) return;
  miniJefe.edad += deltaTiempo;
  miniJefe.y = Math.min(160, miniJefe.y + 180 * deltaTiempo);
  miniJefe.x = lienzo.width / 2 + Math.sin(miniJefe.edad * 1.45) * 190;
  miniJefe.brillo = Math.max(0, miniJefe.brillo - deltaTiempo);

  for (let indice = disparos.length - 1; indice >= 0; indice--) {
    const bala = disparos[indice];
    if (
      Math.abs(bala.x - miniJefe.x) < 78 &&
      Math.abs(bala.y - miniJefe.y) < 40
    ) {
      disparos.splice(indice, 1);
      miniJefe.vida--;
      miniJefe.brillo = 0.15;
      sacudida = 4;
      crearParticulas(bala.x, bala.y, "#ffaad9");
      obtenerElemento("bossHud").setAttribute(
        "aria-valuenow",
        String(Math.max(0, miniJefe.vida)),
      );
      obtenerElemento("bossHealth").style.width =
        Math.max(0, (miniJefe.vida / miniJefe.vidaMaxima) * 100) + "%";

      if (miniJefe.vida <= 0) {
        for (let parte = 0; parte < 5; parte++) {
          crearParticulas(
            miniJefe.x + (Math.random() - 0.5) * 110,
            miniJefe.y + (Math.random() - 0.5) * 40,
            parte % 2 ? "#fff19c" : "#ff83c1",
          );
        }
        puntuacion += CONFIG.puntosPorJefe;
        miniJefe = null;
        terminarPartida("victoria");
        return;
      }
    }
  }

  if (miniJefe.y < 140) return;
  miniJefe.tiempoDisparo -= deltaTiempo;
  if (miniJefe.tiempoDisparo <= 0) {
    const angulo = Math.atan2(posicionNave - miniJefe.x, Y_NAVE - miniJefe.y);
    for (const apertura of [-0.22, 0, 0.22]) {
      crearDisparoEnemigo(
        miniJefe.x,
        miniJefe.y + 27,
        230,
        angulo + apertura,
        "#ff83c1",
      );
    }
    miniJefe.tiempoDisparo = DIFICULTADES[CONFIG.dificultad].disparoJefe;
  }
}

function actualizarDisparosEnemigos(deltaTiempo) {
  for (let indice = disparosEnemigos.length - 1; indice >= 0; indice--) {
    const bala = disparosEnemigos[indice];
    bala.x += bala.vx * deltaTiempo;
    bala.y += bala.vy * deltaTiempo;
    if (Math.hypot(bala.x - posicionNave, bala.y - Y_NAVE) < 22) {
      disparosEnemigos.splice(indice, 1);
      recibirImpacto(bala.x, bala.y);
    } else if (
      bala.y > lienzo.height + 20 ||
      bala.x < -20 ||
      bala.x > lienzo.width + 20
    ) {
      disparosEnemigos.splice(indice, 1);
    }
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
      recibirImpacto(roca.x, roca.y);
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

function dibujarFondo(tiempoActual) {
  const fondo = contexto.createLinearGradient(0, 0, 0, lienzo.height);
  fondo.addColorStop(0, CONFIG.fondo);
  fondo.addColorStop(1, "#070c1f");
  contexto.fillStyle = fondo;
  contexto.fillRect(0, 0, lienzo.width, lienzo.height);

  const nebulosa = contexto.createRadialGradient(610, 95, 10, 610, 95, 240);
  nebulosa.addColorStop(0, miniJefe ? "#f04c8e33" : "#7062cf2b");
  nebulosa.addColorStop(1, "#00000000");
  contexto.fillStyle = nebulosa;
  contexto.fillRect(360, 0, 400, 340);

  estrellasDelFondo.forEach((estrella) => {
    contexto.globalAlpha =
      0.3 +
      estrella.radio / 4 +
      Math.sin(tiempoActual / 550 + estrella.x) * 0.12;
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

function dibujarAlien(alien) {
  contexto.save();
  contexto.translate(alien.x, alien.y);
  contexto.rotate(Math.sin(alien.edad * 5) * 0.1);
  contexto.shadowColor = alien.color;
  contexto.shadowBlur = 18;

  contexto.strokeStyle = alien.color;
  contexto.lineWidth = 3;
  for (const x of [-15, 0, 15]) {
    contexto.beginPath();
    contexto.moveTo(x, 8);
    contexto.quadraticCurveTo(x * 1.3, 25, x * 1.2, 20);
    contexto.stroke();
  }

  contexto.fillStyle = "#362b66";
  contexto.beginPath();
  contexto.ellipse(0, 0, 24, 16, 0, 0, Math.PI * 2);
  contexto.fill();
  contexto.strokeStyle = alien.color;
  contexto.lineWidth = 2;
  contexto.stroke();

  contexto.fillStyle = alien.color;
  contexto.beginPath();
  contexto.ellipse(0, -5, 17, 12, 0, Math.PI, Math.PI * 2);
  contexto.fill();

  contexto.fillStyle = "#111f38";
  for (const x of [-8, 8]) {
    contexto.beginPath();
    contexto.ellipse(x, 0, 4, 6, 0, 0, Math.PI * 2);
    contexto.fill();
  }
  contexto.fillStyle = "#fff1a6";
  for (const x of [-8, 8]) {
    contexto.beginPath();
    contexto.arc(x - 1, -2, 1.5, 0, Math.PI * 2);
    contexto.fill();
  }
  contexto.restore();
}

function dibujarMiniJefe(tiempoActual) {
  if (!miniJefe) return;
  contexto.save();
  contexto.translate(miniJefe.x, miniJefe.y);
  contexto.translate(0, Math.sin(tiempoActual / 260) * 3);

  const aura = contexto.createRadialGradient(0, 0, 8, 0, 0, 112);
  aura.addColorStop(0, "#ff8cc477");
  aura.addColorStop(1, "#ff8cc400");
  contexto.fillStyle = aura;
  contexto.beginPath();
  contexto.arc(0, 0, 112, 0, Math.PI * 2);
  contexto.fill();

  contexto.shadowColor = "#ff67b5";
  contexto.shadowBlur = 22;
  contexto.fillStyle = "#663281";
  contexto.beginPath();
  contexto.ellipse(0, 8, 83, 27, 0, 0, Math.PI * 2);
  contexto.fill();
  contexto.strokeStyle = "#ffb6df";
  contexto.lineWidth = 3;
  contexto.stroke();

  contexto.fillStyle = "#c16bc8";
  contexto.beginPath();
  contexto.ellipse(0, -16, 56, 39, 0, Math.PI, Math.PI * 2);
  contexto.fill();
  contexto.stroke();

  contexto.fillStyle = "#2b214e";
  contexto.beginPath();
  contexto.ellipse(0, -7, 43, 20, 0, 0, Math.PI * 2);
  contexto.fill();

  contexto.fillStyle = "#fff0a5";
  for (const x of [-25, 0, 25]) {
    contexto.beginPath();
    contexto.ellipse(x, -9, 7, 10, 0, 0, Math.PI * 2);
    contexto.fill();
  }
  contexto.fillStyle = "#f7a9dd";
  for (const x of [-58, -35, 35, 58]) {
    contexto.beginPath();
    contexto.arc(x, 12, 4, 0, Math.PI * 2);
    contexto.fill();
  }

  contexto.strokeStyle = "#ffb6df";
  contexto.lineWidth = 4;
  for (const x of [-48, 48]) {
    contexto.beginPath();
    contexto.moveTo(x, 20);
    contexto.quadraticCurveTo(x * 1.3, 47, x * 1.1, 42);
    contexto.stroke();
  }

  if (miniJefe.brillo > 0) {
    contexto.globalAlpha = miniJefe.brillo * 3;
    contexto.fillStyle = "#ffffff";
    contexto.beginPath();
    contexto.ellipse(0, 2, 82, 29, 0, 0, Math.PI * 2);
    contexto.fill();
  }
  contexto.restore();
}

function dibujarDisparosEnemigos() {
  contexto.save();
  contexto.lineCap = "round";
  contexto.lineWidth = 3;
  disparosEnemigos.forEach((bala) => {
    contexto.shadowColor = bala.color;
    contexto.shadowBlur = 15;
    contexto.strokeStyle = bala.color;
    contexto.beginPath();
    contexto.moveTo(bala.x - bala.vx * 0.04, bala.y - bala.vy * 0.04);
    contexto.lineTo(bala.x, bala.y);
    contexto.stroke();
    contexto.fillStyle = "#fff1ef";
    contexto.beginPath();
    contexto.arc(bala.x, bala.y, 4, 0, Math.PI * 2);
    contexto.fill();
  });
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
    sacudida = Math.max(0, sacudida - deltaTiempo * 22);
    moverNave(deltaTiempo);
    actualizarDisparos(deltaTiempo);

    if (!jefeAparecio && tiempoRestante <= SEGUNDOS_FINALES) {
      iniciarMiniJefe();
    }
    if (jefeAparecio) {
      actualizarMiniJefe(deltaTiempo);
    } else {
      actualizarAsteroides(deltaTiempo);
      actualizarAliens(deltaTiempo);
    }
    if (partidaActiva) actualizarDisparosEnemigos(deltaTiempo);
    actualizarParticulas(deltaTiempo);
    actualizarMarcadores();
    if (partidaActiva && vidas <= 0) terminarPartida("vidas");
    else if (partidaActiva && tiempoRestante <= 0) terminarPartida("tiempo");
  }

  dibujarFondo(tiempoActual);
  contexto.save();
  if (sacudida > 0) {
    contexto.translate(
      (Math.random() - 0.5) * sacudida,
      (Math.random() - 0.5) * sacudida,
    );
  }
  asteroides.forEach(dibujarAsteroide);
  aliens.forEach(dibujarAlien);
  dibujarMiniJefe(tiempoActual);
  dibujarDisparosEnemigos();
  dibujarDisparos();
  dibujarParticulas();
  dibujarNave(tiempoActual);
  contexto.restore();
  requestAnimationFrame(dibujarFotograma);
}

actualizarCodigoVisible();
actualizarMarcadores();
obtenerElemento("description").textContent =
  "Muévete con ← → o A / D. Dispara con espacio o con el botón, derriba " +
  "aliens y derrota al mini jefe en " +
  CONFIG.duracion +
  " segundos.";
requestAnimationFrame(dibujarFotograma);
