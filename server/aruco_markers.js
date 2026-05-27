// Marcadores ArUco DICT_4X4_50 (IDs 0, 1, 2, 3)
// Estes marcadores são padrões binários 4x4 com bordas
// Cada marcador é único e identificável

// Função para criar SVG de marcador ArUco
// Pattern: 6x6 com borda preta (1 pixel de borda em cada lado)
// Inner: 4x4 pattern de dados
function createArUcoSVG(pattern) {
  const size = 60; // viewBox size
  const cellSize = size / 6; // 6x6 grid (borda + 4x4 dados + borda)

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;

  // Fundo branco
  svg += `<rect x="0" y="0" width="${size}" height="${size}" fill="white"/>`;

  // Borda preta (toda volta)
  svg += `<rect x="0" y="0" width="${size}" height="${cellSize}" fill="black"/>`; // top
  svg += `<rect x="0" y="${size - cellSize}" width="${size}" height="${cellSize}" fill="black"/>`; // bottom
  svg += `<rect x="0" y="0" width="${cellSize}" height="${size}" fill="black"/>`; // left
  svg += `<rect x="${size - cellSize}" y="0" width="${cellSize}" height="${size}" fill="black"/>`; // right

  // Padrão interno 4x4
  const offset = cellSize; // offset da borda
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (pattern[row][col] === 1) {
        const x = offset + col * cellSize;
        const y = offset + row * cellSize;
        svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
      }
    }
  }

  svg += '</svg>';
  return svg;
}

// Padrões ArUco DICT_4X4_50 para IDs 0, 1, 2, 3
// Estes padrões são extraídos da documentação oficial do OpenCV
const ARUCO_PATTERNS = {
  // ID 0: Top-Left
  TL: [
    [0, 0, 0, 1],
    [0, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 0, 1, 1]
  ],
  // ID 1: Top-Right
  TR: [
    [0, 1, 0, 0],
    [1, 0, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 1]
  ],
  // ID 2: Bottom-Left
  BL: [
    [0, 0, 1, 0],
    [0, 1, 0, 0],
    [1, 0, 0, 0],
    [0, 1, 1, 1]
  ],
  // ID 3: Bottom-Right
  BR: [
    [0, 1, 1, 0],
    [1, 0, 0, 1],
    [1, 0, 0, 0],
    [0, 1, 1, 0]
  ]
};

// Exportar função e padrões
module.exports = {
  createArUcoSVG,
  ARUCO_PATTERNS
};
