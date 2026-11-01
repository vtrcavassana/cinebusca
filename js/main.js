// Ponto de entrada: guarda o estado da página e liga os eventos
import { ATRASO_BUSCA_MS } from './config.js';
import { listarFilmes, detalhesFilme, sugestoesFilme, ErroApi } from './api.js';
import { lerFavoritos, ehFavorito, alternarFavorito } from './favoritos.js';
import {
  instalarFallbackDeCapas, renderizarGeneros, renderizarGrade, marcarSelecionado,
  renderizarEsqueleto, renderizarMensagem, renderizarPaginacao,
  renderizarPainelVazio, renderizarPainelCarregando, renderizarPainelErro,
  renderizarDetalhes, renderizarSugestoes, atualizarBotaoFavorito, abrirTrailer,
} from './interface.js';

const estado = {
  busca: '',
  genero: '',
  ordem: 'rating',
  pagina: 1,
  modo: 'catalogo', // 'catalogo' ou 'favoritos'
  selecionado: null, // id do filme aberto no painel
  filmeAberto: null, // dados completos do filme aberto
};

// Contadores para descartar respostas antigas que chegam fora de ordem
let numeroListagem = 0;
let numeroDetalhe = 0;

const elementos = {
  busca: document.getElementById('campo-busca'),
  generos: document.getElementById('lista-generos'),
  ordem: document.getElementById('seletor-ordem'),
  resumo: document.getElementById('resumo'),
  grade: document.getElementById('grade'),
  painel: document.getElementById('painel'),
  paginacao: document.getElementById('paginacao'),
  botaoFavoritos: document.getElementById('botao-favoritos'),
  contadorFavoritos: document.getElementById('contador-favoritos'),
};

function mensagemDeErro(erro) {
  if (erro instanceof ErroApi && erro.tipo === 'indisponivel') {
    return 'A API não respondeu. Ela pode estar fora do ar ou bloqueada pela sua rede.';
  }
  if (erro instanceof ErroApi && erro.tipo === 'nao-encontrado') {
    return 'A API não encontrou este filme.';
  }
  return 'Algo deu errado ao ler a resposta da API.';
}

function atualizarContadorFavoritos() {
  elementos.contadorFavoritos.textContent = String(lerFavoritos().length);
}

async function carregarCatalogo() {
  const minhaListagem = ++numeroListagem;
  renderizarEsqueleto(elementos.grade);
  elementos.paginacao.innerHTML = '';
  elementos.resumo.textContent = 'Carregando…';

  try {
    const resultado = await listarFilmes(estado);
    if (minhaListagem !== numeroListagem) return;

    if (!resultado.filmes.length) {
      elementos.resumo.textContent = '';
      renderizarMensagem(elementos.grade, 'Nenhum filme encontrado', 'Tente outro título ou tire o filtro de gênero.');
      return;
    }
    elementos.resumo.textContent = `${resultado.total.toLocaleString('pt-BR')} filmes encontrados`;
    renderizarGrade(elementos.grade, resultado.filmes, estado.selecionado);
    renderizarPaginacao(elementos.paginacao, resultado.pagina, resultado.totalPaginas);
  } catch (erro) {
    if (minhaListagem !== numeroListagem) return;
    console.error('Erro ao listar filmes:', erro);
    elementos.resumo.textContent = '';
    renderizarMensagem(elementos.grade, 'Não foi possível carregar os filmes', mensagemDeErro(erro),
      { erro: true, tentarDeNovo: true });
  }
}

function mostrarFavoritos() {
  numeroListagem++; // descarta uma listagem do catálogo que ainda esteja a caminho
  const favoritos = lerFavoritos();
  elementos.paginacao.innerHTML = '';
  if (!favoritos.length) {
    elementos.resumo.textContent = '';
    renderizarMensagem(elementos.grade, 'Você ainda não tem favoritos', 'Abra um filme e use o botão Salvar nos favoritos.');
    return;
  }
  elementos.resumo.textContent = `${favoritos.length} ${favoritos.length === 1 ? 'favorito' : 'favoritos'}`;
  renderizarGrade(elementos.grade, favoritos, estado.selecionado);
}

function atualizarLista() {
  elementos.botaoFavoritos.setAttribute('aria-pressed', String(estado.modo === 'favoritos'));
  if (estado.modo === 'favoritos') {
    mostrarFavoritos();
  } else {
    carregarCatalogo();
  }
}

// Volta ao catálogo na página 1 (usado por busca, gênero e ordem)
function recarregarCatalogo() {
  estado.modo = 'catalogo';
  estado.pagina = 1;
  atualizarLista();
}

async function selecionarFilme(id) {
  const meuDetalhe = ++numeroDetalhe;
  estado.selecionado = id;
  estado.filmeAberto = null;
  marcarSelecionado(elementos.grade, id);
  renderizarPainelCarregando(elementos.painel);

  // No celular o painel fica embaixo da grade; rola até ele
  if (window.matchMedia('(max-width: 800px)').matches) {
    elementos.painel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  try {
    const filme = await detalhesFilme(id);
    if (meuDetalhe !== numeroDetalhe) return;
    estado.filmeAberto = filme;
    renderizarDetalhes(elementos.painel, filme, ehFavorito(filme.id));
  } catch (erro) {
    if (meuDetalhe !== numeroDetalhe) return;
    console.error(`Erro ao abrir o filme ${id}:`, erro);
    renderizarPainelErro(elementos.painel, mensagemDeErro(erro));
    return;
  }

  // Sugestões são extras: se falharem, o painel continua de pé
  try {
    const sugestoes = await sugestoesFilme(id);
    if (meuDetalhe !== numeroDetalhe) return;
    renderizarSugestoes(elementos.painel, sugestoes);
  } catch (erro) {
    console.warn(`Sem sugestões para o filme ${id}:`, erro);
  }
}

function ligarEventos() {
  let temporizadorBusca = null;
  elementos.busca.addEventListener('input', () => {
    clearTimeout(temporizadorBusca);
    temporizadorBusca = setTimeout(() => {
      const termo = elementos.busca.value.trim();
      if (termo === estado.busca && estado.modo === 'catalogo') return;
      estado.busca = termo;
      recarregarCatalogo();
    }, ATRASO_BUSCA_MS);
  });

  elementos.generos.addEventListener('click', (evento) => {
    const chip = evento.target.closest('[data-genero]');
    if (!chip) return;
    estado.genero = chip.dataset.genero;
    renderizarGeneros(elementos.generos, estado.genero);
    recarregarCatalogo();
  });

  elementos.ordem.addEventListener('change', () => {
    estado.ordem = elementos.ordem.value;
    recarregarCatalogo();
  });

  elementos.grade.addEventListener('click', (evento) => {
    if (evento.target.closest('[data-acao="tentar"]')) {
      atualizarLista();
      return;
    }
    const cartao = evento.target.closest('[data-id]');
    if (cartao) selecionarFilme(Number(cartao.dataset.id));
  });

  elementos.paginacao.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-pagina]');
    if (!botao) return;
    estado.pagina = Number(botao.dataset.pagina);
    atualizarLista();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  elementos.painel.addEventListener('click', (evento) => {
    const trailer = evento.target.closest('[data-acao="trailer"]');
    if (trailer) {
      abrirTrailer(trailer);
      return;
    }
    if (evento.target.closest('[data-acao="favoritar"]') && estado.filmeAberto) {
      const favorito = alternarFavorito(estado.filmeAberto);
      atualizarBotaoFavorito(elementos.painel, favorito);
      atualizarContadorFavoritos();
      if (estado.modo === 'favoritos') mostrarFavoritos();
      return;
    }
    const sugestao = evento.target.closest('[data-id]');
    if (sugestao) selecionarFilme(Number(sugestao.dataset.id));
  });

  elementos.botaoFavoritos.addEventListener('click', () => {
    estado.modo = estado.modo === 'favoritos' ? 'catalogo' : 'favoritos';
    atualizarLista();
  });
}

function iniciar() {
  instalarFallbackDeCapas();
  renderizarGeneros(elementos.generos, estado.genero);
  elementos.ordem.value = estado.ordem;
  atualizarContadorFavoritos();
  renderizarPainelVazio(elementos.painel);
  ligarEventos();
  atualizarLista();
}

iniciar();
