// Modèles de suivi prêts à l'emploi.
// rel  = date de première sortie aux États-Unis (une seule convention, pour l'ordre de sortie)
// dur  = durée en minutes (version cinéma ; pour une saison : total approximatif)
// imp  = importance pour comprendre l'histoire jusqu'à l'objectif : 1 À regarder · 2 Mieux de voir · 3 Tu peux skip
// fmt  = format affiché (Film, Série…)
// cont = 'lien' : autre univers ou autre production, avec des personnages repris plus tard dans le MCU.
//        Ces titres sont des bonus : ils ne comptent pas dans la progression vers l'objectif.
// Les niveaux sont des conseils sans spoiler, pas une liste officielle.
const LIEN_SPIDEY = 'Ce Peter Parker revient plus tard dans le MCU.';
const LIEN_XMEN = 'Personnages repris plus tard dans le MCU (multivers).';
const LIEN_NETFLIX = 'Héros repris plus tard dans le MCU.';
const saison = (n, eps) => 'Série · ' + eps + ' ép.';

export const TEMPLATES = [
  {
    id: 'mcu-endgame',
    name: 'MCU → Endgame',
    desc: 'Les 22 films de la saga jusqu’à Avengers : Endgame, plus les Spider-Man de Sony, les X-Men de la Fox et les séries Netflix liés au MCU.',
    color: 'perso',
    groups: [
      {
        name: 'MCU',
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
      {
        name: 'Spider-Man (Sony)',
        items: [
          { t: 'Spider-Man', rel: '2002-05-03', dur: 121, imp: 3, cont: 'lien', note: LIEN_SPIDEY },
          { t: 'Spider-Man 2', rel: '2004-06-30', dur: 127, imp: 3, cont: 'lien', note: LIEN_SPIDEY },
          { t: 'Spider-Man 3', rel: '2007-05-04', dur: 139, imp: 3, cont: 'lien', note: LIEN_SPIDEY },
          { t: 'The Amazing Spider-Man', rel: '2012-07-03', dur: 136, imp: 3, cont: 'lien', note: LIEN_SPIDEY },
          { t: 'The Amazing Spider-Man : Le Destin d’un héros', rel: '2014-05-02', dur: 142, imp: 3, cont: 'lien', note: LIEN_SPIDEY },
          { t: 'Venom', rel: '2018-10-05', dur: 112, imp: 3, cont: 'lien', note: 'Lien avec le MCU plus tard, secondaire.' },
        ],
      },
      {
        name: 'X-Men (Fox)',
        items: [
          { t: 'X-Men', rel: '2000-07-14', dur: 104, imp: 3, cont: 'lien', note: LIEN_XMEN },
          { t: 'X-Men 2', rel: '2003-05-02', dur: 134, imp: 3, cont: 'lien', note: LIEN_XMEN },
          { t: 'X-Men : L’Affrontement final', rel: '2006-05-26', dur: 104, imp: 3, cont: 'lien', note: LIEN_XMEN },
          { t: 'X-Men Origins : Wolverine', rel: '2009-05-01', dur: 107, imp: 3, cont: 'lien', note: LIEN_XMEN },
          { t: 'X-Men : Le Commencement', rel: '2011-06-03', dur: 132, imp: 3, cont: 'lien', note: LIEN_XMEN },
          { t: 'Wolverine : Le Combat de l’immortel', rel: '2013-07-26', dur: 126, imp: 3, cont: 'lien', note: LIEN_XMEN },
          { t: 'X-Men : Days of Future Past', rel: '2014-05-23', dur: 132, imp: 3, cont: 'lien', note: LIEN_XMEN },
          { t: 'Deadpool', rel: '2016-02-12', dur: 108, imp: 3, cont: 'lien', note: 'Deadpool rejoint le MCU plus tard.' },
          { t: 'X-Men : Apocalypse', rel: '2016-05-27', dur: 144, imp: 3, cont: 'lien', note: LIEN_XMEN },
          { t: 'Logan', rel: '2017-03-03', dur: 137, imp: 3, cont: 'lien', note: LIEN_XMEN },
          { t: 'Deadpool 2', rel: '2018-05-18', dur: 119, imp: 3, cont: 'lien', note: 'Deadpool rejoint le MCU plus tard.' },
        ],
      },
      {
        name: 'Netflix · Defenders',
        items: [
          { t: 'Daredevil – Saison 1', rel: '2015-04-10', dur: 13 * 54, fmt: saison(1, 13), imp: 3, cont: 'lien', note: LIEN_NETFLIX },
          { t: 'Jessica Jones – Saison 1', rel: '2015-11-20', dur: 13 * 52, fmt: saison(1, 13), imp: 3, cont: 'lien', note: LIEN_NETFLIX },
          { t: 'Daredevil – Saison 2', rel: '2016-03-18', dur: 13 * 54, fmt: saison(2, 13), imp: 3, cont: 'lien', note: LIEN_NETFLIX },
          { t: 'Luke Cage – Saison 1', rel: '2016-09-30', dur: 13 * 55, fmt: saison(1, 13), imp: 3, cont: 'lien', note: LIEN_NETFLIX },
          { t: 'Iron Fist – Saison 1', rel: '2017-03-17', dur: 13 * 55, fmt: saison(1, 13), imp: 3, cont: 'lien', note: LIEN_NETFLIX },
          { t: 'The Defenders', rel: '2017-08-18', dur: 8 * 50, fmt: 'Mini-série · 8 ép.', imp: 3, cont: 'lien', note: LIEN_NETFLIX },
          { t: 'The Punisher – Saison 1', rel: '2017-11-17', dur: 13 * 53, fmt: saison(1, 13), imp: 3, cont: 'lien', note: LIEN_NETFLIX },
          { t: 'Jessica Jones – Saison 2', rel: '2018-03-08', dur: 13 * 52, fmt: saison(2, 13), imp: 3, cont: 'lien', note: LIEN_NETFLIX },
          { t: 'Luke Cage – Saison 2', rel: '2018-06-22', dur: 13 * 55, fmt: saison(2, 13), imp: 3, cont: 'lien', note: LIEN_NETFLIX },
          { t: 'Iron Fist – Saison 2', rel: '2018-09-07', dur: 10 * 52, fmt: saison(2, 10), imp: 3, cont: 'lien', note: LIEN_NETFLIX },
          { t: 'Daredevil – Saison 3', rel: '2018-10-19', dur: 13 * 56, fmt: saison(3, 13), imp: 3, cont: 'lien', note: LIEN_NETFLIX },
          { t: 'The Punisher – Saison 2', rel: '2019-01-18', dur: 13 * 53, fmt: saison(2, 13), imp: 3, cont: 'lien', note: LIEN_NETFLIX },
        ],
      },
    ],
  },
];
