import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

export function Cartoes({children}) {
  return <ul className={styles.grade}>{children}</ul>;
}

export function Cartao({titulo, href, quando, children}) {
  return (
    <li className={styles.cartao}>
      <Link className={styles.titulo} to={href}>{titulo}</Link>
      <p className={styles.descricao}>{children}</p>
      {quando && <p className={styles.quando}><strong>Quando usar:</strong> {quando}</p>}
    </li>
  );
}
