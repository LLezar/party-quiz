// filename: app.js
const { useState, useEffect, useRef, useCallback, useMemo } = React;

const safeGetItem = (key) => {
    try {
        return window.localStorage ? window.localStorage.getItem(key) : null;
    } catch (e) {
        return null;
    }
};

const safeSetItem = (key, val) => {
    try {
        if (window.localStorage) window.localStorage.setItem(key, val);
    } catch (e) {}
};

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

const EMOJI_AVATARS = ['😎', '🤪', '🤡', '👽', '🤖', '😺', '🤠', '🦊', '🥳', '👻'];
const PLAYER_COLORS = [
    '#FF3B30', '#007AFF', '#34C759', '#FFCC00', '#AF52DE', 
    '#FF9500', '#00E5FF', '#FF2D55', '#30D158', '#E040FB'
];

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

// Смещение фишек для поддержки до 10 игроков на одной клетке
const getPawnOffset = (indexInCell, totalInCell) => {
    if (totalInCell <= 1) return { x: 0, y: 0, scale: 1 };
    if (totalInCell === 2) {
        return { x: indexInCell === 0 ? -18 : 18, y: 0, scale: 0.85 };
    }
    if (totalInCell === 3) {
        const offsets = [
            { x: -18, y: -10 },
            { x: 18, y: -10 },
            { x: 0, y: 14 }
        ];
        return { ...(offsets[indexInCell] || { x: 0, y: 0 }), scale: 0.8 };
    }
    if (totalInCell === 4) {
        const offsets = [
            { x: -18, y: -14 },
            { x: 18, y: -14 },
            { x: -18, y: 14 },
            { x: 18, y: 14 }
        ];
        return { ...(offsets[indexInCell] || { x: 0, y: 0 }), scale: 0.75 };
    }

    // Расстановка по кругу для 5..10 игроков
    const angle = (indexInCell / totalInCell) * 2 * Math.PI;
    const radius = 24;
    return {
        x: Math.round(Math.cos(angle) * radius),
        y: Math.round(Math.sin(angle) * radius),
        scale: totalInCell > 6 ? 0.6 : 0.7
    };
};

const Pawn = ({ color, selfie, isWalking, position, offsetIndex = 0, totalOnCell = 1 }) => {
    const pos = getGridPos(position || 0);
    const { x, y, scale } = getPawnOffset(offsetIndex, totalOnCell);
    const playerColor = color || '#FF3B30';

    return (
        <div 
            className={`pawn-wrapper ${isWalking ? 'pawn-walking' : ''} absolute pointer-events-none transition-all duration-300 flex flex-col items-center justify-center`}
            style={{ 
                gridRow: pos.row, 
                gridColumn: pos.col,
                '--player-color': playerColor,
                transform: `translate(${x}px, ${y}px) scale(${scale})`,
                zIndex: isWalking ? 999 : (20 + offsetIndex)
            }}
        >
            <div 
                className="pawn-selfie-head" 
                style={{ 
                    backgroundColor: playerColor, 
                    borderColor: playerColor, 
                    '--player-color': playerColor 
                }}
            >
                {isSafeImageSrc(selfie) ? (
                    <img src={selfie} alt="head" className="w-full h-full object-cover rounded-full" />
                ) : (
                    <span className="text-3xl select-none">{selfie || '👤'}</span>
                )}
            </div>
            <div 
                className="pawn-body" 
                style={{ 
                    backgroundColor: playerColor, 
                    '--player-color': playerColor 
                }}
            ></div>
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
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ 
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
            } else {
                alert("Камера не поддерживается вашим браузером. Выберите эмодзи.");
                if (onCloseRef.current) onCloseRef.current();
            }
        }

        return () => {
            isCancelled = true;
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [isOpen, photo]);

    if (!isOpen) return null;

    const handleTake = () => {
        const videoEl = videoRef.current;
        if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0) {
            return;
        }
        try {
            if (window.captureSelfie) {
                window.captureSelfie(videoEl).then(base64 => {
                    setPhoto(base64);
                }).catch(e => {
                    console.error(e);
                    alert("Не удалось сделать снимок");
                });
            } else {
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 256;
                const ctx = canvas.getContext('2d');
                const minDim = Math.min(videoEl.videoWidth, videoEl.videoHeight);
                const startX = (videoEl.videoWidth - minDim) / 2;
                const startY = (videoEl.videoHeight - minDim) / 2;
                ctx.drawImage(videoEl, startX, startY, minDim, minDim, 0, 0, 256, 256);
                setPhoto(canvas.toDataURL('image/jpeg', 0.85));
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
    const [dbUrl, setDbUrl] = useState(safeGetItem('firebaseDbUrl') || 'https://quiz-c032b-default-rtdb.europe-west1.firebasedatabase.app');
    const [countdown, setCountdown] = useState(30);

    const handleHost = useCallback(() => {
        safeSetItem('firebaseDbUrl', dbUrl);
        const room = generateRoomId();
        const baseUrl = window.location.origin + window.location.pathname;
        window.location.href = `${baseUrl}?role=host&room=${room}&db=${encodeURIComponent(dbUrl)}`;
    }, [dbUrl]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleHost();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [handleHost]);

    const handlePlayer = () => {
        safeSetItem('firebaseDbUrl', dbUrl);
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
                    Пати Квиз
                </h1>
                <div className="auto-timer-badge text-sm font-bold text-yellow-300 bg-black/40 border-2 border-black px-4 py-2 rounded-full inline-block">
                    Автоматическое создание комнаты через: {countdown} сек...
                </div>
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
    const [lobbyCountdown, setLobbyCountdown] = useState(60);
    const qrRef = useRef(null);
    const lobbyAudioRef = useRef(null);

    const roundCorrectRef = useRef({});
    const currentQuestionsRef = useRef([]);
    const nextPhaseTimeoutRef = useRef(null);
    const lobbyEndTimeRef = useRef(null);
    const startNewRoundRef = useRef(null);

    const baseUrl = window.location.origin + window.location.pathname;
    const joinUrl = `${baseUrl}?role=player&room=${roomId}${dbUrl ? `&db=${encodeURIComponent(dbUrl)}` : ''}`;

    // Музыка лобби: music/start.mp3
    const stopLobbyMusic = useCallback(() => {
        if (lobbyAudioRef.current) {
            try {
                lobbyAudioRef.current.pause();
                lobbyAudioRef.current.currentTime = 0;
            } catch (e) {
                console.log("Audio stop error", e);
            }
        }
    }, []);

    useEffect(() => {
        const audio = new Audio('music/start.mp3');
        audio.loop = true;
        lobbyAudioRef.current = audio;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.log("start.mp3 autoplay policy waiting for user interaction or file not found:", err);
            });
        }

        return () => {
            if (lobbyAudioRef.current) {
                lobbyAudioRef.current.pause();
                lobbyAudioRef.current.currentTime = 0;
                lobbyAudioRef.current = null;
            }
        };
    }, []);

    const startNewRound = useCallback(() => {
        stopLobbyMusic();
        if (nextPhaseTimeoutRef.current) clearTimeout(nextPhaseTimeoutRef.current);

        const currentPlayed = window.GameSync?._getState()?.playedCategories || gameState?.playedCategories || [];
        const allCategories = window.QuestionBank?.categories || [];
        
        let availableCategories = allCategories.filter(c => !currentPlayed.includes(c.id));
        if (availableCategories.length < 6) availableCategories = allCategories;
        const categories = [...availableCategories].sort(() => 0.5 - Math.random()).slice(0, 6);

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
            currentQuestions: [],
            roundMoves: {}
        });
    }, [gameState?.playedCategories, gameState?.players, stopLobbyMusic]);

    useEffect(() => {
        startNewRoundRef.current = startNewRound;
    }, [startNewRound]);

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
                players: {},
                roundMoves: {}
            });
        } catch (err) {
            console.error("Init host sync error", err);
        }
        return () => {
            if (nextPhaseTimeoutRef.current) clearTimeout(nextPhaseTimeoutRef.current);
        };
    }, [roomId, dbUrl]);

    const hasPlayersInLobby = Object.keys(gameState?.players || {}).length >= 1;

    // Авто-таймер лобби на ТВ: точный расчет по timestamp без зависания из-за ежесекундного пуллинга
    useEffect(() => {
        let timerInterval = null;

        if (gameState?.phase === 'lobby' && hasPlayersInLobby) {
            if (!lobbyEndTimeRef.current) {
                lobbyEndTimeRef.current = Date.now() + 60000;
            }

            const tick = () => {
                const remainingMs = lobbyEndTimeRef.current - Date.now();
                const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
                setLobbyCountdown(remainingSec);

                if (remainingSec <= 0) {
                    if (timerInterval) clearInterval(timerInterval);
                    lobbyEndTimeRef.current = null;
                    startNewRoundRef.current?.();
                }
            };

            tick();
            timerInterval = setInterval(tick, 250);
        } else {
            lobbyEndTimeRef.current = null;
            setLobbyCountdown(60);
        }

        return () => {
            if (timerInterval) clearInterval(timerInterval);
        };
    }, [gameState?.phase, hasPlayersInLobby]);

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

    // Анимация пошагового движения игроков через промисы без генераторов (полная совместимость с ES5)
    const executeRoundMovement = () => {
        setIsAnimatingRoundMoves(true);

        window.GameSync.updateState({ phase: 'board_move', timerEndTime: 0 }).then(() => {
            const playersCopy = JSON.parse(JSON.stringify(gameState?.players || {}));
            const initialPositions = {};
            const playerIds = Object.keys(playersCopy);
            playerIds.forEach(pid => {
                initialPositions[pid] = playersCopy[pid].position || 0;
            });

            const animatePlayerSteps = (playerIndex) => {
                if (playerIndex >= playerIds.length) {
                    const sorted = getSortedStandings(playersCopy);
                    const roundMoves = {};
                    sorted.forEach((p, index) => {
                        roundMoves[p.id] = {
                            rank: index + 1,
                            stepsGained: roundCorrectRef.current[p.id] || 0,
                            previousPos: initialPositions[p.id] || 0,
                            currentPos: p.position || 0
                        };
                    });

                    setIsAnimatingRoundMoves(false);

                    return window.GameSync.updateState({
                        phase: 'round_summary',
                        timerEndTime: Date.now() + 6000,
                        roundMoves,
                        players: playersCopy
                    });
                }

                const pid = playerIds[playerIndex];
                const steps = roundCorrectRef.current[pid] || 0;
                let currentPos = playersCopy[pid].position || 0;

                if (steps > 0 && playersCopy[pid].cheerAudio) {
                    try {
                        const cheer = new Audio(playersCopy[pid].cheerAudio);
                        cheer.play().catch(e => console.log("Cheer audio playback prevented or failed:", e));
                    } catch (err) {
                        console.log("Cheer audio play error:", err);
                    }
                }

                const stepOneByOne = (s) => {
                    if (s >= steps || currentPos >= TOTAL_CELLS - 1) {
                        playersCopy[pid].position = currentPos;
                        playersCopy[pid].score = (playersCopy[pid].score || 0) + steps;
                        return animatePlayerSteps(playerIndex + 1);
                    }

                    setWalkingPlayerId(pid);
                    currentPos += 1;
                    setVisualPositions(prev => ({ ...prev, [pid]: currentPos }));

                    return new Promise(res => setTimeout(res, 500))
                        .then(() => {
                            setWalkingPlayerId(null);
                            return new Promise(res => setTimeout(res, 150));
                        })
                        .then(() => {
                            return stepOneByOne(s + 1);
                        });
                };

                return stepOneByOne(0);
            };

            return animatePlayerSteps(0);
        }).catch(err => {
            console.error("Movement animation error:", err);
            setIsAnimatingRoundMoves(false);
        });
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
        } else if (phase === 'round_summary') {
            if (isTimeUp) {
                const winner = Object.values(players || {}).find(p => (p.position || 0) >= TOTAL_CELLS - 1);
                if (winner) {
                    window.GameSync.updateState({ phase: 'finish', winnerId: winner.id });
                } else {
                    startNewRound();
                }
            }
        }
    }, [gameState, handleVoteFinished, handleShowResultPhase, startNewRound]);

    if (!gameState) return <div className="flex items-center justify-center h-full text-3xl font-black">Загрузка игры...</div>;

    const { phase, categoriesToVote, currentQuestionIndex, players, winnerId, categoryVotes, playerAnswers, roundMoves } = gameState;
    const playersList = Object.values(players || {});
    const questionsList = currentQuestionsRef.current.length ? currentQuestionsRef.current : (gameState.currentQuestions || []);
    const currentQ = questionsList[currentQuestionIndex] || null;
    const currentQCorrectIndex = currentQ ? (currentQ.correctIndex ?? currentQ.correct ?? 0) : 0;

    // Группировка игроков по клеткам
    const cellOccupantsMap = {};
    playersList.forEach(p => {
        const cellPos = visualPositions[p.id] ?? p.position ?? 0;
        if (!cellOccupantsMap[cellPos]) cellOccupantsMap[cellPos] = [];
        cellOccupantsMap[cellPos].push(p.id);
    });

    const triggerUserGestureAudio = () => {
        if (gameState?.phase === 'lobby' && lobbyAudioRef.current && lobbyAudioRef.current.paused) {
            lobbyAudioRef.current.play().catch(() => {});
        }
    };

    return (
        <div 
            onClick={triggerUserGestureAudio}
            className="tv-container relative w-screen h-screen flex flex-col p-0 m-0 overflow-hidden"
        >
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
                        {playersList.length >= 1 && (
                            <div className="auto-timer-badge text-sm font-bold text-black bg-yellow-300 border-2 border-black px-4 py-2 rounded-xl mb-4 animate-pulse">
                                Игра начнется автоматически через {lobbyCountdown} сек (или подключите еще игроков)
                            </div>
                        )}
                        <h3 className="text-xl mb-3 font-bold text-yellow-200">Игроки ({playersList.length}/10):</h3>
                        <div className="flex flex-wrap justify-center gap-4 mb-6 min-h-[90px] max-w-xl mx-auto">
                            {playersList.length === 0 && <p className="text-yellow-100 self-center">Ожидание подключения с телефона...</p>}
                            {playersList.map(p => (
                                <div key={p.id} className="flex flex-col items-center">
                                    <div 
                                        className="w-16 h-16 rounded-full overflow-hidden border-4 border-black mb-2 flex items-center justify-center shadow-lg" 
                                        style={{ backgroundColor: p.color || '#FF3B30', borderColor: p.color || '#000000' }}
                                    >
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
                    <div className="glass-card p-6 text-center max-w-4xl w-full">
                        <h2 className="text-4xl font-extrabold mb-2">Выбор категории</h2>
                        <p className="text-lg text-yellow-100 mb-4">Голосуйте с телефонов прямо сейчас!</p>
                        <div className="timer-track mb-6">
                            <div className="timer-bar" style={{ width: `${(timeLeft / 10) * 100}%` }}></div>
                        </div>
                        {/* 6 категорий в 3 колонки */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            {(categoriesToVote || []).map((cat, i) => (
                                <div key={i} className="glass-card p-4 bg-indigo-900/60 flex flex-col items-center justify-between rounded-2xl border-4 border-black min-h-[140px]">
                                    <span className="text-4xl md:text-5xl mb-2">{cat.icon}</span>
                                    <h3 className="category-card-title text-xl md:text-2xl font-bold mb-2 text-center">{cat.name}</h3>
                                    <div className="flex gap-1.5 min-h-[36px] items-center justify-center flex-wrap">
                                        {playersList.filter(p => categoryVotes?.[p.id] === cat.id).map(p => (
                                            <div 
                                                key={p.id} 
                                                className="w-8 h-8 rounded-full border-2 border-black overflow-hidden flex items-center justify-center shadow-md" 
                                                style={{ backgroundColor: p.color || '#FF3B30', borderColor: p.color || '#000000' }}
                                            >
                                                {isSafeImageSrc(p.selfie) ? <img src={p.selfie} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-black">{p.selfie || '👤'}</span>}
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
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-2xl text-yellow-300 font-black uppercase">Вопрос {currentQuestionIndex + 1} из 4</span>
                            <span className="text-4xl font-mono font-black bg-black text-yellow-300 px-6 py-1.5 rounded-xl border-2 border-black">
                                {phase === 'answer_reveal' ? '✓ Ответ' : `${timeLeft}s`}
                            </span>
                        </div>

                        {currentQ.imageUrl && isSafeImageSrc(currentQ.imageUrl) && (
                            <div className="mb-5 flex justify-center">
                                <img 
                                    src={currentQ.imageUrl} 
                                    alt="question" 
                                    className="max-h-56 max-w-full rounded-2xl border-4 border-black object-contain bg-black/40 shadow-xl" 
                                />
                            </div>
                        )}

                        <h2 className="text-3xl md:text-4xl font-black mb-6 leading-snug">{currentQ.text || currentQ.q}</h2>
                        <div className="grid grid-cols-2 gap-5">
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
                                            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
                                                {playersChosenThis.map(p => (
                                                    <div 
                                                        key={p.id} 
                                                        className="w-11 h-11 rounded-full border-3 border-black overflow-hidden flex items-center justify-center shadow-lg" 
                                                        style={{ backgroundColor: p.color || '#FF3B30' }}
                                                    >
                                                        {isSafeImageSrc(p.selfie) ? <img src={p.selfie} className="w-full h-full object-cover" /> : <span className="text-lg text-black font-bold">{p.selfie || '👤'}</span>}
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

                {phase === 'round_summary' && (
                    <div className="round-summary-modal fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6">
                        <div className="glass-card max-w-2xl w-full p-8 text-center max-h-[90vh] overflow-y-auto">
                            <h2 className="text-4xl font-black mb-2 text-yellow-300">Итоги раунда</h2>
                            <p className="text-lg text-yellow-100 mb-4">Фигурки продвинулись вперед!</p>
                            <div className="timer-track mb-6">
                                <div className="timer-bar" style={{ width: `${(timeLeft / 6) * 100}%` }}></div>
                            </div>
                            <div className="space-y-3 mb-6">
                                {getSortedStandings(players).map((p, idx) => {
                                    const moveData = roundMoves?.[p.id] || {
                                        rank: idx + 1,
                                        stepsGained: roundCorrectRef.current[p.id] || 0,
                                        currentPos: p.position || 0
                                    };
                                    const badgeClass = moveData.rank === 1 ? 'bg-yellow-400 text-black' : moveData.rank === 2 ? 'bg-slate-300 text-black' : moveData.rank === 3 ? 'bg-amber-600 text-white' : 'bg-indigo-700 text-white';
                                    return (
                                        <div key={p.id} className="round-summary-item flex items-center justify-between p-3 rounded-2xl bg-indigo-900/80 border-3 border-black">
                                            <div className="flex items-center gap-4">
                                                <div className={`round-summary-badge w-10 h-10 rounded-full flex items-center justify-center font-black text-xl border-2 border-black ${badgeClass}`}>
                                                    {moveData.rank}
                                                </div>
                                                <div 
                                                    className="w-12 h-12 rounded-full border-3 border-black overflow-hidden flex items-center justify-center" 
                                                    style={{ backgroundColor: p.color || '#FF3B30' }}
                                                >
                                                    {isSafeImageSrc(p.selfie) ? <img src={p.selfie} className="w-full h-full object-cover" /> : <span className="text-2xl text-black">{p.selfie || '👤'}</span>}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-black text-xl text-white">{p.name}</div>
                                                    <div className="text-xs text-yellow-200 font-bold">Клетка: {Math.min(TOTAL_CELLS, (moveData.currentPos || 0) + 1)} / {TOTAL_CELLS}</div>
                                                </div>
                                            </div>
                                            <div className="round-summary-steps text-xl font-black px-4 py-1.5 rounded-xl border-2 border-black bg-lime-400 text-black">
                                                +{moveData.stepsGained} {moveData.stepsGained === 1 ? 'клетка' : (moveData.stepsGained >= 2 && moveData.stepsGained <= 4) ? 'клетки' : 'клеток'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="text-2xl font-mono font-black text-yellow-300">Следующий раунд через {timeLeft} сек</div>
                        </div>
                    </div>
                )}

                {phase === 'finish' && players && players[winnerId] && (
                    <div className="glass-card p-12 text-center border-4 border-black max-w-xl">
                        <h1 className="text-6xl font-black mb-6 text-yellow-300 drop-shadow-lg">ПОБЕДИТЕЛЬ!</h1>
                        <div className="flex flex-col items-center">
                            <div 
                                className="w-48 h-48 rounded-full border-8 border-black mb-4 overflow-hidden flex items-center justify-center" 
                                style={{ backgroundColor: players[winnerId].color || '#FF3B30' }}
                            >
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
    const [playerId, setPlayerId] = useState(safeGetItem('tv_game_player_id') || safeGetItem('playerId') || null);
    const [isJoined, setIsJoined] = useState(false);
    const [name, setName] = useState('');
    const [color, setColor] = useState(PLAYER_COLORS[0]);
    const [selfie, setSelfie] = useState(null);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);

    // Состояния аудио победного клича (3 секунды)
    const [cheerAudio, setCheerAudio] = useState(null);
    const [isRecordingCheer, setIsRecordingCheer] = useState(false);
    const [cheerCountdown, setCheerCountdown] = useState(3);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordTimerRef = useRef(null);
    const cheerPreviewRef = useRef(null);

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

        return () => {
            if (recordTimerRef.current) clearInterval(recordTimerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                try { mediaRecorderRef.current.stop(); } catch(e) {}
            }
        };
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

    // Запись 3-секундного победного клича на промисах без async/await
    const startRecordingCheer = () => {
        if (isRecordingCheer) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Ваш браузер не поддерживает запись аудио.");
            return;
        }

        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            audioChunksRef.current = [];

            let mimeType = '';
            if (window.MediaRecorder) {
                if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
                else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
                else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
            }

            const options = mimeType ? { mimeType } : {};
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    setCheerAudio(reader.result);
                    setIsRecordingCheer(false);
                };
                reader.readAsDataURL(blob);
            };

            mediaRecorder.start();
            setIsRecordingCheer(true);
            setCheerCountdown(3);

            let remaining = 3;
            if (recordTimerRef.current) clearInterval(recordTimerRef.current);
            recordTimerRef.current = setInterval(() => {
                remaining -= 1;
                setCheerCountdown(remaining);
                if (remaining <= 0) {
                    clearInterval(recordTimerRef.current);
                    recordTimerRef.current = null;
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                        mediaRecorderRef.current.stop();
                    }
                }
            }, 1000);
        }).catch((err) => {
            console.error("Microphone error:", err);
            alert("Не удалось получить доступ к микрофону. Клич можно пропустить.");
            setIsRecordingCheer(false);
        });
    };

    const playCheerPreview = () => {
        if (!cheerAudio) return;
        if (cheerPreviewRef.current) {
            cheerPreviewRef.current.pause();
        }
        const audio = new Audio(cheerAudio);
        cheerPreviewRef.current = audio;
        audio.play().catch(e => console.log("Audio play error", e));
    };

    const isRoomFull = useMemo(() => {
        const count = Object.keys(gameState?.players || {}).length;
        return count >= 10 && !Boolean(gameState?.players?.[playerId]);
    }, [gameState?.players, playerId]);

    const handleJoin = () => {
        if (isRoomFull) {
            return alert("Комната заполнена (максимум 10 игроков)");
        }
        const assignedColor = color || PLAYER_COLORS.find(c => !usedColors.includes(c)) || '#FF3B30';
        if (!name.trim() || !selfie || !assignedColor || usedColors.includes(assignedColor)) {
            return alert("Заполните имя, выберите селфи и свободный цвет!");
        }

        const newId = playerId || generatePlayerId();
        setPlayerId(newId);
        safeSetItem('playerId', newId);
        safeSetItem('tv_game_player_id', newId);

        window.GameSync.updateState({
            players: {
                ...(gameState?.players || {}),
                [newId]: { 
                    id: newId, 
                    name: name.trim().slice(0, 12), 
                    color: assignedColor, 
                    selfie, 
                    cheerAudio: cheerAudio || null,
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
                <div className="glass-card w-full max-w-sm !p-4 space-y-2.5 my-auto max-h-[96dvh] overflow-y-auto">
                    <h2 className="text-2xl font-black text-center text-yellow-300 leading-tight">Вход в игру</h2>
                    
                    <div className="flex flex-col items-center gap-2">
                        <div 
                            className="camera-preview-container relative w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border-3 border-black shrink-0 shadow-md" 
                            style={{ backgroundColor: color || '#FF3B30', borderColor: color || '#000000' }}
                        >
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

                    {/* Выбор цвета из 10 цветов с белой подсветкой выбранного */}
                    <div className="color-picker-grid grid grid-cols-5 gap-2 pt-1 justify-items-center w-full">
                        {PLAYER_COLORS.map(c => {
                            const isTaken = usedColors.includes(c);
                            const isSelected = color === c;
                            return (
                                <button 
                                    key={c} 
                                    type="button"
                                    onClick={() => !isTaken && setColor(c)} 
                                    disabled={isTaken} 
                                    className={`color-select-btn w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-base transition-transform ${isSelected ? 'selected' : ''}`} 
                                    style={{ backgroundColor: c }}
                                >
                                    {isSelected ? '✓' : ''}
                                </button>
                            );
                        })}
                    </div>

                    {/* Запись победного клича (3 секунды) */}
                    <div className="w-full bg-black/30 p-2.5 rounded-xl border-2 border-black flex flex-col items-center gap-2">
                        <div className="text-xs font-black text-yellow-300 uppercase tracking-wide">Победный клич (3 сек)</div>
                        {!cheerAudio ? (
                            <button 
                                type="button"
                                onClick={startRecordingCheer}
                                disabled={isRecordingCheer}
                                className={`primary-btn audio-record-btn w-full !py-2 text-sm ${isRecordingCheer ? 'audio-record-active !bg-red-600 animate-pulse text-white' : '!bg-amber-400'}`}
                            >
                                {isRecordingCheer ? `🔴 Запись клича... (${cheerCountdown} сек)` : '🎤 Записать победный клич'}
                            </button>
                        ) : (
                            <div className="flex gap-2 w-full">
                                <button 
                                    type="button" 
                                    onClick={playCheerPreview} 
                                    className="primary-btn flex-1 !py-2 text-sm !bg-emerald-500 hover:!bg-emerald-600"
                                >
                                    ▶️ Прослушать
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => { setCheerAudio(null); startRecordingCheer(); }} 
                                    className="primary-btn flex-1 !py-2 text-sm !bg-gray-600 hover:!bg-gray-700"
                                >
                                    🔄 Переписать
                                </button>
                            </div>
                        )}
                    </div>

                    {isRoomFull && (
                        <div className="text-red-400 font-bold text-center text-sm">
                            Комната заполнена (максимум 10 игроков)
                        </div>
                    )}

                    <button 
                        onClick={handleJoin} 
                        disabled={isRoomFull} 
                        className="primary-btn w-full !mt-2 text-lg !py-2.5"
                    >
                        {isRoomFull ? 'Комната заполнена' : 'Войти в игру'}
                    </button>
                </div>
            </div>
        );
    }

    const { phase, categoriesToVote, currentQuestionIndex, currentQuestions, players, categoryVotes, playerAnswers, roundMoves } = gameState;
    const myPlayer = players[playerId];
    const myRank = getSortedStandings(players).findIndex(p => p.id === playerId) + 1;
    const hasVoted = Boolean(categoryVotes?.[playerId]);
    const hasAnswered = playerAnswers?.[playerId] !== undefined;
    const currentQ = (currentQuestions || [])[currentQuestionIndex] || null;

    return (
        <div className="mobile-container select-none">
            <div className="glass-card p-3 mb-2 flex items-center justify-between !py-2 !px-4 !rounded-2xl shrink-0">
                <div className="flex items-center gap-3">
                    <div 
                        className="w-10 h-10 rounded-full border-2 border-black overflow-hidden flex items-center justify-center" 
                        style={{ backgroundColor: myPlayer.color || '#FF3B30' }}
                    >
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
                    <div className="flex flex-col gap-2 h-full justify-center overflow-y-auto py-2">
                        <h2 className="text-xl font-black text-center mb-1 text-yellow-300">Выберите тему (из 6):</h2>
                        <div className="grid grid-cols-2 gap-2">
                            {(categoriesToVote || []).map(cat => {
                                const isChosen = categoryVotes?.[playerId] === cat.id;
                                return (
                                    <button 
                                        key={cat.id} 
                                        onClick={() => sendVote(cat.id)} 
                                        disabled={hasVoted} 
                                        className={`glass-card flex flex-col items-center justify-center text-center p-3 transition-all min-h-[90px] ${isChosen ? '!bg-yellow-400 !text-black !border-black font-black' : ''} ${hasVoted && !isChosen ? 'opacity-40 grayscale' : ''}`}
                                    >
                                        <span className="text-3xl mb-1">{cat.icon}</span>
                                        <span className="category-card-title text-sm font-bold line-clamp-2">{cat.name}</span>
                                    </button>
                                );
                            })}
                        </div>
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

                {phase === 'round_summary' && (
                    <div className="round-summary-modal flex flex-col justify-center items-center text-center glass-card p-6 border-4 border-black my-auto">
                        <div className="text-5xl mb-3 animate-bounce">📊</div>
                        <h2 className="text-3xl font-black mb-4 text-yellow-300">Итоги раунда</h2>
                        {roundMoves?.[playerId] ? (
                            <div className="w-full space-y-3">
                                <div className="round-summary-badge inline-flex items-center justify-center px-4 py-2 rounded-xl text-xl font-black bg-yellow-400 text-black border-2 border-black mb-2">
                                    {roundMoves[playerId].rank} место
                                </div>
                                <div className="round-summary-steps text-2xl font-black py-2 px-4 rounded-xl border-2 border-black bg-lime-400 text-black">
                                    +{roundMoves[playerId].stepsGained} {roundMoves[playerId].stepsGained === 1 ? 'шаг' : 'шага'}
                                </div>
                                <div className="text-lg font-bold text-white bg-indigo-900/70 p-3 rounded-xl border-2 border-black">
                                    Текущая клетка: <span className="text-yellow-300 font-black">{Math.min(TOTAL_CELLS, (roundMoves[playerId].currentPos || 0) + 1)}</span> из {TOTAL_CELLS}
                                </div>
                            </div>
                        ) : (
                            <p className="text-lg font-bold">Подведение итогов...</p>
                        )}
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