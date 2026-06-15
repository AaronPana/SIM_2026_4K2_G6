"""Interfaz web (Streamlit) del simulador de la biblioteca - TP5 Grupo 6.

Ejecutar con:  streamlit run app.py
"""

import pandas as pd
import streamlit as st

from biblioteca_sim import estadisticas
from biblioteca_sim.modelo import Parametros
from biblioteca_sim.simulador import Resultado, simular

st.set_page_config(page_title="Simulacion Biblioteca - TP5", layout="wide")

# columnas "base" del vector de estado en el orden que queremos mostrarlas
COLUMNAS_BASE = [
    "iteracion", "evento", "reloj",
    "rnd_entre_llegadas", "entre_llegadas", "prox_llegada",
    "rnd_tipo", "tipo", "resultado_llegada",
    "rnd_prestamo", "prestamo",
    "rnd_devolucion", "devolucion",
    "rnd_umbral_metic", "umbral_metic", "consulta_duracion",
    "rnd_retira_lee", "retira_lee",
    "rnd_lectura", "lectura",
    "emp1_estado", "emp1_fin", "emp2_estado", "emp2_fin",
    "cola", "cola_ids", "lectores_fin",
    "abierta", "adentro",
    "ac_llegadas", "ac_rechazadas", "ac_finalizadas", "ac_sum_permanencia",
]


def filas_a_dataframe(filas: list[dict]) -> pd.DataFrame:
    """Aplana las filas (incluye objetos temporales como columnas dinamicas P{n}_*)."""
    max_obj = max((len(f.get("_objetos", [])) for f in filas), default=0)
    registros = []
    for f in filas:
        fila = {col: f.get(col, "") for col in COLUMNAS_BASE}
        for i in range(max_obj):
            objs = f.get("_objetos", [])
            o = objs[i] if i < len(objs) else None
            pref = f"obj{i + 1}"
            fila[f"{pref}_id"] = f"P{o['id']}" if o else ""
            fila[f"{pref}_tipo"] = o["tipo"] if o else ""
            fila[f"{pref}_estado"] = o["estado"] if o else ""
            fila[f"{pref}_hLlegada"] = o["hora_llegada"] if o else ""
            fila[f"{pref}_libro"] = o["tiene_libro"] if o else ""
        registros.append(fila)
    return pd.DataFrame(registros)


def panel_parametros() -> tuple[Parametros, int, int]:
    st.sidebar.header("Parametros")
    s = st.sidebar

    s.subheader("Llegadas y mezcla")
    media_llegada = s.number_input("Media entre llegadas (min)", 0.1, 100.0, 4.0, 0.5)
    p_pedir = s.slider("% Pedir", 0.0, 1.0, 0.45, 0.01)
    p_devolver = s.slider("% Devolver", 0.0, 1.0, 0.45, 0.01)
    s.caption(f"% Consulta = {max(0.0, 1 - p_pedir - p_devolver):.2f}")

    s.subheader("Servicios")
    media_prestamo = s.number_input("Media prestamo (min)", 0.1, 100.0, 6.0, 0.5)
    centro_dev = s.number_input("Devolucion centro (min)", 0.1, 100.0, 2.0, 0.1)
    semi_dev = s.number_input("Devolucion +/- (min)", 0.0, 50.0, 0.5, 0.1)
    p_retira = s.slider("% que se retira (resto lee)", 0.0, 1.0, 0.60, 0.01)
    media_lectura = s.number_input("Media lectura en sala (min)", 0.1, 300.0, 30.0, 1.0)

    s.subheader("Consulta (Runge-Kutta)")
    metic_min = s.number_input("Meticulosidad min", 0.0, 100.0, 2.0, 1.0)
    metic_max = s.number_input("Meticulosidad max", 0.0, 200.0, 36.0, 1.0)
    h_rk = s.number_input("Paso h", 0.001, 5.0, 0.1, 0.05, format="%.3f")

    s.subheader("Recursos y corte")
    n_emp = s.number_input("Empleados", 1, 10, 2, 1)
    capacidad = s.number_input("Capacidad (cierra al llegar)", 1, 1000, 20, 1)
    tiempo_max = s.number_input("Tiempo X de simulacion (min)", 1.0, 1_000_000.0, 480.0, 10.0)
    max_iter = s.number_input("Tope de iteraciones", 1, 100_000, 100_000, 1000)
    semilla = s.number_input("Semilla (0 = aleatoria)", 0, 10_000_000, 12345, 1)

    s.subheader("Corte del vector de estado")
    j = s.number_input("Desde iteracion j", 1, 100_000, 1, 1)
    i = s.number_input("Cantidad de filas i", 1, 100_000, 50, 1)

    p = Parametros(
        media_llegada=media_llegada,
        p_pedir=p_pedir,
        p_devolver=p_devolver,
        media_prestamo=media_prestamo,
        centro_devolucion=centro_dev,
        semi_devolucion=semi_dev,
        p_retira=p_retira,
        media_lectura=media_lectura,
        metic_min=metic_min,
        metic_max=metic_max,
        h_rk=h_rk,
        n_empleados=int(n_emp),
        capacidad=int(capacidad),
        tiempo_max=tiempo_max,
        max_iteraciones=int(max_iter),
        semilla=None if semilla == 0 else int(semilla),
    )
    return p, int(j), int(i)


def tab_vector(res: Resultado, j: int, i: int) -> None:
    st.subheader("Vector de estado")
    st.caption(
        f"Iteraciones simuladas: {res.iteraciones} | reloj final: {res.reloj_final:.2f} min "
        f"| corte por: {res.motivo_corte}"
    )
    total = len(res.filas)
    if total == 0:
        st.warning("No se generaron eventos. Revisa los parametros.")
        return

    desde = max(0, j - 1)
    hasta = min(total, desde + i)
    slice_filas = res.filas[desde:hasta]
    st.markdown(f"**Mostrando filas {desde + 1} a {hasta}** (de {total})")
    st.dataframe(filas_a_dataframe(slice_filas), use_container_width=True, height=420)

    st.markdown("**Ultima fila (estado al instante X):**")
    st.dataframe(filas_a_dataframe([res.filas[-1]]), use_container_width=True)


def tab_metricas(res: Resultado) -> None:
    st.subheader("Metricas")
    metricas = estadisticas.calcular(res)
    cols = st.columns(3)
    for idx, m in enumerate(metricas):
        with cols[idx % 3]:
            st.metric(m.nombre, m.valor)
            if m.detalle:
                st.caption(m.detalle)


def tab_runge_kutta(res: Resultado) -> None:
    st.subheader("Tablas de Runge-Kutta (consultas)")
    if not res.rk:
        st.info("No hubo consultas en esta corrida.")
        return
    st.caption(f"Se resolvieron {len(res.rk)} consultas con RK4.")
    opciones = [
        f"Consulta P{c.persona_id} @ {c.reloj:.2f} min (umbral={c.tabla.umbral:.2f}, dur={c.tabla.duracion:.2f})"
        for c in res.rk
    ]
    sel = st.selectbox("Elegi una consulta", range(len(opciones)), format_func=lambda k: opciones[k])
    c = res.rk[sel]
    st.write(
        f"Umbral meticulosidad (RND={c.rnd_umbral:.4f}): **{c.tabla.umbral:.4f}** | "
        f"paso h={c.tabla.h} | duracion = **{c.tabla.duracion:.4f} min**"
    )
    st.dataframe(pd.DataFrame(c.tabla.filas), use_container_width=True, height=420)


def tab_graficos(res: Resultado) -> None:
    st.subheader("Graficos")
    a = res.acum
    c1, c2 = st.columns(2)
    with c1:
        st.markdown("**Personas por tipo**")
        st.bar_chart(pd.DataFrame({"cantidad": a.por_tipo}))
        st.markdown("**Utilizacion de empleados (%)**")
        util = {
            f"Emp {k + 1}": (v / res.reloj_final * 100 if res.reloj_final else 0)
            for k, v in sorted(a.busy.items())
        }
        st.bar_chart(pd.DataFrame({"util %": util}))
    with c2:
        if a.permanencias:
            st.markdown("**Distribucion de permanencia (min)**")
            st.bar_chart(pd.Series(a.permanencias, name="permanencia").value_counts(bins=15).sort_index())
        if a.esperas:
            st.markdown("**Distribucion de espera en cola (min)**")
            st.bar_chart(pd.Series(a.esperas, name="espera").value_counts(bins=15).sort_index())


def main() -> None:
    st.title("Simulacion de una Biblioteca - TP5 (Grupo 6)")
    p, j, i = panel_parametros()

    if st.sidebar.button("Simular", type="primary", use_container_width=True):
        with st.spinner("Simulando..."):
            st.session_state["res"] = simular(p)

    res = st.session_state.get("res")
    if res is None:
        st.info("Configura los parametros en la barra lateral y presiona **Simular**.")
        return

    t1, t2, t3, t4 = st.tabs(["Vector de estado", "Metricas", "Runge-Kutta", "Graficos"])
    with t1:
        tab_vector(res, j, i)
    with t2:
        tab_metricas(res)
    with t3:
        tab_runge_kutta(res)
    with t4:
        tab_graficos(res)


if __name__ == "__main__":
    main()
