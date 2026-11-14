import React, {createContext, useContext, useEffect, useState} from 'react';
import Link from '@docusaurus/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
import {chaveProgresso, lerProgresso} from '../Trilha/progresso';
import styles from './styles.module.css';

const ProgressoContext = createContext(null);

function useEtapas(href) {
  return usePluginData('etapas-do-curso').modulos[href] ?? [];
}

function useConcluidas() {
  const [concluidas, setConcluidas] = useState(null);
  useEffect(() => {
    const atualizar = () => setConcluidas(lerProgresso());
    const aoMudar = (evento) => {
      if (evento.key === null || evento.key === chaveProgresso) atualizar();
    };
    atualizar();
    window.addEventListener('storage', aoMudar);
    return () => window.removeEventListener('storage', aoMudar);
  }, []);
  return concluidas;
}

function nomeDoModulo({numero, titulo, extra}) {
  return extra ? 'no módulo extra' : `no Módulo ${numero}: ${titulo}`;
}

function Barra({feitas, total, rotulo}) {
  return (
    <span
      className={styles.barra}
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={feitas}>
      <span style={{width: `${total ? (feitas / total) * 100 : 0}%`}} />
    </span>
  );
}

function Resumo({itens, concluidas}) {
  const principais = itens.filter((item) => !item.extra);
  const total = principais.reduce((soma, item) => soma + item.etapas.length, 0);
  const feitas = principais.reduce((soma, item) => soma + item.etapas.filter(({id}) => concluidas.includes(id)).length, 0);
  const pendente = (lista) => {
    for (const item of lista) {
      const indice = item.etapas.findIndex(({id}) => !concluidas.includes(id));
      if (indice >= 0) return {item, indice, etapa: item.etapas[indice]};
    }
    return null;
  };
  const proxima = pendente(principais);
  const extra = proxima ? null : pendente(itens.filter((item) => item.extra));
  const algumaFeita = itens.some((item) => item.etapas.some(({id}) => concluidas.includes(id)));

  let acao;
  if (!algumaFeita && principais[0]) {
    acao = (
      <p className={styles.acao}>
        Você ainda não marcou nenhuma etapa. <Link to={principais[0].href}>Comece pelo Módulo {principais[0].numero}</Link>.
      </p>
    );
  } else if (proxima || extra) {
    const {item, indice, etapa} = proxima ?? extra;
    acao = (
      <p className={styles.acao}>
        <Link className={styles.continuar} to={`${item.href}#etapa-${etapa.id}`}>Continuar de onde parou</Link>
        <span>
          Próxima etapa: {etapa.titulo}, {nomeDoModulo(item)} (etapa {indice + 1} de {item.etapas.length}).
        </span>
      </p>
    );
  } else {
    acao = <p className={styles.acao}>Você concluiu todas as etapas do curso.</p>;
  }

  return (
    <section className={styles.resumo} aria-labelledby="progresso-curso">
      <p id="progresso-curso" className={styles.resumoTitulo} aria-live="polite">
        <strong>Seu progresso no curso:</strong> {feitas} de {total} etapas concluídas
      </p>
      <Barra feitas={feitas} total={total} rotulo="Progresso no curso" />
      {acao}
    </section>
  );
}

export function Modulos({children}) {
  const {modulos} = usePluginData('etapas-do-curso');
  const concluidas = useConcluidas();
  const itens = React.Children.toArray(children)
    .filter(React.isValidElement)
    .map(({props}) => ({...props, etapas: modulos[props.href] ?? []}));

  return (
    <ProgressoContext.Provider value={concluidas}>
      {concluidas && <Resumo itens={itens} concluidas={concluidas} />}
      <ol className={styles.lista}>{children}</ol>
    </ProgressoContext.Provider>
  );
}

export function Modulo({numero, titulo, href, duracao, videos, extra, children}) {
  const concluidas = useContext(ProgressoContext);
  const etapas = useEtapas(href);
  const detalhes = [duracao, videos].filter(Boolean);
  const feitas = concluidas ? etapas.filter(({id}) => concluidas.includes(id)).length : 0;
  const concluido = concluidas !== null && etapas.length > 0 && feitas === etapas.length;
  const classes = [styles.modulo, extra && styles.extra, concluido && styles.concluido].filter(Boolean).join(' ');
  const nome = extra ? titulo : `Módulo ${numero}: ${titulo}`;

  return (
    <li className={classes}>
      <span className={styles.numero} aria-hidden="true">{concluido ? '✓' : numero}</span>
      <div className={styles.texto}>
        <Link className={styles.titulo} to={href}>{nome}</Link>
        <p className={styles.descricao}>{children}</p>
        {detalhes.length > 0 && (
          <ul className={styles.detalhes}>
            {detalhes.map((d) => <li key={d}>{d}</li>)}
          </ul>
        )}
        {concluidas !== null && etapas.length > 0 && (
          <div className={styles.progresso}>
            <Barra feitas={feitas} total={etapas.length} rotulo={`Progresso em ${nome}`} />
            <span>{concluido ? 'Concluído' : `${feitas} de ${etapas.length} etapas concluídas`}</span>
          </div>
        )}
      </div>
    </li>
  );
}
