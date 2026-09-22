# Testes

Execute `npm run check` em `website/` para gerar um build limpo e validar o portal.
Na primeira execução, instale o navegador com `npx playwright install --with-deps chromium`.

- Documentos e páginas são descobertos automaticamente, sem listas ou contagens fixas.
- A validação cobre sintaxe MDX, links internos, imagens e fluxos essenciais de navegação e busca.
- Capturas e traces ficam em `test-results/`, fora do Git.

Adicionar ou editar conteúdo comum não exige mudar testes. Atualize-os apenas ao
alterar um comportamento. Correção técnica, clareza, privacidade das imagens e
links externos continuam dependendo de revisão separada.
