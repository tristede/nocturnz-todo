// Modèles de suivi prêts à l'emploi.
// rel = date de première sortie aux États-Unis (convention unique, pour l'ordre de sortie)
// dur = durée en minutes (approximative, version cinéma)
// imp = importance pour comprendre l'histoire jusqu'à l'objectif : 1 À regarder · 2 Mieux de voir · 3 Tu peux skip
// Ces niveaux sont des conseils sans spoiler, pas une liste officielle.
export const TEMPLATES = [
  {
    id: 'mcu-endgame',
    name: 'MCU → Endgame',
    desc: 'Les 22 films de la saga, de Iron Man à Avengers : Endgame, dans l’ordre de sortie.',
    color: 'perso',
    group: 'Films',
    items: [
      { t: 'Iron Man', rel: '2008-05-02', dur: 126, imp: 1 },
      { t: 'L’Incroyable Hulk', rel: '2008-06-13', dur: 112, imp: 3 },
      { t: 'Iron Man 2', rel: '2010-05-07', dur: 124, imp: 2 },
      { t: 'Thor', rel: '2011-05-06', dur: 115, imp: 1 },
      { t: 'Captain America : First Avenger', rel: '2011-07-22', dur: 124, imp: 1 },
      { t: 'Avengers', rel: '2012-05-04', dur: 143, imp: 1 },
      { t: 'Iron Man 3', rel: '2013-05-03', dur: 130, imp: 2 },
      { t: 'Thor : Le Monde des ténèbres', rel: '2013-11-08', dur: 112, imp: 3 },
      { t: 'Captain America : Le Soldat de l’hiver', rel: '2014-04-04', dur: 136, imp: 1 },
      { t: 'Les Gardiens de la Galaxie', rel: '2014-08-01', dur: 121, imp: 1 },
      { t: 'Avengers : L’Ère d’Ultron', rel: '2015-05-01', dur: 141, imp: 1 },
      { t: 'Ant-Man', rel: '2015-07-17', dur: 117, imp: 2 },
      { t: 'Captain America : Civil War', rel: '2016-05-06', dur: 147, imp: 1 },
      { t: 'Doctor Strange', rel: '2016-11-04', dur: 115, imp: 2 },
      { t: 'Les Gardiens de la Galaxie Vol. 2', rel: '2017-05-05', dur: 136, imp: 2 },
      { t: 'Spider-Man : Homecoming', rel: '2017-07-07', dur: 133, imp: 2 },
      { t: 'Thor : Ragnarok', rel: '2017-11-03', dur: 130, imp: 1 },
      { t: 'Black Panther', rel: '2018-02-16', dur: 134, imp: 2 },
      { t: 'Avengers : Infinity War', rel: '2018-04-27', dur: 149, imp: 1 },
      { t: 'Ant-Man et la Guêpe', rel: '2018-07-06', dur: 118, imp: 2 },
      { t: 'Captain Marvel', rel: '2019-03-08', dur: 123, imp: 2 },
      { t: 'Avengers : Endgame', rel: '2019-04-26', dur: 181, imp: 1, goal: true },
    ],
  },
];
