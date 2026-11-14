export const chaveProgresso = 'hubsaude-trilha-integracao';

export function lerProgresso() {
  try {
    const salvo = JSON.parse(window.localStorage.getItem(chaveProgresso));
    return Array.isArray(salvo) ? salvo.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function salvarProgresso(ids) {
  try {
    window.localStorage.setItem(chaveProgresso, JSON.stringify(ids));
  } catch {}
}
