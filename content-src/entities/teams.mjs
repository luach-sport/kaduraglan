// Clubs. tier: 1 = known to everyone, 2 = known to fans, 3 = for experts. il = Israeli club.
// Only facts that were checked; a fact we're not sure of is left out (the library shows only what exists).
const T = (id, he, en, country, city, founded, stadium, league, nick, tier, more) => Object.assign({ id, he, en, country, city, stadium, league, tier }, founded ? { founded } : {}, nick ? { nick } : {}, more || {});

export default [
  // Spain
  T('barcelona', 'ברצלונה', 'FC Barcelona', 'ספרד', 'ברצלונה', 1899, 'camp-nou', 'laliga', 'בלאוגרנה', 1, { colors: 'כחול ואדום (בלאוגרנה)', aka: ['בארסה', 'barca'] }),
  T('real-madrid', 'ריאל מדריד', 'Real Madrid', 'ספרד', 'מדריד', 1902, 'bernabeu', 'laliga', 'הבלאנקוס', 1, { colors: 'לבן' }),
  T('atletico', 'אתלטיקו מדריד', 'Atlético de Madrid', 'ספרד', 'מדריד', 1903, 'metropolitano', 'laliga', 'קולצ׳ונרוס', 1, { colors: 'אדום ולבן' }),
  T('valencia', 'ולנסיה', 'Valencia CF', 'ספרד', 'ולנסיה', 1919, 'mestalla', 'laliga', 'לוס צ׳ה', 2),
  T('sevilla', 'סביליה', 'Sevilla FC', 'ספרד', 'סביליה', null, null, 'laliga', null, 2),
  T('villarreal', 'ויאריאל', 'Villarreal CF', 'ספרד', 'ויאריאל', 1923, null, 'laliga', 'הצוללת הצהובה', 2),
  T('athletic', 'אתלטיק בילבאו', 'Athletic Club', 'ספרד', 'בילבאו', 1898, null, 'laliga', null, 2),
  // England
  T('man-utd', 'מנצ׳סטר יונייטד', 'Manchester United', 'אנגליה', 'מנצ׳סטר', 1878, 'old-trafford', 'premier-league', 'השדים האדומים', 1),
  T('man-city', 'מנצ׳סטר סיטי', 'Manchester City', 'אנגליה', 'מנצ׳סטר', 1880, 'etihad', 'premier-league', 'התכולים', 1),
  T('liverpool', 'ליברפול', 'Liverpool FC', 'אנגליה', 'ליברפול', 1892, 'anfield', 'premier-league', 'האדומים', 1),
  T('chelsea', 'צ׳לסי', 'Chelsea FC', 'אנגליה', 'לונדון', 1905, 'stamford-bridge', 'premier-league', 'הכחולים', 1),
  T('arsenal', 'ארסנל', 'Arsenal FC', 'אנגליה', 'לונדון', 1886, 'emirates', 'premier-league', 'התותחנים', 1),
  T('tottenham', 'טוטנהאם', 'Tottenham Hotspur', 'אנגליה', 'לונדון', 1882, 'tottenham-stadium', 'premier-league', 'הספרס', 2),
  T('leicester', 'לסטר סיטי', 'Leicester City', 'אנגליה', 'לסטר', 1884, null, 'premier-league', 'השועלים', 2),
  T('newcastle', 'ניוקאסל יונייטד', 'Newcastle United', 'אנגליה', 'ניוקאסל', 1892, null, 'premier-league', 'המגפיים', 2),
  T('aston-villa', 'אסטון וילה', 'Aston Villa', 'אנגליה', 'ברמינגהאם', 1874, null, 'premier-league', null, 2),
  // Italy
  T('juventus', 'יובנטוס', 'Juventus', 'איטליה', 'טורינו', 1897, 'allianz-turin', 'serie-a', 'הגברת הזקנה', 1),
  T('inter', 'אינטר', 'Inter Milan', 'איטליה', 'מילאנו', 1908, 'san-siro', 'serie-a', 'נראצורי', 1),
  T('milan', 'מילאן', 'AC Milan', 'איטליה', 'מילאנו', 1899, 'san-siro', 'serie-a', 'רוסונרי', 1),
  T('napoli', 'נאפולי', 'SSC Napoli', 'איטליה', 'נאפולי', 1926, null, 'serie-a', null, 2),
  T('roma', 'רומא', 'AS Roma', 'איטליה', 'רומא', 1927, 'olimpico', 'serie-a', 'הזאבים', 2),
  // Germany
  T('bayern', 'באיירן מינכן', 'Bayern Munich', 'גרמניה', 'מינכן', 1900, 'allianz-arena', 'bundesliga', 'הבווארים', 1),
  T('dortmund', 'בורוסיה דורטמונד', 'Borussia Dortmund', 'גרמניה', 'דורטמונד', 1909, 'signal-iduna', 'bundesliga', 'הצהובים-שחורים', 1),
  T('leverkusen', 'באייר לברקוזן', 'Bayer Leverkusen', 'גרמניה', 'לברקוזן', 1904, null, 'bundesliga', null, 2),
  T('wolfsburg', 'וולפסבורג', 'VfL Wolfsburg', 'גרמניה', 'וולפסבורג', null, null, 'bundesliga', null, 3),
  T('werder', 'ורדר ברמן', 'Werder Bremen', 'גרמניה', 'ברמן', 1899, null, 'bundesliga', null, 3),
  T('stuttgart', 'שטוטגרט', 'VfB Stuttgart', 'גרמניה', 'שטוטגרט', 1893, null, 'bundesliga', null, 3),
  // France
  T('psg', 'פריז סן ז׳רמן', 'Paris Saint-Germain', 'צרפת', 'פריז', 1970, 'parc-des-princes', 'ligue-1', null, 1, { aka: ['פ.ס.ז׳'] }),
  T('marseille', 'אולימפיק מארסיי', 'Olympique de Marseille', 'צרפת', 'מארסיי', 1899, 'velodrome', 'ligue-1', null, 2),
  T('lyon', 'אולימפיק ליון', 'Olympique Lyonnais', 'צרפת', 'ליון', 1950, null, 'ligue-1', null, 2),
  T('monaco', 'מונאקו', 'AS Monaco', 'מונאקו', 'מונאקו', 1924, null, 'ligue-1', null, 2),
  T('lille', 'ליל', 'Lille OSC', 'צרפת', 'ליל', 1944, null, 'ligue-1', null, 3),
  T('montpellier', 'מונפלייה', 'Montpellier HSC', 'צרפת', 'מונפלייה', null, null, 'ligue-1', null, 3),
  T('bordeaux', 'בורדו', 'Girondins de Bordeaux', 'צרפת', 'בורדו', null, null, null, null, 3),
  // Portugal, Netherlands, Scotland, Turkey
  T('porto', 'פורטו', 'FC Porto', 'פורטוגל', 'פורטו', 1893, 'dragao', null, 'הדרקונים', 2),
  T('benfica', 'בנפיקה', 'SL Benfica', 'פורטוגל', 'ליסבון', 1904, 'luz', null, 'הנשרים', 2),
  T('sporting', 'ספורטינג ליסבון', 'Sporting CP', 'פורטוגל', 'ליסבון', 1906, null, null, 'האריות', 2),
  T('ajax', 'אייאקס', 'AFC Ajax', 'הולנד', 'אמסטרדם', 1900, 'cruyff-arena', null, null, 2),
  T('psv', 'פ.ס.וו איינדהובן', 'PSV Eindhoven', 'הולנד', 'איינדהובן', 1913, null, null, null, 2),
  T('celtic', 'סלטיק', 'Celtic FC', 'סקוטלנד', 'גלזגו', null, 'celtic-park', null, null, 2),
  T('rangers', 'ריינג׳רס', 'Rangers FC', 'סקוטלנד', 'גלזגו', 1872, null, null, null, 3),
  T('galatasaray', 'גלאטסראיי', 'Galatasaray', 'טורקיה', 'איסטנבול', 1905, null, null, null, 2),
  // Elsewhere
  T('inter-miami', 'אינטר מיאמי', 'Inter Miami CF', 'ארצות הברית', 'מיאמי', null, null, null, null, 2),
  T('al-nassr', 'אל-נסר', 'Al-Nassr', 'ערב הסעודית', 'ריאד', null, null, null, null, 2),
  // Israel
  T('maccabi-haifa', 'מכבי חיפה', 'Maccabi Haifa', 'ישראל', 'חיפה', 1913, 'sammy-ofer', 'ligat-haal', 'הירוקים', 1, { il: true, colors: 'ירוק ולבן' }),
  T('maccabi-ta', 'מכבי תל אביב', 'Maccabi Tel Aviv', 'ישראל', 'תל אביב', 1906, 'bloomfield', 'ligat-haal', 'הצהובים', 1, { il: true, colors: 'צהוב וכחול' }),
  T('hapoel-ta', 'הפועל תל אביב', 'Hapoel Tel Aviv', 'ישראל', 'תל אביב', 1923, 'bloomfield', 'ligat-haal', 'האדומים', 1, { il: true, colors: 'אדום ולבן' }),
  T('beitar', 'בית״ר ירושלים', 'Beitar Jerusalem', 'ישראל', 'ירושלים', 1936, 'teddy', 'ligat-haal', 'הצהוב-שחור', 1, { il: true, colors: 'צהוב ושחור' }),
  T('hapoel-bs', 'הפועל באר שבע', 'Hapoel Be\'er Sheva', 'ישראל', 'באר שבע', 1949, 'turner', 'ligat-haal', null, 1, { il: true, colors: 'אדום ולבן' }),
  T('maccabi-netanya', 'מכבי נתניה', 'Maccabi Netanya', 'ישראל', 'נתניה', 1934, 'netanya-stadium', 'ligat-haal', 'היהלומים', 2, { il: true, colors: 'צהוב ושחור' }),
  T('bnei-yehuda', 'בני יהודה', 'Bnei Yehuda Tel Aviv', 'ישראל', 'תל אביב', 1936, null, null, 'השכונה', 2, { il: true }),
  T('hapoel-pt', 'הפועל פתח תקווה', 'Hapoel Petah Tikva', 'ישראל', 'פתח תקווה', null, 'hamoshava', 'ligat-haal', null, 2, { il: true }),
  T('maccabi-pt', 'מכבי פתח תקווה', 'Maccabi Petah Tikva', 'ישראל', 'פתח תקווה', null, 'hamoshava', null, null, 2, { il: true }),
  T('hapoel-haifa', 'הפועל חיפה', 'Hapoel Haifa', 'ישראל', 'חיפה', 1924, 'sammy-ofer', 'ligat-haal', null, 2, { il: true }),
  T('kiryat-shmona', 'עירוני קרית שמונה', 'Ironi Kiryat Shmona', 'ישראל', 'קרית שמונה', null, null, 'ligat-haal', null, 2, { il: true }),
  T('bnei-sakhnin', 'בני סכנין', 'Bnei Sakhnin', 'ישראל', 'סכנין', null, null, 'ligat-haal', null, 2, { il: true }),
  T('hapoel-jerusalem', 'הפועל ירושלים', 'Hapoel Jerusalem', 'ישראל', 'ירושלים', null, 'teddy', 'ligat-haal', null, 3, { il: true }),
  T('hapoel-ramat-gan', 'הפועל רמת גן', 'Hapoel Ramat Gan', 'ישראל', 'רמת גן', null, null, null, null, 3, { il: true }),
  T('ashdod', 'מ.ס. אשדוד', 'F.C. Ashdod', 'ישראל', 'אשדוד', null, null, null, null, 3, { il: true }),
  T('tiberias', 'עירוני טבריה', 'Ironi Tiberias', 'ישראל', 'טבריה', null, null, 'ligat-haal', null, 3, { il: true }),
  T('hapoel-kfar-saba', 'הפועל כפר סבא', 'Hapoel Kfar Saba', 'ישראל', 'כפר סבא', null, null, null, null, 3, { il: true })
];
