import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { ejecutarSimulacion, DEFAULT_PARAMS } from "./simulation/motor.js";
import { exportarSimulacionExcel } from "./simulation/exportExcel.js";
import "./App.css";

// ─── Componentes de UI ──────────────────────────────────────────────────────

function ParamInput({
  label,
  name,
  value,
  onChange,
  min,
  max,
  step = "any",
  unit = "",
}) {
  return (
    <div className="param-row">
      <label className="param-label">
        {label}
        {unit && <span className="param-unit">{unit}</span>}
      </label>
      <input
        type="number"
        className="param-input"
        name={name}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
      />
    </div>
  );
}

function Badge({ tipo, sufijo = '' }) {
  const map = {
    INICIO: { label: 'Inicialización', cls: 'badge-gray' },
    PIDE_LIBRO:      { label: 'Pide libro',          cls: 'badge-blue'   },
    DEVUELVE:        { label: 'Devuelve',             cls: 'badge-green'  },
    CONSULTA:        { label: 'Consulta',             cls: 'badge-yellow' },
    LLEGADA:         { label: 'Llegada',              cls: 'badge-teal'   },
    LLEGADA_CERRADA: { label: 'Llegada (cerrada)',    cls: 'badge-red'    },
    FIN_ATENCION:    { label: 'Fin atención',         cls: 'badge-purple' },
    FIN_LECTURA:     { label: 'Fin lectura',          cls: 'badge-orange' },
  };
  const info = map[tipo] || { label: tipo, cls: 'badge-gray' };
  return <span className={`badge ${info.cls}`}>{info.label}{sufijo}</span>;
}

function RKTable({ tabla }) {
  if (!tabla || tabla.length === 0) return <span className="no-rk">—</span>;
  return (
    <details className="rk-details">
      <summary>Ver RK ({tabla.length} pasos)</summary>
      <div className="rk-scroll">
        <table className="rk-table">
          <thead>
            <tr>
              <th>t</th>
              <th>M(t)</th>
              <th>k1</th>
              <th>k2</th>
              <th>k3</th>
              <th>k4</th>
              <th>ΔM</th>
            </tr>
          </thead>
          <tbody>
            {tabla.map((row, i) => (
              <tr key={i}>
                <td>{row.t}</td>
                <td>{row.M.toFixed(2)}</td>
                <td>{row.k1.toFixed(2)}</td>
                <td>{row.k2.toFixed(2)}</td>
                <td>{row.k3.toFixed(2)}</td>
                <td>{row.k4.toFixed(2)}</td>
                <td>{row.dM.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function PersonasPresentes({ personas, lectores }) {
  if (
    (!personas || personas.length === 0) &&
    (!lectores || lectores.length === 0)
  ) {
    return <span className="text-muted">—</span>;
  }
  return (
    <div className="personas-presentes">
      {personas &&
        personas.map((p) => (
          <div key={p.id} className="persona-chip">
            <span className="chip-id">P{p.id}</span>
            <span className="chip-tipo">{p.tipo?.replace("_", " ")}</span>
            {p.destino && <span className="chip-dest">{p.destino}</span>}
          </div>
        ))}
      {lectores &&
        lectores.map((l) => (
          <div key={`l${l.id}`} className="persona-chip chip-lectura">
            <span className="chip-id">P{l.id}</span>
            <span className="chip-tipo">LEYENDO</span>
            <span className="chip-dest">sale@{l.salidaLectura}</span>
          </div>
        ))}
    </div>
  );
}

const COLS = [
  { key: "iteracion", label: "Iteración", width: 60 },
  { key: "reloj", label: "Reloj (min)", width: 75 },
  {
    key: 'evento', label: 'Evento', width: 150,
    render: (v, row) => {
      const id = row.eventoPersonaId || row.personaId;
      const sufijo = id ? ` C${id}` : '';
      return <Badge tipo={v} sufijo={sufijo} />;
    }
  },
  {
    key: "rndTipo",
    label: "RND act",
    width: 90,
    render: (v) => (v != null ? v.toFixed(2) : "—"),
  },
  {
    key: "tipoPersona",
    label: "Actividad",
    width: 100,
    render: (v) => (v ? <Badge tipo={v} /> : "—"),
  },
  {
    key: "rndLlegada",
    label: "RND llegada",
    width: 85,
    render: (v) => (v != null ? v.toFixed(2) : "—"),
  },
  {
    key: "proxLlegada",
    label: "Próxima llegada",
    width: 95,
    render: (v) => (v != null ? v.toFixed(2) : "—"),
  },
  {
    key: "rndMeticulosidad",
    label: "RND M",
    width: 100,
    render: (v) => (v != null ? v.toFixed(2) : "—"),
  },
  {
    key: "meticulosidad",
    label: "Meticulosidad (M₀)",
    width: 120,
    render: (v) => (v != null ? v.toFixed(2) : "—"),
  },
  {
    key: "tablaRK",
    label: "Runge-Kutta",
    width: 130,
    render: (v) => <RKTable tabla={v} />,
  },
  {
    key: "rndDuracion",
    label: "RND duración atención",
    width: 110,
    render: (v) => (v != null ? v.toFixed(2) : "—"),
  },
  {
    key: "duracionAtencion",
    label: "Duración atención (min)",
    width: 110,
    render: (v) => (v != null ? v.toFixed(2) : "—"),
  },
  {
    key: "empleadoAsignado",
    label: "Empleado asignado",
    width: 100,
    render: (v) => (v ? `Empleado ${v}` : "—"),
  },
  {
    key: "rndDestino",
    label: "RND destino",
    width: 85,
    render: (v) => (v != null ? v.toFixed(2) : "—"),
  },
  { key: "destino", label: "Destino persona", width: 130 },
  {
    key: "rndLectura",
    label: "RND tiempo lectura",
    width: 100,
    render: (v) => (v != null ? v.toFixed(2) : "—"),
  },
  {
    key: "tiempoLectura",
    label: "Tiempo lectura (min)",
    width: 100,
    render: (v) => (v != null ? v.toFixed(2) : "—"),
  },
  { key: "largoColaMostrador", label: "Cola mostrador", width: 100 },
  {
    key: "empleado1Atendiendo",
    label: "Empleado 1",
    width: 95,
    render: (v) =>
      v ? (
        <span className="badge badge-purple">Ocupado</span>
      ) : (
        <span className="badge badge-green">Libre</span>
      ),
  },
  {
    key: "empleado1LibreEn",
    label: "Empleado 1 libre en (min)",
    width: 115,
    render: (v) => (v != null ? v.toFixed(2) : "—"),
  },
  {
    key: "empleado2Atendiendo",
    label: "Empleado 2",
    width: 95,
    render: (v) =>
      v ? (
        <span className="badge badge-purple">Ocupado</span>
      ) : (
        <span className="badge badge-green">Libre</span>
      ),
  },
  {
    key: "empleado2LibreEn",
    label: "Empleado 2 libre en (min)",
    width: 115,
    render: (v) => (v != null ? v.toFixed(2) : "—"),
  },
  { key: "personasEnBiblioteca", label: "Personas en biblioteca", width: 110 },
  {
    key: "bibliotecaCerrada",
    label: "Biblioteca cerrada",
    width: 90,
    render: (v) =>
      v ? (
        <span className="badge badge-red">SÍ</span>
      ) : (
        <span className="badge badge-green">NO</span>
      ),
  },
  { key: "lectoresEnSala", label: "Lectores en sala", width: 85 },
  {
    key: "personasFinalizadas",
    label: "Personas finalizadas (acum.)",
    width: 120,
  },
  { key: "personasCerrada", label: "Personas rechazadas (acum.)", width: 125 },
  {
    key: "tiempoOcupadoEmpleado1Acum",
    label: "Tiempo ocupado Empleado 1 (acum. min)",
    width: 155,
    render: (v) => (v != null ? v.toFixed(2) : "—"),
  },
  {
    key: "tiempoOcupadoEmpleado2Acum",
    label: "Tiempo ocupado Empleado 2 (acum. min)",
    width: 155,
    render: (v) => (v != null ? v.toFixed(2) : "—"),
  },
  {
    key: "sumaTiemposEnColaAcum",
    label: "Suma tiempos en cola (acum.)",
    width: 140,
    render: (v) => (v != null ? v.toFixed(2) : "—"),
  },
  {
    key: "tiempoMaxEsperaEnCola",
    label: "Tiempo máx. espera en cola (min)",
    width: 145,
    render: (v) => (v != null ? v.toFixed(2) : "—"),
  },
  {
    key: "tiempoMinPermanenciaEnBiblioteca",
    label: "Tiempo mín. permanencia en biblioteca (min)",
    width: 175,
    render: (v) => (v != null ? v.toFixed(2) : "—"),
  },
  {
    key: "personasPresentes",
    label: "Objetos presentes en el sistema",
    width: 320,
    render: (v, row) => (
      <PersonasPresentes personas={v} lectores={row.lectoresPresentes} />
    ),
  },
];

function VectorEstado({ filas, desde, cantidad, ultimaFila }) {
  const filasVista = useMemo(() => {
    const slice = filas.slice(desde, desde + cantidad);
    if (ultimaFila && filas.length > 0) {
      const uf = filas[filas.length - 1];
      if (!slice.find((f) => f.iteracion === uf.iteracion)) {
        return [...slice, { ...uf, esUltima: true }];
      }
      return slice.map((f) =>
        f.iteracion === uf.iteracion ? { ...f, esUltima: true } : f,
      );
    }
    return slice;
  }, [filas, desde, cantidad, ultimaFila]);

  if (filasVista.length === 0)
    return <p className="text-muted">No hay filas para mostrar.</p>;

  return (
    <div className="table-scroll">
      <table className="vector-table">
        <thead>
          <tr>
            {COLS.map((c) => (
              <th key={c.key} style={{ minWidth: c.width }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filasVista.map((row, i) => (
            <tr
              key={i}
              className={
                row.esUltima
                  ? "fila-ultima"
                  : row.bibliotecaCerrada
                    ? "fila-cerrada"
                    : ""
              }
            >
              {COLS.map((c) => (
                <td key={c.key} style={{ minWidth: c.width }}>
                  {c.render
                    ? c.render(row[c.key], row)
                    : row[c.key] != null
                      ? String(row[c.key])
                      : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Presentación / Onboarding ──────────────────────────────────────────────

// Revela su contenido con una animación cuando entra en el viewport al hacer scroll.
function Reveal({ children, dir = "up", className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal reveal-${dir} ${visible ? "is-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

function Presentacion({ onComenzar }) {
  return (
    <div className="presentacion">
      {/* Hero */}
      <section className="pres-hero">
        <div className="pres-hero-badge">UTN FRC · Simulación 2026 · 4K2 · Grupo 6</div>
        <h1 className="pres-hero-title">
          📚 Simulación de una <span className="pres-accent">Biblioteca pública</span>
        </h1>
        <p className="pres-hero-sub">
          Modelo de <strong>simulación de eventos discretos</strong> del mostrador de
          atención de una biblioteca: dos empleados, una cola de espera, una sala de
          lectura y control de aforo. Antes de meternos en el simulador, pongamos en
          contexto el caso que nos tocó.
        </p>
        <button className="pres-cta" onClick={onComenzar}>
          Ir a la simulación →
        </button>
      </section>

      {/* El caso */}
      <section className="pres-section">
        <Reveal dir="up">
          <h2 className="pres-section-title">🏛️ El caso: la Biblioteca</h2>
          <p className="pres-section-lead">
            Conozcamos el caso de a poco, parte por parte, antes de simularlo.
          </p>
        </Reveal>
        <div className="pres-caso">
          <Reveal dir="left">
            <article className="caso-step">
              <div className="caso-num">01</div>
              <div className="caso-body">
                <h3>Las personas llegan al mostrador</h3>
                <p>
                  A la biblioteca llegan personas <strong>cada 4 minutos</strong> en
                  promedio. En el mostrador hay <strong>dos empleados</strong> que
                  atienden indistintamente, tomando a la siguiente persona de una{" "}
                  <strong>única cola FIFO</strong>.
                </p>
              </div>
            </article>
          </Reveal>
          <Reveal dir="right">
            <article className="caso-step">
              <div className="caso-num">02</div>
              <div className="caso-body">
                <h3>Llegan por tres motivos</h3>
                <p>
                  <span className="badge badge-blue">Pide libro</span> 45% &nbsp;·&nbsp;
                  <span className="badge badge-green">Devuelve</span> 45% &nbsp;·&nbsp;
                  <span className="badge badge-yellow">Consulta socio</span> 10%. El tipo
                  de cada persona se decide con un número aleatorio.
                </p>
              </div>
            </article>
          </Reveal>
          <Reveal dir="left">
            <article className="caso-step">
              <div className="caso-num">03</div>
              <div className="caso-body">
                <h3>Quien pide un libro, decide</h3>
                <p>
                  El <strong>60% se lo lleva y se retira</strong>; el{" "}
                  <strong>40% se queda leyendo</strong> en la sala (~30 min) y después
                  vuelve a hacer cola para devolverlo antes de irse.
                </p>
              </div>
            </article>
          </Reveal>
          <Reveal dir="right">
            <article className="caso-step">
              <div className="caso-num">04</div>
              <div className="caso-body">
                <h3>Políticas de la biblioteca</h3>
                <p>
                  Se presta <strong>un solo libro por persona</strong>. Y cuando hay{" "}
                  <strong>20 personas adentro</strong> la biblioteca{" "}
                  <strong>cierra</strong>: las llegadas se rechazan hasta que la ocupación
                  vuelve a bajar.
                </p>
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      {/* Reglas y variables */}
      <section className="pres-section">
        <h2 className="pres-section-title">🎲 Reglas y variables aleatorias</h2>
        <p className="pres-section-lead">
          Cada demora del sistema se modela con una distribución de probabilidad. La
          consulta de socio es especial: su duración surge de integrar una ecuación
          diferencial con <strong>Runge-Kutta 4</strong>.
        </p>
        <table className="pres-table">
          <thead>
            <tr>
              <th>Variable</th>
              <th>Modelo / Distribución</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Tiempo entre llegadas</td>
              <td>Exponencial negativa, media <strong>4 min</strong></td>
            </tr>
            <tr>
              <td>Tipo de persona</td>
              <td>Discreta: 45% pide · 45% devuelve · 10% consulta</td>
            </tr>
            <tr>
              <td>Atención de préstamo</td>
              <td>Exponencial negativa, media <strong>6 min</strong></td>
            </tr>
            <tr>
              <td>Atención de devolución</td>
              <td>Uniforme <strong>[1,5 ; 2,5] min</strong> (2 ± 0,5)</td>
            </tr>
            <tr>
              <td>Consulta de socio</td>
              <td>
                Runge-Kutta 4 de <code>dM/dt = 0,6·t + 0,7·M(t)</code>, con M(0)=0 y
                h=0,1; termina cuando M(t) supera el umbral de meticulosidad U[2 ; 36]
              </td>
            </tr>
            <tr>
              <td>Tiempo de lectura en sala</td>
              <td>Exponencial negativa, media <strong>30 min</strong></td>
            </tr>
            <tr>
              <td>Decisión tras pedir libro</td>
              <td>Discreta: 60% se retira · 40% se queda a leer</td>
            </tr>
            <tr>
              <td>Capacidad / cierre</td>
              <td>Cierra al llegar a <strong>20 personas</strong>; reabre al bajar de 20</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Objetivos y métricas */}
      <section className="pres-section">
        <h2 className="pres-section-title">🎯 Objetivos y métricas</h2>
        <p className="pres-section-lead">
          El objetivo es estudiar el comportamiento del sistema corriendo la simulación
          y midiendo cómo se comporta el mostrador, la cola y el aforo.
        </p>
        <div className="pres-grid">
          <div className="pres-card">
            <h3>Obligatorias (del enunciado)</h3>
            <ul className="pres-list">
              <li>Promedio de permanencia de las personas en la biblioteca.</li>
              <li>% de personas que llegan y la encuentran cerrada por aforo completo.</li>
            </ul>
          </div>
          <div className="pres-card">
            <h3>Propuestas por el Grupo 6</h3>
            <ul className="pres-list">
              <li>% de ocupación del Empleado 1.</li>
              <li>Cantidad promedio de personas en cola.</li>
              <li>Tiempo máximo de espera en cola.</li>
              <li>Tiempo mínimo de permanencia en la biblioteca.</li>
              <li>Cantidad de personas que se quedaron a leer.</li>
              <li>% de tiempo ocioso del Empleado 2.</li>
            </ul>
          </div>
        </div>
        <div className="pres-footer-cta">
          <p>Listo. Ahora sí, entremos al simulador y veamos el vector de estado paso a paso.</p>
          <button className="pres-cta" onClick={onComenzar}>
            Comenzar simulación →
          </button>
        </div>
      </section>
    </div>
  );
}

// ─── App principal ──────────────────────────────────────────────────────────

export default function App() {
  const [params, setParams] = useState({ ...DEFAULT_PARAMS });
  const [resultado, setResultado] = useState(null);
  const [corriendo, setCorriendo] = useState(false);
  const [desde, setDesde] = useState(0);
  const [cantidad, setCantidad] = useState(50);
  const [tab, setTab] = useState("vector");
  const [vista, setVista] = useState("presentacion");

  const handleParam = useCallback((e) => {
    const { name, value } = e.target;
    setParams((prev) => ({ ...prev, [name]: parseFloat(value) }));
  }, []);

  const handleCorrer = useCallback(() => {
    setCorriendo(true);
    setResultado(null);
    setTimeout(() => {
      try {
        const res = ejecutarSimulacion(params);
        setResultado(res);
        setDesde(0);
      } catch (err) {
        alert("Error en simulación: " + err.message);
      } finally {
        setCorriendo(false);
      }
    }, 50);
  }, [params]);

  const {
    filas = [],
    metricas = {},
    iteracionesRealizadas = 0,
    relojFinal = 0,
  } = resultado || {};

  if (vista === "presentacion") {
    return <Presentacion onComenzar={() => setVista("simulador")} />;
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-logo">
            <div className="logo-mark">📚</div>
            <div>
              <h1 className="header-title">Simulación · Biblioteca</h1>
              <p className="header-sub">UTN FRC · Simulación 2026 · Grupo 6</p>
            </div>
          </div>
          <button
            className="header-back"
            onClick={() => setVista("presentacion")}
          >
            ← Presentación
          </button>
        </div>
      </header>

      <main className="app-main">
        {/* Panel de parámetros */}
        <section className="panel panel-params">
          <h2 className="panel-title">⚙️ Parámetros</h2>
          <div className="params-grid">
            <div className="params-group">
              <h3>Llegadas</h3>
              <ParamInput
                label="Media entre llegadas"
                name="mediaLlegada"
                value={params.mediaLlegada}
                onChange={handleParam}
                min={0.1}
                unit=" min"
              />
              <ParamInput
                label="% Pide libro"
                name="pctPideLibro"
                value={params.pctPideLibro}
                onChange={handleParam}
                min={0}
                max={1}
                step={0.01}
              />
              <ParamInput
                label="% Devuelve"
                name="pctDevuelve"
                value={params.pctDevuelve}
                onChange={handleParam}
                min={0}
                max={1}
                step={0.01}
              />
            </div>
            <div className="params-group">
              <h3>Tiempos de atención</h3>
              <ParamInput
                label="Media préstamo (exp neg)"
                name="mediaPrestamo"
                value={params.mediaPrestamo}
                onChange={handleParam}
                min={0.1}
                unit=" min"
              />
              <ParamInput
                label="Devolución mín"
                name="devolucionMin"
                value={params.devolucionMin}
                onChange={handleParam}
                min={0}
                unit=" min"
              />
              <ParamInput
                label="Devolución máx"
                name="devolucionMax"
                value={params.devolucionMax}
                onChange={handleParam}
                min={0}
                unit=" min"
              />
              <ParamInput
                label="Media lectura instalaciones"
                name="mediaLecturaInstalaciones"
                value={params.mediaLecturaInstalaciones}
                onChange={handleParam}
                min={1}
                unit=" min"
              />
            </div>
            <div className="params-group">
              <h3>Consulta / Runge-Kutta</h3>
              <ParamInput
                label="M mín (U[a,b])"
                name="meticulosidadMin"
                value={params.meticulosidadMin}
                onChange={handleParam}
                min={0}
              />
              <ParamInput
                label="M máx (U[a,b])"
                name="meticulosidadMax"
                value={params.meticulosidadMax}
                onChange={handleParam}
                min={0}
              />
              <ParamInput
                label="Paso h (RK4)"
                name="hRK"
                value={params.hRK}
                onChange={handleParam}
                min={0.01}
                max={1}
                step={0.01}
              />
            </div>
            <div className="params-group">
              <h3>Política de la biblioteca</h3>
              <ParamInput
                label="% Se retira con libro"
                name="pctSeRetira"
                value={params.pctSeRetira}
                onChange={handleParam}
                min={0}
                max={1}
                step={0.01}
              />
              <ParamInput
                label="Capacidad máx"
                name="capacidadMax"
                value={params.capacidadMax}
                onChange={handleParam}
                min={1}
                max={1000}
                step={1}
              />
            </div>
            <div className="params-group">
              <h3>Límites de simulación</h3>
              <ParamInput
                label="Máx. iteraciones"
                name="maxIteraciones"
                value={params.maxIteraciones}
                onChange={handleParam}
                min={1}
                max={100000}
                step={1}
              />
              <ParamInput
                label="Tiempo máx"
                name="tiempoMaximo"
                value={params.tiempoMaximo}
                onChange={handleParam}
                min={1}
                unit=" min"
              />
            </div>
          </div>
          <div className="params-actions">
            <button
              className="btn-run"
              onClick={handleCorrer}
              disabled={corriendo}
            >
              {corriendo ? "⏳ Simulando..." : "▶ Ejecutar Simulación"}
            </button>
          </div>
        </section>

        {resultado && (
          <>
            {/* Resumen rápido */}
            <section className="panel panel-summary">
              <div className="summary-head">
                <h2 className="panel-title">📊 Resultado General</h2>
                <button
                  className="btn-excel"
                  onClick={() => exportarSimulacionExcel(resultado, params)}
                  title="Descargar el vector de estado, las métricas y los parámetros en Excel"
                >
                  ⬇ Descargar Excel
                </button>
              </div>
              <div className="summary-row">
                <span>
                  Iteraciones realizadas:{" "}
                  <strong>{iteracionesRealizadas.toLocaleString()}</strong>
                </span>
                <span>
                  Tiempo simulado: <strong>{relojFinal.toFixed(2)} min</strong>
                </span>
                <span>
                  Personas atendidas:{" "}
                  <strong>{metricas.personasFinalizadas}</strong>
                </span>
                <span>
                  Personas rechazadas por capacidad:{" "}
                  <strong>{metricas.personasCerrada}</strong>
                </span>
                <span>
                  Total personas que llegaron:{" "}
                  <strong>{metricas.totalPersonas}</strong>
                </span>
              </div>
            </section>

            {/* Métricas */}
            <section className="panel panel-metricas">
              <h2 className="panel-title">📈 Estadísticas</h2>

              <div className="metricas-detalle">
                <div className="detalle-col">
                  <h3>Obligatorias</h3>
                  <table className="detalle-table">
                    <tbody>
                      <tr>
                        <td>Promedio de permanencia en la biblioteca</td>
                        <td>
                          <strong>{metricas.promedioPermanencia} min</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>% de personas que llegan con biblioteca cerrada</td>
                        <td>
                          <strong>
                            {metricas.porcentajePersonasConBibliotecaCerrada}%
                          </strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="metricas-detalle" style={{ marginTop: "1rem" }}>
                <div className="detalle-col">
                  <h3>Adicionales propuestas por el grupo</h3>
                  <table className="detalle-table">
                    <tbody>
                      <tr>
                        <td>1) Porcentaje de ocupación del Empleado 1</td>
                        <td>
                          <strong>
                            {metricas.porcentajeOcupacionEmpleado1}%
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <td>2) Cantidad promedio de clientes en cola</td>
                        <td>
                          <strong>
                            {metricas.cantidadPromedioClientesEnCola} personas
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <td>3) Tiempo máximo de permanencia en cola</td>
                        <td>
                          <strong>
                            {metricas.tiempoMaximoPermanenciaEnCola} min
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          4) Tiempo mínimo de permanencia en la biblioteca
                        </td>
                        <td>
                          <strong>
                            {metricas.tiempoMinimoPermanenciaEnBiblioteca} min
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <td>5) Cantidad de personas que se quedan a leer</td>
                        <td>
                          <strong>
                            {metricas.cantidadPersonasQueSeQuedaronALeer}{" "}
                            personas
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <td>6) Porcentaje de tiempo de ocio del Empleado 2</td>
                        <td>
                          <strong>
                            {metricas.porcentajeTiempoOcioEmpleado2}%
                          </strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="metricas-detalle" style={{ marginTop: "1rem" }}>
                <div className="detalle-col">
                  <h3>Totales por tipo de visita</h3>
                  <table className="detalle-table">
                    <tbody>
                      <tr>
                        <td>📖 Pidieron libro prestado</td>
                        <td>
                          <strong>{metricas.totalPidieronLibro}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>↩️ Devolvieron libro</td>
                        <td>
                          <strong>{metricas.totalDevolvieron}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>❓ Consultaron condiciones de socio</td>
                        <td>
                          <strong>{metricas.totalConsultas}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>🚶 Se retiraron con el libro</td>
                        <td>
                          <strong>{metricas.totalSeRetiraron}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td>🪑 Se quedaron a leer en instalaciones</td>
                        <td>
                          <strong>
                            {metricas.cantidadPersonasQueSeQuedaronALeer}
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <td>❌ Rechazadas por capacidad completa</td>
                        <td>
                          <strong>{metricas.personasCerrada}</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Tabs */}
            <section className="panel panel-vector">
              <div className="tabs">
                <button
                  className={`tab ${tab === "vector" ? "tab-active" : ""}`}
                  onClick={() => setTab("vector")}
                >
                  📋 Vector de Estado
                </button>
              </div>

              {tab === "vector" && (
                <>
                  <div className="vector-controls">
                    <label>
                      Desde iteración (j):
                      <input
                        type="number"
                        value={desde}
                        min={0}
                        max={filas.length}
                        onChange={(e) =>
                          setDesde(Math.max(0, parseInt(e.target.value) || 0))
                        }
                      />
                    </label>
                    <label>
                      Cantidad (i):
                      <input
                        type="number"
                        value={cantidad}
                        min={1}
                        max={500}
                        onChange={(e) =>
                          setCantidad(
                            Math.max(0, parseInt(e.target.value) || 1),
                          )
                        }
                      />
                    </label>
                    <span className="vector-info">
                      Mostrando {Math.min(cantidad, filas.length - desde + 1)}{" "}
                      de {filas.length} filas + última fila
                    </span>
                  </div>
                  <VectorEstado
                    filas={filas}
                    desde={desde}
                    cantidad={cantidad}
                    ultimaFila={true}
                  />
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
