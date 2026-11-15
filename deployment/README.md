# Deploy no Rubix

O workflow `deploy.yml` publica as imagens `phasezero` e `api-phasezero` no GHCR. O Flux aplica `deployment/rubix` no namespace `phasezero`; os Services `phasezero` e `api-phasezero` recebem exposição automática do Rubix.

## Endereços

- Frontend: `https://phasezero.smolak.dpdns.org`
- API: `https://api-phasezero.smolak.dpdns.org`

## GitHub Actions variables

Crie estas **Repository variables** em Settings → Secrets and variables → Actions → Variables:

### `ENV_FILE_FRONT`

Conteúdo multiline de `frontend/.env.example`, com:

```dotenv
NEXT_PUBLIC_API_URL=https://api-phasezero.smolak.dpdns.org
NEXT_PUBLIC_USE_MOCK=0
```

### `ENV_FILE_BACK`

Conteúdo multiline de `backend/.env.example`, com `CORS_ORIGIN` ajustado para:

```dotenv
CORS_ORIGIN=https://phasezero.smolak.dpdns.org
```

As variáveis são gravadas em arquivos temporários do runner do GitHub Actions e não são impressas nos logs. Não coloque credenciais secretas nesses arquivos: use Actions Secrets para qualquer segredo futuro.

## Flux

O bootstrap usa `deployment/flux-system/phase-zero-source.yaml`, com uma `GitRepository` SSH e uma `Kustomization` para `./deployment/rubix`. A chave privada já está na VM em `/home/ubuntu/.ssh/flux-phasezero-app`; o Secret `phasezero-app-auth` foi criado em `flux-system`. A chave pública deve ser adicionada ao GitHub como `phasezero-app-flux`, com acesso somente leitura. O Secret `ghcr-secret` também foi copiado para o namespace `phasezero` para baixar imagens privadas.

Depois que a chave pública for cadastrada no GitHub e as alterações deste repo forem enviadas para `main`, aplique o bootstrap na VM:

```bash
KUBECONFIG=/home/ubuntu/.kube/config kubectl apply \
  -f https://raw.githubusercontent.com/Smolakjc/phase-zero-app/main/deployment/flux-system/phase-zero-source.yaml
```
