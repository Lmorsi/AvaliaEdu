import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const HowItWorksPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", backgroundColor: '#f8f9fa', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        :root {
          --azul-primario: #3498db;
          --azul-escuro: #2c3e50;
          --cinza-claro: #f5f5f5;
          --branco: #ffffff;
          --sombra: 0 4px 12px rgba(0,0,0,0.1);
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f8f9fa;
          margin: 0;
          padding: 0;
        }

        .funciona-wrapper {
          display: flex;
          max-width: 1400px;
          margin: 2rem auto;
          background: var(--branco);
          border-radius: 10px;
          box-shadow: var(--sombra);
          overflow: hidden;
          position: relative;
          flex: 1;
        }

        .funciona-banner {
          width: 3rem;
          background: linear-gradient(to bottom, var(--azul-primario), var(--azul-escuro));
        }

        .funciona-container {
          flex: 1;
          padding: 3rem 4rem;
        }

        .funciona-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .funciona-header h1 {
          color: var(--azul-escuro);
          font-size: 2.5rem;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .funciona-header i {
          margin-right: 15px;
          color: var(--azul-primario);
        }

        .funciona-intro {
          font-size: 1.2rem;
          color: #666;
          max-width: 800px;
          margin: 0 auto;
        }

        .fluxo-section {
          margin: 3rem 0;
        }

        .fluxo-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 2rem;
          position: relative;
        }

        .fluxo-numero {
          background-color: var(--azul-primario);
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1.5rem;
          flex-shrink: 0;
          font-weight: bold;
          position: relative;
          z-index: 2;
        }

        .fluxo-content {
          flex: 1;
          background: var(--cinza-claro);
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .fluxo-content h3 {
          color: var(--azul-escuro);
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.4rem;
          display: flex;
          align-items: center;
        }

        .fluxo-content i {
          margin-right: 10px;
          color: var(--azul-primario);
        }

        .fluxo-content ul {
          margin: 1rem 0 0 1.5rem;
          padding: 0;
        }

        .fluxo-content li {
          margin-bottom: 0.5rem;
        }

        .fluxo-imagem {
          background-color: #eee;
          height: 180px;
          border-radius: 6px;
          margin-top: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
          font-style: italic;
        }

        .seta-fluxo {
          text-align: center;
          color: var(--azul-primario);
          margin: -1rem 0 1rem 1.4rem;
          font-size: 1.2rem;
        }

        .destaques-section {
          margin: 4rem 0;
        }

        .destaques-section h2 {
          color: var(--azul-escuro);
          font-size: 1.8rem;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .destaques-section h2 i {
          margin-right: 15px;
          color: var(--azul-primario);
        }

        .destaques-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .destaque-card {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          box-shadow: var(--sombra);
          border-top: 4px solid var(--azul-primario);
          transition: transform 0.3s ease;
        }

        .destaque-card:hover {
          transform: translateY(-5px);
        }

        .destaque-card i {
          font-size: 2.5rem;
          color: var(--azul-primario);
          margin-bottom: 1rem;
          display: block;
        }

        .destaque-card h3 {
          color: var(--azul-escuro);
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.3rem;
        }

        .destaque-card ul {
          margin: 1rem 0 0 1.5rem;
          padding: 0;
        }

        .destaque-card li {
          margin-bottom: 0.5rem;
        }

        .faq-section {
          margin: 4rem 0;
        }

        .faq-section h2 {
          color: var(--azul-escuro);
          font-size: 1.8rem;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .faq-section h2 i {
          margin-right: 15px;
          color: var(--azul-primario);
        }

        .faq-item {
          margin-bottom: 1rem;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .faq-pergunta {
          width: 100%;
          text-align: left;
          background: var(--cinza-claro);
          border: none;
          padding: 1.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--azul-escuro);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: background 0.3s;
        }

        .faq-pergunta:hover {
          background: #e9ecef;
        }

        .faq-pergunta i {
          margin-left: 10px;
          transition: transform 0.3s;
        }

        .faq-pergunta i.rotated {
          transform: rotate(180deg);
        }

        .faq-resposta {
          background: white;
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.4s ease, padding 0.4s ease;
          padding: 0 1.5rem;
        }

        .faq-resposta.open {
          max-height: 300px;
          padding: 1.5rem;
        }

        .faq-resposta p {
          margin: 0;
          line-height: 1.6;
        }

        .cta-section {
          text-align: center;
          margin: 4rem 0 2rem;
          padding: 2rem;
          background: linear-gradient(135deg, rgba(52, 152, 219, 0.1), rgba(44, 62, 80, 0.1));
          border-radius: 10px;
        }

        .cta-section h2 {
          color: var(--azul-escuro);
          font-size: 1.8rem;
          margin-bottom: 2rem;
        }

        .cta-buttons {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          padding: 0.8rem 1.8rem;
          border-radius: 6px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .btn i {
          margin-right: 10px;
        }

        .btn-cta {
          background-color: var(--azul-primario);
          color: white;
        }

        .btn-cta:hover {
          background-color: #2980b9;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(41, 128, 185, 0.3);
        }

        .btn-secundario {
          background-color: var(--azul-escuro);
          color: white;
        }

        .btn-secundario:hover {
          background-color: #1a252f;
          transform: translateY(-2px);
        }

        .site-footer {
          background-color: var(--azul-escuro);
          color: var(--branco);
          padding: 0.3rem 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          box-shadow: var(--sombra);
          position: relative;
          width: 100%;
        }

        .footer-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0.5rem 2rem;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
        }

        .footer-copyright p {
          margin: 0;
          color: var(--branco);
          opacity: 0.9;
        }

        .footer-links {
          display: flex;
          gap: 1.5rem;
        }

        .footer-link {
          color: var(--branco);
          text-decoration: none;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          opacity: 0.9;
          position: relative;
          padding: 0.3rem 0;
        }

        .footer-link:hover {
          opacity: 1;
          color: var(--azul-primario);
        }

        .footer-link::after {
          content: '';
          position: absolute;
          width: 0;
          height: 2px;
          bottom: 0;
          left: 0;
          background-color: var(--azul-primario);
          transition: width 0.3s ease;
        }

        .footer-link:hover::after {
          width: 100%;
        }

        @media (max-width: 768px) {
          .funciona-wrapper {
            flex-direction: column;
            margin: 1rem;
          }

          .funciona-banner {
            width: 100%;
            height: 8px;
          }

          .funciona-container {
            padding: 2rem 1.5rem;
          }

          .fluxo-item {
            flex-direction: column;
          }

          .fluxo-numero {
            margin-bottom: 1rem;
            margin-right: 0;
          }

          .seta-fluxo {
            margin: 0.5rem 0;
          }

          .cta-buttons {
            flex-direction: column;
            max-width: 82%;
            margin: 0 auto;
          }

          .btn {
            width: 100%;
            justify-content: center;
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

      <div className="funciona-wrapper">
        <div className="funciona-banner"></div>

        <div className="funciona-container">
          <header className="funciona-header">
            <h1>
              <i className="fas fa-question-circle"></i>
              Como Funciona
            </h1>
            <p className="funciona-intro">Transforme sua rotina de correções em poucos passos</p>
          </header>

          <section className="fluxo-section">
            <div className="fluxo-item">
              <div className="fluxo-numero">1</div>
              <div className="fluxo-content">
                <h3>
                  <i className="fas fa-sign-in-alt"></i>
                  Acesso
                </h3>
                <p>Faça login ou cadastre-se gratuitamente</p>
              </div>
            </div>

            <div className="seta-fluxo">
              <i className="fas fa-arrow-down"></i>
            </div>

            <div className="fluxo-item">
              <div className="fluxo-numero">2</div>
              <div className="fluxo-content">
                <h3>
                  <i className="fas fa-edit"></i>
                  Criação
                </h3>
                <ul>
                  <li>Acesse a aba "Avaliações"</li>
                  <li>Use questões do banco ou crie novas</li>
                  <li>Filtre por disciplina, série e tipo</li>
                </ul>
              </div>
            </div>

            <div className="seta-fluxo">
              <i className="fas fa-arrow-down"></i>
            </div>

            <div className="fluxo-item">
              <div className="fluxo-numero">3</div>
              <div className="fluxo-content">
                <h3>
                  <i className="fas fa-sliders-h"></i>
                  Personalização
                </h3>
                <ul>
                  <li>Embaralhe itens para versões diferentes</li>
                  <li>Escolha layout (1 ou 2 colunas)</li>
                  <li>Adicione cabeçalho personalizado</li>
                </ul>
              </div>
            </div>

            <div className="seta-fluxo">
              <i className="fas fa-arrow-down"></i>
            </div>

            <div className="fluxo-item">
              <div className="fluxo-numero">4</div>
              <div className="fluxo-content">
                <h3>
                  <i className="fas fa-print"></i>
                  Aplicação
                </h3>
                <p>Exporte para PDF e imprima</p>
              </div>
            </div>

            <div className="seta-fluxo">
              <i className="fas fa-arrow-down"></i>
            </div>

            <div className="fluxo-item">
              <div className="fluxo-numero">5</div>
              <div className="fluxo-content">
                <h3>
                  <i className="fas fa-check-circle"></i>
                  Correção
                </h3>
                <ul>
                  <li>Use o app para escanear cartões-resposta</li>
                  <li>Ou digite as respostas manualmente</li>
                </ul>
              </div>
            </div>

            <div className="seta-fluxo">
              <i className="fas fa-arrow-down"></i>
            </div>

            <div className="fluxo-item">
              <div className="fluxo-numero">6</div>
              <div className="fluxo-content">
                <h3>
                  <i className="fas fa-chart-bar"></i>
                  Análise
                </h3>
                <ul>
                  <li>Visualize desempenho individual</li>
                  <li>Compare resultados entre turmas</li>
                  <li>Identifique dificuldades de aprendizagem</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="destaques-section">
            <h2>
              <i className="fas fa-star"></i>
              Destaques
            </h2>

            <div className="destaques-grid">
              <div className="destaque-card">
                <i className="fas fa-database"></i>
                <h3>Banco de Questões</h3>
                <ul>
                  <li>Itens editáveis</li>
                  <li>Busca por componente curricular e ano/série</li>
                  <li>Sistema colaborativo</li>
                </ul>
              </div>

              <div className="destaque-card">
                <i className="fas fa-chart-pie"></i>
                <h3>Relatórios Inteligentes</h3>
                <ul>
                  <li>Gráficos por habilidade</li>
                  <li>Identificação de dificuldades</li>
                  <li>Exportação de dados</li>
                </ul>
              </div>

              <div className="destaque-card">
                <i className="fas fa-shield-alt"></i>
                <h3>Controle de Qualidade</h3>
                <ul>
                  <li>Revisão pela comunidade</li>
                  <li>Exclusão de conteúdos impróprios</li>
                  <li>Sugestão de Elaboração de itens baseada no Manual de elaboração de item do INEP</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="faq-section">
            <h2>
              <i className="fas fa-question"></i>
              Dúvidas Frequentes
            </h2>

            <div className="faq-item">
              <button className="faq-pergunta" onClick={() => toggleFaq(0)}>
                <span>Como criar meu primeiro item?</span>
                <i className={`fas fa-chevron-down ${openFaq === 0 ? 'rotated' : ''}`}></i>
              </button>
              <div className={`faq-resposta ${openFaq === 0 ? 'open' : ''}`}>
                <p>Acesse "Meus Itens" &gt; "Novo Item" e preencha os campos. Recomendamos seguir o manual de elaboração de itens do INEP para criar itens de qualidade.</p>
              </div>
            </div>

            <div className="faq-item">
              <button className="faq-pergunta" onClick={() => toggleFaq(1)}>
                <span>Posso usar questões do ENEM?</span>
                <i className={`fas fa-chevron-down ${openFaq === 1 ? 'rotated' : ''}`}></i>
              </button>
              <div className={`faq-resposta ${openFaq === 1 ? 'open' : ''}`}>
                <p>Sim, desde que respeitados os direitos autorais. O banco inclui questões inspiradas no ENEM.</p>
              </div>
            </div>

            <div className="faq-item">
              <button className="faq-pergunta" onClick={() => toggleFaq(2)}>
                <span>Onde vejo o histórico dos alunos?</span>
                <i className={`fas fa-chevron-down ${openFaq === 2 ? 'rotated' : ''}`}></i>
              </button>
              <div className={`faq-resposta ${openFaq === 2 ? 'open' : ''}`}>
                <p>Na aba "Relatórios" &gt; "Histórico", você pode filtrar por aluno, turma ou período.</p>
              </div>
            </div>
          </section>

          <section className="cta-section">
            <h2>Pronto para simplificar suas correções?</h2>
            <div className="cta-buttons">
              <Link to="/cadastro" className="btn btn-cta">
                <i className="fas fa-user-plus"></i>
                Cadastre-se Grátis
              </Link>
              <Link to="/sobre" className="btn btn-secundario">
                <i className="fas fa-play-circle"></i>
                Ver Tutorial
              </Link>
            </div>
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

export default HowItWorksPage
