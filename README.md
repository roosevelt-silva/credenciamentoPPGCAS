# PPGCAS · Analisador de Credenciamento e Recredenciamento Docente

Aplicação web estática para comparar, de uma só vez, as planilhas preenchidas pelos candidatos ao credenciamento do PPGCAS.

## Como usar

1. Descompacte a pasta.
2. Abra `index.html` no Chrome, Edge, Firefox ou Safari recente.
3. Clique em **Selecionar planilhas** e marque todos os arquivos `.xlsx`/`.xlsm` recebidos dos docentes.
4. Confira a data de referência e os limiares do IndProd/IQTF.
5. Analise o ranking, a situação regulamentar e os detalhes de cada candidato.
6. Se desejar, altere os pesos do escore comparativo.
7. Use **Exportar CSV** ou **Imprimir / PDF** para registrar a comparação.

## Privacidade e custo

- Todo o processamento ocorre no navegador.
- Os arquivos não são enviados a nenhum servidor.
- Não há banco de dados nem serviço pago.
- Funciona como site estático no GitHub Pages.
- O comparador de planilhas funciona como aplicação estática. Para carregar automaticamente a base institucional CSV de formação, use o GitHub Pages (ou um servidor local simples), pois navegadores podem bloquear a leitura de CSV ao abrir via `file://`.

## Estrutura esperada das planilhas

O importador foi construído para o modelo `Inf_Docente_Credenciamento_PPGCAS_2026.xlsx` e procura, de forma tolerante, as abas:

- `1_Info_Docente`
- `4_Titulados`
- `5_Produtos`
- `6_Projetos`
- `7_Infraestrutura`

O cálculo dos produtos usa os valores de **Qualis/estrato preenchidos pelo docente na própria planilha**.

## Indicadores recalculados

- IndArt
- IndLiv
- IndCap
- IndTec
- IndProd = IndArt + IndLiv + IndCap + IndTec
- IQTF para artigos com discente de PPG informado como autor/coautor
- proporção de artigos A1–A4
- peso médio Qualis dos artigos
- número de titulados
- projetos e recursos financeiros declarados
- infraestrutura declarada

### Regras adicionais

- B3+B4: limite de 20% do total anual de pontos de artigos.
- T5: limite de 20% do total anual de pontos de produção técnica.
- Capítulos: a Resolução limita a dois por obra. Como a planilha não possui identificador inequívoco da obra, o portal **não aplica glosa automática**; ele sinaliza repetições para conferência da Comissão.

## Situação regulamentar

O portal separa a situação regulamentar das pendências de preenchimento:

- **Atende**: não foi identificada falha em critério objetivo mensurável.
- **Não atende**: há falha em critério objetivo mensurável, como doutorado ausente, IndProd abaixo do limite ou IQTF abaixo do mínimo quando aplicável.

As **Pendências de dados** aparecem em coluna própria e não alteram a Situação. A ausência de titulados não gera pendência.

### Artigos sem Qualis

- Artigo com **ano informado** e **Qualis em branco** continua constando como produto do docente.
- O portal mostra o estrato como **SEM QUALIS**.
- O artigo recebe **peso 0** e não aumenta o IndArt/IndProd.
- Ele também não entra no cálculo do Qualis médio nem da proporção A1–A4.
- A ausência de Qualis, por si só, **não gera pendência para artigos**.
- Se o docente escrever um estrato não reconhecido no campo Qualis, o portal mantém uma pendência para conferência, pois pode se tratar de erro de digitação.
- Produto sem **ano e sem Qualis/estrato simultaneamente** continua descartado da análise, conforme a regra definida para registros sem informação mínima.

A decisão final é do Colegiado/Comissão e deve considerar a Resolução e o planejamento estratégico.

## Escore comparativo

Não faz parte da Resolução. É um apoio à decisão e os pesos são editáveis na tela.

Padrão:

- IndProd: 45%
- qualidade Qualis: 25%
- IQTF: 10%
- orientações: 10%
- projetos/captação: 10%

A qualidade Qualis combina o peso médio dos artigos com a proporção A1–A4.

## GitHub Pages

Basta colocar o conteúdo desta pasta no repositório e habilitar GitHub Pages. O analisador continua sem banco de dados, API privada, token ou serviço externo pago. A base institucional de formação é o arquivo `data/formacao_docentes.csv`.


## Regras de pendências e produtos sem Qualis (v0.1.3)

- A coluna **Situação** possui apenas **Atende** ou **Não atende**.
- **Pendências de dados** aparecem em coluna própria e não alteram a Situação.
- Artigo com ano válido e Qualis não informado: **SEM QUALIS**, peso zero, sem pendência.
- Produto não-artigo com ano válido e estrato ausente/inválido: gera pendência e não é pontuado.
- Produto com estrato informado e ano ausente: gera pendência e não é pontuado.
- Produto sem ano e sem Qualis/estrato ao mesmo tempo: é descartado da análise e não gera pendência.


## Pacote pronto para GitHub Pages

O conteúdo desta pasta pode ser enviado diretamente para a raiz de um repositório GitHub Pages. Consulte `GITHUB_PAGES.md`.

## Matrizes comparativas

O painel inclui quatro matrizes de comparação conjunta dos docentes:

- **Docentes × Qualis dos artigos**: A1–B4 e SEM QUALIS; o rótulo mostra o IndProd total do docente.
- **Produção com discentes × Qualis dos artigos**: considera apenas artigos com pelo menos um discente PPG associado. O rótulo mostra o IndProd recalculado exclusivamente com todos os produtos que possuem discentes associados.
- **Orientandos e titulados**: orientandos, titulados e total.
- **Projetos e valores**: número de projetos e valor total declarado.

O valor exato aparece dentro de cada célula. Na matriz de projetos, a intensidade da cor é normalizada separadamente por coluna, porque número de projetos e valores em reais possuem escalas diferentes.


## Análises de interdisciplinaridade e linhas de pesquisa

A versão 0.3 acrescenta:

- gráfico **Produção por linha de pesquisa × Qualis**, separando as duas linhas do PPGCAS, mostrando a quantidade de artigos A1–B4 e exibindo no rótulo do docente o **IndProd calculado separadamente para cada linha**;
- leitura do campo **Área do título de doutorado** (aba `1_Info_Docente`, célula F10 no modelo atual) e gráfico de distribuição das áreas de formação dos candidatos;
- cálculo de **IndProd por linha de pesquisa** para inferir a linha predominante da produção do candidato;
- simulador de impacto da entrada de candidatos sobre a composição das linhas do PPGCAS;
- duas bases institucionais para a simulação: **docentes permanentes** ou **permanentes + colaboradores**;
- índice de concentração **HHI** das duas linhas (0,50 = equilíbrio perfeito entre duas linhas; valores maiores indicam maior concentração).
- a composição das linhas é tratada apenas como análise de planejamento interno e **não recebe os limites CAPES de 60%/80%**.

### Base atual das linhas

A composição inicial foi transcrita da página oficial **Docentes e Pesquisadores** do PPGCAS, consultada em 27/08/2026. Como o site é estático, essa base deve ser atualizada no arquivo `js/app.js` quando houver mudanças no quadro docente.

A linha principal de cada candidato é inferida pela produção cadastrada na planilha. Quando há produção em apenas uma linha, essa linha fica fixa no simulador. A escolha manual entre Linha 1 e Linha 2 aparece somente quando o docente possui produção nas duas linhas. Candidatos sem produção classificada em nenhuma das duas linhas ficam como linha não definida.

## Concentração da formação do corpo docente permanente

A versão 0.3.2 separa a análise de linhas de pesquisa da análise de formação/titulação exigida como referência pela Área Interdisciplinar da CAPES.

- Limite por Área disciplinar: padrão de 60% do corpo docente permanente, editável no próprio site.
- Limite por Grande Área: padrão de 80% do corpo docente permanente, editável no próprio site.
- A Grande Área Multidisciplinar não é tratada como concentração vedada no limite de 80%.
- A Área Interdisciplinar não é tratada como Área disciplinar externa no limite de 60%.
- A página oficial do PPGCAS fornece os nomes e linhas dos docentes atuais, mas não a classificação de formação/titulação necessária para esses limites. Por isso, o site pré-carrega os nomes dos permanentes e oferece uma tabela local editável para registrar Área disciplinar CAPES e Grande Área.
- Se a planilha de um docente permanente atual estiver carregada, o campo “Área do título de doutorado” é usado como sugestão inicial.
- Para candidatos, o mesmo campo é usado como ponto de partida e a Grande Área recebe uma sugestão automática quando a correspondência é inequívoca; ambas as classificações podem ser corrigidas antes da simulação.
- A seleção da coluna “Comparar” projeta o efeito conjunto dos novos candidatos sobre os dois limites.

A análise das linhas de pesquisa continua disponível como instrumento de planejamento interno, mas não utiliza os limites de 60%/80%.



## Base institucional de formação em CSV (v0.3.5)

A classificação dos docentes atuais em **Área disciplinar CAPES** e **Grande Área** foi simplificada para um único arquivo:

`data/formacao_docentes.csv`

O arquivo usa separador `;`, codificação UTF-8 e pode ser aberto/salvo diretamente no **LibreOffice Calc** ou Excel. As colunas são:

- `nome`
- `categoria`
- `linha`
- `area_disciplinar`
- `grande_area`
- `lattes`
- `limite_area_disciplinar`
- `limite_grande_area`

Os limites padrão de 60% e 80% ficam registrados no próprio CSV (na primeira linha que contenha esses campos) e continuam editáveis na interface do analisador.

A página `formacao.html` serve apenas para consultar a base publicada e possui um link para baixar/abrir o CSV. Para atualizar a base institucional, edite **esse mesmo arquivo** e substitua `data/formacao_docentes.csv` no repositório. Não há exportação/importação JSON, token ou API de escrita.

### Sincronização com o quadro atual

O workflow `.github/workflows/sync_docentes.yml` consulta periodicamente a página oficial do PPGCAS e atualiza `js/docentes_atuais.js`. Na mesma execução ele também sincroniza `data/formacao_docentes.csv`:

- docente já existente no CSV → preserva `area_disciplinar` e `grande_area`;
- docente novo → inclui o nome com Área e Grande Área em branco;
- linha, categoria e link Lattes são atualizados a partir do quadro sincronizado quando disponíveis.

O analisador usa apenas os docentes permanentes atuais nos cálculos de concentração de formação.

## Editor HTML da base de formação e taxonomia CNPq (v0.3.6)

A página `formacao.html` passou a funcionar como editor do arquivo institucional `data/formacao_docentes.csv`.

- Ao abrir a página no GitHub Pages, o CSV publicado é carregado automaticamente para consulta/edição.
- Em Chrome/Edge, **Abrir CSV para edição** usa a File System Access API. Depois de escolher o arquivo local `formacao_docentes.csv`, **Salvar no mesmo arquivo** grava diretamente no arquivo escolhido.
- Em navegadores sem essa API, o sistema usa um seletor de arquivo comum e salva/baixa um novo `formacao_docentes.csv` como fallback.
- Os limites de 60% (Área) e 80% (Grande Área) também são editáveis na página e continuam armazenados no próprio CSV.
- Grande Área e Área são menus encadeados. Ao escolher uma Grande Área, o menu Área apresenta apenas as áreas correspondentes.
- A mesma taxonomia é usada para os candidatos na simulação de concentração da formação.

A taxonomia incorporada está em `js/cnpq-areas.js` e reproduz os níveis **Grande área** e **Área** da Tabela de Áreas do Conhecimento disponibilizada pelo CNPq, incluindo a categoria `Outra` e suas áreas atualmente listadas. O arquivo possui códigos CNPq como referência, mas o CSV armazena os nomes para manter compatibilidade com as análises existentes.

### Observação sobre GitHub Pages

Uma página estática publicada no GitHub Pages não pode sobrescrever diretamente um arquivo do repositório sem autenticação. O botão de salvar grava no **arquivo local escolhido pelo navegador**. Para tornar a alteração institucional/pública, substitua `data/formacao_docentes.csv` no repositório (ou edite a cópia local de um clone do repositório e faça o commit normalmente).


## Uso local da base de formação

Quando o `index.html` é aberto diretamente por `file://`, o navegador pode bloquear `fetch()` de arquivos CSV vizinhos. Por isso, a versão atual inclui uma cópia incorporada da base institucional em `js/formacao_docentes_embutida.js`. No GitHub Pages, o analisador continua priorizando `data/formacao_docentes.csv`. No bloco 5, o botão **Abrir CSV local** permite carregar manualmente uma versão mais recente durante testes locais.

### Distribuição completa da formação
Na seção **5. Concentração da formação do corpo docente permanente**, o analisador mostra todas as Grandes Áreas e todas as Áreas disciplinares presentes na base, com número de docentes e percentual sobre o total de permanentes. A mesma decomposição é recalculada para o cenário projetado com os candidatos selecionados.

## Seleção na análise de formação

Na seção **5. Concentração da formação do corpo docente permanente**, a projeção possui uma seleção própria de candidatos. Os docentes podem ser marcados diretamente na caixa **Selecione os candidatos para a projeção** ou pela coluna **Projetar** da tabela de impacto individual. Essa seleção é independente da opção **Comparar** usada em outras partes do analisador.


## Projeção de formação — seção 5
Na seção de concentração da formação, todos os candidatos novos carregados aparecem diretamente no painel **Após inclusões**. Cada candidato possui a opção **Incluir**. A projeção começa com o corpo permanente atual e é recalculada em tempo real à medida que os nomes são marcados ou desmarcados. A tabela de impacto individual permanece abaixo apenas para mostrar o efeito isolado de cada candidato nos limites por Área disciplinar e Grande Área.

## Seleção única de docentes para inclusão

A primeira coluna do ranking é **Selecionados/inclusos**. Os docentes marcados nessa coluna são usados simultaneamente na comparação detalhada e nas projeções dos painéis de linhas de pesquisa e de concentração da formação. A seção de formação não possui uma seleção própria: o painel **Após inclusões** compara diretamente a composição atual com os docentes selecionados no ranking.


### v0.3.14
Nos gráficos **Docentes × Qualis dos artigos** e **Produção com discentes × Qualis dos artigos**, o índice exibido ao lado do nome é o **IndArt** (somente artigos). No segundo gráfico, o IndArt é recalculado apenas com artigos que possuem ao menos um discente PPG associado. Livros, capítulos e produtos técnicos não entram nesses dois índices.


## v0.3.15
- No ranking, A1–A4 passa a mostrar o IndArt calculado apenas com artigos A1–A4 e o percentual desse índice sobre o IndProd total.
- Pesos iniciais do escore: Qualidade Qualis 75, IndProd 10, Orientações 10, Projetos/captação 3 e IQTF 2.
- Qualidade Qualis aparece primeiro na sequência dos pesos.

## Normalização do escore comparativo (v0.3.17)

- **Qualidade Qualis:** já está em escala 0–100 e corresponde ao percentual do IndProd proveniente de artigos A1–A4.
- **IndProdScore:** permanece no modelo anterior: IndProd mínimo = 50 pontos; 2× o mínimo = 100 pontos; valores superiores permanecem em 100.
- **IQTF:** `100 × IQTF_i / IQTF_máximo` no conjunto carregado.
- **Orientações:** `100 × N_i / N_máximo` no conjunto carregado (mantendo o mesmo número de titulados usado pelo componente Orientações da versão anterior).
- **Projetos:** `100 × N_projetos_i / N_projetos_máximo`.
- **Captação:** aplica-se `log(1 + valor)` e depois `100 × valor_log_i / valor_log_máximo`.
- **Projetos/captação:** 35% do escore normalizado de número de projetos + 65% do escore normalizado de captação.
- O escore final é a média ponderada dos componentes, dividida pela soma dos pesos ativos.
