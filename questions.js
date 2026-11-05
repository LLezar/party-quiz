// filename: questions.js
/**
 * ИНСТРУКЦИЯ ПО РЕДАКТИРОВАНИЮ:
 * 1. Чтобы добавить категорию, добавьте объект в массив `categories` (id, name, icon).
 * 2. В объекте `items` создайте ключ с этим же id и массив объектов вопросов.
 * 3. Структура вопроса:
 *    - id: уникальный идентификатор.
 *    - text: текст вопроса.
 *    - imageUrl: (опционально) ссылка на картинку.
 *    - options: массив из 4 вариантов ответа.
 *    - correctIndex: число от 0 до 3.
 */

window.QuestionBank = {
  categories: [
    { id: "cinema", name: "Кино и сериалы", icon: "🎬" },
    { id: "games", name: "Видеоигры", icon: "🎮" },
    { id: "science", name: "Наука и космос", icon: "🚀" },
    { id: "geography", name: "География", icon: "🌍" },
    { id: "music", name: "Музыка и поп-культура", icon: "🎵" },
    { id: "facts", name: "Странные факты", icon: "💡" },
    { id: "landmarks", name: "Достопримечательности", icon: "🗼" },
    { id: "celebs", name: "Знаменитости", icon: "⭐" },
    { id: "cartoons", name: "Мультфильмы", icon: "🎈" },
    { id: "art", name: "Искусство", icon: "🎨" },
    { id: "history", name: "История", icon: "📜" }
  ],

  items: {
    cinema: [
      { id: "mov1", text: "Как зовут робота-убийцу из будущего в фильме 'Терминатор'?", options: ["T-800", "R2-D2", "C-3PO", "Wall-E"], correctIndex: 0 },
      { id: "mov2", text: "Какой актер сыграл Джека Воробья?", options: ["Брэд Питт", "Джонни Депп", "Леонардо Ди Каприо", "Том Круз"], correctIndex: 1 },
      { id: "mov3", text: "В каком фильме звучит фраза 'Я сделаю ему предложение, от которого он не сможет отказаться'?", options: ["Криминальное чтиво", "Крестный отец", "Славные парни", "Лицо со шрамом"], correctIndex: 1 },
      { id: "mov4", text: "Кто снял фильм 'Интерстеллар'?", options: ["Джеймс Кэмерон", "Стивен Спилберг", "Кристофер Нолан", "Ридли Скотт"], correctIndex: 2 },
      { id: "mov5", text: "Как называется планета, где живут Аватары?", options: ["Татуин", "Пандора", "Арракис", "Набу"], correctIndex: 1 },
      { id: "mov6", text: "Какой фильм получил рекордное количество Оскаров?", options: ["Титаник", "Властелин колец: Возвращение короля", "Бен-Гур", "Все вышеперечисленное"], correctIndex: 3 },
      { id: "mov7", text: "Кто сыграл главную роль в фильме 'Джокер' 2019 года?", options: ["Хит Леджер", "Хоакин Феникс", "Джаред Лето", "Джек Николсон"], correctIndex: 1 },
      { id: "mov8", text: "Как зовут драконов Дейенерис Таргариен?", options: ["Дрогон, Рейгаль, Визерион", "Балерион, Мераксес, Вхагар", "Смог, Драко, Игнис", "Огонь, Лед, Пепел"], correctIndex: 0 }
    ],
    games: [
      { id: "game1", text: "Кто является главным героем серии игр The Legend of Zelda?", options: ["Зельда", "Линк", "Гэнон", "Марио"], correctIndex: 1 },
      { id: "game2", text: "В какой игре нужно выживать среди зомби в постапокалиптическом мире?", options: ["The Last of Us", "Tetris", "FIFA", "Mario Kart"], correctIndex: 0 },
      { id: "game3", text: "Как зовут водопроводчика, который спасает принцессу Пич?", options: ["Луиджи", "Варио", "Марио", "Боузер"], correctIndex: 2 },
      { id: "game4", text: "Какая игра стала самой продаваемой в истории?", options: ["GTA V", "Minecraft", "Tetris", "Wii Sports"], correctIndex: 1 },
      { id: "game5", text: "Кто создал серию игр Metal Gear?", options: ["Хидэо Кодзима", "Сигэру Миямото", "Тодд Говард", "Гейб Ньюэлл"], correctIndex: 0 },
      { id: "game6", text: "В какой игре главный герой носит скрытый клинок?", options: ["Assassin's Creed", "Hitman", "Skyrim", "Dark Souls"], correctIndex: 0 },
      { id: "game7", text: "Как называется город в игре BioShock?", options: ["Рапчур", "Колумбия", "Вайтран", "Сити-17"], correctIndex: 0 },
      { id: "game8", text: "Какая игра известна своей высокой сложностью?", options: ["Dark Souls", "Animal Crossing", "The Sims", "Stardew Valley"], correctIndex: 0 }
    ],
    science: [
      { id: "sci1", text: "Какая планета является самой большой в Солнечной системе?", options: ["Марс", "Сатурн", "Юпитер", "Земля"], correctIndex: 2 },
      { id: "sci2", text: "Что изучает астрономия?", options: ["Звезды", "Животных", "Растения", "Историю"], correctIndex: 0 },
      { id: "sci3", text: "Кто первым ступил на Луну?", options: ["Юрий Гагарин", "Нил Армстронг", "Базз Олдрин", "Илон Маск"], correctIndex: 1 },
      { id: "sci4", text: "Какое вещество необходимо для дыхания человека?", options: ["Азот", "Кислород", "Углекислый газ", "Водород"], correctIndex: 1 },
      { id: "sci5", text: "Сколько планет в нашей Солнечной системе?", options: ["7", "8", "9", "10"], correctIndex: 1 },
      { id: "sci6", text: "Что такое фотосинтез?", options: ["Процесс питания растений", "Движение планет", "Деление клеток", "Синтез металлов"], correctIndex: 0 },
      { id: "sci7", text: "Как называется ближайшая к нам звезда?", options: ["Сириус", "Солнце", "Полярная звезда", "Альфа Центавра"], correctIndex: 1 },
      { id: "sci8", text: "Какая скорость света?", options: ["300 000 км/с", "150 000 км/с", "1000 км/с", "30 000 км/с"], correctIndex: 0 }
    ],
    geography: [
      { id: "geo1", text: "Какая страна самая большая по площади?", options: ["Китай", "США", "Россия", "Канада"], correctIndex: 2 },
      { id: "geo2", text: "Столица Франции?", options: ["Берлин", "Мадрид", "Париж", "Лондон"], correctIndex: 2 },
      { id: "geo3", text: "Где находится Эйфелева башня?", options: ["Рим", "Париж", "Берлин", "Москва"], correctIndex: 1 },
      { id: "geo4", text: "Какой океан самый большой?", options: ["Атлантический", "Индийский", "Тихий", "Северный Ледовитый"], correctIndex: 2 },
      { id: "geo5", text: "В какой стране находятся пирамиды Гизы?", options: ["Турция", "Египет", "Греция", "Мексика"], correctIndex: 1 },
      { id: "geo6", text: "Какая река самая длинная в мире?", options: ["Амазонка", "Нил", "Миссисипи", "Янцзы"], correctIndex: 1 },
      { id: "geo7", text: "Какой город называют 'Большим яблоком'?", options: ["Лондон", "Токио", "Нью-Йорк", "Чикаго"], correctIndex: 2 },
      { id: "geo8", text: "На каком континенте находится пустыня Сахара?", options: ["Азия", "Африка", "Австралия", "Южная Америка"], correctIndex: 1 }
    ],
    music: [
      { id: "mus1", text: "Кто является 'Королем поп-музыки'?", options: ["Элвис Пресли", "Майкл Джексон", "Фредди Меркьюри", "Принс"], correctIndex: 1 },
      { id: "mus2", text: "Какая группа выпустила альбом 'Abbey Road'?", options: ["Queen", "The Beatles", "Pink Floyd", "Led Zeppelin"], correctIndex: 1 },
      { id: "mus3", text: "Кто исполнил хит 'Bad Guy'?", options: ["Тейлор Свифт", "Билли Айлиш", "Ариана Гранде", "Дуа Липа"], correctIndex: 1 },
      { id: "mus4", text: "Как называется самый популярный видеохостинг?", options: ["TikTok", "YouTube", "Vimeo", "Twitch"], correctIndex: 1 },
      { id: "mus5", text: "Кто был вокалистом группы Queen?", options: ["Дэвид Боуи", "Фредди Меркьюри", "Мик Джаггер", "Курт Кобейн"], correctIndex: 1 },
      { id: "mus6", text: "Какой музыкальный инструмент у скрипача?", options: ["Скрипка", "Пианино", "Гитара", "Труба"], correctIndex: 0 },
      { id: "mus7", text: "Кто создал социальную сеть Facebook?", options: ["Билл Гейтс", "Стив Джобс", "Марк Цукерберг", "Илон Маск"], correctIndex: 2 },
      { id: "mus8", text: "Какой стиль музыки зародился в Ямайке?", options: ["Джаз", "Регги", "Рок", "Кантри"], correctIndex: 1 }
    ],
    facts: [
      { id: "str1", text: "У какого животного три сердца?", options: ["Осьминог", "Акула", "Кит", "Слон"], correctIndex: 0 },
      { id: "str2", text: "Могут ли коровы подниматься по лестнице?", options: ["Да", "Нет", "Только вниз", "Только если очень голодны"], correctIndex: 1 },
      { id: "str3", text: "Какое животное самое быстрое на суше?", options: ["Лев", "Гепард", "Антилопа", "Лошадь"], correctIndex: 1 },
      { id: "str4", text: "Сколько зубов у взрослого человека?", options: ["28", "30", "32", "34"], correctIndex: 2 },
      { id: "str5", text: "Какой фрукт является ягодой?", options: ["Вишня", "Банан", "Яблоко", "Груша"], correctIndex: 1 },
      { id: "str6", text: "Могут ли пингвины летать?", options: ["Да", "Нет", "Только молодые", "Только в воде"], correctIndex: 1 },
      { id: "str7", text: "Какое насекомое живет дольше всех?", options: ["Муравей", "Муха", "Бабочка", "Комар"], correctIndex: 0 },
      { id: "str8", text: "Кто спит с открытыми глазами?", options: ["Рыбы", "Птицы", "Змеи", "Лягушки"], correctIndex: 0 }
    ],
    landmarks: [
      { id: "land1", text: "Что это за здание?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9A%D0%BE%D0%BB%D0%B8%D0%B7%D0%B5%D0%B9%20%D0%A0%D0%B8%D0%BC%20%D1%84%D0%BE%D1%82%D0%BE&w=640&h=420&c=7", options: ["Колизей", "Пантеон", "Арена Вероны", "Цирк Максимус"], correctIndex: 0 },
      { id: "land2", text: "Где находится этот мост?", imageUrl: "https://tse2.mm.bing.net/th?q=Golden%20Gate%20Bridge%20San%20Francisco%20photo&w=640&h=420&c=7", options: ["Лондон", "Сан-Франциско", "Сидней", "Нью-Йорк"], correctIndex: 1 },
      { id: "land3", text: "Как называется этот монумент?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%A1%D1%82%D0%B0%D1%82%D1%83%D1%8F%20%D0%A1%D0%B2%D0%BE%D0%B1%D0%BE%D0%B4%D1%8B%20%D0%9D%D1%8C%D1%8E-%D0%99%D0%BE%D1%80%D0%BA&w=500&h=600&c=7", options: ["Статуя Свободы", "Родина-мать", "Христос-Искупитель", "Колосс Родосский"], correctIndex: 0 },
      { id: "land4", text: "В какой стране находится этот храм?", imageUrl: "https://tse2.mm.bing.net/th?q=Angkor%20Wat%20Cambodia%20temple&w=640&h=420&c=7", options: ["Индия", "Камбоджа", "Таиланд", "Вьетнам"], correctIndex: 1 },
      { id: "land5", text: "Что это за башня?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9F%D0%B8%D0%B7%D0%B0%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%20%D0%B1%D0%B0%D1%88%D0%BD%D1%8F%20%D0%98%D1%82%D0%B0%D0%BB%D0%B8%D1%8F&w=500&h=600&c=7", options: ["Пизанская башня", "Биг-Бен", "Эйфелева башня", "Бурдж-Халифа"], correctIndex: 0 },
      { id: "land6", text: "Где находится этот оперный театр?", imageUrl: "https://tse2.mm.bing.net/th?q=Sydney%20Opera%20House%20Australia&w=640&h=420&c=7", options: ["Сидней", "Вена", "Париж", "Торонто"], correctIndex: 0 },
      { id: "land7", text: "Что это за место?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%A2%D0%B0%D0%B4%D0%B6-%D0%9C%D0%B0%D1%85%D0%B0%D0%BB%20%D0%98%D0%BD%D0%B4%D0%B8%D1%8F%20%D1%84%D0%BE%D1%82%D0%BE&w=640&h=420&c=7", options: ["Тадж-Махал", "Мечеть Аль-Харам", "Дворец Дожей", "Альгамбра"], correctIndex: 0 },
      { id: "land8", text: "Где находится эта стена?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%92%D0%B5%D0%BB%D0%B8%D0%BA%D0%B0%D1%8F%20%D0%9A%D0%B8%D1%82%D0%B0%D0%B9%D1%81%D0%BA%D0%B0%D1%8F%20%D1%81%D1%82%D0%B5%D0%BD%D0%B0%20%D1%84%D0%BE%D1%82%D0%BE&w=640&h=420&c=7", options: ["Монголия", "Китай", "Корея", "Япония"], correctIndex: 1 }
    ],
    celebs: [
      { id: "cel1", text: "Кто этот актер?", imageUrl: "https://tse2.mm.bing.net/th?q=Keanu%20Reeves%20actor%20portrait&w=500&h=500&c=7", options: ["Брэд Питт", "Киану Ривз", "Том Хэнкс", "Николас Кейдж"], correctIndex: 1 },
      { id: "cel2", text: "Кто эта певица?", imageUrl: "https://tse2.mm.bing.net/th?q=Taylor%20Swift%20singer%20portrait&w=500&h=500&c=7", options: ["Ариана Гранде", "Тейлор Свифт", "Селена Гомес", "Кэти Перри"], correctIndex: 1 },
      { id: "cel3", text: "Кто этот человек?", imageUrl: "https://tse2.mm.bing.net/th?q=Elon%20Musk%20portrait%20photo&w=500&h=500&c=7", options: ["Билл Гейтс", "Илон Маск", "Джефф Безос", "Марк Цукерберг"], correctIndex: 1 },
      { id: "cel4", text: "Кто этот футболист?", imageUrl: "https://tse2.mm.bing.net/th?q=Cristiano%20Ronaldo%20football%20player&w=500&h=500&c=7", options: ["Месси", "Роналду", "Мбаппе", "Неймар"], correctIndex: 1 },
      { id: "cel5", text: "Кто эта актриса?", imageUrl: "https://tse2.mm.bing.net/th?q=Angelina%20Jolie%20actress%20portrait&w=500&h=500&c=7", options: ["Скарлетт Йоханссон", "Анджелина Джоли", "Дженнифер Энистон", "Марго Робби"], correctIndex: 1 },
      { id: "cel6", text: "Кто этот режиссер?", imageUrl: "https://tse2.mm.bing.net/th?q=Quentin%20Tarantino%20director%20photo&w=500&h=500&c=7", options: ["Кристофер Нолан", "Квентин Тарантино", "Мартин Скорсезе", "Стивен Спилберг"], correctIndex: 1 },
      { id: "cel7", text: "Кто этот музыкант?", imageUrl: "https://tse2.mm.bing.net/th?q=Freddie%20Mercury%20Queen%20singer&w=500&h=500&c=7", options: ["Дэвид Боуи", "Фредди Меркьюри", "Элтон Джон", "Мик Джаггер"], correctIndex: 1 },
      { id: "cel8", text: "Кто это?", imageUrl: "https://tse2.mm.bing.net/th?q=Albert%20Einstein%20scientist%20photo&w=500&h=500&c=7", options: ["Исаак Ньютон", "Альберт Эйнштейн", "Никола Тесла", "Стивен Хокинг"], correctIndex: 1 }
    ],
    cartoons: [
      { id: "cart1", text: "Как зовут этого персонажа?", imageUrl: "https://tse2.mm.bing.net/th?q=Homer%20Simpson%20character&w=500&h=500&c=7", options: ["Барт", "Гомер", "Нед", "Лиза"], correctIndex: 1 },
      { id: "cart2", text: "Из какого мультфильма этот персонаж?", imageUrl: "https://tse2.mm.bing.net/th?q=Shrek%20character%20face&w=500&h=500&c=7", options: ["Мадагаскар", "Шрек", "Ледниковый период", "Кунг-фу Панда"], correctIndex: 1 },
      { id: "cart3", text: "Как зовут этого героя?", imageUrl: "https://tse2.mm.bing.net/th?q=Mickey%20Mouse%20Disney%20character&w=500&h=500&c=7", options: ["Дональд Дак", "Микки Маус", "Гуфи", "Плуто"], correctIndex: 1 },
      { id: "cart4", text: "Кто это?", imageUrl: "https://tse2.mm.bing.net/th?q=SpongeBob%20SquarePants%20character&w=500&h=500&c=7", options: ["Патрик", "Сквидвард", "Губка Боб", "Крабс"], correctIndex: 2 },
      { id: "cart5", text: "Как зовут этого покемона?", imageUrl: "https://tse2.mm.bing.net/th?q=Pikachu%20Pokemon%20character&w=500&h=500&c=7", options: ["Бульбазавр", "Пикачу", "Чармандер", "Сквиртл"], correctIndex: 1 },
      { id: "cart6", text: "Кто это?", imageUrl: "https://tse2.mm.bing.net/th?q=Minion%20Despicable%20Me%20character&w=500&h=500&c=7", options: ["Миньон", "Грю", "Доктор Нефарио", "Вектор"], correctIndex: 0 },
      { id: "cart7", text: "Из какого мультфильма персонаж?", imageUrl: "https://tse2.mm.bing.net/th?q=WALL-E%20Pixar%20robot&w=500&h=500&c=7", options: ["ВАЛЛ-И", "Роботы", "Суперсемейка", "Тачки"], correctIndex: 0 },
      { id: "cart8", text: "Как зовут эту принцессу?", imageUrl: "https://tse2.mm.bing.net/th?q=Elsa%20Frozen%20Disney%20princess&w=500&h=500&c=7", options: ["Анна", "Эльза", "Рапунцель", "Ариэль"], correctIndex: 1 }
    ],
    art: [
      { id: "art1", text: "Кто написал эту картину?", imageUrl: "https://tse2.mm.bing.net/th?q=Starry%20Night%20Van%20Gogh%20painting&w=640&h=480&c=7", options: ["Моне", "Ван Гог", "Пикассо", "Дали"], correctIndex: 1 },
      { id: "art2", text: "Как называется эта картина?", imageUrl: "https://tse2.mm.bing.net/th?q=Mona%20Lisa%20Leonardo%20da%20Vinci&w=500&h=600&c=7", options: ["Дама с горностаем", "Мона Лиза", "Тайная вечеря", "Мадонна Литта"], correctIndex: 1 },
      { id: "art3", text: "Кто автор этой картины?", imageUrl: "https://tse2.mm.bing.net/th?q=The%20Scream%20Edvard%20Munch%20painting&w=500&h=600&c=7", options: ["Эдвард Мунк", "Пабло Пикассо", "Сальвадор Дали", "Анри Матисс"], correctIndex: 0 },
      { id: "art4", text: "В каком стиле написана эта работа?", imageUrl: "https://tse2.mm.bing.net/th?q=The%20Persistence%20of%20Memory%20Salvador%20Dali&w=640&h=480&c=7", options: ["Импрессионизм", "Сюрреализм", "Кубизм", "Реализм"], correctIndex: 1 },
      { id: "art5", text: "Кто это нарисовал?", imageUrl: "https://tse2.mm.bing.net/th?q=The%20Kiss%20Gustav%20Klimt%20painting&w=500&h=600&c=7", options: ["Густав Климт", "Клод Моне", "Василий Кандинский", "Марк Шагал"], correctIndex: 0 },
      { id: "art6", text: "Как называется эта картина?", imageUrl: "https://tse2.mm.bing.net/th?q=The%20Birth%20of%20Venus%20Botticelli&w=640&h=480&c=7", options: ["Рождение Венеры", "Весна", "Три грации", "Мадонна"], correctIndex: 0 },
      { id: "art7", text: "Кто художник этой работы?", imageUrl: "https://tse2.mm.bing.net/th?q=Girl%20with%20a%20Pearl%20Earring%20Vermeer&w=500&h=600&c=7", options: ["Рембрандт", "Ян Вермеер", "Питер Рубенс", "Франс Халс"], correctIndex: 1 },
      { id: "art8", text: "Кто это изобразил?", imageUrl: "https://tse2.mm.bing.net/th?q=Piet%20Mondrian%20Composition%20with%20Red%20Blue%20and%20Yellow&w=500&h=500&c=7", options: ["Пит Мондриан", "Казимир Малевич", "Марсель Дюшан", "Жоан Миро"], correctIndex: 0 }
    ],
    history: [
      { id: "hist1", text: "В каком году началась Вторая мировая война?", options: ["1938", "1939", "1940", "1941"], correctIndex: 1 },
      { id: "hist2", text: "Кто был первым президентом США?", options: ["Авраам Линкольн", "Джордж Вашингтон", "Томас Джефферсон", "Бенджамин Франклин"], correctIndex: 1 },
      { id: "hist3", text: "Как называлась древняя египетская письменность?", options: ["Клинопись", "Иероглифы", "Латынь", "Санскрит"], correctIndex: 1 },
      { id: "hist4", text: "Кто открыл Америку в 1492 году?", options: ["Васко да Гама", "Христофор Колумб", "Фернан Магеллан", "Америго Веспуччи"], correctIndex: 1 },
      { id: "hist5", text: "Какая империя была самой большой в истории?", options: ["Римская", "Британская", "Монгольская", "Османская"], correctIndex: 1 },
      { id: "hist6", text: "Кто был лидером СССР во время Великой Отечественной войны?", options: ["Ленин", "Сталин", "Хрущев", "Брежнев"], correctIndex: 1 },
      { id: "hist7", text: "Какое событие ознаменовало начало Французской революции?", options: ["Взятие Бастилии", "Казнь короля", "Поход на Версаль", "Принятие Декларации"], correctIndex: 0 },
      { id: "hist8", text: "Как звали последнего русского царя?", options: ["Александр III", "Николай II", "Петр I", "Павел I"], correctIndex: 1 }
    ]
  },

  getCategories: function(count = 3) {
    const shuffled = [...this.categories].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  },

  getQuestions: function(categoryId, count = 4) {
    const list = this.items[categoryId] || this.items['cinema'] || [];
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
};