// Favoritos guardados só neste navegador (localStorage)
const CHAVE = 'cinebusca:favoritos';

// Devolve a lista salva; em caso de erro (modo privado, dado corrompido) devolve vazia
export function lerFavoritos() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista : [];
  } catch (erro) {
    console.warn('Não foi possível ler os favoritos:', erro);
    return [];
  }
}

function salvarFavoritos(lista) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
    return true;
  } catch (erro) {
    console.warn('Não foi possível salvar os favoritos:', erro);
    return false;
  }
}

export function ehFavorito(id) {
  return lerFavoritos().some((filme) => filme.id === id);
}

// Adiciona ou remove; devolve true se o filme ficou nos favoritos
export function alternarFavorito(filme) {
  const lista = lerFavoritos();
  const indice = lista.findIndex((item) => item.id === filme.id);
  if (indice >= 0) {
    lista.splice(indice, 1);
  } else {
    // Guarda só o necessário para desenhar o cartão sem chamar a API
    lista.unshift({ id: filme.id, titulo: filme.titulo, ano: filme.ano, nota: filme.nota, capa: filme.capa });
  }
  salvarFavoritos(lista);
  return indice < 0;
}
