// filename: app.js
const { useState, useEffect, useRef, useCallback, useMemo } = React;

// Генерация только из букв и цифр для безопасности путей БД
const generateRoomId = () => Math.random().toString(36).substring(2, 6).toUpperCase();
const generatePlayerId = () => 'p_' + Math.random().toString(36).substring(2, 9);

const getGridPos = (index) => {
    const row = Math.floor(index / 6);
    const isEvenRow = row % 2 === 0;
    const col = isEvenRow ? (index % 6) : (5 - (index % 6));
    return { row: row + 1, col: col + 1 };
};

const EMOJI_AVATARS = ['😎', '🤪', '🤡', '👽', '🤖', '😺'];
const PLAYER_COLORS = ['#FF3B30', '#007AFF', '#34C759', '#FFCC00', '#AF52DE', '#FF9500'];

const Pawn = ({ color, avatar, isWalking, position }) => {
    const pos = getGridPos(position || 0);
    return (
        <div 
            className={`pawn-wrapper ${isWalking ? 'pawn-walking' : ''} absolute`}
            style={{ gridRow: pos.row, gridColumn: pos.col }}
        >
            <div className="pawn-selfie-head" style={{ '--player-color': color }}>
                {avatar && avatar.startsWith('data:') ? (
                    <img src={avatar} alt="head" className="w-full h-full object-cover rounded-full" />
                ) : (
                    <span>{avatar || '👤'}</span>
                )}
            </div>
            <div className="pawn-body" style={{ '--player-color': color }}></div>
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
                <h1 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">
                    Party Board Quiz
                </h1>
                <div className="text-left">
                    <label className="block text-sm mb-2 text-gray-300">Firebase DB URL (опционально, для сети):</label>
                    <input 
                        type="text" value={dbUrl} onChange={e => setDbUrl(e.target.value)} 
                        placeholder="https://your-db.firebaseio.com"
                        className="w-full p-3 rounded-xl bg-black/30 border border-white/20 text-white outline-none focus:border-pink-500 transition-colors"
                    />
                </div>
                <div className="space-y-4 pt-4">
                    <button onClick={handleHost} className="primary-btn w-full py-4 text-xl shadow-lg">Создать игру (ТВ)</button>
                    <button onClick={handlePlayer} className="w-full py-4 rounded-xl text-xl font-bold bg-white/10 hover:bg-white/20 border border-white/20 transition-colors">Присоединиться (Телефон)</button>
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

    useEffect(() => {
        const handleSyncError = (msg) => setSyncMessage(msg || 'Используется локальный режим (вкладки)');

        try {
            // Подписываемся ДО init, чтобы не пропустить моментальные ошибки инициализации
            window.GameSync.onError(handleSyncError);
            window.GameSync.onStateChange((newState) => setGameState(newState));
            
            window.GameSync.init('host', roomId, dbUrl);

            window.GameSync.updateState({
                status: 'lobby',
                roomId: roomId,
                players: {},
                round: { categoriesToVote: [], selectedCategory: null, questions: [], currentQuestionIndex: 0, timer: 0, correctAnswer: null },
                winner: null
            });
        } catch (err) {
            setSyncMessage('Ошибка инициализации. Работаем локально.');
        }
    }, [roomId, dbUrl]);

    useEffect(() => {
        if (!gameState) return;
        let timerId;
        const { status, round } = gameState;

        if (status === 'voting' && round.timer > 0) {
            timerId = setTimeout(() => window.GameSync.updateState({ round: { ...round, timer: round.timer - 1 } }), 1000);
        } else if (status === 'voting' && round.timer === 0) {
            handleVoteEnd();
        } else if (status === 'quiz' && round.timer > 0 && !revealAnswer) {
            timerId = setTimeout(() => window.GameSync.updateState({ round: { ...round, timer: round.timer - 1 } }), 1000);
        } else if (status === 'quiz' && round.timer === 0 && !revealAnswer) {
            handleQuestionEnd();
        }

        return () => clearTimeout(timerId);
    }, [gameState?.status, gameState?.round?.timer, revealAnswer]);

    const startNewRound = () => {
        const categories = window.QuestionBank.getCategories(3);
        const resetPlayers = { ...gameState.players };
        Object.keys(resetPlayers).forEach(pid => {
            resetPlayers[pid].currentVote = null;
            resetPlayers[pid].currentAnswer = null;
        });

        window.GameSync.updateState({
            status: 'voting',
            players: resetPlayers,
            round: { categoriesToVote: categories, selectedCategory: null, questions: [], currentQuestionIndex: 0, timer: 10, correctAnswer: null }
        });
    };

    const handleVoteEnd = () => {
        const votes = {};
        Object.values(gameState.players).forEach(p => {
            if (p.currentVote) votes[p.currentVote] = (votes[p.currentVote] || 0) + 1;
        });
        
        let winnerCat = gameState.round.categoriesToVote[0].id;
        let maxVotes = 0;
        for (const [cat, count] of Object.entries(votes)) {
            if (count > maxVotes) { maxVotes = count; winnerCat = cat; }
        }

        const questions = window.QuestionBank.getQuestions(winnerCat, 4);
        window.GameSync.updateState({
            status: 'quiz',
            round: { ...gameState.round, selectedCategory: winnerCat, questions, currentQuestionIndex: 0, timer: 15, correctAnswer: null }
        });
        setRevealAnswer(false);
    };

    const handleQuestionEnd = () => {
        setRevealAnswer(true);
        const currentQ = gameState.round.questions[gameState.round.currentQuestionIndex];
        const updatedPlayers = { ...gameState.players };
        
        Object.keys(updatedPlayers).forEach(pid => {
            if (updatedPlayers[pid].currentAnswer === currentQ.correctIndex) {
                updatedPlayers[pid].roundScore = (updatedPlayers[pid].roundScore || 0) + 1;
            }
        });

        window.GameSync.updateState({ 
            players: updatedPlayers,
            round: { ...gameState.round, correctAnswer: currentQ.correctIndex }
        });

        setTimeout(() => {
            const nextIndex = gameState.round.currentQuestionIndex + 1;
            if (nextIndex < 4) {
                const resetAnswersPlayers = { ...updatedPlayers };
                Object.keys(resetAnswersPlayers).forEach(pid => resetAnswersPlayers[pid].currentAnswer = null);
                window.GameSync.updateState({ players: resetAnswersPlayers, round: { ...gameState.round, currentQuestionIndex: nextIndex, timer: 15, correctAnswer: null } });
                setRevealAnswer(false);
            } else {
                window.GameSync.updateState({ status: 'moving' });
                executeBoardMovePhase(updatedPlayers);
            }
        }, 4000);
    };

    const executeBoardMovePhase = async (currentPlayers) => {
        setIsAnimatingMove(true);
        let maxScore = Math.max(0, ...Object.values(currentPlayers).map(p => p.roundScore || 0));
        if (maxScore === 0) maxScore = 1;

        let workingPlayers = JSON.parse(JSON.stringify(currentPlayers));

        for (let step = 1; step <= maxScore; step++) {
            let moved = false;
            for (let pid in workingPlayers) {
                if ((workingPlayers[pid].roundScore || 0) >= step) {
                    workingPlayers[pid].position = Math.min(25, (workingPlayers[pid].position || 0) + 1);
                    moved = true;
                }
            }
            if (moved) {
                window.GameSync.updateState({ players: workingPlayers });
                await new Promise(r => setTimeout(r, 700));
            }
        }

        setIsAnimatingMove(false);
        const winner = Object.values(workingPlayers).find(p => p.position >= 25);
        
        if (winner) {
            window.GameSync.updateState({ status: 'finished', winner: winner.id });
        } else {
            for (let pid in workingPlayers) { workingPlayers[pid].roundScore = 0; }
            window.GameSync.updateState({ players: workingPlayers });
            startNewRound();
        }
    };

    if (!gameState) return <div className="flex items-center justify-center h-full text-2xl">Загрузка...</div>;

    const { status, players, round } = gameState;
    const playersList = Object.values(players || {});
    
    // Формирование правильного URL без дублирования путей
    const baseUrl = window.location.origin + window.location.pathname;
    const joinUrl = `${baseUrl}?role=player&room=${roomId}${dbUrl ? `&db=${encodeURIComponent(dbUrl)}` : ''}`;

    return (
        <div className="tv-container relative w-full h-full flex flex-col p-6">
            <div className="absolute inset-0 p-8 opacity-40 z-0 pointer-events-none flex flex-col justify-center">
                <div className="board-grid">
                    {Array.from({ length: 26 }).map((_, i) => {
                        const pos = getGridPos(i);
                        return (
                            <div key={i} className={`board-cell ${i === 0 ? 'board-cell-start' : ''} ${i === 25 ? 'board-cell-finish' : ''} ${playersList.some(p => p.position === i) ? 'board-cell-active' : ''}`} style={{ gridRow: pos.row, gridColumn: pos.col }}>
                                {i === 0 ? 'START' : i === 25 ? 'WIN' : i}
                            </div>
                        );
                    })}
                    {playersList.map(p => <Pawn key={p.id} color={p.color} avatar={p.avatar} position={p.position} isWalking={isAnimatingMove} />)}
                </div>
            </div>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
                {status === 'lobby' && (
                    <div className="glass-card p-10 text-center max-w-2xl w-full">
                        <h2 className="text-5xl font-bold mb-6">Код комнаты: <span className="text-pink-400">{roomId}</span></h2>
                        
                        <div className="flex flex-col items-center justify-center mb-8">
                            <div className="bg-white p-4 rounded-2xl inline-block shadow-lg">
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(joinUrl)}`} alt="QR" className="w-48 h-48" />
                            </div>
                            
                            {syncMessage && (
                                <div className="mt-4 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-300 text-sm font-bold">
                                    ⚠️ {syncMessage}
                                </div>
                            )}
                            
                            <div className="mt-4 w-full bg-black/30 p-3 rounded-lg border border-white/10">
                                <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Прямая ссылка для теста в браузере:</p>
                                <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline break-all text-sm font-mono block">
                                    {joinUrl}
                                </a>
                            </div>
                        </div>

                        <h3 className="text-2xl mb-4">Игроки ({playersList.length}/4):</h3>
                        <div className="flex justify-center gap-6 mb-8 min-h-[100px]">
                            {playersList.length === 0 && <p className="text-gray-400">Ждем подключения...</p>}
                            {playersList.map(p => (
                                <div key={p.id} className="flex flex-col items-center">
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-4 mb-2 bg-white" style={{ borderColor: p.color }}>
                                        {p.avatar && p.avatar.startsWith('data:') ? <img src={p.avatar} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl text-black">{p.avatar}</div>}
                                    </div>
                                    <span className="font-bold">{p.name}</span>
                                </div>
                            ))}
                        </div>
                        <button onClick={startNewRound} disabled={playersList.length === 0} className={`primary-btn px-10 py-4 text-2xl ${playersList.length === 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>Начать игру</button>
                    </div>
                )}

                {status === 'voting' && (
                    <div className="glass-card p-10 text-center max-w-3xl w-full">
                        <h2 className="text-4xl font-bold mb-2">Голосование за категорию</h2>
                        <p className="text-xl text-gray-300 mb-8">Смотрите в телефоны и выбирайте!</p>
                        <div className="w-full h-4 bg-gray-700 rounded-full mb-8 overflow-hidden"><div className="timer-bar" style={{ width: `${(round.timer / 10) * 100}%` }}></div></div>
                        <div className="grid grid-cols-3 gap-6 mb-8">
                            {round.categoriesToVote.map((cat, i) => (
                                <div key={i} className="glass-card p-6 bg-white/5 flex flex-col items-center">
                                    <span className="text-4xl mb-4">{cat.icon}</span>
                                    <h3 className="text-2xl font-bold mb-4">{cat.name}</h3>
                                    <div className="flex gap-2">
                                        {playersList.filter(p => p.currentVote === cat.id).map(p => (
                                            <div key={p.id} className="w-8 h-8 rounded-full border-2" style={{ borderColor: p.color, backgroundColor: p.color }}></div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="text-3xl font-mono">{round.timer} сек</div>
                    </div>
                )}

                {status === 'quiz' && round.questions[round.currentQuestionIndex] && (
                    <div className="glass-card p-10 text-center max-w-5xl w-full">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-xl text-pink-400 font-bold">Вопрос {round.currentQuestionIndex + 1} / 4</span>
                            <span className="text-3xl font-mono bg-white/10 px-4 py-2 rounded-lg">{round.timer}</span>
                        </div>
                        <h2 className="text-4xl font-bold mb-10 leading-tight">{round.questions[round.currentQuestionIndex].text}</h2>
                        <div className="grid grid-cols-2 gap-6">
                            {round.questions[round.currentQuestionIndex].options.map((opt, i) => {
                                const isCorrect = revealAnswer && i === round.correctAnswer;
                                const isWrong = revealAnswer && i !== round.correctAnswer;
                                const colorClass = i===0 ? 'quiz-btn-a' : i===1 ? 'quiz-btn-b' : i===2 ? 'quiz-btn-c' : 'quiz-btn-d';
                                return (
                                    <div key={i} className={`quiz-btn ${colorClass} ${isCorrect ? 'quiz-btn-correct' : ''} ${isWrong ? 'quiz-btn-wrong' : ''}`} style={{justifyContent: 'center'}}>
                                        <div className="quiz-btn-text text-center text-2xl">{opt}</div>
                                        {revealAnswer && (
                                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-20">
                                                {playersList.filter(p => p.currentAnswer === i).map(p => (
                                                    <div key={p.id} className="w-10 h-10 rounded-full border-2 overflow-hidden shadow-md" style={{ borderColor: p.color, backgroundColor: '#fff' }}>
                                                        {p.avatar.startsWith('data:') ? <img src={p.avatar} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl text-black">{p.avatar}</div>}
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

                {status === 'moving' && (
                    <div className="glass-card p-8 text-center animate-pulse">
                        <h2 className="text-5xl font-bold text-yellow-400">Движение!</h2>
                        <p className="text-xl mt-4">Игроки шагают на количество правильных ответов...</p>
                    </div>
                )}

                {status === 'finished' && gameState.winner && players[gameState.winner] && (
                    <div className="glass-card p-16 text-center shadow-[0_0_50px_rgba(255,190,11,0.5)]">
                        <h1 className="text-6xl font-bold mb-8 text-yellow-400">ПОБЕДИТЕЛЬ!</h1>
                        <div className="flex flex-col items-center">
                            <div className="w-48 h-48 rounded-full border-8 mb-6 animate-bounce" style={{ borderColor: players[gameState.winner].color, backgroundColor: '#fff' }}>
                                {players[gameState.winner].avatar.startsWith('data:') ? 
                                    <img src={players[gameState.winner].avatar} alt="winner" className="w-full h-full object-cover" /> : 
                                    <div className="w-full h-full flex items-center justify-center text-7xl text-black">{players[gameState.winner].avatar}</div>
                                }
                            </div>
                            <h2 className="text-5xl font-bold">{players[gameState.winner].name}</h2>
                        </div>
                        <button onClick={() => window.location.href = '/'} className="mt-12 primary-btn bg-white/20">В главное меню</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const MobileApp = ({ roomId, dbUrl }) => {
    const [gameState, setGameState] = useState(null);
    const [playerId, setPlayerId] = useState(sessionStorage.getItem('playerId') || null);
    const [isJoined, setIsJoined] = useState(false);
    const [syncMessage, setSyncMessage] = useState(null);
    
    const [name, setName] = useState('');
    const [color, setColor] = useState(PLAYER_COLORS[0]);
    const [avatar, setAvatar] = useState(null);
    const videoRef = useRef(null);
    const [cameraActive, setCameraActive] = useState(false);

    useEffect(() => {
        const handleSyncError = (msg) => setSyncMessage(msg || 'Включен режим локальных вкладок');

        try {
            // Подписываемся ДО init
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

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setCameraActive(true);
            }
        } catch (e) {
            console.error("Camera error:", e);
            alert("Камера недоступна. Выберите эмодзи.");
        }
    };

    const takeSelfie = async () => {
        try {
            if (window.captureSelfie) {
                const base64 = await window.captureSelfie(videoRef.current);
                setAvatar(base64);
            } else {
                throw new Error("captureSelfie not found");
            }
            
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(t => t.stop());
            }
            setCameraActive(false);
        } catch (e) {
            console.error("Capture error:", e);
            alert("Не удалось сделать фото. Выберите эмодзи из списка ниже.");
        }
    };

    const handleJoin = () => {
        if (!name.trim()) return alert("Введите имя!");
        if (!avatar) return alert("Сделайте селфи или выберите эмодзи!");
        
        const newId = playerId || generatePlayerId();
        setPlayerId(newId);
        sessionStorage.setItem('playerId', newId);

        window.GameSync.joinGame({
            id: newId,
            name,
            color,
            avatar,
            position: 0,
            roundScore: 0,
            currentVote: null,
            currentAnswer: null,
            isReady: true
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
                <div className="glass-card w-full max-w-sm space-y-6 mt-4">
                    <h2 className="text-3xl font-bold text-center mb-4">Вход в игру</h2>
                    <div className="flex flex-col items-center gap-4">
                        <div className="camera-preview-container relative w-32 h-32 rounded-full overflow-hidden flex items-center justify-center" style={{ borderColor: color, borderWidth: '4px', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                            {!cameraActive && !avatar && <div className="absolute inset-0 flex items-center justify-center text-5xl">👤</div>}
                            {cameraActive && <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />}
                            {avatar && !cameraActive && (avatar.startsWith('data:') ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white flex items-center justify-center text-6xl text-black">{avatar}</div>)}
                        </div>
                        {!avatar && !cameraActive && <button onClick={startCamera} className="primary-btn text-sm px-4 py-2">Включить камеру</button>}
                        {cameraActive && <button onClick={takeSelfie} className="primary-btn bg-pink-600 hover:bg-pink-700 w-full">📸 Сделать селфи!</button>}
                        <div className="flex gap-2 mt-2">
                            {EMOJI_AVATARS.map(em => <button key={em} onClick={() => { setAvatar(em); setCameraActive(false); }} className="text-2xl hover:scale-125 transition-transform bg-white/10 p-2 rounded-lg">{em}</button>)}
                        </div>
                    </div>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ваше имя" maxLength="10" className="w-full p-4 rounded-xl bg-black/30 border border-white/20 text-center text-xl font-bold outline-none focus:border-pink-500" />
                    <div className="flex justify-center gap-3 flex-wrap">
                        {PLAYER_COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={`w-10 h-10 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-white' : 'border-transparent'}`} style={{ backgroundColor: c }}></button>)}
                    </div>
                    <button onClick={handleJoin} className="primary-btn w-full mt-4">Войти в игру</button>
                </div>
            </div>
        );
    }

    const { status, round } = gameState;
    const myPlayer = gameState.players[playerId];

    return (
        <div className="mobile-container relative flex flex-col h-full p-4 pt-8">
            {renderSyncWarning()}
            <div className="glass-card p-3 mb-4 flex items-center justify-between !py-2 !px-4 !rounded-2xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 overflow-hidden bg-white" style={{ borderColor: myPlayer.color }}>
                         {myPlayer.avatar.startsWith('data:') ? <img src={myPlayer.avatar} alt="avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl text-black">{myPlayer.avatar}</div>}
                    </div>
                    <span className="font-bold text-lg">{myPlayer.name}</span>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-400">Клетка</div>
                    <div className="font-mono text-xl font-bold" style={{ color: myPlayer.color }}>{myPlayer.position}</div>
                </div>
            </div>
            <div className="flex-1 flex flex-col justify-center">
                {status === 'lobby' && (
                    <div className="text-center glass-card"><div className="text-6xl mb-4 animate-spin inline-block">⏳</div><h2 className="text-2xl font-bold mb-2">Вы в игре!</h2><p className="text-gray-300">Смотрите на экран ТВ и ждите старта.</p></div>
                )}
                {status === 'voting' && (
                    <div className="flex flex-col gap-4 h-full justify-center">
                        <h2 className="text-2xl font-bold text-center mb-4">Голосуй за тему!</h2>
                        {round.categoriesToVote.map(cat => (
                            <button key={cat.id} onClick={() => sendVote(cat.id)} disabled={!!myPlayer.currentVote} className={`glass-card flex items-center gap-4 text-xl font-bold w-full transition-all ${myPlayer.currentVote === cat.id ? 'border-pink-500 shadow-[0_0_20px_rgba(255,0,127,0.5)] scale-105' : ''} ${myPlayer.currentVote && myPlayer.currentVote !== cat.id ? 'opacity-50 grayscale' : 'hover:bg-white/10'}`}>
                                <span className="text-3xl">{cat.icon}</span>{cat.name}
                            </button>
                        ))}
                    </div>
                )}
                {status === 'quiz' && (
                    <div className="flex flex-col h-full">
                        <div className="text-center mb-6"><div className="text-lg text-pink-400">Вопрос {round.currentQuestionIndex + 1}</div><div className="text-4xl font-mono font-bold">{round.timer}</div></div>
                        <div className="grid grid-cols-1 gap-4 flex-1 pb-8">
                            {['A', 'B', 'C', 'D'].map((lbl, i) => {
                                const colorClass = i===0 ? 'quiz-btn-a' : i===1 ? 'quiz-btn-b' : i===2 ? 'quiz-btn-c' : 'quiz-btn-d';
                                const isSelected = myPlayer.currentAnswer === i;
                                const isDisabled = myPlayer.currentAnswer !== null;
                                const answerText = round.questions[round.currentQuestionIndex]?.options[i] || "";
                                
                                return (
                                    <button key={i} onClick={() => sendAnswer(i)} disabled={isDisabled} className={`quiz-btn ${colorClass} ${isSelected ? 'quiz-btn-selected' : ''} ${isDisabled && !isSelected ? 'quiz-btn-wrong opacity-40' : ''}`}>
                                        <div className="quiz-btn-letter">{lbl}</div>
                                        <div className="quiz-btn-text">{answerText}</div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}
                {status === 'moving' && (
                    <div className="text-center glass-card animate-pulse"><div className="text-6xl mb-4">👀</div><h2 className="text-2xl font-bold">Смотри на ТВ!</h2><p className="text-gray-300 mt-2">Твоя фигурка делает {myPlayer.roundScore || 0} шагов.</p></div>
                )}
                {status === 'finished' && (
                    <div className="text-center glass-card"><div className="text-6xl mb-4">🏆</div><h2 className="text-3xl font-bold mb-2">Игра окончена</h2><p>{gameState.winner === playerId ? 'ТЫ ПОБЕДИЛ! 🎉' : 'В следующий раз повезет!'}</p></div>
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