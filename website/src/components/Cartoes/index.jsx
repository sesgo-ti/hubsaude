import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

export function Cartoes({colunas, children}) {
  return <ul className={colunas ? `${styles.grade} ${styles.fixa}` : styles.grade} style={colunas ? {'--colunas': colunas} : undefined}>{children}</ul>;
}

export function Cartao({titulo, href, quando, children}) {
  return (
    <li className={styles.cartao}>
      {href ? <Link className={styles.titulo} to={href}>{titulo}</Link> : <p className={styles.tituloFixo}>{titulo}</p>}
      <p className={styles.descricao}>{children}</p>
      {quando && <p className={styles.quando}><strong>Quando usar:</strong> {quando}</p>}
    </li>
  );
}
