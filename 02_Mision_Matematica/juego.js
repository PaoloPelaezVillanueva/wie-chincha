"use strict";

/* CAMBIA AQUÍ: reglas iniciales de la misión matemática.
   Cada respuesta correcta suma CONFIG.puntos, también en modo turbo. */
const CONFIG = {
  maximo: 20,
  operacion: "mix",
  retos: 8,
  puntos: 10,
  color: "#263658",
};
const TIEMPO_TURBO = 12;

const obtener = (id) => document.getElementById(id);
let animacionActual = 0;
const estado = {
  ronda: 1,
  puntos: 0,
  racha: 0,
  aciertos: 0,
  respuesta: 0,
  ecuacion: "",
  bloqueado: false,
  terminado: false,
  resultados: [],
  tiempoRestante: TIEMPO_TURBO,
  ultimoTick: 0,
  temporizador: null,
};

function aleatorio(minimo, maximo) {
  return Math.floor(Math.random() * (maximo - minimo + 1)) + minimo;
}

function mezclar(valores) {
  const copia = [...valores];
  for (let indice = copia.length - 1; indice > 0; indice--) {
    const otro = aleatorio(0, indice);
    [copia[indice], copia[otro]] = [copia[otro], copia[indice]];
  }
  return copia;
}

function actualizarCodigoVisible() {
  obtener("totalPortals").textContent = CONFIG.retos;
  obtener("pointValue").textContent = CONFIG.puntos;
  obtener("code").textContent = [
    "// CAMBIA AQUÍ",
    "maximo: " + CONFIG.maximo,
    'operacion: "' + CONFIG.operacion + '"',
    "retos: " + CONFIG.retos,
    "puntos: " + CONFIG.puntos,
  ].join("\n");
  document.documentElement.style.setProperty("--portal-base", CONFIG.color);
}

function actualizarMarcadores() {
  obtener("progress").textContent =
    "Portal " + estado.ronda + " / " + CONFIG.retos;
  obtener("points").textContent = estado.puntos;
  obtener("streak").textContent = "🔥 Racha " + estado.racha;
  obtener("routeCount").textContent =
    estado.resultados.length + " / " + CONFIG.retos;
}

function actualizarRuta() {
  const ruta = obtener("route");
  ruta.replaceChildren();
  for (let indice = 0; indice < CONFIG.retos; indice++) {
    const nodo = document.createElement("span");
    nodo.className = "route-node";
    if (indice < estado.resultados.length) {
      const acierto = estado.resultados[indice];
      nodo.classList.add(acierto ? "success" : "missed");
      nodo.textContent = acierto ? "✓" : "×";
      nodo.setAttribute(
        "aria-label",
        "Portal " + (indice + 1) + ": " + (acierto ? "acertado" : "sin puntos"),
      );
    } else {
      nodo.textContent = indice + 1;
      if (indice === estado.ronda - 1 && !estado.terminado) {
        nodo.classList.add("current");
      }
    }
    ruta.append(nodo);
  }
}

function crearOperacion() {
  const tipo =
    CONFIG.operacion === "mix"
      ? Math.random() < 0.5
        ? "add"
        : "sub"
      : CONFIG.operacion;
  let primero = aleatorio(1, CONFIG.maximo);
  let segundo = aleatorio(1, CONFIG.maximo);
  if (tipo === "mul") {
    primero = aleatorio(1, 10);
    segundo = aleatorio(1, 10);
  }
  if (tipo === "sub" && segundo > primero) {
    [primero, segundo] = [segundo, primero];
  }
  const simbolo = tipo === "add" ? "+" : tipo === "sub" ? "−" : "×";
  const respuesta =
    tipo === "add"
      ? primero + segundo
      : tipo === "sub"
        ? primero - segundo
        : primero * segundo;
  const nombre =
    tipo === "add" ? "SUMA" : tipo === "sub" ? "RESTA" : "MULTIPLICACIÓN";
  return {
    respuesta,
    pregunta: primero + " " + simbolo + " " + segundo + " = ?",
    ecuacion: primero + " " + simbolo + " " + segundo + " = " + respuesta,
    nombre,
  };
}

function crearOpciones(respuesta) {
  const valores = new Set([respuesta]);
  const desplazamientos = mezclar([
    -8, -6, -4, -3, -2, -1, 1, 2, 3, 4, 6, 8, 10,
  ]);
  for (const diferencia of desplazamientos) {
    const opcion = respuesta + diferencia;
    if (opcion >= 0) valores.add(opcion);
    if (valores.size === 4) break;
  }
  return mezclar([...valores]);
}

function crearPortal(valor, indice) {
  const boton = document.createElement("button");
  boton.className = "portal-choice";
  boton.type = "button";
  boton.dataset.value = valor;
  boton.setAttribute("aria-label", "Portal " + (indice + 1) + ": " + valor);

  const numero = document.createElement("span");
  numero.className = "portal-index";
  numero.textContent = "PORTAL " + (indice + 1);

  const respuesta = document.createElement("span");
  respuesta.className = "portal-value";
  respuesta.textContent = valor;

  boton.append(numero, respuesta);
  boton.addEventListener("click", () => responder(valor, boton));
  return boton;
}

function mostrarTiempo() {
  const porcentaje = Math.max(0, (estado.tiempoRestante / TIEMPO_TURBO) * 100);
  obtener("timerBar").style.width = porcentaje + "%";
  obtener("timerBar").classList.toggle("low", porcentaje <= 30);
  obtener("timerText").textContent = Math.ceil(estado.tiempoRestante) + " s";
}

function detenerTemporizador() {
  if (estado.temporizador !== null) {
    clearInterval(estado.temporizador);
    estado.temporizador = null;
  }
}

function iniciarTemporizador() {
  detenerTemporizador();
  const turbo = obtener("turbo").checked;
  obtener("timerWrap").hidden = !turbo;
  if (!turbo) return;

  estado.tiempoRestante = TIEMPO_TURBO;
  estado.ultimoTick = performance.now();
  mostrarTiempo();
  estado.temporizador = setInterval(() => {
    const ahora = performance.now();
    if (!document.hidden) {
      estado.tiempoRestante = Math.max(
        0,
        estado.tiempoRestante - (ahora - estado.ultimoTick) / 1000,
      );
      mostrarTiempo();
      if (estado.tiempoRestante <= 0) responder(null, null, true);
    }
    estado.ultimoTick = ahora;
  }, 80);
}

function nuevaPregunta() {
  estado.bloqueado = false;
  obtener("scene").classList.remove("success", "failure");
  animacionActual++;
  obtener("burst").replaceChildren();
  obtener("choiceHeading").hidden = false;
  obtener("shortcuts").hidden = false;
  obtener("feedback").textContent = "";
  obtener("feedback").classList.remove("error");
  obtener("next").disabled = true;
  obtener("next").textContent = "Siguiente portal →";
  obtener("scenePrompt").textContent =
    "¿Qué portal tiene la respuesta correcta?";

  const operacion = crearOperacion();
  estado.respuesta = operacion.respuesta;
  estado.ecuacion = operacion.ecuacion;
  obtener("missionLabel").textContent =
    "PORTAL " +
    String(estado.ronda).padStart(2, "0") +
    " · " +
    operacion.nombre;
  obtener("question").textContent = operacion.pregunta;

  obtener("choices").replaceChildren(
    ...crearOpciones(operacion.respuesta).map(crearPortal),
  );
  actualizarMarcadores();
  actualizarRuta();
  actualizarCodigoVisible();
  iniciarTemporizador();
}

function lanzarChispas() {
  const contenedor = obtener("burst");
  const animacion = ++animacionActual;
  contenedor.replaceChildren();
  for (let indice = 0; indice < 12; indice++) {
    const chispa = document.createElement("span");
    const angulo = (indice * Math.PI * 2) / 12;
    const distancia = 95 + Math.random() * 55;
    chispa.style.setProperty("--dx", Math.cos(angulo) * distancia + "px");
    chispa.style.setProperty("--dy", Math.sin(angulo) * distancia + "px");
    contenedor.append(chispa);
  }
  setTimeout(() => {
    if (animacion === animacionActual) contenedor.replaceChildren();
  }, 750);
}

function responder(valor, elegido, sinTiempo = false) {
  if (estado.bloqueado || estado.terminado) return;
  estado.bloqueado = true;
  detenerTemporizador();
  const acierto = !sinTiempo && valor === estado.respuesta;
  estado.resultados.push(acierto);

  document.querySelectorAll(".portal-choice").forEach((boton) => {
    boton.disabled = true;
    if (Number(boton.dataset.value) === estado.respuesta) {
      boton.classList.add("correct");
    } else if (boton === elegido) {
      boton.classList.add("wrong");
    }
  });

  if (acierto) {
    estado.puntos += CONFIG.puntos;
    estado.racha++;
    estado.aciertos++;
    obtener("feedback").textContent =
      "¡Portal activado! +" +
      CONFIG.puntos +
      " puntos." +
      (estado.racha >= 3 ? " 🔥 ¡Racha de " + estado.racha + "!" : "");
    obtener("scene").classList.add("success");
    lanzarChispas();
  } else {
    estado.racha = 0;
    obtener("feedback").classList.add("error");
    obtener("feedback").textContent = sinTiempo
      ? "Se cerró el portal. " + estado.ecuacion + ". ¡Sigue adelante!"
      : "Casi. " + estado.ecuacion + ". ¡El próximo será tuyo!";
    obtener("scene").classList.add("failure");
  }

  actualizarMarcadores();
  actualizarRuta();
  obtener("next").disabled = false;
  if (estado.ronda === CONFIG.retos) {
    obtener("next").textContent = "Ver resultado →";
  }
}

function mostrarResultado() {
  estado.terminado = true;
  detenerTemporizador();
  animacionActual++;
  obtener("burst").replaceChildren();
  obtener("timerWrap").hidden = true;
  obtener("choiceHeading").hidden = true;
  obtener("choices").replaceChildren();
  obtener("shortcuts").hidden = true;
  obtener("missionLabel").textContent = "MISIÓN COMPLETADA";
  obtener("question").textContent = "¡Ruta completada!";
  const nivel =
    estado.aciertos >= CONFIG.retos * 0.75
      ? "🏆 Excelente"
      : estado.aciertos >= CONFIG.retos * 0.4
        ? "¡Muy bien!"
        : "Sigue practicando";
  obtener("scenePrompt").textContent =
    nivel + " · " + estado.aciertos + " de " + CONFIG.retos + " portales";
  obtener("feedback").classList.remove("error");
  obtener("feedback").textContent =
    "Conseguiste " +
    estado.puntos +
    " de " +
    CONFIG.retos * CONFIG.puntos +
    " puntos. Cambia una regla y prueba otra ruta.";
  obtener("next").textContent = "Jugar de nuevo →";
  actualizarRuta();
}

function reiniciar() {
  detenerTemporizador();
  estado.ronda = 1;
  estado.puntos = 0;
  estado.racha = 0;
  estado.aciertos = 0;
  estado.resultados = [];
  estado.bloqueado = false;
  estado.terminado = false;
  nuevaPregunta();
}

obtener("next").addEventListener("click", () => {
  if (estado.terminado) {
    reiniciar();
  } else if (estado.ronda === CONFIG.retos) {
    mostrarResultado();
  } else {
    estado.ronda++;
    nuevaPregunta();
  }
});
obtener("reset").addEventListener("click", reiniciar);
obtener("level").addEventListener("change", (evento) => {
  CONFIG.maximo = Number(evento.target.value);
  reiniciar();
});
obtener("operation").addEventListener("change", (evento) => {
  CONFIG.operacion = evento.target.value;
  reiniciar();
});
obtener("accent").addEventListener("input", (evento) => {
  CONFIG.color = evento.target.value;
  actualizarCodigoVisible();
});
obtener("turbo").addEventListener("change", reiniciar);

window.addEventListener("keydown", (evento) => {
  if (!/^[1-4]$/.test(evento.key) || estado.bloqueado || estado.terminado) {
    return;
  }
  const activo = document.activeElement;
  if (["INPUT", "SELECT", "TEXTAREA"].includes(activo.tagName)) return;
  const portal = obtener("choices").children[Number(evento.key) - 1];
  if (portal) {
    evento.preventDefault();
    portal.click();
  }
});

reiniciar();
