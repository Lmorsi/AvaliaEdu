import React from 'react'
import { Link } from 'react-router-dom'

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", lineHeight: '1.6', color: '#333', backgroundColor: '#f8f9fa', margin: 0, padding: 0 }}>
      <style>{`
        :root {
          --azul-primario: #3498db;
          --azul-escuro: #2c3e50;
          --cinza-claro: #f5f5f5;
          --branco: #ffffff;
          --verde: #4CAF50;
          --amarelo: #FFC107;
          --vermelho: #F44336;
          --sombra: 0 4px 12px rgba(0,0,0,0.1);
          --radius: 8px;
          --spacing: 1.5rem;
        }

        .privacidade-wrapper {
          display: flex;
          max-width: 1200px;
          margin: 2rem auto;
          background: var(--branco);
          border-radius: var(--radius);
          box-shadow: var(--sombra);
          overflow: hidden;
          position: relative;
        }

        .privacidade-banner {
          width: 12px;
          background: linear-gradient(to bottom, var(--azul-primario), var(--azul-escuro));
        }

        .privacidade-container {
          flex: 1;
          padding: 2rem;
        }

        .privacidade-header {
          margin-bottom: var(--spacing);
          padding-bottom: var(--spacing);
          border-bottom: 1px solid #eee;
        }

        .privacidade-header h1 {
          color: var(--azul-escuro);
          font-size: 2.2rem;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
        }

        .privacidade-header i {
          margin-right: 15px;
          color: var(--azul-primario);
        }

        .privacidade-intro {
          color: #666;
          font-size: 1rem;
        }

        .privacidade-section {
          margin-bottom: 2.5rem;
        }

        .privacidade-section h2 {
          color: var(--azul-escuro);
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #eee;
          display: flex;
          align-items: center;
        }

        .section-number {
          color: var(--azul-primario);
          margin-right: 10px;
        }

        .privacidade-item {
          margin-bottom: 1.5rem;
          padding-left: 1.5rem;
          border-left: 3px solid var(--cinza-claro);
          transition: border-color 0.3s;
        }

        .privacidade-item:hover {
          border-left-color: var(--azul-primario);
        }

        .privacidade-item h3 {
          color: var(--azul-escuro);
          font-size: 1.2rem;
          margin-bottom: 0.8rem;
          display: flex;
          align-items: center;
        }

        .privacidade-item i {
          margin-right: 10px;
          color: var(--azul-primario);
          width: 24px;
          text-align: center;
        }

        .data-card {
          background-color: #f8f9fa;
          border-radius: var(--radius);
          padding: 1rem 1.5rem;
          margin: 1rem 0;
          border-left: 4px solid var(--azul-primario);
        }

        .data-card h4 {
          margin-top: 0;
          display: flex;
          align-items: center;
        }

        .data-card i {
          margin-right: 10px;
          color: var(--azul-escuro);
        }

        .info-card {
          background-color: #f8f9fa;
          border-radius: var(--radius);
          padding: 1rem 1.5rem;
          margin: 1rem 0;
          border-left: 4px solid var(--azul-primario);
        }

        .info-card.warning {
          border-left-color: var(--amarelo);
          background-color: #fff8e1;
        }

        .contact-card {
          background-color: #e8f5e9;
          border-radius: var(--radius);
          padding: 1.5rem;
          margin: 1.5rem 0;
          border-left: 4px solid var(--verde);
        }

        ul {
          margin: 1rem 0 1rem 1.5rem;
          padding: 0;
        }

        li {
          margin-bottom: 0.5rem;
          position: relative;
        }

        .purpose-list {
          list-style: none;
          margin-left: 0;
        }

        .purpose-list li {
          margin-bottom: 0.8rem;
          display: flex;
          align-items: flex-start;
        }

        .purpose-list i {
          color: var(--verde);
          margin-right: 10px;
          margin-top: 3px;
        }

        .footer-note {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }

        .acceptance-text {
          font-weight: bold;
          color: var(--azul-escuro);
          margin-top: 1rem;
        }

        a {
          color: var(--azul-primario);
          text-decoration: none;
          transition: color 0.3s;
        }

        a:hover {
          color: var(--azul-escuro);
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .privacidade-wrapper {
            flex-direction: column;
            margin: 1rem;
          }

          .privacidade-banner {
            width: 100%;
            height: 8px;
          }

          .privacidade-container {
            padding: 1.5rem;
          }

          .privacidade-header h1 {
            font-size: 1.8rem;
          }

          .privacidade-section h2 {
            font-size: 1.3rem;
          }

          .privacidade-item {
            padding-left: 1rem;
          }
        }
      `}</style>

      <Link to="/" style={{ position: 'fixed', top: '1rem', left: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', background: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textDecoration: 'none', zIndex: 1000 }}>
        <i className="fas fa-chevron-left"></i>
        <span>Voltar</span>
      </Link>

      <div className="privacidade-wrapper">
        <div className="privacidade-banner"></div>

        <div className="privacidade-container">
          <div className="privacidade-header">
            <h1>
              <i className="fas fa-user-shield"></i>
              Política de Privacidade
            </h1>
            <p className="privacidade-intro">Última atualização: 10/12/2025</p>
          </div>

          <div className="privacidade-intro" style={{ marginBottom: '2rem' }}>
            <p>
              O <strong>Avalia.Edu</strong> valoriza a sua privacidade e está comprometido em proteger os seus dados pessoais. Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos suas informações quando você utiliza nossos serviços.
            </p>
            <p>
              Ao acessar ou usar o Avalia.Edu, você concorda com os termos desta política.
            </p>
          </div>

          <section className="privacidade-section">
            <h2>
              <span className="section-number">1.</span>
              VALORIZAÇÃO DA PRIVACIDADE DO USUÁRIO
            </h2>
            <p>
              A privacidade e a segurança dos seus dados são prioridades para nós. Esta política foi criada para garantir transparência sobre como suas informações são tratadas e protegidas.
            </p>
          </section>

          <section className="privacidade-section">
            <h2>
              <span className="section-number">2.</span>
              INTENÇÃO DA POLÍTICA DE PRIVACIDADE
            </h2>
            <p>Esta política tem como objetivo:</p>
            <ul>
              <li><strong>Informar</strong> quais dados coletamos e como os utilizamos;</li>
              <li><strong>Explicar</strong> seus direitos sobre suas informações;</li>
              <li><strong>Garantir</strong> que seus dados sejam armazenados com segurança;</li>
              <li><strong>Estabelecer</strong> as condições de compartilhamento de informações, quando necessário.</li>
            </ul>
          </section>

          <section className="privacidade-section">
            <h2>
              <span className="section-number">3.</span>
              POSSÍVEIS MUDANÇAS NA POLÍTICA
            </h2>
            <ul>
              <li>Reservamo-nos o direito de <strong>atualizar esta política</strong> conforme mudanças em nossos serviços ou requisitos legais.</li>
              <li>Alterações significativas serão <strong>comunicadas por e-mail</strong> ou notificação no aplicativo.</li>
              <li>O uso contínuo do serviço após atualizações <strong>implica aceitação</strong> das novas condições.</li>
            </ul>
          </section>

          <section className="privacidade-section">
            <h2>
              <span className="section-number">4.</span>
              COLETA E USO DAS INFORMAÇÕES
            </h2>

            <div className="privacidade-item">
              <h3>
                <i className="fas fa-database"></i>
                4.1 Dados Coletados
              </h3>
              <p>Ao se cadastrar e utilizar o <strong>Avalia.Edu</strong>, podemos coletar:</p>

              <div className="data-card">
                <h4>
                  <i className="fas fa-user-circle"></i>
                  Informações pessoais:
                </h4>
                <ul style={{ marginLeft: '1.5rem' }}>
                  <li>Nome completo</li>
                  <li>Nome de usuário</li>
                  <li>Endereço de e-mail</li>
                </ul>
              </div>

              <div className="data-card">
                <h4>
                  <i className="fas fa-chart-line"></i>
                  Dados de uso:
                </h4>
                <ul style={{ marginLeft: '1.5rem' }}>
                  <li>Localização geográfica (aprox. via IP)</li>
                  <li>Endereço de IP</li>
                  <li>Cookies e tecnologias de rastreamento</li>
                </ul>
              </div>

              <div className="data-card">
                <h4>
                  <i className="fas fa-file-alt"></i>
                  Conteúdo gerado:
                </h4>
                <ul style={{ marginLeft: '1.5rem' }}>
                  <li>Itens de avaliação criados</li>
                  <li>Respostas e correções</li>
                  <li>Relatórios de desempenho</li>
                </ul>
              </div>
            </div>

            <div className="privacidade-item">
              <h3>
                <i className="fas fa-tasks"></i>
                4.2 Finalidade da Coleta
              </h3>
              <p>Seus dados são usados para:</p>
              <ul className="purpose-list">
                <li>
                  <i className="fas fa-check-circle"></i>
                  <span><strong>Fornecer e melhorar</strong> nossos serviços;</span>
                </li>
                <li>
                  <i className="fas fa-check-circle"></i>
                  <span><strong>Personalizar</strong> sua experiência;</span>
                </li>
                <li>
                  <i className="fas fa-check-circle"></i>
                  <span><strong>Enviar comunicações</strong> importantes (e-mails, notificações);</span>
                </li>
                <li>
                  <i className="fas fa-check-circle"></i>
                  <span><strong>Garantir a segurança</strong> da plataforma.</span>
                </li>
              </ul>
            </div>
          </section>

          <section className="privacidade-section">
            <h2>
              <span className="section-number">5.</span>
              ACESSO E DIVULGAÇÃO DE INFORMAÇÕES
            </h2>

            <div className="privacidade-item">
              <h3>
                <i className="fas fa-lock"></i>
                5.1 Compartilhamento de Dados
              </h3>
              <p><strong>O Avalia.Edu não vende ou aluga suas informações pessoais.</strong></p>

              <div className="info-card">
                <h4>
                  <i className="fas fa-bullhorn"></i>
                  Conteúdo público:
                </h4>
                <p>Itens criados e compartilhados no banco de questões <strong>são visíveis a outros usuários</strong>.</p>
              </div>

              <div className="info-card warning">
                <h4>
                  <i className="fas fa-eye"></i>
                  Monitoramento excepcional:
                </h4>
                <p>Sua conta <strong>não é monitorada rotineiramente</strong>, mas podemos acessar informações em casos como:</p>
                <ul style={{ marginLeft: '1.5rem' }}>
                  <li>Violação dos Termos de Serviço;</li>
                  <li>Suporte técnico necessário;</li>
                  <li>Proteção de direitos autorais;</li>
                  <li>Determinação judicial.</li>
                </ul>
              </div>

              <div className="info-card">
                <h4>
                  <i className="fas fa-ad"></i>
                  Sem uso para propaganda:
                </h4>
                <p>Não utilizamos seus dados para <strong>anúncios direcionados</strong>.</p>
              </div>
            </div>
          </section>

          <section className="privacidade-section">
            <h2>
              <span className="section-number">6.</span>
              ARMAZENAMENTO E TRANSFERÊNCIA DE DADOS
            </h2>

            <div className="privacidade-item">
              <h3>
                <i className="fas fa-server"></i>
                6.1 Onde Seus Dados São Guardados?
              </h3>
              <p>As informações são <strong>armazenadas em servidores seguros</strong>, podendo ser transferidas internacionalmente conforme necessário.</p>
            </div>

            <div className="privacidade-item">
              <h3>
                <i className="fas fa-user-edit"></i>
                6.2 Como Acessar ou Alterar Seus Dados?
              </h3>
              <ul>
                <li>Você pode <strong>editar suas informações</strong> no perfil da conta.</li>
                <li>Para solicitar exclusão, envie um e-mail para <a href="mailto:contato@avaliaedu.com">contato@avaliaedu.com</a>.</li>
              </ul>
            </div>

            <div className="privacidade-item">
              <h3>
                <i className="fas fa-shield-alt"></i>
                6.3 Segurança dos Dados
              </h3>
              <ul>
                <li>Utilizamos <strong>criptografia (SSL/TLS)</strong> para proteger suas informações.</li>
                <li>Medidas técnicas e administrativas são aplicadas para <strong>prevenir acessos não autorizados</strong>.</li>
              </ul>
            </div>

            <div className="privacidade-item">
              <h3>
                <i className="fas fa-exclamation-triangle"></i>
                6.4 Em Caso de Violação de Dados
              </h3>
              <p>Se ocorrer uma falha de segurança, <strong>notificaremos os usuários afetados</strong> e tomaremos medidas para mitigar riscos.</p>
            </div>
          </section>

          <section className="privacidade-section">
            <h2>
              <span className="section-number">7.</span>
              EXCLUSÃO DE INFORMAÇÕES
            </h2>

            <div className="privacidade-item">
              <h3>
                <i className="fas fa-user-times"></i>
                7.1 Encerramento de Conta pelo Usuário
              </h3>
              <ul>
                <li>Você pode <strong>excluir sua conta</strong> a qualquer momento.</li>
                <li>Itens públicos <strong>permanecem disponíveis</strong> para outros usuários.</li>
              </ul>
            </div>

            <div className="privacidade-item">
              <h3>
                <i className="fas fa-ban"></i>
                7.2 Encerramento de Conta pelo Avalia.Edu
              </h3>
              <ul>
                <li>Reservamo-nos o direito de <strong>remover contas inativas</strong> ou que violem nossos Termos.</li>
                <li>Solicitações de exclusão de dados devem ser feitas por e-mail.</li>
              </ul>
            </div>
          </section>

          <section className="privacidade-section">
            <h2>
              <span className="section-number">8.</span>
              CONTATE-NOS
            </h2>
            <p>Para dúvidas, solicitações ou reclamações sobre privacidade, entre em contato:</p>

            <div className="contact-card">
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <i className="fas fa-envelope"></i>
                <strong>E-mail:</strong>
                <a href="mailto:contato@avaliaedu.com">contato@avaliaedu.com</a>
              </p>
            </div>

            <div className="footer-note">
              <p>
                Acesse nossos <Link to="/termos">Termos de Uso</Link> para mais informações.
              </p>
              <p className="acceptance-text">
                Ao usar o Avalia.Edu, você concorda com esta Política de Privacidade.
              </p>
            </div>
          </section>
        </div>
      </div>

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </div>
  )
}

export default PrivacyPolicyPage
