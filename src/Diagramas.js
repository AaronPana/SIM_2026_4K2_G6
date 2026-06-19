// Diagramas de flujo del modelo (SVG nativo) para la presentación.
// Cuatro flujos en pestañas: General, Pide libro, Devuelve, Consulta socio.
import React, { useState } from "react";

const C = {
  neutral: "#343849",
  blue: "#1f4e8a",
  green: "#0f5a43",
  purple: "#473a93",
  red: "#7a2531",
  brown: "#7a4d12",
};

function Defs() {
  return (
    <defs>
      <marker
        id="fd-arrow"
        markerWidth="10"
        markerHeight="10"
        refX="8"
        refY="3"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L8,3 L0,6 Z" fill="#8a8fa3" />
      </marker>
    </defs>
  );
}

// Caja (rectángulo + título + hasta 2 subtítulos), centrada vertical y horizontalmente.
function Node({ x, y, w, h, fill, title, sub, sub2 }) {
  const cx = x + w / 2;
  let ty;
  if (sub2) ty = y + h / 2 - 12;
  else if (sub) ty = y + h / 2 - 3;
  else ty = y + h / 2 + 5;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="10" fill={fill} />
      <text x={cx} y={ty} textAnchor="middle" className="fd-title">
        {title}
      </text>
      {sub && (
        <text x={cx} y={ty + 19} textAnchor="middle" className="fd-sub">
          {sub}
        </text>
      )}
      {sub2 && (
        <text x={cx} y={ty + 37} textAnchor="middle" className="fd-sub">
          {sub2}
        </text>
      )}
    </g>
  );
}

const Arrow = ({ x1, y1, x2, y2 }) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} className="fd-edge" markerEnd="url(#fd-arrow)" />
);

// Conector en "L": baja desde (x1,y1) hasta y2 y luego va horizontal hasta x2.
const Elbow = ({ x1, y1, y2, x2 }) => (
  <path d={`M ${x1} ${y1} V ${y2} H ${x2}`} className="fd-edge" markerEnd="url(#fd-arrow)" />
);

const Lbl = ({ x, y, children }) => (
  <text x={x} y={y} textAnchor="middle" className="fd-label">
    {children}
  </text>
);

function DiagGeneral() {
  return (
    <svg viewBox="0 0 900 560" className="fd-svg">
      <Defs />
      <Node x={350} y={20} w={200} h={62} fill={C.neutral} title="Llega persona" sub="cada 4 min" />
      <Node x={350} y={150} w={200} h={64} fill={C.brown} title="¿Aforo completo?" sub="¿20 personas dentro?" />
      <Node x={60} y={151} w={200} h={62} fill={C.red} title="Cerrada por aforo" sub="se retira" />
      <Node x={350} y={280} w={200} h={56} fill={C.neutral} title="Entra al mostrador" />
      <Node x={350} y={390} w={200} h={56} fill={C.neutral} title="Motivo de la visita" />
      <Node x={55} y={480} w={220} h={64} fill={C.blue} title="Pide libro" sub="préstamo (45%)" />
      <Node x={340} y={480} w={220} h={64} fill={C.green} title="Devuelve libro" sub="devolución (45%)" />
      <Node x={625} y={480} w={220} h={64} fill={C.purple} title="Consulta socio" sub="ser socio (10%)" />

      <Arrow x1={450} y1={82} x2={450} y2={150} />
      <Arrow x1={350} y1={182} x2={262} y2={182} />
      <Lbl x={305} y={172}>sí</Lbl>
      <Arrow x1={450} y1={214} x2={450} y2={280} />
      <Lbl x={463} y={252}>no</Lbl>
      <Arrow x1={450} y1={336} x2={450} y2={390} />
      <Arrow x1={450} y1={446} x2={170} y2={480} />
      <Arrow x1={450} y1={446} x2={450} y2={480} />
      <Arrow x1={450} y1={446} x2={730} y2={480} />
    </svg>
  );
}

function DiagPide() {
  return (
    <svg viewBox="0 0 900 770" className="fd-svg">
      <Defs />
      <Node x={350} y={20} w={200} h={56} fill={C.blue} title="Pide libro (45%)" />
      <Node x={340} y={130} w={220} h={64} fill={C.neutral} title="¿Empleado libre?" sub="2 empleados" />
      <Node x={60} y={130} w={200} h={64} fill={C.brown} title="Hace cola" sub="espera turno" />
      <Node x={340} y={250} w={220} h={64} fill={C.blue} title="Atención: préstamo" sub="Exp neg, media 6'" />
      <Node x={340} y={370} w={220} h={64} fill={C.neutral} title="Recibe el libro" sub="¿se queda a leer?" />
      <Node x={650} y={374} w={170} h={56} fill={C.neutral} title="Se retira" />
      <Node x={340} y={490} w={220} h={64} fill={C.blue} title="Lee en sala" sub="permanencia ~30'" />
      <Node x={330} y={600} w={240} h={64} fill={C.green} title="Devuelve el libro" sub="U(1.5–2.5'), cola si hace falta" />
      <Node x={360} y={700} w={180} h={52} fill={C.neutral} title="Se retira" />

      <Arrow x1={450} y1={76} x2={450} y2={130} />
      <Arrow x1={340} y1={162} x2={262} y2={162} />
      <Lbl x={305} y={152}>no</Lbl>
      <Arrow x1={450} y1={194} x2={450} y2={250} />
      <Lbl x={463} y={226}>sí</Lbl>
      <Elbow x1={160} y1={194} y2={282} x2={338} />
      <Arrow x1={450} y1={314} x2={450} y2={370} />
      <Arrow x1={560} y1={402} x2={650} y2={402} />
      <Lbl x={605} y={392}>no 60%</Lbl>
      <Arrow x1={450} y1={434} x2={450} y2={490} />
      <Lbl x={472} y={466}>sí 40%</Lbl>
      <Arrow x1={450} y1={554} x2={450} y2={600} />
      <Arrow x1={450} y1={664} x2={450} y2={700} />
    </svg>
  );
}

function DiagDevuelve() {
  return (
    <svg viewBox="0 0 900 470" className="fd-svg">
      <Defs />
      <Node x={345} y={20} w={210} h={56} fill={C.green} title="Devuelve libro (45%)" />
      <Node x={340} y={130} w={220} h={64} fill={C.neutral} title="¿Empleado libre?" sub="2 empleados" />
      <Node x={60} y={130} w={200} h={64} fill={C.brown} title="Hace cola" sub="espera turno" />
      <Node x={330} y={260} w={240} h={64} fill={C.green} title="Atención: recepción" sub="U(1.5–2.5') registra devol." />
      <Node x={360} y={380} w={180} h={52} fill={C.neutral} title="Se retira" />

      <Arrow x1={450} y1={76} x2={450} y2={130} />
      <Arrow x1={340} y1={162} x2={262} y2={162} />
      <Lbl x={305} y={152}>no</Lbl>
      <Arrow x1={450} y1={194} x2={450} y2={260} />
      <Lbl x={463} y={230}>sí</Lbl>
      <Elbow x1={160} y1={194} y2={292} x2={328} />
      <Arrow x1={450} y1={324} x2={450} y2={380} />
    </svg>
  );
}

function DiagConsulta() {
  return (
    <svg viewBox="0 0 900 490" className="fd-svg">
      <Defs />
      <Node x={345} y={20} w={210} h={56} fill={C.purple} title="Consulta socio (10%)" />
      <Node x={340} y={130} w={220} h={64} fill={C.neutral} title="¿Empleado libre?" sub="2 empleados" />
      <Node x={60} y={130} w={200} h={64} fill={C.brown} title="Hace cola" sub="espera turno" />
      <Node
        x={320}
        y={255}
        w={260}
        h={84}
        fill={C.purple}
        title="Atención: consulta"
        sub="M ~ U(2;36) · h = 0,1"
        sub2="duración vía Runge-Kutta"
      />
      <Node x={360} y={400} w={180} h={52} fill={C.neutral} title="Se retira" />

      <Arrow x1={450} y1={76} x2={450} y2={130} />
      <Arrow x1={340} y1={162} x2={262} y2={162} />
      <Lbl x={305} y={152}>no</Lbl>
      <Arrow x1={450} y1={194} x2={450} y2={255} />
      <Lbl x={463} y={228}>sí</Lbl>
      <Elbow x1={160} y1={194} y2={297} x2={318} />
      <Arrow x1={450} y1={339} x2={450} y2={400} />
    </svg>
  );
}

const TABS = [
  { key: "general", label: "General", render: () => <DiagGeneral /> },
  { key: "pide", label: "Pide libro", render: () => <DiagPide /> },
  { key: "devuelve", label: "Devuelve", render: () => <DiagDevuelve /> },
  { key: "consulta", label: "Consulta socio", render: () => <DiagConsulta /> },
];

export default function Diagramas() {
  const [activa, setActiva] = useState("general");
  const actual = TABS.find((t) => t.key === activa);
  return (
    <div className="fd-wrap">
      <div className="fd-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`fd-tab ${activa === t.key ? "fd-tab-active" : ""}`}
            onClick={() => setActiva(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="fd-canvas">{actual.render()}</div>
    </div>
  );
}
