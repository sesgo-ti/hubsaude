import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const formatos = {
  animacao: 'Animação',
  terminal: 'Demonstração no terminal',
  misto: 'Animação e demonstração no terminal',
  tela: 'Demonstração na interface',
  'tela-terminal': 'Animação, demonstração na interface e no terminal',
};

export function Video({titulo, formato, duracao, src, legenda, poster, children}) {
  const endereco = useBaseUrl(src);
  const enderecoLegenda = useBaseUrl(legenda ?? '');
  const enderecoPoster = useBaseUrl(poster ?? '');
  const audio = legenda ? 'com narração e legendas' : 'sem áudio';
  const descricaoFormato = [formatos[formato], audio].filter(Boolean).join(', ');
  const detalhes = [descricaoFormato, duracao].filter(Boolean).join(' · ');

  return (
    <figure className={styles.video}>
      <video controls preload="metadata" poster={poster ? enderecoPoster : undefined} src={endereco}>
        {legenda && <track kind="captions" srcLang="pt-BR" label="Português" src={enderecoLegenda} />}
      </video>
      <figcaption>
        <span className={styles.titulo}>{titulo}</span>
        {detalhes && <span className={styles.detalhes}> · {detalhes}</span>}
        {children && <div className={styles.descricao}>{children}</div>}
      </figcaption>
    </figure>
  );
}
