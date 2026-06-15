# TP5 — Simulación Biblioteca (Grupo 6)

Diseño aprobado. Documento de referencia del modelo y la aplicación.

## Modelo (eventos discretos, método del próximo evento)

- **Llegadas:** Exponencial, media 4'. Stream continuo (un rechazo no corta el stream).
- **Tipo de persona** (al ser admitida): Pedir 45%, Devolver 45%, Consulta 10%.
- **Recursos:** 2 empleados idénticos, **una sola cola FIFO** que los alimenta.
- **Servicios:**
  - Préstamo (buscar + tomar datos + entregar): Exponencial media 6'.
  - Devolución / registro: Uniforme 2 ± 0,5'.
  - Consulta (socio): integración **RK4** de `dM/dt = 0,6·t + 0,7·M(t)`, con `M(0)=0`,
    `h=0,1`, hasta superar un umbral `U(2;36)`. La duración de la consulta es el `t` alcanzado.
- **Lectura en sala:** de los que piden libro, 60% se retira y 40% se queda leyendo
  Exponencial media 30'; luego vuelve a la cola a devolver el libro (Uniforme 2 ± 0,5') y se retira.
- **Política 1 libro/persona:** modelada implícitamente (cada persona hace un solo préstamo).
- **Capacidad:** "adentro" = en cola + en atención + leyendo. Al alcanzar **20** la biblioteca
  cierra; las llegadas mientras está cerrada se cuentan como **rechazadas** y no entran.
  Reabre automáticamente cuando el interior vuelve a < 20.

## Variables aleatorias (cada sorteo registra RND y valor)

| Variable | Distribución | Fórmula |
|---|---|---|
| Tiempo entre llegadas | Exponencial(4) | `-media·ln(1-RND)` |
| Tipo de persona | Discreta | acumulada 0,45 / 0,90 / 1,00 |
| Préstamo | Exponencial(6) | `-media·ln(1-RND)` |
| Devolución | Uniforme(1,5 ; 2,5) | `a+(b-a)·RND` |
| Umbral meticulosidad | Uniforme(2 ; 36) | `a+(b-a)·RND` |
| Decisión retira/lee | Discreta | RND < 0,6 ⇒ retira |
| Tiempo de lectura | Exponencial(30) | `-media·ln(1-RND)` |

## Vector de estado

Un renglón por evento. Columnas: iteración, evento, reloj; RND+valor de cada variable sorteada
en ese evento; estado de empleado 1 y 2 (libre/ocupado + tarea + hora fin); largo y contenido de
cola; próxima llegada; fin de lectura de cada lector; abierta (Sí/No) y cantidad adentro;
acumuladores de métricas; y **snapshot de los objetos temporales** (cada persona presente con id,
tipo, estado, hora de llegada y si tiene libro), que la UI despliega como columnas dinámicas.

## Métricas

Pedidas: promedio de permanencia; % que encuentra la biblioteca cerrada.
Propuestas (6+): utilización de cada empleado; espera media y máxima en cola; largo medio/máx de
cola; % de personas por tipo; duración media de consulta; máximo de personas simultáneas adentro.

## Aplicación (Streamlit)

- Sidebar: **todos** los parámetros editables (medias, %, capacidad, h, semilla, X = tiempo,
  tope 100000 iteraciones, `j` y `i` para el corte del vector).
- Corre hasta `tiempo X` o `100000` iteraciones, lo que ocurra primero.
- Pestañas: Vector de estado (filas `j..j+i` + última fila), Métricas, Tablas Runge-Kutta, Gráficos.

## Estructura

```
TP5/
  biblioteca_sim/
    distribuciones.py   # cada función devuelve (rnd, valor)
    runge_kutta.py      # RK4 + tabla
    modelo.py           # Persona, Empleado, enums, Parametros
    simulador.py        # motor; produce el vector de estado
    estadisticas.py     # cálculo de métricas
  app.py                # Streamlit
  requirements.txt
  README.md
```
