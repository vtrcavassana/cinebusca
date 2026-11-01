# CineBusca

Catálogo de filmes para pesquisar por título, ator ou diretor, filtrar por gênero e ver nota,
sinopse, elenco, trailer e filmes parecidos. Site estático (HTML, CSS e JavaScript puro) que
consome a API pública documentada em https://yts.gg/api — **somente metadados**; o site não lê
nem exibe dados de torrent ou links de download.

## Dependências

Nenhuma. Não há build nem pacotes para instalar.

## Como rodar localmente

Os scripts são ES modules, então a página precisa ser servida por HTTP (abrir o `index.html`
direto pelo explorador de arquivos não funciona). Na pasta do projeto:

```bash
python -m http.server 8000
```

Depois abra http://localhost:8000.

## Como publicar no GitHub Pages

1. Crie um repositório público no GitHub e envie o conteúdo desta pasta para a branch `main`.
2. No repositório: Settings → Pages → Source: **GitHub Actions**.
3. Cada push na `main` roda `.github/workflows/pages.yml`, que publica o site em
   `https://<seu-usuario>.github.io/<repositorio>/` em cerca de um minuto.

O workflow troca `__VERSAO__` no `index.html` pelo commit (`estilo.css?v=1a2b3c4d`), então o
navegador baixa CSS e JS novos a cada publicação, sem precisar de Ctrl+F5. Localmente o
`__VERSAO__` fica como está e não atrapalha. Ao criar um novo arquivo JS, inclua-o no import
map do `index.html`.

## Estrutura

```
index.html          página única
css/estilo.css      visual (claro/escuro, responsivo)
js/config.js        endereços da API, tempo limite, itens por página, gêneros
js/api.js           chamadas à API, troca de endereço em caso de falha, limpeza dos dados
js/interface.js     funções que desenham grade, painel, paginação e mensagens
js/favoritos.js     favoritos salvos no navegador (localStorage)
js/main.js          estado da página e eventos
.github/workflows/  publicação no GitHub Pages com versão nos arquivos
TODO.md             pendências
```

## Observações

- Os endereços da API ficam em `js/config.js` (`DOMINIOS_API`). Se o primeiro falhar ou demorar
  mais que `TEMPO_LIMITE_MS`, o site tenta o próximo. Quando o domínio mudar, edite só essa lista.
- Favoritos ficam apenas no navegador de quem usa; limpar os dados do site apaga a lista.
- Se o navegador bloquear as chamadas por CORS, será preciso um proxy (ex.: Cloudflare Worker
  gratuito) e apontar `DOMINIOS_API` para ele.
