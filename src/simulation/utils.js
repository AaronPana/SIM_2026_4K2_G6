// ─── Generadores de variables aleatorias ───────────────────────────────────

export function expNeg(media) {
  const rnd = Math.random();
  return { valor: -media * Math.log(1 - rnd), rnd };
}

export function uniforme(a, b) {
  const rnd = Math.random();
  return { valor: a + (b - a) * rnd, rnd };
}

// ─── Tiempo de lectura en instalaciones ────────────────────────────────────
// El enunciado dice "se quedan en promedio 30 minutos".
// Actualmente se modela como exponencial negativa con media = mediaLectura.
//
// ⚠️  PUNTO DE CAMBIO: si se decide usar una distribución distinta
//     (por ejemplo constante, uniforme, o normal), modificar SOLO esta función.
//     El resto del motor llama a tiempoLecturaInstalaciones() y no necesita cambios.
//
// Opciones comentadas para referencia:
//   Constante:  return { valor: media, rnd: null };
//   Uniforme:   return uniforme(media * 0.5, media * 1.5);
//   Exp. neg. (actual): ver abajo
export function tiempoLecturaInstalaciones(media) {
  return expNeg(media);
}

// ─── Runge-Kutta 4 para la consulta socio ──────────────────────────────────
// EDO: dM/dt = 0.6*t + 0.7*M(t)
// Condición inicial: M(0) = 0  (para nivel nulo, 0 tiempo)
// Termina cuando M(t) supera el nivel de meticulosidad M0
// La tabla incluye la fila donde M supera M0 (la iteración que termina la consulta)
// Retorna { duracion, tabla }

export function rungeKutta(M0, h = 0.1) {
  if (M0 === 0) return { duracion: 0, tabla: [] };

  const f = (t, M) => 0.6 * t + 0.7 * M;

  const tabla = [];
  let t = 0;
  let M = 0; // M(0) = 0

  while (true) {
    const k1 = f(t, M);
    const k2 = f(t + h / 2, M + (h / 2) * k1);
    const k3 = f(t + h / 2, M + (h / 2) * k2);
    const k4 = f(t + h, M + h * k3);
    const dM = (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);

    // Guardar fila con M actual y el dM que se va a aplicar
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

    if (t > 1000) break;

    if (M > M0) {
      // Guardar la fila extra con el M resultante que ya superó M0
      const k1f = f(t, M);
      const k2f = f(t + h / 2, M + (h / 2) * k1f);
      const k3f = f(t + h / 2, M + (h / 2) * k2f);
      const k4f = f(t + h, M + h * k3f);
      const dMf = (h / 6) * (k1f + 2 * k2f + 2 * k3f + k4f);
      tabla.push({
        t: parseFloat(t.toFixed(4)),
        M: parseFloat(M.toFixed(6)),
        k1: parseFloat(k1f.toFixed(6)),
        k2: parseFloat(k2f.toFixed(6)),
        k3: parseFloat(k3f.toFixed(6)),
        k4: parseFloat(k4f.toFixed(6)),
        dM: parseFloat(dMf.toFixed(6)),
      });
      break;
    }
  }

  return { duracion: parseFloat(t.toFixed(4)), tabla };
}
