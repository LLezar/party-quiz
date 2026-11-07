// filename: questions.js
/**
 * ИНСТРУКЦИЯ ПО РЕДАКТИРОВАНИЮ:
 * 1. Чтобы добавить категорию, добавьте объект в массив `categories` (id, name, icon).
 * 2. В объекте `items` создайте ключ с этим же id и массив объектов вопросов.
 * 3. Структура вопроса:
 *    - id: уникальный идентификатор.
 *    - text: текст вопроса.
 *    - imageUrl: (опционально) ссылка на картинку вида "https://tse2.mm.bing.net/th?q=...&w=640&h=420&c=7".
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
    { id: "history", name: "История", icon: "📜" },
    { id: "memes", name: "Мемология", icon: "🗿" },
    { id: "funny_animals", name: "Шутки фауны", icon: "😸" },
    { id: "crazy_food", name: "Кулинарные курьёзы", icon: "🍕" },
    { id: "geek_humor", name: "Гик-юмор", icon: "👾" },
    { id: "epic_fails", name: "Эпичные моменты", icon: "🤦" }
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
    ],
    memes: [
      { id: "meme1", text: "Как зовут эту легендарную собаку породы сиба-ину из мема?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%94%D0%BE%D0%B3%D0%B5%20%D1%81%D0%BE%D0%B1%D0%B0%D0%BA%D0%B0%20Doge%20meme&w=640&h=420&c=7", options: ["Хатико", "Доге", "Чемс", "Балто"], correctIndex: 1 },
      { id: "meme2", text: "Какое животное кричит 'Наташа, мы всё уронили'?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9A%D0%BE%D1%82%D1%8B%20%D0%9D%D0%B0%D1%82%D0%B0%D1%88%D0%B0%20%D0%BC%D1%8B%20%D1%82%D0%B0%D0%BC%20%D0%B2%D1%81%D0%B5%20%D1%83%D1%80%D0%BE%D0%BD%D0%B8%D0%BB%D0%B8&w=640&h=420&c=7", options: ["Еноты", "Собаки", "Коты", "Попугаи"], correctIndex: 2 },
      { id: "meme3", text: "Кто этот улыбающийся седовласый герой грустных мемов?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%93%D0%B0%D1%80%D0%BE%D0%BB%D1%8C%D0%B4%20%D0%BF%D1%80%D1%8F%D1%87%D1%83%D1%89%D0%B8%D0%B9%20%D0%B1%D0%BE%D0%BB%D1%8C%20Hide%20the%20Pain%20Harold&w=640&h=420&c=7", options: ["Гарольд скрывающий боль", "Дед Максим", "Доктор Ливси", "Тони Старк"], correctIndex: 0 },
      { id: "meme4", text: "Что по мему нельзя просто так взять и сделать?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9D%D0%B5%D0%BB%D1%8C%D0%B7%D1%8F%20%D0%BF%D1%80%D0%BE%D1%81%D1%82%D0%BE%D1%82%D0%B0%D0%BA%20%D0%B2%D0%B7%D1%8F%D1%82%D1%8C%20%D0%B8%20%D0%B2%D0%BE%D0%B9%D1%82%D0%B8%20%D0%B2%20%D0%9C%D0%BE%D1%80%D0%B4%D0%BE%D1%80&w=640&h=420&c=7", options: ["Войти в Мордор", "Сдать сессию", "Выиграть в лотерею", "Похудеть к лету"], correctIndex: 0 },
      { id: "meme5", text: "Как прозвали эту угрюмую кошку?", imageUrl: "https://tse2.mm.bing.net/th?q=Grumpy%20Cat%20%D1%81%D0%B5%D1%80%D0%B4%D0%B8%D1%82%D1%8B%D0%B9%20%D0%BA%D0%BE%D1%82&w=640&h=420&c=7", options: ["Хэппи Кэт", "Грампи Кэт", "Мурка", "Кот Борис"], correctIndex: 1 },
      { id: "meme6", text: "Что держит в руке Леонардо Ди Каприо в знаменитом тосте?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9B%D0%B5%D0%BE%D0%BD%D0%B0%D1%80%D0%B4%D0%BE%20%D0%94%D0%B8%20%D0%9A%D0%B0%D0%BF%D1%80%D0%B8%D0%BE%20%D0%B1%D0%BE%D0%BA%D0%B0%D0%BB%20%D0%92%D0%B5%D0%BB%D0%B8%D0%BA%D0%B8%D0%B9%20%D0%93%D1%8D%D1%82%D1%81%D0%B1%D0%B8&w=640&h=420&c=7", options: ["Кружку кофе", "Бокал шампанского", "Стакан сока", "Оскар"], correctIndex: 1 },
      { id: "meme7", text: "Что продавали эти знаменитые коты из мема?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%92%D1%8B%20%D1%80%D1%8B%D0%B1%D0%BE%D0%B2%20%D0%BF%D1%80%D0%BE%D0%B4%D0%B0%D0%B5%D1%82%D0%B5%20%D0%BA%D1%80%D0%BE%D1%81%D0%B8%D0%B2%D0%BE%D0%B5&w=640&h=420&c=7", options: ["Колбасу", "Рыбов", "Сыр", "Молоко"], correctIndex: 1 },
      { id: "meme8", text: "Кто этот невозмутимый пёс в горящей комнате?", imageUrl: "https://tse2.mm.bing.net/th?q=This%20is%20fine%20dog%20%D0%BC%D0%B5%D0%BC%20%D0%B2%20%D0%BE%D0%B3%D0%BD%D0%B5&w=640&h=420&c=7", options: ["This is fine", "Doggo", "Снупи", "Плуто"], correctIndex: 0 }
    ],
    funny_animals: [
      { id: "anim1", text: "Что это за птица, которая всегда выглядит удивленной?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%A1%D0%BE%D0%B2%D0%B0%20%D1%81%20%D0%B1%D0%BE%D0%BB%D1%8C%D1%88%D0%B8%D0%BC%D0%B8%20%D0%B3%D0%BB%D0%B0%D0%B7%D0%B0%D0%BC%D0%B8%20%D1%81%D0%BC%D0%B5%D1%88%D0%BD%D0%B0%D1%8F&w=640&h=420&c=7", options: ["Сова", "Голубь", "Страус", "Пингвин"], correctIndex: 0 },
      { id: "anim2", text: "Какой зверь обожает расслабляться в горячих источниках?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9A%D0%B0%D0%BF%D0%B8%D0%B1%D0%B0%D1%80%D0%B0%20%D0%B2%20%D0%B3%D0%BE%D1%80%D1%8F%D1%87%D0%B5%D0%BC%20%D0%B8%D1%81%D1%82%D0%BE%D1%87%D0%BD%D0%B8%D0%BA%D0%B5%20%D1%81%20%D0%BC%D0%B0%D0%BD%D0%B4%D0%B0%D1%80%D0%B8%D0%BD%D0%BE%D0%BC&w=640&h=420&c=7", options: ["Капибара", "Бобр", "Выдра", "Хомяк"], correctIndex: 0 },
      { id: "anim3", text: "Кто этот мастер медлительности на дереве?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9B%D0%B5%D0%BD%D0%B8%D0%B2%D0%B5%D1%86%20%D1%81%D0%BC%D0%B5%D1%88%D0%BD%D0%BE%D0%B9%20%D0%BD%D0%B0%20%D0%B4%D0%B5%D1%80%D0%B5%D0%B2%D0%B5&w=640&h=420&c=7", options: ["Панда", "Ленивец", "Коала", "Опоссум"], correctIndex: 1 },
      { id: "anim4", text: "Какая птица не умеет летать, но отлично плавает во фраке?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9F%D0%B8%D0%BD%D0%B3%D0%B2%D0%B8%D0%BD%20%D0%BD%D0%B0%20%D0%BB%D1%8C%D0%B4%D0%B8%D0%BD%D0%B5%20%D1%81%D0%BC%D0%B5%D1%88%D0%BD%D0%BE%D0%B9&w=640&h=420&c=7", options: ["Чайка", "Пеликан", "Пингвин", "Дрофа"], correctIndex: 2 },
      { id: "anim5", text: "Кто этот зверёк, который вечно прячет орехи и всё забывает?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%91%D0%B5%D0%BB%D0%BA%D0%B0%20%D1%81%20%D0%BE%D1%80%D0%B5%D1%85%D0%BE%D0%BC%20%D1%81%D0%BC%D0%B5%D1%88%D0%BD%D0%B0%D1%8F&w=640&h=420&c=7", options: ["Бурундук", "Белка", "Суслик", "Крот"], correctIndex: 1 },
      { id: "anim6", text: "Какое сумчатое животное из Австралии всегда выглядит счастливым?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9A%D0%B2%D0%BE%D0%BA%D0%BA%D0%B0%20%D1%83%D0%BB%D1%8B%D0%B1%D0%B0%D0%B5%D1%82%D1%81%D1%8F%20%D1%81%D0%B5%D0%BB%D1%84%D0%B8&w=640&h=420&c=7", options: ["Квокка", "Кенгуру", "Вомбат", "Тасманский дьявол"], correctIndex: 0 },
      { id: "anim7", text: "Что за птица смотрит с подозрением и может больно клюнуть?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%93%D1%83%D1%81%D1%8C%20%D0%B0%D0%B3%D1%80%D0%B5%D1%81%D1%81%D0%B8%D0%B2%D0%BD%D1%8B%D0%B9%20%D0%BC%D0%B5%D0%BC&w=640&h=420&c=7", options: ["Гусь", "Утка", "Индюк", "Лебедь"], correctIndex: 0 },
      { id: "anim8", text: "Кто это существо с лапами и клювом, которое ставит биологов в тупик?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%A3%D1%82%D0%BA%D0%BE%D0%BD%D0%BE%D1%81%20%D0%B2%20%D0%B2%D0%BE%D0%B4%D0%B5%20%D1%84%D0%BE%D1%82%D0%BE&w=640&h=420&c=7", options: ["Ехидна", "Утконос", "Бобер", "Ондатра"], correctIndex: 1 }
    ],
    crazy_food: [
      { id: "food1", text: "Какой ингредиент в пицце вызывает больше всего споров в мире?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9F%D0%B8%D1%86%D1%86%D0%B0%20%D1%81%20%D0%B0%D0%BD%D0%B0%D0%BD%D0%B0%D1%81%D0%B0%D0%BC%D0%B8%20%D0%93%D0%B0%D0%B2%D0%B0%D0%B9%D1%81%D0%BA%D0%B0%D1%8F&w=640&h=420&c=7", options: ["Грибы", "Ананас", "Оливки", "Лук"], correctIndex: 1 },
      { id: "food2", text: "Какой тропический фрукт пахнет как мусор, но считается деликатесом?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%A4%D1%80%D1%83%D0%BA%D1%82%20%D0%94%D1%83%D1%80%D0%B8%D0%B0%D0%BD%20%D1%84%D0%BE%D1%82%D0%BE&w=640&h=420&c=7", options: ["Манго", "Дуриан", "Папайя", "Джекфрут"], correctIndex: 1 },
      { id: "food3", text: "Как называется суп из свеклы, за который спорят в интернете?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%91%D0%BE%D1%80%D1%89%20%D1%81%D0%BE%20%D1%81%D0%BC%D0%B5%D1%82%D0%B0%D0%BD%D0%BE%D0%B9%20%D0%B8%20%D0%BF%D0%B0%D0%BC%D0%BF%D1%83%D1%88%D0%BA%D0%B0%D0%BC%D0%B8&w=640&h=420&c=7", options: ["Борщ", "Гаспачо", "Солянка", "Том Ям"], correctIndex: 0 },
      { id: "food4", text: "Какой фастфуд состоит из двух булочек и сочной котлеты?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%91%D1%83%D1%80%D0%B3%D0%B5%D1%80%20%D1%87%D0%B8%D0%B7%D0%B1%D1%83%D1%80%D0%B3%D0%B5%D1%80%20%D0%B0%D0%BF%D0%BF%D0%B5%D1%82%D0%B8%D1%82%D0%BD%D1%8B%D0%B9&w=640&h=420&c=7", options: ["Шаурма", "Бургер", "Хот-дог", "Тако"], correctIndex: 1 },
      { id: "food5", text: "Что это за традиционное итальянское блюдо в форме длинных нитей?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%A1%D0%BF%D0%B0%D0%B3%D0%B5%D1%82%D1%82%D0%B8%20%D0%BF%D0%B0%D1%81%D1%82%D0%B0%20%D1%81%20%D1%82%D0%BE%D0%BC%D0%B0%D1%82%D0%BD%D1%8B%D0%BC%20%D1%81%D0%BE%D1%83%D1%81%D0%BE%D0%BC&w=640&h=420&c=7", options: ["Спагетти", "Ризотто", "Лазанья", "Равиоли"], correctIndex: 0 },
      { id: "food6", text: "Какая сладость круглая, с дыркой посередине и в яркой глазури?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9F%D0%BE%D0%BD%D1%87%D0%B8%D0%BA%20%D0%B4%D0%BE%D0%BD%D0%B0%D1%82%20%D1%81%20%D1%80%D0%BE%D0%B7%D0%BE%D0%B2%D0%BE%D0%B9%20%D0%B3%D0%BB%D0%B0%D0%B7%D1%83%D1%80%D1%8C%D1%8E&w=640&h=420&c=7", options: ["Круассан", "Пончик", "Эклер", "Маффин"], correctIndex: 1 },
      { id: "food7", text: "Какой соус на основе авокадо обожают в Мексике?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%93%D1%83%D0%B0%D0%BA%D0%B0%D0%BC%D0%BE%D0%BB%D0%B5%20%D1%81%20%D0%BD%D0%B0%D1%87%D0%BE%D1%81%20%D1%84%D0%BE%D1%82%D0%BE&w=640&h=420&c=7", options: ["Сальса", "Гуакамоле", "Песто", "Тартар"], correctIndex: 1 },
      { id: "food8", text: "Что это за десерт из замороженного молока и сливок?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9C%D0%BE%D1%80%D0%BE%D0%B6%D0%B5%D0%BD%D0%BE%D0%B5%20%D0%B2%20%D1%80%D0%BE%D0%B6%D0%BA%D0%B5%20%D1%8F%D1%80%D0%BA%D0%BE%D0%B5&w=640&h=420&c=7", options: ["Мороженое", "Желе", "Пудинг", "Суфле"], correctIndex: 0 }
    ],
    geek_humor: [
      { id: "geek1", text: "Как программисты называют не баг, а фичу?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9E%D1%88%D0%B8%D0%B1%D0%BA%D0%B0%20%D0%B2%20%D0%BA%D0%BE%D0%B4%D0%B5%20%D0%B1%D0%B0%D0%B3%20meme&w=640&h=420&c=7", options: ["Особенность архитектуры", "Случайность", "Секретный уровень", "Пасхалка"], correctIndex: 0 },
      { id: "geek2", text: "Какой синий экран пугает всех пользователей Windows?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%A1%D0%B8%D0%BD%D0%B8%D0%B9%20%D1%8D%D0%BA%D1%80%D0%B0%D0%BD%20%D1%81%D0%BC%D0%B5%D1%88%D0%BD%D0%BE%D0%B9%20BSOD%20Windows&w=640&h=420&c=7", options: ["Синий экран смерти", "Экран перезагрузки", "Окно биоса", "Панель задач"], correctIndex: 0 },
      { id: "geek3", text: "Что по легенде чинит любую технику у сисадмина?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9F%D0%B5%D1%80%D0%B5%D0%B7%D0%B0%D0%B3%D1%80%D1%83%D0%B7%D0%BA%D0%B0%20%D0%BA%D0%BE%D0%BC%D0%BF%D1%8C%D1%8E%D1%82%D0%B5%D1%80%D0%B0%20IT%20Crowd&w=640&h=420&c=7", options: ["Перезагрузка", "Удар кулаком", "Установка антивируса", "Замена монитора"], correctIndex: 0 },
      { id: "geek4", text: "Какой робот из 'Звездных войн' общается только писком и свистом?", imageUrl: "https://tse2.mm.bing.net/th?q=R2-D2%20Star%20Wars%20%D0%B4%D1%80%D0%BE%D0%B8%D0%B4&w=640&h=420&c=7", options: ["C-3PO", "R2-D2", "BB-8", "K-2SO"], correctIndex: 1 },
      { id: "geek5", text: "Какая клавиша спасает от отправки нежелательного окна?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9A%D0%BB%D0%B0%D0%B2%D0%B8%D1%88%D0%B0%20Escape%20Esc%20%D0%BA%D0%BB%D0%B0%D0%B2%D0%B8%D0%B0%D1%82%D1%83%D1%80%D0%B0&w=640&h=420&c=7", options: ["Enter", "Esc", "Shift", "Caps Lock"], correctIndex: 1 },
      { id: "geek6", text: "Кто создал операционную систему Linux с пингвином на логотипе?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9B%D0%B8%D0%BD%D1%83%D1%81%20%D0%A2%D0%BE%D1%80%D0%B2%D0%B0%D0%BB%D1%8C%D0%B4%D1%81%20Linus%20Torvalds&w=640&h=420&c=7", options: ["Линус Торвальдс", "Билл Гейтс", "Стив Возняк", "Тим Бернерс-Ли"], correctIndex: 0 },
      { id: "geek7", text: "В какой игре главный инструмент для всего — алмазная кирка?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9C%D0%B0%D0%B9%D0%BD%D0%BA%D1%80%D0%B0%D1%84%D1%82%20Minecraft%20%D0%B0%D0%BB%D0%BC%D0%B0%D0%B7%D0%BD%D0%B0%D1%8F%20%D0%BA%D0%B8%D1%80%D0%BA%D0%B0&w=640&h=420&c=7", options: ["Terraria", "Minecraft", "Roblox", "Rust"], correctIndex: 1 },
      { id: "geek8", text: "Как в двоичной системе счисления выглядит цифра 2?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%94%D0%B2%D0%BE%D0%B8%D1%87%D0%BD%D1%8B%D0%B9%20%D0%BA%D0%BE%D0%B4%2010%20%D0%BC%D0%B0%D1%82%D1%80%D0%B8%D1%86%D0%B0&w=640&h=420&c=7", options: ["01", "10", "11", "00"], correctIndex: 1 }
    ],
    epic_fails: [
      { id: "fail1", text: "Что обычно роняют на пол экраном вниз бутерброд и смартфон?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%A0%D0%B0%D0%B7%D0%B1%D0%B8%D1%82%D1%8B%D0%B9%20%D1%8D%D0%BA%D1%80%D0%B0%D0%BD%20%D1%81%D0%BC%D0%B0%D1%80%D1%82%D1%84%D0%BE%D0%BD%D0%B0%20%D1%82%D1%80%D0%B5%D1%89%D0%B8%D0%BD%D1%8B&w=640&h=420&c=7", options: ["Маслом вниз", "Законом подлости", "Экраном вверх", "В воду"], correctIndex: 0 },
      { id: "fail2", text: "Что приключилось с Пизанской башней, сделав её всемирно известной?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9F%D0%B8%D0%B7%D0%B0%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%20%D0%B1%D0%B0%D1%88%D0%BD%D1%8F%20%D0%BD%D0%B0%D0%BA%D0%BB%D0%BE%D0%BD&w=640&h=420&c=7", options: ["Она наклонилась", "Она утонула", "Ее покрасили не так", "Она треснула"], correctIndex: 0 },
      { id: "fail3", text: "Какой корабль считался непотопляемым, но столкнулся с айсбергом?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%A2%D0%B8%D1%82%D0%B0%D0%BD%D0%B8%D0%BA%20%D0%BA%D0%BE%D1%80%D0%B0%D0%B1%D0%BB%D1%8C%20%D0%B0%D0%B9%D1%81%D0%B1%D0%B5%D1%80%D0%B3&w=640&h=420&c=7", options: ["Британик", "Титаник", "Олимпик", "Аврора"], correctIndex: 1 },
      { id: "fail4", text: "Что забывают выключить перед выходом из дома тревожные люди?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%A3%D1%82%D1%8E%D0%B3%20%D0%B2%D0%BA%D0%BB%D1%8E%D1%87%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9%20%D0%B4%D0%BE%D0%BC%D0%B0%20%D0%BC%D0%B5%D0%BC&w=640&h=420&c=7", options: ["Утюг", "Будильник", "Фонарик", "Радио"], correctIndex: 0 },
      { id: "fail5", text: "Какой жест выражает высшую степень разочарования и стыда?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%A4%D0%B5%D0%B9%D1%81%D0%BF%D0%B0%D0%BB%D0%BC%20Facepalm%20%D1%80%D1%83%D0%BA%D0%B0%D0%BB%D0%B8%D1%86%D0%BE&w=640&h=420&c=7", options: ["Фейспалм (рукалицо)", "Палец вверх", "Дай пять", "Хлопок"], correctIndex: 0 },
      { id: "fail6", text: "Что происходит, если случайно отправить личное сообщение в рабочий чат?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%9F%D0%B0%D0%BD%D0%B8%D0%BA%D0%B0%20%D1%83%20%D0%BA%D0%BE%D0%BC%D0%BF%D1%8C%D1%8E%D1%82%D0%B5%D1%80%D0%B0%20%D1%81%D0%BC%D0%B5%D1%88%D0%BD%D0%BE&w=640&h=420&c=7", options: ["Испанский стыд", "Повышение", "Премия", "Аплодисменты"], correctIndex: 0 },
      { id: "fail7", text: "Что случается, если наступить на деталь конструктора LEGO босиком?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%94%D0%B5%D1%82%D0%B0%D0%BB%D1%8C%20LEGO%20%D0%BD%D0%B0%20%D0%BF%D0%BE%D0%BB%D1%83%20%D0%B1%D0%BE%D0%BB%D1%8C&w=640&h=420&c=7", options: ["Невыносимая боль", "Щекотка", "Приятный массаж", "Смех"], correctIndex: 0 },
      { id: "fail8", text: "Что обычно случается с тортом, который несут на день рождения в кино?", imageUrl: "https://tse2.mm.bing.net/th?q=%D0%A2%D0%BE%D1%80%D1%82%20%D0%B2%20%D0%BB%D0%B8%D1%86%D0%BE%20%D0%BF%D0%B0%D0%B4%D0%B5%D0%BD%D0%B8%D0%B5%20%D1%81%D0%BC%D0%B5%D1%88%D0%BD%D0%BE&w=640&h=420&c=7", options: ["Летит в лицо или на пол", "Его съедает кот", "Он взлетает", "Ничего"], correctIndex: 0 }
    ]
  },

  getCategories: function(count) {
    count = (count !== undefined && count !== null) ? count : 6;
    var shuffled = this.categories.slice().sort(function() { return 0.5 - Math.random(); });
    return shuffled.slice(0, count);
  },

  getQuestions: function(categoryId, count) {
    count = (count !== undefined && count !== null) ? count : 4;
    var list = this.items[categoryId] || this.items['cinema'] || [];
    var shuffled = list.slice().sort(function() { return 0.5 - Math.random(); });
    return shuffled.slice(0, count);
  }
};