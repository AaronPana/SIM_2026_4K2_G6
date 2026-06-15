"""Generadores de variables aleatorias.

Cada funcion devuelve una tupla ``(rnd, valor)``:
- ``rnd``  : el numero aleatorio U(0,1) que se uso (lo pide la consigna).
- ``valor``: el valor de la variable obtenido a partir de ese rnd.

Asi el vector de estado puede mostrar SIEMPRE el aleatorio y el resultado.
"""

import math
import random


def exponencial(rng: random.Random, media: float) -> tuple[float, float]:
    """Exponencial negativa de media dada.  X = -media * ln(1 - rnd)."""
    rnd = rng.random()
    valor = -media * math.log(1.0 - rnd)
    return rnd, valor


def uniforme(rng: random.Random, a: float, b: float) -> tuple[float, float]:
    """Uniforme continua en [a, b].  X = a + (b - a) * rnd."""
    rnd = rng.random()
    valor = a + (b - a) * rnd
    return rnd, valor


def uniforme_simetrica(rng: random.Random, centro: float, semi: float) -> tuple[float, float]:
    """Uniforme escrita como ``centro +/- semi`` (ej: 2 +/- 0,5)."""
    return uniforme(rng, centro - semi, centro + semi)


def elegir_tipo(rng: random.Random, p_pedir: float, p_devolver: float) -> tuple[float, str]:
    """Variable discreta del tipo de persona.

    Acumulada: [0, p_pedir) -> Pedir, [.., +p_devolver) -> Devolver, resto -> Consulta.
    """
    rnd = rng.random()
    if rnd < p_pedir:
        return rnd, "Pedir"
    if rnd < p_pedir + p_devolver:
        return rnd, "Devolver"
    return rnd, "Consulta"


def decidir_retira(rng: random.Random, p_retira: float) -> tuple[float, bool]:
    """Decision retira/lee del que pidio libro.  rnd < p_retira -> se retira."""
    rnd = rng.random()
    return rnd, rnd < p_retira
