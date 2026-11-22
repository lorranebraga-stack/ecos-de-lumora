// As cinco regiões de Lumora, na ordem da jornada.
//   implemented: false = planejada, ainda não jogável
//   preview: true      = jogável, mas incompleta (o mapa avisa "prévia")
// O Mapa de Lumora mostra isso com honestidade, em vez de fingir que a fase existe.

export const REGIONS = [
  { id: 'bosque', number: 1, name: 'Bosque dos Sussurros', implemented: true },
  { id: 'minas', number: 2, name: 'Minas de Cristal', implemented: true },
  { id: 'arquipelago', number: 3, name: 'Arquipélago Suspenso', implemented: true },
  { id: 'cidade', number: 4, name: 'Cidade Sem Memória', implemented: true },
  { id: 'santuario', number: 5, name: 'Santuário da Aurora', implemented: true },
];
