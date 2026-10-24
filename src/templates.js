// Modèles de suivi prêts à l'emploi.
// Groupes : un par phase du MCU ; « side: true » = liste parallèle (autres productions, à voir avant ou après)
// rel  = date de première sortie aux États-Unis (source : Wikipedia, pages des phases du MCU)
// dur  = durée en minutes (film : version cinéma ; série : approximative, épisodes × durée moyenne ; vide si inconnue)
// imp  = importance conseillée : 1 À regarder · 3 Tu peux skip (sans spoiler, pas officiel)
// fmt  = format affiché (Série · 9 ép., Spécial…)
// cont = 'lien' : autre production, avec des personnages repris dans le MCU
//        (son importance est propre à la liste parallèle, indépendante du MCU)
// pre  = titres MCU à avoir vus avant pour saisir toutes les références (conseil)
// lk   = titres de la liste parallèle liés à ce titre (personnages qui y apparaissent)
const LIEN_SPIDEY = 'Ce Peter Parker revient plus tard dans le MCU.';
const LIEN_XMEN = 'Personnages repris plus tard dans le MCU (multivers).';
const LIEN_NETFLIX = 'Héros repris plus tard dans le MCU.';
const LIEN_FF = 'Un personnage revient dans Deadpool & Wolverine.';
const serie = (eps) => 'Série · ' + eps + ' ép.';
const RES = 'https://ibilaw-reservation.walibi.be/?lang=fr';
const L = (o) => ({ imp: 3, cont: 'lien', ...o });

const RAIMI = ['Spider-Man', 'Spider-Man 2', 'Spider-Man 3'];
const WEBB = ['The Amazing Spider-Man', 'The Amazing Spider-Man : Le Destin d’un héros'];
const DD = ['Daredevil – Saison 1', 'Daredevil – Saison 2', 'Daredevil – Saison 3'];

export const TEMPLATES = [
  {
    id: 'mcu-endgame',
    name: 'MARVELVISION',
    aliases: ['Marvel Vision', 'MCU → Doomsday', 'MCU → Endgame'],
    desc: 'Tout le MCU par phase jusqu’à Avengers : Doomsday, et en parallèle le Spider-Verse de Sony, X-Men et 4 Fantastiques (Fox), Blade et Elektra, les séries Netflix.',
    color: 'perso',
    removed: [
      'Marvel One-Shots : Le Consultant',
      'Marvel One-Shots : Un drôle de détour vers le marteau de Thor',
      'Marvel One-Shots : Item 47',
      'Marvel One-Shots : Agent Carter',
      'Marvel One-Shots : Longue vie au roi',
    ],
    groups: [
      { name: 'Phase 1 · 2008-2012', items: [
        { t: 'Iron Man', rel: '2008-05-02', dur: 126, imp: 1 },
        { t: 'L’Incroyable Hulk', pre: ['Iron Man'], rel: '2008-06-13', dur: 112, imp: 3 },
        { t: 'Iron Man 2', pre: ['Iron Man'], rel: '2010-05-07', dur: 124, imp: 1 },
        { t: 'Thor', pre: ['Iron Man 2'], rel: '2011-05-06', dur: 115, imp: 1 },
        { t: 'Captain America : First Avenger', rel: '2011-07-22', dur: 124, imp: 1 },
        { t: 'Avengers', pre: ['Iron Man', 'L’Incroyable Hulk', 'Iron Man 2', 'Thor', 'Captain America : First Avenger'], rel: '2012-05-04', dur: 143, imp: 1 },
      ] },
      { name: 'Phase 2 · 2013-2015', items: [
        { t: 'Iron Man 3', pre: ['Avengers'], rel: '2013-05-03', dur: 130, imp: 1 },
        { t: 'Thor : Le Monde des ténèbres', pre: ['Thor', 'Avengers'], rel: '2013-11-08', dur: 112, imp: 3 },
        { t: 'Captain America : Le Soldat de l’hiver', pre: ['Captain America : First Avenger', 'Avengers'], rel: '2014-04-04', dur: 136, imp: 1 },
        { t: 'Les Gardiens de la Galaxie', rel: '2014-08-01', dur: 121, imp: 1 },
        { t: 'Avengers : L’Ère d’Ultron', pre: ['Avengers', 'Iron Man 3', 'Thor : Le Monde des ténèbres', 'Captain America : Le Soldat de l’hiver'], rel: '2015-05-01', dur: 141, imp: 1 },
        { t: 'Ant-Man', pre: ['Avengers : L’Ère d’Ultron'], rel: '2015-07-17', dur: 117, imp: 1 },
      ] },
      { name: 'Phase 3 · 2016-2019', items: [
        { t: 'Captain America : Civil War', pre: ['Captain America : Le Soldat de l’hiver', 'Avengers : L’Ère d’Ultron', 'Ant-Man'], rel: '2016-05-06', dur: 147, imp: 1 },
        { t: 'Doctor Strange', rel: '2016-11-04', dur: 115, imp: 1 },
        { t: 'Les Gardiens de la Galaxie Vol. 2', pre: ['Les Gardiens de la Galaxie'], rel: '2017-05-05', dur: 136, imp: 1 },
        { t: 'Spider-Man : Homecoming', lk: ['Morbius'], pre: ['Captain America : Civil War'], rel: '2017-07-07', dur: 133, imp: 1 },
        { t: 'Thor : Ragnarok', pre: ['Thor : Le Monde des ténèbres', 'Avengers : L’Ère d’Ultron', 'Doctor Strange'], rel: '2017-11-03', dur: 130, imp: 1 },
        { t: 'Black Panther', pre: ['Captain America : Civil War'], rel: '2018-02-16', dur: 134, imp: 1 },
        { t: 'Avengers : Infinity War', pre: ['Captain America : Civil War', 'Doctor Strange', 'Les Gardiens de la Galaxie Vol. 2', 'Spider-Man : Homecoming', 'Thor : Ragnarok', 'Black Panther'], rel: '2018-04-27', dur: 149, imp: 1 },
        { t: 'Ant-Man et la Guêpe', pre: ['Ant-Man', 'Captain America : Civil War'], rel: '2018-07-06', dur: 118, imp: 1 },
        { t: 'Captain Marvel', pre: ['Les Gardiens de la Galaxie'], rel: '2019-03-08', dur: 123, imp: 1 },
        { t: 'Avengers : Endgame', pre: ['Avengers : Infinity War', 'Captain Marvel', 'Ant-Man et la Guêpe', 'Thor : Le Monde des ténèbres', 'Les Gardiens de la Galaxie'], rel: '2019-04-26', dur: 181, imp: 1 },
        { t: 'Spider-Man : Far From Home', pre: ['Spider-Man : Homecoming', 'Avengers : Endgame'], rel: '2019-07-02', dur: 129, imp: 1 },
      ] },
      { name: 'Phase 4 · 2021-2022', items: [
        { t: 'WandaVision', pre: ['Avengers : L’Ère d’Ultron', 'Avengers : Endgame'], rel: '2021-01-15', dur: 350, fmt: serie(9), imp: 1 },
        { t: 'Falcon et le Soldat de l’hiver', pre: ['Captain America : Le Soldat de l’hiver', 'Avengers : Endgame'], rel: '2021-03-19', dur: 300, fmt: serie(6), imp: 1 },
        { t: 'Loki – Saison 1', pre: ['Thor : Ragnarok', 'Avengers : Endgame'], rel: '2021-06-09', dur: 290, fmt: serie(6), imp: 1 },
        { t: 'Black Widow', pre: ['Captain America : Civil War'], rel: '2021-07-09', dur: 134, imp: 3 },
        { t: 'What If…? – Saison 1', pre: ['Avengers : Endgame'], rel: '2021-08-11', dur: 290, fmt: serie(9) + ' · animation', imp: 3 },
        { t: 'Shang-Chi et la Légende des Dix Anneaux', pre: ['Iron Man 3'], rel: '2021-09-03', dur: 132, imp: 1 },
        { t: 'Les Éternels', pre: ['Avengers : Endgame'], rel: '2021-11-05', dur: 156, imp: 3 },
        { t: 'Hawkeye', pre: ['Avengers : Endgame', 'Black Widow'], rel: '2021-11-24', dur: 300, fmt: serie(6), imp: 1, lk: ['Daredevil – Saison 1'] },
        { t: 'Spider-Man : No Way Home', pre: ['Spider-Man : Far From Home', 'Doctor Strange'], rel: '2021-12-17', dur: 148, imp: 1, lk: [...RAIMI, ...WEBB, 'Venom', 'Venom : Let There Be Carnage', 'Daredevil – Saison 1'] },
        { t: 'Moon Knight', rel: '2022-03-30', dur: 290, fmt: serie(6), imp: 3 },
        { t: 'Doctor Strange in the Multiverse of Madness', pre: ['WandaVision', 'What If…? – Saison 1', 'Spider-Man : No Way Home'], rel: '2022-05-06', dur: 126, imp: 1, lk: ['X-Men', 'X-Men 2', 'X-Men : L’Affrontement final'] },
        { t: 'Miss Marvel', pre: ['Captain Marvel'], rel: '2022-06-08', dur: 270, fmt: serie(6), imp: 3 },
        { t: 'Thor : Love and Thunder', pre: ['Thor : Ragnarok', 'Avengers : Endgame'], rel: '2022-07-08', dur: 119, imp: 3 },
        { t: 'I Am Groot – Saison 1', rel: '2022-08-10', dur: 20, fmt: 'Courts-métrages · 5 ép.', imp: 3 },
        { t: 'She-Hulk : Avocate', pre: ['Avengers : Endgame'], rel: '2022-08-18', dur: 300, fmt: serie(9), imp: 3, lk: ['Daredevil – Saison 1'] },
        { t: 'Werewolf by Night', rel: '2022-10-07', dur: 53, fmt: 'Spécial', imp: 3 },
        { t: 'Black Panther : Wakanda Forever', pre: ['Black Panther'], rel: '2022-11-11', dur: 161, imp: 1 },
        { t: 'Les Gardiens de la Galaxie : Joyeuses Fêtes', pre: ['Les Gardiens de la Galaxie Vol. 2'], rel: '2022-11-25', dur: 44, fmt: 'Spécial', imp: 3 },
      ] },
      { name: 'Phase 5 · 2023-2025', items: [
        { t: 'Ant-Man et la Guêpe : Quantumania', pre: ['Ant-Man et la Guêpe', 'Loki – Saison 1'], rel: '2023-02-17', dur: 125, imp: 1 },
        { t: 'Les Gardiens de la Galaxie Vol. 3', pre: ['Les Gardiens de la Galaxie Vol. 2', 'Avengers : Endgame'], rel: '2023-05-05', dur: 150, imp: 1 },
        { t: 'Secret Invasion', pre: ['Captain Marvel', 'Spider-Man : Far From Home'], rel: '2023-06-21', dur: 300, fmt: serie(6), imp: 3 },
        { t: 'I Am Groot – Saison 2', rel: '2023-09-06', dur: 20, fmt: 'Courts-métrages · 5 ép.', imp: 3 },
        { t: 'Loki – Saison 2', pre: ['Loki – Saison 1'], rel: '2023-10-05', dur: 300, fmt: serie(6), imp: 1 },
        { t: 'The Marvels', pre: ['Captain Marvel', 'WandaVision', 'Miss Marvel'], rel: '2023-11-10', dur: 105, imp: 1, lk: ['X-Men : L’Affrontement final'] },
        { t: 'What If…? – Saison 2', pre: ['What If…? – Saison 1'], rel: '2023-12-22', dur: 290, fmt: serie(9) + ' · animation', imp: 3 },
        { t: 'Echo', pre: ['Hawkeye'], rel: '2024-01-09', dur: 225, fmt: serie(5), imp: 3, lk: DD },
        { t: 'Deadpool & Wolverine', pre: ['Loki – Saison 1'], rel: '2024-07-26', dur: 128, imp: 1, lk: ['Deadpool', 'Deadpool 2', 'Logan', 'X-Men Origins : Wolverine', 'Les 4 Fantastiques', 'Les 4 Fantastiques et le Surfer d’argent', 'Blade', 'Elektra'] },
        { t: 'Agatha All Along', pre: ['WandaVision'], rel: '2024-09-18', dur: 360, fmt: serie(9), imp: 3 },
        { t: 'What If…? – Saison 3', pre: ['What If…? – Saison 2'], rel: '2024-12-22', dur: 240, fmt: serie(8) + ' · animation', imp: 3 },
        { t: 'Your Friendly Neighborhood Spider-Man – Saison 1', rel: '2025-01-29', dur: 250, fmt: serie(10) + ' · animation', imp: 3 },
        { t: 'Captain America : Brave New World', pre: ['L’Incroyable Hulk', 'Falcon et le Soldat de l’hiver', 'Les Éternels'], rel: '2025-02-14', dur: 118, imp: 1 },
        { t: 'Daredevil : Born Again – Saison 1', pre: ['Spider-Man : No Way Home', 'Hawkeye', 'She-Hulk : Avocate', 'Echo'], rel: '2025-03-04', dur: 450, fmt: serie(9), imp: 1, lk: [...DD, 'The Punisher – Saison 1', 'The Punisher – Saison 2'] },
        { t: 'Thunderbolts*', pre: ['Black Widow', 'Ant-Man et la Guêpe', 'Falcon et le Soldat de l’hiver', 'Hawkeye'], rel: '2025-05-02', dur: 127, imp: 1 },
        { t: 'Ironheart', pre: ['Black Panther : Wakanda Forever'], rel: '2025-06-24', dur: 270, fmt: serie(6), imp: 3 },
      ] },
      { name: 'Phase 6 · 2025-2026', items: [
        { t: 'Les 4 Fantastiques : Premiers pas', rel: '2025-07-25', dur: 115, imp: 1 },
        { t: 'Eyes of Wakanda', pre: ['Black Panther'], rel: '2025-08-01', dur: 120, fmt: serie(4) + ' · animation', imp: 3 },
        { t: 'Marvel Zombies – Saison 1', pre: ['What If…? – Saison 1'], rel: '2025-09-24', dur: 140, fmt: serie(4) + ' · animation', imp: 3 },
        { t: 'Wonder Man', rel: '2026-01-27', dur: 280, fmt: serie(8), imp: 3 },
        { t: 'Daredevil : Born Again – Saison 2', pre: ['Daredevil : Born Again – Saison 1'], rel: '2026-03-24', dur: 400, fmt: serie(8), imp: 1, lk: DD },
        { t: 'The Punisher : One Last Kill', pre: ['Daredevil : Born Again – Saison 1'], rel: '2026-05-12', dur: 50, fmt: 'Spécial', imp: 3, lk: ['The Punisher – Saison 1', 'The Punisher – Saison 2'] },
        { t: 'Spider-Man : Brand New Day', pre: ['Spider-Man : No Way Home'], rel: '2026-07-31', imp: 1 },
        { t: 'VisionQuest', pre: ['WandaVision', 'Agatha All Along'], rel: '2026-10-13', dur: 360, fmt: serie(8), imp: 1 },
        { t: 'Avengers : Doomsday', note: 'Pas encore sorti : liens estimés d’après le casting annoncé.', pre: ['Avengers : Endgame', 'Loki – Saison 2', 'Thunderbolts*', 'Les 4 Fantastiques : Premiers pas', 'Black Panther : Wakanda Forever', 'Shang-Chi et la Légende des Dix Anneaux'], rel: '2026-12-18', imp: 1, goal: true, lk: ['X-Men', 'X-Men 2', 'X-Men : L’Affrontement final'] },
      ] },
      { name: 'Spider-Verse de Sony', side: true, items: [
        L({ t: 'Spider-Man', imp: 1, rel: '2002-05-03', dur: 121, note: LIEN_SPIDEY }),
        L({ t: 'Spider-Man 2', imp: 1, rel: '2004-06-30', dur: 127, note: LIEN_SPIDEY }),
        L({ t: 'Spider-Man 3', imp: 1, rel: '2007-05-04', dur: 139, note: LIEN_SPIDEY }),
        L({ t: 'The Amazing Spider-Man', imp: 1, rel: '2012-07-03', dur: 136, note: LIEN_SPIDEY }),
        L({ t: 'The Amazing Spider-Man : Le Destin d’un héros', imp: 1, rel: '2014-05-02', dur: 142, note: LIEN_SPIDEY }),
        L({ t: 'Venom', rel: '2018-10-05', dur: 112, note: 'Lien avec le MCU plus tard, secondaire.' }),
        L({ t: 'Venom : Let There Be Carnage', rel: '2021-10-01', dur: 97, note: 'Lien avec le MCU, secondaire.' }),
        L({ t: 'Morbius', rel: '2022-04-01', dur: 104, note: 'Un personnage du MCU y apparaît.' }),
        L({ t: 'Madame Web', rel: '2024-02-14', dur: 116, note: 'Univers Spider-Man de Sony, sans lien direct avec le MCU.' }),
        L({ t: 'Venom : The Last Dance', rel: '2024-10-25', dur: 109, note: 'Suite des Venom.' }),
        L({ t: 'Kraven le chasseur', rel: '2024-12-13', dur: 127, note: 'Univers Spider-Man de Sony, sans lien direct avec le MCU.' }),
      ] },
      { name: 'X-Men de la Fox (2000-2019)', side: true, items: [
        L({ t: 'X-Men', imp: 1, rel: '2000-07-14', dur: 104, note: LIEN_XMEN }),
        L({ t: 'X-Men 2', imp: 1, rel: '2003-05-02', dur: 134, note: LIEN_XMEN }),
        L({ t: 'X-Men : L’Affrontement final', imp: 1, rel: '2006-05-26', dur: 104, note: LIEN_XMEN }),
        L({ t: 'X-Men Origins : Wolverine', imp: 1, rel: '2009-05-01', dur: 107, note: LIEN_XMEN }),
        L({ t: 'X-Men : Le Commencement', rel: '2011-06-03', dur: 132, note: LIEN_XMEN }),
        L({ t: 'Wolverine : Le Combat de l’immortel', rel: '2013-07-26', dur: 126, note: LIEN_XMEN }),
        L({ t: 'X-Men : Days of Future Past', imp: 1, rel: '2014-05-23', dur: 132, note: LIEN_XMEN }),
        L({ t: 'Deadpool', imp: 1, rel: '2016-02-12', dur: 108, note: 'Deadpool rejoint le MCU plus tard.' }),
        L({ t: 'X-Men : Apocalypse', rel: '2016-05-27', dur: 144, note: LIEN_XMEN }),
        L({ t: 'Logan', imp: 1, rel: '2017-03-03', dur: 137, note: LIEN_XMEN }),
        L({ t: 'Deadpool 2', imp: 1, rel: '2018-05-18', dur: 119, note: 'Deadpool rejoint le MCU plus tard.' }),
        L({ t: 'X-Men : Dark Phoenix', rel: '2019-06-07', dur: 113, note: LIEN_XMEN }),
      ] },
      { name: 'Les 4 Fantastiques de la Fox (2005-2015)', side: true, items: [
        L({ t: 'Les 4 Fantastiques', imp: 1, rel: '2005-07-08', dur: 106, note: LIEN_FF }),
        L({ t: 'Les 4 Fantastiques et le Surfer d’argent', rel: '2007-06-15', dur: 92, note: LIEN_FF }),
        L({ t: 'Les 4 Fantastiques (2015)', rel: '2015-08-07', dur: 100, note: 'Reboot de la Fox, sans lien avec le MCU.' }),
      ] },
      { name: 'Autres films Marvel (Blade, Daredevil, Elektra, Punisher)', side: true, items: [
        L({ t: 'Blade', rel: '1998-08-21', dur: 120, note: 'Ce Blade revient dans Deadpool & Wolverine.' }),
        L({ t: 'Blade II', rel: '2002-03-22', dur: 117, note: 'Ce Blade revient dans Deadpool & Wolverine.' }),
        L({ t: 'Daredevil', rel: '2003-02-14', dur: 103, note: 'Film d’origine d’Elektra, sans lien direct avec le MCU.' }),
        L({ t: 'The Punisher', rel: '2004-04-16', dur: 124, note: 'Ancienne version du Punisher, sans lien avec le MCU.' }),
        L({ t: 'Blade : Trinity', rel: '2004-12-08', dur: 113, note: 'Ce Blade revient dans Deadpool & Wolverine.' }),
        L({ t: 'Elektra', rel: '2005-01-14', dur: 97, note: 'Elektra revient dans Deadpool & Wolverine.' }),
        L({ t: 'Punisher : Zone de guerre', rel: '2008-12-05', dur: 103, note: 'Ancienne version du Punisher, sans lien avec le MCU.' }),
      ] },
      { name: 'Séries Netflix (Daredevil, Jessica Jones, Punisher…)', side: true, items: [
        L({ t: 'Daredevil – Saison 1', imp: 1, rel: '2015-04-10', dur: 700, fmt: serie(13), note: LIEN_NETFLIX }),
        L({ t: 'Jessica Jones – Saison 1', rel: '2015-11-20', dur: 680, fmt: serie(13), note: LIEN_NETFLIX }),
        L({ t: 'Daredevil – Saison 2', imp: 1, rel: '2016-03-18', dur: 700, fmt: serie(13), note: LIEN_NETFLIX }),
        L({ t: 'Luke Cage – Saison 1', rel: '2016-09-30', dur: 715, fmt: serie(13), note: LIEN_NETFLIX }),
        L({ t: 'Iron Fist – Saison 1', rel: '2017-03-17', dur: 715, fmt: serie(13), note: LIEN_NETFLIX }),
        L({ t: 'The Defenders', rel: '2017-08-18', dur: 400, fmt: 'Mini-série · 8 ép.', note: LIEN_NETFLIX }),
        L({ t: 'The Punisher – Saison 1', imp: 1, rel: '2017-11-17', dur: 690, fmt: serie(13), note: LIEN_NETFLIX }),
        L({ t: 'Jessica Jones – Saison 2', rel: '2018-03-08', dur: 680, fmt: serie(13), note: LIEN_NETFLIX }),
        L({ t: 'Luke Cage – Saison 2', rel: '2018-06-22', dur: 715, fmt: serie(13), note: LIEN_NETFLIX }),
        L({ t: 'Iron Fist – Saison 2', rel: '2018-09-07', dur: 520, fmt: serie(10), note: LIEN_NETFLIX }),
        L({ t: 'Daredevil – Saison 3', imp: 1, rel: '2018-10-19', dur: 730, fmt: serie(13), note: LIEN_NETFLIX }),
        L({ t: 'The Punisher – Saison 2', imp: 1, rel: '2019-01-18', dur: 690, fmt: serie(13), note: LIEN_NETFLIX }),
        L({ t: 'Jessica Jones – Saison 3', rel: '2019-06-14', dur: 680, fmt: serie(13), note: LIEN_NETFLIX }),
      ] },
    ],
  },
  // Suivi « en direct » d'une journée au parc (live) : l'heure remplace le pourcentage,
  // ce qui est passé se grise tout seul. Heures locales (Bruxelles) du jour indiqué.
  // Horaires, numéros et 🌙 d'après le plan officiel Ibilaw 2026 (colonne du 25/10) ; zones d'après walibi.be.
  // slots = séances · from/to = ouvert de… à… · price = prix affiché · code = repère du plan
  // nuit  = ouvert jusqu'à la fermeture de nuit 🌙 · bk = lien de réservation
  // cat   = frissons / famille / enfants (comme sur le plan) · map = plan du parc (fichier dans public/maps, gardé hors ligne)
  {
    id: 'ibilaw-2026',
    name: 'Ibilaw 2026',
    desc: 'Walibi Halloween, dimanche 25 octobre 2026 : maisons hantées, spectacles et attractions en temps réel, avec les prix.',
    color: 'urgent',
    live: { day: '2026-10-25', close: '22:00' },
    map: '/maps/ibilaw-2026.jpg',
    removed: ['Speedy (coupe-file)'],
    groups: [
      { name: 'Expériences', items: [
        { t: 'Bill : A Fairy Tale', code: 'I', slots: ['13:30', '15:00', '16:30', '18:00'] },
        { t: 'Bill’s Procession', slots: ['19:00'] },
        { t: 'Freaky Pizza Festival', bk: 'https://www.walibi.be/halloween-walibi/fr/tickets#freaky', code: 'J', price: '24,90 €', from: '11:00', to: '21:30' },
      ] },
      { name: 'Maisons hantées', items: [
        { t: 'Aquarium', bk: RES, code: 'B', price: '7,50 €', from: '13:00', to: '22:00' },
        { t: 'Silence', bk: RES, code: 'C', price: '7,50 €', from: '14:00', to: '22:00' },
        { t: 'The Grand Hotel', bk: RES, code: 'A', price: '8,50 €', from: '12:00', to: '22:00' },
        { t: 'Mine Blast', bk: RES, code: 'D', from: '16:00', to: '22:00' },
      ] },
      { name: 'Scare zones', items: [
        { t: 'Psycho Circus', code: 'H', from: '10:30', to: '22:00' },
        { t: 'Innocence', code: 'F', from: '13:00', to: '22:00' },
        { t: 'Hecatomb', code: 'E', from: '14:00', to: '22:00' },
        { t: 'Arachnophobia', code: 'G', from: '15:00', to: '22:00' },
      ] },
      { name: 'Walibi Boulevard', side: true, items: [
        { t: 'Grand Carrousel', cat: 'famille', code: '2', nuit: true },
        { t: 'Dracula 4D', cat: 'famille', code: '6', nuit: true },
      ] },
      { name: 'Loup-Garou', side: true, items: [
        { t: 'Loup-Garou', cat: 'frissons', code: '5', nuit: true },
        { t: 'Vampire', cat: 'frissons', code: '1', nuit: true },
        { t: 'Spinning Vibe', cat: 'frissons', code: '7', nuit: true },
        { t: 'Wave Swinger', cat: 'famille', code: '4', nuit: true },
        { t: 'Melody Road', cat: 'famille', code: '3', nuit: true },
      ] },
      { name: 'Karma World', side: true, items: [
        { t: 'Cobra', cat: 'frissons', code: '43', nuit: true },
        { t: 'Popcorn Revenge', cat: 'famille', code: '42', nuit: true },
        { t: 'Radja River', cat: 'famille', code: '40' },
        { t: 'Palais du Génie', cat: 'famille', code: '39', nuit: true },
        { t: 'Tapis Volant', cat: 'famille', code: '41' },
      ] },
      { name: 'Fun World', side: true, items: [
        { t: 'Fun Pilot', cat: 'enfants', code: '38', nuit: true },
        { t: '4x4 Adventure', cat: 'enfants', code: '31' },
        { t: 'Bubble Swirl', cat: 'enfants', code: '34' },
        { t: 'Fun Recorder', cat: 'enfants', code: '35' },
        { t: 'Graffiti Shuttle', cat: 'enfants', code: '33' },
        { t: 'Mini Tour', cat: 'enfants', code: '37' },
        { t: 'Tree House', cat: 'enfants', code: '32' },
      ] },
      { name: 'Dock World', side: true, items: [
        { t: 'Pulsar', cat: 'frissons', code: '8', nuit: true },
        { t: 'Turbine', cat: 'frissons', code: '30', nuit: true },
        { t: 'Mecalodon', cat: 'famille', code: '36', nuit: true },
        { t: 'Flash-Back', cat: 'famille', code: '29' },
        { t: 'Tous en boîte', cat: 'famille', code: '28', nuit: true },
        { t: 'Stormy', cat: 'enfants', code: '28', nuit: true },
      ] },
      { name: 'Adventure World', side: true, items: [
        { t: 'Dalton Terror', cat: 'frissons', code: '16', nuit: true },
        { t: 'Buzzsaw', cat: 'frissons', code: '15', nuit: true },
        { t: 'Calamity Mine', cat: 'famille', code: '17', nuit: true },
        { t: 'Silverton', cat: 'famille', code: '14', nuit: true },
        { t: 'Poneys', cat: 'enfants', code: '19' },
      ] },
      { name: 'Exotic World', side: true, items: [
        { t: 'Kondaa', cat: 'frissons', code: '23', nuit: true },
        { t: 'Tiki-Waka', cat: 'famille', code: '26', nuit: true },
        { t: 'Challenge of Tutankhamon', cat: 'famille', code: '25', nuit: true },
        { t: 'Tiki-Trail', cat: 'famille', code: '20', nuit: true },
        { t: 'Octopus', cat: 'famille', code: '21', nuit: true },
      ] },
    ],
  },
];
