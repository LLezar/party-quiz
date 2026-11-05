// filename: app.js
/**
 * Frontend App Module - Party Quiz Board Game
 * Toon Edition с поддержкой картинок в вопросах, адаптивностью под мобильные экраны
 * и bobblehead-фигурками игроков без наложения друг на друга.
 */

const { useState, useEffect, useRef, useMemo } = React;

const PLAYER_COLORS = [
  '#ff3b69', '#ffb703', '#00c8ff', '#2ecc71',
  '#9d4edd', '#ff9100', '#00f0ff', '#ff007f'
];

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
  const pawnColor = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  const safeName = sanitizeString(player.name || 'Игрок');

  return (
    <div
      className={`pawn-wrapper ${isWalking ? 'pawn-walking' : ''}`}
      style={{ '--player-color': pawnColor }}
      title={`${safeName} (${player.score || 0} очков)`}
    >
      <div className="pawn-selfie-head">
        {player.selfieBase64 ? (
          <img src={player.selfieBase64} alt={safeName} />
        ) : (
          <span>{safeName.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="pawn-body"></div>
    </div>
  );
}

function App() {
  const [role, setRole] = useState(null); // 'tv' | 'mobile'
  const [roomCode, setRoomCode] = useState('');
  const [dbUrl, setDbUrl] = useState(localStorage.getItem('partyquiz_dburl') || '');
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerSelfie, setPlayerSelfie] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);

  const [gameState, setGameState] = useState({
    status: 'lobby',
    players: {},
    currentRound: null
  });

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [movingPlayerId, setMovingPlayerId] = useState(null);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Определение параметров из URL (?role=tv&room=ABCD или ?room=ABCD)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const roleParam = params.get('role');
    const dbParam = params.get('db');

    if (roomParam) setRoomCode(roomParam.toUpperCase());
    if (dbParam) {
      setDbUrl(dbParam);
      localStorage.setItem('partyquiz_dburl', dbParam);
    }
    if (roleParam === 'tv') setRole('tv');
    else if (roleParam === 'mobile') setRole('mobile');
  }, []);

  // Инициализация синхронизации при входе в комнату
  useEffect(() => {
    if (!roomCode) return;

    window.GameSync.init(roomCode, dbUrl, (incomingState) => {
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
          setGameState(incomingState);
        }
      }
    });

    return () => {
      window.GameSync.cleanup();
    };
  }, [roomCode, dbUrl]);

  // Запуск камеры без повторного мерцания потока
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

  // Хост создает комнату (ТВ)
  const createHostRoom = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const initialState = {
      status: 'lobby',
      players: {},
      currentRound: null
    };
    setRoomCode(code);
    setRole('tv');
    if (dbUrl) localStorage.setItem('partyquiz_dburl', dbUrl);
    window.GameSync.init(code, dbUrl, (st) => setGameState(st));
    window.GameSync.updateState(initialState);
  };

  // Игрок подключается к комнате (Мобилка)
  const joinRoomAsPlayer = () => {
    if (!roomCode || !playerName.trim()) return;
    const newPlayerId = 'p_' + Math.random().toString(36).substring(2, 9);
    setPlayerId(newPlayerId);
    setRole('mobile');

    const playerData = {
      id: newPlayerId,
      name: playerName.trim(),
      selfieBase64: playerSelfie,
      score: 0,
      boardPosition: 0,
      isConnected: true
    };

    window.GameSync.patchPlayer(roomCode, newPlayerId, playerData);
  };

  // ТВ начинает раунд игры
  const startCategoryVote = () => {
    const randomCategories = window.QuestionBank.getCategories(3);
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
    const questions = window.QuestionBank.getQuestions(catId, 4);
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
  const handleAnswerSubmit = (index) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);

    const qIndex = gameState.currentRound?.currentQuestionIndex || 0;
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
    const correctIdx = currentQ.correctIndex;

    // Начисление очков и перемещение фишек
    const updatedPlayers = { ...(gameState.players || {}) };
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
      // Раунд закончен, переходим к отображению доски
      const finishRoundState = {
        ...gameState,
        players: updatedPlayers,
        status: 'board_update'
      };
      window.GameSync.updateState(finishRoundState);
    }
  };

  // Рендер стартового экрана (выбор роли)
  if (!role) {
    return (
      <div className="app-bg">
        <div className="glass-card" style={{ maxWidth: 420, width: '90%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.4rem', marginBottom: 12 }}>PARTY TOON QUIZ</h1>
          <p style={{ marginBottom: 20 }}>Веселая мультяшная настольная игра для компании!</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="primary-btn" onClick={createHostRoom}>
              📺 Создать комнату (ТВ)
            </button>

            <div style={{ margin: '14px 0 6px 0', borderTop: '3px dashed #140d21' }}></div>

            <input
              type="text"
              placeholder="КОД КОМНАТЫ"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              style={{
                padding: '12px',
                fontSize: '1.2rem',
                fontWeight: 800,
                textAlign: 'center',
                borderRadius: 14,
                border: '3px solid #140d21'
              }}
            />

            <input
              type="text"
              placeholder="Ваше имя"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={{
                padding: '12px',
                fontSize: '1.1rem',
                borderRadius: 14,
                border: '3px solid #140d21'
              }}
            />

            <button
              type="button"
              className="primary-btn"
              style={{ background: '#00c8ff' }}
              onClick={openCamera}
            >
              📸 {playerSelfie ? 'Селфи готово ✓' : 'Сделать смешное селфи'}
            </button>

            <button
              className="primary-btn"
              disabled={!roomCode || !playerName.trim()}
              onClick={joinRoomAsPlayer}
            >
              🎮 Войти игроком
            </button>
          </div>
        </div>

        {/* Модалка селфи */}
        {isCameraOpen && (
          <div className="camera-modal">
            <div className="glass-card" style={{ textAlign: 'center', maxWidth: 320 }}>
              <h2 style={{ marginBottom: 10 }}>Сделай гримасу! 😜</h2>
              <div className="camera-video-preview">
                <video ref={videoRef} playsInline muted autoPlay />
              </div>
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

  // РЕНДЕР ЭКРАНА СМАРТФОНА (МОБИЛКА)
  if (role === 'mobile') {
    const currentQ = gameState.currentRound?.questions?.[gameState.currentRound.currentQuestionIndex];

    return (
      <div className="app-bg">
        <div className="mobile-container">
          <div className="glass-card" style={{ padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800 }}>Игрок: {sanitizeString(playerName)}</span>
            <span style={{ fontWeight: 800, color: 'var(--accent-orange)' }}>
              Очки: {gameState.players?.[playerId]?.score || 0}
            </span>
          </div>

          {gameState.status === 'lobby' && (
            <div className="glass-card" style={{ textAlign: 'center', margin: 'auto 0' }}>
              <h2>Ты в игре! 🎉</h2>
              <p style={{ marginTop: 10 }}>Ожидай, пока ведущий запустит раунд на большом экране ТВ...</p>
            </div>
          )}

          {gameState.status === 'quiz' && currentQ && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
              {currentQ.imageUrl && (
                <img src={currentQ.imageUrl} alt="Вопрос" className="question-image" />
              )}
              <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.15rem' }}>{currentQ.text}</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                {currentQ.options.map((opt, idx) => {
                  const letters = ['A', 'B', 'C', 'D'];
                  const colorClasses = ['quiz-btn-a', 'quiz-btn-b', 'quiz-btn-c', 'quiz-btn-d'];
                  const isSelected = selectedAnswer === idx;

                  return (
                    <button
                      key={idx}
                      className={`quiz-btn ${colorClasses[idx]} ${isSelected ? 'quiz-btn-selected' : ''}`}
                      disabled={selectedAnswer !== null}
                      onClick={() => handleAnswerSubmit(idx)}
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
              <p style={{ marginTop: 10 }}>Там происходят эпические мультяшные перемещения фигурок!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // РЕНДЕР ЭКРАНА ТЕЛЕВИЗОРА (ТВ ХОСТ)
  const playersList = Object.values(gameState.players || {});
  const currentQ = gameState.currentRound?.questions?.[gameState.currentRound.currentQuestionIndex];

  return (
    <div className="app-bg">
      <div className="tv-container">
        {/* Верхняя плашка ТВ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
          <div className="glass-card" style={{ padding: '8px 20px' }}>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>КОД КОМНАТЫ: {roomCode}</h2>
          </div>
          <div className="glass-card" style={{ padding: '8px 20px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>Игроков: {playersList.length}</span>
          </div>
        </div>

        {/* Экран лобби ТВ */}
        {gameState.status === 'lobby' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 'auto', gap: 20 }}>
            <div className="glass-card" style={{ textAlign: 'center', maxWidth: 600 }}>
              <h1 style={{ fontSize: '2.8rem', marginBottom: 12 }}>ПОДКЛЮЧАЙТЕСЬ К ИГРЕ!</h1>
              <p style={{ fontSize: '1.2rem' }}>Откройте игру на телефоне и введите код: <b>{roomCode}</b></p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', maxWidth: 800 }}>
              {playersList.map((p, i) => (
                <PlayerPawn key={p.id} player={p} colorIndex={i} />
              ))}
            </div>

            {playersList.length > 0 && (
              <button className="primary-btn" onClick={startCategoryVote}>
                🚀 Начать битву!
              </button>
            )}
          </div>
        )}

        {/* Экран выбора категории */}
        {gameState.status === 'category_vote' && (
          <div style={{ margin: 'auto', textAlign: 'center', zIndex: 10 }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: 20 }}>ВЫБЕРИТЕ КАТЕГОРИЮ РАУНДА</h1>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
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
              <h1 style={{ fontSize: '2rem', marginTop: 10 }}>{currentQ.text}</h1>
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

        {/* Игровое поле (настолка 5х5 клеток без наложения игроков) */}
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