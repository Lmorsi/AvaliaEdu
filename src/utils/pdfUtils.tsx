// Função para obter letras das alternativas
export const getAlternativeLetter = (index: number) => {
  return String.fromCharCode(65 + index) // A, B, C, D, E, F, G, H, I, J
}