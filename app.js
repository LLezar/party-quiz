// filename: app.js
/**
 * Frontend App Module - Party Quiz Board Game
 * Toon Edition с поддержкой картинок в вопросах, адаптивностью под мобильные экраны,
 * автосозданием комнаты через 15 сек, QR-кодом и bobblehead-фигурками игроков.
 */

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
const PLAYER_COLORS = ['#ff3b69', '#ffb703', '#00c8ff', '#2ecc71', '#9d4edd', '#ff9100'];

// Сортировка игроков по местам (по позиции на поле, при равенстве — по общему счету)
const getSortedStandings = (playersObj) => {
    const list = Object.values(playersObj || {});
    return list.sort((a, b) => {
        const posDiff = (b.position || 0) - (a.position || 0);
        if (posDiff !== 0) return posDiff;
        return (b.score || 0) - (a.score || 0);
    });
};

// Фигурка игрока на доске
const Pawn = ({ color, selfie, isWalking, position }) => {
    const pos = getGridPos(position || 0);
    return (
        <div 
            className={`pawn-wrapper ${isWalking ? 'pawn-walking' : ''} absolute pointer-events-none transition-all duration-300 z-20 flex flex-col items-center justify-center`}
            style={{ 
                gridRow: pos.row, 
                gridColumn: pos.col,
                '--player-color': color
            }}
        >
            <div className="pawn-selfie-head" style={{ '--player-color': color, borderColor: color }}>
                {selfie && selfie.startsWith('data:') ? (
                    <img src={selfie} alt="head" className="w-full h-full object-cover rounded-full" />
                ) : (
                    <span className="text-3xl select-none">{selfie || '👤'}</span>
                )}
            </div>
            <div className="pawn-body" style={{ '--player-color': color, backgroundColor: color }}></div>
        </div>
    );
};

// Модальное окно камеры
const CameraModal = ({ isOpen, onClose, onSave }) => {
    const videoRef = useRef(null);
    const [photo, setPhoto] = useState(null);

    useEffect(() => {
        let stream = null;
        if (isOpen && !photo && videoRef.current) {
            navigator.mediaDevices?.getUserMedia({ 
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } } 
            }).then(s => {
                stream = s;
                if (videoRef.current) videoRef.current.srcObject = s;
            }).catch(err => {
                console.error("Camera access error:", err);
                alert("Ошибка доступа к камере. Пожалуйста, выберите эмодзи.");
                onClose();
            });
        }
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isOpen, photo, onClose]);

    if (!isOpen) return null;

    const handleTake = async () => {
        try {
            if (window.captureSelfie && videoRef.current) {
                const base64 = await window.captureSelfie(videoRef.current);
                setPhoto(base64);
            } else if (window.GameSync?.takePhoto && videoRef.current) {
                const canvas = document.createElement('canvas');
                const base64 = await window.GameSync.takePhoto(videoRef.current, canvas);
                setPhoto(base64);
            } else {
                const canvas = document.createElement('canvas');
                canvas.width = 120;
                canvas.height = 120;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(videoRef.current, 0, 0, 120, 120);
                setPhoto(canvas.toDataURL('image/jpeg', 0.65));
            }
        } catch (e) {
            console.error(e);
            alert("Не удалось сделать снимок");
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

// Экран Хоста (ТВ)
const TVApp = ({ roomId, dbUrl }) => {
    const [gameState, setGameState] = useState(null);
    const [visualPositions, setVisualPositions] = useState({});
    const [walkingPlayerId, setWalkingPlayerId] = useState(null);
    const [isAnimatingRoundMoves, setIsAnimatingRoundMoves] = useState(false);
    const qrRef = useRef(null);

    const roundCorrectRef = useRef({}); 
    const currentQuestionsRef = useRef([]);
    const resultTransitionLockRef = useRef(false);
    const nextQuestionTimeoutRef = useRef(null);

    const baseUrl = window.location.origin + window.location.pathname;
    const joinUrl = `${baseUrl}?role=mobile&room=${roomId}${dbUrl ? `&db=${encodeURIComponent(dbUrl)}` : ''}`;

    useEffect(() => {
        try {
            window.GameSync.onStateChange((newState) => {
                if (newState) setGameState(newState);
            });
            window.GameSync.init('host', roomId, dbUrl);

            window.GameSync.updateState({
                status: 'lobby',
                timer: 0,
                categoriesToVote: [],
                currentRound: {
                    categoryId: null,
                    questionIndex: 0,
                    phase: 'answering',
                    answersCount: 0
                },
                players: {}
            });
        } catch (err) {
            console.error("Init host sync error", err);
        }
        return () => {
            if (nextQuestionTimeoutRef.current) clearTimeout(nextQuestionTimeoutRef.current);
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
        if (gameState?.status === 'lobby' && qrRef.current) {
            const renderQr = () => {
                if (!qrRef.current || !window.QRCode) return;
                qrRef.current.innerHTML = '';
                new window.QRCode(qrRef.current, {
                    text: joinUrl,
                    width: 220,
                    height: 220,
                    colorDark : "#140d21",
                    colorLight : "#ffffff",
                    correctLevel : window.QRCode.CorrectLevel.H
                });
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
        }
    }, [gameState?.status, joinUrl]);

    const startNewRound = (overridePlayers = null) => {
        if (nextQuestionTimeoutRef.current) clearTimeout(nextQuestionTimeoutRef.current);
        resultTransitionLockRef.current = false;

        const categories = window.QuestionBank?.getCategories ? window.QuestionBank.getCategories(3) : [
            { id: 'cinema', name: 'Кино', icon: '🎬' },
            { id: 'games', name: 'Игры', icon: '🎮' },
            { id: 'music', name: 'Музыка', icon: '🎵' }
        ];

        const sourcePlayers = overridePlayers || window.GameSync.currentState?.players || gameState?.players || {};
        const updatedPlayers = JSON.parse(JSON.stringify(sourcePlayers));
        roundCorrectRef.current = {};
        
        Object.keys(updatedPlayers).forEach(pid => {
            updatedPlayers[pid].currentVote = null;
            updatedPlayers[pid].currentAnswer = -1;
            updatedPlayers[pid].answeredQIndex = -1;
            updatedPlayers[pid].position = updatedPlayers[pid].position || 0;
            roundCorrectRef.current[pid] = 0;
        });

        // Генерируем уникальный ID голосования для этого раунда, чтобы сбросить старые голоса на телефонах
        const newVoteRoundId = 'vote_' + Math.random().toString(36).substr(2, 6);

        window.GameSync.updateState({
            status: 'category_vote',
            timer: 15,
            voteRoundId: newVoteRoundId,
            categoriesToVote: categories,
            currentRound: {
                categoryId: null,
                questionIndex: 0,
                phase: 'answering',
                answersCount: 0
            },
            players: updatedPlayers
        });
    };

    useEffect(() => {
        if (!gameState) return;
        const { status, timer, currentRound, players } = gameState;
        let timerId;

        if (status === 'category_vote') {
            const playerValues = Object.values(players || {});
            const allVoted = playerValues.length > 0 && playerValues.every(p => typeof p.currentVote === 'string' && p.currentVote.length > 0);

            if (timer > 0 && !allVoted) {
                timerId = setTimeout(() => window.GameSync.updateState({ timer: timer - 1 }), 1000);
            } else {
                handleVoteFinished();
            }
        } else if (status === 'round_standings') {
            if (timer > 0) {
                timerId = setTimeout(() => window.GameSync.updateState({ timer: timer - 1 }), 1000);
            } else {
                startNewRound(window.GameSync.currentState?.players || players);
            }
        } else if (status === 'round_active') {
            if (currentRound?.phase === 'answering' && !resultTransitionLockRef.current) {
                const qIdx = currentRound.questionIndex || 0;
                const playerValues = Object.values(players || {});
                const totalPlayers = playerValues.length;
                const answeredPlayers = playerValues.filter(
                    p => typeof p.currentAnswer === 'number' && p.currentAnswer >= 0 && p.answeredQIndex === qIdx
                ).length;
                const allAnswered = totalPlayers > 0 && answeredPlayers >= totalPlayers;

                if (timer > 0 && !allAnswered) {
                    timerId = setTimeout(() => window.GameSync.updateState({ timer: timer - 1 }), 1000);
                } else {
                    handleShowResultPhase();
                }
            }
        }

        return () => clearTimeout(timerId);
    }, [gameState?.status, gameState?.timer, gameState?.currentRound?.phase, gameState?.currentRound?.questionIndex, gameState?.players]);

    const handleVoteFinished = () => {
        const latestPlayers = window.GameSync.currentState?.players || gameState.players || {};
        const votes = {};
        Object.values(latestPlayers).forEach(p => {
            if (p.currentVote) votes[p.currentVote] = (votes[p.currentVote] || 0) + 1;
        });

        let chosenCat = gameState.categoriesToVote?.[0]?.id || 'cinema';
        let maxCount = -1;
        for (const [cat, count] of Object.entries(votes)) {
            if (count > maxCount) {
                maxCount = count;
                chosenCat = cat;
            }
        }

        const questions = window.QuestionBank?.getQuestions 
            ? window.QuestionBank.getQuestions(chosenCat, 4) 
            : [];
        currentQuestionsRef.current = questions;

        const updatedPlayers = JSON.parse(JSON.stringify(latestPlayers));
        Object.keys(updatedPlayers).forEach(pid => {
            updatedPlayers[pid].currentAnswer = -1;
            updatedPlayers[pid].answeredQIndex = -1;
            roundCorrectRef.current[pid] = 0;
        });

        resultTransitionLockRef.current = false;

        window.GameSync.updateState({
            status: 'round_active',
            timer: 20,
            currentRound: {
                categoryId: chosenCat,
                questionIndex: 0,
                phase: 'answering',
                answersCount: 0
            },
            players: updatedPlayers
        });
    };

    const handleShowResultPhase = () => {
        if (resultTransitionLockRef.current) return;
        resultTransitionLockRef.current = true;

        const currentQIndex = gameState.currentRound?.questionIndex || 0;
        const currentQ = currentQuestionsRef.current[currentQIndex];
        const correctIndex = currentQ?.correctIndex ?? currentQ?.correct ?? 0;

        const latestPlayers = window.GameSync.currentState?.players || gameState.players || {};
        Object.entries(latestPlayers).forEach(([pid, p]) => {
            const isCurrentQAnswer = p.answeredQIndex === undefined || p.answeredQIndex === currentQIndex;
            if (isCurrentQAnswer && p.currentAnswer === correctIndex) {
                roundCorrectRef.current[pid] = (roundCorrectRef.current[pid] || 0) + 1;
            }
        });

        window.GameSync.updateState({
            currentRound: {
                ...gameState.currentRound,
                questionIndex: currentQIndex,
                phase: 'showing_result'
            }
        });

        if (nextQuestionTimeoutRef.current) clearTimeout(nextQuestionTimeoutRef.current);
        nextQuestionTimeoutRef.current = setTimeout(async () => {
            const nextQIndex = currentQIndex + 1;
            if (nextQIndex < 4) {
                const freshPlayers = window.GameSync.currentState?.players || gameState.players || {};
                const resetAnswersPlayers = JSON.parse(JSON.stringify(freshPlayers));
                Object.keys(resetAnswersPlayers).forEach(pid => {
                    resetAnswersPlayers[pid].currentAnswer = -1;
                    resetAnswersPlayers[pid].answeredQIndex = -1;
                });

                await window.GameSync.updateState({
                    timer: 20,
                    currentRound: {
                        categoryId: gameState.currentRound?.categoryId,
                        questionIndex: nextQIndex,
                        phase: 'answering',
                        answersCount: 0
                    },
                    players: resetAnswersPlayers
                });
                resultTransitionLockRef.current = false;
            } else {
                executeRoundMovement();
            }
        }, 5000);
    };

    const executeRoundMovement = async () => {
        setIsAnimatingRoundMoves(true);

        await window.GameSync.updateState({
            status: 'round_results',
            timer: 0
        });

        const latestPlayers = window.GameSync.currentState?.players || gameState.players || {};
        const playersCopy = JSON.parse(JSON.stringify(latestPlayers));
        const playerIds = Object.keys(playersCopy);

        for (const pid of playerIds) {
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
            playersCopy[pid].lastRoundSteps = steps;
            playersCopy[pid].currentAnswer = -1;
            playersCopy[pid].answeredQIndex = -1;
        }

        await window.GameSync.updateState({
            players: playersCopy
        });

        setIsAnimatingRoundMoves(false);

        const winner = Object.values(playersCopy).find(p => (p.position || 0) >= TOTAL_CELLS - 1);
        if (winner) {
            await window.GameSync.updateState({
                status: 'finished',
                winnerId: winner.id,
                players: playersCopy
            });
        } else {
            await window.GameSync.updateState({
                status: 'round_standings',
                timer: 10,
                players: playersCopy
            });
        }
    };

    if (!gameState) return <div className="flex items-center justify-center h-full text-3xl font-bold">Загрузка игры...</div>;

    const { status, timer, categoriesToVote, currentRound, players, winnerId } = gameState;
    const playersList = Object.values(players || {});
    const standingsList = getSortedStandings(players);
    const currentQ = currentQuestionsRef.current[currentRound?.questionIndex] || null;
    const currentQCorrectIndex = currentQ ? (currentQ.correctIndex ?? currentQ.correct ?? 0) : 0;

    return (
        <div className="tv-container relative w-screen h-screen flex flex-col p-0 m-0 overflow-hidden">
            {/* Поле 5x5 (На всю ширину и высоту экрана) */}
            <div className={`board-grid absolute inset-0 z-0 p-4 transition-all duration-500 ${(status === 'round_results' || status === 'round_standings') ? 'opacity-100 scale-100' : 'opacity-25 filter blur-[2px]'}`}>
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
                            <span className="board-cell-number">
                                {isStart ? 'СТАРТ' : isFinish ? 'ФИНИШ 🏆' : i}
                            </span>
                        </div>
                    );
                })}

                {/* Фигурки игроков */}
                {playersList.map(p => (
                    <Pawn 
                        key={p.id} 
                        color={p.color} 
                        selfie={p.selfieBase64 || p.selfie} 
                        position={visualPositions[p.id] ?? p.position ?? 0} 
                        isWalking={walkingPlayerId === p.id} 
                    />
                ))}
            </div>

            {/* Контент ТВ (Поверх поля) */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 w-full h-full pointer-events-none">
                
                {status === 'round_results' && (
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 glass-card px-8 py-4 flex items-center gap-4 border-4 border-yellow-400">
                        <span className="text-4xl animate-bounce">🎲</span>
                        <div>
                            <div className="text-2xl font-black text-yellow-400">Игроки делают ходы!</div>
                            <div className="text-sm text-gray-200">1 верный ответ = 1 шаг вперед</div>
                        </div>
                    </div>
                )}

                {status === 'round_standings' && (
                    <div className="glass-card p-8 text-center max-w-2xl w-full border-4 border-yellow-400 shadow-2xl animate-fade-in pointer-events-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-4xl font-black text-yellow-400">🏆 Текущие места</h2>
                            <span className="text-3xl font-mono font-bold bg-white/20 px-5 py-1.5 rounded-xl border border-white/30">
                                {timer} сек
                            </span>
                        </div>

                        <div className="space-y-3 mb-4">
                            {standingsList.map((p, idx) => {
                                const place = idx + 1;
                                const medal = place === 1 ? '🥇 1 место' : place === 2 ? '🥈 2 место' : place === 3 ? '🥉 3 место' : `🏅 ${place} место`;
                                return (
                                    <div 
                                        key={p.id} 
                                        className="flex items-center justify-between p-4 rounded-2xl bg-black/50 border-2"
                                        style={{ borderColor: p.color }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className="text-2xl font-black text-yellow-400 min-w-[140px] text-left">
                                                {medal}
                                            </span>
                                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 bg-white flex items-center justify-center shrink-0" style={{ borderColor: p.color }}>
                                                {p.selfieBase64 || p.selfie ? (
                                                    <img src={p.selfieBase64 || p.selfie} alt={p.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-2xl text-black">👤</span>
                                                )}
                                            </div>
                                            <span className="text-2xl font-bold text-white">{p.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-mono font-black text-yellow-300">
                                                Клетка {p.position || 0} / 24
                                            </div>
                                            <div className="text-xs text-gray-300">
                                                За раунд: +{p.lastRoundSteps || 0} шаг.
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-sm text-gray-300 mt-2">Следующий раунд начнется через {timer} сек...</p>
                    </div>
                )}

                {status === 'lobby' && (
                    <div className="glass-card p-8 text-center max-w-2xl w-full shadow-2xl pointer-events-auto">
                        <h2 className="text-5xl font-black mb-4">
                            Код комнаты: <span className="text-yellow-400 tracking-widest">{roomId}</span>
                        </h2>

                        <div className="flex flex-col items-center justify-center mb-6">
                            <div ref={qrRef} className="bg-white p-3 rounded-2xl inline-block shadow-2xl min-w-[240px] min-h-[240px] flex items-center justify-center"></div>
                            <div className="mt-4 w-full bg-black/40 p-3 rounded-xl border border-white/20">
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Или откройте ссылку:</p>
                                <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 underline font-mono text-xs break-all">
                                    {joinUrl}
                                </a>
                            </div>
                        </div>

                        <h3 className="text-xl mb-3 font-bold text-gray-200">Игроки ({playersList.length}/4):</h3>
                        <div className="flex justify-center gap-6 mb-6 min-h-[90px]">
                            {playersList.length === 0 && <p className="text-gray-400 self-center">Ожидание подключения с телефона...</p>}
                            {playersList.map(p => (
                                <div key={p.id} className="flex flex-col items-center animate-fade-in">
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-4 mb-2 bg-white shadow-lg flex items-center justify-center" style={{ borderColor: p.color }}>
                                        {p.selfieBase64 || p.selfie ? (
                                            <img src={p.selfieBase64 || p.selfie} alt="selfie" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-3xl text-black">👤</span>
                                        )}
                                    </div>
                                    <span className="font-bold text-sm max-w-[80px] truncate">{p.name}</span>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={() => startNewRound()} 
                            disabled={playersList.length === 0} 
                            className={`primary-btn px-10 py-4 text-2xl w-full ${playersList.length === 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                        >
                            Начать игру
                        </button>
                    </div>
                )}

                {status === 'category_vote' && (
                    <div className="glass-card p-8 text-center max-w-4xl w-full pointer-events-auto">
                        <h2 className="text-5xl font-extrabold mb-2">Выбор категории</h2>
                        <p className="text-xl text-gray-200 mb-8">Голосуйте с телефонов прямо сейчас!</p>
                        
                        <div className="w-full h-4 bg-gray-700 rounded-full mb-10 overflow-hidden">
                            <div className="timer-bar" style={{ width: `${(timer / 15) * 100}%` }}></div>
                        </div>

                        <div className="grid grid-cols-3 gap-8 mb-8">
                            {(categoriesToVote || []).map((cat, i) => (
                                <div key={i} className="glass-card p-6 bg-white/10 flex flex-col items-center rounded-2xl border-4 border-white/20">
                                    <span className="text-7xl mb-6 drop-shadow">{cat.icon}</span>
                                    <h3 className="text-3xl font-bold mb-6 leading-tight">{cat.name}</h3>
                                    <div className="flex gap-2 min-h-[48px]">
                                        {playersList.filter(p => p.currentVote === cat.id).map(p => (
                                            <div key={p.id} className="w-12 h-12 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white" style={{ borderColor: p.color }}>
                                                {p.selfieBase64 || p.selfie ? (
                                                    <img src={p.selfieBase64 || p.selfie} alt="p" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="flex items-center justify-center text-xl">👤</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="text-5xl font-mono font-bold text-yellow-400">{timer} сек</div>
                    </div>
                )}

                {status === 'round_active' && currentQ && (
                    <div className="glass-card p-8 text-center max-w-5xl w-full pointer-events-auto">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-3xl text-yellow-400 font-black uppercase">
                                Вопрос {currentRound.questionIndex + 1} из 4
                            </span>
                            <span className="text-5xl font-mono font-bold bg-white/20 px-6 py-2 rounded-2xl border-4 border-white/30">
                                {currentRound.phase === 'showing_result' ? '✓' : timer}
                            </span>
                        </div>

                        {currentQ.imageUrl && (
                            <img src={currentQ.imageUrl} alt="Вопрос" className="question-image" style={{ maxHeight: 280, maxWidth: '100%', marginBottom: 20, borderRadius: 16 }} />
                        )}
                        <h2 className="text-4xl md:text-5xl font-bold mb-10 leading-snug">{currentQ.text || currentQ.q}</h2>

                        <div className="grid grid-cols-2 gap-8">
                            {currentQ.options.map((opt, i) => {
                                const isResultPhase = currentRound.phase === 'showing_result';
                                const isCorrect = isResultPhase && i === currentQCorrectIndex;
                                const isWrong = isResultPhase && i !== currentQCorrectIndex;
                                const letterClass = i === 0 ? 'quiz-btn-a' : i === 1 ? 'quiz-btn-b' : i === 2 ? 'quiz-btn-c' : 'quiz-btn-d';

                                const playersChosenThis = playersList.filter(
                                    p => p.currentAnswer === i && (p.answeredQIndex === undefined || p.answeredQIndex === currentRound.questionIndex)
                                );

                                return (
                                    <div 
                                        key={`${currentRound.questionIndex}_${i}`} 
                                        className={`quiz-btn ${letterClass} ${isCorrect ? 'quiz-btn-correct' : ''} ${isWrong ? 'opacity-40' : ''} relative !cursor-default`} 
                                        style={{ justifyContent: 'center', minHeight: 90 }}
                                    >
                                        <div className="quiz-btn-text text-center text-3xl font-bold">{opt}</div>
                                        
                                        {/* Селфи игроков на ТВ показываются даже в процессе ответа (но полупрозрачно, если фаза answering) */}
                                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-30">
                                            {playersChosenThis.map(p => (
                                                <div 
                                                    key={p.id} 
                                                    className={`w-14 h-14 rounded-full border-4 overflow-hidden shadow-2xl bg-white flex items-center justify-center transition-all ${isResultPhase ? 'opacity-100 scale-110' : 'opacity-80 scale-90'}`}
                                                    style={{ borderColor: p.color }}
                                                >
                                                    {p.selfieBase64 || p.selfie ? (
                                                        <img src={p.selfieBase64 || p.selfie} className="w-full h-full object-cover" alt={p.name} />
                                                    ) : (
                                                        <span className="text-2xl text-black font-bold">👤</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {status === 'finished' && players && players[winnerId] && (
                    <div className="glass-card p-12 text-center shadow-[0_0_100px_rgba(255,204,0,0.7)] border-4 border-yellow-400 max-w-xl pointer-events-auto">
                        <h1 className="text-6xl font-black mb-6 text-yellow-400 drop-shadow-lg">ПОБЕДИТЕЛЬ!</h1>
                        <div className="flex flex-col items-center">
                            <div className="w-48 h-48 rounded-full border-[8px] mb-4 shadow-2xl overflow-hidden bg-white flex items-center justify-center" style={{ borderColor: players[winnerId].color }}>
                                {players[winnerId].selfieBase64 || players[winnerId].selfie ? (
                                    <img src={players[winnerId].selfieBase64 || players[winnerId].selfie} alt="winner" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-7xl text-black">👤</span>
                                )}
                            </div>
                            <h2 className="text-5xl font-black text-white">{players[winnerId].name}</h2>
                        </div>
                        <button 
                            onClick={() => window.location.href = window.location.origin + window.location.pathname} 
                            className="mt-8 primary-btn text-2xl px-8 py-3"
                        >
                            В главное меню
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Экран Телефона (Игрок)
const MobileApp = ({ roomId, dbUrl }) => {
    const [gameState, setGameState] = useState(null);
    const [playerId, setPlayerId] = useState(
        localStorage.getItem('party_quiz_player_id') || localStorage.getItem('playerId') || null
    );
    const [isJoined, setIsJoined] = useState(false);

    const [name, setName] = useState('');
    const [color, setColor] = useState('');
    const [selfie, setSelfie] = useState(null);
    const [showCameraModal, setShowCameraModal] = useState(false);

    const [localAnswerState, setLocalAnswerState] = useState({ qKey: null, index: null });
    const [localVoteState, setLocalVoteState] = useState(null);

    useEffect(() => {
        if (playerId) {
            localStorage.setItem('party_quiz_player_id', playerId);
            localStorage.setItem('playerId', playerId);
        }
    }, [playerId]);

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
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
        }
    }, [gameState?.currentRound?.questionIndex, gameState?.status]);

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

    const handleSavePhoto = (base64) => {
        setSelfie(base64);
    };

    const handleJoin = () => {
        if (!name.trim()) return alert("Введите имя!");
        if (!selfie) return alert("Сделайте селфи или выберите эмодзи!");
        if (!color) return alert("Все цвета заняты!");
        if (usedColors.includes(color)) return alert("Цвет занят!");

        const newId = playerId || generatePlayerId();
        setPlayerId(newId);
        localStorage.setItem('party_quiz_player_id', newId);

        const newPlayerData = {
            id: newId,
            name: name.trim().slice(0, 12),
            color: color,
            selfieBase64: selfie, // Синхронизируем с ТВ
            selfie: selfie,
            position: 0,
            score: 0,
            currentVote: null,
            currentAnswer: -1,
            answeredQIndex: -1
        };

        window.GameSync.patchPlayer(roomId, newId, newPlayerData);
        setIsJoined(true);
    };

    // Привязываем голосование к уникальному voteRoundId, чтобы сбрасывать блокировку кнопок на телефоне при новой категории
    const currentVoteRoundId = gameState?.voteRoundId || 'vote_0';

    const sendVote = (catId, e) => {
        if (e && e.currentTarget) e.currentTarget.blur();
        
        // Блокируем множественное голосование в рамках одного раунда
        if (localVoteState === currentVoteRoundId || (gameState?.players?.[playerId]?.currentVote && gameState.players[playerId].currentVote.length > 0)) {
            return;
        }

        setLocalVoteState(currentVoteRoundId);
        window.GameSync.patchPlayer(roomId, playerId, { currentVote: catId });
    };

    const currentQIndex = gameState?.currentRound?.questionIndex ?? 0;
    const currentQKey = `${gameState?.currentRound?.categoryId || 'round'}_${currentQIndex}`;

    const sendAnswer = (optionIndex, e) => {
        if (e && e.currentTarget) e.currentTarget.blur();
        if (gameState?.currentRound?.phase !== 'answering') return;
        if (localAnswerState.qKey === currentQKey && localAnswerState.index !== null) return;

        setLocalAnswerState({ qKey: currentQKey, index: optionIndex });
        window.GameSync.patchPlayer(roomId, playerId, {
            currentAnswer: optionIndex,
            answeredQIndex: currentQIndex
        });
    };

    if (!isJoined || !gameState?.players?.[playerId]) {
        return (
            <div className="mobile-container relative flex flex-col items-center p-2 pt-6 h-full overflow-y-auto">
                <CameraModal isOpen={showCameraModal} onClose={() => setShowCameraModal(false)} onSave={handleSavePhoto} />
                
                <div className="glass-card w-full space-y-4 my-auto" style={{ maxWidth: 360 }}>
                    <h2 className="text-2xl font-extrabold text-center text-yellow-400">Вход в игру</h2>
                    
                    <div className="flex flex-col items-center gap-3">
                        <div 
                            className="camera-preview-container relative w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-black/50 shadow-xl shrink-0"
                            style={{ borderColor: color || '#fff', borderWidth: '4px' }}
                        >
                            {!selfie && <div className="absolute inset-0 flex items-center justify-center text-3xl">👤</div>}
                            {selfie && selfie.startsWith('data:') && <img src={selfie} alt="selfie" className="w-full h-full object-cover" />}
                            {selfie && !selfie.startsWith('data:') && <div className="w-full h-full bg-white flex items-center justify-center text-5xl text-black">{selfie}</div>}
                        </div>
                        
                        <button onClick={() => setShowCameraModal(true)} className="primary-btn bg-yellow-500 hover:bg-yellow-600 text-black w-full font-bold py-2 px-2 text-sm shrink-0">
                            📸 Сделать селфи
                        </button>
                        
                        <div className="text-[11px] text-gray-300 font-semibold uppercase tracking-wider shrink-0">или рожицу:</div>
                        <div className="flex gap-1.5 flex-wrap justify-center shrink-0">
                            {EMOJI_AVATARS.map(em => (
                                <button 
                                    key={em} 
                                    onClick={() => setSelfie(em)} 
                                    className={`text-xl transition-transform p-1.5 rounded-lg ${selfie === em ? 'bg-yellow-400/40 ring-2 ring-yellow-400 scale-110' : 'bg-white/10 hover:bg-white/20'}`}
                                >
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
                        className="w-full p-3 rounded-xl bg-black/40 border-2 border-white/30 text-center text-lg font-bold outline-none focus:border-[#8B9A46] shrink-0" 
                    />

                    <div className="space-y-1 shrink-0">
                        <div className="text-[11px] text-gray-300 text-center font-semibold uppercase tracking-wider">Цвет:</div>
                        <div className="flex justify-center gap-2 flex-wrap pt-1">
                            {PLAYER_COLORS.map(c => {
                                const isTaken = usedColors.includes(c);
                                return (
                                    <button 
                                        key={c} 
                                        onClick={() => !isTaken && setColor(c)} 
                                        disabled={isTaken}
                                        className={`w-9 h-9 rounded-full border-4 transition-all relative ${color === c ? 'scale-110 border-white shadow-lg' : 'border-black/30'} ${isTaken ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:scale-105'}`} 
                                        style={{ backgroundColor: c }}
                                    >
                                        {isTaken && <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold">✕</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <button onClick={handleJoin} className="primary-btn w-full mt-1 text-lg py-3 shadow-xl font-bold shrink-0">
                        Войти в игру
                    </button>
                </div>
            </div>
        );
    }

    const { status, timer, categoriesToVote, currentRound, players } = gameState;
    const myPlayer = gameState.players[playerId];
    const standingsList = getSortedStandings(players);
    const myRank = standingsList.findIndex(p => p.id === playerId) + 1;

    // Сброс и подсчет голосов для мобильного пульта
    const remoteHasVote = myPlayer.currentVote && myPlayer.currentVote.length > 0;
    const localHasVote = localVoteState === currentVoteRoundId;
    const isVoteSubmitted = remoteHasVote || localHasVote;
    const currentMyVoteId = localHasVote ? myPlayer.currentVote : (remoteHasVote ? myPlayer.currentVote : null);

    const remoteHasValidAnswer = typeof myPlayer.currentAnswer === 'number' && myPlayer.currentAnswer >= 0 && myPlayer.answeredQIndex === currentQIndex;
    const localHasValidAnswer = localAnswerState.qKey === currentQKey && localAnswerState.index !== null;
    const isAnswerChosen = localHasValidAnswer || remoteHasValidAnswer;
    const chosenIndex = localHasValidAnswer ? localAnswerState.index : (remoteHasValidAnswer ? myPlayer.currentAnswer : null);
    const isShowingResult = currentRound?.phase === 'showing_result';

    return (
        <div className="mobile-container relative flex flex-col h-full p-3 pt-3 select-none">
            {/* Карточка текущего профиля (уменьшена для экономии места) */}
            <div className="glass-card p-2 mb-2 flex items-center justify-between !rounded-xl shrink-0" style={{ minHeight: 52 }}>
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full border-2 overflow-hidden bg-white shadow flex items-center justify-center shrink-0" style={{ borderColor: myPlayer.color }}>
                         {myPlayer.selfieBase64 || myPlayer.selfie ? (
                             <img src={myPlayer.selfieBase64 || myPlayer.selfie} alt="avatar" className="w-full h-full object-cover" />
                         ) : (
                             <span className="text-xl text-black">👤</span>
                         )}
                    </div>
                    <div>
                        <div className="font-bold text-[15px] leading-none mb-0.5">{myPlayer.name}</div>
                        <div className="text-[11px] text-yellow-400 font-bold leading-none">{myRank > 0 ? `${myRank} место` : ''}</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[9px] text-gray-400 uppercase tracking-wider leading-none mb-0.5">Клетка</div>
                    <div className="font-mono text-lg font-black leading-none" style={{ color: myPlayer.color }}>
                        {(myPlayer.position || 0)}/24
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center min-h-0">
                {status === 'lobby' && (
                    <div className="text-center glass-card p-6">
                        <div className="text-5xl mb-4 animate-spin inline-block">⏳</div>
                        <h2 className="text-xl font-bold mb-2">Вы в игре!</h2>
                        <p className="text-sm text-gray-300">Ожидайте запуска партии на экране ТВ.</p>
                    </div>
                )}

                {status === 'category_vote' && (
                    <div className="flex flex-col gap-2.5 h-full justify-center">
                        <h2 className="text-xl font-black text-center mb-1 shrink-0">Выберите тему:</h2>
                        {(categoriesToVote || []).map(cat => (
                            <button 
                                key={`${currentVoteRoundId}_${cat.id}`} 
                                onClick={(e) => sendVote(cat.id, e)} 
                                disabled={isVoteSubmitted} 
                                className={`glass-card flex items-center gap-3 text-lg font-bold w-full p-3.5 transition-all outline-none focus:outline-none shrink-0 ${currentMyVoteId === cat.id ? 'border-[#8B9A46] shadow-[0_0_15px_rgba(139,154,70,0.8)] scale-102 bg-[#8B9A46]/30' : ''} ${isVoteSubmitted && currentMyVoteId !== cat.id ? 'opacity-40 grayscale' : ''}`}
                            >
                                <span className="text-3xl shrink-0">{cat.icon}</span>
                                <span className="truncate leading-tight">{cat.name}</span>
                            </button>
                        ))}
                    </div>
                )}

                {status === 'round_active' && (
                    <div className="flex flex-col h-full justify-between pb-2">
                        <div className="text-center mb-2 shrink-0">
                            <div className="text-xs text-yellow-400 font-extrabold uppercase mb-0.5">
                                Вопрос {currentQIndex + 1} из 4
                            </div>
                            <div className="text-2xl font-mono font-black">
                                {isShowingResult ? 'Проверка на ТВ...' : timer}
                            </div>
                        </div>

                        <div key={currentQKey} className="grid grid-cols-1 gap-2.5 flex-1 justify-center my-auto min-h-0">
                            {['A', 'B', 'C', 'D'].map((lbl, i) => {
                                const isSelected = !isShowingResult && chosenIndex === i;

                                let btnClass = `quiz-btn quiz-btn-${lbl.toLowerCase()} active:scale-95 transition-all py-3 outline-none focus:outline-none h-full`;
                                if (isSelected) {
                                    btnClass += ' quiz-btn-selected';
                                } else if (isAnswerChosen || isShowingResult) {
                                    btnClass += ' opacity-40';
                                }

                                const inlineResetStyle = !isSelected ? { backgroundColor: 'var(--btn-quiz-bg, #1e281b)' } : {};

                                return (
                                    <button 
                                        key={`${currentQKey}_btn_${i}`} 
                                        type="button"
                                        onClick={(e) => sendAnswer(i, e)} 
                                        disabled={isAnswerChosen || isShowingResult} 
                                        className={btnClass}
                                        style={inlineResetStyle}
                                    >
                                        <div className="quiz-btn-letter font-black w-10 h-10 min-w-10 text-xl shrink-0">{lbl}</div>
                                        <div className="quiz-btn-text text-[15px] font-bold leading-tight">
                                            {isSelected ? 'Ваш выбор ✓' : `Вариант ${lbl}`}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {status === 'round_results' && (
                    <div className="text-center glass-card p-6 border-2 border-yellow-400">
                        <div className="text-5xl mb-4 animate-bounce">🏃‍♂️</div>
                        <h2 className="text-xl font-black mb-2 text-yellow-400">Фигурки шагают!</h2>
                        <p className="text-sm text-gray-200">Смотрите на ТВ: перемещение по игровому полю.</p>
                    </div>
                )}

                {status === 'round_standings' && (
                    <div className="glass-card p-4 border-2 border-yellow-400 space-y-2 flex flex-col min-h-0">
                        <div className="flex justify-between items-center border-b border-white/20 pb-1.5 shrink-0">
                            <h2 className="text-lg font-black text-yellow-400">🏆 Места</h2>
                            <span className="font-mono font-bold text-base text-white">{timer} с</span>
                        </div>
                        <div className="text-center py-1.5 bg-yellow-400/20 rounded-xl border border-yellow-400/50 shrink-0">
                            <div className="text-[10px] uppercase text-gray-200">Вы сейчас</div>
                            <div className="text-2xl font-black text-yellow-300">{myRank} место</div>
                            <div className="text-[10px] text-gray-300">Клетка {myPlayer.position || 0} из 24</div>
                        </div>
                        <div className="space-y-1 overflow-y-auto flex-1 pb-1">
                            {standingsList.map((p, idx) => (
                                <div key={p.id} className={`flex justify-between items-center px-2 py-1.5 rounded-lg text-xs ${p.id === playerId ? 'bg-white/20 font-bold' : 'bg-black/40'}`}>
                                    <span className="truncate pr-2">#{idx + 1} {p.name}</span>
                                    <span className="font-mono text-yellow-400 shrink-0">Поз {p.position || 0}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {status === 'finished' && (
                    <div className="text-center glass-card p-6 border-4 border-yellow-400">
                        <div className="text-6xl mb-4 animate-bounce">🏆</div>
                        <h2 className="text-2xl font-extrabold mb-2">Игра окончена</h2>
                        <p className="text-lg font-bold">{gameState.winnerId === playerId ? 'ВЫ ПОБЕДИЛИ! 🎉' : 'Смотрите результаты на ТВ'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Корневой роутер
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
