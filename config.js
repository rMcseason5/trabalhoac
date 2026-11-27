// CONFIGURAÇÃO DO JOGO
// Podes alterar as palavras e as pistas nesta lista.
// Escreve as palavras sem espaços, acentos ou hífenes.
const terms = [
  { word: "SIMPLEX", clue: "Tipo de comunicação em que os dados circulam num único sentido." },
  { word: "ATENUACAO", clue: "Perda de potência ou intensidade de um sinal durante a propagação." },
  { word: "DISTORCAO", clue: "Alteração da forma original de um sinal." },
  { word: "AMPLITUDE", clue: "Valor máximo da intensidade de uma onda em relação à sua posição de equilíbrio." },
  { word: "FREQUENCIA", clue: "Número de ciclos de uma onda por unidade de tempo." },
  { word: "FASE", clue: "Parâmetro que indica a posição de uma onda relativamente a uma referência." },
  { word: "MULTIPLEXACAO", clue: "Técnica que permite combinar vários sinais para os transmitir através de um mesmo canal." },
  { word: "FDM", clue: "Multiplexação por divisão de frequência." },
  { word: "TDM", clue: "Multiplexação por divisão de tempo." },
  { word: "SINAL", clue: "Representação física utilizada para transportar informação." },
  { word: "INTERFERENCIA", clue: "Perturbação causada pela influência indesejada de outros sinais." },
  { word: "DUPLEX", clue: "Tipo de transmissão que permite comunicação nos dois sentidos." }
];

const GRID_SIZE = 15;
const INITIAL_CREDITS = 3;
