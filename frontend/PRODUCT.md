# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Avaliadores técnicos e júri (NASA Space Apps Challenge):** Precisam compreender em segundos a proposta do método InSAR com compensação ambiental, alternando entre os 4 cenários calibrados e observando o impacto direto dos filtros físicos no diagnóstico.
- **Engenheiros geotécnicos e analistas de monitoramento de risco:** Operam o painel para inspecionar deformações residuais em barragens e áreas de subsidência, cruzar a malha topográfica 3D com o mapa geográfico de barragens, validar séries temporais por pixel e consultar coordenadas livres com dados NASA POWER, Open-Meteo DEM e NASA CMR / Earthdata Cloud.

## Product Purpose

O PHASE-ZERO é uma camada de triagem e análise interferométrica SAR (NISAR Banda L e Sentinel-1/OPERA Banda C) que separa variações climáticas, atmosféricas e gravitacionais (ionosfera, troposfera, marés terrestres e dilatação termo-hidrometeorológica) do sinal real de deformação estrutural de superfície. O sucesso do produto significa tornar o diagnóstico de estabilidade (Verde, Amarelo, Vermelho) imediatamente legível, rastreável às três métricas físicas e verificável espacial e temporalmente no mesmo fluxo de trabalho.

## Positioning

Diferente de visualizadores InSAR brutos que exibem apenas deslocamento não compensado, o PHASE-ZERO aplica deconvolução ambiental em tempo real com quatro estágios físicos comutáveis e demonstra quantitativamente o antes e o depois na série temporal, no loop termo-mecânico e na malha topográfica 3D por bloco de 80m × 80m.

## Operating Context

- Uso em navegador desktop e tablet em contexto de demonstração técnica, sala de monitoramento ou análise investigativa.
- Fluxo integrado sem esconder ferramentas: seleção rápida de cenários calibrados ou busca no mapa interativo de barragens (estruturas de pé, em descaracterização e históricas), ajuste de compensação física e coerência mínima (`γ`), inspeção de nós na malha topográfica 3D e leitura das séries de deconvolução temporal e loop termo-mecânico.
- Suporte opcional a token Bearer do NASA Earthdata (`urs.earthdata.nasa.gov`) armazenado localmente no navegador para leitura autenticada de granules `.h5`.

## Capabilities and Constraints

- **Idioma e copy:** Interface inteiramente em Português (PT-BR), preservando a terminologia técnica InSAR/geotécnica (`γ`, `LOS`, `TS`, `Banda L/C`, `mm/ciclo`) e o aviso oficial de triagem no rodapé (`Satellite InSAR is a broad-area monitoring and triage layer, not a standalone structural safety system. Uses NISAR Provisional Data.`).
- **Funcionalidades obrigatórias preservadas:**
  - 4 cenários calibrados (`itaipu_normal`, `gongo_soco_active`, `maceio_subsidence`, `brumadinho_hist`);
  - Mapa interativo Leaflet com catálogo brasileiro de barragens, busca por nome/município/estado, filtros por situação física, camadas de mapa e seleção de ponto livre;
  - Barra de período (`start_date`, `end_date`) e busca customizada (`custom_name`, `custom_lat`, `custom_lon`);
  - Viewport topográfico 3D interativo (18×18 = 324 blocos de 80m×80m) com controles de azimute/inclinação, rotação por arraste e inspeção detalhada do pixel selecionado;
  - Diagnóstico em 3 níveis (`GREEN`, `YELLOW`, `RED`), métricas de decisão (`residual_trend_mm_per_pass`, `acceleration_index_mm`, `max_weighted_anomaly_score`), regras de limiares, 4 toggles de compensação física e slider de coerência mínima (`0.10` a `0.90`);
  - Gráfico de Deconvolução Temporal (sinal bruto, esperado NASA POWER e anomalia residual) e Gráfico de Loop Termo-Mecânico (`TS` °C × deslocamento LOS em mm);
  - Modal acessível de configuração do token NASA Earthdata e badges de procedência dos dados (`NASA POWER`, `CMR Granules`, `Stream HDF5`, `Sensor`).
- **Restrições técnicas:** Manter o contrato da API definido em `@phase-zero/shared`, compatibilidade com testes unitários (`vitest`) e E2E (`playwright`), `tsconfig` `strict: true` e ESLint sem `any` explícito.

## Brand Commitments

- Nome oficial: **PHASE-ZERO** (v5.0), associado ao desafio **NASA Space Apps Challenge — Dancing with the SARs**.
- Comunicação técnica objetiva, sem exageros promocionais, mantendo transparência quanto a fallback sintético vs. dados reais da NASA/Open-Meteo e ao papel de triagem do sistema.

## Evidence on Hand

- Contrato completo em `packages/shared/src/schemas.ts`, `constants.ts` e `types.ts`.
- Fixtures golden calibradas em `backend/src/__tests__/fixtures/golden/` e modo mock (`NEXT_PUBLIC_USE_MOCK=1`).
- Catálogo de barragens brasileiras em `frontend/lib/dams.ts` e serviços de backend em `backend/src/`.
- Testes existentes em `frontend/__tests__/projection3d-colors-api.test.ts` e `frontend/e2e/dashboard.spec.ts`.

## Product Principles

1. **Clareza diagnóstica imediata:** Status estrutural, métricas decisórias e procedência dos dados devem ser legíveis à primeira vista sem precisar decifrar blocos visuais ruidosos.
2. **Instrumento de precisão, não vitrine decorativa:** Cada painel, controle e gráfico existe para responder a uma pergunta física ou espacial real; nada entra por puro ornamento.
3. **Visão integrada sem ocultação:** Cenários, mapa geográfico, malha 3D, filtros físicos e gráficos formam um ambiente coeso onde explorar um ponto atualiza tudo de forma previsível.
4. **Honestidade operacional:** Deixar explícito quando a análise usa stream `.h5` real, clima NASA POWER ao vivo ou modelo calibrado/DEM, além dos estados de carregamento, erro e mascaramento por baixa coerência.

## Accessibility & Inclusion

- Suporte completo a navegação por teclado, estados de foco visíveis, modal `<dialog>` nativo acessível e respeito a `prefers-reduced-motion`.
- Não depender exclusivamente de cor ou emojis para indicar severidade ou estado; combinar cor com rótulos textuais claros, símbolos geométricos ou ícones vetoriais consistentes e contraste mínimo WCAG AA (≥4.5:1 para texto normal).
