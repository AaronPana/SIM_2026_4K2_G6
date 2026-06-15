// ─── Generadores de variables aleatorias ───────────────────────────────────

export function expNeg(media) {
  const rnd = Math.random();
  return { valor:-media * Math.log(1 - rnd) , rnd };
}

export function uniforme(a, b) {
  const rnd = Math.random();
  return { valor: a + (b - a) * rnd, rnd };
}

// ─── Runge-Kutta 4 para la consulta socio ──────────────────────────────────
// EDO: dM/dt = 0.6*t + 0.7*M(t)
// Condición inicial: M(0) = 0  (para nivel nulo, 0 tiempo)
// Termina cuando M(t) supera el nivel de meticulosidad M0
// Retorna { duracion, tabla }

export function rungeKutta(M0, h = 0.1) {
  if (M0 === 0) return { duracion: 0, tabla: [] };

  const f = (t, M) => 0.6 * t + 0.7 * M;

  const tabla = [];
  let t = 0;
  let M = 0; // M(0) = 0

  while (M <= M0) {
    const k1 = f(t, M);
    const k2 = f(t + h / 2, M + (h / 2) * k1);
    const k3 = f(t + h / 2, M + (h / 2) * k2);
    const k4 = f(t + h, M + h * k3);
    const dM = (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);

    tabla.push({
      t: parseFloat(t.toFixed(4)),
      M: parseFloat(M.toFixed(6)),
      k1: parseFloat(k1.toFixed(6)),
      k2: parseFloat(k2.toFixed(6)),
      k3: parseFloat(k3.toFixed(6)),
      k4: parseFloat(k4.toFixed(6)),
      dM: parseFloat(dM.toFixed(6)),
    });

    M += dM;
    t = parseFloat((t + h).toFixed(10));

    if (t > 1000) break; // seguridad
  }

  return { duracion: parseFloat(t.toFixed(4)), tabla };
}
