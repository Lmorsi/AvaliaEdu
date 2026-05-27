#!/usr/bin/env python3
"""
Gera marcadores ArUco para o cartão resposta.
Os marcadores são salvos como arquivos PNG que serão embarcados no PDF.
"""

import cv2
import numpy as np
import os

# Dicionário ArUco a ser usado (DICT_4X4_50 = 50 marcadores únicos de 4x4)
# Este dicionário oferece boa detecção e IDs suficientes para 4 marcadores
ARUCO_DICT = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)

# IDs dos marcadores para cada canto (usaremos IDs 0, 1, 2, 3)
# Cada marcador é único, permitindo identificação automática do canto
MARKER_IDS = {
    'TL': 0,  # Top-Left
    'TR': 1,  # Top-Right
    'BL': 2,  # Bottom-Left
    'BR': 3   # Bottom-Right
}

# Tamanho do marcador em pixels (para geração)
# Este tamanho é para a imagem PNG, não o tamanho final no PDF
MARKER_SIZE_PIXELS = 200

# Diretório de saída
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

def generate_aruco_marker(marker_id: int, size: int = 200) -> np.ndarray:
    """
    Gera uma imagem de um marcador ArUco.

    Args:
        marker_id: ID do marcador (0-49 para DICT_4X4_50)
        size: Tamanho da imagem em pixels

    Returns:
        Imagem numpy array do marcador
    """
    marker_image = cv2.aruco.generateImageMarker(ARUCO_DICT, marker_id, size)
    return marker_image

def save_marker_as_png(marker_image: np.ndarray, filename: str):
    """
    Salva o marcador como arquivo PNG.
    """
    filepath = os.path.join(OUTPUT_DIR, filename)
    cv2.imwrite(filepath, marker_image)
    print(f"Salvo: {filepath}")
    return filepath

def convert_to_base64_svg(marker_image: np.ndarray, size_mm: int = 10) -> str:
    """
    Converte o marcador para SVG embutido (fallback, não recomendado).

    Para melhor qualidade, usaremos PNGs separados.
    """
    height, width = marker_image.shape
    assert height == width, "Marcador deve ser quadrado"

    # Escalar para valores 0-255
    marker_normalized = (marker_image * 255).astype(np.uint8)

    # Criar SVG com pixels como retângulos
    pixel_size = 60.0 / height  # Escalar para viewBox 60x60
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">'

    for y in range(height):
        for x in range(width):
            if marker_normalized[y, x] < 128:  # Pixel preto
                px = x * pixel_size
                py = y * pixel_size
                svg += f'<rect x="{px:.2f}" y="{py:.2f}" width="{pixel_size:.2f}" height="{pixel_size:.2f}" fill="black"/>'

    svg += '</svg>'
    return svg

def generate_all_markers():
    """
    Gera todos os 4 marcadores ArUco necessários.
    """
    print("Gerando marcadores ArUco...")
    print(f"Dicionário: DICT_4X4_50")
    print(f"Tamanho: {MARKER_SIZE_PIXELS}x{MARKER_SIZE_PIXELS} pixels")
    print()

    for corner, marker_id in MARKER_IDS.items():
        # Gerar marcador
        marker_image = generate_aruco_marker(marker_id, MARKER_SIZE_PIXELS)

        # Salvar como PNG
        filename = f"aruco_{corner}.png"
        save_marker_as_png(marker_image, filename)

        # Mostrar informações
        unique_values = np.unique(marker_image)
        print(f"Marcador {corner} (ID {marker_id}): {len(unique_values)} valores únicos")

    print()
    print(f"Arquivos gerados no diretório: {OUTPUT_DIR}")
    print(f"Use estes arquivos PNG no PDF do cartão resposta.")

if __name__ == "__main__":
    generate_all_markers()
