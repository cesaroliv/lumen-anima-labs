# Lumen Arts — experiência de quadros

Rota pública: https://lumenanima.com/quadros/

Experiência estática em português com descoberta por atmosfera, busca, coleções, favoritos locais, comparação de acabamentos e consulta pelo WhatsApp. Usa HTML, CSS e JavaScript sem dependências ou requisições de analytics.

## Catálogo e imagens

`catalog.json` contém 99 obras: 27 referências configuradas para consulta e 72 em preparação. Os IDs existentes correspondem aos registros de produto; uma referência configurada não afirma disponibilidade para produção. `assets/` contém apenas derivados WebP de navegação, sem recorte ou ampliação. Não incluir os arquivos de impressão completos neste repositório.

Cada obra possui uma chave estável. Preserve essa chave para manter links `?obra=...` e favoritos. Renderizações de moldura caixa com e sem vidro compartilham a referência visual; a página esclarece que a imagem não demonstra o vidro. A grade de medidas é nominal e não certifica dimensões externas ou enquadramento.

## Estado comercial

O fluxo físico é de consulta. `commerce.checkoutEnabled` permanece `false`; alterar essa propriedade isoladamente não habilita cobrança. A página não envia mensagens nem cria pedidos automaticamente. Preços, frete, condições, produção e integração devem ser verificados antes de habilitar uma compra física. Os checkouts digitais existentes permanecem independentes.

## Verificação

Servir a raiz do repositório por HTTP e abrir `/quadros/`. Conferir descoberta, favoritos persistidos, referências, proporção nominal, acabamento/cor, links compartilháveis, navegação por teclado e tela móvel. Os assets de cada família devem apontar para a mesma referência de arte. A pesquisa editorial orienta a experiência; não constitui prova de aumento de conversão.
