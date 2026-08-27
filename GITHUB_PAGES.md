# Publicação no GitHub Pages

Este projeto é totalmente estático. Não necessita servidor, banco de dados, API ou serviço pago.

## Estrutura que deve ficar na raiz do repositório

- `index.html`
- `.nojekyll`
- `css/`
- `js/`
- `docs/`
- `README.md`

## Publicação

1. Crie um repositório no GitHub.
2. Envie **o conteúdo desta pasta** para a raiz do repositório (não envie a pasta como uma pasta interna adicional).
3. No repositório, abra **Settings > Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione a branch **main** e a pasta **/(root)**.
6. Clique em **Save**.

O GitHub mostrará o endereço do site após a implantação.

## Privacidade

As planilhas selecionadas pelos usuários são processadas no navegador. O projeto não envia os arquivos para o GitHub nem para outro servidor.

## Atualizar a base de formação

A base oficial de Área disciplinar/Grande Área fica em `data/formacao_docentes.csv`.
Você pode abrir esse arquivo no LibreOffice Calc ou Excel, editar e salvar mantendo CSV UTF-8 com separador `;`. Depois substitua o mesmo arquivo no repositório e faça o commit. O site passará a usar a nova base automaticamente.

## Editando `formacao_docentes.csv` pelo próprio site

Acesse `formacao.html` no site publicado. A página carrega a base atual e permite editar Grande Área/Área em formulário.

Para gravar diretamente em um arquivo local:

1. Clique em **Abrir CSV para edição**.
2. Selecione `data/formacao_docentes.csv` de uma cópia local do repositório.
3. Faça as alterações na tabela.
4. Clique em **Salvar no mesmo arquivo**.
5. Faça commit/push desse arquivo para publicar a nova base.

Chrome/Edge oferecem a gravação direta no mesmo arquivo. Em outros navegadores, a página oferece o salvamento de um novo CSV atualizado.
