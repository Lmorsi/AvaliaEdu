import React from 'react'
import { Link } from 'react-router-dom'

const AboutPage: React.FC = () => {
  return (
    <div style={{ fontFamily: "'Segoe UI', Roboto, sans-serif", backgroundColor: '#f8f9fa', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        :root {
          --primary-color: #3498db;
          --secondary-color: #2c3e50;
          --text-color: #333;
          --light-gray: #f5f5f5;
          --white: #ffffff;
          --shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          --radius: 8px;
          --spacing: 1rem;
        }

        .sobre-wrapper {
          display: flex;
          font-family: 'Segoe UI', Roboto, sans-serif;
          max-width: 1000px;
          margin: 2rem auto;
          position: relative;
          background: white;
          border-radius: 8px;
          box-shadow: var(--shadow);
          flex: 1;
        }

        .sobre-banner {
          width: 3rem;
          background: linear-gradient(to bottom, var(--primary-color), var(--secondary-color));
          border-radius: 8px 0 0 8px;
        }

        .sobre-container {
          flex: 1;
          padding: 2rem;
          position: relative;
        }

        .sobre-header h1 {
          color: var(--secondary-color);
          text-align: center;
          font-size: 2.2rem;
          margin-bottom: 1.5rem;
          padding-bottom: 0.8rem;
          border-bottom: 2px solid var(--primary-color);
        }

        .sobre-section {
          margin-bottom: 2.5rem;
        }

        .sobre-section h2 {
          color: var(--primary-color);
          font-size: 1.5rem;
          margin-bottom: 1.2rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #eee;
        }

        .sobre-lista.recursos {
          margin: 1.5rem 0;
          padding-left: 0;
          list-style: none;
        }

        .recurso-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 1.2rem;
          padding: 0.8rem;
          background-color: var(--light-gray);
          border-radius: var(--radius);
          transition: transform 0.3s ease;
        }

        .recurso-item:hover {
          transform: translateX(5px);
        }

        .recurso-icone {
          color: var(--primary-color);
          font-size: 1.2rem;
          margin-right: 1rem;
          margin-top: 0.2rem;
          min-width: 24px;
        }

        .recurso-texto {
          flex: 1;
        }

        .chamadas-acao {
          background-color: rgba(52, 152, 219, 0.05);
          padding: 1.5rem;
          border-radius: var(--radius);
          margin: 2rem 0;
        }

        .chamada-item {
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
        }

        .chamada-item:last-child {
          margin-bottom: 0;
        }

        .chamada-icone {
          color: var(--primary-color);
          font-size: 1.2rem;
          margin-right: 1rem;
          min-width: 24px;
        }

        .chamada-texto {
          margin: 0;
        }

        .missao {
          background-color: rgba(44, 62, 80, 0.05);
          padding: 1.5rem;
          border-radius: var(--radius);
        }

        .missao-item {
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
        }

        .missao-item.destaque {
          font-style: italic;
          color: var(--secondary-color);
        }

        .missao-icone {
          color: var(--primary-color);
          font-size: 1.2rem;
          margin-right: 1rem;
          min-width: 24px;
        }

        .missao-texto {
          margin: 0;
        }

        .sobre-lista.passos {
          padding-left: 0;
          list-style: none;
        }

        .passo-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 1.2rem;
          padding: 0.8rem;
          background-color: var(--light-gray);
          border-radius: var(--radius);
          transition: transform 0.3s ease;
        }

        .passo-item:hover {
          transform: translateX(5px);
        }

        .passo-numero {
          color: var(--primary-color);
          font-size: 1.2rem;
          font-weight: bold;
          margin-right: 1rem;
          min-width: 24px;
        }

        .passo-texto {
          flex: 1;
        }

        .passo-final {
          margin-top: 1.5rem;
          text-align: center;
          list-style-type: none;
        }

        .passo-conclusao {
          margin: 0;
        }

        .btn {
          display: inline-block;
          background-color: var(--secondary-color);
          color: white !important;
          padding: 0.6rem 1.2rem;
          border-radius: var(--radius);
          text-decoration: none;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .btn:hover {
          background-color: #1a252f;
          transform: translateY(-2px);
        }

        a {
          color: var(--primary-color);
          text-decoration: none;
          transition: color 0.3s;
        }

        a:hover {
          color: var(--secondary-color);
        }

        .site-footer {
          background-color: var(--secondary-color);
          color: var(--white);
          padding: 0.3rem 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          box-shadow: var(--shadow);
          position: relative;
          width: 100%;
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0.5rem;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
        }

        .footer-copyright p {
          margin: 0;
          color: var(--white);
          opacity: 0.9;
        }

        .footer-links {
          display: flex;
          gap: 1.5rem;
        }

        .footer-link {
          color: var(--white);
          text-decoration: none;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          opacity: 0.9;
          position: relative;
          padding: 0.3rem 0;
        }

        .footer-link:hover {
          opacity: 1;
          color: var(--primary-color);
        }

        .footer-link::after {
          content: '';
          position: absolute;
          width: 0;
          height: 2px;
          bottom: 0;
          left: 0;
          background-color: var(--primary-color);
          transition: width 0.3s ease;
        }

        .footer-link:hover::after {
          width: 100%;
        }

        @media (max-width: 768px) {
          .sobre-wrapper {
            flex-direction: column;
            margin: 1rem;
          }

          .sobre-banner {
            width: 100%;
            height: 6px;
            border-radius: 8px 8px 0 0;
          }

          .sobre-container {
            padding: 1.5rem;
          }

          .sobre-header h1 {
            font-size: 1.8rem;
          }

          .sobre-section h2 {
            font-size: 1.3rem;
          }

          .recurso-item,
          .passo-item {
            flex-direction: column;
            align-items: flex-start;
          }

          .recurso-icone,
          .chamada-icone,
          .missao-icone {
            margin-bottom: 0.5rem;
          }

          .footer-container {
            flex-direction: column;
            text-align: center;
            gap: 0.4rem;
          }

          .footer-links {
            flex-direction: column;
            gap: 0.1rem;
          }

          .footer-link::after {
            display: none;
          }
        }
      `}</style>

      <Link to="/" style={{ position: 'fixed', top: '1rem', left: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', background: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textDecoration: 'none', zIndex: 1000 }}>
        <i className="fas fa-chevron-left"></i>
        <span>Voltar</span>
      </Link>

      <div className="sobre-wrapper">
        <div className="sobre-banner"></div>

        <div className="sobre-container">
          <header className="sobre-header">
            <h1>Sobre o Avalia.Edu</h1>
          </header>

          <section className="sobre-section">
            <h2>VISÃO GERAL</h2>
            <p>
              O Avalia.Edu é uma plataforma que busca <strong>simplificar a vida do professor</strong>, unindo criação, correção inteligente e análise de dados de aprendizagem em um único lugar. Com ele, você pode:
            </p>

            <ul className="sobre-lista recursos">
              <li className="recurso-item">
                <i className="fas fa-edit recurso-icone"></i>
                <span className="recurso-texto">
                  <strong>Elaborar avaliações rapidamente</strong>, usando questões próprias ou do banco colaborativo.
                </span>
              </li>
              <li className="recurso-item">
                <i className="fas fa-mobile-alt recurso-icone"></i>
                <span className="recurso-texto">
                  <strong>Corrigir provas em segundos</strong> pelo app, apenas escaneando os cartões-resposta.
                </span>
              </li>
              <li className="recurso-item">
                <i className="fas fa-chart-pie recurso-icone"></i>
                <span className="recurso-texto">
                  <strong>Gerar relatórios automáticos</strong> de desempenho por aluno, turma ou disciplina.
                </span>
              </li>
              <li className="recurso-item">
                <i className="fas fa-random recurso-icone"></i>
                <span className="recurso-texto">
                  <strong>Embaralhar itens</strong> para gerar diferentes cadernos de avaliação.
                </span>
              </li>
            </ul>

            <div className="chamadas-acao">
              <div className="chamada-item">
                <i className="fas fa-user-plus chamada-icone"></i>
                <p className="chamada-texto">
                  <strong>Cadastre-se agora</strong> e experimente como o Avalia.Edu pode transformar sua rotina de correções de avaliações!
                </p>
              </div>
              <div className="chamada-item">
                <i className="fas fa-download chamada-icone"></i>
                <p className="chamada-texto">
                  Disponível para download na <strong>Google Play</strong> e <strong>App Store</strong>, comece hoje mesmo!
                </p>
              </div>
              <div className="chamada-item">
                <i className="fas fa-laptop chamada-icone"></i>
                <p className="chamada-texto">
                  Compatível com todos os dispositivos.
                </p>
              </div>
            </div>
          </section>

          <section className="sobre-section">
            <div className="missao">
              <div className="missao-item">
                <i className="fas fa-chalkboard-teacher missao-icone"></i>
                <p className="missao-texto">
                  <strong>Avalia.Edu foi criado por professores para professores</strong>, com um objetivo claro: diminuir a burocracia e aumentar o foco na aprendizagem.
                </p>
              </div>
              <div className="missao-item destaque">
                <i className="fas fa-heart missao-icone"></i>
                <p className="missao-texto">
                  É gratuito porque acreditamos que a educação de qualidade deve ser acessível a todos.
                </p>
              </div>
            </div>
          </section>

          <section className="sobre-section">
            <h2>Como começar:</h2>
            <ul className="sobre-lista passos">
              <li className="passo-item">
                <span className="passo-numero">1.</span>
                <span className="passo-texto">Cadastre-se no site.</span>
              </li>
              <li className="passo-item">
                <span className="passo-numero">2.</span>
                <span className="passo-texto">Crie avaliações através de itens próprios ou do banco de questões.</span>
              </li>
              <li className="passo-item">
                <span className="passo-numero">3.</span>
                <span className="passo-texto">Corrija através do app no seu celular.</span>
              </li>
              <li className="passo-final">
                <p className="passo-conclusao">
                  <strong>Pronto para simplificar suas correções?</strong><br />
                  <Link to="/cadastro" className="btn" style={{ marginTop: '1rem' }}>
                    Cadastre-se agora e baixe o app!
                  </Link>
                </p>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-copyright">
            <p>&copy; 2025 AvaliaEdu. Todos os direitos reservados.</p>
          </div>
          <div className="footer-links">
            <Link to="/termos" className="footer-link">Termos de uso</Link>
            <Link to="/privacidade" className="footer-link">Política de privacidade</Link>
          </div>
        </div>
      </footer>

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </div>
  )
}

export default AboutPage
