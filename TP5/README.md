# TP5 — Simulación de una Biblioteca (Grupo 6)

Simulador de eventos discretos (método del próximo evento) con interfaz web en Streamlit.

## Cómo correrlo

```bash
pip install -r requirements.txt
streamlit run app.py
```

Se abre en el navegador (http://localhost:8501). Configurá los parámetros en la barra
lateral y presioná **Simular**.

## Estructura

| Archivo | Responsabilidad |
|---|---|
| `biblioteca_sim/distribuciones.py` | Variables aleatorias; cada función devuelve `(rnd, valor)`. |
| `biblioteca_sim/runge_kutta.py` | Integración RK4 de la consulta + tabla paso a paso. |
| `biblioteca_sim/modelo.py` | `Parametros`, `Persona`, `Empleado` y enums. |
| `biblioteca_sim/simulador.py` | Motor: produce el vector de estado y los acumuladores. |
| `biblioteca_sim/estadisticas.py` | Cálculo de las métricas. |
| `app.py` | Interfaz Streamlit (parámetros, vector de estado, métricas, RK, gráficos). |

El diseño completo del modelo está en `docs/spec-biblioteca.md`.

## Qué muestra (consigna)

- Corre hasta el **tiempo X** o **100000 iteraciones**, lo que ocurra primero.
- **Vector de estado** desde la iteración `j` por `i` filas + la **última fila** (estado en X).
- Todos los parámetros son **modificables**.
- Cada variable aleatoria muestra el **número aleatorio** usado y su **valor**.
- Snapshot de los **objetos temporales** (personas presentes) en cada fila.
- **Tablas de Runge-Kutta** de cada consulta.

## Métricas

- Promedio de permanencia y % que encuentra la biblioteca cerrada (pedidas).
- Utilización por empleado, espera media/máx en cola, largo medio/máx de cola,
  % por tipo, duración media de consulta y máximo de personas adentro (las 6+ propuestas).
