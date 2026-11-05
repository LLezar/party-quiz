// filename: app.js
const { useState, useEffect, useRef, useCallback, useMemo } = React;

const TOTAL_CELLS = 25; // Индексы 0..24 в сетке 5x5
const GRID_SIZE = 5;

const generateRoomId = () => Math.random().toString(36).substring(2, 6).toUpperCase();
const generatePlayerId = () => 'p_' + Math.random().toString(36).substring(2, 9);

// Змейка 5x5 (0..24)
const getGridPos = (index) => {
    const safeIndex = Math.max(0, Math.min(index, TOTAL_CELLS - 1));
    const row = Math.floor(safeIndex / GRID_SIZE);
    const isEvenRow = row % 2 === 0;
    const col = isEvenRow ? (safeIndex % GRID_SIZE) : (GRID_SIZE - 1 - (safeIndex % GRID_SIZE));
    return { row: row + 1, col: col + 1 };
};

const EMOJI_AVATARS = ['😎', '🤪', '🤡', '👽', '🤖', '😺', '🤠', '🦊'];
const PLAYER_COLORS = ['#FF3B30', '#007AFF', '#34C759', '#FFCC00', '#AF52DE', '#FF9500'];

const isSafeImageSrc = (src) => {
    if (!src || typeof src !== 'string') return false;
    return src.startsWith('data:image/') || src.startsWith('https://');
};

const getSortedStandings = (playersObj) => {
    const list = Object.values(playersObj || {});
    return list.sort((a, b) => {
        const posDiff = (b.position || 0) - (a.position || 0);
        if (posDiff !== 0) return posDiff;
        return (b.score || 0) - (a.score || 0);
    });
};

// Смещение фишек, если на одной клетке несколько игроков
const getPawnOffset = (indexInCell, totalInCell) => {
    if (totalInCell <= 1) return { x: 0, y: 0, scale: 1 };
    if (totalInCell === 2) {
        return { x: indexInCell === 0 ? -22 : 22, y: 0, scale: 0.9 };
    }
    if (totalInCell === 3) {
        const offsets = [
            { x: -22, y: -12 },
            { x: 22, y: -12 },
            { x: 0, y: 16 }
        ];
        return { ...(offsets[indexInCell] || { x: 0, y: 0 }), scale: 0.85 };
    }
    const offsets = [
        { x: -22, y: -16 },
        { x: 22, y: -16 },
        { x: -22, y: 16 },
        { x: 22, y: 16 },
        { x: 0, y: -22 },
        { x: 0, y: 22 }
    ];
    return { ...(offsets[indexInCell % offsets.length] || { x: 0, y: 0 }), scale: 0.8 };
};

const Pawn = ({ color, selfie, isWalking, position, offsetIndex = 0, totalOnCell = 1 }) => {
    const pos = getGridPos(position || 0);
    const { x, y, scale } = getPawnOffset(offsetIndex, totalOnCell);

    return (
        <div 
            className={`pawn-wrapper ${isWalking ? 'pawn-walking' : ''} absolute pointer-events-none transition-all duration-300 z-20 flex flex-col items-center justify-center`}
            style={{ 
                gridRow: pos.row, 
                gridColumn: pos.col,
                '--player-color': color,
                transform: `translate(${x}px, ${y}px) scale(${scale})`,
                zIndex: 20 + offsetIndex
            }}
        >
            <div className="pawn-selfie-head" style={{ '--player-color': color, borderColor: color }}>
                {isSafeImageSrc(selfie) ? (
                    <img src={selfie} alt="head" className="w-full h-full object-cover rounded-full" />
                ) : (
                    <span className="text-3xl select-none">{selfie || '👤'}</span>
                )}
            </div>
            <div className="pawn-body" style={{ '--player-color': color, backgroundColor: color }}></div>
        </div>
    );
};

const CameraModal = ({ isOpen, onClose, onSave }) => {
    const videoRef = useRef(null);
    const onCloseRef = useRef(onClose);
    const [photo, setPhoto] = useState(null);
    const [isVideoReady, setIsVideoReady] = useState(false);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        let stream = null;
        let isCancelled = false;

        if (isOpen && !photo) {
            setIsVideoReady(false);
            navigator.mediaDevices?.getUserMedia({ 
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } } 
            }).then(s => {
                if (isCancelled) {
                    s.getTracks().forEach(track => track.stop());
                    return;
                }
                stream = s;
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                }
            }).catch(err => {
                console.error("Camera access error:", err);
                alert("Ошибка доступа к камере. Пожалуйста, выберите эмодзи.");
                if (onCloseRef.current) onCloseRef.current();
            });
        }

        return () => {
            isCancelled = true;
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [isOpen, photo]);

    if (!isOpen) return null;

    const handleTake = async () => {
        const videoEl = videoRef.current;
        if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0) {
            return; // Ждем полной инициализации кадра, чтобы избежать черного фото
        }
        try {
            if (window.captureSelfie) {
                const base64 = await window.captureSelfie(videoEl);
                setPhoto(base64);
            } else {
                const canvas = document.createElement('canvas');
                canvas.width = 120;
                canvas.height = 120;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(videoEl, 0, 0, 120, 120);
                setPhoto(canvas.toDataURL('image/jpeg', 0.65));
            }
        } catch (e) {
            console.error(e);
            alert("Не удалось сделать снимок");
        }
    };

    const handleRetake = () => setPhoto(null);
    const handleSave = () => { onSave(photo); onClose(); };

    return (
        <div className="camera-modal fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
            <div className="glass-card p-5 flex flex-col items-center max-w-sm w-full relative">
                <button onClick={onClose} className="absolute top-3 right-4 text-white text-3xl font-bold">&times;</button>
                <h3 className="text-xl font-bold mb-4 text-white">Сделайте селфи</h3>
                <div className="camera-video-preview w-60 h-60 bg-black rounded-3xl overflow-hidden mb-5 border-4 border-yellow-400 relative flex items-center justify-center">
                    {!photo && (
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            onLoadedData={() => setIsVideoReady(true)}
                            onCanPlay={() => setIsVideoReady(true)}
                            className="w-full h-full object-cover" 
                        />
                    )}
                    {photo && <img src={photo} alt="captured" className="w-full h-full object-cover" />}
                </div>
                <div className="camera-controls flex gap-3 w-full">
                    {!photo ? (
                        <button 
                            onClick={handleTake} 
                            disabled={!isVideoReady}
                            className={`primary-btn w-full ${!isVideoReady ? 'opacity-50 cursor-wait' : ''}`}
                        >
                            {isVideoReady ? '📸 Сфотографировать' : 'Запуск камеры...'}
                        </button>
                    ) : (
                        <>
                            <button onClick={handleRetake} className="primary-btn w-1/2 !bg-gray-500 hover:!bg-gray-600">Переснять</button>
                            <button onClick={handleSave} className="primary-btn w-1/2">Сохранить</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const StartScreen = () => {
    const [dbUrl, setDbUrl] = useState(localStorage.getItem('firebaseDbUrl') || 'https://quiz-c032b-default-rtdb.europe-west1.firebasedatabase.app');

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

    return (
        <div className="flex flex-col items-center justify-center h-full p-4 tv-container">
            <div className="glass-card p-8 max-w-md w-full text-center space-y-6">
                <h1 className="text-5xl font-black mb-4 text-yellow-300 drop-shadow-md">
                    Party Board Quiz
                </h1>
                <div className="text-left">
                    <label className="block text-sm mb-2 text-white font-bold">Firebase Realtime DB URL:</label>
                    <input 
                        type="text" 
                        value={dbUrl} 
                        onChange={e => setDbUrl(e.target.value)} 
                        placeholder="https://your-project.firebaseio.com"
                        className="w-full p-3 rounded-xl bg-white border-2 border-black text-black font-bold outline-none"
                    />
                </div>
                <div className="space-y-4 pt-4">
                    <button onClick={handleHost} className="primary-btn w-full py-4 text-xl shadow-lg">Экран ТВ (Хост)</button>
                    <button onClick={handlePlayer} className="w-full py-4 rounded-xl text-xl font-bold bg-white/20 hover:bg-white/30 border-2 border-black transition-colors">Телефон (Игрок)</button>
                </div>
            </div>
        </div>
    );
};

const TVApp = ({ roomId, dbUrl }) => {
    const [gameState, setGameState] = useState(null);
    const [visualPositions, setVisualPositions] = useState({});
    const [walkingPlayerId, setWalkingPlayerId] = useState(null);
    const [isAnimatingRoundMoves, setIsAnimatingRoundMoves] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const qrRef = useRef(null);

    const roundCorrectRef = useRef({});
    const currentQuestionsRef = useRef([]);
    const nextPhaseTimeoutRef = useRef(null);

    const baseUrl = window.location.origin + window.location.pathname;
    const joinUrl = `${baseUrl}?role=player&room=${roomId}${dbUrl ? `&db=${encodeURIComponent(dbUrl)}` : ''}`;

    useEffect(() => {
        try {
            window.GameSync.onStateChange((newState) => {
                if (newState) setGameState(newState);
            });
            window.GameSync.init('host', roomId, dbUrl);

            window.GameSync.updateState({
                phase: 'lobby',
                timerEndTime: 0,
                categoriesToVote: [],
                playedCategories: [],
                categoryVotes: {},
                playerAnswers: {},
                currentRound: 0,
                currentQuestionIndex: 0,
                currentQuestions: [],
                players: {}
            });
        } catch (err) {
            console.error("Init host sync error", err);
        }
        return () => {
            if (nextPhaseTimeoutRef.current) clearTimeout(nextPhaseTimeoutRef.current);
        };
    }, [roomId, dbUrl]);

    useEffect(() => {
        if (!gameState?.players || isAnimatingRoundMoves) return;
        const positions = {};
        Object.entries(gameState.players).forEach(([pid, p]) => {
            positions[pid] = p.position || 0;
        });
        setVisualPositions(positions);
    }, [gameState?.players, isAnimatingRoundMoves]);

    useEffect(() => {
        if (gameState?.phase === 'lobby' && qrRef.current) {
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
                console.error("QR Code Error:", e);
            }
        }
    }, [gameState?.phase, joinUrl]);

    // Таймер по абсолютному timestamp без зависаний
    useEffect(() => {
        let timerInterval = null;
        const syncTime = () => {
            if (gameState?.timerEndTime && gameState.timerEndTime > 0) {
                const diff = gameState.timerEndTime - Date.now();
                setTimeLeft(Math.max(0, Math.ceil(diff / 1000)));
            } else {
                setTimeLeft(0);
            }
        };

        syncTime();
        timerInterval = setInterval(syncTime, 250);
        return () => clearInterval(timerInterval);
    }, [gameState?.timerEndTime, gameState?.phase, gameState?.currentQuestionIndex]);

    const startNewRound = () => {
        if (nextPhaseTimeoutRef.current) clearTimeout(nextPhaseTimeoutRef.current);

        const played = gameState?.playedCategories || [];
        const allCategories = window.QuestionBank?.categories || [];
        
        let availableCategories = allCategories.filter(c => !played.includes(c.id));
        if (availableCategories.length < 3) availableCategories = allCategories;
        const categories = [...availableCategories].sort(() => 0.5 - Math.random()).slice(0, 3);

        roundCorrectRef.current = {};
        Object.keys(gameState?.players || {}).forEach(pid => {
            roundCorrectRef.current[pid] = 0;
        });

        window.GameSync.updateState({
            phase: 'category_vote',
            timerEndTime: Date.now() + 10000,
            categoriesToVote: categories,
            categoryVotes: {},
            playerAnswers: {},
            currentQuestionIndex: 0,
            currentQuestions: []
        });
    };

    const handleVoteFinished = useCallback(() => {
        if (!gameState) return;
        const votes = gameState.categoryVotes || {};
        const voteCounts = {};
        Object.values(votes).forEach(cat => {
            voteCounts[cat] = (voteCounts[cat] || 0) + 1;
        });

        let chosenCat = gameState.categoriesToVote?.[0]?.id || 'cinema';
        let maxCount = -1;
        for (const [cat, count] of Object.entries(voteCounts)) {
            if (count > maxCount) { 
                maxCount = count; 
                chosenCat = cat; 
            }
        }

        const questions = window.QuestionBank?.getQuestions 
            ? window.QuestionBank.getQuestions(chosenCat, 4) 
            : (window.QuestionBank?.getQuestionsByCategory ? window.QuestionBank.getQuestionsByCategory(chosenCat, 4) : []);
        
        currentQuestionsRef.current = questions;

        window.GameSync.updateState({
            phase: 'question',
            timerEndTime: Date.now() + 15000,
            playedCategories: [...(gameState.playedCategories || []), chosenCat],
            categoryVotes: {},
            playerAnswers: {},
            currentQuestionIndex: 0,
            currentQuestions: questions
        });
    }, [gameState]);

    const executeRoundMovement = async () => {
        setIsAnimatingRoundMoves(true);
        await window.GameSync.updateState({ phase: 'board_move', timerEndTime: 0 });

        const playersCopy = JSON.parse(JSON.stringify(gameState?.players || {}));
        for (const pid of Object.keys(playersCopy)) {
            const steps = roundCorrectRef.current[pid] || 0;
            let currentPos = playersCopy[pid].position || 0;

            for (let s = 0; s < steps; s++) {
                if (currentPos >= TOTAL_CELLS - 1) break;
                setWalkingPlayerId(pid);
                currentPos += 1;
                setVisualPositions(prev => ({ ...prev, [pid]: currentPos }));
                await new Promise(res => setTimeout(res, 500));
                setWalkingPlayerId(null);
                await new Promise(res => setTimeout(res, 150));
            }

            playersCopy[pid].position = currentPos;
            playersCopy[pid].score = (playersCopy[pid].score || 0) + steps;
        }

        await window.GameSync.updateState({ players: playersCopy });
        setIsAnimatingRoundMoves(false);

        const winner = Object.values(playersCopy).find(p => (p.position || 0) >= TOTAL_CELLS - 1);
        if (winner) {
            await window.GameSync.updateState({ phase: 'finish', winnerId: winner.id, players: playersCopy });
        } else {
            startNewRound();
        }
    };

    const handleShowResultPhase = useCallback(() => {
        if (!gameState) return;
        const currentQIndex = gameState.currentQuestionIndex || 0;
        const questionsList = currentQuestionsRef.current.length ? currentQuestionsRef.current : (gameState.currentQuestions || []);
        const currentQ = questionsList[currentQIndex];
        const correctIndex = currentQ?.correctIndex ?? currentQ?.correct ?? 0;

        Object.entries(gameState.playerAnswers || {}).forEach(([pid, ans]) => {
            if (ans === correctIndex) {
                roundCorrectRef.current[pid] = (roundCorrectRef.current[pid] || 0) + 1;
            }
        });

        window.GameSync.updateState({
            phase: 'answer_reveal',
            timerEndTime: 0
        });

        if (nextPhaseTimeoutRef.current) clearTimeout(nextPhaseTimeoutRef.current);
        nextPhaseTimeoutRef.current = setTimeout(() => {
            const nextQIndex = currentQIndex + 1;
            if (nextQIndex < 4) {
                window.GameSync.updateState({
                    phase: 'question',
                    timerEndTime: Date.now() + 15000,
                    currentQuestionIndex: nextQIndex,
                    playerAnswers: {}
                });
            } else {
                executeRoundMovement();
            }
        }, 7000);
    }, [gameState]);

    useEffect(() => {
        if (!gameState) return;
        const { phase, timerEndTime, players, categoryVotes, playerAnswers } = gameState;
        const isTimeUp = timerEndTime > 0 && Date.now() >= timerEndTime;

        if (phase === 'category_vote') {
            const numPlayers = Object.keys(players || {}).length;
            const numVotes = Object.keys(categoryVotes || {}).length;
            if (isTimeUp || (numPlayers > 0 && numVotes >= numPlayers)) {
                handleVoteFinished();
            }
        } else if (phase === 'question') {
            const numPlayers = Object.keys(players || {}).length;
            const numAnswers = Object.keys(playerAnswers || {}).length;
            if (isTimeUp || (numPlayers > 0 && numAnswers >= numPlayers)) {
                handleShowResultPhase();
            }
        }
    }, [gameState, handleVoteFinished, handleShowResultPhase]);

    if (!gameState) return <div className="flex items-center justify-center h-full text-3xl font-black">Загрузка игры...</div>;

    const { phase, categoriesToVote, currentQuestionIndex, players, winnerId, categoryVotes, playerAnswers } = gameState;
    const playersList = Object.values(players || {});
    const questionsList = currentQuestionsRef.current.length ? currentQuestionsRef.current : (gameState.currentQuestions || []);
    const currentQ = questionsList[currentQuestionIndex] || null;
    const currentQCorrectIndex = currentQ ? (currentQ.correctIndex ?? currentQ.correct ?? 0) : 0;

    // Группировка игроков по клеткам для предотвращения наложения
    const cellOccupantsMap = {};
    playersList.forEach(p => {
        const cellPos = visualPositions[p.id] ?? p.position ?? 0;
        if (!cellOccupantsMap[cellPos]) cellOccupantsMap[cellPos] = [];
        cellOccupantsMap[cellPos].push(p.id);
    });

    return (
        <div className="tv-container relative w-screen h-screen flex flex-col p-0 m-0 overflow-hidden">
            <div className={`board-grid w-full h-full absolute inset-0 z-0 p-4 transition-all duration-500 ${phase === 'board_move' ? 'opacity-100 scale-100' : 'opacity-25 filter blur-[1px]'}`}>
                {Array.from({ length: TOTAL_CELLS }).map((_, i) => {
                    const pos = getGridPos(i);
                    const isStart = i === 0;
                    const isFinish = i === TOTAL_CELLS - 1;
                    const hasPawns = playersList.some(p => (visualPositions[p.id] ?? p.position ?? 0) === i);

                    return (
                        <div 
                            key={i} 
                            className={`board-cell ${isStart ? 'board-cell-start' : ''} ${isFinish ? 'board-cell-finish' : ''} ${hasPawns ? 'board-cell-active' : ''}`} 
                            style={{ gridRow: pos.row, gridColumn: pos.col }}
                        >
                            <span className="board-cell-number">{i + 1}</span>
                            <span className="font-mono text-2xl font-black">{isStart ? 'СТАРТ' : isFinish ? 'ФИНИШ 🏆' : i}</span>
                        </div>
                    );
                })}

                {playersList.map(p => {
                    const cellPos = visualPositions[p.id] ?? p.position ?? 0;
                    const occupants = cellOccupantsMap[cellPos] || [p.id];
                    const offsetIndex = occupants.indexOf(p.id);

                    return (
                        <Pawn 
                            key={p.id} 
                            color={p.color} 
                            selfie={p.selfie} 
                            position={cellPos} 
                            isWalking={walkingPlayerId === p.id}
                            offsetIndex={offsetIndex >= 0 ? offsetIndex : 0}
                            totalOnCell={occupants.length}
                        />
                    );
                })}
            </div>

            {phase === 'board_move' && (
                <div className="move-info-toast z-50">
                    <span className="text-3xl animate-bounce">🎲</span>
                    <div>Игроки делают ходы! 1 верный ответ = 1 шаг вперед</div>
                </div>
            )}

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
                {phase === 'lobby' && (
                    <div className="glass-card p-8 text-center max-w-2xl w-full">
                        <h2 className="text-5xl font-black mb-4">Код комнаты: <span className="text-yellow-300 tracking-widest">{roomId}</span></h2>
                        <div className="flex flex-col items-center justify-center mb-6">
                            <div ref={qrRef} className="bg-white p-3 rounded-2xl inline-block border-4 border-black min-w-[240px] min-h-[240px] flex items-center justify-center"></div>
                            <div className="mt-4 w-full bg-black/50 p-3 rounded-xl border-2 border-black">
                                <p className="text-xs text-gray-300 uppercase tracking-wider mb-1">Или откройте ссылку:</p>
                                <a href={joinUrl} className="text-yellow-300 hover:text-yellow-200 underline font-mono text-xs break-all">{joinUrl}</a>
                            </div>
                        </div>
                        <h3 className="text-xl mb-3 font-bold text-yellow-200">Игроки ({playersList.length}/4):</h3>
                        <div className="flex justify-center gap-6 mb-6 min-h-[90px]">
                            {playersList.length === 0 && <p className="text-yellow-100 self-center">Ожидание подключения с телефона...</p>}
                            {playersList.map(p => (
                                <div key={p.id} className="flex flex-col items-center">
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-black mb-2 bg-white flex items-center justify-center" style={{ backgroundColor: p.color }}>
                                        {isSafeImageSrc(p.selfie) ? <img src={p.selfie} className="w-full h-full object-cover" /> : <span className="text-3xl text-black">{p.selfie || '👤'}</span>}
                                    </div>
                                    <span className="font-bold text-sm max-w-[80px] truncate">{p.name}</span>
                                </div>
                            ))}
                        </div>
                        <button onClick={startNewRound} disabled={playersList.length === 0} className="primary-btn px-10 py-4 text-2xl w-full">Начать игру</button>
                    </div>
                )}

                {phase === 'category_vote' && (
                    <div className="glass-card p-8 text-center max-w-3xl w-full">
                        <h2 className="text-4xl font-extrabold mb-2">Выбор категории</h2>
                        <p className="text-lg text-yellow-100 mb-6">Голосуйте с телефонов прямо сейчас!</p>
                        <div className="timer-track mb-8">
                            <div className="timer-bar" style={{ width: `${(timeLeft / 10) * 100}%` }}></div>
                        </div>
                        <div className="grid grid-cols-3 gap-6 mb-6">
                            {(categoriesToVote || []).map((cat, i) => (
                                <div key={i} className="glass-card p-6 bg-indigo-900/60 flex flex-col items-center rounded-2xl border-4 border-black">
                                    <span className="text-6xl mb-4">{cat.icon}</span>
                                    <h3 className="text-2xl font-bold mb-4">{cat.name}</h3>
                                    <div className="flex gap-2 min-h-[40px] items-center">
                                        {playersList.filter(p => categoryVotes?.[p.id] === cat.id).map(p => (
                                            <div key={p.id} className="w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-white flex items-center justify-center shadow-md" style={{ borderColor: p.color }}>
                                                {isSafeImageSrc(p.selfie) ? <img src={p.selfie} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-black">{p.selfie || '👤'}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="text-4xl font-mono font-black text-yellow-300">{timeLeft} сек</div>
                    </div>
                )}

                {(phase === 'question' || phase === 'answer_reveal') && currentQ && (
                    <div className="glass-card p-8 text-center max-w-4xl w-full">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-2xl text-yellow-300 font-black uppercase">Вопрос {currentQuestionIndex + 1} из 4</span>
                            <span className="text-4xl font-mono font-black bg-black text-yellow-300 px-6 py-1.5 rounded-xl border-2 border-black">
                                {phase === 'answer_reveal' ? '✓ Ответ' : `${timeLeft}s`}
                            </span>
                        </div>

                        {currentQ.imageUrl && isSafeImageSrc(currentQ.imageUrl) && (
                            <div className="mb-6 flex justify-center">
                                <img 
                                    src={currentQ.imageUrl} 
                                    alt="question" 
                                    className="max-h-60 max-w-full rounded-2xl border-4 border-black object-contain bg-black/40 shadow-xl" 
                                />
                            </div>
                        )}

                        <h2 className="text-3xl md:text-4xl font-black mb-8 leading-snug">{currentQ.text || currentQ.q}</h2>
                        <div className="grid grid-cols-2 gap-6">
                            {currentQ.options.map((opt, i) => {
                                const isResultPhase = phase === 'answer_reveal';
                                const isCorrect = isResultPhase && i === currentQCorrectIndex;
                                const isWrong = isResultPhase && i !== currentQCorrectIndex;
                                const letterClass = i === 0 ? 'quiz-btn-a' : i === 1 ? 'quiz-btn-b' : i === 2 ? 'quiz-btn-c' : 'quiz-btn-d';
                                const playersChosenThis = playersList.filter(p => playerAnswers?.[p.id] === i);

                                return (
                                    <div key={i} className={`quiz-btn ${letterClass} ${isCorrect ? 'quiz-btn-correct' : ''} ${isWrong ? 'opacity-40' : ''} relative !cursor-default`} style={{ justifyContent: 'center' }}>
                                        <div className="quiz-btn-text text-center text-2xl font-bold">{opt}</div>
                                        {isResultPhase && (
                                            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-30">
                                                {playersChosenThis.map(p => (
                                                    <div key={p.id} className="w-12 h-12 rounded-full border-4 border-black overflow-hidden bg-white flex items-center justify-center shadow-lg" style={{ backgroundColor: p.color }}>
                                                        {isSafeImageSrc(p.selfie) ? <img src={p.selfie} className="w-full h-full object-cover" /> : <span className="text-xl text-black font-bold">{p.selfie || '👤'}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {phase === 'finish' && players && players[winnerId] && (
                    <div className="glass-card p-12 text-center border-4 border-black max-w-xl">
                        <h1 className="text-6xl font-black mb-6 text-yellow-300 drop-shadow-lg">ПОБЕДИТЕЛЬ!</h1>
                        <div className="flex flex-col items-center">
                            <div className="w-48 h-48 rounded-full border-8 border-black mb-4 overflow-hidden bg-white flex items-center justify-center" style={{ backgroundColor: players[winnerId].color }}>
                                {isSafeImageSrc(players[winnerId].selfie) ? <img src={players[winnerId].selfie} className="w-full h-full object-cover" /> : <span className="text-7xl text-black">{players[winnerId].selfie || '👤'}</span>}
                            </div>
                            <h2 className="text-5xl font-black text-white">{players[winnerId].name}</h2>
                        </div>
                        <button onClick={() => window.location.href = window.location.origin + window.location.pathname} className="mt-8 primary-btn text-2xl px-8 py-3">В главное меню</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const MobileApp = ({ roomId, dbUrl }) => {
    const [gameState, setGameState] = useState(null);
    const [playerId, setPlayerId] = useState(localStorage.getItem('tv_game_player_id') || localStorage.getItem('playerId') || null);
    const [isJoined, setIsJoined] = useState(false);
    const [name, setName] = useState('');
    const [color, setColor] = useState('');
    const [selfie, setSelfie] = useState(null);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);

    const handleCloseCamera = useCallback(() => {
        setShowCameraModal(false);
    }, []);

    useEffect(() => {
        try {
            window.GameSync.onStateChange((newState) => {
                if (newState) {
                    setGameState(newState);
                    if (playerId && newState.players?.[playerId]) {
                        setIsJoined(true);
                    }
                }
            });
            window.GameSync.init('player', roomId, dbUrl);
        } catch (err) {
            console.error("Player sync init error", err);
        }
    }, [roomId, dbUrl, playerId]);

    useEffect(() => {
        let timerInterval = null;
        const syncTime = () => {
            if (gameState?.timerEndTime && gameState.timerEndTime > 0) {
                const diff = gameState.timerEndTime - Date.now();
                setTimeLeft(Math.max(0, Math.ceil(diff / 1000)));
            } else {
                setTimeLeft(0);
            }
        };

        syncTime();
        timerInterval = setInterval(syncTime, 250);
        return () => clearInterval(timerInterval);
    }, [gameState?.timerEndTime, gameState?.phase, gameState?.currentQuestionIndex]);

    const usedColors = useMemo(() => {
        if (!gameState?.players) return [];
        return Object.values(gameState.players).map(p => p.color);
    }, [gameState?.players]);

    useEffect(() => {
        if (!color || usedColors.includes(color)) {
            const firstFree = PLAYER_COLORS.find(c => !usedColors.includes(c));
            if (firstFree) setColor(firstFree);
        }
    }, [usedColors, color]);

    const handleJoin = () => {
        if (!name.trim() || !selfie || !color || usedColors.includes(color)) {
            return alert("Заполните все данные корректно!");
        }

        const newId = playerId || generatePlayerId();
        setPlayerId(newId);
        localStorage.setItem('playerId', newId);
        localStorage.setItem('tv_game_player_id', newId);

        window.GameSync.updateState({
            players: {
                ...(gameState?.players || {}),
                [newId]: { 
                    id: newId, 
                    name: name.trim().slice(0, 12), 
                    color, 
                    selfie, 
                    position: 0, 
                    score: 0 
                }
            }
        });
        setIsJoined(true);
    };

    const sendVote = (catId) => {
        if (!playerId) return;
        if (gameState?.categoryVotes?.[playerId]) return;
        window.GameSync.updateState({
            categoryVotes: {
                ...(gameState?.categoryVotes || {}),
                [playerId]: catId
            }
        });
    };

    const sendAnswer = (optionIndex) => {
        if (!playerId) return;
        if (gameState?.phase !== 'question') return;
        if (gameState?.playerAnswers?.[playerId] !== undefined) return;
        window.GameSync.updateState({
            playerAnswers: {
                ...(gameState?.playerAnswers || {}),
                [playerId]: optionIndex
            }
        });
    };

    if (!isJoined || !gameState?.players?.[playerId]) {
        return (
            <div className="mobile-container !py-2 !px-3 overflow-y-auto flex items-center justify-center">
                <CameraModal isOpen={showCameraModal} onClose={handleCloseCamera} onSave={setSelfie} />
                <div className="glass-card w-full max-w-sm !p-4 space-y-2.5 my-auto max-h-[94dvh] overflow-y-auto">
                    <h2 className="text-2xl font-black text-center text-yellow-300 leading-tight">Вход в игру</h2>
                    <div className="flex flex-col items-center gap-2">
                        <div className="camera-preview-container relative w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-black border-3 border-black shrink-0" style={{ backgroundColor: color || '#fde047' }}>
                            {!selfie && <div className="absolute inset-0 flex items-center justify-center text-2xl">👤</div>}
                            {isSafeImageSrc(selfie) && <img src={selfie} className="w-full h-full object-cover" />}
                            {selfie && !isSafeImageSrc(selfie) && <div className="w-full h-full bg-white flex items-center justify-center text-3xl text-black">{selfie}</div>}
                        </div>
                        <button onClick={() => setShowCameraModal(true)} className="primary-btn w-full !py-2 text-sm">📸 Сделать селфи</button>
                        <div className="flex gap-1.5 flex-wrap justify-center">
                            {EMOJI_AVATARS.map(em => (
                                <button key={em} onClick={() => setSelfie(em)} className={`text-xl p-1 rounded-lg border-2 border-black ${selfie === em ? 'bg-yellow-400' : 'bg-white/20'}`}>{em}</button>
                            ))}
                        </div>
                    </div>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="Ваше имя" 
                        maxLength="12"
                        className="!py-2 !px-3 !text-base"
                    />
                    <div className="flex justify-center gap-2 flex-wrap pt-0.5">
                        {PLAYER_COLORS.map(c => {
                            const isTaken = usedColors.includes(c);
                            return (
                                <button key={c} onClick={() => !isTaken && setColor(c)} disabled={isTaken} className={`w-8 h-8 rounded-full border-3 ${color === c ? 'scale-110 border-white shadow-lg' : 'border-black'} ${isTaken ? 'opacity-30' : ''}`} style={{ backgroundColor: c }}></button>
                            );
                        })}
                    </div>
                    <button onClick={handleJoin} className="primary-btn w-full !mt-2 text-lg !py-2.5">Войти в игру</button>
                </div>
            </div>
        );
    }

    const { phase, categoriesToVote, currentQuestionIndex, currentQuestions, players, categoryVotes, playerAnswers } = gameState;
    const myPlayer = players[playerId];
    const myRank = getSortedStandings(players).findIndex(p => p.id === playerId) + 1;
    const hasVoted = Boolean(categoryVotes?.[playerId]);
    const hasAnswered = playerAnswers?.[playerId] !== undefined;
    const currentQ = (currentQuestions || [])[currentQuestionIndex] || null;

    return (
        <div className="mobile-container select-none">
            <div className="glass-card p-3 mb-2 flex items-center justify-between !py-2 !px-4 !rounded-2xl shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-white flex items-center justify-center" style={{ backgroundColor: myPlayer.color }}>
                         {isSafeImageSrc(myPlayer.selfie) ? <img src={myPlayer.selfie} className="w-full h-full object-cover" /> : <span className="text-xl text-black">{myPlayer.selfie || '👤'}</span>}
                    </div>
                    <div>
                        <div className="font-black text-lg leading-tight">{myPlayer.name}</div>
                        <div className="text-xs text-yellow-300 font-bold">{myRank > 0 ? `${myRank} место` : ''}</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center overflow-hidden">
                {phase === 'lobby' && (
                    <div className="text-center glass-card p-8">
                        <h2 className="text-2xl font-black mb-2">Вы в игре!</h2>
                        <p className="text-yellow-100 font-bold">Ожидайте запуска партии на экране ТВ.</p>
                    </div>
                )}

                {phase === 'category_vote' && (
                    <div className="flex flex-col gap-3 h-full justify-center">
                        <h2 className="text-2xl font-black text-center mb-2">Выберите тему:</h2>
                        {(categoriesToVote || []).map(cat => (
                            <button key={cat.id} onClick={() => sendVote(cat.id)} disabled={hasVoted} className={`glass-card flex items-center gap-4 text-xl font-black w-full p-4 transition-all ${categoryVotes?.[playerId] === cat.id ? '!bg-yellow-400 !text-black !border-black' : ''} ${hasVoted && categoryVotes?.[playerId] !== cat.id ? 'opacity-40 grayscale' : ''}`}>
                                <span className="text-4xl">{cat.icon}</span><span>{cat.name}</span>
                            </button>
                        ))}
                    </div>
                )}

                {phase === 'question' && (
                    <div className="flex flex-col h-full justify-between pb-2">
                        <div className="text-center mb-2">
                            <div className="text-sm text-yellow-300 font-black uppercase">Вопрос {currentQuestionIndex + 1} из 4</div>
                            <div className="text-3xl font-mono font-black">{timeLeft}</div>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5 flex-1 justify-center my-auto">
                            {['A', 'B', 'C', 'D'].map((lbl, i) => {
                                const isSelected = playerAnswers?.[playerId] === i;
                                const optionText = currentQ?.options?.[i] || `Вариант ${lbl}`;
                                return (
                                    <button key={i} onClick={() => sendAnswer(i)} disabled={hasAnswered} className={`quiz-btn quiz-btn-${lbl.toLowerCase()} py-3 px-3 ${isSelected ? 'quiz-btn-selected' : ''} ${hasAnswered && !isSelected ? 'opacity-40' : ''}`}>
                                        <div className="quiz-btn-letter font-black shrink-0">{lbl}</div>
                                        <div className="quiz-btn-text text-base sm:text-lg font-black leading-snug text-left break-words flex-1">
                                            {optionText} {isSelected ? '✓' : ''}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {phase === 'answer_reveal' && (
                     <div className="text-center glass-card p-8 border-4 border-black">
                        <h2 className="text-2xl font-black mb-2 text-yellow-300">Внимание на экран!</h2>
                        <p className="text-lg font-bold">Подсчитываем правильные ответы...</p>
                     </div>
                )}

                {phase === 'board_move' && (
                    <div className="text-center glass-card p-8 border-4 border-black">
                        <div className="text-6xl mb-4 animate-bounce">🏃‍♂️</div>
                        <h2 className="text-2xl font-black mb-2 text-yellow-300">Фигурки шагают!</h2>
                    </div>
                )}

                {phase === 'finish' && (
                    <div className="text-center glass-card p-8 border-4 border-black">
                        <div className="text-7xl mb-4 animate-bounce">🏆</div>
                        <h2 className="text-3xl font-black mb-3 text-yellow-300">Игра окончена</h2>
                        <p className="text-2xl font-black">{gameState.winnerId === playerId ? 'ВЫ ПОБЕДИЛИ! 🎉' : 'Смотрите результаты на ТВ'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const App = () => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    const room = params.get('room');
    const db = params.get('db') ? decodeURIComponent(window.location.search.split('db=')[1]?.split('&')[0] || '') : '';

    if (role === 'host' && room) return <TVApp roomId={room} dbUrl={db} />;
    if (role === 'player' && room) return <MobileApp roomId={room} dbUrl={db} />;
    return <StartScreen />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);