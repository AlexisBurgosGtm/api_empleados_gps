export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const getTodayInputValue = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const formatFechaDisplay = (fecha) => {
  const [year, month, day] = String(fecha ?? '').split('-');
  if (!year || !month || !day) {
    return fecha;
  }
  return `${day}/${month}/${year}`;
};

export const parseJsonResponse = async (response) => {
  const text = await response.text();
  if (!text.trim()) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Respuesta invalida del servidor');
  }
};
