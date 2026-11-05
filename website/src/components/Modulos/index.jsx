import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

export function Modulos({children}) {
  return <ol className={styles.lista}>{children}</ol>;
}

export function Modulo({numero, titulo, href, duracao, videos, extra, children}) {
  const detalhes = [duracao, videos].filter(Boolean);
  return (
    <li className={extra ? `${styles.modulo} ${styles.extra}` : styles.modulo}>
      <span className={styles.numero} aria-hidden="true">{numero}</span>
      <div className={styles.texto}>
        <Link className={styles.titulo} to={href}>{extra ? titulo : `Módulo ${numero}: ${titulo}`}</Link>
        <p className={styles.descricao}>{children}</p>
        {detalhes.length > 0 && (
          <ul className={styles.detalhes}>
            {detalhes.map((d) => <li key={d}>{d}</li>)}
          </ul>
        )}
      </div>
    </li>
  );
}
