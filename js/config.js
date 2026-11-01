// Configurações do site — mude aqui, não espalhe pelo código

// Endereços da API, em ordem de preferência. Se o primeiro falhar, tenta o próximo.
// Fonte: https://yts.gg/api (o yts.gg ainda responde, mas pode ser desativado)
export const DOMINIOS_API = [
  'https://movies-api.accel.li/api/v2',
  'https://yts.gg/api/v2',
];

// Tempo máximo de espera por resposta, em milissegundos
export const TEMPO_LIMITE_MS = 10000;

// Filmes por página (a API aceita de 1 a 50). A grade usa 2, 3, 4 ou 6 colunas;
// se mudar este número, mantenha-o divisível por elas (ver css/estilo.css)
export const ITENS_POR_PAGINA = 24;

// Espera depois da última tecla antes de buscar, em milissegundos
export const ATRASO_BUSCA_MS = 400;

// Gêneros exibidos nos filtros: valor da API -> nome em português
export const GENEROS = {
  '': 'Todos',
  action: 'Ação',
  adventure: 'Aventura',
  animation: 'Animação',
  comedy: 'Comédia',
  crime: 'Crime',
  documentary: 'Documentário',
  drama: 'Drama',
  family: 'Família',
  fantasy: 'Fantasia',
  horror: 'Terror',
  romance: 'Romance',
  'sci-fi': 'Ficção científica',
  thriller: 'Suspense',
};
