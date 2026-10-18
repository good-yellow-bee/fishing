import type { PlBook } from ".";

/**
 * Game content from @stillwater/shared, shown through `t(value)`: species,
 * lore, labels, badges, lures, level unlocks and the shared package's
 * player-facing messages. Keys are the exact English values.
 */
export const PL_CONTENT: PlBook = {
  // Species (fish.ts)
  "Golden shiner": "Złotawiec",
  Bluegill: "Bass niebieskoskrzeli",
  "Yellow perch": "Okoń żółty",
  "Black crappie": "Wielkooczka czarna",
  "Brook trout": "Pstrąg źródlany",
  "Smallmouth bass": "Bass małogębowy",
  "Rainbow trout": "Pstrąg tęczowy",
  "Largemouth bass": "Bass wielkogębowy",
  "Lake whitefish": "Sieja jeziorowa",
  "Common carp": "Karp",
  "Northern pike": "Szczupak",
  "Channel catfish": "Sumik kanałowy",
  Walleye: "Sandacz amerykański",
  Burbot: "Miętus",
  "Landlocked salmon": "Łosoś jeziorowy",
  "Tiger muskie": "Tygrysi szczupak",
  "Lake sturgeon": "Jesiotr jeziorowy",
  "Ghost pike": "Szczupak widmo",

  // Lore (fish.ts)
  "Small gold flashes gather where the dock casts its shade. Watch quietly and the whole school turns together.":
    "Małe złote błyski zbierają się w cieniu pomostu. Patrz cicho, a cała ławica zawróci naraz.",
  "A bluegill keeps a little patch of sunny shallows. Children at the point know its quick tug before they know its name.":
    "Bass niebieskoskrzeli pilnuje skrawka nasłonecznionej płycizny. Dzieci na cyplu znają jego szybkie szarpnięcie, zanim poznają jego imię.",
  "Perch drift along the reed edge like little lanterns. One gentle bite often means a few more are waiting nearby.":
    "Okonie dryfują wzdłuż trzcin jak małe latarenki. Jedno delikatne branie często znaczy, że kilka kolejnych czeka tuż obok.",
  "Crappie rest beneath the old dock boards. At dawn they slip out together, as if the lake has rung a tiny breakfast bell.":
    "Wielkooczki odpoczywają pod deskami starego pomostu. O świcie wypływają razem, jakby jezioro zadzwoniło maleńkim dzwonkiem na śniadanie.",
  "Brook trout hold where the inlet runs cool over stone. A glimpse of one feels like finding a small secret in the current.":
    "Pstrągi źródlane stoją tam, gdzie ujście chłodno płynie po kamieniach. Dostrzec jednego to jak znaleźć mały sekret w nurcie.",
  "Smallmouth wait beside the drop-off stones. They turn a quiet cast into a lively story for the walk home.":
    "Bassy małogębowe czekają przy kamieniach na uskoku. Z cichego rzutu robią żywą opowieść na drogę do domu.",
  "A rainbow trout brings a brief splash of colour to the grey water. The inlet anglers always pause to admire it.":
    "Pstrąg tęczowy wnosi krótki plusk koloru w szarą wodę. Wędkarze przy ujściu zawsze przystają, by go podziwiać.",
  "Largemouth lie under the lilies with barely a ripple. Leave a lure there long enough and the still water may answer.":
    "Bassy wielkogębowe leżą pod liliami, ledwie marszcząc wodę. Zostaw tam przynętę dość długo, a spokojna toń może odpowiedzieć.",
  "Whitefish move through the deep water in quiet company. Their silver sides catch the light on the way up.":
    "Sieje przemierzają głęboką wodę w cichym towarzystwie. Ich srebrne boki łapią światło w drodze na górę.",
  "Carp nose through the soft mud beside the reeds. The oldest dock regulars greet a big one like an old neighbour.":
    "Karpie ryją w miękkim mule przy trzcinach. Najstarsi bywalcy pomostu witają dużego jak starego sąsiada.",
  "Pike wait in the reeds as still as fallen branches. A sudden swirl is often the only warning they give.":
    "Szczupaki czekają w trzcinach nieruchome jak opadłe gałęzie. Nagły wir to często jedyne ostrzeżenie.",
  "Catfish feel their way along the bottom after dark. Their whiskers know the dock's old posts better than we do.":
    "Sumiki po zmroku macają drogę po dnie. Ich wąsy znają stare pale pomostu lepiej niż my.",
  "Walleye come close when the point falls into dusk. The last light on the water is a good reason to stay a little longer.":
    "Sandacze podpływają blisko, gdy cypel tonie w zmierzchu. Ostatnie światło na wodzie to dobry powód, by zostać trochę dłużej.",
  "Burbot stir in the cold dark below the drop-off. A patient angler may meet one while the rest of the lodge sleeps.":
    "Miętusy budzą się w zimnej ciemności pod uskokiem. Cierpliwy wędkarz może spotkać jednego, gdy cała przystań śpi.",
  "Salmon follow the inlet's cool thread into the lake. Their strong silver backs carry a little of the creek with them.":
    "Łososie płyną chłodną nicią ujścia do jeziora. Ich mocne srebrne grzbiety niosą ze sobą odrobinę potoku.",
  "The tiger muskie leaves wide wakes through the reeds. People at the lodge lower their voices when they tell of one.":
    "Tygrysi szczupak zostawia w trzcinach szerokie fale. Na przystani ludzie ściszają głos, gdy o nim opowiadają.",
  "Sturgeon travel the deep lake with slow, steady strokes. One at the surface makes the whole dock go quiet.":
    "Jesiotry przemierzają głębiny powolnymi, miarowymi ruchami. Jeden przy powierzchni ucisza cały pomost.",
  "Some say a pale pike follows the fog out of the inlet. Those who have held it remember the hush more than the weight.":
    "Mówią, że blady szczupak wypływa z ujścia za mgłą. Ci, którzy trzymali go w rękach, pamiętają ciszę bardziej niż wagę.",

  // Rarity (shown as the raw id)
  common: "pospolita",
  uncommon: "niepospolita",
  rare: "rzadka",
  legendary: "legendarna",

  // SKILL_LABELS
  Strength: "Siła",
  Accuracy: "Celność",
  Patience: "Cierpliwość",

  // SPOT_LABELS and STANCE_LABELS
  Dock: "Pomost",
  Reeds: "Trzciny",
  "Drop-off": "Uskok",
  Point: "Cypel",
  Inlet: "Ujście",
  "Open water": "Otwarta woda",
  Shop: "Sklep",
  Path: "Ścieżka",

  // SKY_LABELS and SKY_BLURB
  Clear: "Pogodnie",
  "Partly cloudy": "Częściowe zachmurzenie",
  Overcast: "Pochmurno",
  Rain: "Deszcz",
  Snow: "Śnieg",
  "New moon": "Nów",
  "Waxing crescent": "Przybywający sierp",
  "First quarter": "Pierwsza kwadra",
  "Waxing gibbous": "Przybywający garb",
  "Full moon": "Pełnia",
  "Waning gibbous": "Ubywający garb",
  "Last quarter": "Ostatnia kwadra",
  "Waning crescent": "Ubywający sierp",
  Fog: "Mgła",
  "Bright water. Commons feed, rare fish hang back.": "Jasna woda. Pospolite żerują, rzadkie się chowają.",
  "Mixed light. No fish favored.": "Zmienne światło. Żadna ryba nie ma przewagi.",
  "Gray light. Trout and bass roam.": "Szare światło. Pstrągi i bassy krążą.",
  "Rain on the water. Pike and muskie hunt.": "Deszcz na wodzie. Szczupaki polują.",
  "Snow on the water. Pike and muskie hunt.": "Śnieg na wodzie. Szczupaki polują.",
  "Fog on the lake. Catfish and burbot stir.": "Mgła nad jeziorem. Sumiki i miętusy się budzą.",
  "Catfish and burbot hunt by scent in the murk and fight harder.": "Sumiki i miętusy polują w mętnej wodzie na węch i walczą mocniej.",
  "The fish feed hard in the hour before the rain, from {hour}:00.": "Ryby żerują zachłannie w godzinie przed deszczem, od {hour}:00.",
  "The fish move up to feed as the fog burns off, from {hour}:00.": "Gdy mgła się rozwiewa, od {hour}:00, ryby podchodzą żerować.",
  "Bright after the rain: the fish sulk deep till noon, but a slow jig or worm still draws them.": "Jasno po deszczu: do południa ryby stoją ospale w głębi, ale wolny jig albo robak wciąż je skusi.",
  "A light north breeze blows onto the Dock, Reeds and Point, and the fish follow the food in.": "Lekki północny wiatr wieje na Pomost, Trzciny i Cypel, a ryby płyną za pokarmem.",
  "A light east breeze blows onto the Inlet and Reeds, and the fish follow the food in.": "Lekki wschodni wiatr wieje na Ujście i Trzciny, a ryby płyną za pokarmem.",
  "A light west breeze blows onto the Drop-off, and the fish follow the food in.": "Lekki zachodni wiatr wieje na Uskok, a ryby płyną za pokarmem.",
  "The moon passes overhead around {hour}:00, and the fish feed for an hour either side.": "Księżyc przechodzi nad głową około {hour}:00, a ryby żerują przez godzinę przed i po.",
  "The moon passes underfoot around {hour}:00, and the fish feed for an hour either side.": "Księżyc przechodzi pod stopami około {hour}:00, a ryby żerują przez godzinę przed i po.",
  "The water warms to {temp}, and the fish wake up to feed.": "Woda ociepla się do {temp}, a ryby budzą się do żerowania.",
  "The water cools to {temp}, and the sluggish fish bite slow.": "Woda ochładza się do {temp}, a ospałe ryby biorą powoli.",
  "The lake is turning over: slow bites, except in the inlet's fresh water.": "Jezioro się przewraca: brania są słabe, poza świeżą wodą w ujściu strumienia.",
  "On a clear night a spinner or spoon flashes under it.": "W pogodną noc obrotówka lub wahadłówka błyska w jej świetle.",
  "Too dark to see: bites come slower after dark.": "Za ciemno, by widzieć: po zmroku brania przychodzą wolniej.",

  // WIND_LABELS
  Calm: "Bezwietrznie",
  "Light north": "Słaby z północy",
  "Light east": "Słaby ze wschodu",
  "Light south": "Słaby z południa",
  "Light west": "Słaby z zachodu",
  Breezy: "Wietrznie",
  Strong: "Silny wiatr",

  // WATER_LABELS
  Lake: "Jezioro",
  River: "Rzeka",
  Pond: "Staw",
  Creek: "Potok",
  Reservoir: "Zbiornik",

  // LAKE_HOUR_LABELS and LAKE_HOUR_BLURB
  Dawn: "Świt",
  "High sun": "Południe",
  Dusk: "Zmierzch",
  Night: "Noc",
  "Trout work the shallows.": "Pstrągi przeczesują płycizny.",
  "Bright water. Commons cruise the dock.": "Jasna woda. Pospolite krążą przy pomoście.",
  "Bass, pike and walleye hunt the edges.": "Bassy, szczupaki i sandacze polują na krawędziach.",
  "Cats and burbot move in.": "Nadpływają sumiki i miętusy.",

  // Level unlocks (progression.ts)
  "The drop-off is open — walk east along the shore.": "Uskok jest otwarty — idź brzegiem na wschód.",
  "The Strike card marks how long a solid hook lasts.": "Karta „Zatnij!” pokazuje, jak długo zacięcie jest pewne.",
  "See a fish shadow before you strike.": "Widzisz cień ryby, zanim zatniesz.",
  "Cast 25% farther.": "Rzucasz o 25% dalej.",
  "The inlet is open — follow the west shore north. Legendary fish bite more often at night or in rain.":
    "Ujście jest otwarte — idź zachodnim brzegiem na północ. Legendarne ryby biorą częściej nocą i w deszczu.",
  "Fish bite 15% faster. The rowboat is yours — untie it at the dock and row out to open water.":
    "Ryby biorą o 15% szybciej. Łódka jest twoja — odwiąż ją przy pomoście i wypłyń na otwartą wodę.",
  "Better odds of trophy-size fish.": "Większa szansa na ryby trofealne.",
  "Hooked fish tire 20% faster.": "Zaholowane ryby męczą się o 20% szybciej.",
  "Rare and legendary fish bite more often.": "Rzadkie i legendarne ryby biorą częściej.",
  "Fish hold the bait 20% longer before they let go.": "Ryby trzymają przynętę o 20% dłużej, zanim ją puszczą.",
  "The gold perfect-cast mark is wider.": "Złoty znacznik idealnego rzutu jest szerszy.",
  "Working a lure (pops, hops, lifts and strips) draws the fish sooner three times, not two.": "Praca przynętą (pyknięcia, podbicia, podniesienia i ściągnięcia) przyspiesza branie trzy razy, a nie dwa.",

  // Badges (badges.ts)
  "Four banks": "Cztery brzegi",
  "Land a fish from four different banks.": "Złów rybę z czterech różnych brzegów.",
  "Night owl": "Nocny marek",
  "Land five fish at night.": "Złów pięć ryb nocą.",
  "Rain pike": "Deszczowy szczupak",
  "Land a pike in the rain.": "Złów szczupaka w deszczu.",
  "Clean sweep": "Czysta robota",
  "Win ten clean fights.": "Wygraj dziesięć czystych holi.",
  Trophy: "Trofeum",
  "Land a fish at trophy weight.": "Złów rybę o wadze trofealnej.",
  "Full book": "Pełny atlas",
  "Land all thirteen species of the lake's first book.": "Złów wszystkie trzynaście gatunków z pierwszego atlasu jeziora.",
  "Four seasons": "Cztery pory roku",
  "Land a fish in spring, summer, fall and winter.": "Złów rybę wiosną, latem, jesienią i zimą.",
  "Gold": "Złoto",
  "Land a golden fish.": "Złów złotą rybę.",
  "Steward": "Opiekun jeziora",
  "Release ten fish back into the lake.": "Wypuść dziesięć ryb z powrotem do jeziora.",
  "Regular": "Stały bywalec",
  "Land a fish seven days in a row.": "Złów rybę siedem dni z rzędu.",
  "Early bird": "Ranny ptaszek",
  "Land ten fish at dawn.": "Złów dziesięć ryb o świcie.",

  // Lure classes (tackle.ts)
  Topwater: "Powierzchniowa",
  "Live bait": "Żywa przynęta",
  "Float rig": "Zestaw spławikowy",
  Fly: "Mucha",
  Streamer: "Streamer",
  Spinner: "Obrotówka",
  Spoon: "Wahadłówka",
  Crankbait: "Wobler",
  Jig: "Jig",
  "Small lure": "Mała przynęta",

  // Sample tackle and lures (tackle.ts, logbook.ts)
  Spinnerbait: "Spinnerbait",
  "#5 Mepps": "Mepps nr 5",
  "Steel leader": "Przypon stalowy",
  "Jaw spreaders": "Rozwieraki",
  "Long-nose pliers": "Szczypce wydłużone",
  "Polarized glasses": "Okulary polaryzacyjne",
  "Green pumpkin tubes": "Tuby green pumpkin",
  "1/4 oz tube heads": "Główki do tub 1/4 oz",
  "Spare fluorocarbon leader": "Zapasowy przypon fluorocarbonowy",
  "Split-ring pliers": "Szczypce do kółek łącznikowych",
  "Landing net": "Podbierak",
  "5-weight fly rod": "Wędka muchowa klasy 5",
  "Woolly buggers": "Woolly buggery",
  "Pheasant tails": "Nimfy pheasant tail",
  "5x tippet": "Przypon muchowy 5x",
  Nippers: "Obcinaczki",
  Forceps: "Kleszczyki",
  "Wire leader": "Przypon drutowy",
  Headlamp: "Czołówka",
  "Crayfish crankbait": "Wobler rak",
  "Fluorocarbon leader": "Przypon fluorocarbonowy",
  "Needle-nose pliers": "Szczypce półokrągłe",
  Popper: "Popper",
  Nightcrawlers: "Rosówki",
  "Size 8 hooks": "Haczyki nr 8",
  "Pencil bobbers": "Spławiki ołówkowe",
  Hemostats: "Peany",
  "Elk hair caddis": "Chruścik z sierści łosia",
  "6x tippet": "Przypon muchowy 6x",
  Floatant: "Impregnat do much",
  "Woolly bugger": "Woolly bugger",
  "Pheasant tail": "Nimfa pheasant tail",
  "Green pumpkin tube": "Tuba green pumpkin",
  "Crayfish crank": "Wobler rak",
  Nightcrawler: "Rosówka",
  Bobber: "Spławik",

  // Sample logbook (logbook.ts)
  "Cedar Bend": "Cedrowy Zakręt",
  "Mill Race": "Młynówka",
  "Blackduck Pond": "Staw Czarnej Kaczki",
  "Quarry Cut": "Zalany Kamieniołom",
  "Oxbow Creek": "Potok Starorzecze",
  "North shore of the big lake. Cedars lean over a gravel shelf, then a weed edge that drops to about twelve feet.":
    "Północny brzeg dużego jeziora. Cedry pochylają się nad żwirową półką, dalej krawędź zielska opada na jakieś dwanaście stóp.",
  "Overcast, light west wind, water in the high 50s": "Pochmurno, słaby wiatr z zachodu, woda dość chłodna",
  "Pocket water below the old mill dam. Brook trout sit in the tailouts and the soft seam along the wall.":
    "Kieszenie wody pod starą tamą młyńską. Pstrągi źródlane stoją w wypłyceniach i w spokojnym szwie wzdłuż muru.",
  "Modest rise, tea-stained and clearing, first light": "Lekki przybór, woda koloru herbaty i się klaruje, pierwsze światło",
  "Shallow and weedy. Bluegill under the pads, and a bass if you work the shade line.":
    "Płytko i zarośnięte. Bassy niebieskoskrzele pod liśćmi grzybieni, a jeśli obłowisz linię cienia, to i bass.",
  "Still evenings, surface bugs": "Spokojne wieczory, owady na powierzchni",
  "Flooded quarry arm. Smallmouth hold the rock points and the first break into the channel.":
    "Zalane ramię kamieniołomu. Bassy małogębowe trzymają się skalnych cypli i pierwszego spadu do koryta.",
  "Bright sun, craw patterns dragged on the points": "Ostre słońce, raki wleczone po cyplach",
  "Narrow, cold, and easy to spook. Wild brookies if you stay off the bank and out of the skyline.":
    "Wąsko, zimno i łatwo spłoszyć. Dzikie pstrągi źródlane, jeśli trzymasz się z dala od brzegu i nie rysujesz się na tle nieba.",
  "Low and clear, full cloud cover": "Niska i czysta woda, pełne zachmurzenie",
  "Dawn patrol": "Poranny patrol",
  "Weed edge before the wind fills in.": "Krawędź zielska, zanim zerwie się wiatr.",
  "Back to the points": "Z powrotem na cyple",
  "Green pumpkin tubes and a spare leader.": "Tuby green pumpkin i zapasowy przypon.",
  "Below the mill": "Pod młynem",
  "Water was up a few inches and the color of weak tea.": "Woda podniosła się o kilka cali i miała kolor słabej herbaty.",
  "Evening edge": "Wieczorna krawędź",
  "The weed point turned on once the light dropped.": "Cypel przy zielsku ożył, gdy zgasło światło.",
  "Rock points": "Skalne cyple",
  "Sun was high. They wanted it slow on the bottom.": "Słońce wysoko. Chciały powoli, przy dnie.",
  "Pad edges": "Skraj grzybieni",
  "Glass calm until the bugs came off.": "Tafla jak szkło, dopóki nie wyroiły się owady.",
  "Quiet water": "Spokojna woda",
  "Knees in the alders. One good fish and two misses.": "Na kolanach w olszynach. Jedna dobra ryba i dwa pudła.",
  "Took it on the swing through the tailout.": "Wzięła na łuku przez wypłycenie.",
  "Smaller fish, same seam along the wall.": "Mniejsza ryba, ten sam szew wzdłuż muru.",
  "Followed twice, then hit on the pause.": "Dwa razy poszła za przynętą, potem uderzyła na pauzie.",
  "Same weed point. Heavier fish, short fight.": "Ten sam cypel przy zielsku. Cięższa ryba, krótki hol.",
  "Dragged it off the first point into the channel.": "Ściągnięta z pierwszego cypla do koryta.",
  "Hit as the crank bounced the second rock.": "Uderzyła, gdy wobler odbił się od drugiego kamienia.",
  "Sipped it under the pads and ran for the stems.": "Zassała pod liśćmi i uciekła w łodygi.",
  "Right at dark, off the little point.": "Tuż po zmroku, przy małym cyplu.",
  "Rose once in the tail of the pool.": "Wyszła raz na końcu dołka.",
  "Held under the leaning birch. Came up on the second drift.": "Stała pod pochyloną brzozą. Wyszła przy drugim spływie.",
  "Landed on the lake.": "Złowiona na jeziorze.",
  "Unknown water": "Nieznana woda",

  // Logbook, weather, tackle, photo and archive messages
  "Name the fish, in a few words.": "Nazwij rybę w kilku słowach.",
  "Use a number for length or weight.": "Podaj długość lub wagę liczbą.",
  "Length should sit between 1 and 120 inches.": "Długość powinna wynosić od 1 do 120 cali.",
  "Weight should sit between 0.1 and 300 pounds.": "Waga powinna wynosić od 0,1 do 300 funtów.",
  "Choose length or weight.": "Wybierz długość lub wagę.",
  "What was on the line?": "Co było na żyłce?",
  "Pick the water this fish came from.": "Wybierz wodę, z której pochodzi ta ryba.",
  "That outing is not in the book.": "Tej wyprawy nie ma w dzienniku.",
  "That outing was on a different water.": "Ta wyprawa była na innej wodzie.",
  "Set the time you landed it.": "Ustaw godzinę połowu.",
  "That time is still ahead of you.": "Ta godzina jeszcze przed Tobą.",
  "Keep the note to a few lines.": "Zmieść notatkę w kilku linijkach.",
  "Give the spot a short name.": "Nadaj łowisku krótką nazwę.",
  "Pick a water type.": "Wybierz rodzaj wody.",
  "Shorten the notes a little.": "Skróć trochę notatki.",
  "Keep the best conditions to one line.": "Zmieść najlepsze warunki w jednej linijce.",
  "Pick a date.": "Wybierz datę.",
  "Pick a spot.": "Wybierz łowisko.",
  "Shorten the title.": "Skróć tytuł.",
  "Shorten the note a little.": "Skróć trochę notatkę.",
  "Note the sky.": "Zapisz niebo.",
  "Note the wind.": "Zapisz wiatr.",
  "Use a number for the water temperature.": "Podaj temperaturę wody liczbą.",
  "Water temperature should sit between 32 and 90.": "Temperatura wody powinna wynosić od 32 do 90.",
  "Name the piece in a few words.": "Nazwij sprzęt w kilku słowach.",
  "That photo is still over 130 KB after it is reduced, so it was not saved.":
    "To zdjęcie po zmniejszeniu wciąż ma ponad 130 KB, więc nie zostało zapisane.",
  "Choose a JPEG, PNG, or WebP photo.": "Wybierz zdjęcie JPEG, PNG lub WebP.",
  "That catch is not in this book.": "Tej ryby nie ma w tym dzienniku.",
  "The book already holds as many photos as this browser should keep.":
    "Dziennik ma już tyle zdjęć, ile ta przeglądarka powinna przechowywać.",
  "That file is not a Stillwater field log. This book was left as it is.":
    "Ten plik nie jest dziennikiem połowów Stillwater. Dziennik pozostał bez zmian.",
  "That file has more photos than this browser should keep. This book was left as it is.":
    "Ten plik ma więcej zdjęć, niż ta przeglądarka powinna przechowywać. Dziennik pozostał bez zmian.",

  // Server refusals (rules.ts), shown when a catch or upgrade is turned down
  "unknown species": "nieznany gatunek",
  "species not at this spot": "tego gatunku nie ma na tym łowisku",
  "spot locked": "łowisko zablokowane",
  "weight out of range": "waga poza zakresem",
  "line too light for this fish": "żyłka za słaba na tę rybę",
  "skill already maxed": "umiejętność już na maksimum",
  "not enough points": "za mało punktów",

  // Sentences rebuilt in i18n/content.ts
  "A {fish}": "1 × {fish}",
  " over {weight}": " powyżej {weight}",
  " at the {spot}": " — {spot}",
  "Beats the {size} {species} already in the field log": "Bije wpis z dziennika połowów: {species}, {size}",
  "Beats your {size} {species} already in the field log": "Bije twój wpis z dziennika połowów: {species}, {size}",
  // Seasons
  Spring: "Wiosna",
  Summer: "Lato",
  Fall: "Jesień",
  Winter: "Zima",
  "Ice out. Trout and crappie crowd the shallows.": "Lody puściły. Pstrągi i wielkooczki tłoczą się na płyciznach.",
  "Warm water. Bass, carp and catfish feed hard.": "Ciepła woda. Bassy, karpie i sumiki żerują na całego.",
  "Salmon run. Walleye and pike fatten up.": "Łososie ciągną. Sandacze i szczupaki tyją.",
  "Ice at the edges. Burbot and whitefish stir.": "Lód przy brzegach. Miętusy i sieje ruszają się.",
};
