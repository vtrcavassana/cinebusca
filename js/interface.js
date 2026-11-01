// Funções que desenham a página — não chamam a API nem guardam estado
import { GENEROS } from './config.js';

// Evita que texto vindo da API vire HTML
export function escaparHtml(texto) {
  const trocas = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(texto ?? '').replace(/[&<>"']/g, (caractere) => trocas[caractere]);
}

function traduzirGenero(genero) {
  return GENEROS[String(genero).toLowerCase()] || genero;
}

function formatarNota(nota) {
  return typeof nota === 'number' ? nota.toFixed(1) : '–';
}

function formatarDuracao(minutos) {
  if (!minutos) return '';
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return horas ? `${horas}h ${String(resto).padStart(2, '0')}min` : `${resto}min`;
}

// Só aceita URLs http(s); qualquer outra coisa vira capa vazia
function urlSegura(url) {
  return /^https?:\/\//i.test(url || '') ? url : '';
}

function htmlCapa(filme) {
  const url = urlSegura(filme.capa);
  if (!url) {
    return `<div class="capa capa-vazia">${escaparHtml(filme.titulo)}</div>`;
  }
  return `<img class="capa" src="${escaparHtml(url)}" alt="" loading="lazy" data-titulo="${escaparHtml(filme.titulo)}">`;
}

function htmlCartao(filme, idSelecionado) {
  return `
    <button type="button" class="cartao" data-id="${Number(filme.id)}" aria-pressed="${filme.id === idSelecionado}">
      ${htmlCapa(filme)}
      <div class="cartao-info">
        <p class="cartao-titulo">${escaparHtml(filme.titulo)}</p>
        <div class="cartao-meta"><span>${escaparHtml(filme.ano ?? '')}</span><span>★ ${formatarNota(filme.nota)}</span></div>
      </div>
    </button>`;
}

// Troca capas que não carregaram por um bloco com o título
export function instalarFallbackDeCapas() {
  document.addEventListener('error', (evento) => {
    const imagem = evento.target;
    if (!(imagem instanceof HTMLImageElement) || imagem.dataset.titulo === undefined) return;
    const bloco = document.createElement('div');
    bloco.className = 'capa capa-vazia';
    bloco.textContent = imagem.dataset.titulo;
    imagem.replaceWith(bloco);
  }, true);
}

export function renderizarGeneros(container, generoAtivo) {
  container.innerHTML = Object.entries(GENEROS)
    .map(([valor, nome]) =>
      `<button type="button" class="chip" data-genero="${escaparHtml(valor)}" aria-pressed="${valor === generoAtivo}">${escaparHtml(nome)}</button>`)
    .join('');
}

export function renderizarGrade(container, filmes, idSelecionado) {
  container.innerHTML = filmes.map((filme) => htmlCartao(filme, idSelecionado)).join('');
}

// Marca o cartão escolhido sem redesenhar a grade
export function marcarSelecionado(container, id) {
  container.querySelectorAll('.cartao').forEach((cartao) => {
    cartao.setAttribute('aria-pressed', String(Number(cartao.dataset.id) === id));
  });
}

export function renderizarEsqueleto(container, quantidade = 12) {
  container.innerHTML = '<div class="esqueleto"></div>'.repeat(quantidade);
}

export function renderizarMensagem(container, titulo, texto, { erro = false, tentarDeNovo = false } = {}) {
  container.innerHTML = `
    <div class="mensagem ${erro ? 'erro' : ''}">
      <h2>${escaparHtml(titulo)}</h2>
      <p>${escaparHtml(texto)}</p>
      ${tentarDeNovo ? '<button type="button" class="botao" data-acao="tentar">Tentar de novo</button>' : ''}
    </div>`;
}

export function renderizarPaginacao(container, pagina, totalPaginas) {
  if (totalPaginas <= 1) {
    container.innerHTML = '';
    return;
  }
  const anterior = pagina > 1
    ? `<button type="button" class="botao" data-pagina="${pagina - 1}">‹ Anterior</button>` : '';
  const proxima = pagina < totalPaginas
    ? `<button type="button" class="botao" data-pagina="${pagina + 1}">Próxima ›</button>` : '';
  container.innerHTML = `${anterior}<span>Página ${pagina} de ${totalPaginas.toLocaleString('pt-BR')}</span>${proxima}`;
}

export function renderizarPainelVazio(painel) {
  painel.innerHTML = '<p class="painel-vazio">Escolha um filme para ver os detalhes.</p>';
}

export function renderizarPainelCarregando(painel) {
  painel.innerHTML = '<div class="esqueleto" style="aspect-ratio: 16 / 9"></div><p class="painel-vazio">Carregando detalhes…</p>';
}

export function renderizarPainelErro(painel, texto) {
  renderizarMensagem(painel, 'Não deu para abrir este filme', texto, { erro: true });
}

function textoBotaoFavorito(favorito) {
  return favorito ? '♥ Nos favoritos' : '♡ Salvar nos favoritos';
}

export function atualizarBotaoFavorito(painel, favorito) {
  const botao = painel.querySelector('[data-acao="favoritar"]');
  if (!botao) return;
  botao.textContent = textoBotaoFavorito(favorito);
  botao.setAttribute('aria-pressed', String(favorito));
}

export function renderizarDetalhes(painel, filme, favorito) {
  const codigoTrailer = /^[\w-]{6,20}$/.test(filme.trailer) ? filme.trailer : '';
  const trailer = codigoTrailer
    ? `<button type="button" class="trailer" data-acao="trailer" data-codigo="${codigoTrailer}"
         style="background-image: url('https://i.ytimg.com/vi/${codigoTrailer}/hqdefault.jpg')">
         <span>▶ Assistir trailer</span>
       </button>`
    : '';

  const meta = [filme.ano, formatarDuracao(filme.duracao), filme.classificacao].filter(Boolean).join(' · ');
  const generos = filme.generos.map((g) => `<span class="etiqueta">${escaparHtml(traduzirGenero(g))}</span>`).join('');
  const elenco = filme.elenco.length
    ? `<p class="secao-titulo">Elenco</p><ul class="elenco">${filme.elenco.slice(0, 5)
        .map((a) => `<li>${escaparHtml(a.nome)}${a.personagem ? ` <span>como ${escaparHtml(a.personagem)}</span>` : ''}</li>`)
        .join('')}</ul>`
    : '';
  const linkImdb = /^tt\d+$/.test(filme.imdb)
    ? `<a class="botao" href="https://www.imdb.com/title/${filme.imdb}/" target="_blank" rel="noopener noreferrer">Ver no IMDb</a>`
    : '';

  painel.innerHTML = `
    ${trailer}
    <h2 class="detalhe-titulo">${escaparHtml(filme.titulo)}</h2>
    <p class="detalhe-meta">${escaparHtml(meta)}</p>
    <div class="etiquetas"><span class="etiqueta etiqueta-nota">IMDb ${formatarNota(filme.nota)}</span>${generos}</div>
    <p class="sinopse">${escaparHtml(filme.sinopse || 'Sinopse não disponível.')}</p>
    <div class="acoes">
      <button type="button" class="botao" data-acao="favoritar" aria-pressed="${favorito}">${textoBotaoFavorito(favorito)}</button>
      ${linkImdb}
    </div>
    ${elenco}
    <div id="area-sugestoes"></div>`;
}

export function renderizarSugestoes(painel, filmes) {
  const area = painel.querySelector('#area-sugestoes');
  if (!area || !filmes.length) return;
  area.innerHTML = `
    <p class="secao-titulo">Filmes parecidos</p>
    <div class="sugestoes">${filmes.map((filme) => htmlCartao(filme, null)).join('')}</div>`;
}

// Troca a miniatura pelo player do YouTube (modo sem cookies)
export function abrirTrailer(botao) {
  const codigo = botao.dataset.codigo;
  if (!/^[\w-]{6,20}$/.test(codigo || '')) return;
  const player = document.createElement('iframe');
  player.className = 'trailer';
  player.src = `https://www.youtube-nocookie.com/embed/${codigo}?autoplay=1`;
  player.title = 'Trailer';
  player.allow = 'autoplay; encrypted-media; picture-in-picture';
  player.allowFullscreen = true;
  botao.replaceWith(player);
}
