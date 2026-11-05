// filename: app.js
/**
 * Frontend App Module - Party Quiz Board Game
 * Toon Edition с поддержкой картинок в вопросах, адаптивностью под мобильные экраны,
 * автосозданием комнаты через 15 сек, QR-кодом и bobblehead-фигурками игроков.
 */

const { useState, useEffect, useRef, useCallback } = React;

const DEFAULT_DB_URL = 'https://quiz-c032b-default-rtdb.europe-west1.firebasedatabase.app';

const PLAYER_COLORS = [
  '#ff3b69', '#ffb703', '#00c8ff', '#2ecc71',
  '#9d4edd', '#ff9100', '#00f0ff', '#ff007f'
];

const EMOJI_AVATARS = ['😎', '🤪', '🤡', '👽', '🤖', '😺', '🤠', '🦊'];

function sanitizeString(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return m;
    }
  });
}

function PlayerPawn({ player, isWalking, colorIndex = 0 }) {
  const pawnColor = player.color || PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  const safeName = sanitizeString(player.name || 'Игрок');
  const avatarSrc = player.selfieBase64 || player.selfie || '';

  return (
    <div
      className={`pawn-wrapper ${isWalking ? 'pawn-walking' : ''}`}
      style={{ '--player-color': pawnColor }}
      title={`${safeName} (${player.score || 0} очков)`}
    >
      <div className="pawn-selfie-head" style={{ borderColor: pawnColor }}>
        {avatarSrc && avatarSrc.startsWith('data:') ? (
          <img src={avatarSrc} alt={safeName} />
        ) : (
          <span>{avatarSrc || safeName.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="pawn-body" style={{ backgroundColor: pawnColor }}></div>
    </div>
  );
}

function App() {
  // 'tv' | 'mobile_setup' | 'mobile' | null
  const [role, setRole] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [dbUrl, setDbUrl] = useState(localStorage.getItem('partyquiz_dburl') || DEFAULT_DB_URL);
  const [playerId, setPlayerId] = useState(localStorage.getItem('partyquiz_player_id') || '');
  const [playerName, setPlayerName] = useState('');
  const [playerSelfie, setPlayerSelfie] = useState('');
  const [playerColor, setPlayerColor] = useState(PLAYER_COLORS[0]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);

  // Таймер автосоздания комнаты на стартовом экране (15 секунд)
  const [autoHostTimer, setAutoHostTimer] = useState(15);
  const [isEnteringRoom, setIsEnteringRoom] = useState(false);

  const [gameState, setGameState] = useState({
    status: 'lobby',
    players: {},
    currentRound: null
  });

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [movingPlayerId, setMovingPlayerId] = useState(null);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const qrRef = useRef(null);

  const baseUrl = window.location.origin + window.location.pathname;
  const joinUrl = `${baseUrl}?role=mobile&room=${roomCode}${dbUrl ? `&db=${encodeURIComponent(dbUrl)}` : ''}`;

  // Хост создает комнату (ТВ)
  const createHostRoom = useCallback(() => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const initialState = {
      status: 'lobby',
      players: {},
      currentRound: null
    };
    const activeDb = dbUrl || DEFAULT_DB_URL;
    localStorage.setItem('partyquiz_dburl', activeDb);
    setRoomCode(code);
    setRole('tv');
    window.GameSync.init(code, activeDb, (st) => {
      if (st && typeof st === 'object') setGameState(st);
    });
    window.GameSync.updateState(initialState);
  }, [dbUrl]);

  // Определение параметров из URL (?role=tv&room=ABCD или ?role=mobile&room=ABCD)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const roleParam = params.get('role');
    const dbParam = params.get('db');

    if (dbParam) {
      setDbUrl(dbParam);
      localStorage.setItem('partyquiz_dburl', dbParam);
    }

    if (roomParam) {
      const cleanRoom = roomParam.trim().toUpperCase();
      setRoomCode(cleanRoom);
      if (roleParam === 'tv' || roleParam === 'host') {
        setRole('tv');
      } else {
        // Если перешли по QR-коду или ссылке с комнатой — сразу открываем настройку игрока!
        setRole('mobile_setup');
      }
    }
  }, []);

  // Автоматическое нажатие кнопки "Создать комнату" через 15 секунд на главном экране
  useEffect(() => {
    // Если роль уже выбрана или пользователь начал вводить код комнаты вручную — останавливаем автостарт
    if (role !== null || isEnteringRoom || roomCode.trim().length > 0) return;

    if (autoHostTimer <= 0) {
      createHostRoom();
      return;
    }

    const timerId = setTimeout(() => {
      setAutoHostTimer((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timerId);
  }, [role, isEnteringRoom, roomCode, autoHostTimer, createHostRoom]);

  // Инициализация синхронизации при наличии кода комнаты
  useEffect(() => {
    if (!roomCode || !role) return;

    const activeDb = dbUrl || DEFAULT_DB_URL;
    window.GameSync.init(roomCode, activeDb, (incomingState) => {
      if (incomingState && typeof incomingState === 'object') {
        if (incomingState._action === 'patchPlayer') {
          setGameState((prev) => ({
            ...prev,
            players: {
              ...(prev.players || {}),
              [incomingState.playerId]: {
                ...((prev.players || {})[incomingState.playerId] || {}),
                ...incomingState.playerData
              }
            }
          }));
        } else {
          setGameState((prev) => ({
            ...prev,
            ...incomingState,
            players: {
              ...(prev.players || {}),
              ...(incomingState.players || {})
            }
          }));
        }
      }
    });

    return () => {
      window.GameSync.cleanup();
    };
  }, [roomCode, dbUrl, role]);

  // Отрисовка QR-кода в лобби на экране ТВ (с автоматической подгрузкой библиотеки QRCode при необходимости)
  useEffect(() => {
    if (role !== 'tv' || gameState.status !== 'lobby' || !roomCode || !qrRef.current) return;

    const renderQr = () => {
      if (!qrRef.current || !window.QRCode) return;
      qrRef.current.innerHTML = '';
      try {
        new window.QRCode(qrRef.current, {
          text: joinUrl,
          width: 210,
          height: 210,
          colorDark: '#140d21',
          colorLight: '#ffffff',
          correctLevel: window.QRCode.CorrectLevel.H
        });
      } catch (e) {
        console.error('Ошибка генерации QR-кода:', e);
      }
    };

    if (window.QRCode) {
      renderQr();
    } else {
      let script = document.getElementById('qrcode-cdn-script');
      if (!script) {
        script = document.createElement('script');
        script.id = 'qrcode-cdn-script';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        script.onload = renderQr;
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', renderQr);
      }
    }
  }, [role, gameState.status, roomCode, joinUrl]);

  // Сброс выбранного ответа при смене вопроса
  useEffect(() => {
    setSelectedAnswer(null);
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  }, [gameState.currentRound?.currentQuestionIndex, gameState.status]);

  // Запуск камеры
  const openCamera = async () => {
    setIsCameraOpen(true);
    setCameraLoading(true);

    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 480 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.warn('Камера недоступна или отклонена:', err);
      alert('Камера недоступна. Выберите мультяшный эмодзи ниже!');
      setIsCameraOpen(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const closeCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const takeSelfie = async () => {
    if (!videoRef.current) return;
    try {
      const base64 = await window.captureSelfie(videoRef.current);
      if (base64) {
        setPlayerSelfie(base64);
      }
    } catch (e) {
      console.error('Ошибка создания селфи:', e);
    } finally {
      closeCamera();
    }
  };

  // Шаг 1 для игрока на главном экране: ввод кода комнаты и переход к созданию персонажа
  const proceedToPlayerSetup = () => {
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) {
      const prompted = prompt('Введите 4-значный код комнаты с экрана ТВ:');
      if (!prompted || !prompted.trim()) return;
      setRoomCode(prompted.trim().toUpperCase());
    } else {
      setRoomCode(cleanCode);
    }
    setRole('mobile_setup');
  };

  // Шаг 2 для игрока: сохранение имени/селфи и вход в комнату
  const joinRoomAsPlayer = () => {
    if (!roomCode || !playerName.trim()) {
      alert('Введите ваше имя!');
      return;
    }
    if (!playerSelfie) {
      alert('Сделайте селфи или выберите эмодзи!');
      return;
    }

    const newPlayerId = playerId || ('p_' + Math.random().toString(36).substring(2, 9));
    setPlayerId(newPlayerId);
    localStorage.setItem('partyquiz_player_id', newPlayerId);

    const playerData = {
      id: newPlayerId,
      name: playerName.trim().slice(0, 14),
      color: playerColor,
      selfieBase64: playerSelfie,
      score: 0,
      boardPosition: 0,
      isConnected: true
    };

    window.GameSync.patchPlayer(roomCode, newPlayerId, playerData);
    setRole('mobile');
  };

  // ТВ начинает раунд игры
  const startCategoryVote = () => {
    const randomCategories = window.QuestionBank?.getCategories
      ? window.QuestionBank.getCategories(3)
      : [
          { id: 'cinema', name: 'Кино', icon: '🎬' },
          { id: 'games', name: 'Игры', icon: '🎮' },
          { id: 'music', name: 'Музыка', icon: '🎵' }
        ];
    const updated = {
      ...gameState,
      status: 'category_vote',
      voteCategories: randomCategories,
      votes: {}
    };
    window.GameSync.updateState(updated);
  };

  // Выбор категории и переход к викторине
  const startQuizForCategory = (catId) => {
    const questions = window.QuestionBank?.getQuestions
      ? window.QuestionBank.getQuestions(catId, 4)
      : [];
    const updated = {
      ...gameState,
      status: 'quiz',
      currentRound: {
        categoryId: catId,
        questions,
        currentQuestionIndex: 0,
        answers: {}
      }
    };
    window.GameSync.updateState(updated);
  };

  // Ответ игрока на мобилке
  const handleAnswerSubmit = (index, e) => {
    if (e && e.currentTarget) e.currentTarget.blur();
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);

    const updatedAnswers = {
      ...(gameState.currentRound?.answers || {}),
      [playerId]: index
    };

    const updated = {
      ...gameState,
      currentRound: {
        ...gameState.currentRound,
        answers: updatedAnswers
      }
    };
    window.GameSync.updateState(updated);
  };

  // Переход к следующему вопросу или движение по доске
  const advanceQuiz = () => {
    const round = gameState.currentRound;
    if (!round) return;

    const currentQ = round.questions[round.currentQuestionIndex];
    const correctIdx = currentQ.correctIndex ?? currentQ.correct ?? 0;

    // Начисление очков и перемещение фишек (сохраняем предыдущие позиции!)
    const updatedPlayers = JSON.parse(JSON.stringify(gameState.players || {}));
    Object.entries(round.answers || {}).forEach(([pId, ansIdx]) => {
      if (ansIdx === correctIdx && updatedPlayers[pId]) {
        updatedPlayers[pId].score = (updatedPlayers[pId].score || 0) + 1;
        updatedPlayers[pId].boardPosition = Math.min(24, (updatedPlayers[pId].boardPosition || 0) + 1);
        setMovingPlayerId(pId);
      }
    });

    if (round.currentQuestionIndex + 1 < round.questions.length) {
      const nextRoundState = {
        ...gameState,
        players: updatedPlayers,
        currentRound: {
          ...round,
          currentQuestionIndex: round.currentQuestionIndex + 1,
          answers: {}
        }
      };
      window.GameSync.updateState(nextRoundState);
      setSelectedAnswer(null);
    } else {
      // Раунд закончен, переходим к отображению доски и мест
      const finishRoundState = {
        ...gameState,
        players: updatedPlayers,
        status: 'board_update'
      };
      window.GameSync.updateState(finishRoundState);
    }
  };

  // ============================================================================
  // 1. ГЛАВНЫЙ ЭКРАН: ТОЛЬКО "СОЗДАТЬ КОМНАТУ (АВТОСТАРТ 15 С)" И "ЗАЙТИ В КОМНАТУ"
  // ============================================================================
  if (!role) {
    return (
      <div className="app-bg">
        <div className="glass-card" style={{ maxWidth: 440, width: '92%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.4rem', marginBottom: 8 }}>PARTY TOON QUIZ</h1>
          <p style={{ marginBottom: 22, opacity: 0.9 }}>
            Веселая мультяшная настольная игра для компании!
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Кнопка создания комнаты с автонажатием через 15 секунд */}
            <button className="primary-btn" onClick={createHostRoom} style={{ width: '100%' }}>
              📺 Создать комнату {!isEnteringRoom && !roomCode ? `(${autoHostTimer} сек)` : '(ТВ)'}
            </button>

            <div style={{ margin: '10px 0 4px 0', borderTop: '3px dashed rgba(255,255,255,0.25)' }}></div>

            {/* Ввод кода комнаты и кнопка входа в комнату */}
            <input
              type="text"
              placeholder="КОД КОМНАТЫ (4 БУКВЫ)"
              maxLength={6}
              value={roomCode}
              onFocus={() => setIsEnteringRoom(true)}
              onChange={(e) => {
                setIsEnteringRoom(true);
                setRoomCode(e.target.value.toUpperCase());
              }}
              style={{
                padding: '14px',
                fontSize: '1.25rem',
                fontWeight: 800,
                textAlign: 'center',
                borderRadius: 14,
                border: '3px solid #140d21',
                color: '#140d21',
                backgroundColor: '#ffffff'
              }}
            />

            <button
              className="primary-btn"
              style={{ background: '#00c8ff', color: '#140d21' }}
              onClick={proceedToPlayerSetup}
            >
              🚪 Зайти в комнату
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. ЭКРАН ДОБАВЛЕНИЯ ИГРОКА (ПОСЛЕ ВХОДА В КОМНАТУ ИЛИ СКАНИРОВАНИЯ QR-КОДА)
  // ============================================================================
  if (role === 'mobile_setup') {
    return (
      <div className="app-bg">
        <div className="glass-card" style={{ maxWidth: 420, width: '92%', textAlign: 'center' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, opacity: 0.85, marginBottom: 4 }}>
            КОМНАТА: <span style={{ color: '#facc15' }}>{roomCode}</span>
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: 14 }}>Создание игрока</h2>

          {/* Превью аватара или селфи */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                border: `4px solid ${playerColor}`,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#140d21',
                fontSize: '3rem'
              }}
            >
              {playerSelfie && playerSelfie.startsWith('data:') ? (
                <img src={playerSelfie} alt="Селфи" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span>{playerSelfie || '👤'}</span>
              )}
            </div>

            <button
              type="button"
              className="primary-btn"
              style={{ background: '#00c8ff', color: '#140d21', width: '100%', padding: '12px' }}
              onClick={openCamera}
            >
              📸 {playerSelfie && playerSelfie.startsWith('data:') ? 'Переснять селфи' : 'Сделать смешное селфи'}
            </button>

            <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>или выберите эмодзи:</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {EMOJI_AVATARS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setPlayerSelfie(em)}
                  style={{
                    fontSize: '1.6rem',
                    padding: '6px 10px',
                    borderRadius: 10,
                    border: playerSelfie === em ? '3px solid #facc15' : '2px solid transparent',
                    background: 'rgba(255,255,255,0.15)',
                    cursor: 'pointer'
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              placeholder="Ваше имя"
              maxLength={14}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={{
                padding: '12px',
                fontSize: '1.15rem',
                fontWeight: 700,
                textAlign: 'center',
                borderRadius: 14,
                border: '3px solid #140d21',
                color: '#140d21',
                backgroundColor: '#ffffff'
              }}
            />

            {/* Выбор цвета фигурки */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', margin: '4px 0' }}>
              {PLAYER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPlayerColor(c)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: playerColor === c ? '3px solid #ffffff' : '2px solid #140d21',
                    transform: playerColor === c ? 'scale(1.15)' : 'scale(1)',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>

            <button
              className="primary-btn"
              disabled={!playerName.trim() || !playerSelfie}
              onClick={joinRoomAsPlayer}
              style={{ width: '100%', marginTop: 4 }}
            >
              🎮 Присоединиться к игре!
            </button>
          </div>
        </div>

        {/* Модалка селфи */}
        {isCameraOpen && (
          <div className="camera-modal">
            <div className="glass-card" style={{ textAlign: 'center', maxWidth: 340 }}>
              <h2 style={{ marginBottom: 10 }}>Сделай гримасу! 😜</h2>
              <div className="camera-video-preview">
                <video ref={videoRef} playsInline muted autoPlay />
              </div>
              {cameraLoading && <p style={{ marginTop: 8 }}>Запуск камеры...</p>}
              <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="primary-btn" onClick={takeSelfie}>
                  📸 Снять
                </button>
                <button
                  className="primary-btn"
                  style={{ background: '#ff3b69' }}
                  onClick={closeCamera}
                >
                  ✕ Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 3. РЕНДЕР ЭКРАНА СМАРТФОНА В ИГРЕ (МОБИЛЬНЫЙ ПУЛЬТ)
  // ============================================================================
  if (role === 'mobile') {
    const currentQ = gameState.currentRound?.questions?.[gameState.currentRound.currentQuestionIndex];
    const qKey = `${gameState.currentRound?.categoryId || 'cat'}_${gameState.currentRound?.currentQuestionIndex || 0}`;

    return (
      <div className="app-bg">
        <div className="mobile-container">
          <div className="glass-card" style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800 }}>Игрок: {sanitizeString(playerName)}</span>
            <span style={{ fontWeight: 800, color: '#facc15' }}>
              Клетка: {gameState.players?.[playerId]?.boardPosition || 0} / 24 | Очки: {gameState.players?.[playerId]?.score || 0}
            </span>
          </div>

          {gameState.status === 'lobby' && (
            <div className="glass-card" style={{ textAlign: 'center', margin: 'auto 0' }}>
              <h2>Ты в игре! 🎉</h2>
              <p style={{ marginTop: 10 }}>Ожидай, пока ведущий запустит раунд на большом экране ТВ...</p>
            </div>
          )}

          {gameState.status === 'quiz' && currentQ && (
            <div key={qKey} style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
              {currentQ.imageUrl && (
                <img src={currentQ.imageUrl} alt="Вопрос" className="question-image" />
              )}
              <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.15rem' }}>{currentQ.text || currentQ.q}</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                {currentQ.options.map((opt, idx) => {
                  const letters = ['A', 'B', 'C', 'D'];
                  const colorClasses = ['quiz-btn-a', 'quiz-btn-b', 'quiz-btn-c', 'quiz-btn-d'];
                  const isSelected = selectedAnswer === idx;

                  return (
                    <button
                      key={`${qKey}_${idx}`}
                      type="button"
                      className={`quiz-btn ${colorClasses[idx]} ${isSelected ? 'quiz-btn-selected' : ''} ${selectedAnswer !== null && !isSelected ? 'opacity-40' : ''}`}
                      disabled={selectedAnswer !== null}
                      onClick={(e) => handleAnswerSubmit(idx, e)}
                    >
                      <div className="quiz-btn-letter">{letters[idx]}</div>
                      <div className="quiz-btn-text">{opt}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(gameState.status === 'category_vote' || gameState.status === 'board_update') && (
            <div className="glass-card" style={{ textAlign: 'center', margin: 'auto 0' }}>
              <h2>Смотри на экран ТВ! 👀</h2>
              <p style={{ marginTop: 10 }}>Там происходят мультяшные перемещения фигурок и выбор темы!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. РЕНДЕР ЭКРАНА ТЕЛЕВИЗОРА (ТВ ХОСТ С QR-КОДОМ)
  // ============================================================================
  const playersList = Object.values(gameState.players || {});
  const currentQ = gameState.currentRound?.questions?.[gameState.currentRound.currentQuestionIndex];

  return (
    <div className="app-bg">
      <div className="tv-container">
        {/* Верхняя плашка ТВ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
          <div className="glass-card" style={{ padding: '8px 20px' }}>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>
              КОД КОМНАТЫ: <span style={{ color: '#facc15' }}>{roomCode}</span>
            </h2>
          </div>
          <div className="glass-card" style={{ padding: '8px 20px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>Игроков: {playersList.length}</span>
          </div>
        </div>

        {/* Экран лобби ТВ с QR-кодом и прямой ссылкой */}
        {gameState.status === 'lobby' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 'auto', gap: 16, zIndex: 20 }}>
            <div className="glass-card" style={{ textAlign: 'center', maxWidth: 680, width: '100%' }}>
              <h1 style={{ fontSize: '2.4rem', marginBottom: 8 }}>ПОДКЛЮЧАЙТЕСЬ К ИГРЕ!</h1>
              <p style={{ fontSize: '1.15rem', marginBottom: 16 }}>
                Отсканируйте QR-код телефоном или введите код комнаты: <b style={{ color: '#facc15', fontSize: '1.4rem' }}>{roomCode}</b>
              </p>

              {/* Контейнер QR-кода */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div
                  ref={qrRef}
                  style={{
                    background: '#ffffff',
                    padding: 14,
                    borderRadius: 18,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 238,
                    minHeight: 238,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                  }}
                />

                <div style={{ fontSize: '0.85rem', opacity: 0.9, wordBreak: 'break-all' }}>
                  Прямая ссылка для входа:{' '}
                  <a
                    href={joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#facc15', textDecoration: 'underline', fontWeight: 700 }}
                  >
                    {joinUrl}
                  </a>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', maxWidth: 800 }}>
              {playersList.map((p, i) => (
                <PlayerPawn key={p.id} player={p} colorIndex={i} />
              ))}
            </div>

            <button
              className="primary-btn"
              disabled={playersList.length === 0}
              onClick={startCategoryVote}
              style={{ fontSize: '1.4rem', padding: '16px 36px' }}
            >
              {playersList.length > 0 ? '🚀 Начать битву!' : '⏳ Ожидание игроков...'}
            </button>
          </div>
        )}

        {/* Экран выбора категории */}
        {gameState.status === 'category_vote' && (
          <div style={{ margin: 'auto', textAlign: 'center', zIndex: 10 }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: 20 }}>ВЫБЕРИТЕ КАТЕГОРИЮ РАУНДА</h1>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              {(gameState.voteCategories || []).map((cat) => (
                <button
                  key={cat.id}
                  className="glass-card primary-btn"
                  style={{ minWidth: 200, minHeight: 140, flexDirection: 'column', fontSize: '1.3rem' }}
                  onClick={() => startQuizForCategory(cat.id)}
                >
                  <span style={{ fontSize: '3rem' }}>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Экран викторины ТВ */}
        {gameState.status === 'quiz' && currentQ && (
          <div style={{ margin: 'auto', width: '90%', maxWidth: 900, zIndex: 10 }}>
            <div className="glass-card" style={{ textAlign: 'center', marginBottom: 20 }}>
              {currentQ.imageUrl && (
                <img src={currentQ.imageUrl} alt="Вопрос" className="question-image" style={{ maxHeight: 220 }} />
              )}
              <h1 style={{ fontSize: '2rem', marginTop: 10 }}>{currentQ.text || currentQ.q}</h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {currentQ.options.map((opt, idx) => {
                const letters = ['A', 'B', 'C', 'D'];
                const colorClasses = ['quiz-btn-a', 'quiz-btn-b', 'quiz-btn-c', 'quiz-btn-d'];
                return (
                  <div key={idx} className={`quiz-btn ${colorClasses[idx]}`}>
                    <div className="quiz-btn-letter">{letters[idx]}</div>
                    <div className="quiz-btn-text" style={{ fontSize: '1.35rem' }}>{opt}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button className="primary-btn" onClick={advanceQuiz}>
                Показать результат / Следующий вопрос ➔
              </button>
            </div>
          </div>
        )}

        {/* Игровое поле (настолка 5х5 клеток) */}
        {(gameState.status === 'board_update' || gameState.status === 'lobby') && (
          <div className="board-container">
            <div className="board-grid">
              {Array.from({ length: 25 }).map((_, cellIdx) => {
                const isStart = cellIdx === 0;
                const isFinish = cellIdx === 24;
                const playersOnCell = playersList.filter((p) => (p.boardPosition || 0) === cellIdx);

                let cellClass = 'board-cell';
                if (isStart) cellClass += ' board-cell-start';
                if (isFinish) cellClass += ' board-cell-finish';

                return (
                  <div key={cellIdx} className={cellClass}>
                    <span className="board-cell-number">
                      {isStart ? 'СТАРТ' : isFinish ? 'ФИНИШ 🏆' : cellIdx}
                    </span>
                    {playersOnCell.map((p, pIdx) => (
                      <PlayerPawn
                        key={p.id}
                        player={p}
                        colorIndex={pIdx}
                        isWalking={movingPlayerId === p.id}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {gameState.status === 'board_update' && (
          <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
            <button className="primary-btn" onClick={startCategoryVote}>
              Следующий раунд! 🎲
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Рендер React приложения
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
