import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

export default function Home() {
  return (
    <Layout title="Documentação" description="Orientações para credenciar instituições e integrar sistemas de saúde ao HubSaúde de Goiás.">
      <main className={styles.home}>
        <div className={styles.content}>
          <header className={styles.introduction}>
            <p className={styles.eyebrow}>Saúde conectada · Estado de Goiás</p>
            <h1>Documentação do <span>HubSaúde</span></h1>
            <p>Orientações para credenciar sua instituição e integrar sistemas de saúde à plataforma do Estado de Goiás.</p>
          </header>

          <section aria-labelledby="choose-path">
            <h2 id="choose-path" className={styles.prompt}>O que você precisa fazer?</h2>
            <div className={styles.paths}>
              <article className={styles.path}>
                <p className={styles.audience}>Gestores de saúde</p>
                <h3>Credenciamento</h3>
                <p>Prepare os documentos, saiba como solicitar acesso e acompanhe o pedido da sua instituição.</p>
                <Link to="/gestor/">Credenciar minha instituição</Link>
              </article>
              <article className={styles.path}>
                <p className={styles.audience}>Desenvolvedores e integradores</p>
                <h3>Integração de sistemas</h3>
                <p>Prepare o ambiente e siga o caminho da autenticação ao envio de um recurso FHIR.</p>
                <Link to="/fluxos/">Integrar meu sistema</Link>
              </article>
            </div>
          </section>
        </div>
      </main>
    </Layout>
  );
}
