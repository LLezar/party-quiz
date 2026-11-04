// filename: app.js
const { useState, useEffect, useRef, useCallback, useMemo } = React;

const generateRoomId = () => Math.random().toString(36).substring(2, 6).toUpperCase();
const generatePlayerId = () => 'p_' + Math.random().toString(36).substring(2, 9);

// Генерация позиции для 50 клеток (сетка 10x5, змейка)
const getGridPos = (index) => {
    const safeIndex = Math.min(index, 49);
    const row = Math.floor(safeIndex / 10);
    const isEvenRow = row % 2 === 0;
    const col = isEvenRow ? (safeIndex % 10) : (9 - (safeIndex % 10));
    return { row: row + 1, col: col + 1 };
};

const EMOJI_AVATARS = ['😎', '🤪', '🤡', '👽', '🤖', '😺'];
const PLAYER_COLORS = ['#FF3B30', '#007AFF', '#34C759', '#FFCC00', '#AF52DE', '#FF9500'];

const Pawn = ({ color, avatar, isWalking, position }) => {
    const pos = getGridPos(position || 0);
    return (
        <div 
            className={`pawn-wrapper ${isWalking ? 'pawn-walking' : ''} absolute transition-all duration-500`}
            style={{ gridRow: pos.row, gridColumn: pos.col }}
        >
            <div className="pawn-selfie-head" style={{ '--player-color': color }}>
                {avatar && avatar.startsWith('data:') ? (
                    <img src={avatar} alt="head" className="w-full h-full object-cover rounded-full border-2 border-white" />
                ) : (
                    <span className="text-2xl">{avatar || '👤'}</span>
                )}
            </div>
            <div className="pawn-body" style={{ '--player-color': color }}></div>
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
                alert("Ошибка доступа к камере.");
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
        <div className="camera-modal fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
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

const StartScreen = () => {
    const [dbUrl, setDbUrl] = useState(localStorage.getItem('firebaseDbUrl') || '');

    const handleHost = () => {
        localStorage.setItem('firebaseDbUrl', dbUrl);
        const room = generateRoomId();
        const baseUrl = window.location.origin + window.location.pathname;
        window.location.href = `${baseUrl}?role=host&room=${room}&db=${encodeURIComponent(dbUrl)}`;
    };

    const handlePlayer = () => {
        localStorage.setItem('firebaseDbUrl', dbUrl);
        const room = prompt('Введите 4-значный код комнаты:');
        if (room) {
            const baseUrl = window.location.origin + window.location.pathname;
            window.location.href = `${baseUrl}?role=player&room=${room.trim().toUpperCase()}&db=${encodeURIComponent(dbUrl)}`;
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-4 tv-container">
            <div className="glass-card p-8 max-w-md w-full text-center space-y-6">
                <h1 className="text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-[#8B9A46] to-yellow-400 drop-shadow-md">
                    Party Board Quiz
                </h1>
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

const TVApp = ({ roomId, dbUrl }) => {
    const [gameState, setGameState] = useState(null);
    const [isAnimatingMove, setIsAnimatingMove] = useState(false);
    const [revealAnswer, setRevealAnswer] = useState(false);
    const [syncMessage, setSyncMessage] = useState('');
    const qrRef = useRef(null);

    const baseUrl = window.location.origin + window.location.pathname;
    const joinUrl = `${baseUrl}?role=player&room=${roomId}${dbUrl ? `&db=${encodeURIComponent(dbUrl)}` : ''}`;

    useEffect(() => {
        const handleSyncError = (msg) => setSyncMessage(msg || 'Используется локальный режим (вкладки)');

        try {
            window.GameSync.onError(handleSyncError);
            window.GameSync.onStateChange((newState) => setGameState(newState));
            
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

    // Генерация QR-кода строго после рендера DOM
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

    // Главный игровой цикл (Таймеры)
    useEffect(() => {
        if (!gameState) return;
        let timerId;
        const { status, timer } = gameState;

        if (timer > 0) {
            timerId = setTimeout(() => window.GameSync.updateState({ timer: timer - 1 }), 1000);
        } else if (timer === 0) {
            if (status === 'CATEGORY_SELECT') handleVoteEnd();
            else if (status === 'QUIZ' && !revealAnswer) handleQuestionEnd();
            else if (status === 'MOVEMENT_PHASE') handleMovementEnd();
        }

        return () => clearTimeout(timerId);
    }, [gameState?.status, gameState?.timer, revealAnswer]);

    // Запуск анимации движения при переходе в фазу
    useEffect(() => {
        if (gameState?.status === 'MOVEMENT_PHASE' && !isAnimatingMove) {
            executeBoardMovePhase();
        }
    }, [gameState?.status]);

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
            timer: 20, // Строго 20 секунд
            categoriesToVote: categories,
            players: resetPlayers,
            correctAnswer: null
        });
    };

    const handleVoteEnd = () => {
        const votes = {};
        Object.values(gameState.players).forEach(p => {
            if (p.currentVote) votes[p.currentVote] = (votes[p.currentVote] || 0) + 1;
        });
        
        let winnerCat = gameState.categoriesToVote[0].id;
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
                window.GameSync.updateState({ status: 'MOVEMENT_PHASE', timer: 15, correctAnswer: null });
                setRevealAnswer(false);
            }
        }, 4000);
    };

    const executeBoardMovePhase = async () => {
        setIsAnimatingMove(true);
        const currentPlayers = gameState.players;
        let maxScore = Math.max(0, ...Object.values(currentPlayers).map(p => p.roundScore || 0));
        if (maxScore === 0) maxScore = 1;

        let workingPlayers = JSON.parse(JSON.stringify(currentPlayers));

        for (let step = 1; step <= maxScore; step++) {
            let moved = false;
            for (let pid in workingPlayers) {
                if ((workingPlayers[pid].roundScore || 0) >= step) {
                    workingPlayers[pid].position = Math.min(49, (workingPlayers[pid].position || 0) + 1);
                    moved = true;
                }
            }
            if (moved) {
                window.GameSync.updateState({ players: workingPlayers });
                await new Promise(r => setTimeout(r, 700));
            }
        }
        setIsAnimatingMove(false);
    };

    const handleMovementEnd = () => {
        const winner = Object.values(gameState.players).find(p => p.position >= 49);
        if (winner) {
            window.GameSync.updateState({ status: 'ENDGAME', winner: winner.id });
        } else {
            startNewRound();
        }
    };

    if (!gameState) return <div className="flex items-center justify-center h-full text-2xl font-bold">Загрузка...</div>;

    const { status, players, timer, categoriesToVote, questions, currentQuestionIndex, correctAnswer } = gameState;
    const playersList = Object.values(players || {});

    return (
        <div className="tv-container relative w-full h-full flex flex-col p-6">
            <div className="absolute inset-0 p-8 opacity-30 z-0 pointer-events-none flex flex-col justify-center">
                <div className="board-grid grid grid-cols-10 gap-2 w-full h-full max-h-[70vh]">
                    {Array.from({ length: 50 }).map((_, i) => {
                        const pos = getGridPos(i);
                        return (
                            <div key={i} className={`board-cell ${i === 0 ? 'board-cell-start' : ''} ${i === 49 ? 'board-cell-finish' : ''} ${playersList.some(p => p.position === i) ? 'board-cell-active' : ''}`} style={{ gridRow: pos.row, gridColumn: pos.col }}>
                                {i === 0 ? 'START' : i === 49 ? 'WIN' : i}
                            </div>
                        );
                    })}
                    {playersList.map(p => <Pawn key={p.id} color={p.color} avatar={p.selfieBase64 || p.avatar} position={p.position} isWalking={isAnimatingMove} />)}
                </div>
            </div>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
                {status === 'LOBBY' && (
                    <div className="glass-card p-10 text-center max-w-2xl w-full">
                        <h2 className="text-5xl font-bold mb-6">Код комнаты: <span className="text-yellow-400">{roomId}</span></h2>
                        
                        <div className="flex flex-col items-center justify-center mb-8">
                            <div ref={qrRef} className="bg-white p-4 rounded-2xl inline-block shadow-lg min-w-[250px] min-h-[250px] flex items-center justify-center">
                                {/* QR код генерируется здесь */}
                            </div>
                            
                            {syncMessage && (
                                <div className="mt-4 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-300 text-sm font-bold">
                                    ⚠️ {syncMessage}
                                </div>
                            )}
                            
                            <div className="mt-4 w-full bg-black/40 p-3 rounded-lg border border-white/20">
                                <p className="text-xs text-gray-300 mb-1 uppercase tracking-wider">Прямая ссылка:</p>
                                <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 underline break-all text-sm font-mono block">
                                    {joinUrl}
                                </a>
                            </div>
                        </div>

                        <h3 className="text-2xl mb-4 font-bold">Игроки ({playersList.length}/4):</h3>
                        <div className="flex justify-center gap-6 mb-8 min-h-[100px]">
                            {playersList.length === 0 && <p className="text-gray-300">Ждем подключения...</p>}
                            {playersList.map(p => (
                                <div key={p.id} className="flex flex-col items-center">
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-4 mb-2 bg-white" style={{ borderColor: p.color }}>
                                        {p.selfieBase64 ? <img src={p.selfieBase64} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl text-black">{p.avatar}</div>}
                                    </div>
                                    <span className="font-bold">{p.name}</span>
                                </div>
                            ))}
                        </div>
                        <button onClick={startNewRound} disabled={playersList.length === 0} className={`primary-btn px-10 py-4 text-2xl ${playersList.length === 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>Начать игру</button>
                    </div>
                )}

                {status === 'CATEGORY_SELECT' && (
                    <div className="glass-card p-10 text-center max-w-3xl w-full">
                        <h2 className="text-4xl font-bold mb-2">Голосование за категорию</h2>
                        <p className="text-xl text-gray-200 mb-8">Смотрите в телефоны и выбирайте!</p>
                        <div className="w-full h-4 bg-gray-700 rounded-full mb-8 overflow-hidden"><div className="timer-bar" style={{ width: `${(timer / 20) * 100}%` }}></div></div>
                        <div className="grid grid-cols-3 gap-6 mb-8">
                            {categoriesToVote.map((cat, i) => (
                                <div key={i} className="glass-card p-6 bg-white/10 flex flex-col items-center">
                                    <span className="text-5xl mb-4">{cat.icon}</span>
                                    <h3 className="text-2xl font-bold mb-4">{cat.name}</h3>
                                    <div className="flex gap-2">
                                        {playersList.filter(p => p.currentVote === cat.id).map(p => (
                                            <div key={p.id} className="w-8 h-8 rounded-full border-2" style={{ borderColor: '#fff', backgroundColor: p.color }}></div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="text-4xl font-mono font-bold text-yellow-400">{timer} сек</div>
                    </div>
                )}

                {status === 'QUIZ' && questions[currentQuestionIndex] && (
                    <div className="glass-card p-10 text-center max-w-5xl w-full">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-2xl text-yellow-400 font-bold">Вопрос {currentQuestionIndex + 1} / 4</span>
                            <span className="text-4xl font-mono font-bold bg-white/20 px-6 py-2 rounded-xl">{timer}</span>
                        </div>
                        <h2 className="text-4xl font-bold mb-10 leading-tight">{questions[currentQuestionIndex].text}</h2>
                        <div className="grid grid-cols-2 gap-6">
                            {questions[currentQuestionIndex].options.map((opt, i) => {
                                const isCorrect = revealAnswer && i === correctAnswer;
                                const isWrong = revealAnswer && i !== correctAnswer;
                                const colorClass = i===0 ? 'quiz-btn-a' : i===1 ? 'quiz-btn-b' : i===2 ? 'quiz-btn-c' : 'quiz-btn-d';
                                return (
                                    <div key={i} className={`quiz-btn ${colorClass} ${isCorrect ? 'quiz-btn-correct' : ''} ${isWrong ? 'quiz-btn-wrong' : ''}`} style={{justifyContent: 'center'}}>
                                        <div className="quiz-btn-text text-center text-3xl">{opt}</div>
                                        {revealAnswer && (
                                            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                                                {playersList.filter(p => p.currentAnswer === i).map(p => (
                                                    <div key={p.id} className="w-12 h-12 rounded-full border-4 overflow-hidden shadow-lg" style={{ borderColor: p.color, backgroundColor: '#fff' }}>
                                                        {p.selfieBase64 ? <img src={p.selfieBase64} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl text-black">{p.avatar}</div>}
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

                {status === 'MOVEMENT_PHASE' && (
                    <div className="glass-card p-12 text-center animate-pulse border-4 border-yellow-400">
                        <h2 className="text-6xl font-bold text-yellow-400 mb-4">Движение!</h2>
                        <p className="text-2xl mt-4">Игроки шагают на количество правильных ответов...</p>
                        <div className="text-5xl font-mono font-bold mt-8">{timer}</div>
                    </div>
                )}

                {status === 'ENDGAME' && gameState.winner && players[gameState.winner] && (
                    <div className="glass-card p-16 text-center shadow-[0_0_80px_rgba(255,204,0,0.6)] border-4 border-yellow-400">
                        <h1 className="text-7xl font-bold mb-8 text-yellow-400 drop-shadow-lg">ПОБЕДИТЕЛЬ!</h1>
                        <div className="flex flex-col items-center">
                            <div className="w-56 h-56 rounded-full border-[10px] mb-6 animate-bounce" style={{ borderColor: players[gameState.winner].color, backgroundColor: '#fff' }}>
                                {players[gameState.winner].selfieBase64 ? 
                                    <img src={players[gameState.winner].selfieBase64} alt="winner" className="w-full h-full object-cover" /> : 
                                    <div className="w-full h-full flex items-center justify-center text-8xl text-black">{players[gameState.winner].avatar}</div>
                                }
                            </div>
                            <h2 className="text-6xl font-bold text-white">{players[gameState.winner].name}</h2>
                        </div>
                        <button onClick={() => window.location.href = '/'} className="mt-12 primary-btn bg-white/20 text-2xl px-10 py-4">В главное меню</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const MobileApp = ({ roomId, dbUrl }) => {
    const [gameState, setGameState] = useState(null);
    const [playerId, setPlayerId] = useState(localStorage.getItem('playerId') || null);
    const [isJoined, setIsJoined] = useState(false);
    const [syncMessage, setSyncMessage] = useState(null);
    
    const [name, setName] = useState('');
    const [color, setColor] = useState(PLAYER_COLORS[0]);
    const [avatar, setAvatar] = useState(null);
    const [selfieBase64, setSelfieBase64] = useState(null);
    const [showCameraModal, setShowCameraModal] = useState(false);

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

    const handleSavePhoto = (base64) => {
        setSelfieBase64(base64);
        setAvatar(null);
    };

    const handleJoin = () => {
        if (!name.trim()) return alert("Введите имя!");
        if (!avatar && !selfieBase64) return alert("Сделайте селфи или выберите эмодзи!");
        
        const newId = playerId || generatePlayerId();
        setPlayerId(newId);
        localStorage.setItem('playerId', newId);

        window.GameSync.joinGame({
            id: newId,
            name,
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
        if (!gameState?.players[playerId] || gameState.players[playerId].currentVote) return;
        window.GameSync.sendAction('vote', { categoryId: catId });
    };

    const sendAnswer = (index) => {
        if (!gameState?.players[playerId] || gameState.players[playerId].currentAnswer !== null) return;
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
                
                <div className="glass-card w-full max-w-sm space-y-6 mt-4">
                    <h2 className="text-3xl font-bold text-center mb-4">Вход в игру</h2>
                    <div className="flex flex-col items-center gap-4">
                        <div className="camera-preview-container relative w-32 h-32 rounded-full overflow-hidden flex items-center justify-center bg-black/50" style={{ borderColor: color, borderWidth: '4px' }}>
                            {!avatar && !selfieBase64 && <div className="absolute inset-0 flex items-center justify-center text-5xl">👤</div>}
                            {selfieBase64 && <img src={selfieBase64} alt="avatar" className="w-full h-full object-cover" />}
                            {avatar && <div className="w-full h-full bg-white flex items-center justify-center text-6xl text-black">{avatar}</div>}
                        </div>
                        
                        <button onClick={() => setShowCameraModal(true)} className="primary-btn bg-yellow-500 hover:bg-yellow-600 text-black w-full font-bold">📸 Сделать селфи</button>
                        
                        <div className="text-sm text-gray-300">или выберите эмодзи:</div>
                        <div className="flex gap-2 flex-wrap justify-center">
                            {EMOJI_AVATARS.map(em => (
                                <button key={em} onClick={() => { setAvatar(em); setSelfieBase64(null); }} className="text-3xl hover:scale-125 transition-transform bg-white/10 p-2 rounded-lg">{em}</button>
                            ))}
                        </div>
                    </div>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ваше имя" maxLength="10" className="w-full p-4 rounded-xl bg-black/40 border border-white/30 text-center text-xl font-bold outline-none focus:border-[#8B9A46]" />
                    <div className="flex justify-center gap-3 flex-wrap">
                        {PLAYER_COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={`w-12 h-12 rounded-full border-4 transition-transform ${color === c ? 'scale-125 border-white' : 'border-transparent'}`} style={{ backgroundColor: c }}></button>)}
                    </div>
                    <button onClick={handleJoin} className="primary-btn w-full mt-4 text-xl py-4">Войти в игру</button>
                </div>
            </div>
        );
    }

    const { status, timer, categoriesToVote, questions, currentQuestionIndex, correctAnswer } = gameState;
    const myPlayer = gameState.players[playerId];

    return (
        <div className="mobile-container relative flex flex-col h-full p-4 pt-8">
            {renderSyncWarning()}
            <div className="glass-card p-3 mb-4 flex items-center justify-between !py-2 !px-4 !rounded-2xl">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 overflow-hidden bg-white" style={{ borderColor: myPlayer.color }}>
                         {myPlayer.selfieBase64 ? <img src={myPlayer.selfieBase64} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl text-black">{myPlayer.avatar}</div>}
                    </div>
                    <span className="font-bold text-xl">{myPlayer.name}</span>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-300">Клетка</div>
                    <div className="font-mono text-2xl font-bold" style={{ color: myPlayer.color }}>{myPlayer.position}</div>
                </div>
            </div>
            <div className="flex-1 flex flex-col justify-center">
                {status === 'LOBBY' && (
                    <div className="text-center glass-card p-8"><div className="text-7xl mb-6 animate-spin inline-block">⏳</div><h2 className="text-3xl font-bold mb-4">Вы в игре!</h2><p className="text-xl text-gray-200">Смотрите на экран ТВ и ждите старта.</p></div>
                )}
                
                {status === 'CATEGORY_SELECT' && (
                    <div className="flex flex-col gap-4 h-full justify-center">
                        <h2 className="text-3xl font-bold text-center mb-6">Голосуй за тему!</h2>
                        {categoriesToVote.map(cat => (
                            <button key={cat.id} onClick={() => sendVote(cat.id)} disabled={!!myPlayer.currentVote} className={`glass-card flex items-center gap-4 text-2xl font-bold w-full p-6 transition-all ${myPlayer.currentVote === cat.id ? 'border-[#8B9A46] shadow-[0_0_20px_rgba(139,154,70,0.8)] scale-105 bg-[#8B9A46]/20' : ''} ${myPlayer.currentVote && myPlayer.currentVote !== cat.id ? 'opacity-50 grayscale' : 'hover:bg-white/10'}`}>
                                <span className="text-5xl">{cat.icon}</span>{cat.name}
                            </button>
                        ))}
                    </div>
                )}
                
                {status === 'QUIZ' && questions[currentQuestionIndex] && (
                    <div className="flex flex-col h-full">
                        <div className="text-center mb-6"><div className="text-xl text-yellow-400 font-bold mb-2">Вопрос {currentQuestionIndex + 1}</div><div className="text-5xl font-mono font-bold">{timer}</div></div>
                        <div className="grid grid-cols-1 gap-4 flex-1 pb-8">
                            {['A', 'B', 'C', 'D'].map((lbl, i) => {
                                const isSelected = myPlayer.currentAnswer === i;
                                const isReveal = correctAnswer !== null;
                                
                                let btnClass = `quiz-btn quiz-btn-${lbl.toLowerCase()}`;
                                
                                if (isSelected && !isReveal) {
                                    btnClass += ' quiz-btn-selected';
                                } else if (isReveal) {
                                    if (i === correctAnswer) btnClass += ' quiz-btn-correct';
                                    else if (isSelected) btnClass += ' quiz-btn-wrong';
                                    else btnClass += ' opacity-40';
                                } else if (myPlayer.currentAnswer !== null) {
                                    btnClass += ' opacity-40';
                                }

                                const isDisabled = myPlayer.currentAnswer !== null;
                                const answerText = questions[currentQuestionIndex].options[i];
                                
                                return (
                                    <button key={i} onClick={() => sendAnswer(i)} disabled={isDisabled} className={btnClass}>
                                        <div className="quiz-btn-letter">{lbl}</div>
                                        <div className="quiz-btn-text text-xl">{answerText}</div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}
                
                {status === 'MOVEMENT_PHASE' && (
                    <div className="text-center glass-card p-10 animate-pulse border-2 border-yellow-400"><div className="text-7xl mb-6">👀</div><h2 className="text-3xl font-bold mb-4">Смотри на ТВ!</h2><p className="text-xl text-gray-200 mt-2">Твоя фигурка делает {myPlayer.roundScore || 0} шагов.</p></div>
                )}
                
                {status === 'ENDGAME' && (
                    <div className="text-center glass-card p-10 border-4 border-yellow-400"><div className="text-7xl mb-6 animate-bounce">🏆</div><h2 className="text-4xl font-bold mb-4">Игра окончена</h2><p className="text-2xl">{gameState.winner === playerId ? 'ТЫ ПОБЕДИЛ! 🎉' : 'В следующий раз повезет!'}</p></div>
                )}
            </div>
        </div>
    );
};

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