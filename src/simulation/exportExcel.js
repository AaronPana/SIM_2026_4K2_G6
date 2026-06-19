// Exporta el resultado de la simulación a un archivo Excel (.xlsx) con tres hojas:
// "Vector de Estado", "Métricas" y "Parámetros".
import * as XLSX from "xlsx";

// Texto legible de los objetos temporales presentes en una fila.
function objetosPresentes(fila) {
  const personas = (fila.personasPresentes || []).map(
    (p) => `P${p.id}[${p.tipo}${p.destino ? " / " + p.destino : ""}]`,
  );
  const lectores = (fila.lectoresPresentes || []).map((l) => `P${l.id}[LEYENDO]`);
  return [...personas, ...lectores].join("; ");
}

// Convierte una fila del vector de estado a un objeto plano con encabezados en español.
function mapearFila(fila) {
  const id = fila.eventoPersonaId || fila.personaId;
  return {
    "Iteración": fila.iteracion,
    "Reloj (min)": fila.reloj,
    "Evento": id ? `${fila.evento} C${id}` : fila.evento,
    "ID Persona": id ? `C${id}` : "",
    "RND actividad": fila.rndTipo ?? "",
    "Actividad": fila.tipoPersona ?? "",
    "RND llegada": fila.rndLlegada ?? "",
    "Próxima llegada": fila.proxLlegada ?? "",
    "RND meticulosidad": fila.rndMeticulosidad ?? "",
    "Meticulosidad (M₀)": fila.meticulosidad ?? "",
    "RK (pasos)": fila.tablaRK ? fila.tablaRK.length : "",
    "RND duración": fila.rndDuracion ?? "",
    "Duración atención (min)": fila.duracionAtencion ?? "",
    "Empleado asignado": fila.empleadoAsignado ?? "",
    "RND destino": fila.rndDestino ?? "",
    "Destino": fila.destino ?? "",
    "RND lectura": fila.rndLectura ?? "",
    "Tiempo lectura (min)": fila.tiempoLectura ?? "",
    "Cola mostrador": fila.largoColaMostrador,
    "Empleado 1": fila.empleado1Atendiendo ? "Ocupado" : "Libre",
    "Empleado 1 libre en": fila.empleado1LibreEn ?? "",
    "Empleado 2": fila.empleado2Atendiendo ? "Ocupado" : "Libre",
    "Empleado 2 libre en": fila.empleado2LibreEn ?? "",
    "Personas en biblioteca": fila.personasEnBiblioteca,
    "Biblioteca cerrada": fila.bibliotecaCerrada ? "SÍ" : "NO",
    "Lectores en sala": fila.lectoresEnSala,
    "Permanencia acum.": fila.sumaTiemposPermanencia ?? "",
    "Finalizadas acum.": fila.personasFinalizadas ?? "",
    "Rechazadas acum.": fila.personasCerrada ?? "",
    "Objetos presentes": objetosPresentes(fila),
  };
}

function hojaMetricas(resultado) {
  const m = resultado.metricas;
  return [
    ["Métrica", "Valor"],
    ["Iteraciones realizadas", resultado.iteracionesRealizadas],
    ["Tiempo simulado (min)", resultado.relojFinal],
    ["— Obligatorias —", ""],
    ["Promedio de permanencia (min)", m.promedioPermanencia],
    ["% llega con biblioteca cerrada", m.porcentajePersonasConBibliotecaCerrada],
    ["— Adicionales (Grupo 6) —", ""],
    ["% ocupación Empleado 1", m.porcentajeOcupacionEmpleado1],
    ["Cantidad promedio en cola", m.cantidadPromedioClientesEnCola],
    ["Tiempo máx. espera en cola (min)", m.tiempoMaximoPermanenciaEnCola],
    ["Tiempo mín. permanencia (min)", m.tiempoMinimoPermanenciaEnBiblioteca],
    ["Personas que se quedaron a leer", m.cantidadPersonasQueSeQuedaronALeer],
    ["% ocio Empleado 2", m.porcentajeTiempoOcioEmpleado2],
    ["— Totales —", ""],
    ["Total personas", m.totalPersonas],
    ["Atendidas / finalizadas", m.personasFinalizadas],
    ["Rechazadas por capacidad", m.personasCerrada],
    ["Pidieron libro", m.totalPidieronLibro],
    ["Devolvieron", m.totalDevolvieron],
    ["Consultaron", m.totalConsultas],
    ["Se retiraron con libro", m.totalSeRetiraron],
  ];
}

const ETIQUETAS_PARAMS = {
  mediaLlegada: "Media entre llegadas (min)",
  pctPideLibro: "% Pide libro",
  pctDevuelve: "% Devuelve",
  mediaPrestamo: "Media préstamo (min)",
  devolucionMin: "Devolución mín (min)",
  devolucionMax: "Devolución máx (min)",
  meticulosidadMin: "Meticulosidad mín",
  meticulosidadMax: "Meticulosidad máx",
  hRK: "Paso h (RK4)",
  pctSeRetira: "% se retira con libro",
  mediaLecturaInstalaciones: "Media lectura en sala (min)",
  capacidadMax: "Capacidad máxima",
  tiempoMaximo: "Tiempo máx. (min)",
  maxIteraciones: "Máx. iteraciones",
};

function hojaParametros(params) {
  const filas = [["Parámetro", "Valor"]];
  Object.entries(params).forEach(([clave, valor]) => {
    filas.push([ETIQUETAS_PARAMS[clave] || clave, valor]);
  });
  return filas;
}

// Genera y descarga el archivo Excel con toda la simulación.
export function exportarSimulacionExcel(resultado, params) {
  const wb = XLSX.utils.book_new();

  const wsVector = XLSX.utils.json_to_sheet(resultado.filas.map(mapearFila));
  wsVector["!cols"] = [
    { wch: 9 }, { wch: 11 }, { wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 9 }, { wch: 12 },
    { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 16 },
    { wch: 14 }, { wch: 11 }, { wch: 16 }, { wch: 11 }, { wch: 16 }, { wch: 18 },
    { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsVector, "Vector de Estado");

  const wsMetricas = XLSX.utils.aoa_to_sheet(hojaMetricas(resultado));
  wsMetricas["!cols"] = [{ wch: 36 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsMetricas, "Métricas");

  const wsParams = XLSX.utils.aoa_to_sheet(hojaParametros(params));
  wsParams["!cols"] = [{ wch: 30 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsParams, "Parámetros");

  XLSX.writeFile(wb, "simulacion-biblioteca.xlsx");
}
