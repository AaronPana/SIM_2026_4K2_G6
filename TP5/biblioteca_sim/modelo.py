"""Entidades del dominio: parametros, persona y empleado."""

import math
from dataclasses import dataclass, field
from enum import Enum


class TipoPersona(str, Enum):
    PEDIR = "Pedir"
    DEVOLVER = "Devolver"
    CONSULTA = "Consulta"


class EstadoPersona(str, Enum):
    EN_COLA = "En cola"
    EN_ATENCION = "En atencion"
    LEYENDO = "Leyendo"
    EN_COLA_DEVOLUCION = "En cola (a devolver)"


@dataclass
class Parametros:
    """Todos los parametros del enunciado, modificables por el usuario."""

    # Llegadas
    media_llegada: float = 4.0
    # Mezcla de tipos (deben sumar 1 con el implicito de consulta)
    p_pedir: float = 0.45
    p_devolver: float = 0.45
    # Servicios
    media_prestamo: float = 6.0
    centro_devolucion: float = 2.0
    semi_devolucion: float = 0.5
    # Lectura en sala
    p_retira: float = 0.60          # de los que piden, % que se retira (resto lee)
    media_lectura: float = 30.0
    # Consulta / Runge-Kutta
    metic_min: float = 2.0
    metic_max: float = 36.0
    h_rk: float = 0.1
    # Recursos y capacidad
    n_empleados: int = 2
    capacidad: int = 20
    # Corte de la simulacion
    tiempo_max: float = 480.0       # X (minutos). 480 = 8 horas
    max_iteraciones: int = 100_000
    # Reproducibilidad
    semilla: int | None = 12345

    @property
    def p_consulta(self) -> float:
        return max(0.0, 1.0 - self.p_pedir - self.p_devolver)


@dataclass
class Persona:
    """Objeto temporal: una persona dentro del sistema."""

    id: int
    tipo: TipoPersona
    hora_llegada: float
    estado: EstadoPersona
    hora_entrada_cola: float = 0.0
    tiene_libro: bool = False
    volvio_a_devolver: bool = False   # True cuando reingresa a la cola tras leer


@dataclass
class Empleado:
    """Servidor. ``libre=False`` => esta atendiendo a ``persona`` hasta ``fin``."""

    idx: int
    libre: bool = True
    fin: float = math.inf
    tarea: str = ""
    persona: Persona | None = None

    def ocupar(self, persona: Persona, tarea: str, fin: float) -> None:
        self.libre = False
        self.persona = persona
        self.tarea = tarea
        self.fin = fin

    def liberar(self) -> Persona:
        persona = self.persona
        self.libre = True
        self.persona = None
        self.tarea = ""
        self.fin = math.inf
        return persona
