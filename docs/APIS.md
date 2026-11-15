# APIs Consumidas pelo PHASE-ZERO

Documentação técnica das APIs externas integradas ao sistema, detalhando objetivo, parâmetros utilizados, endpoints e links oficiais.

---

## 1. APIs de Dados Científicos e Backend

### 1.1 NASA POWER (Prediction Of Worldwide Energy Resources)
* **Objetivo:** Coleta séries temporais diárias de dados meteorológicos para latitude, longitude e intervalo de datas informados. Os dados são usados na compensação ambiental das medições InSAR para isolar deformações termoelásticas, sobrecarga por chuva e atrasos atmosféricos.
* **Parâmetros extraídos:**
  * `TS`: Temperatura da superfície do solo (°C), usada no modelo termoelástico de expansão e contração térmica do maciço.
  * `T2M`: Temperatura do ar a 2 metros (°C).
  * `ALLSKY_SFC_SW_DWN`: Radiação solar de ondas curtas incidente (W/m²), usada no ciclo diurno de insolação.
  * `PRECTOTCORR`: Precipitação acumulada corrigida (mm/dia), usada na estimativa de sobrecarga de água e poro-pressão.
  * `RH2M`: Umidade relativa do ar a 2 metros (%), usada no cálculo de atraso troposférico úmido.
  * `PS`: Pressão atmosférica na superfície (kPa), usada no cálculo de atraso troposférico hidrostático.
* **Arquivo no projeto:** `backend/src/services/nasaPower.ts`
* **Endpoint base:** `https://power.larc.nasa.gov/api/temporal/daily/point`
* **Documentação oficial:** https://power.larc.nasa.gov/docs/services/api/temporal/daily/

---

### 1.2 NASA CMR (Common Metadata Repository)
* **Objetivo:** Catálogo de busca de dados espaciais da NASA. O backend consulta o CMR para descobrir quais cenas de radar (granules) cobrem a coordenada e a janela temporal selecionadas.
* **Coleções consultadas:**
  * `NISAR_L2_GUNW_PROVISIONAL_V1` (Banda L)
  * `NISAR_L2_GUNW_BETA_V1` (Banda L)
  * `OPERA_L3_DISP-S1_V1` (Banda C)
  * `ARIA_S1_GUNW` (Banda C)
* **Critérios de filtro:** Links com protocolo `https://`, extensões `.h5` ou `.nc`, excluindo serviços OPeNDAP para capturar apenas arquivos de dados diretos.
* **Arquivo no projeto:** `backend/src/services/cmr.ts`
* **Endpoint base:** `https://cmr.earthdata.nasa.gov/search/granules.json`
* **Documentação oficial:** https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html

---

### 1.3 NASA Earthdata Cloud / ASF DAAC
* **Objetivo:** Download autenticado dos arquivos HDF5 retornados pelo CMR quando o usuário fornece o Bearer Token do NASA Earthdata. A aplicação faz streaming controlado do arquivo, valida o tamanho máximo permitido, extrai uma grade 18x18 de fase interferométrica ou deslocamento acumulado e matriz de coerência via WebAssembly (`h5wasm`), apagando o arquivo temporário em seguida.
* **Camadas extraídas do HDF5:**
  * NISAR GUNW: `/science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram/HH/unwrappedPhase` e `coherenceMagnitude`
  * OPERA DISP: `displacement` e `temporal_coherence`
* **Arquivo no projeto:** `backend/src/services/h5Stream.ts`
* **Domínios acessados:** `https://datapool.asf.alaska.edu` e `https://urs.earthdata.nasa.gov`
* **Documentação oficial:** https://urs.earthdata.nasa.gov/documentation e https://asf.alaska.edu/data-access/

---

### 1.4 Open-Meteo Elevation API
* **Objetivo:** Modelo digital de elevação (DEM) baseado nas missões SRTM 30m e Copernicus. Utilizado para consultas em coordenadas personalizadas.
* **Mecanismo de consulta:** Faz a requisição de 25 pontos de elevação (grade 5x5 ao redor do ponto central) e aplica interpolação B-spline para gerar a matriz 18x18 de topografia tridimensional do terreno e do talude.
* **Arquivo no projeto:** `backend/src/services/terrain.ts`
* **Endpoint base:** `https://api.open-meteo.com/v1/elevation`
* **Documentação oficial:** https://open-meteo.com/en/docs/elevation-api

---

### 1.5 NASA AppEEARS (Cálculo Mensal de Possível Choque Térmico por Fórmula THM)
* **Objetivo:** Consumo dedicado da API NASA AppEEARS (`MOD11A1.061`) combinada com a série diária da NASA POWER para determinar, mês a mês, se houve ou não possível choque térmico no Mês X a partir da temperatura confirmada do mês e do índice pluviométrico acumulado no mês.
* **Proxy Heurístico e Fundamentação Física:** Como sensores orbitais (NASA POWER / MODIS) medem variáveis meteorológicas de superfície e não parâmetros geotécnicos intrínsecos do material em subsuperfície ($E, \alpha_T, k(\theta)$), o sistema utiliza um **índice heurístico de triagem hidrotermal ($I_{\text{CT}}$, escala 0–100)** cujos termos refletem os mecanismos físicos descritos por **Zhu Bofang (2013) / ICOLD Bulletin 145** (tensão de tração por resfriamento superficial brusco), **Fredlund & Rahardjo (1993)** (perda de sucção matricial por chuva acumulada) e **Painel Forense Robertson et al. (2019)** (gatilho de poro-pressão por infiltração intensa):
  * Fator de Contração Térmica ($F_T$): $F_T = (|\Delta T_{24\text{h–}48\text{h}}| / 11.5^\circ\text{C})^{1.25}$, onde $|\Delta T_{24\text{h–}48\text{h}}|$ é estritamente a **maior queda térmica contínua em janela curta de passagem frontal (1 a 2 dias consecutivos, sem reaquecimento intermediário)**, e nunca a diferença bruta entre o dia mais quente do início do mês e o dia mais frio do fim do mês.
  * Fator de Infiltração Pluviométrica ($F_P$): $F_P = 0.55 \cdot (P_{\text{mês}} / 110\text{ mm}) + 0.45 \cdot (P_{\text{máx24h}} / 34\text{ mm/d})$.
  * Índice de Choque Termo-Pluviométrico do Mês: $I_{\text{CT}} = \text{clip}(52 \cdot F_T \cdot F_P, 0, 100)$ (com trava física $I_{\text{CT}} < 16$ caso $P_{\text{mês}} < 4\text{ mm}$ ou $|\Delta T_{24\text{h–}48\text{h}}| < 3.5^\circ\text{C}$).
  * Regra de decisão direta para o Mês X:
    * $I_{\text{CT}} \ge 38$: **SIM — Possível Choque Térmico Crítico**
    * $20 \le I_{\text{CT}} < 38$: **POSSÍVEL — Choque Térmico Moderado**
    * $I_{\text{CT}} < 20$: **NÃO — Sem Choque Térmico**
* **Relação com barragens rompidas e em alerta crítico:** O módulo cruza a queda térmica ($\Delta T$) e o índice pluviométrico do mês com casos forenses documentados no sistema (Brumadinho B1 em 2019, Fundão em 2015, Miraí em 2007, Gongo Soco / Sul Superior, B3/B4 Maravilhas, Forquilha I/II/III, Derna 2023 e Edenville 2020).
* **Produtos e camadas consultadas:**
  * `MOD11A1.061`: MODIS Terra Land Surface Temperature (`LST_Day_1km` e `LST_Night_1km`).
  * `GPM_3IMERGDF.07` e `NASA POWER PRECTOTCORR`: Precipitação diária acumulada no mês ($P_{\text{mês}}$) e máxima em 24h ($P_{\text{máx24h}}$).
* **Arquivos no projeto:** `backend/src/services/appeears.ts`, `packages/shared/src/appeearsThermoPluvio.ts`, `frontend/components/diagnostics/AppeearsThermoPluvioPanel.tsx`
* **Endpoint base:** `https://appeears.earthdatacloud.nasa.gov/api/product/MOD11A1.061`
* **Documentação oficial:** https://appeears.earthdatacloud.nasa.gov/api/

---

## 2. APIs de Mapas e Interface (Frontend)

### 2.1 OpenStreetMap Tiles
* **Objetivo:** Camada base de mapas vetoriais e visualização de relevo nos modos topográfico e escuro no mapa interativo Leaflet.
* **Arquivo no projeto:** `frontend/components/map/DamMapPanel.tsx`
* **Endpoint base:** `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
* **Documentação oficial:** https://wiki.openstreetmap.org/wiki/Raster_tile_providers

---

### 2.2 Esri ArcGIS World Imagery e Reference
* **Objetivo:** Camada de imagens de satélite de alta resolução combinada com sobreposição de rótulos geográficos (cidades, divisas e rodovias) no painel de visualização de barragens.
* **Arquivo no projeto:** `frontend/components/map/DamMapPanel.tsx`
* **Endpoints base:**
  * Imagem de satélite: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
  * Nomes e divisas: `https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`
* **Documentação oficial:** https://developers.arcgis.com/documentation/mapping-apis-and-services/maps/services/basemap-layer-service/

---

## 3. Recursos Oficiais do Desafio NASA Space Apps (NASA, CSA e Parceiros)

O PHASE-ZERO integra, utiliza e referencia os seguintes recursos oficiais listados no regulamento do desafio:

### 3.1 Agência Espacial Canadense (CSA / ASC)

#### 3.1.1 Synthetic Aperture Radar Python Tutorial
* **Link oficial:** https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial
* **Objetivo e Uso no Projeto:** Fornece a fundação teórica e prática para o processamento de imagens SAR e geração de interferogramas InSAR. O motor do PHASE-ZERO aplica diretamente a equação física de conversão de fase desenrolada para deformação na linha de visada ($d = -\frac{\lambda}{4\pi}\Delta\phi$), o descarte de pixels com baixa coerência interferométrica ($\gamma < \gamma_{\min}$) e a reprojeção geométrica com vetores LOS demonstrados no tutorial.
* **Arquivos no projeto:** `packages/shared/src/constants.ts`, `backend/src/services/h5Stream.ts`, `backend/src/scripts/extract-h5.ts`.

#### 3.1.2 SWOT Mission (Surface Water and Ocean Topography)
* **Link oficial:** https://www.asc-csa.gc.ca/eng/satellites/swot/
* **Objetivo e Uso no Projeto:** Missão conjunta da NASA, CNES, CSA e UK Space Agency equipada com o interferômetro KaRIn para medição milimétrica da cota d'água superficial em 90% dos lagos, reservatórios e rios do planeta. No PHASE-ZERO, a cota do reservatório monitorada pelo SWOT é o dado de entrada para a modelagem da sobrecarga de empuxo hidrostático na face montante das barragens.
* **Arquivos no projeto:** `packages/shared/src/constants.ts`, `packages/shared/src/damsCatalog.ts`.

#### 3.1.3 Radarsat Constellation Mission (RCM) - Data
* **Link oficial:** https://donnees-data.asc-csa.gc.ca/en/dataset/rcm
* **Objetivo e Uso no Projeto:** Trio de satélites SAR em Banda C ($\lambda = 55.5\text{ mm}$) da Agência Espacial Canadense. A arquitetura multi-sensor do PHASE-ZERO suporta nativamente a Banda C (mesmo comprimento de onda de 5.6 cm do RCM e Sentinel-1), permitindo a ingestão e triagem de granules do RCM para monitoramento contínuo em qualquer clima dia/noite.
* **Arquivos no projeto:** `packages/shared/src/constants.ts`, `backend/src/services/pipeline.ts`.

#### 3.1.4 Geo.ca & Monitoring and Protecting our Ecosystem from Space
* **Links oficiais:** http://geo.ca/ e https://www.asc-csa.gc.ca/eng/satellites/everyday-lives/monitoring-and-protecting-our-ecosystems-from-space.asp
* **Objetivo e Uso no Projeto:** Diretrizes da CSA para uso de observação da Terra na gestão de riscos e mitigação de desastres ambientais, aliadas a dados geoespaciais abertos canadenses.

---

### 3.2 Agências Parceiras e Recursos Metodológicos de Séries Temporais

#### 3.2.1 Statistical test methods to detect trends in time series data (Kriss / Medium)
* **Link oficial:** https://medium.com/@snp.kriss/statistical-test-methods-to-detect-trends-in-time-series-data-b361a0ec530b
* **Objetivo e Uso no Projeto:** Guia metodológico para identificação rigorosa de tendências em séries temporais. O PHASE-ZERO implementa no backend o **Teste Não-Paramétrico de Mann-Kendall** e o **Estimador de Inclinação de Sen (Sen's Slope)** para confirmar se o deslocamento residual pós-compensação ambiental reflete uma anomalia estrutural real ou apenas flutuações e ruído branco.
* **Arquivos no projeto:** `packages/shared/src/statisticalTrend.ts`, `backend/src/lib/statisticalTrend.ts`, `backend/src/services/pipeline.ts`, `frontend/components/charts/TimeSeriesChart.tsx`.

#### 3.2.2 A Comprehensive Guide to Statistical Significance (Statsig)
* **Link oficial:** https://www.statsig.com/perspectives/a-comprehensive-guide-to-statistical-significance
* **Objetivo e Uso no Projeto:** Estrutura formal do teste de hipóteses ($H_0$: estabilidade do maciço vs $H_a$: deformação cumulativa ativa) e cálculo de p-valor bicaudal com intervalo de confiança de 95% ($\alpha = 0.05$). Apresentado em tempo real no painel de diagnóstico (`StatusCard`) e no gráfico temporal.
* **Arquivos no projeto:** `packages/shared/src/schemas.ts`, `frontend/components/diagnostics/StatusCard.tsx`.

#### 3.2.3 KNMI Climate Explorer (Royal Netherlands Meteorological Institute)
* **Link oficial:** https://climexp.knmi.nl/
* **Objetivo e Uso no Projeto:** Ferramenta web de análise e correlação de séries climáticas. Utilizada para balizar a modelagem dos ciclos sazonais de temperatura e radiação solar incidentes sobre estruturas de concreto e terra.

---

### 3.3 Dados e Recursos NASA

#### 3.3.1 Time-Series Analysis of Remotely-Sensed SeaWiFS Chlorophyll (NASA NTRS 20090042747)
* **Link oficial:** https://ntrs.nasa.gov/api/citations/20090042747/downloads/20090042747.pdf
* **Objetivo e Uso no Projeto:** Artigo científico da NASA estabelecendo as melhores práticas para criação de séries temporais a partir de sensoriamento remoto por satélite e condução de testes de significância estatística em séries ambientais.

#### 3.3.2 NASA Giovanni & Hydrology Time Series (GES DISC)
* **Links oficiais:** https://giovanni.gsfc.nasa.gov/ e https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series
* **Objetivo e Uso no Projeto:** Ferramentas da NASA para geração e extração de séries temporais de dados hidrológicos e climáticos (GLDAS/NLDAS). O dashboard do PHASE-ZERO fornece links pré-parametrizados com a coordenada e período ativos para exploração imediata no Giovanni.
* **Arquivos no projeto:** `packages/shared/src/constants.ts`, `frontend/components/resources/ResourcesModal.tsx`.

#### 3.3.3 AppEEARS (Application for Extracting and Exploring Analysis Ready Samples)
* **Link oficial:** https://appeears.earthdatacloud.nasa.gov/
* **Objetivo e Uso no Projeto:** Extração de séries de temperatura superficial (`MOD11A1.061` `LST_Day_1km` / `LST_Night_1km`) e acoplamento termo-pluviométrico para responder se a mudança brusca quente-frio com chuva no período é perigosa, além de prever janelas futuras (como uma semana específica em 2027) comparando a discrepância nos 5 anos anteriores e relacionando a casos reais de ruptura e alerta crítico.
* **Arquivos no projeto:** `backend/src/services/appeears.ts`, `packages/shared/src/appeearsThermoPluvio.ts`, `frontend/components/diagnostics/AppeearsThermoPluvioPanel.tsx`.

#### 3.3.4 Climate Data Online (CDO - NOAA NCEI)
* **Link oficial:** https://www.ncei.noaa.gov/cdo-web/
* **Objetivo e Uso no Projeto:** Base global de estações meteorológicas históricas de superfície para verificação de solo e calibração de extremos de precipitação acumulada.
