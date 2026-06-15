import React, { useState, useCallback, useMemo } from 'react';
import { ejecutarSimulacion, DEFAULT_PARAMS } from './simulation/motor.js';
import './App.css';

// ─── Componentes de UI ──────────────────────────────────────────────────────

function ParamInput({ label, name, value, onChange, min, max, step = 'any', unit = '' }) {
  return (
    <div className="param-row">
      <label className="param-label">{label}{unit && <span className="param-unit">{unit}</span>}</label>
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

function Badge({ tipo }) {
  const map = {
    PIDE_LIBRO: { label: 'Pide libro', cls: 'badge-blue' },
    DEVUELVE: { label: 'Devuelve', cls: 'badge-green' },
    CONSULTA: { label: 'Consulta', cls: 'badge-yellow' },
    LLEGADA: { label: 'Llegada', cls: 'badge-teal' },
    LLEGADA_CERRADA: { label: 'Llegada (cerrada)', cls: 'badge-red' },
    FIN_ATENCION: { label: 'Fin atención', cls: 'badge-purple' },
    FIN_LECTURA: { label: 'Fin lectura', cls: 'badge-orange' },
  };
  const info = map[tipo] || { label: tipo, cls: 'badge-gray' };
  return <span className={`badge ${info.cls}`}>{info.label}</span>;
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
              <th>t</th><th>M(t)</th><th>k1</th><th>k2</th><th>k3</th><th>k4</th><th>ΔM</th>
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
  if ((!personas || personas.length === 0) && (!lectores || lectores.length === 0)) {
    return <span className="text-muted">—</span>;
  }
  return (
    <div className="personas-presentes">
      {personas && personas.map(p => (
        <div key={p.id} className="persona-chip">
          <span className="chip-id">P{p.id}</span>
          <span className="chip-tipo">{p.tipo?.replace('_', ' ')}</span>
          {p.destino && <span className="chip-dest">{p.destino}</span>}
        </div>
      ))}
      {lectores && lectores.map(l => (
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
  { key: 'iteracion', label: 'It.', width: 50 },
  { key: 'reloj', label: 'Reloj', width: 65 },
  { key: 'evento', label: 'Evento', width: 130, render: (v) => <Badge tipo={v} /> },
  { key: 'personaId', label: 'ID', width: 45, render: v => v ? `P${v}` : '—' },
  { key: 'tipoPersona', label: 'Tipo', width: 90, render: (v) => v ? <Badge tipo={v} /> : '—' },
  { key: 'rndTipo', label: 'RND tipo', width: 75, render: v => v != null ? v.toFixed(2) : '—' },
  { key: 'rndLlegada', label: 'RND lleg.', width: 75, render: v => v != null ? v.toFixed(2) : '—' },
  { key: 'proxLlegada', label: 'Próx. lleg.', width: 80, render: v => v != null ? v.toFixed(2) : '—' },
  { key: 'meticulosidad', label: 'M₀', width: 60, render: v => v != null ? v.toFixed(2) : '—' },
  { key: 'rndMeticulosidad', label: 'RND M₀', width: 75, render: v => v != null ? v.toFixed(2) : '—' },
  { key: 'tablaRK', label: 'Runge-Kutta', width: 120, render: (v) => <RKTable tabla={v} /> },
  { key: 'duracionAtencion', label: 'Dur. atenc.', width: 80, render: v => v != null ? v.toFixed(2) : '—' },
  { key: 'rndDuracion', label: 'RND dur.', width: 75, render: v => v != null ? v.toFixed(2) : '—' },
  { key: 'empleadoAsignado', label: 'Empleado', width: 75, render: v => v ? `Emp. ${v}` : '—' },
  { key: 'destino', label: 'Destino', width: 110 },
  { key: 'rndDestino', label: 'RND dest.', width: 75, render: v => v != null ? v.toFixed(2) : '—' },
  { key: 'rndLectura', label: 'RND lect.', width: 75, render: v => v != null ? v.toFixed(2) : '—' },
  { key: 'tiempoLectura', label: 'T. lect.', width: 70, render: v => v != null ? v.toFixed(2) : '—' },
  { key: 'largoColaMostrador', label: 'Cola', width: 50 },
  { key: 'empleado1Atendiendo', label: 'Emp1 ate.', width: 75, render: v => v ? `P${v}` : 'Libre' },
  { key: 'empleado1LibreEn', label: 'Emp1 libr@', width: 80, render: v => v != null ? v.toFixed(2) : '—' },
  { key: 'empleado2Atendiendo', label: 'Emp2 ate.', width: 75, render: v => v ? `P${v}` : 'Libre' },
  { key: 'empleado2LibreEn', label: 'Emp2 libr@', width: 80, render: v => v != null ? v.toFixed(2) : '—' },
  { key: 'personasEnBiblioteca', label: 'En bib.', width: 60 },
  { key: 'bibliotecaCerrada', label: 'Cerrada', width: 65, render: v => v ? <span className="badge badge-red">SÍ</span> : <span className="badge badge-green">NO</span> },
  { key: 'lectoresEnSala', label: 'Lectores', width: 65 },
  { key: 'personasFinalizadas', label: 'Finaliz.', width: 65 },
  { key: 'personasCerrada', label: 'Rechaz.', width: 65 },
  {
    key: 'personasPresentes', label: 'Objetos presentes', width: 300,
    render: (v, row) => <PersonasPresentes personas={v} lectores={row.lectoresPresentes} />
  },
];

function VectorEstado({ filas, desde, cantidad, ultimaFila }) {
  const filasVista = useMemo(() => {
    const slice = filas.slice(desde - 1, desde - 1 + cantidad);
    if (ultimaFila && filas.length > 0) {
      const uf = filas[filas.length - 1];
      if (!slice.find(f => f.iteracion === uf.iteracion)) {
        return [...slice, { ...uf, esUltima: true }];
      }
      return slice.map(f => f.iteracion === uf.iteracion ? { ...f, esUltima: true } : f);
    }
    return slice;
  }, [filas, desde, cantidad, ultimaFila]);

  if (filasVista.length === 0) return <p className="text-muted">No hay filas para mostrar.</p>;

  return (
    <div className="table-scroll">
      <table className="vector-table">
        <thead>
          <tr>
            {COLS.map(c => (
              <th key={c.key} style={{ minWidth: c.width }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filasVista.map((row, i) => (
            <tr key={i} className={row.esUltima ? 'fila-ultima' : row.bibliotecaCerrada ? 'fila-cerrada' : ''}>
              {COLS.map(c => (
                <td key={c.key} style={{ minWidth: c.width }}>
                  {c.render ? c.render(row[c.key], row) : (row[c.key] != null ? String(row[c.key]) : '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricaCard({ label, value, unit = '', color = '' }) {
  return (
    <div className={`metrica-card ${color}`}>
      <div className="metrica-value">{value}{unit}</div>
      <div className="metrica-label">{label}</div>
    </div>
  );
}

// ─── App principal ──────────────────────────────────────────────────────────

export default function App() {
  const [params, setParams] = useState({ ...DEFAULT_PARAMS });
  const [resultado, setResultado] = useState(null);
  const [corriendo, setCorriendo] = useState(false);
  const [desde, setDesde] = useState(1);
  const [cantidad, setCantidad] = useState(50);
  const [tab, setTab] = useState('vector');

  const handleParam = useCallback((e) => {
    const { name, value } = e.target;
    setParams(prev => ({ ...prev, [name]: parseFloat(value) }));
  }, []);

  const handleCorrer = useCallback(() => {
    setCorriendo(true);
    setResultado(null);
    setTimeout(() => {
      try {
        const res = ejecutarSimulacion(params);
        setResultado(res);
        setDesde(1);
      } catch (err) {
        alert('Error en simulación: ' + err.message);
      } finally {
        setCorriendo(false);
      }
    }, 50);
  }, [params]);

  const { filas = [], metricas = {}, iteracionesRealizadas = 0, relojFinal = 0 } = resultado || {};

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
        </div>
      </header>

      <main className="app-main">
        {/* Panel de parámetros */}
        <section className="panel panel-params">
          <h2 className="panel-title">⚙️ Parámetros</h2>
          <div className="params-grid">
            <div className="params-group">
              <h3>Llegadas</h3>
              <ParamInput label="Media entre llegadas" name="mediaLlegada" value={params.mediaLlegada} onChange={handleParam} min={0.1} unit=" min" />
              <ParamInput label="% Pide libro" name="pctPideLibro" value={params.pctPideLibro} onChange={handleParam} min={0} max={1} step={0.01} />
              <ParamInput label="% Devuelve" name="pctDevuelve" value={params.pctDevuelve} onChange={handleParam} min={0} max={1} step={0.01} />
            </div>
            <div className="params-group">
              <h3>Tiempos de atención</h3>
              <ParamInput label="Media préstamo (exp neg)" name="mediaPrestamo" value={params.mediaPrestamo} onChange={handleParam} min={0.1} unit=" min" />
              <ParamInput label="Devolución mín" name="devolucionMin" value={params.devolucionMin} onChange={handleParam} min={0} unit=" min" />
              <ParamInput label="Devolución máx" name="devolucionMax" value={params.devolucionMax} onChange={handleParam} min={0} unit=" min" />
              <ParamInput label="Media lectura instalaciones" name="mediaLecturaInstalaciones" value={params.mediaLecturaInstalaciones} onChange={handleParam} min={1} unit=" min" />
            </div>
            <div className="params-group">
              <h3>Consulta / Runge-Kutta</h3>
              <ParamInput label="M mín (U[a,b])" name="meticulosidadMin" value={params.meticulosidadMin} onChange={handleParam} min={0} />
              <ParamInput label="M máx (U[a,b])" name="meticulosidadMax" value={params.meticulosidadMax} onChange={handleParam} min={0} />
              <ParamInput label="Paso h (RK4)" name="hRK" value={params.hRK} onChange={handleParam} min={0.01} max={1} step={0.01} />
            </div>
            <div className="params-group">
              <h3>Política de la biblioteca</h3>
              <ParamInput label="% Se retira con libro" name="pctSeRetira" value={params.pctSeRetira} onChange={handleParam} min={0} max={1} step={0.01} />
              <ParamInput label="Capacidad máx" name="capacidadMax" value={params.capacidadMax} onChange={handleParam} min={1} max={1000} step={1} />
            </div>
            <div className="params-group">
              <h3>Límites de simulación</h3>
              <ParamInput label="Máx. iteraciones" name="maxIteraciones" value={params.maxIteraciones} onChange={handleParam} min={1} max={100000} step={1} />
              <ParamInput label="Tiempo máx" name="tiempoMaximo" value={params.tiempoMaximo} onChange={handleParam} min={1} unit=" min" />
            </div>
          </div>
          <div className="params-actions">
            <button className="btn-run" onClick={handleCorrer} disabled={corriendo}>
              {corriendo ? '⏳ Simulando...' : '▶ Ejecutar Simulación'}
            </button>
          </div>
        </section>

        {resultado && (
          <>
            {/* Resumen rápido */}
            <section className="panel panel-summary">
              <h2 className="panel-title">📊 Resultado General</h2>
              <div className="summary-row">
                <span>Iteraciones: <strong>{iteracionesRealizadas.toLocaleString()}</strong></span>
                <span>Reloj final: <strong>{relojFinal.toFixed(2)} min</strong></span>
                <span>Personas atendidas: <strong>{metricas.personasFinalizadas}</strong></span>
                <span>Personas rechazadas: <strong>{metricas.personasCerrada}</strong></span>
              </div>
            </section>

            {/* Métricas */}
            <section className="panel panel-metricas">
              <h2 className="panel-title">📈 Métricas</h2>
              <div className="metricas-grid">
                <MetricaCard label="Prom. permanencia" value={metricas.promedioPermanencia} unit=" min" color="card-blue" />
                <MetricaCard label="% llegaron con bib. cerrada" value={metricas.pctCerrada} unit="%" color="card-red" />
                <MetricaCard label="Prom. espera en cola" value={metricas.promedioEsperaCola} unit=" min" color="card-yellow" />
                <MetricaCard label="% fueron a cola" value={metricas.pctFueronACola} unit="%" color="card-purple" />
                <MetricaCard label="% se quedó a leer" value={metricas.pctSeQuedaLeer} unit="%" color="card-teal" />
                <MetricaCard label="Veces que llegó a 20" value={metricas.veces20personas} color="card-orange" />
                <MetricaCard label="Máx. personas simult." value={metricas.maxPersonasSimultaneas} color="card-gray" />
                <MetricaCard label="Préstamos / Consultas" value={metricas.relacionPrestamosVsConsultas} color="card-green" />
                <MetricaCard label="Devoluciones / Préstamos" value={metricas.relacionDevolucionesVsPrestamos} color="card-blue" />
              </div>
              <div className="metricas-detalle">
                <div className="detalle-col">
                  <h3>Por tipo de visita</h3>
                  <table className="detalle-table">
                    <tbody>
                      <tr><td>📖 Pidieron libro</td><td><strong>{metricas.totalPidieronLibro}</strong></td></tr>
                      <tr><td>↩️ Devolvieron</td><td><strong>{metricas.totalDevolvieron}</strong></td></tr>
                      <tr><td>❓ Consultaron socio</td><td><strong>{metricas.totalConsultas}</strong></td></tr>
                      <tr><td>🚶 Se retiraron con libro</td><td><strong>{metricas.totalSeRetiraron}</strong></td></tr>
                      <tr><td>🪑 Se quedaron a leer</td><td><strong>{metricas.totalSeQuedaronALeer}</strong></td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Tabs */}
            <section className="panel panel-vector">
              <div className="tabs">
                <button className={`tab ${tab === 'vector' ? 'tab-active' : ''}`} onClick={() => setTab('vector')}>
                  📋 Vector de Estado
                </button>
              </div>

              {tab === 'vector' && (
                <>
                  <div className="vector-controls">
                    <label>
                      Desde iteración (j):
                      <input type="number" value={desde} min={1} max={filas.length} onChange={e => setDesde(Math.max(1, parseInt(e.target.value) || 1))} />
                    </label>
                    <label>
                      Cantidad (i):
                      <input type="number" value={cantidad} min={1} max={500} onChange={e => setCantidad(Math.max(1, parseInt(e.target.value) || 1))} />
                    </label>
                    <span className="vector-info">
                      Mostrando {Math.min(cantidad, filas.length - desde + 1)} de {filas.length} filas + última fila
                    </span>
                  </div>
                  <VectorEstado filas={filas} desde={desde} cantidad={cantidad} ultimaFila={true} />
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
