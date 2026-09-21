import React, {useEffect} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useHistory, useLocation} from '@docusaurus/router';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import movedSections from '../data/home-sections.json';
import styles from './index.module.css';

export default function Home() {
  const history = useHistory();
  const {hash, search} = useLocation();
  const baseUrl = useBaseUrl('/');
  const {collectAnchor} = useBrokenLinks();
  ['main', 'htitle', 'comece-aqui', 'ptitle', ...Object.keys(movedSections)].forEach(collectAnchor);

  useEffect(() => {
    const id = hash.slice(1);
    if (Object.hasOwn(movedSections, id)) {
      const destination = movedSections[id];
      const [path, fragment] = destination.split('#');
      history.replace(`${baseUrl}${path}${search}#${fragment}`);
    }
  }, [baseUrl, hash, history, search]);

  return (
    <Layout title="Documentação" description="Orientações para credenciar instituições e integrar sistemas de saúde ao HubSaúde de Goiás.">
      <main id="main" className={styles.home}>
        <div className={styles.content}>
          <header className={styles.introduction}>
            <p className={styles.eyebrow}>Saúde conectada · Estado de Goiás</p>
            <h1 id="htitle">Documentação do <span>HubSaúde</span></h1>
            <p>Orientações para credenciar sua instituição e integrar sistemas de saúde à plataforma do Estado de Goiás.</p>
          </header>

          <section id="comece-aqui" aria-labelledby="ptitle">
            <h2 id="ptitle" className={styles.prompt}>O que você precisa fazer?</h2>
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

          {/* Fragment-only links cannot be redirected by the static host. */}
          {Object.entries(movedSections).map(([id, destination]) => (
            <aside key={id} id={id} className={styles.movedSection}>
              Esta seção agora está na documentação. <Link to={`/${destination}`}>Continuar a leitura no novo endereço</Link>.
            </aside>
          ))}
        </div>
      </main>
    </Layout>
  );
}
