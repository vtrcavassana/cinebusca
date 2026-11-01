// Comunicação com a API de filmes — lê só metadados, nunca dados de torrent
import { DOMINIOS_API, TEMPO_LIMITE_MS, ITENS_POR_PAGINA } from './config.js';

// Erro com tipo, para a interface escolher a mensagem certa
// tipos: 'indisponivel' (nenhum domínio respondeu) e 'nao-encontrado'
export class ErroApi extends Error {
  constructor(tipo, mensagem) {
    super(mensagem);
    this.name = 'ErroApi';
    this.tipo = tipo;
  }
}

// Índice do último domínio que respondeu bem; as próximas chamadas começam por ele
let dominioAtual = 0;

// Faz o fetch e desiste depois de TEMPO_LIMITE_MS
async function buscarComTempoLimite(url) {
  const controle = new AbortController();
  const temporizador = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(url, { signal: controle.signal });
    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }
    return await resposta.json();
  } finally {
    clearTimeout(temporizador);
  }
}

// Chama um endpoint tentando cada domínio até um responder com status "ok"
async function chamarApi(endpoint, parametros) {
  const consulta = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor !== '' && valor !== undefined && valor !== null) {
      consulta.set(chave, String(valor));
    }
  }

  for (let tentativa = 0; tentativa < DOMINIOS_API.length; tentativa++) {
    const indice = (dominioAtual + tentativa) % DOMINIOS_API.length;
    const url = `${DOMINIOS_API[indice]}/${endpoint}?${consulta}`;
    try {
      const json = await buscarComTempoLimite(url);
      if (json?.status !== 'ok' || !json.data) {
        throw new Error(json?.status_message || 'Resposta inesperada');
      }
      dominioAtual = indice;
      return json.data;
    } catch (erro) {
      const motivo = erro.name === 'AbortError' ? 'tempo esgotado' : erro.message;
      console.warn(`Falha em ${DOMINIOS_API[indice]}/${endpoint}: ${motivo}`);
    }
  }
  throw new ErroApi('indisponivel', 'Nenhum endereço da API respondeu');
}

// Copia só os campos que o site usa; torrents, hashes e afins ficam de fora
function limparFilme(bruto) {
  return {
    id: bruto.id,
    imdb: bruto.imdb_code || '',
    titulo: bruto.title || bruto.title_english || 'Sem título',
    ano: bruto.year || null,
    nota: typeof bruto.rating === 'number' ? bruto.rating : null,
    duracao: bruto.runtime || null,
    classificacao: bruto.mpa_rating || '',
    generos: Array.isArray(bruto.genres) ? bruto.genres : [],
    sinopse: bruto.description_full || bruto.summary || bruto.synopsis || '',
    capa: bruto.medium_cover_image || '',
    trailer: bruto.yt_trailer_code || '',
    elenco: Array.isArray(bruto.cast)
      ? bruto.cast.map((ator) => ({ nome: ator.name || '', personagem: ator.character_name || '' }))
      : [],
  };
}

// Lista filmes com busca, gênero, ordenação e página
export async function listarFilmes({ busca, genero, ordem, pagina }) {
  const dados = await chamarApi('list_movies.json', {
    query_term: busca,
    genre: genero,
    sort_by: ordem,
    order_by: ordem === 'title' ? 'asc' : 'desc',
    page: pagina,
    limit: ITENS_POR_PAGINA,
  });
  const total = Number(dados.movie_count) || 0;
  return {
    filmes: Array.isArray(dados.movies) ? dados.movies.map(limparFilme) : [],
    total,
    pagina: Number(dados.page_number) || pagina,
    totalPaginas: Math.max(1, Math.ceil(total / ITENS_POR_PAGINA)),
  };
}

// Detalhes de um filme, com elenco
export async function detalhesFilme(id) {
  const dados = await chamarApi('movie_details.json', { movie_id: id, with_cast: true });
  if (!dados.movie || !dados.movie.id) {
    throw new ErroApi('nao-encontrado', `Filme ${id} não encontrado`);
  }
  return limparFilme(dados.movie);
}

// Até 4 filmes parecidos
export async function sugestoesFilme(id) {
  const dados = await chamarApi('movie_suggestions.json', { movie_id: id });
  return Array.isArray(dados.movies) ? dados.movies.map(limparFilme) : [];
}
