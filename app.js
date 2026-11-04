// filename: app.js
const { useState, useEffect, useRef, useCallback, useMemo } = React;

const TOTAL_CELLS = 25; // Сетка 5x5 змейкой (0..24, где 0 - Старт, 24 - Финиш)
const GRID_SIZE = 5;

const generateRoomId = () => Math.random().toString(36).substring(2, 6).toUpperCase();
const generatePlayerId = () => 'p_' + Math.random().toString(36).substring(2, 9);

// Генерация координат в сетке 5x5 змейкой:
// Ряд 0: 0 -> 4 (слева направо)
// Ряд 1: 9 <- 5 (справа налево)
// Ряд 2: 10 -> 14 (слева направо)
// Ряд 3: 19 <- 15 (справа налево)
// Ряд 4: 20 -> 24 (слева направо)
const getGridPos = (index) => {
    const safeIndex = Math.max(0, Math.min(index, TOTAL_CELLS - 1));
    const row = Math.floor(safeIndex / GRID_SIZE);
    const isEvenRow = row % 2 === 0;
    const col = isEvenRow ? (safeIndex % GRID_SIZE) : (GRID_SIZE - 1 - (safeIndex % GRID_SIZE));
    return { row: row + 1, col: col + 1 };
};

const EMOJI_AVATARS = ['😎', '🤪', '🤡', '👽', '🤖', '😺', '🤠', '🦊'];
const PLAYER_COLORS = ['#FF3B30', '#007AFF', '#34C759', '#FFCC00', '#AF52DE', '#FF9500'];

const Pawn = ({ color, avatar, isJumping, position }) => {
    const pos = getGridPos(position || 0);
    return (
        <div 
            className={`pawn-wrapper ${isJumping ? 'pawn-jumping' : ''} absolute pointer-events-none transition-all duration-300 z-20 flex flex-col items-center justify-center`}
            style={{ 
                gridRow: pos.row, 
                gridColumn: pos.col,
                '--player-color': color
            }}
        >
            <div className="pawn-selfie-head" style={{ '--player-color': color, borderColor: color }}>
                {avatar && avatar.startsWith('data:') ? (
                    <img src={avatar} alt="head" className="w-full h-full object-cover rounded-full" />
                ) : (
                    <span className="text-3xl select-none">{avatar || '👤'}</span>
                )}
            </div>
            <div className="pawn-body" style={{ '--player-color': color, backgroundColor: color }}></div>
        </div>
    );
};

// Модальное окно камеры
const CameraModal = ({ isOpen, onClose, onSave }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [photo, setPhoto] = useState(null);

    useEffect(() => {
        if (isOpen && !photo && videoRef.current) {
            window.GameSync.initCamera(videoRef.current).catch(err => {
                console.error(err);
                alert("Ошибка доступа к камере. Выберите эмодзи.");
                onClose();
            });
        }
        return () => {
            if (videoRef.current && window.GameSync.stopCamera) {
                window.GameSync.stopCamera(videoRef.current);
            }
        };
    }, [isOpen, photo]);

    if (!isOpen) return null;

    const handleTake = async () => {
        try {
            const base64 = await window.GameSync.takePhoto(videoRef.current, canvasRef.current);
            setPhoto(base64);
        } catch (e) {
            alert("Не удалось сделать фото");
        }
    };

    const handleRetake = () => setPhoto(null);

    const handleSave = () => {
        onSave(photo);
        onClose();
    };

    return (
        <div className="camera-modal fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
            <div className="glass-card p-6 flex flex-col items-center max-w-sm w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-white text-3xl font-bold">&times;</button>
                <h3 className="text-2xl font-bold mb-6 text-white">Сделайте селфи</h3>
                
                <div className="camera-video-preview w-64 h-64 bg-black rounded-3xl overflow-hidden mb-6 border-4 border-[#8B9A46] relative flex items-center justify-center">
                    {!photo && <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />}
                    {photo && <img src={photo} alt="captured" className="w-full h-full object-cover" />}
                    <canvas ref={canvasRef} className="hidden" width="300" height="300"></canvas>
                </div>
                
                <div className="camera-controls flex gap-4 w-full">
                    {!photo ? (
                        <button onClick={handleTake} className="primary-btn w-full !bg-[#8B9A46] hover:!bg-[#738236]">📸 Сфотографировать</button>
                    ) : (
                        <>
                            <button onClick={handleRetake} className="primary-btn w-1/2 !bg-gray-500 hover:!bg-gray-600">Переснять</button>
                            <button onClick={handleSave} className="primary-btn w-1/2 !bg-[#8B9A46] hover:!bg-[#738236]">Сохранить</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// Стартовый экран
const StartScreen = () => {
    const [dbUrl, setDbUrl] = useState(localStorage.getItem('firebaseDbUrl') || '');
    const [autoTimer, setAutoTimer] = useState(30);

    const handleHost = useCallback(() => {
        localStorage.setItem('firebaseDbUrl', dbUrl);
        const room = generateRoomId();
        const baseUrl = window.location.origin + window.location.pathname;
        window.location.href = `${baseUrl}?role=host&room=${room}&db=${encodeURIComponent(dbUrl)}`;
    }, [dbUrl]);

    const handlePlayer = () => {
        localStorage.setItem('firebaseDbUrl', dbUrl);
        const room = prompt('Введите 4-значный код комнаты:');
        if (room) {
            const baseUrl = window.location.origin + window.location.pathname;
            window.location.href = `${baseUrl}?role=player&room=${room.trim().toUpperCase()}&db=${encodeURIComponent(dbUrl)}`;
        }
    };

    // Автоматическое создание комнаты через 30 секунд
    useEffect(() => {
        const interval = setInterval(() => {
            setAutoTimer(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    handleHost();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [handleHost]);

    return (
        <div className="flex flex-col items-center justify-center h-full p-4 tv-container">
            <div className="glass-card p-8 max-w-md w-full text-center space-y-6">
                <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[#8B9A46] to-yellow-400 drop-shadow-md">
                    Party Board Quiz
                </h1>
                <p className="text-sm text-yellow-300 font-semibold animate-pulse">
                    Автосоздание комнаты ТВ через {autoTimer} сек...
                </p>
                <div className="text-left">
                    <label className="block text-sm mb-2 text-gray-200 font-bold">Firebase DB URL (опционально):</label>
                    <input 
                        type="text" value={dbUrl} onChange={e => setDbUrl(e.target.value)} 
                        placeholder="https://your-db.firebaseio.com"
                        className="w-full p-3 rounded-xl bg-black/40 border border-white/30 text-white outline-none focus:border-[#8B9A46] transition-colors"
                    />
                </div>
                <div className="space-y-4 pt-4">
                    <button onClick={handleHost} className="primary-btn w-full py-4 text-xl shadow-lg">Создать игру (ТВ)</button>
                    <button onClick={handlePlayer} className="w-full py-4 rounded-xl text-xl font-bold bg-white/10 hover:bg-white/20 border border-white/30 transition-colors">Присоединиться (Телефон)</button>
                </div>
            </div>
        </div>
    );
};

// Экран Хоста (ТВ)
const TVApp = ({ roomId, dbUrl }) => {
    const [gameState, setGameState] = useState(null);
    const [visualPositions, setVisualPositions] = useState({});
    const [jumpingPlayerId, setJumpingPlayerId] = useState(null);
    const [isMovingActive, setIsMovingActive] = useState(false);
    const [revealAnswer, setRevealAnswer] = useState(false);
    const [syncMessage, setSyncMessage] = useState('');
    const qrRef = useRef(null);

    const baseUrl = window.location.origin + window.location.pathname;
    const joinUrl = `${baseUrl}?role=player&room=${roomId}${dbUrl ? `&db=${encodeURIComponent(dbUrl)}` : ''}`;

    useEffect(() => {
        const handleSyncError = (msg) => setSyncMessage(msg || 'Используется локальный режим (вкладки)');

        try {
            window.GameSync.onError(handleSyncError);
            window.GameSync.onStateChange((newState) => {
                setGameState(newState);
            });
            
            window.GameSync.init('host', roomId, dbUrl);

            window.GameSync.updateState({
                roomId: roomId,
                status: 'LOBBY',
                timer: 0,
                currentCategory: null,
                currentQuestionIndex: 0,
                categoriesToVote: [],
                questions: [],
                correctAnswer: null,
                winner: null,
                players: {}
            });
        } catch (err) {
            setSyncMessage('Ошибка инициализации. Работаем локально.');
        }
    }, [roomId, dbUrl]);

    // Синхронизация визуальных позиций с базой
    useEffect(() => {
        if (!gameState?.players) return;
        if (!isMovingActive) {
            const initialPos = {};
            Object.values(gameState.players).forEach(p => {
                initialPos[p.id] = p.position || 0;
            });
            setVisualPositions(initialPos);
        }
    }, [gameState?.players, isMovingActive]);

    // Генерация QR-кода строго в DOM
    useEffect(() => {
        if (gameState?.status === 'LOBBY' && qrRef.current) {
            qrRef.current.innerHTML = '';
            try {
                new QRCode(qrRef.current, {
                    text: joinUrl,
                    width: 220,
                    height: 220,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });
            } catch(e) {
                console.error("QR Error", e);
            }
        }
    }, [gameState?.status, joinUrl]);

    // Игровой таймер
    useEffect(() => {
        if (!gameState) return;
        let timerId;
        const { status, timer } = gameState;

        if (timer > 0) {
            timerId = setTimeout(() => window.GameSync.updateState({ timer: timer - 1 }), 1000);
        } else if (timer === 0) {
            if (status === 'CATEGORY_SELECT') handleVoteEnd();
            else if (status === 'QUIZ' && !revealAnswer) handleQuestionEnd();
            else if (status === 'MOVEMENT_PHASE' && !isMovingActive) handleMovementEnd();
        }

        return () => clearTimeout(timerId);
    }, [gameState?.status, gameState?.timer, revealAnswer, isMovingActive]);

    // Старт нового круга
    const startNewRound = () => {
        const categories = window.QuestionBank.getCategories(3);
        const resetPlayers = { ...gameState.players };
        Object.keys(resetPlayers).forEach(pid => {
            resetPlayers[pid].currentVote = null;
            resetPlayers[pid].currentAnswer = null;
            resetPlayers[pid].roundScore = 0;
        });

        window.GameSync.updateState({
            status: 'CATEGORY_SELECT',
            timer: 15,
            categoriesToVote: categories,
            players: resetPlayers,
            correctAnswer: null
        });
    };

    // Завершение голосования
    const handleVoteEnd = () => {
        const votes = {};
        Object.values(gameState.players).forEach(p => {
            if (p.currentVote) votes[p.currentVote] = (votes[p.currentVote] || 0) + 1;
        });
        
        let winnerCat = gameState.categoriesToVote[0]?.id || 'science';
        let maxVotes = 0;
        for (const [cat, count] of Object.entries(votes)) {
            if (count > maxVotes) { maxVotes = count; winnerCat = cat; }
        }

        const questions = window.QuestionBank.getQuestions(winnerCat, 4);
        window.GameSync.updateState({
            status: 'QUIZ',
            currentCategory: winnerCat,
            questions,
            currentQuestionIndex: 0,
            timer: 15,
            correctAnswer: null
        });
        setRevealAnswer(false);
    };

    // Завершение текущего вопроса
    const handleQuestionEnd = () => {
        const currentQ = gameState.questions[gameState.currentQuestionIndex];
        const updatedPlayers = { ...gameState.players };
        
        Object.keys(updatedPlayers).forEach(pid => {
            if (updatedPlayers[pid].currentAnswer === currentQ.correctIndex) {
                updatedPlayers[pid].roundScore = (updatedPlayers[pid].roundScore || 0) + 1;
                updatedPlayers[pid].score = (updatedPlayers[pid].score || 0) + 1;
            }
        });

        window.GameSync.updateState({ 
            players: updatedPlayers,
            correctAnswer: currentQ.correctIndex 
        });
        setRevealAnswer(true);

        setTimeout(() => {
            const nextIndex = gameState.currentQuestionIndex + 1;
            if (nextIndex < 4) {
                const resetAnswersPlayers = { ...updatedPlayers };
                Object.keys(resetAnswersPlayers).forEach(pid => resetAnswersPlayers[pid].currentAnswer = null);
                window.GameSync.updateState({ 
                    players: resetAnswersPlayers, 
                    currentQuestionIndex: nextIndex, 
                    timer: 15, 
                    correctAnswer: null 
                });
                setRevealAnswer(false);
            } else {
                // Переход к фазе движения
                window.GameSync.updateState({ status: 'MOVEMENT_PHASE', timer: 10, correctAnswer: null });
                setRevealAnswer(false);
                executeBoardMovePhase(updatedPlayers);
            }
        }, 3500);
    };

    // Пошаговый прыжковый переход по полю
    const executeBoardMovePhase = async (currentPlayers) => {
        setIsMovingActive(true);
        let workingPlayers = JSON.parse(JSON.stringify(currentPlayers));
        const pList = Object.values(workingPlayers);

        for (const player of pList) {
            const steps = player.roundScore || 0;
            for (let step = 1; step <= steps; step++) {
                if ((player.position || 0) >= TOTAL_CELLS - 1) break;
                
                // Анимация прыжка
                setJumpingPlayerId(player.id);
                player.position = Math.min(TOTAL_CELLS - 1, (player.position || 0) + 1);
                
                // Обновляем визуальную позицию
                setVisualPositions(prev => ({
                    ...prev,
                    [player.id]: player.position
                }));

                await new Promise(r => setTimeout(r, 450));
                setJumpingPlayerId(null);
                await new Promise(r => setTimeout(r, 150));
            }
        }

        // Синхронизируем конечные позиции в gameState
        window.GameSync.updateState({ players: workingPlayers });
        setIsMovingActive(false);
    };

    const handleMovementEnd = () => {
        const winner = Object.values(gameState.players).find(p => (p.position || 0) >= TOTAL_CELLS - 1);
        if (winner) {
            window.GameSync.updateState({ status: 'ENDGAME', winner: winner.id });
        } else {
            startNewRound();
        }
    };

    if (!gameState) return <div className="flex items-center justify-center h-full text-3xl font-bold">Загрузка...</div>;

    const { status, players, timer, categoriesToVote, questions, currentQuestionIndex, correctAnswer } = gameState;
    const playersList = Object.values(players || {});

    return (
        <div className="tv-container relative w-screen h-screen flex flex-col p-0 m-0 overflow-hidden">
            {/* Поле растянуто на 100% экрана */}
            <div className={`board-grid w-full h-full absolute inset-0 z-0 p-4 ${status === 'LOBBY' || status === 'QUIZ' || status === 'CATEGORY_SELECT' ? 'opacity-25 filter blur-[1px]' : 'opacity-100'}`}>
                {Array.from({ length: TOTAL_CELLS }).map((_, i) => {
                    const pos = getGridPos(i);
                    const isStart = i === 0;
                    const isFinish = i === TOTAL_CELLS - 1;
                    const hasPlayers = playersList.some(p => (visualPositions[p.id] ?? p.position ?? 0) === i);
                    return (
                        <div 
                            key={i} 
                            className={`board-cell ${isStart ? 'board-cell-start' : ''} ${isFinish ? 'board-cell-finish' : ''} ${hasPlayers ? 'board-cell-active' : ''}`} 
                            style={{ gridRow: pos.row, gridColumn: pos.col }}
                        >
                            <span className="font-mono text-2xl font-black">
                                {isStart ? 'START' : isFinish ? 'FINISH 🏆' : i + 1}
                            </span>
                        </div>
                    );
                })}
                {/* Фигурки игроков */}
                {playersList.map(p => (
                    <Pawn 
                        key={p.id} 
                        color={p.color} 
                        avatar={p.selfieBase64 || p.avatar} 
                        position={visualPositions[p.id] ?? p.position ?? 0} 
                        isJumping={jumpingPlayerId === p.id} 
                    />
                ))}
            </div>

            {/* Компактная плашка над полем во время перемещения */}
            {status === 'MOVEMENT_PHASE' && (
                <div className="move-info-toast glass-card">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl animate-bounce">🎲</span>
                        <div>
                            <span className="font-extrabold text-xl text-yellow-400">Игроки шагают!</span>
                            <span className="ml-2 text-sm text-gray-200">Передвижение на количество верных ответов</span>
                        </div>
                        <span className="font-mono text-xl ml-4 bg-yellow-500/20 px-3 py-1 rounded-full text-yellow-300 font-bold">{timer}s</span>
                    </div>
                </div>
            )}

            {/* Оверлеи для остальных фаз */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center pointer-events-auto p-4">
                {status === 'LOBBY' && (
                    <div className="glass-card p-8 text-center max-w-2xl w-full">
                        <h2 className="text-5xl font-black mb-4">Код комнаты: <span className="text-yellow-400 tracking-wider">{roomId}</span></h2>
                        
                        <div className="flex flex-col items-center justify-center mb-6">
                            <div ref={qrRef} className="bg-white p-3 rounded-2xl inline-block shadow-2xl min-w-[240px] min-h-[240px] flex items-center justify-center"></div>
                            
                            {syncMessage && (
                                <div className="mt-3 px-4 py-1.5 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-300 text-sm font-bold">
                                    ⚠️ {syncMessage}
                                </div>
                            )}
                            
                            <div className="mt-3 w-full bg-black/40 p-2.5 rounded-lg border border-white/20">
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Ссылка для подключения:</p>
                                <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 underline break-all text-xs font-mono block">
                                    {joinUrl}
                                </a>
                            </div>
                        </div>

                        <h3 className="text-xl mb-3 font-bold text-gray-200">Игроки ({playersList.length}/4):</h3>
                        <div className="flex justify-center gap-6 mb-6 min-h-[90px]">
                            {playersList.length === 0 && <p className="text-gray-400 self-center">Отсканируйте QR-код телефоном...</p>}
                            {playersList.map(p => (
                                <div key={p.id} className="flex flex-col items-center animate-fade-in">
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-4 mb-2 bg-white shadow-lg" style={{ borderColor: p.color }}>
                                        {p.selfieBase64 ? <img src={p.selfieBase64} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl text-black">{p.avatar}</div>}
                                    </div>
                                    <span className="font-bold text-sm max-w-[80px] truncate">{p.name}</span>
                                </div>
                            ))}
                        </div>
                        <button onClick={startNewRound} disabled={playersList.length === 0} className={`primary-btn px-10 py-4 text-2xl w-full ${playersList.length === 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>Начать игру</button>
                    </div>
                )}

                {status === 'CATEGORY_SELECT' && (
                    <div className="glass-card p-8 text-center max-w-3xl w-full">
                        <h2 className="text-4xl font-extrabold mb-2">Голосование за категорию</h2>
                        <p className="text-lg text-gray-200 mb-6">Смотрите в телефоны и делайте выбор!</p>
                        <div className="w-full h-3 bg-gray-700 rounded-full mb-8 overflow-hidden"><div className="timer-bar" style={{ width: `${(timer / 15) * 100}%` }}></div></div>
                        <div className="grid grid-cols-3 gap-6 mb-6">
                            {categoriesToVote.map((cat, i) => (
                                <div key={i} className="glass-card p-6 bg-white/10 flex flex-col items-center rounded-2xl border border-white/20">
                                    <span className="text-6xl mb-4 drop-shadow">{cat.icon}</span>
                                    <h3 className="text-2xl font-bold mb-4">{cat.name}</h3>
                                    <div className="flex gap-2">
                                        {playersList.filter(p => p.currentVote === cat.id).map(p => (
                                            <div key={p.id} className="w-9 h-9 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: p.color }}></div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="text-4xl font-mono font-bold text-yellow-400">{timer} сек</div>
                    </div>
                )}

                {status === 'QUIZ' && questions[currentQuestionIndex] && (
                    <div className="glass-card p-8 text-center max-w-4xl w-full">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-2xl text-yellow-400 font-extrabold uppercase">Вопрос {currentQuestionIndex + 1} / 4</span>
                            <span className="text-4xl font-mono font-bold bg-white/20 px-6 py-1.5 rounded-xl border border-white/30">{timer}</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-8 leading-snug">{questions[currentQuestionIndex].text}</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {questions[currentQuestionIndex].options.map((opt, i) => {
                                const isCorrect = revealAnswer && i === correctAnswer;
                                const isWrong = revealAnswer && i !== correctAnswer;
                                const colorClass = i===0 ? 'quiz-btn-a' : i===1 ? 'quiz-btn-b' : i===2 ? 'quiz-btn-c' : 'quiz-btn-d';
                                return (
                                    <div key={i} className={`quiz-btn ${colorClass} ${isCorrect ? 'quiz-btn-correct' : ''} ${isWrong ? 'quiz-btn-wrong' : ''} relative !cursor-default`} style={{justifyContent: 'center'}}>
                                        <div className="quiz-btn-text text-center text-2xl font-bold">{opt}</div>
                                        {revealAnswer && (
                                            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-30">
                                                {playersList.filter(p => p.currentAnswer === i).map(p => (
                                                    <div key={p.id} className="w-11 h-11 rounded-full border-4 overflow-hidden shadow-xl" style={{ borderColor: p.color, backgroundColor: '#fff' }}>
                                                        {p.selfieBase64 ? <img src={p.selfieBase64} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl text-black">{p.avatar}</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {status === 'ENDGAME' && gameState.winner && players[gameState.winner] && (
                    <div className="glass-card p-12 text-center shadow-[0_0_100px_rgba(255,204,0,0.7)] border-4 border-yellow-400 max-w-xl">
                        <h1 className="text-6xl font-black mb-6 text-yellow-400 drop-shadow-lg">ПОБЕДИТЕЛЬ!</h1>
                        <div className="flex flex-col items-center">
                            <div className="w-48 h-48 rounded-full border-[8px] mb-4 shadow-2xl overflow-hidden" style={{ borderColor: players[gameState.winner].color, backgroundColor: '#fff' }}>
                                {players[gameState.winner].selfieBase64 ? 
                                    <img src={players[gameState.winner].selfieBase64} alt="winner" className="w-full h-full object-cover" /> : 
                                    <div className="w-full h-full flex items-center justify-center text-7xl text-black">{players[gameState.winner].avatar}</div>
                                }
                            </div>
                            <h2 className="text-5xl font-black text-white">{players[gameState.winner].name}</h2>
                        </div>
                        <button onClick={() => window.location.href = window.location.origin + window.location.pathname} className="mt-8 primary-btn text-2xl px-8 py-3">В главное меню</button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Экран Мобильного пульта (Игрок)
const MobileApp = ({ roomId, dbUrl }) => {
    const [gameState, setGameState] = useState(null);
    const [playerId, setPlayerId] = useState(localStorage.getItem('party_quiz_player_id') || null);
    const [isJoined, setIsJoined] = useState(false);
    const [syncMessage, setSyncMessage] = useState(null);
    
    const [name, setName] = useState('');
    const [color, setColor] = useState('');
    const [avatar, setAvatar] = useState(null);
    const [selfieBase64, setSelfieBase64] = useState(null);
    const [showCameraModal, setShowCameraModal] = useState(false);

    // Локальный стейт ответа на текущий вопрос для исключения залипания
    const [selectedAnswer, setSelectedAnswer] = useState(null);

    useEffect(() => {
        const handleSyncError = (msg) => setSyncMessage(msg || 'Включен режим локальных вкладок');

        try {
            window.GameSync.onError(handleSyncError);
            window.GameSync.onStateChange((newState) => {
                setGameState(newState);
                if (playerId && newState?.players?.[playerId]) {
                    setIsJoined(true);
                }
            });

            window.GameSync.init('player', roomId, dbUrl);
        } catch (err) {
            setSyncMessage('Ошибка сети. Работаем локально.');
        }
    }, [roomId, dbUrl, playerId]);

    // Сброс выбора ответа при переключении вопросов и фаз (исправление бага "второго вопроса")
    useEffect(() => {
        setSelectedAnswer(null);
    }, [gameState?.currentQuestionIndex, gameState?.status]);

    // Список занятых цветов другими игроками
    const usedColors = useMemo(() => {
        if (!gameState?.players) return [];
        return Object.values(gameState.players).map(p => p.color);
    }, [gameState?.players]);

    // Автовыбор первого свободного цвета
    useEffect(() => {
        if (!color || usedColors.includes(color)) {
            const firstFree = PLAYER_COLORS.find(c => !usedColors.includes(c));
            if (firstFree) setColor(firstFree);
        }
    }, [usedColors, color]);

    const handleSavePhoto = (base64) => {
        setSelfieBase64(base64);
        setAvatar(null);
    };

    const handleJoin = () => {
        if (!name.trim()) return alert("Введите имя!");
        if (!avatar && !selfieBase64) return alert("Сделайте селфи или выберите эмодзи!");
        if (!color) return alert("Все цвета заняты!");
        if (usedColors.includes(color)) return alert("Этот цвет уже занят другим игроком!");

        const newId = playerId || generatePlayerId();
        setPlayerId(newId);
        localStorage.setItem('party_quiz_player_id', newId);

        window.GameSync.joinGame({
            id: newId,
            name: name.trim().slice(0, 12),
            color,
            avatar,
            selfieBase64,
            position: 0,
            score: 0,
            roundScore: 0,
            currentVote: null,
            currentAnswer: null,
            isHost: false
        });
    };

    const sendVote = (catId) => {
        if (!gameState?.players?.[playerId] || gameState.players[playerId].currentVote) return;
        window.GameSync.sendAction('vote', { categoryId: catId });
    };

    const sendAnswer = (index) => {
        if (selectedAnswer !== null) return;
        if (!gameState?.players?.[playerId] || gameState.players[playerId].currentAnswer !== null) return;
        
        setSelectedAnswer(index);
        window.GameSync.sendAction('answer', { answerIndex: index });
    };

    const renderSyncWarning = () => {
        if (!syncMessage) return null;
        return (
            <div className="absolute top-0 left-0 w-full bg-yellow-500/90 text-black text-xs font-bold text-center py-1 z-50 shadow-md">
                ⚠️ {syncMessage}
            </div>
        );
    };

    if (!isJoined || !gameState || !gameState.players || !gameState.players[playerId]) {
        return (
            <div className="mobile-container relative flex flex-col items-center justify-center p-4 h-full overflow-y-auto">
                {renderSyncWarning()}
                <CameraModal isOpen={showCameraModal} onClose={() => setShowCameraModal(false)} onSave={handleSavePhoto} />
                
                <div className="glass-card w-full max-w-sm space-y-5 my-auto">
                    <h2 className="text-3xl font-extrabold text-center text-yellow-400">Вход в игру</h2>
                    <div className="flex flex-col items-center gap-3">
                        <div className="camera-preview-container relative w-28 h-28 rounded-full overflow-hidden flex items-center justify-center bg-black/50 shadow-xl transition-all" style={{ borderColor: color || '#fff', borderWidth: '4px' }}>
                            {!avatar && !selfieBase64 && <div className="absolute inset-0 flex items-center justify-center text-4xl">👤</div>}
                            {selfieBase64 && <img src={selfieBase64} alt="avatar" className="w-full h-full object-cover" />}
                            {avatar && <div className="w-full h-full bg-white flex items-center justify-center text-5xl text-black">{avatar}</div>}
                        </div>
                        
                        <button onClick={() => setShowCameraModal(true)} className="primary-btn bg-yellow-500 hover:bg-yellow-600 text-black w-full font-bold py-2.5">
                            📸 Сделать селфи
                        </button>
                        
                        <div className="text-xs text-gray-300 font-semibold">или выберите маску:</div>
                        <div className="flex gap-2 flex-wrap justify-center">
                            {EMOJI_AVATARS.map(em => (
                                <button key={em} onClick={() => { setAvatar(em); setSelfieBase64(null); }} className={`text-2xl hover:scale-125 transition-transform p-1.5 rounded-lg ${avatar === em ? 'bg-yellow-400/40 ring-2 ring-yellow-400' : 'bg-white/10'}`}>
                                    {em}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="Ваше имя" 
                        maxLength="12" 
                        className="w-full p-3.5 rounded-xl bg-black/40 border border-white/30 text-center text-lg font-bold outline-none focus:border-[#8B9A46]" 
                    />

                    {/* Выбор цвета с блокировкой уже занятых */}
                    <div className="space-y-1">
                        <div className="text-xs text-gray-300 text-center font-semibold">Выберите цвет (занятые заблокированы):</div>
                        <div className="flex justify-center gap-2.5 flex-wrap pt-1">
                            {PLAYER_COLORS.map(c => {
                                const isTaken = usedColors.includes(c);
                                return (
                                    <button 
                                        key={c} 
                                        onClick={() => !isTaken && setColor(c)} 
                                        disabled={isTaken}
                                        title={isTaken ? 'Цвет занят' : 'Выбрать цвет'}
                                        className={`w-11 h-11 rounded-full border-4 transition-all relative ${color === c ? 'scale-110 border-white shadow-lg' : 'border-black/30'} ${isTaken ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:scale-105'}`} 
                                        style={{ backgroundColor: c }}
                                    >
                                        {isTaken && <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold">✕</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <button onClick={handleJoin} className="primary-btn w-full mt-2 text-xl py-3.5 shadow-xl font-bold">
                        Войти в игру
                    </button>
                </div>
            </div>
        );
    }

    const { status, timer, categoriesToVote, questions, currentQuestionIndex, correctAnswer } = gameState;
    const myPlayer = gameState.players[playerId];
    const currentMyAnswer = selectedAnswer !== null ? selectedAnswer : myPlayer.currentAnswer;

    return (
        <div className="mobile-container relative flex flex-col h-full p-4 pt-4 select-none">
            {renderSyncWarning()}
            
            {/* Панель игрока */}
            <div className="glass-card p-3 mb-3 flex items-center justify-between !py-2 !px-4 !rounded-2xl shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 overflow-hidden bg-white shadow" style={{ borderColor: myPlayer.color }}>
                         {myPlayer.selfieBase64 ? <img src={myPlayer.selfieBase64} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl text-black">{myPlayer.avatar}</div>}
                    </div>
                    <span className="font-bold text-lg">{myPlayer.name}</span>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-gray-300 uppercase tracking-wider">Клетка</div>
                    <div className="font-mono text-xl font-black" style={{ color: myPlayer.color }}>{(myPlayer.position || 0) + 1} / {TOTAL_CELLS}</div>
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
                {status === 'LOBBY' && (
                    <div className="text-center glass-card p-8">
                        <div className="text-6xl mb-4 animate-spin inline-block">⏳</div>
                        <h2 className="text-2xl font-bold mb-2">Вы в лобби!</h2>
                        <p className="text-gray-200">Смотрите на экран ТВ, игра скоро начнется.</p>
                    </div>
                )}
                
                {status === 'CATEGORY_SELECT' && (
                    <div className="flex flex-col gap-3 h-full justify-center">
                        <h2 className="text-2xl font-black text-center mb-2">Голосуй за тему!</h2>
                        {categoriesToVote.map(cat => (
                            <button 
                                key={cat.id} 
                                onClick={() => sendVote(cat.id)} 
                                disabled={!!myPlayer.currentVote} 
                                className={`glass-card flex items-center gap-4 text-xl font-bold w-full p-5 transition-all active:scale-95 ${myPlayer.currentVote === cat.id ? 'border-[#8B9A46] shadow-[0_0_20px_rgba(139,154,70,0.8)] scale-102 bg-[#8B9A46]/30' : ''} ${myPlayer.currentVote && myPlayer.currentVote !== cat.id ? 'opacity-40 grayscale' : 'hover:bg-white/10'}`}
                            >
                                <span className="text-4xl">{cat.icon}</span>
                                <span>{cat.name}</span>
                            </button>
                        ))}
                    </div>
                )}
                
                {status === 'QUIZ' && questions[currentQuestionIndex] && (
                    <div className="flex flex-col h-full justify-between pb-4">
                        <div className="text-center mb-2">
                            <div className="text-sm text-yellow-400 font-extrabold uppercase">Вопрос {currentQuestionIndex + 1} / 4</div>
                            <div className="text-4xl font-mono font-black">{timer}</div>
                        </div>

                        {/* Кнопки ответа с надежной изоляцией тачей и правильным сбросом стейта */}
                        <div className="grid grid-cols-1 gap-3 flex-1 justify-center my-auto">
                            {['A', 'B', 'C', 'D'].map((lbl, i) => {
                                const isSelected = currentMyAnswer === i;
                                const isReveal = correctAnswer !== null;
                                
                                let btnClass = `quiz-btn quiz-btn-${lbl.toLowerCase()} active:scale-95 transition-all`;
                                
                                if (isSelected && !isReveal) {
                                    btnClass += ' quiz-btn-selected';
                                } else if (isReveal) {
                                    if (i === correctAnswer) btnClass += ' quiz-btn-correct';
                                    else if (isSelected) btnClass += ' quiz-btn-wrong';
                                    else btnClass += ' opacity-40';
                                } else if (currentMyAnswer !== null) {
                                    btnClass += ' opacity-40';
                                }

                                const isDisabled = currentMyAnswer !== null;
                                const answerText = questions[currentQuestionIndex].options[i];
                                
                                return (
                                    <button 
                                        key={i} 
                                        type="button"
                                        onClick={() => sendAnswer(i)} 
                                        disabled={isDisabled} 
                                        className={btnClass}
                                    >
                                        <div className="quiz-btn-letter font-black">{lbl}</div>
                                        <div className="quiz-btn-text text-lg font-bold leading-tight">{answerText}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {status === 'MOVEMENT_PHASE' && (
                    <div className="text-center glass-card p-8 animate-pulse border-2 border-yellow-400">
                        <div className="text-6xl mb-4 animate-bounce">👀</div>
                        <h2 className="text-2xl font-black mb-2 text-yellow-400">Смотри на экран ТВ!</h2>
                        <p className="text-lg text-gray-200">Твоя фигурка смешно перепрыгивает на <span className="font-bold text-yellow-300">{myPlayer.roundScore || 0}</span> шага(ов)!</p>
                    </div>
                )}
                
                {status === 'ENDGAME' && (
                    <div className="text-center glass-card p-8 border-4 border-yellow-400">
                        <div className="text-7xl mb-4 animate-bounce">🏆</div>
                        <h2 className="text-3xl font-extrabold mb-3">Игра окончена</h2>
                        <p className="text-2xl font-bold">{gameState.winner === playerId ? 'ТЫ ПОБЕДИЛ! 🎉' : 'В следующий раз повезет!'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Роутер приложения
const App = () => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    const room = params.get('room');
    const db = params.get('db') ? decodeURIComponent(params.get('db')) : '';

    if (role === 'host' && room) return <TVApp roomId={room} dbUrl={db} />;
    if (role === 'player' && room) return <MobileApp roomId={room} dbUrl={db} />;
    return <StartScreen />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);