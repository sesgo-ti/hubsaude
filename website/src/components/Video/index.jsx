import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const formatos = {
  animacao: 'Animação',
  terminal: 'Demonstração no terminal',
  misto: 'Animação e demonstração no terminal',
  tela: 'Demonstração na interface',
  'tela-terminal': 'Animação, demonstração na interface e no terminal',
  gravado: 'Vídeo gravado pela equipe',
};

export function Video({titulo, formato, duracao, src, legenda, poster, children}) {
  const endereco = useBaseUrl(src ?? '');
  const enderecoLegenda = useBaseUrl(legenda ?? '');
  const enderecoPoster = useBaseUrl(poster ?? '');
  const audio = src && formato !== 'gravado' ? (legenda ? 'com narração e legendas' : 'sem áudio') : null;
  const descricaoFormato = [formatos[formato], audio].filter(Boolean).join(', ');
  const detalhes = [descricaoFormato, duracao].filter(Boolean).join(' · ');

  if (!src) {
    return (
      <aside className={styles.reserva} aria-label={`Vídeo em produção: ${titulo}`}>
        <p className={styles.situacao}>Vídeo em produção</p>
        <p className={styles.titulo}>{titulo}</p>
        {detalhes && <p className={styles.detalhes}>{detalhes}</p>}
        {children && <div className={styles.descricao}>{children}</div>}
      </aside>
    );
  }

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
