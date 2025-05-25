// src/utils/getSaludoPorLada.ts
import { DateTime } from "luxon";

const zonaPorLada: Record<string, string> = {
  "1": "America/New_York", // USA
  "52": "America/Mexico_City",
  "54": "America/Argentina/Buenos_Aires",
  "55": "America/Mexico_City",
  "56": "America/Mexico_City",
  "57": "America/Bogota",
  "58": "America/Caracas"
};

export function obtenerSaludoPorLada(numero: string): string {
  const match = numero.match(/^\+?(\d{1,3})/);
  const lada = match ? match[1] : "52";
  const zona = zonaPorLada[lada] || "America/Mexico_City";

  const horaLocal = DateTime.now().setZone(zona).hour;

  if (horaLocal >= 6 && horaLocal < 12) {
    return "¡Buenos días!";
  } else if (horaLocal >= 12 && horaLocal < 20) {
    return "¡Buenas tardes!";
  } else {
    return "¡Buenas noches!";
  }
}
