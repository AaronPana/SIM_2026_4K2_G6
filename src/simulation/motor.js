import { expNeg, uniforme, rungeKutta } from './utils.js';

// ─── Constantes por defecto ─────────────────────────────────────────────────
export const DEFAULT_PARAMS = {
  mediaLlegada: 4,         // min entre llegadas
  pctPideLibro: 0.45,
  pctDevuelve: 0.45,
  // pctConsulta = 0.10 (el resto)
  mediaPrestamo: 6,        // exp neg
  devolucionMin: 1.5,      // uniforme 2±0.5 → [1.5, 2.5]
  devolucionMax: 2.5,
  meticulosidadMin: 2,
  meticulosidadMax: 36,
  hRK: 0.1,
  pctSeRetira: 0.60,
  mediaLecturaInstalaciones: 30, // exp neg
  capacidadMax: 20,
  tiempoMaximo: 9999999,   // minutos máx (se usa la iteración como límite)
  maxIteraciones: 100000,
};

// ─── Motor de simulación ────────────────────────────────────────────────────

export function ejecutarSimulacion(params) {
  const P = { ...DEFAULT_PARAMS, ...params };

  // ─── Estado del sistema ────────────────────────────────────────────────
  let reloj = 0;

  // Empleados: { libreEn: número (minuto en que queda libre), atendiendo: null | personaId }
  const empleados = [
    { id: 1, libreEn: 0, atendiendo: null },
    { id: 2, libreEn: 0, atendiendo: null },
  ];

  // Cola de espera en mostrador
  let cola = []; // personas esperando ser atendidas

  // Personas en instalaciones leyendo
  let lectores = []; // { id, salidaLectura }

  // Estado biblioteca
  let bibliotecaCerrada = false;
  let personasEnBiblioteca = 0; // total dentro (cola + siendo atendidos + lectores)

  // Próxima llegada
  let proxLlegada = expNeg(P.mediaLlegada).valor;

  // Próximas salidas de lectores se manejan como eventos
  // Usaremos una lista de eventos para lectores + fin atención

  // Contadores para métricas
  let totalPersonas = 0;
  let personasCerrada = 0;
  let sumaTiemposPermanencia = 0;
  let personasFinalizadas = 0;

  // Estadísticas adicionales
  let totalPidieronLibro = 0;
  let totalDevolvieron = 0;
  let totalConsultas = 0;
  let totalSeQuedaronALeer = 0;
  let totalSeRetiraron = 0;
  let tiempoTotalCola = 0;         // suma de esperas en cola
  let personasQueFueronACola = 0;
  let veces20personas = 0;         // cuántas veces se llegó a 20
  let maxPersonasSimultaneas = 0;

  // ─── Registro de personas (para permanencia) ─────────────────────────
  // Map id -> { llegada, salida }
  const registroPersonas = new Map();
  let nextId = 1;

  // ─── Vector de estado: filas ─────────────────────────────────────────
  const filas = [];

  // ─── Funciones auxiliares ─────────────────────────────────────────────

  function empladoLibre() {
    return empleados.find(e => e.libreEn <= reloj && e.atendiendo === null);
  }

  function tipoLlegada() {
    const r = Math.random();
    if (r < P.pctPideLibro) return { tipo: 'PIDE_LIBRO', rnd: r };
    if (r < P.pctPideLibro + P.pctDevuelve) return { tipo: 'DEVUELVE', rnd: r };
    return { tipo: 'CONSULTA', rnd: r };
  }

  function calcularTiempoAtencion(tipo, personaId) {
    let duracion, rndDur, tablaRK = null, meticulosidad = null, rndMet = null;

    if (tipo === 'PIDE_LIBRO') {
      const res = expNeg(P.mediaPrestamo);
      duracion = res.valor;
      rndDur = res.rnd;
    } else if (tipo === 'DEVUELVE') {
      const res = uniforme(P.devolucionMin, P.devolucionMax);
      duracion = res.valor;
      rndDur = res.rnd;
    } else {
      // CONSULTA → Runge-Kutta
      const resM = uniforme(P.meticulosidadMin, P.meticulosidadMax);
      meticulosidad = resM.valor;
      rndMet = resM.rnd;
      const rkRes = rungeKutta(meticulosidad, P.hRK);
      duracion = rkRes.duracion;
      tablaRK = rkRes.tabla;
      rndDur = null;
    }

    return { duracion, rndDur, tablaRK, meticulosidad, rndMet };
  }

  function iniciarAtencion(empleado, persona) {
    const { duracion, rndDur, tablaRK, meticulosidad, rndMet } = calcularTiempoAtencion(
      persona.tipo, persona.id
    );

    empleado.atendiendo = persona.id;
    empleado.libreEn = reloj + duracion;
    persona.finAtencion = reloj + duracion;
    persona.empleadoId = empleado.id;
    persona.rndDur = rndDur;
    persona.tablaRK = tablaRK;
    persona.meticulosidad = meticulosidad;
    persona.rndMet = rndMet;
    persona.tiempoEspera = reloj - persona.llegada;
    tiempoTotalCola += persona.tiempoEspera;
  }

  function procesarFinAtencion(persona) {
    const empleado = empleados.find(e => e.atendiendo === persona.id);
    if (empleado) empleado.atendiendo = null;

    if (persona.tipo === 'PIDE_LIBRO') {
      totalPidieronLibro++;
      const rndRetiro = Math.random();
      if (rndRetiro < P.pctSeRetira) {
        // Se retira con el libro
        totalSeRetiraron++;
        persona.destino = 'SE_RETIRA';
        persona.rndDestino = rndRetiro;
        personasEnBiblioteca--;
        finalizarPersona(persona);
      } else {
        // Se queda a leer ~30' (exp neg)
        totalSeQuedaronALeer++;
        persona.destino = 'QUEDA_LEER';
        persona.rndDestino = rndRetiro;
        const resLectura = expNeg(P.mediaLecturaInstalaciones);
        persona.tiempoLectura = resLectura.valor;
        persona.rndLectura = resLectura.rnd;
        persona.salidaLectura = reloj + persona.tiempoLectura;
        lectores.push(persona);
      }
    } else if (persona.tipo === 'DEVUELVE') {
      totalDevolvieron++;
      persona.destino = 'DEVOLVIO';
      personasEnBiblioteca--;
      finalizarPersona(persona);
    } else {
      // CONSULTA
      totalConsultas++;
      persona.destino = 'CONSULTO';
      personasEnBiblioteca--;
      finalizarPersona(persona);
    }
  }

  function procesarFinLectura(lector) {
    lectores = lectores.filter(l => l.id !== lector.id);
    lector.tipo = 'DEVUELVE'; // ahora va a devolver
    lector.esDevolucionPostLectura = true;

    // Encola para devolver
    const emp = empladoLibre();
    if (emp) {
      lector.llegadaMostrador2 = reloj;
      lector.tiempoEspera2 = 0;
      iniciarAtencion(emp, lector);
    } else {
      lector.llegadaMostrador2 = reloj;
      cola.push(lector);
      personasQueFueronACola++;
    }
  }

  function procesarFinAtencionDevolucionPostLectura(persona) {
    const empleado = empleados.find(e => e.atendiendo === persona.id);
    if (empleado) empleado.atendiendo = null;
    totalDevolvieron++;
    persona.destino = 'DEVOLVIO_POST_LECTURA';
    personasEnBiblioteca--;
    finalizarPersona(persona);
  }

  function finalizarPersona(persona) {
    persona.salida = reloj;
    const permanencia = persona.salida - persona.llegada;
    sumaTiemposPermanencia += permanencia;
    personasFinalizadas++;
    registroPersonas.set(persona.id, { llegada: persona.llegada, salida: persona.salida, permanencia });
  }

  // ─── EVENTO: determinar el próximo evento ─────────────────────────────
  function proximoEvento(personasEnAtencion) {
    let eventos = [];

    // Llegada
    eventos.push({ tipo: 'LLEGADA', tiempo: proxLlegada });

    // Fin de atención de empleados
    empleados.forEach(e => {
      if (e.atendiendo !== null) {
        const persona = personasEnAtencion.find(p => p.id === e.atendiendo);
        if (persona) eventos.push({ tipo: 'FIN_ATENCION', tiempo: e.libreEn, personaId: e.atendiendo });
      }
    });

    // Fin de lectura
    lectores.forEach(l => {
      eventos.push({ tipo: 'FIN_LECTURA', tiempo: l.salidaLectura, personaId: l.id });
    });

    return eventos.reduce((min, e) => e.tiempo < min.tiempo ? e : min);
  }

  // ─── Objetos persistentes en la simulación ────────────────────────────
  let personasEnSistema = []; // personas activas (en cola, siendo atendidas, o leyendo)

  // ─── Iteración principal ──────────────────────────────────────────────
  let iteracion = 0;

  while (iteracion < P.maxIteraciones && reloj < P.tiempoMaximo) {
    iteracion++;

    // Identificar próximo evento
    const evento = proximoEvento(personasEnSistema);
    reloj = parseFloat(evento.tiempo.toFixed(2));

    let filaEvento = {
      iteracion,
      reloj,
      evento: evento.tipo,
      eventoPersonaId: evento.personaId || null,
      // llegada
      rndLlegada: null,
      proxLlegada: null,
      // persona nueva
      personaId: null,
      tipoPersona: null,
      rndTipo: null,
      // atencion
      empleadoAsignado: null,
      rndDuracion: null,
      duracionAtencion: null,
      tablaRK: null,
      meticulosidad: null,
      rndMeticulosidad: null,
      // destino pide libro
      rndDestino: null,
      destino: null,
      rndLectura: null,
      tiempoLectura: null,
      // cola
      largoColaMostrador: cola.length,
      // estado empleados
      empleado1LibreEn: empleados[0].libreEn,
      empleado1Atendiendo: empleados[0].atendiendo,
      empleado2LibreEn: empleados[1].libreEn,
      empleado2Atendiendo: empleados[1].atendiendo,
      // estado biblioteca
      personasEnBiblioteca,
      bibliotecaCerrada,
      lectoresEnSala: lectores.length,
      // métricas acumuladas
      personasFinalizadas,
      sumaTiemposPermanencia: parseFloat(sumaTiemposPermanencia.toFixed(2)),
      personasCerrada,
      totalPidieronLibro,
      totalDevolvieron,
      totalConsultas,
      totalSeQuedaronALeer,
      totalSeRetiraron,
      tiempoTotalCola: parseFloat(tiempoTotalCola.toFixed(2)),
      personasQueFueronACola,
      // objetos presentes
      personasPresentes: JSON.parse(JSON.stringify(personasEnSistema)),
      lectoresPresentes: JSON.parse(JSON.stringify(lectores)),
    };

    // ─── Procesar evento ──────────────────────────────────────────────

    if (evento.tipo === 'LLEGADA') {
      totalPersonas++;
      const id = nextId++;

      // Generar próxima llegada
      const resLlegada = expNeg(P.mediaLlegada);
      filaEvento.rndLlegada = resLlegada.rnd;
      filaEvento.proxLlegada = parseFloat((reloj + resLlegada.valor).toFixed(2));
      proxLlegada = reloj + resLlegada.valor;

      filaEvento.personaId = id;

      if (bibliotecaCerrada) {
        personasCerrada++;
        filaEvento.evento = 'LLEGADA_CERRADA';
        filaEvento.destino = 'RECHAZADA';
      } else {
        personasEnBiblioteca++;
        if (personasEnBiblioteca > maxPersonasSimultaneas) maxPersonasSimultaneas = personasEnBiblioteca;
        if (personasEnBiblioteca >= P.capacidadMax) {
          bibliotecaCerrada = true;
          veces20personas++;
        }

        const tipRes = tipoLlegada();
        const tipo = tipRes.tipo;
        filaEvento.tipoPersona = tipo;
        filaEvento.rndTipo = parseFloat(tipRes.rnd.toFixed(6));

        const persona = {
          id,
          tipo,
          llegada: reloj,
          finAtencion: null,
          empleadoId: null,
          destino: null,
          tablaRK: null,
          esDevolucionPostLectura: false,
        };

        const emp = empladoLibre();
        if (emp) {
          iniciarAtencion(emp, persona);
          filaEvento.empleadoAsignado = emp.id;
          filaEvento.rndDuracion = persona.rndDur;
          filaEvento.duracionAtencion = parseFloat((persona.finAtencion - reloj).toFixed(2));
          filaEvento.tablaRK = persona.tablaRK;
          filaEvento.meticulosidad = persona.meticulosidad ? parseFloat(persona.meticulosidad.toFixed(2)) : null;
          filaEvento.rndMeticulosidad = persona.rndMet;
        } else {
          cola.push(persona);
          personasQueFueronACola++;
        }

        personasEnSistema.push(persona);
      }

    } else if (evento.tipo === 'FIN_ATENCION') {
      const personaIdx = personasEnSistema.findIndex(p => p.id === evento.personaId);
      if (personaIdx === -1) {
        filas.push(filaEvento);
        continue;
      }
      const persona = personasEnSistema[personaIdx];

      if (persona.esDevolucionPostLectura) {
        // Segunda atención (devuelve después de leer)
        procesarFinAtencionDevolucionPostLectura(persona);
        personasEnSistema.splice(personaIdx, 1);

        if (personasEnBiblioteca < P.capacidadMax && bibliotecaCerrada) {
          bibliotecaCerrada = false;
        }
      } else {
        procesarFinAtencion(persona);

        if (persona.destino !== 'QUEDA_LEER') {
          personasEnSistema.splice(personaIdx, 1);
        }
        // Si se queda a leer, sigue en personasEnSistema y en lectores
        // actualizar destino en filaEvento
        filaEvento.destino = persona.destino;
        filaEvento.rndDestino = persona.rndDestino;
        if (persona.destino === 'QUEDA_LEER') {
          filaEvento.rndLectura = persona.rndLectura;
          filaEvento.tiempoLectura = parseFloat(persona.tiempoLectura.toFixed(2));
        }

        if (personasEnBiblioteca < P.capacidadMax && bibliotecaCerrada) {
          bibliotecaCerrada = false;
        }
      }

      // Atender siguiente en cola
      if (cola.length > 0) {
        const siguiente = cola.shift();
        const relojActual = reloj;
        const empLibre = empleados.find(e => e.atendiendo === null && e.libreEn <= relojActual);
        if (empLibre) {
          iniciarAtencion(empLibre, siguiente);
          filaEvento.empleadoAsignado = empLibre.id;
        }
      }

    } else if (evento.tipo === 'FIN_LECTURA') {
      const lector = lectores.find(l => l.id === evento.personaId);
      if (lector) {
        procesarFinLectura(lector);
        filaEvento.evento = 'FIN_LECTURA';
      }
    }

    // Actualizar estado para la fila
    filaEvento.largoColaMostrador = cola.length;
    filaEvento.personasEnBiblioteca = personasEnBiblioteca;
    filaEvento.bibliotecaCerrada = bibliotecaCerrada;
    filaEvento.lectoresEnSala = lectores.length;
    filaEvento.empleado1LibreEn = parseFloat(empleados[0].libreEn.toFixed(2));
    filaEvento.empleado1Atendiendo = empleados[0].atendiendo;
    filaEvento.empleado2LibreEn = parseFloat(empleados[1].libreEn.toFixed(2));
    filaEvento.empleado2Atendiendo = empleados[1].atendiendo;
    filaEvento.personasFinalizadas = personasFinalizadas;
    filaEvento.sumaTiemposPermanencia = parseFloat(sumaTiemposPermanencia.toFixed(2));
    filaEvento.personasCerrada = personasCerrada;
    filaEvento.totalPidieronLibro = totalPidieronLibro;
    filaEvento.totalDevolvieron = totalDevolvieron;
    filaEvento.totalConsultas = totalConsultas;
    filaEvento.totalSeQuedaronALeer = totalSeQuedaronALeer;
    filaEvento.totalSeRetiraron = totalSeRetiraron;
    filaEvento.tiempoTotalCola = parseFloat(tiempoTotalCola.toFixed(2));
    filaEvento.personasQueFueronACola = personasQueFueronACola;
    filaEvento.personasPresentes = personasEnSistema.map(p => ({
      id: p.id,
      tipo: p.tipo,
      llegada: parseFloat(p.llegada.toFixed(2)),
      finAtencion: p.finAtencion ? parseFloat(p.finAtencion.toFixed(2)) : null,
      empleadoId: p.empleadoId || null,
      destino: p.destino || null,
    }));
    filaEvento.lectoresPresentes = lectores.map(l => ({
      id: l.id,
      salidaLectura: parseFloat(l.salidaLectura.toFixed(2)),
    }));

    filas.push(filaEvento);
  }

  // ─── Métricas finales ─────────────────────────────────────────────────
  const metricas = {
    totalPersonas,
    personasFinalizadas,
    promedioPermanencia: personasFinalizadas > 0
      ? parseFloat((sumaTiemposPermanencia / personasFinalizadas).toFixed(2))
      : 0,
    pctCerrada: totalPersonas > 0
      ? parseFloat(((personasCerrada / totalPersonas) * 100).toFixed(2))
      : 0,
    totalPidieronLibro,
    totalDevolvieron,
    totalConsultas,
    totalSeQuedaronALeer,
    totalSeRetiraron,
    personasCerrada,
    // Estadísticas adicionales propias:
    promedioEsperaCola: personasQueFueronACola > 0
      ? parseFloat((tiempoTotalCola / personasQueFueronACola).toFixed(2))
      : 0,
    pctFueronACola: totalPersonas > 0
      ? parseFloat(((personasQueFueronACola / totalPersonas) * 100).toFixed(2))
      : 0,
    pctSeQuedaLeer: totalPidieronLibro > 0
      ? parseFloat(((totalSeQuedaronALeer / totalPidieronLibro) * 100).toFixed(2))
      : 0,
    veces20personas,
    maxPersonasSimultaneas,
    relacionPrestamosVsConsultas: totalConsultas > 0
      ? parseFloat((totalPidieronLibro / totalConsultas).toFixed(2))
      : 0,
    relacionDevolucionesVsPrestamos: totalPidieronLibro > 0
      ? parseFloat((totalDevolvieron / totalPidieronLibro).toFixed(2))
      : 0,
  };

  return {
    filas,
    metricas,
    iteracionesRealizadas: iteracion,
    relojFinal: reloj,
  };
}
