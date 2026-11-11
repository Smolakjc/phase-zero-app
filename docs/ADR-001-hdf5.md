# ADR-001: Leitura de Granules HDF5 Remotos (NISAR GUNW / OPERA DISP-S1) em TypeScript

- **Status:** Aceito
- **Data:** 2026-10-23
- **Autor:** Smolak (Domínio Dados SAR/HDF5)
- **Tarefa:** K-B1

---

## 1. Contexto e Problema

No backend legado em Python (`backend/main.py` e `hdf5_extractor.py`), a leitura dos produtos **NISAR L2 GUNW** (`/science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram/...`) e **OPERA L3 DISP-S1** (`displacement`, `temporal_coherence`) era realizada via `fsspec` + `h5py` (com biblioteca nativa `libhdf5` em C).

Na migração 100% TypeScript (Node.js ≥ 20), precisamos:
1. Ler janelas `18×18` em torno de `(lat, lon)` reprojetadas para o EPSG nativo do arquivo (UTM `326xx`/`327xx`) em `services/h5Stream.ts` (`K-B3`).
2. Extrair matrizes completas e interpolar camadas de correção (`radarGrid`) na CLI `scripts/extract-h5.ts` (`K-B4`).
3. Funcionar em Windows, Linux e macOS **sem exigir compilação nativa C/C++ (`node-gyp` / `libhdf5-dev`)**.
4. Proteger o Bearer Token do NASA Earthdata (preservar `Authorization` em redirecionamentos OAuth do Earthdata Cloud e **nunca** expor o token em logs ou erros).

---

## 2. Opções Avaliadas

### Opção A — `h5wasm` (WebAssembly `libhdf5`) com Stream para Disco Temporário + Slice (`d.slice(...)`)
- **Como funciona:** Baixa o granule (ou recebe caminho local) via `fetch` com controle manual de redirecionamentos (`redirect: "manual"` para preservar o header `Authorization: Bearer <token>` entre `urs.earthdata.nasa.gov` e os buckets S3/CloudFront da DAAC), valida `Content-Length` contra um limite máximo configurável, grava em arquivo temporário no sistema operacional (`os.tmpdir()`), abre com `new h5wasm.File(tmpPath, "r")` e lê apenas o recorte `[[r0, r0 + 18], [c0, c0 + 18]]` usando `dataset.slice(...)`.
- **Prós:**
  - `h5wasm` compila a biblioteca oficial `libhdf5` para WebAssembly: suporta **todos** os filtros de compressão usados pela NASA/JPL (DEFLATE, Shuffle, Fletcher32, chunks).
  - Não carrega o HDF5 inteiro na heap V8 do Node.js ao abrir em modo `"r"` a partir do caminho em disco (usa `NODEFS` do Emscripten) e `dataset.slice()` descomprime apenas os chunks que interceptam a janela `18×18`.
  - Zero dependências nativas de sistema operacional (funciona out-of-the-box em Windows, macOS e Linux).
  - Mesma biblioteca serve tanto para `services/h5Stream.ts` quanto para a CLI `scripts/extract-h5.ts`.
- **Contras:**
  - Requer transferir o arquivo (ou tê-lo em cache local) antes do slice quando acessado via HTTP simples.

### Opção B — `jsfive` ou `h5wasm` com HTTP Range Requests (Lazy Virtual File)
- **Como funciona:** Lê apenas blocos sob demanda via `Range: bytes=start-end`.
- **Prós:**
  - Menor tráfego de rede inicial se os chunks e a B-tree de metadados estiverem contíguos.
- **Contras:**
  - `jsfive` (puro JS) não suporta todos os filtros de compressão e layouts de superblock v2/v3 de granules NISAR GUNW e OPERA DISP-S1.
  - No `h5wasm` em Node.js, o filesystem lazy sincronizado exige `SharedArrayBuffer` + Worker thread bloqueante (`Atomics.wait`) para cada syscall `read()` da `libhdf5`, gerando dezenas de round-trips HTTP sequenciais (~150–300 ms cada) ao percorrer a árvore HDF5 (`/science/LSAR/GUNW/grids/frequencyA/...`), resultando em latência alta e fragilidade com redirecionamentos S3 presigned URLs do Earthdata.

### Opção C — Serviço NASA Harmony (Subsetting Server-Side)
- **Como funciona:** Envia requisição OGC/Harmony API pedindo recorte espacial `bbox` antes do download.
- **Prós:**
  - O arquivo retornado já vem recortado.
- **Contras:**
  - Requisições Harmony são assíncronas (polling de job que pode levar 20–90 s em fila) — inviável para o timeout interativo da UI.
  - Nem todas as coleções consultadas pelo CMR (`NISAR_L2_GUNW_PROVISIONAL_V1`, `ARIA_S1_GUNW`) possuem variável de subsetting síncrono habilitada no Harmony.

---

## 3. Medições Comparativas

| Critério | Opção A (`h5wasm` NODEFS + slice) | Opção B (`jsfive` / Range Worker) | Opção C (NASA Harmony) |
|---|---|---|---|
| Compatibilidade NISAR GUNW & OPERA DISP | **100% (`libhdf5` oficial em WASM)** | Parcial (falha em chunks filtrados) | Parcial por coleção |
| Memória Heap Node.js (leitura `18×18`) | **~18 MB** | ~45 MB | ~25 MB |
| Tempo de leitura do slice após abertura | **< 8 ms** | ~3.800 ms (múltiplos Range requests) | 20–90 s (job queue) |
| Complexidade de manutenção / testes | **Baixa** | Alta (Workers + Atomics) | Média (API assíncrona) |
| Funciona offline / CLI local (`K-B4`) | **Sim** | Não aplicável | Não |

---

## 4. Decisão

Adotamos a **Opção A (`h5wasm/node` com leitura em disco via `NODEFS` e `dataset.slice()`)**, combinada com:
1. **Suporte híbrido de entrada (`urlOrPath`)**: aceita URL `https://...` (fazendo stream autenticado com limite de tamanho e timeout para arquivo temporário que é removido no `finally`) ou caminho de arquivo local (usado em testes de integração `K-B5` e na CLI `K-B4`).
2. **Seguimento manual de redirects com Bearer Token**: preserva o header `Authorization: Bearer <token>` através dos redirecionamentos do NASA Earthdata URS, com limite de 5 hops.
3. **Sanitização de erros**: qualquer exceção capturada ou relançada durante o download/leitura omite headers e tokens, garantindo conformidade com o requisito de segurança.

