// filename: app.js
/**
 * Party Board Quiz - Главный контроллер интерфейса (React)
 * Реализует TV-экран (хост) и Mobile-экран (геймпад),
 * QR-код генерацию, таймер 15 сек, показ селфи на ответах,
 * фуллскрин-поле с пошаговыми прыжками фишек и экран лидеров.
 */

const { useState, useEffect, useRef, useMemo } = React;

// Безопасное экранирование текста
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

// Компонент генерации QR-кода
function QRCodeDisplay({ url, size = 180 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !window.QRCode || !url) return;
    containerRef.current.innerHTML = '';
    try {
      new window.QRCode(containerRef.current, {
        text: url,
        width: size,
        height: size,
        colorDark: '#0a071b',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.M
      });
    } catch (err) {
      console.warn('QR Code generation error:', err);
    }
  }, [url, size]);

  return <div ref={containerRef} className="qr-image-wrapper" />;
}

// Главный компонент приложения
function App() {
  const [role, setRole] = useState(null); // 'tv' | 'mobile'
  const [roomId, setRoomId] = useState('');
  const [gameState, setGameState] = useState(null);
  
  // Локальные данные мобильного игрока
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerSelfie, setPlayerSelfie] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [joinError, setJoinError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Считывание URL параметров при монтировании
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const roleParam = params.get('role');

    if (roleParam === 'tv') {
      initTVMode(roomParam);
    } else if (roomParam) {
      // Прямой вход по QR-коду со смартфона
      setRole('mobile');
      setRoomId(roomParam.toUpperCase().trim());
      initPlayerSession();
    }
  }, []);

  const initPlayerSession = () => {
    let savedId = localStorage.getItem('pbq_player_id');
    if (!savedId) {
      savedId = 'p_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('pbq_player_id', savedId);
    }
    setPlayerId(savedId);
  };

  // Инициализация режима ТВ Хоста
  const initTVMode = async (existingCode) => {
    setRole('tv');
    const code = await window.GameSync.createRoom(existingCode);
    setRoomId(code);

    window.GameSync.init(code, null, (incomingState) => {
      setGameState(incomingState);
    });
  };

  // Режим ТВ: Старт новой комнаты
  const handleCreateRoom = async () => {
    await initTVMode();
  };

  // Подключение мобильного игрока
  const handleJoinMobile = async () => {
    if (!playerName.trim()) {
      setJoinError('Введите ваше имя');
      return;
    }
    if (!playerSelfie) {
      setJoinError('Сделайте селфи перед входом');
      return;
    }
    if (!roomId.trim()) {
      setJoinError('Введите код комнаты');
      return;
    }

    const code = roomId.toUpperCase().trim();
    initPlayerSession();
    const pid = playerId || ('p_' + Math.random().toString(36).substring(2, 9));
    setPlayerId(pid);

    window.GameSync.init(code, null, (incomingState) => {
      setGameState(incomingState);
    });

    const success = await window.GameSync.joinRoom(code, {
      id: pid,
      name: playerName.trim(),
      selfie: playerSelfie,
      score: 0,
      position: 0
    });

    if (success) {
      setJoinError('');
    } else {
      setJoinError('Не удалось подключиться к комнате');
    }
  };

  // Управление камерой для селфи
  const startCamera = async () => {
    setCameraActive(true);
    setJoinError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Ошибка доступа к камере:', err);
      setJoinError('Не удалось включить камеру. Разрешите доступ.');
      setCameraActive(false);
    }
  };

  const handleTakeSelfie = async () => {
    if (!videoRef.current) return;
    try {
      const base64 = await window.captureSelfie(videoRef.current);
      setPlayerSelfie(base64);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
    } catch (e) {
      console.warn('Ошибка захвата селфи:', e);
    }
  };

  // Сброс и остановка потоков при размонтировании
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      window.GameSync.cleanup();
    };
  }, []);

  // Выбор роли на стартовом экране
  if (!role) {
    return (
      <div className="app-bg">
        <div className="tv-container">
          <div className="glass-card" style={{ padding: '40px', textAlign: 'center', maxWidth: '520px', width: '100%' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '12px', fontWeight: '900' }}>Party Board Quiz</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: '32px' }}>Выберите тип устройства для запуска</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button className="primary-btn" onClick={handleCreateRoom}>
                📺 Большой экран (ТВ Хост)
              </button>
              <button className="primary-btn" style={{ background: 'linear-gradient(135deg, #00f0ff, #0077b6)' }} onClick={() => { setRole('mobile'); initPlayerSession(); }}>
                📱 Игрок (Мобильный)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-bg">
      {role === 'tv' ? (
        <TVHostScreen 
          roomId={roomId} 
          gameState={gameState} 
        />
      ) : (
        <MobileController 
          roomId={roomId}
          setRoomId={setRoomId}
          playerId={playerId}
          playerName={playerName}
          setPlayerName={setPlayerName}
          playerSelfie={playerSelfie}
          cameraActive={cameraActive}
          startCamera={startCamera}
          handleTakeSelfie={handleTakeSelfie}
          videoRef={videoRef}
          joinError={joinError}
          handleJoinMobile={handleJoinMobile}
          gameState={gameState}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// TV HOST CONTROLLER: ВСЯ РЕЖИССУРА ИГРЫ
// -------------------------------------------------------------
function TVHostScreen({ roomId, gameState }) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [categoryQuestions, setCategoryQuestions] = useState([]);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [timer, setTimer] = useState(15);
  const [jumpingPawnId, setJumpingPawnId] = useState(null);

  const players = gameState?.players || {};
  const playerList = Object.entries(players).map(([id, p]) => ({ id, ...p }));
  const status = gameState?.status || 'lobby';

  // Формирование ссылки для подключения через QR-код
  const joinUrl = useMemo(() => {
    if (!roomId) return '';
    const origin = window.location.origin;
    const path = window.location.pathname.replace(/\/+$/, '');
    return `${origin}${path}/?room=${roomId}`;
  }, [roomId]);

  // Старт викторины
  const handleStartGame = () => {
    const cats = Object.keys(window.QuestionBank || {});
    const randomCat = cats[Math.floor(Math.random() * cats.length)] || 'Кино и сериалы';
    setActiveCategory(randomCat);
    const qs = (window.QuestionBank && window.QuestionBank[randomCat]) || [];
    setCategoryQuestions(qs.slice(0, 4)); // 4 вопроса в раунде
    setQuestionIdx(0);

    // Сброс ответов и переход к вопросу
    window.GameSync.updateGameState(roomId, {
      status: 'question',
      category: randomCat,
      currentQuestionIndex: 0,
      timer: 15
    });
  };

  // Таймер вопроса на стороне ТВ (15 секунд)
  useEffect(() => {
    let interval = null;
    if (status === 'question') {
      setTimer(15);
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleTimesUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, questionIdx]);

  // Окончание времени: подсветка ответа и начисление очков
  const handleTimesUp = () => {
    const currentQ = categoryQuestions[questionIdx];
    if (!currentQ) return;

    const correctOptionIndex = currentQ.correct;
    const optionLetter = ['A', 'B', 'C', 'D'][correctOptionIndex];

    // Начисление очков
    const updatedPlayers = { ...(gameState?.players || {}) };
    for (const pid in updatedPlayers) {
      if (updatedPlayers[pid].currentAnswer === optionLetter) {
        updatedPlayers[pid].score = (updatedPlayers[pid].score || 0) + 1;
      }
    }

    window.GameSync.updateGameState(roomId, {
      status: 'show_correct',
      correctOption: optionLetter,
      players: updatedPlayers
    });

    // Пауза 4 секунды на показ правильного ответа
    setTimeout(() => {
      const nextIndex = questionIdx + 1;
      if (nextIndex < categoryQuestions.length && nextIndex < 4) {
        setQuestionIdx(nextIndex);
        window.GameSync.updateGameState(roomId, {
          status: 'question',
          currentQuestionIndex: nextIndex,
          timer: 15
        });
      } else {
        // Категория завершена -> Переход на поле
        handleCategoryFinished(updatedPlayers);
      }
    }, 4000);
  };

  // Переход на фуллскрин-поле и анимация движения
  const handleCategoryFinished = async (currentPlayers) => {
    // Рассчитываем прыжки: перемещение вперед на количество правильных ответов
    const playersToUpdate = { ...currentPlayers };
    for (const pid in playersToUpdate) {
      const currentPos = playersToUpdate[pid].position || 0;
      const targetPos = Math.min(24, currentPos + (playersToUpdate[pid].score || 0));
      playersToUpdate[pid].position = targetPos;
    }

    // 1. Отображаем поле
    window.GameSync.updateGameState(roomId, {
      status: 'board_movement',
      players: playersToUpdate
    });

    // 2. Включаем класс прыжков pawns
    setJumpingPawnId('all');
    setTimeout(() => {
      setJumpingPawnId(null);
    }, 2500);

    // 3. Через 5 секунд переводим в лидерборд
    setTimeout(() => {
      window.GameSync.updateGameState(roomId, {
        status: 'leaderboard'
      });
    }, 5500);
  };

  // --- ЭКРАН 1: ЛОББИ ---
  if (status === 'lobby') {
    return (
      <div className="tv-container">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '2px' }}>
            КОД КОМНАТЫ: <span style={{ color: 'var(--cyan-neon)', textShadow: '0 0 20px var(--cyan-glow)' }}>{roomId}</span>
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '1.2rem', marginTop: '8px' }}>
            Отсканируйте QR-код камерой телефона, чтобы присоединиться к игре
          </p>
        </div>

        <div style={{ display: 'flex', gap: '48px', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '1000px' }}>
          <div className="qr-container glass-card">
            <QRCodeDisplay url={joinUrl} size={220} />
            <div className="qr-label">Вход по QR</div>
          </div>

          <div className="glass-card" style={{ flex: 1, padding: '24px', minHeight: '320px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Игроки в комнате:</span>
              <span style={{ color: 'var(--cyan-neon)' }}>{playerList.length}</span>
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px', flex: 1, overflowY: 'auto' }}>
              {playerList.map(p => (
                <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '50%', 
                    border: '3px solid var(--accent-color)', 
                    backgroundImage: `url(${p.selfie || ''})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                  }} />
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', textAlign: 'center' }}>{sanitizeText(p.name)}</span>
                </div>
              ))}
              {playerList.length === 0 && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                  Ожидание подключения игроков...
                </div>
              )}
            </div>

            {playerList.length > 0 && (
              <button className="primary-btn" style={{ marginTop: '20px' }} onClick={handleStartGame}>
                Начать игру ({playerList.length})
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- ЭКРАН 2: ВОПРОС / ПОКАЗ ПРАВИЛЬНОГО ---
  if (status === 'question' || status === 'show_correct') {
    const currentQ = categoryQuestions[questionIdx] || { q: '', options: [], correct: 0 };
    const letters = ['A', 'B', 'C', 'D'];
    const correctLetter = letters[currentQ.correct];

    // Группировка селфи игроков по их выбору (A, B, C, D)
    const answersGrouped = { A: [], B: [], C: [], D: [] };
    playerList.forEach(p => {
      if (p.currentAnswer && answersGrouped[p.currentAnswer]) {
        answersGrouped[p.currentAnswer].push(p);
      }
    });

    return (
      <div className="tv-container" style={{ justifyContent: 'space-between', padding: '40px 60px' }}>
        {/* Верхняя панель: категория, номер вопроса и таймер */}
        <div style={{ width: '100%', maxWidth: '1100px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: 'var(--cyan-neon)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
              {activeCategory} • Вопрос {questionIdx + 1} из 4
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: timer <= 5 ? 'var(--color-wrong)' : '#fff' }}>
              ⏳ {timer} сек
            </span>
          </div>

          <div className="timer-bar">
            <div 
              className="timer-bar-fill" 
              style={{ 
                width: `${(timer / 15) * 100}%`,
                background: timer <= 5 ? 'var(--color-wrong)' : 'linear-gradient(90deg, var(--cyan-neon), var(--accent-color))'
              }} 
            />
          </div>
        </div>

        {/* Карточка вопроса */}
        <div className="glass-card" style={{ width: '100%', maxWidth: '1100px', padding: '36px', textAlign: 'center', margin: 'auto 0' }}>
          <h2 style={{ fontSize: '2.1rem', fontWeight: 800, lineHeight: 1.3 }}>
            {currentQ.q}
          </h2>
        </div>

        {/* Сетка 4 вариантов ответа с селфи игроков */}
        <div className="quiz-grid" style={{ maxWidth: '1100px' }}>
          {currentQ.options.map((opt, idx) => {
            const letter = letters[idx];
            const isCorrect = status === 'show_correct' && letter === correctLetter;
            const isWrong = status === 'show_correct' && letter !== correctLetter;
            const chosenPlayers = answersGrouped[letter] || [];

            let btnClass = `quiz-btn quiz-btn-${letter.toLowerCase()}`;
            if (isCorrect) btnClass += ' quiz-btn-correct';
            if (isWrong) btnClass += ' quiz-btn-wrong';

            return (
              <div key={letter} className={btnClass}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, overflow: 'hidden' }}>
                  <span style={{ 
                    background: 'rgba(0,0,0,0.3)', 
                    padding: '6px 12px', 
                    borderRadius: '8px', 
                    fontWeight: 900 
                  }}>
                    {letter}
                  </span>
                  <span style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{opt}</span>
                </div>

                {/* Селфи игроков, выбравших этот вариант */}
                <div className="answer-players-container">
                  {chosenPlayers.map(p => (
                    <div 
                      key={p.id} 
                      className="answer-player-icon" 
                      style={{ backgroundImage: `url(${p.selfie})` }}
                      title={sanitizeText(p.name)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- ЭКРАН 3: ФУЛЛСКРИН ПОЛЕ С АНИМАЦИЕЙ ПРЫЖКОВ ---
  if (status === 'board_movement') {
    return (
      <div className="board-fullscreen">
        <div style={{ position: 'absolute', top: '16px', zIndex: 30, textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', textShadow: '0 0 10px rgba(0,0,0,0.8)' }}>
            Игроки передвигаются по полю!
          </h2>
        </div>

        <div className="board-grid">
          {Array.from({ length: 25 }).map((_, cellIdx) => {
            let cellClass = 'board-cell';
            if (cellIdx === 0) cellClass += ' board-cell-start';
            if (cellIdx === 24) cellClass += ' board-cell-finish';

            // Находим игроков на данной клетке
            const playersOnCell = playerList.filter(p => (p.position || 0) === cellIdx);

            return (
              <div key={cellIdx} className={cellClass} data-index={cellIdx + 1}>
                {playersOnCell.map((p, pIdx) => (
                  <div 
                    key={p.id} 
                    className={`pawn-wrapper ${jumpingPawnId ? 'pawn-jumping' : ''}`}
                    style={{
                      left: `${15 + pIdx * 18}px`,
                      bottom: '8px'
                    }}
                  >
                    <div 
                      className="pawn-selfie-head" 
                      style={{ backgroundImage: `url(${p.selfie})` }}
                    />
                    <div className="pawn-body" />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- ЭКРАН 4: ЛИДЕРБОРД ---
  if (status === 'leaderboard') {
    const sortedPlayers = [...playerList].sort((a, b) => (b.score || 0) - (a.score || 0));

    return (
      <div className="tv-container">
        <div className="leaderboard-screen glass-card" style={{ padding: '36px' }}>
          <div className="leaderboard-title">Таблица лидеров</div>

          {sortedPlayers.map((p, index) => {
            const rank = index + 1;
            let rankSymbol = `#${rank}`;
            if (rank === 1) rankSymbol = '🥇 1';
            if (rank === 2) rankSymbol = '🥈 2';
            if (rank === 3) rankSymbol = '🥉 3';

            return (
              <div key={p.id} className="leaderboard-item">
                <div className="leaderboard-rank">{rankSymbol}</div>
                <div className="leaderboard-player-info">
                  <div 
                    className="leaderboard-selfie" 
                    style={{ backgroundImage: `url(${p.selfie})` }} 
                  />
                  <div className="leaderboard-name">{sanitizeText(p.name)}</div>
                </div>
                <div className="leaderboard-score">{p.score || 0} очк.</div>
              </div>
            );
          })}

          <div style={{ marginTop: '24px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button className="primary-btn" onClick={handleStartGame}>
              Следующий раунд
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// -------------------------------------------------------------
// MOBILE CONTROLLER: ГЕЙМПАД ИГРОКА
// -------------------------------------------------------------
function MobileController({
  roomId,
  setRoomId,
  playerId,
  playerName,
  setPlayerName,
  playerSelfie,
  cameraActive,
  startCamera,
  handleTakeSelfie,
  videoRef,
  joinError,
  handleJoinMobile,
  gameState
}) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const status = gameState?.status || 'lobby';
  const isJoined = Boolean(gameState?.players && gameState.players[playerId]);

  // Сброс выбранного ответа при смене вопроса
  useEffect(() => {
    setSelectedAnswer(null);
  }, [gameState?.currentQuestionIndex, status]);

  const onAnswer = (letter) => {
    if (status !== 'question') return;
    setSelectedAnswer(letter);
    window.GameSync.updatePlayerAnswer(roomId, playerId, letter);
  };

  // ЭКРАН ВХОДА (Имя, Селфи, Комната)
  if (!isJoined) {
    return (
      <div className="mobile-container" style={{ justifyContent: 'center' }}>
        <div className="glass-card" style={{ padding: '24px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '16px', fontWeight: 800 }}>Вход в игру</h2>

          {/* Селфи аватар / окно камеры */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
            {cameraActive ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  style={{ width: '160px', height: '160px', borderRadius: '50%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
                />
                <button type="button" className="primary-btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={handleTakeSelfie}>
                  📸 Сфотографировать
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  width: '120px', 
                  height: '120px', 
                  borderRadius: '50%', 
                  border: '3px solid var(--accent-color)',
                  backgroundImage: playerSelfie ? `url(${playerSelfie})` : 'none',
                  backgroundColor: '#1f1642',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {!playerSelfie && <span style={{ fontSize: '2.5rem' }}>🤳</span>}
                </div>
                <button type="button" className="primary-btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={startCamera}>
                  {playerSelfie ? 'Переснять селфи' : 'Сделать селфи'}
                </button>
              </div>
            )}
          </div>

          {/* Поля ввода */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Ваше имя:</label>
              <input 
                type="text" 
                value={playerName} 
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Иван"
                maxLength={16}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  fontSize: '1.1rem',
                  marginTop: '4px'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Код комнаты:</label>
              <input 
                type="text" 
                value={roomId} 
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="ABCD"
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'var(--cyan-neon)',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  letterSpacing: '2px',
                  textAlign: 'center',
                  marginTop: '4px'
                }}
              />
            </div>

            {joinError && (
              <div style={{ color: 'var(--color-wrong)', fontSize: '0.85rem', textAlign: 'center' }}>
                {joinError}
              </div>
            )}

            <button className="primary-btn" style={{ marginTop: '10px' }} onClick={handleJoinMobile}>
              Присоединиться к игре
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ЭКРАН 1: В ЛОББИ ПОСЛЕ ВХОДА
  if (status === 'lobby') {
    return (
      <div className="mobile-container" style={{ justifyContent: 'center', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            border: '3px solid var(--cyan-neon)', 
            backgroundImage: `url(${playerSelfie})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            margin: '0 auto 16px auto'
          }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Вы в игре, {sanitizeText(playerName)}!</h2>
          <p style={{ color: 'var(--text-dim)', marginTop: '8px' }}>
            Смотрите на экран телевизора. Ведущий скоро запустит игру...
          </p>
        </div>
      </div>
    );
  }

  // ЭКРАН 2: ВЫБОР ОТВЕТОВ НА СМАРТФОНЕ (A, B, C, D)
  if (status === 'question') {
    const letters = ['A', 'B', 'C', 'D'];

    return (
      <div className="mobile-container" style={{ justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center', paddingTop: '10px' }}>
          <span style={{ color: 'var(--cyan-neon)', fontWeight: 800, textTransform: 'uppercase' }}>
            Выберите вариант на ТВ
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: 'auto 0', height: '65vh' }}>
          {letters.map((letter) => {
            const isSelected = selectedAnswer === letter;
            let btnClass = `quiz-btn quiz-btn-${letter.toLowerCase()}`;
            if (isSelected) btnClass += ' quiz-btn-selected';

            return (
              <button
                key={letter}
                className={btnClass}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3rem',
                  fontWeight: 900,
                  height: '100%'
                }}
                onClick={() => onAnswer(letter)}
              >
                {letter}
              </button>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', paddingBottom: '16px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
          {selectedAnswer ? `Ваш выбор: ${selectedAnswer}` : 'Нажмите кнопку с нужной буквой'}
        </div>
      </div>
    );
  }

  // ЭКРАНЫ: ПОКАЗ ОТВЕТА / ПОЛЕ / ЛИДЕРБОРД
  return (
    <div className="mobile-container" style={{ justifyContent: 'center', textAlign: 'center' }}>
      <div className="glass-card" style={{ padding: '32px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👀</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Смотрите на общий экран!</h2>
        <p style={{ color: 'var(--text-dim)', marginTop: '8px' }}>
          {status === 'show_correct' && 'Подводим итоги вопроса...'}
          {status === 'board_movement' && 'Игроки прыгают по клеткам поля!'}
          {status === 'leaderboard' && 'Определение победителей раунда!'}
        </p>
      </div>
    </div>
  );
}

// Монтирование приложения
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
}