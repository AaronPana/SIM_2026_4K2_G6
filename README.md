# Simulación de Biblioteca — SIM 2026 · 4K2 · Grupo 6

Simulación de eventos discretos de una biblioteca pública con dos empleados en mostrador, cola de espera, sala de lectura y control de capacidad. Desarrollada como trabajo práctico de la materia **Simulación** (UTN FRC, 2026).

---

## Estructura

```
src/
├── App.js                 # Interfaz principal: parámetros, tabla de vectores, métricas
├── App.css                # Tema oscuro, estilos de tabla y badges
└── simulation/
    ├── motor.js           # Motor de eventos discretos (llegadas, atención, lectura)
    └── utils.js           # RNG (exp. negativa, uniforme) + Runge-Kutta 4
```

---

## Tecnologías

| Capa       | Tecnología                                           |
| ---------- | ---------------------------------------------------- |
| Frontend   | React 19                                             |
| Simulación | JavaScript puro (sin librerías matemáticas externas) |
| Buildtool  | Create React App (react-scripts 5)                   |
| Fuentes    | Inter · JetBrains Mono                               |

---

## Reglas de negocio

### Tipos de cliente

Al llegar, cada persona es clasificada con un RND:

| Tipo         | Probabilidad | Tiempo de atención                          |
| ------------ | ------------ | ------------------------------------------- |
| `PIDE_LIBRO` | 45 %         | Exp. negativa (`mediaPrestamo`)             |
| `DEVUELVE`   | 45 %         | Uniforme `[devMin, devMax]`                 |
| `CONSULTA`   | 10 %         | Runge-Kutta 4 sobre ODE dM/dt = 0.6t + 0.7M |

### Flujo post-atención

- `DEVUELVE` / `CONSULTA` → sale de la biblioteca.
- `PIDE_LIBRO` → con probabilidad `pctSeRetira` (60 %) sale; con 40 % pasa a sala de lectura (tiempo Exp. negativa).

### Capacidad y cola

- Capacidad máxima configurable (`capacidadMax`, default 20).
- Si la biblioteca está llena, el evento se registra como `LLEGADA_CERRADA` y la persona es rechazada.
- Cola FIFO; el primer empleado libre toma al siguiente cliente.

### Runge-Kutta 4 (consultas)

Se integra `dM/dt = 0.6t + 0.7M(t)` con `M(0) = 0` y paso `h` (default 0.1) hasta que `M(t)` supera el umbral de **meticulosidad** sorteado con U[`meticulosidadMin`, `meticulosidadMax`]. La duración de la consulta es el tiempo `t` en que se alcanza ese umbral.

---

## Estadísticas calculadas

### Obligatorias

| Métrica                         | Descripción                          |
| ------------------------------- | ------------------------------------ |
| Tiempo promedio en biblioteca   | Acumulado total / personas atendidas |
| % llegadas con biblioteca llena | `LLEGADA_CERRADA` / total llegadas   |

### Grupo 6

| Métrica                         | Descripción                              |
| ------------------------------- | ---------------------------------------- |
| % ocupación Empleado 1          | Tiempo ocupado / tiempo total            |
| Cantidad promedio en cola       | Ley de Little (área bajo curva / tiempo) |
| Tiempo máximo de espera en cola | Mayor permanencia registrada en cola     |
| Tiempo mínimo en biblioteca     | Menor permanencia registrada             |
| Personas que se quedaron a leer | Contador acumulado                       |
| % tiempo ocioso Empleado 2      | Tiempo libre / tiempo total              |

---

## Parámetros principales

```
mediaLlegada              4 min      Media de llegadas (exp. negativa)
pctPideLibro             45 %       Proporción de pedidos de libro
pctDevuelve              45 %       Proporción de devoluciones
mediaPrestamo             6 min      Tiempo de atención préstamo
devolucionMin/Max        [1.5, 2.5] Rango devolución (uniforme)
meticulosidadMin/Max     [2, 36]    Umbral consulta (uniforme)
hRK                       0.1       Paso Runge-Kutta
pctSeRetira              60 %       Prob. de retirarse tras pedir libro
mediaLecturaInstalaciones 30 min    Tiempo en sala de lectura
capacidadMax             20 pers    Límite de aforo
```

---

## Instalación y uso

```bash
npm install
npm start       # http://localhost:3000
```
