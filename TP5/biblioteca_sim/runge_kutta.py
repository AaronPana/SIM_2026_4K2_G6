"""Runge-Kutta de orden 4 para la duracion de una consulta.

La consulta se resuelve integrando la EDO:

    dM/dt = 0,6 * t + 0,7 * M(t)

partiendo de M(0) = 0 (meticulosidad nula => no demora) con paso h, hasta que
M(t) supera el umbral de meticulosidad de la persona (umbral ~ U(2, 36)).
El tiempo t alcanzado en ese momento ES la duracion de la consulta en minutos.
"""

from dataclasses import dataclass, field


def _derivada(t: float, m: float) -> float:
    """f(t, M) = dM/dt."""
    return 0.6 * t + 0.7 * m


@dataclass
class TablaRK:
    """Resultado de una integracion: duracion + tabla paso a paso (para mostrar)."""

    umbral: float
    h: float
    duracion: float
    filas: list[dict] = field(default_factory=list)


def integrar_consulta(umbral: float, h: float = 0.1, max_pasos: int = 1_000_000) -> TablaRK:
    """Integra la EDO con RK4 hasta superar ``umbral``.

    Devuelve una :class:`TablaRK` con la duracion (t final) y cada paso del metodo.
    """
    t, m = 0.0, 0.0
    filas: list[dict] = []
    paso = 0

    while m <= umbral and paso < max_pasos:
        k1 = _derivada(t, m)
        k2 = _derivada(t + h / 2.0, m + (h / 2.0) * k1)
        k3 = _derivada(t + h / 2.0, m + (h / 2.0) * k2)
        k4 = _derivada(t + h, m + h * k3)
        m_sig = m + (h / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)
        t_sig = t + h

        filas.append(
            {
                "paso": paso,
                "t": round(t, 4),
                "M": round(m, 6),
                "k1": round(k1, 6),
                "k2": round(k2, 6),
                "k3": round(k3, 6),
                "k4": round(k4, 6),
                "M_siguiente": round(m_sig, 6),
            }
        )

        m, t = m_sig, t_sig
        paso += 1

    return TablaRK(umbral=umbral, h=h, duracion=round(t, 4), filas=filas)
