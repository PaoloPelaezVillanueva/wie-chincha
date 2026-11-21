// CAMBIA AQUÍ: reglas iniciales de tu videojuego.
const CONFIG = {
  maximo: 20,
  operacion: "mix",
  retos: 8,
  puntos: 10,
  color: "#263658",
};
const $ = (id) => document.getElementById(id);
let round = 1,
  points = 0,
  answer = 0,
  locked = false,
  done = false;
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
function showCode() {
  $("code").textContent =
    `// CAMBIA AQUÍ\nmaximo = ${CONFIG.maximo};\noperacion = "${CONFIG.operacion}";\nretos = ${CONFIG.retos};\npuntos = ${CONFIG.puntos};`;
}
function question() {
  locked = false;
  done = false;
  $("next").disabled = true;
  $("next").textContent = "Siguiente reto →";
  $("feedback").textContent = "";
  $("progress").textContent = `Reto ${round} / ${CONFIG.retos}`;
  $("points").textContent = points + " puntos";
  let op =
    CONFIG.operacion === "mix"
      ? Math.random() < 0.5
        ? "add"
        : "sub"
      : CONFIG.operacion;
  let a = rand(1, CONFIG.maximo),
    b = rand(1, CONFIG.maximo);
  if (op === "mul") {
    a = rand(1, 10);
    b = rand(1, 10);
  }
  if (op === "sub" && b > a) [a, b] = [b, a];
  answer = op === "add" ? a + b : op === "sub" ? a - b : a * b;
  $("question").textContent =
    `${a} ${op === "add" ? "+" : op === "sub" ? "−" : "×"} ${b} = ?`;
  let values = new Set([answer]);
  while (values.size < 4) values.add(Math.max(0, answer + rand(-10, 10)));
  $("choices").replaceChildren();
  for (const value of [...values].sort(() => Math.random() - 0.5)) {
    let btn = document.createElement("button");
    btn.textContent = value;
    btn.style.background = CONFIG.color;
    btn.onclick = () => {
      if (locked) return;
      locked = true;
      document
        .querySelectorAll("#choices button")
        .forEach((b) => (b.disabled = true));
      if (value === answer) {
        points += CONFIG.puntos;
        btn.style.background = "#217257";
        $("feedback").textContent =
          "¡Correcto! Portal activado. +" + CONFIG.puntos + " puntos.";
      } else {
        btn.style.background = "#8e3550";
        $("feedback").textContent =
          `Buen intento. ${a} ${op === "add" ? "+" : op === "sub" ? "−" : "×"} ${b} = ${answer}. ¡Vamos con el siguiente!`;
      }
      $("points").textContent = points + " puntos";
      $("next").disabled = false;
      if (round === CONFIG.retos) $("next").textContent = "Ver resultado →";
    };
    $("choices").append(btn);
  }
  showCode();
}
function reset() {
  round = 1;
  points = 0;
  question();
}
$("next").onclick = () => {
  if (done) {
    reset();
    return;
  }
  if (round === CONFIG.retos) {
    done = true;
    $("question").textContent = "¡Misión cumplida!";
    $("question").style.fontSize = "44px";
    $("choices").replaceChildren();
    $("progress").textContent = "Partida completada";
    $("feedback").textContent =
      `Conseguiste ${points} de ${CONFIG.retos * CONFIG.puntos} puntos. Cambia las reglas y prueba otra partida.`;
    $("next").textContent = "Jugar otra vez →";
  } else {
    round++;
    question();
  }
};
$("reset").onclick = () => {
  $("question").style.fontSize = "";
  reset();
};
$("level").onchange = (e) => {
  CONFIG.maximo = +e.target.value;
  reset();
};
$("operation").onchange = (e) => {
  CONFIG.operacion = e.target.value;
  reset();
};
$("accent").oninput = (e) => {
  CONFIG.color = e.target.value;
  document
    .querySelectorAll("#choices button")
    .forEach((b) => (b.style.background = CONFIG.color));
};
question();
