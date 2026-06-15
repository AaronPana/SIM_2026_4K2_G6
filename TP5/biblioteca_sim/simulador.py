"""Motor de simulacion de eventos discretos (metodo del proximo evento).

Produce el VECTOR DE ESTADO: una lista de filas (dict), una por evento, con todo
el detalle que pide la consigna (reloj, evento, aleatorios usados, estado de los
servidores, cola, eventos futuros, acumuladores y los objetos temporales presentes).
"""

import math
import random
from collections import deque
from dataclasses import dataclass, field

from . import distribuciones as dist
from .modelo import Empleado, EstadoPersona, Parametros, Persona, TipoPersona
from .runge_kutta import TablaRK, integrar_consulta


@dataclass
class ConsultaRK:
    """Una consulta resuelta con Runge-Kutta (para mostrar la tabla)."""

    persona_id: int
    reloj: float
    rnd_umbral: float
    tabla: TablaRK


@dataclass
class Acumuladores:
    """Contadores y areas para calcular las metricas al final."""

    n_llegadas: int = 0
    n_rechazadas: int = 0
    n_admitidas: int = 0
    n_finalizadas: int = 0
    por_tipo: dict = field(default_factory=lambda: {"Pedir": 0, "Devolver": 0, "Consulta": 0})

    sum_permanencia: float = 0.0
    sum_espera: float = 0.0
    n_esperas: int = 0
    max_espera: float = 0.0

    area_cola: float = 0.0
    max_cola: int = 0
    area_personas: float = 0.0
    max_personas: int = 0

    busy: dict = field(default_factory=dict)        # idx_empleado -> tiempo ocupado
    sum_consulta: float = 0.0
    n_consultas: int = 0

    # listas para histogramas / estadistica extra
    permanencias: list = field(default_factory=list)
    esperas: list = field(default_factory=list)
    consultas_dur: list = field(default_factory=list)


@dataclass
class Resultado:
    filas: list[dict]
    rk: list[ConsultaRK]
    acum: Acumuladores
    parametros: Parametros
    reloj_final: float
    iteraciones: int
    motivo_corte: str


class Simulador:
    def __init__(self, p: Parametros):
        self.p = p
        self.rng = random.Random(p.semilla)
        self.reloj = 0.0
        self.reloj_ant = 0.0
        self.iteracion = 0

        self.empleados = [Empleado(i) for i in range(p.n_empleados)]
        self.cola: deque[Persona] = deque()
        self.presentes: dict[int, Persona] = {}
        self.lectores: dict[int, float] = {}        # persona_id -> hora fin de lectura
        self.lectores_persona: dict[int, Persona] = {}

        self.prox_llegada = 0.0
        self.next_id = 1

        self.acum = Acumuladores(busy={e.idx: 0.0 for e in self.empleados})
        self.filas: list[dict] = []
        self.rk: list[ConsultaRK] = []
        self._sorteos: dict = {}                    # aleatorios usados en el evento actual

    # ------------------------------------------------------------------ utilidades
    @property
    def cant_adentro(self) -> int:
        return len(self.presentes)

    @property
    def abierta(self) -> bool:
        return self.cant_adentro < self.p.capacidad

    def _registrar(self, clave: str, rnd: float, valor) -> None:
        """Guarda un aleatorio usado en el evento actual (rnd + valor)."""
        self._sorteos[f"rnd_{clave}"] = round(rnd, 4)
        self._sorteos[clave] = round(valor, 4) if isinstance(valor, float) else valor

    # ------------------------------------------------------------------ motor
    def correr(self) -> Resultado:
        # primer arribo
        rnd, dt = dist.exponencial(self.rng, self.p.media_llegada)
        self.prox_llegada = self.reloj + dt

        motivo = "tiempo_max"
        while True:
            tipo_evento, t_evento, ref = self._proximo_evento()
            if t_evento > self.p.tiempo_max:
                motivo = "tiempo_max"
                break
            if self.iteracion >= self.p.max_iteraciones:
                motivo = "max_iteraciones"
                break

            # acumular areas sobre el intervalo [reloj_ant, t_evento]
            self._acumular_areas(t_evento)
            self.reloj = t_evento
            self.iteracion += 1
            self._sorteos = {}

            if tipo_evento == "llegada":
                desc = self._evento_llegada()
            elif tipo_evento == "fin_atencion":
                desc = self._evento_fin_atencion(ref)
            else:  # fin_lectura
                desc = self._evento_fin_lectura(ref)

            self.acum.max_cola = max(self.acum.max_cola, len(self.cola))
            self.acum.max_personas = max(self.acum.max_personas, self.cant_adentro)
            self.filas.append(self._fila(desc))

        return Resultado(
            filas=self.filas,
            rk=self.rk,
            acum=self.acum,
            parametros=self.p,
            reloj_final=self.reloj,
            iteraciones=self.iteracion,
            motivo_corte=motivo,
        )

    def _proximo_evento(self) -> tuple[str, float, object]:
        """Elige el evento mas proximo entre llegada, fines de atencion y de lectura."""
        mejor_tipo, mejor_t, mejor_ref = "llegada", self.prox_llegada, None
        for e in self.empleados:
            if not e.libre and e.fin < mejor_t:
                mejor_tipo, mejor_t, mejor_ref = "fin_atencion", e.fin, e
        for pid, fin in self.lectores.items():
            if fin < mejor_t:
                mejor_tipo, mejor_t, mejor_ref = "fin_lectura", fin, pid
        return mejor_tipo, mejor_t, mejor_ref

    def _acumular_areas(self, hasta: float) -> None:
        delta = hasta - self.reloj_ant
        if delta <= 0:
            self.reloj_ant = hasta
            return
        self.acum.area_cola += len(self.cola) * delta
        self.acum.area_personas += self.cant_adentro * delta
        for e in self.empleados:
            if not e.libre:
                self.acum.busy[e.idx] += delta
        self.reloj_ant = hasta

    # ------------------------------------------------------------------ eventos
    def _evento_llegada(self) -> str:
        self.acum.n_llegadas += 1

        # programar la proxima llegada (el stream sigue aunque esta sea rechazada)
        rnd, dt = dist.exponencial(self.rng, self.p.media_llegada)
        self._registrar("entre_llegadas", rnd, dt)
        self.prox_llegada = self.reloj + dt

        if not self.abierta:
            self.acum.n_rechazadas += 1
            self._sorteos["resultado_llegada"] = "RECHAZADA (cerrada)"
            return "Llegada (biblioteca cerrada -> rechazada)"

        # admitir: sortear tipo
        rnd_t, nombre = dist.elegir_tipo(self.rng, self.p.p_pedir, self.p.p_devolver)
        self._registrar("tipo", rnd_t, nombre)
        tipo = TipoPersona(nombre)

        persona = Persona(
            id=self.next_id,
            tipo=tipo,
            hora_llegada=self.reloj,
            estado=EstadoPersona.EN_COLA,
            hora_entrada_cola=self.reloj,
        )
        self.next_id += 1
        self.acum.n_admitidas += 1
        self.acum.por_tipo[nombre] += 1
        self.presentes[persona.id] = persona
        self.cola.append(persona)

        self._asignar_empleados()
        return f"Llegada P{persona.id} ({nombre})"

    def _evento_fin_atencion(self, emp: Empleado) -> str:
        tarea = emp.tarea
        persona = emp.liberar()
        desc = f"Fin atencion P{persona.id} ({tarea})"

        if tarea == "Consulta":
            self._finalizar(persona)
        elif tarea == "Devolucion":
            # tanto el que vino a devolver como el lector que vuelve: se retira
            self._finalizar(persona)
        elif tarea == "Prestamo":
            persona.tiene_libro = True
            rnd, retira = dist.decidir_retira(self.rng, self.p.p_retira)
            self._registrar("retira_lee", rnd, "Retira" if retira else "Lee")
            if retira:
                self._finalizar(persona)
            else:
                rnd_l, dur = dist.exponencial(self.rng, self.p.media_lectura)
                self._registrar("lectura", rnd_l, dur)
                persona.estado = EstadoPersona.LEYENDO
                self.lectores[persona.id] = self.reloj + dur
                self.lectores_persona[persona.id] = persona

        self._asignar_empleados()
        return desc

    def _evento_fin_lectura(self, pid: int) -> str:
        persona = self.lectores_persona.pop(pid)
        self.lectores.pop(pid)
        persona.estado = EstadoPersona.EN_COLA_DEVOLUCION
        persona.volvio_a_devolver = True
        persona.hora_entrada_cola = self.reloj
        self.cola.append(persona)
        self._asignar_empleados()
        return f"Fin lectura P{pid} (vuelve a devolver)"

    # ------------------------------------------------------------------ logica comun
    def _asignar_empleados(self) -> None:
        """Mientras haya empleado libre y cola, inicia atenciones."""
        for emp in self.empleados:
            if not emp.libre or not self.cola:
                continue
            persona = self.cola.popleft()

            espera = self.reloj - persona.hora_entrada_cola
            self.acum.sum_espera += espera
            self.acum.n_esperas += 1
            self.acum.max_espera = max(self.acum.max_espera, espera)
            self.acum.esperas.append(espera)

            persona.estado = EstadoPersona.EN_ATENCION

            if persona.volvio_a_devolver:
                tarea, dur = self._servicio_devolucion()
            elif persona.tipo == TipoPersona.DEVOLVER:
                tarea, dur = self._servicio_devolucion()
            elif persona.tipo == TipoPersona.PEDIR:
                rnd, dur = dist.exponencial(self.rng, self.p.media_prestamo)
                self._registrar("prestamo", rnd, dur)
                tarea = "Prestamo"
            else:  # CONSULTA -> Runge-Kutta
                tarea, dur = self._servicio_consulta(persona)

            emp.ocupar(persona, tarea, self.reloj + dur)

    def _servicio_devolucion(self) -> tuple[str, float]:
        rnd, dur = dist.uniforme_simetrica(self.rng, self.p.centro_devolucion, self.p.semi_devolucion)
        self._registrar("devolucion", rnd, dur)
        return "Devolucion", dur

    def _servicio_consulta(self, persona: Persona) -> tuple[str, float]:
        rnd, umbral = dist.uniforme(self.rng, self.p.metic_min, self.p.metic_max)
        self._registrar("umbral_metic", rnd, umbral)
        tabla = integrar_consulta(umbral, self.p.h_rk)
        self.rk.append(ConsultaRK(persona.id, self.reloj, rnd, tabla))
        self.acum.sum_consulta += tabla.duracion
        self.acum.n_consultas += 1
        self.acum.consultas_dur.append(tabla.duracion)
        self._sorteos["consulta_duracion"] = tabla.duracion
        return "Consulta", tabla.duracion

    def _finalizar(self, persona: Persona) -> None:
        permanencia = self.reloj - persona.hora_llegada
        self.acum.sum_permanencia += permanencia
        self.acum.permanencias.append(permanencia)
        self.acum.n_finalizadas += 1
        self.presentes.pop(persona.id, None)

    # ------------------------------------------------------------------ fila del vector de estado
    def _fila(self, descripcion: str) -> dict:
        fila: dict = {
            "iteracion": self.iteracion,
            "evento": descripcion,
            "reloj": round(self.reloj, 4),
        }
        fila.update(self._sorteos)

        for e in self.empleados:
            fila[f"emp{e.idx + 1}_estado"] = "Libre" if e.libre else f"Ocupado ({e.tarea})"
            fila[f"emp{e.idx + 1}_fin"] = "" if e.libre else round(e.fin, 4)

        fila["cola"] = len(self.cola)
        fila["cola_ids"] = ", ".join(f"P{p.id}" for p in self.cola)
        fila["prox_llegada"] = round(self.prox_llegada, 4)
        fila["lectores_fin"] = ", ".join(
            f"P{pid}:{round(fin, 2)}" for pid, fin in sorted(self.lectores.items())
        )
        fila["abierta"] = "Si" if self.abierta else "No (cerrada)"
        fila["adentro"] = self.cant_adentro

        # acumuladores
        fila["ac_llegadas"] = self.acum.n_llegadas
        fila["ac_rechazadas"] = self.acum.n_rechazadas
        fila["ac_finalizadas"] = self.acum.n_finalizadas
        fila["ac_sum_permanencia"] = round(self.acum.sum_permanencia, 4)

        # objetos temporales presentes (snapshot completo del instante)
        fila["_objetos"] = [
            {
                "id": p.id,
                "tipo": p.tipo.value,
                "estado": p.estado.value,
                "hora_llegada": round(p.hora_llegada, 2),
                "tiene_libro": "Si" if p.tiene_libro else "No",
            }
            for p in sorted(self.presentes.values(), key=lambda x: x.id)
        ]
        return fila


def simular(p: Parametros) -> Resultado:
    """Atajo: corre la simulacion con los parametros dados."""
    return Simulador(p).correr()
