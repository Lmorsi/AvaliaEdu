#!/usr/bin/env python3
"""
Script para testar o servidor OMR localmente.
Uso: python test_server.py
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"
HEALTH_ENDPOINT = f"{BASE_URL}/api/health"
SCAN_ENDPOINT = f"{BASE_URL}/api/omr/scan"

def test_health_check():
    """Testa o health check do servidor."""
    print("\n" + "="*50)
    print("1. TESTANDO HEALTH CHECK")
    print("="*50)

    try:
        response = requests.get(HEALTH_ENDPOINT, timeout=5)
        response.raise_for_status()

        data = response.json()
        print("✅ Servidor respondendo!")
        print("\nResposta:")
        print(json.dumps(data, indent=2, ensure_ascii=False))

        # Verificar status
        if data.get("status") == "ok":
            print("\n✅ Status: OK")
            print(f"   Serviço: {data.get('service')}")
            print(f"   Versão: {data.get('version')}")
            print(f"   OpenCV: {'✅' if data.get('opencv_available') else '❌'}")
            print(f"   PyZBar: {'✅' if data.get('pyzbar_available') else '❌'}")
            return True
        else:
            print(f"\n❌ Status: {data.get('status')}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ Não consegui conectar ao servidor!")
        print("   Certifique-se que está rodando: python main.py")
        return False
    except Exception as e:
        print(f"❌ Erro: {e}")
        return False


def test_swagger_docs():
    """Informa URL da documentação Swagger."""
    print("\n" + "="*50)
    print("2. DOCUMENTAÇÃO SWAGGER")
    print("="*50)
    print(f"\nAcesse a documentação interativa:")
    print(f"  {BASE_URL}/docs")
    print(f"\nOu em formato ReDoc:")
    print(f"  {BASE_URL}/redoc")


def test_endpoints_info():
    """Mostra informações sobre endpoints disponíveis."""
    print("\n" + "="*50)
    print("3. ENDPOINTS DISPONÍVEIS")
    print("="*50)

    print("\n📍 Health Check:")
    print(f"   GET {HEALTH_ENDPOINT}")
    print("   Uso: Verifica se o servidor está funcionando")

    print("\n📍 Processar Gabarito:")
    print(f"   POST {SCAN_ENDPOINT}")
    print("   Parâmetros:")
    print("     - photo: arquivo JPEG ou PNG (obrigatório)")
    print("     - debug: booleano para incluir imagens de debug (opcional)")

    print("\n📍 Exemplo com cURL:")
    print("   curl -X POST \\")
    print(f"     -F 'photo=@meu-gabarito.jpg' \\")
    print(f"     {SCAN_ENDPOINT}")

    print("\n📍 Exemplo com Python:")
    print("""
    import requests

    with open('gabarito.jpg', 'rb') as f:
        files = {'photo': f}
        response = requests.post('http://localhost:8000/api/omr/scan', files=files)
        print(response.json())
    """)


def test_cors_info():
    """Mostra informações sobre CORS."""
    print("\n" + "="*50)
    print("4. CONFIGURAÇÃO CORS")
    print("="*50)

    print("\nOrigens permitidas (verificar .env):")
    print("   - Desenvolvimento: http://localhost:5173")
    print("   - Produção: https://seu-frontend.vercel.app")
    print("   - Produção: https://seu-servidor.railway.app")


def main():
    """Função principal."""
    print("\n╔" + "="*48 + "╗")
    print("║" + " TESTE DO SERVIDOR OMR - AvaliaEdu ".center(48) + "║")
    print("╚" + "="*48 + "╝")

    # Teste 1: Health check
    health_ok = test_health_check()

    if not health_ok:
        print("\n⚠️  Não foi possível testar. Inicie o servidor com:")
        print("   python main.py")
        sys.exit(1)

    # Testes informativos
    test_swagger_docs()
    test_endpoints_info()
    test_cors_info()

    print("\n" + "="*50)
    print("✅ TESTES COMPLETADOS")
    print("="*50)
    print("\nPróximos passos:")
    print("1. Acesse http://localhost:8000/docs para testar endpoints")
    print("2. Envie uma foto de um gabarito para processar")
    print("3. Verifique a resposta com QR, fiduciais e bolhas detectadas")
    print()


if __name__ == "__main__":
    main()
