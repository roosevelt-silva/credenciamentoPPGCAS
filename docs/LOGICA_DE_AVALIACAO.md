# Lógica de avaliação implementada

## 1. Período

O período padrão segue três anos completos anteriores e os meses anteriores ao mês da solicitação no ano corrente. Assim:

`n_meses = 36 + número de meses completos anteriores no ano corrente`

Janeiro = 36 meses; dezembro = 47 meses.

## 2. Pesos

### Artigos
A1=1,000; A2=0,875; A3=0,750; A4=0,625; B1=0,500; B2=0,375; B3=0,250; B4=0,125.

### Livros
L1=2,0; L2=1,6; L3=1,2; L4=0,8; L5=0,4.

### Capítulos
C1=1,0; C2=0,8; C3=0,6; C4=0,4; C5=0,2.

### Produção técnica
T1=2,0; T2=1,5; T3=1,0; T4=0,5; T5=0,1.

## 3. IndProd

`IndProd = IndArt + IndLiv + IndCap + IndTec`

IndVer e IndArtCult não são utilizados para o PPGCAS nesta aplicação.

## 4. Limites

- B3+B4 não podem superar 20% do total anual de pontos de artigos.
- T5 não pode superar 20% do total anual de pontos de produção técnica.
- máximo de dois capítulos por obra: o portal apenas sinaliza possíveis repetições para conferência e não glosa automaticamente, pois não há identificador inequívoco da obra na planilha.

## 5. IQTF

Calculado com os pesos de artigos que possuem ao menos um discente de PPG informado na coluna de autor/coautor da aba `5_Produtos`.

A exigência mínima de IQTF é aplicada quando a aba `4_Titulados` contém pelo menos seis registros classificados como Mestrado ou Doutorado.

## 6. Qualificação comparativa

O escore comparativo é separado da elegibilidade regulamentar. Os pesos podem ser alterados pelo usuário.

- IndProd: escalonado em relação ao dobro do limiar mínimo (o mínimo equivale a 50 pontos nesse componente).
- Qualidade Qualis: 65% do peso médio dos artigos + 35% da proporção A1–A4.
- IQTF: escalonado em relação ao dobro do limiar mínimo.
- Orientações: escala até seis titulados.
- Projetos/captação: comparação relativa no conjunto analisado; valores financeiros recebem transformação logarítmica.

Faixas, quando o docente atende aos critérios objetivos mensuráveis:

- ≥80: Destaque no grupo
- 65–79,9: Muito competitivo
- 50–64,9: Competitivo
- <50: Habilitado · menor escore comparativo

Se houver falha objetiva, a qualificação é `Não habilitado pelos dados`. As pendências de preenchimento são informativas e não alteram automaticamente a Situação ou a faixa comparativa.

## 7. Artigos sem Qualis

Um artigo pode ser uma produção válida do docente mesmo sem possuir Qualis. Por isso:

- com **ano dentro do período** e Qualis vazio/explicitamente sem Qualis, o artigo permanece na lista de produtos;
- é exibido como **SEM QUALIS**;
- recebe peso `0,000`;
- não aumenta IndArt, IndProd ou IQTF;
- não entra no Qualis médio nem na proporção A1–A4;
- não gera pendência apenas pela ausência de Qualis.

Artigos com texto no campo Qualis que não corresponda a um estrato reconhecido permanecem como pendência para conferência, pois podem representar erro de digitação.

## 8. Separação entre Situação e Pendências

A Situação regulamentar é binária: **Atende** ou **Não atende**. Pendências de preenchimento são mostradas separadamente.

- Produto sem ano e sem Qualis/estrato simultaneamente: descartado, sem pendência.
- Produto com estrato informado e ano ausente: pendência.
- Livro, capítulo ou produto técnico com ano válido e estrato ausente/inválido: pendência.
- Artigo com ano válido e Qualis ausente: **SEM QUALIS**, peso zero, sem pendência.
- Ausência de titulados: não gera pendência.
