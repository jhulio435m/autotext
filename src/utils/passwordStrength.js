export function getPasswordStrength(password) {
  const value = String(password || '');
  let score = 0;
  if (value.length >= 12) score += 1;
  if (value.length >= 16) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (!value) return { score: 0, label: 'Sin contrasena', tone: 'slate', percent: 0 };
  if (score <= 2) return { score, label: 'Debil', tone: 'rose', percent: 33 };
  if (score <= 4) return { score, label: 'Media', tone: 'amber', percent: 66 };
  return { score, label: 'Fuerte', tone: 'emerald', percent: 100 };
}

export function createSuggestedPassword() {
  const words = ['Andes', 'Plano', 'Calculo', 'Vector', 'Obra', 'Informe'];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${pick()}-${pick()}-${number}!`;
}
