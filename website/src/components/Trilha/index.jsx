import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

const storageKey = 'hubsaude-trilha-integracao';
const TrilhaContext = createContext(null);

const ambientes = {
  gestor: 'Feito pelo gestor',
  testes: 'No seu computador',
  oficial: 'Ambiente oficial',
};

function lerProgresso() {
  try {
    const salvo = JSON.parse(window.localStorage.getItem(storageKey));
    return Array.isArray(salvo) ? salvo.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function salvarProgresso(ids) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(ids));
  } catch {}
}

export function Trilha({children}) {
  const lista = useRef(null);
  const [montado, setMontado] = useState(false);
  const [concluidas, setConcluidas] = useState([]);
  const ids = useMemo(
    () => React.Children.toArray(children).filter(React.isValidElement).map((etapa) => etapa.props.id).filter(Boolean),
    [children],
  );

  useEffect(() => {
    setConcluidas(lerProgresso());
    setMontado(true);
  }, []);

  const alternar = useCallback((id) => {
    setConcluidas((atual) => {
      const proximo = atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id];
      salvarProgresso(proximo);
      return proximo;
    });
  }, []);

  const abrirTodas = (aberta) => {
    lista.current?.querySelectorAll('details').forEach((detalhe) => {
      detalhe.open = aberta;
    });
  };

  const total = ids.length;
  const feitas = ids.filter((id) => concluidas.includes(id)).length;
  const contexto = useMemo(() => ({concluidas, alternar, montado}), [concluidas, alternar, montado]);

  return (
    <TrilhaContext.Provider value={contexto}>
      <div className={styles.trilha}>
        {montado && (
          <div className={styles.painel}>
            <div className={styles.progresso}>
              <p aria-live="polite">
                <strong>Seu progresso:</strong> {feitas} de {total} etapas concluídas
              </p>
              <div
                className={styles.barra}
                role="progressbar"
                aria-label="Progresso na trilha de integração"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={feitas}>
                <span style={{width: `${total ? (feitas / total) * 100 : 0}%`}} />
              </div>
            </div>
            <div className={styles.acoes}>
              <button type="button" className={styles.acao} onClick={() => abrirTodas(true)}>Abrir todas</button>
              <button type="button" className={styles.acao} onClick={() => abrirTodas(false)}>Fechar todas</button>
            </div>
          </div>
        )}
        <ol ref={lista} className={styles.etapas}>
          {children}
        </ol>
      </div>
    </TrilhaContext.Provider>
  );
}

export function Etapa({id, marcador, titulo, resumo, ambiente, children}) {
  const {concluidas, alternar, montado} = useContext(TrilhaContext);
  const detalhe = useRef(null);
  const concluida = concluidas.includes(id);

  useEffect(() => {
    if (window.location.hash === `#etapa-${id}` && detalhe.current) detalhe.current.open = true;
  }, [id]);

  return (
    <li id={`etapa-${id}`} className={clsx(styles.etapa, concluida && styles.concluida)}>
      <span className={clsx(styles.marcador, !marcador && styles.marcadorMarco)} aria-hidden="true">
        {concluida ? '✓' : marcador}
      </span>
      <details ref={detalhe} className={styles.cartao}>
        <summary className={styles.cabecalho}>
          <span className={styles.titulo}>
            {titulo}
            {concluida && <span className={styles.situacao}> · concluída</span>}
          </span>
          <span className={styles.resumo}>{resumo}</span>
          <span className={styles.selo} data-ambiente={ambiente}>{ambientes[ambiente]}</span>
        </summary>
        <div className={styles.corpo}>
          {children}
          {montado && (
            <label className={styles.concluir}>
              <input type="checkbox" checked={concluida} onChange={() => alternar(id)} />
              Marcar esta etapa como concluída
            </label>
          )}
        </div>
      </details>
    </li>
  );
}
