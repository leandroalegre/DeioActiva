// El DNI se guarda solo con digitos ("12.345.678" y "12345678" son el mismo), asi se puede
// ingresar con o sin puntos tanto al cargarlo como al iniciar sesion.
export function normalizeDni(value: string | null | undefined): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

// Un DNI argentino tiene 7 u 8 digitos; se aceptan de 6 a 10 por documentos viejos/extranjeros.
export const DNI_PATTERN = /^\s*\d{1,3}(\.?\d{3}){1,2}\s*$|^\s*\d{6,10}\s*$/;
