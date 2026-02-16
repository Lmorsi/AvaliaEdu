import React from 'react'
import { Link } from 'react-router-dom'

const TermsPage: React.FC = () => {
  return (
    <div style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", lineHeight: '1.6', color: '#333', backgroundColor: '#f8f9fa', margin: 0, padding: 0 }}>
      <style>{`
        :root {
          --azul-primario: #3498db;
          --azul-escuro: #2c3e50;
          --cinza-claro: #f5f5f5;
          --branco: #ffffff;
          --sombra: 0 4px 12px rgba(0,0,0,0.1);
          --radius: 8px;
          --spacing: 1.5rem;
        }

        .termos-wrapper {
          display: flex;
          max-width: 1200px;
          margin: 2rem auto;
          background: var(--branco);
          border-radius: var(--radius);
          box-shadow: var(--sombra);
          overflow: hidden;
          position: relative;
        }

        .termos-banner {
          width: 12px;
          background: linear-gradient(to bottom, var(--azul-primario), var(--azul-escuro));
        }

        .termos-container {
          flex: 1;
          padding: 2rem;
        }

        .termos-header {
          margin-bottom: var(--spacing);
          padding-bottom: var(--spacing);
          border-bottom: 1px solid #eee;
        }

        .termos-header h1 {
          color: var(--azul-escuro);
          font-size: 2.2rem;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
        }

        .termos-header i {
          margin-right: 15px;
          color: var(--azul-primario);
        }

        .termos-intro {
          color: #666;
          font-size: 1rem;
        }

        .termos-section {
          margin-bottom: 2.5rem;
        }

        .termos-section h2 {
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

        .termo-item {
          margin-bottom: 1.5rem;
          padding-left: 1.5rem;
          border-left: 3px solid var(--cinza-claro);
          transition: border-color 0.3s;
        }

        .termo-item:hover {
          border-left-color: var(--azul-primario);
        }

        .termo-item h3 {
          color: var(--azul-escuro);
          font-size: 1.2rem;
          margin-bottom: 0.8rem;
          display: flex;
          align-items: center;
        }

        .termo-item i {
          margin-right: 10px;
          color: var(--azul-primario);
          width: 24px;
          text-align: center;
        }

        .termo-item ul, .termo-item ol {
          margin: 1rem 0 1rem 1.5rem;
          padding: 0;
        }

        .termo-item li {
          margin-bottom: 0.5rem;
          position: relative;
        }

        .termo-item ul ul, .termo-item ol ol {
          margin-left: 1.5rem;
        }

        .alert-box {
          background-color: #fff8e1;
          border-left: 4px solid #ffc107;
          padding: 1rem 1.5rem;
          margin: 1.5rem 0;
          border-radius: 0 var(--radius) var(--radius) 0;
        }

        .acceptance-box {
          background-color: #e8f5e9;
          border-left: 4px solid #4caf50;
          padding: 1.5rem;
          margin-top: 2rem;
          border-radius: 0 var(--radius) var(--radius) 0;
        }

        ul {
          margin: 1rem 0 1rem 1.5rem;
          padding: 0;
        }

        li {
          margin-bottom: 0.5rem;
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
          .termos-wrapper {
            flex-direction: column;
            margin: 1rem;
          }

          .termos-banner {
            width: 100%;
            height: 8px;
          }

          .termos-container {
            padding: 1.5rem;
          }

          .termos-header h1 {
            font-size: 1.8rem;
          }

          .termos-section h2 {
            font-size: 1.3rem;
          }

          .termo-item {
            padding-left: 1rem;
          }
        }
      `}</style>

      <Link to="/" style={{ position: 'fixed', top: '1rem', left: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', background: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textDecoration: 'none', zIndex: 1000 }}>
        <i className="fas fa-chevron-left"></i>
        <span>Voltar</span>
      </Link>

      <div className="termos-wrapper">
        <div className="termos-banner"></div>

        <div className="termos-container">
          <div className="termos-header">
            <h1>
              <i className="fas fa-file-contract"></i>
              Termos de Uso
            </h1>
            <p className="termos-intro">Última atualização: 10/12/2025</p>
          </div>

          <div className="termos-intro" style={{ marginBottom: '2rem' }}>
            <p>
              Bem-vindo ao <strong>Avalia.Edu</strong>! Ao acessar ou utilizar nossos serviços, você concorda com estes Termos de Uso e com nossa <Link to="/privacidade">Política de Privacidade</Link>. Leia atentamente antes de prosseguir.
            </p>
          </div>

          <section className="termos-section">
            <h2>
              <span className="section-number">1.</span>
              CONTRATO DE LICENÇA DO USUÁRIO FINAL
            </h2>

            <div className="termo-item">
              <h3>
                <i className="fas fa-question-circle"></i>
                1.1 O Que São os Termos de Serviço?
              </h3>
              <p>
                Estes Termos de Uso constituem um <strong>contrato legal</strong> entre você (Usuário) e o <strong>Avalia.Edu</strong>, estabelecendo as regras para utilização da plataforma. Ao criar uma conta ou utilizar nossos serviços, você aceita cumprir todas as condições aqui descritas.
              </p>
            </div>

            <div className="termo-item">
              <h3>
                <i className="fas fa-graduation-cap"></i>
                1.2 O Que é o Serviço Avalia.Edu?
              </h3>
              <p>
                O <strong>Avalia.Edu</strong> é uma plataforma online que permite a criação, correção e análise de avaliações educacionais, fornecendo relatórios de desempenho para professores e instituições de ensino.
              </p>
            </div>

            <div className="termo-item">
              <h3>
                <i className="fas fa-exchange-alt"></i>
                1.3 Possíveis Alterações nos Termos de Serviço
              </h3>
              <p>
                Reservamo-nos o direito de <strong>modificar estes Termos</strong> a qualquer momento. Alterações significativas serão comunicadas por e-mail ou notificação na plataforma. O uso continuado após as mudanças implica <strong>aceitação das novas condições</strong>.
              </p>
            </div>

            <div className="termo-item">
              <h3>
                <i className="fas fa-user-check"></i>
                1.4 O Que Fazer Para Usar o Serviço?
              </h3>
              <ul>
                <li>Criar uma <strong>conta válida</strong>;</li>
                <li>Fornecer informações <strong>verdadeiras e atualizadas</strong>;</li>
                <li>Utilizar a plataforma apenas para <strong>fins educacionais</strong>;</li>
                <li>Respeitar as <strong>diretrizes de conduta</strong> estabelecidas.</li>
              </ul>
            </div>
          </section>

          <section className="termos-section">
            <h2>
              <span className="section-number">2.</span>
              DIREITOS E RESPONSABILIDADES
            </h2>

            <div className="termo-item">
              <h3>
                <i className="fas fa-folder-open"></i>
                2.1 Direitos Sobre o Conteúdo do Usuário
              </h3>
              <ul>
                <li>O Avalia.Edu <strong>não se apropria</strong> do conteúdo criado por você (questões, avaliações, relatórios);</li>
                <li>Você <strong>mantém os direitos autorais</strong>, mas concede ao Avalia.Edu uma <strong>licença não exclusiva</strong> para processar, armazenar, fazer backup e distribuir seu conteúdo dentro da plataforma;</li>
                <li>Conteúdo público (banco de questões) pode ser <strong>compartilhado e editado</strong> por outros usuários, desde que respeitadas as regras de uso.</li>
              </ul>
            </div>

            <div className="termo-item">
              <h3>
                <i className="fas fa-user-shield"></i>
                2.2 Responsabilidade de Conduta
              </h3>
              <p>Você concorda em:</p>
              <ul>
                <li>Não publicar <strong>conteúdo ofensivo, ilegal ou plagiado</strong>;</li>
                <li>Não utilizar a plataforma para <strong>fins comerciais não autorizados</strong>;</li>
                <li>Não violar <strong>direitos de propriedade intelectual</strong> de terceiros;</li>
                <li>Não realizar <strong>ataques cibernéticos</strong> ou uso indevido dos sistemas.</li>
              </ul>
            </div>

            <div className="termo-item">
              <h3>
                <i className="fas fa-shield-alt"></i>
                2.3 Direitos do Avalia.Edu Sobre o Conteúdo
              </h3>
              <ul>
                <li>Reservamo-nos o direito de <strong>remover ou editar</strong> conteúdo que viole estes Termos;</li>
                <li>Podemos <strong>analisar e moderar</strong> questões e avaliações para garantir qualidade;</li>
                <li>Conteúdo público pode ser utilizado para <strong>melhorias na plataforma</strong>.</li>
              </ul>
            </div>

            <div className="termo-item">
              <h3>
                <i className="fas fa-copyright"></i>
                2.4 Direitos de Propriedade Intelectual
              </h3>
              <ul>
                <li>Todo o <strong>software, design e funcionalidades</strong> do Avalia.Edu são de nossa propriedade;</li>
                <li>O uso da plataforma <strong>não concede direitos</strong> sobre nosso código ou infraestrutura;</li>
                <li><strong>Logotipos e marcas registradas</strong> não podem ser utilizados sem autorização.</li>
              </ul>
            </div>
          </section>

          <section className="termos-section">
            <h2>
              <span className="section-number">3.</span>
              MODIFICAÇÕES E ATUALIZAÇÕES
            </h2>

            <div className="termo-item">
              <h3>
                <i className="fas fa-cogs"></i>
                3.1 Direito de Modificação do Serviço
              </h3>
              <p>O Avalia.Edu pode:</p>
              <ul>
                <li><strong>Adicionar, remover ou alterar</strong> funcionalidades sem aviso prévio;</li>
                <li><strong>Interromper temporariamente</strong> o serviço para manutenção.</li>
              </ul>
            </div>

            <div className="termo-item">
              <h3>
                <i className="fas fa-download"></i>
                3.2 Direito de Atualização do Software
              </h3>
              <ul>
                <li>Atualizações podem ser <strong>automáticas</strong>;</li>
                <li>O não aceite de novas versões pode <strong>limitar o acesso</strong>.</li>
              </ul>
            </div>

            <div className="termo-item">
              <h3>
                <i className="fas fa-users"></i>
                3.3 Contribuição dos Usuários para Melhorias
              </h3>
              <ul>
                <li><strong>Sugestões e feedbacks</strong> podem ser utilizados para aprimoramentos;</li>
                <li>Contribuições técnicas ou de conteúdo <strong>não garantem direitos financeiros</strong>.</li>
              </ul>
            </div>
          </section>

          <section className="termos-section">
            <h2>
              <span className="section-number">4.</span>
              LIMITAÇÃO DE RESPONSABILIDADE
            </h2>

            <div className="alert-box">
              <p style={{ fontWeight: 'bold', marginBottom: '1rem' }}>VOCÊ CONCORDA EXPRESSAMENTE QUE:</p>
              <ul>
                <li>O Avalia.Edu <strong>não garante</strong> disponibilidade 100% do serviço;</li>
                <li>Não nos responsabilizamos por:
                  <ul>
                    <li><strong>Perda de dados</strong> não causada por falha direta nossa;</li>
                    <li><strong>Uso indevido</strong> por terceiros;</li>
                    <li><strong>Danos indiretos</strong> (lucros cessantes, interrupção de atividades).</li>
                  </ul>
                </li>
              </ul>
            </div>
          </section>

          <section className="termos-section">
            <h2>
              <span className="section-number">5.</span>
              USO DE DADOS E COOKIES
            </h2>

            <div className="termo-item">
              <h3>
                <i className="fas fa-database"></i>
                5.1 Coleta e Armazenamento
              </h3>
              <ul>
                <li>Dados pessoais e de uso são tratados conforme nossa <Link to="/privacidade">Política de Privacidade</Link>;</li>
                <li>Utilizamos <strong>cookies</strong> para melhorar a experiência (você pode gerenciar preferências).</li>
              </ul>
            </div>

            <div className="termo-item">
              <h3>
                <i className="fas fa-share-alt"></i>
                5.2 Compartilhamento com Terceiros
              </h3>
              <p>Dados não são vendidos, mas podem ser compartilhados com:</p>
              <ul>
                <li>Parceiros de <strong>hospedagem e segurança</strong>;</li>
                <li><strong>Autoridades</strong>, se exigido por lei.</li>
              </ul>
            </div>
          </section>

          <section className="termos-section">
            <h2>
              <span className="section-number">6.</span>
              TERMOS COMERCIAIS
            </h2>

            <div className="termo-item">
              <h3>
                <i className="fas fa-dollar-sign"></i>
                6.1 Gratuidade e Possíveis Anúncios
              </h3>
              <ul>
                <li>Atualmente <strong>não exibimos anúncios</strong>, mas reservamos o direito de incluir no futuro;</li>
                <li><strong>Serviços premium</strong> podem ser lançados com aviso prévio.</li>
              </ul>
            </div>

            <div className="termo-item">
              <h3>
                <i className="fas fa-user-times"></i>
                6.2 Cancelamento de Conta
              </h3>
              <ul>
                <li>Você pode <strong>encerrar sua conta</strong> a qualquer momento;</li>
                <li>Conteúdo público <strong>permanecerá disponível</strong> para outros usuários.</li>
              </ul>
            </div>
          </section>

          <section className="termos-section">
            <h2>
              <span className="section-number">7.</span>
              DISPOSIÇÕES FINAIS
            </h2>
            <ul>
              <li>Estes Termos são regidos pelas <strong>leis brasileiras</strong>;</li>
              <li>Dúvidas ou reclamações devem ser enviadas para <a href="mailto:contato@avaliaedu.com">contato@avaliaedu.com</a>.</li>
            </ul>

            <div className="acceptance-box" style={{ marginTop: '2rem' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Ao utilizar o Avalia.Edu, você declara que leu, compreendeu e aceitou integralmente estes Termos.
              </p>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                <i className="fas fa-link"></i>
                Acesse nossa <Link to="/privacidade">Política de Privacidade</Link> para mais informações.
              </p>
            </div>
          </section>
        </div>
      </div>

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </div>
  )
}

export default TermsPage
