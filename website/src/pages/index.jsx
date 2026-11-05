import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './index.module.css';

export default function Home() {
  const miniatura = useBaseUrl('/curso/videos/caminho-registro.jpg');
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
                <p className={styles.audience}>Integradores</p>
                <h3>Integração de sistemas</h3>
                <p>Prepare o ambiente e siga o caminho da autenticação ao envio de um recurso FHIR.</p>
                <Link to="/fluxos/">Integrar meu sistema</Link>
              </article>
            </div>
          </section>

          <section className={styles.course} aria-labelledby="course-title">
            <img className={styles.thumbnail} src={miniatura} alt="" width="1920" height="1080" loading="lazy" />
            <div className={styles.courseText}>
              <p className={styles.courseLabel}>Curso para integradores</p>
              <h2 id="course-title">Aprenda a integrar o seu sistema passo a passo</h2>
              <p>Do primeiro contato com o HubSaúde ao envio de um registro a partir do seu sistema, em seis módulos guiados.</p>
              <ul className={styles.courseFacts}>
                <li>Vídeos narrados com legenda</li>
                <li>Prática no Simulador</li>
                <li>Sem credencial oficial</li>
              </ul>
              <Link className={styles.courseLink} to="/curso/">Começar o curso</Link>
            </div>
          </section>
        </div>
      </main>
    </Layout>
  );
}
