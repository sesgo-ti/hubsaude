import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import styles from './index.module.css';

export default function Home() {
  const {collectAnchor} = useBrokenLinks();
  ['comece-aqui', 'jornada', 'term'].forEach(collectAnchor);
  return (
    <Layout
      title="Comece a integrar"
      description="HubSaúde: plataforma de interoperabilidade em saúde do Estado de Goiás. Do credenciamento à primeira requisição, com FHIR R4 e SMART on FHIR."
    >
      <main id="main" className={styles.home}>
        <section className={styles.hero} aria-labelledby="htitle">
          <div className={styles.container}>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}>Saúde conectada · Estado de Goiás</p>
                <h1 id="htitle">
                  Conecte seu sistema de saúde ao <span>HubSaúde</span>
                </h1>
                <p className={styles.lead}>
                  Hospitais, laboratórios e unidades de saúde compartilham
                  informações de pacientes de forma <strong>segura, padronizada e
                  rastreável</strong>. Aqui, você encontra o caminho do
                  credenciamento à primeira requisição.
                </p>
                <div className={styles.actions}>
                  <Link className="button button--primary button--lg" to="#comece-aqui">
                    Comece a integrar
                  </Link>
                  <Link className={styles.textLink} to="#jornada">
                    Ver as 7 etapas <span aria-hidden="true">→</span>
                  </Link>
                </div>
                <dl className={styles.heroMeta}>
                  <div>
                    <dt>Padrões de interoperabilidade</dt>
                    <dd>FHIR R4 · SMART on FHIR v2</dd>
                  </div>
                  <div>
                    <dt>Identidade digital</dt>
                    <dd>Certificado ICP-Brasil</dd>
                  </div>
                </dl>
              </div>

              <figure id="term" className={styles.sequence} aria-labelledby="sequence-title">
                <figcaption className={styles.sequenceHeader}>
                  <span className={styles.eyebrow}>SMART Backend Services</span>
                  <h2 id="sequence-title">Da descoberta ao dado</h2>
                  <p>Visão esquemática de uma integração autenticada.</p>
                </figcaption>
                <ol className={styles.protocol}>
                  <li>
                    <span className={styles.protocolNumber} aria-hidden="true">01</span>
                    <div>
                      <h3>Descobrir os endereços</h3>
                      <code>GET /.well-known/smart-configuration</code>
                      <p>Consulte o endpoint de token e os escopos suportados.</p>
                    </div>
                  </li>
                  <li>
                    <span className={styles.protocolNumber} aria-hidden="true">02</span>
                    <div>
                      <h3>Comprovar a identidade</h3>
                      <code>client_credentials + client_assertion</code>
                      <p>Solicite um token com uma asserção JWT assinada e os escopos autorizados.</p>
                    </div>
                  </li>
                  <li>
                    <span className={styles.protocolNumber} aria-hidden="true">03</span>
                    <div>
                      <h3>Fazer a requisição FHIR</h3>
                      <code>Authorization: Bearer &lt;access_token&gt;</code>
                      <p>Use o recurso e a operação previstos no Guia de Implementação.</p>
                    </div>
                  </li>
                </ol>
                <div className={styles.sequenceNote}>
                  <p>
                    Ilustração estática, não executável. Nenhuma requisição é
                    enviada. O acesso depende do credenciamento e das permissões concedidas.
                  </p>
                  <Link to="/fluxos/autenticacao/">Consultar o fluxo completo <span aria-hidden="true">→</span></Link>
                </div>
              </figure>
            </div>
          </div>
        </section>

        <div className={styles.container}>
          <section id="visao-geral" className={styles.section} aria-labelledby="vtitle">
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Uma conexão, regras comuns</p>
              <h2 id="vtitle">Visão geral</h2>
            </div>
            <div className={styles.overviewGrid}>
              <article className={styles.overview}>
                <h3>O ponto de encontro dos sistemas de saúde</h3>
                <p>
                  O HubSaúde é a plataforma de interoperabilidade em saúde do
                  Estado de Goiás. Conecta hospitais, unidades básicas,
                  laboratórios e vigilância para que seus sistemas troquem
                  informações de pacientes.
                </p>
                <p>
                  Em vez de cada instituição manter uma ligação direta com todas
                  as outras, elas se conectam ao hub, com regras comuns de
                  segurança, padronização e registro das operações. Se você
                  desenvolve ou opera um sistema de saúde em Goiás, é por aqui que
                  ele se integra.
                </p>
                <Link className={styles.textLink} to="/fluxos/">Conhecer os fluxos de integração <span aria-hidden="true">→</span></Link>
              </article>
              <aside className={styles.support} aria-labelledby="support-title">
                <p className={styles.eyebrow}>Equipe técnica</p>
                <h3 id="support-title">Apoio na integração</h3>
                <p>Dúvidas sobre a plataforma ou sobre o próximo passo? Fale com o suporte.</p>
                <Link className={styles.textLink} href="mailto:suporte@saude.go.gov.br">
                  suporte@saude.go.gov.br
                </Link>
              </aside>
            </div>
          </section>

          <section id="comece-aqui" className={styles.section} aria-labelledby="ptitle">
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Por onde começar</p>
              <h2 id="ptitle">Uma plataforma. Duas trilhas.</h2>
              <p>Encontre as orientações para o seu papel na instituição.</p>
            </div>
            <div className={styles.audienceGrid}>
              <article className={`${styles.audienceCard} ${styles.managerCard}`}>
                <p className={styles.eyebrow}>Gestão e credenciamento</p>
                <h3>Gestores de saúde</h3>
                <p>
                  Cuide da relação da sua instituição com o HubSaúde: solicite o
                  credenciamento, acompanhe a aprovação, defina o nível de acesso
                  de N1 a N3 e receba as credenciais pelo sistema Ganesha.
                </p>
                <Link className={styles.audienceAction} to="/gestor/">
                  Acessar a jornada do gestor <span aria-hidden="true">→</span>
                </Link>
              </article>
              <article className={`${styles.audienceCard} ${styles.developerCard}`}>
                <p className={styles.eyebrow}>Desenvolvimento e integração</p>
                <h3>Desenvolvedores e integradores</h3>
                <p>
                  Conecte seu sistema de informação em saúde (HIS, RES ou LIS) ao
                  HubSaúde. Siga as etapas técnicas, escolha um SDK e prepare a
                  integração, do credenciamento à primeira requisição FHIR.
                </p>
                <Link className={styles.audienceAction} to="#jornada">
                  Seguir a jornada do integrador <span aria-hidden="true">→</span>
                </Link>
              </article>
            </div>
          </section>

          <section id="jornada" className={styles.section} aria-labelledby="jtitle">
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Do credenciamento à primeira requisição</p>
              <h2 id="jtitle">A jornada do integrador</h2>
              <p>Sete etapas. Em cada uma, os guias e as ferramentas para avançar com segurança.</p>
            </div>
            <ol className={styles.journey}>
              <li className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">01</span>
                <h3>Pré-requisitos e credenciamento</h3>
                <p>
                  Antes de escrever código, sua instituição precisa ser
                  <strong> credenciada pela SES-GO</strong>. Ao final do processo,
                  você recebe um identificador (<code>client_id</code>) e um
                  certificado ICP-Brasil. O nível concedido delimita seu acesso.
                </p>
                <dl className={styles.levels}>
                  <div><dt>N1</dt><dd>Básico, só com consentimento</dd></div>
                  <div><dt>N2</dt><dd>Pleno, inclui emergência</dd></div>
                  <div><dt>N3</dt><dd>Regulatório, vigilância e LGPD</dd></div>
                </dl>
                <div className={styles.links}>
                  <Link to="/gestor/">Solicitar credenciamento no Ganesha <span aria-hidden="true">→</span></Link>
                </div>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">02</span>
                <h3>Autenticação SMART / OAuth2</h3>
                <p>
                  Com SMART Backend Services, seu sistema se identifica com uma
                  asserção assinada (<code>client_assertion</code>). O servidor de
                  autorização emite um <code>access_token</code> com as permissões
                  do seu credenciamento. Os SDKs oficiais cuidam dessa autenticação.
                </p>
                <div className={styles.links}>
                  <Link to="/fluxos/autenticacao/">Fluxo de autenticação <span aria-hidden="true">→</span></Link>
                  <Link to="/sdks/">SDKs oficiais <span aria-hidden="true">→</span></Link>
                  <Link href="https://hub.saude.go.gov.br/.well-known/smart-configuration">Consultar a configuração SMART <span aria-hidden="true">↗</span></Link>
                </div>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">03</span>
                <h3>Conformidade FHIR</h3>
                <p>
                  Consulte as capacidades do servidor e os Guias de Implementação:
                  quais recursos, perfis e operações estão disponíveis e quais
                  requisitos sua integração deve cumprir.
                </p>
                <div className={styles.links}>
                  <Link href="https://hub.saude.go.gov.br/metadata">Capacidades do servidor: <code>/metadata</code> <span aria-hidden="true">↗</span></Link>
                  <Link href="https://fhir.saude.go.gov.br">Guias de Implementação FHIR <span aria-hidden="true">↗</span></Link>
                </div>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">04</span>
                <h3>Assinatura digital</h3>
                <p>
                  Alguns documentos de saúde exigem assinatura. Nesses casos,
                  siga a <strong>Política de Assinatura Digital Avançada</strong>
                  {' '}do HubSaúde (ICP-Brasil, JWS/JAdES-B). O <strong>Safira</strong>
                  {' '}assina e valida documentos FHIR conforme essa política.
                </p>
                <div className={styles.links}>
                  <Link href="https://github.com/sesgo-ti/safira">Conhecer o Safira <span aria-hidden="true">↗</span></Link>
                  <Link href="https://fhir.saude.go.gov.br/r4/seguranca/assinatura.html">Política de Assinatura <span aria-hidden="true">↗</span></Link>
                  <Link href="https://fhir.saude.go.gov.br/r4/seguranca/caso-de-uso-criar-assinatura.html">Criar uma assinatura <span aria-hidden="true">↗</span></Link>
                  <Link href="https://fhir.saude.go.gov.br/r4/seguranca/caso-de-uso-validar-assinatura.html">Validar uma assinatura <span aria-hidden="true">↗</span></Link>
                </div>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">05</span>
                <h3>Valide antes de integrar</h3>
                <p>
                  Execute seus recursos no <strong>Validador</strong>, pelo
                  navegador ou pela linha de comando. Confira a conformidade com
                  os perfis homologados antes de enviar dados para produção.
                </p>
                <div className={styles.links}>
                  <Link to="/ferramentas/validador/">Ver como validar <span aria-hidden="true">→</span></Link>
                </div>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">06</span>
                <h3>Ferramentas e SDKs</h3>
                <p>
                  Os SDKs oficiais cuidam da autenticação, com uma biblioteca por
                  linguagem suportada. O <strong>HubSaúde CLI</strong> reúne o
                  Validador, o Simulador e um servidor FHIR local para testar a
                  integração antes de chegar à produção.
                </p>
                <div className={styles.links}>
                  <Link to="/sdks/">Escolher um SDK <span aria-hidden="true">→</span></Link>
                  <Link to="/ferramentas/">Explorar as ferramentas <span aria-hidden="true">→</span></Link>
                </div>
              </li>
              <li className={`${styles.step} ${styles.lastStep}`}>
                <span className={styles.stepNumber} aria-hidden="true">07</span>
                <h3>Primeiros passos: Hello FHIR</h3>
                <p>
                  Reúna as etapas: obtenha um token e envie seu primeiro recurso
                  FHIR conforme o guia e as permissões concedidas. Reveja o
                  <Link to="#term"> esquema de integração</Link> no início da
                  página ou siga os fluxos completos para implementar cada operação.
                </p>
                <div className={styles.links}>
                  <Link to="/fluxos/autenticacao/">Obter um token <span aria-hidden="true">→</span></Link>
                  <Link to="/fluxos/envio-recurso/">Enviar um recurso FHIR <span aria-hidden="true">→</span></Link>
                </div>
              </li>
            </ol>
          </section>

          <section id="comece" className={styles.closing} aria-labelledby="ctitle">
            <div>
              <p className={styles.eyebrow}>Informação que fortalece o cuidado</p>
              <h2 id="ctitle">Contribua com a qualidade da saúde em Goiás</h2>
              <p>
                Integrar seu sistema amplia a troca segura de informações em
                saúde e fortalece o cuidado ao cidadão goiano. Credencie sua
                instituição e dê o primeiro passo.
              </p>
            </div>
            <Link className="button button--primary button--lg" to="#comece-aqui">
              Comece a integrar
            </Link>
          </section>

          <section className={`${styles.section} ${styles.resources}`} aria-labelledby="rtitle">
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Acesso direto</p>
              <h2 id="rtitle">Gestor, descoberta e ferramentas</h2>
              <p>Já sabe o que procura? Vá direto à documentação.</p>
            </div>
            <div className={styles.resourceGrid}>
              <article>
                <h3>Jornada do gestor</h3>
                <p>Credenciamento de instituições e profissionais pelo Ganesha, do pedido à entrega das credenciais.</p>
                <Link className={styles.textLink} to="/gestor/">Ver jornada do gestor <span aria-hidden="true">→</span></Link>
              </article>
              <article>
                <h3>Autenticação</h3>
                <p>Descoberta de endereços, comprovação de identidade e obtenção do token de acesso.</p>
                <Link className={styles.textLink} to="/fluxos/autenticacao/">Ver autenticação <span aria-hidden="true">→</span></Link>
              </article>
              <article>
                <h3>Ferramentas</h3>
                <p>CLI, Validador e Simulador para testar sua integração localmente antes de ir ao ar.</p>
                <Link className={styles.textLink} to="/ferramentas/">Ver ferramentas <span aria-hidden="true">→</span></Link>
              </article>
            </div>
          </section>
        </div>
      </main>
    </Layout>
  );
}
