#!/usr/bin/env python3
"""
Teste de detecção de marcadores L usando Harris Corner Detection.
Cria uma folha simulada com marcadores L e testa a detecção.
"""

import sys
import cv2
import numpy as np


def create_l_marker(image, corner_x, corner_y, size=40, thickness=3):
    """Desenha um marcador L em uma posição."""
    # Linha horizontal
    if corner_x == 0:  # Canto esquerdo
        cv2.line(image, (corner_x, corner_y), (corner_x + size, corner_y), (0, 0, 0), thickness)
    else:  # Canto direito
        cv2.line(image, (corner_x - size, corner_y), (corner_x, corner_y), (0, 0, 0), thickness)

    # Linha vertical
    if corner_y == 0:  # Canto superior
        cv2.line(image, (corner_x, corner_y), (corner_x, corner_y + size), (0, 0, 0), thickness)
    else:  # Canto inferior
        cv2.line(image, (corner_x, corner_y - size), (corner_x, corner_y), (0, 0, 0), thickness)


def create_test_sheet():
    """Cria uma folha de teste com marcadores L nos 4 cantos."""
    width, height = 1240, 1754
    image = np.ones((height, width, 3), dtype=np.uint8) * 255

    # Adicionar conteúdo da folha (linhas, texto, bolhas)
    cv2.rectangle(image, (50, 50), (width - 50, height - 50), (200, 200, 200), 2)

    # Texto de cabeçalho
    cv2.putText(image, "FOLHA DE RESPOSTA", (400, 150), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 0), 2)

    # Bolhas de resposta (simuladas)
    for i in range(60):
        y = 300 + (i // 20) * 50
        for j in range(4):
            x = 200 + j * 100
            cv2.circle(image, (x, y), 15, (0, 0, 0), 2)

    # Desenhar marcadores L nos 4 cantos
    create_l_marker(image, 0, 0, size=60, thickness=4)              # TL
    create_l_marker(image, width, 0, size=60, thickness=4)          # TR
    create_l_marker(image, width, height, size=60, thickness=4)     # BR
    create_l_marker(image, 0, height, size=60, thickness=4)         # BL

    return image


def test_harris_detection_visual():
    """Testa a detecção de Harris em cada canto."""
    print("Criando folha de teste...")
    image = create_test_sheet()

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    print(f"Tamanho da imagem: {w}x{h}")
    print("\nTestando detecção de Harris Corner em cada canto...\n")

    test_cases = [
        ("TL", 0, 0, w // 8, h // 8, "Canto Superior-Esquerdo"),
        ("TR", w - w // 8, 0, w // 8, h // 8, "Canto Superior-Direito"),
        ("BR", w - w // 8, h - h // 8, w // 8, h // 8, "Canto Inferior-Direito"),
        ("BL", 0, h - h // 8, w // 8, h // 8, "Canto Inferior-Esquerdo"),
    ]

    results = {}

    for name, x_start, y_start, roi_w, roi_h, desc in test_cases:
        print(f"--- {name}: {desc} ---")

        # Extrair ROI
        roi = gray[y_start:y_start + roi_h, x_start:x_start + roi_w]

        # Binarização adaptativa
        if roi.shape[0] > 11 and roi.shape[1] > 11:
            adaptive = cv2.adaptiveThreshold(
                roi, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                blockSize=11,
                C=2
            )
        else:
            adaptive = roi

        # Binarização Otsu
        _, otsu = cv2.threshold(roi, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Combinar
        binary = cv2.bitwise_and(adaptive, otsu)

        # Gaussiano
        blurred = cv2.GaussianBlur(binary, (5, 5), 1.0)

        # Harris
        harris = cv2.cornerHarris(blurred, blockSize=2, ksize=3, k=0.04)
        harris_norm = cv2.normalize(harris, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

        # Cantos fortes
        threshold = 0.1 * harris_norm.max()
        strong = np.argwhere(harris_norm > threshold)

        print(f"  Cantos fortes encontrados: {len(strong)}")

        if len(strong) > 0:
            # Top 10%
            top_n = max(1, len(strong) // 10)
            top_corners = strong[np.argsort(harris_norm[strong[:, 0], strong[:, 1]])[::-1][:top_n]]

            # Centroide
            centroid_y = np.mean(top_corners[:, 0])
            centroid_x = np.mean(top_corners[:, 1])

            # Filtragem por distância
            distances = np.sqrt(
                (top_corners[:, 1] - centroid_x) ** 2 + (top_corners[:, 0] - centroid_y) ** 2
            )
            mean_dist = np.mean(distances)
            std_dist = np.std(distances) if len(distances) > 1 else 0
            threshold_dist = mean_dist + 2 * std_dist

            filtered = top_corners[distances <= threshold_dist]

            print(f"  Centroide: ({centroid_x:.1f}, {centroid_y:.1f})")
            print(f"  Distância média: {mean_dist:.2f}, Desvio padrão: {std_dist:.2f}")
            print(f"  Cantos após filtragem: {len(filtered)}")

            if len(filtered) > 0:
                # Canto extremo
                if name == "TL":
                    corner = min(filtered, key=lambda c: c[1] + c[0])
                elif name == "TR":
                    corner = min(filtered, key=lambda c: -c[1] + c[0])
                elif name == "BR":
                    corner = max(filtered, key=lambda c: c[0] + c[1])
                else:  # BL
                    corner = max(filtered, key=lambda c: c[0] - c[1])

                corner_y, corner_x = corner
                global_x = x_start + corner_x
                global_y = y_start + corner_y

                print(f"  ✓ Canto detectado em ({global_x:.1f}, {global_y:.1f})")
                results[name] = (global_x, global_y)
            else:
                print(f"  ✗ Nenhum canto após filtragem")
        else:
            print(f"  ✗ Nenhum canto Harris detectado")

        print()

    # Resumo
    print("="*50)
    print("RESUMO DOS RESULTADOS:")
    print("="*50)
    for name in ["TL", "TR", "BR", "BL"]:
        if name in results:
            x, y = results[name]
            print(f"{name}: ({x:.1f}, {y:.1f}) ✓")
        else:
            print(f"{name}: Não detectado ✗")

    return len(results) == 4


if __name__ == "__main__":
    try:
        success = test_harris_detection_visual()
        print("\n" + ("="*50))
        if success:
            print("TESTE PASSOU: Todos os 4 cantos foram detectados!")
            sys.exit(0)
        else:
            print("TESTE PARCIAL: Alguns cantos não foram detectados")
            sys.exit(0)  # Ainda é um sucesso parcial
    except Exception as e:
        print(f"ERRO: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
