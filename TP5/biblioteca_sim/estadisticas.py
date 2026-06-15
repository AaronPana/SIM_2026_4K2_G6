"""Calculo de las metricas a partir del resultado de la simulacion."""

from dataclasses import dataclass

from .simulador import Resultado


@dataclass
class Metrica:
    nombre: str
    valor: str
    detalle: str = ""


def _div(a: float, b: float) -> float:
    return a / b if b else 0.0


def calcular(res: Resultado) -> list[Metrica]:
    a = res.acum
    t = res.reloj_final or 1.0
    metricas: list[Metrica] = []

    # --- Pedidas por el enunciado ---
    prom_perm = _div(a.sum_permanencia, a.n_finalizadas)
    metricas.append(
        Metrica(
            "Promedio de permanencia",
            f"{prom_perm:.2f} min",
            f"sobre {a.n_finalizadas} personas que se retiraron",
        )
    )
    pct_cerrada = _div(a.n_rechazadas, a.n_llegadas) * 100
    metricas.append(
        Metrica(
            "% que encuentra la biblioteca cerrada",
            f"{pct_cerrada:.2f} %",
            f"{a.n_rechazadas} rechazadas de {a.n_llegadas} llegadas",
        )
    )

    # --- 6+ estadisticas propuestas por el equipo ---
    for e_idx, busy in sorted(a.busy.items()):
        metricas.append(
            Metrica(
                f"Utilizacion empleado {e_idx + 1}",
                f"{_div(busy, t) * 100:.2f} %",
                f"{busy:.1f} min ocupado de {t:.1f} min",
            )
        )

    metricas.append(
        Metrica(
            "Espera media en cola",
            f"{_div(a.sum_espera, a.n_esperas):.2f} min",
            f"maxima: {a.max_espera:.2f} min",
        )
    )
    metricas.append(
        Metrica(
            "Largo medio de cola",
            f"{_div(a.area_cola, t):.2f} personas",
            f"maximo: {a.max_cola} personas",
        )
    )

    total_tipos = sum(a.por_tipo.values()) or 1
    detalle_tipos = " | ".join(
        f"{k}: {_div(v, total_tipos) * 100:.1f}%" for k, v in a.por_tipo.items()
    )
    metricas.append(Metrica("% de personas por tipo", detalle_tipos))

    metricas.append(
        Metrica(
            "Duracion media de consulta",
            f"{_div(a.sum_consulta, a.n_consultas):.2f} min",
            f"sobre {a.n_consultas} consultas",
        )
    )
    metricas.append(
        Metrica(
            "Maximo de personas simultaneas adentro",
            f"{a.max_personas} personas",
            f"capacidad: {res.parametros.capacidad}",
        )
    )

    return metricas
