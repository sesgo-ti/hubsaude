import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

function Icone() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
      <path d="M8 1.5v8.25m0 0L4.75 6.5M8 9.75l3.25-3.25M2.5 11v2.5h11V11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Baixar({arquivo, nome, compacto}) {
  const endereco = useBaseUrl(`/curso/arquivos/${arquivo}`);
  const nomeArquivo = nome ?? arquivo.split('/').pop();
  return (
    <a className={compacto ? `${styles.baixar} ${styles.compacto}` : styles.baixar} href={endereco} download={nomeArquivo} data-arquivo={arquivo}>
      <Icone />
      Baixar <code>{nomeArquivo}</code>
    </a>
  );
}
