// filename: app.js
var h = React.createElement;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useCallback = React.useCallback;
var useMemo = React.useMemo;

// Безопасное хранилище LocalStorage с обработкой SecurityError в Safari Private Browsing
var safeStorage = {
    getItem: function(key) {
        try {
            return window.localStorage ? window.localStorage.getItem(key) : null;
        } catch (e) {
            return null;
        }
    },
    setItem: function(key, val) {
        try {
            if (window.localStorage) {
                window.localStorage.setItem(key, val);
            }
        } catch (e) {}
    }
};

var TOTAL_CELLS = 25; // Индексы 0..24 в сетке 5x5
var GRID_SIZE = 5;

function generateRoomId() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function generatePlayerId() {
    return 'p_' + Math.random().toString(36).substring(2, 9);
}

// Змейка 5x5 (0..24)
function getGridPos(index) {
    var safeIndex = Math.max(0, Math.min(index, TOTAL_CELLS - 1));
    var row = Math.floor(safeIndex / GRID_SIZE);
    var isEvenRow = row % 2 === 0;
    var col = isEvenRow ? (safeIndex % GRID_SIZE) : (GRID_SIZE - 1 - (safeIndex % GRID_SIZE));
    return { row: row + 1, col: col + 1 };
}

var EMOJI_AVATARS = ['😎', '🤪', '🤡', '👽', '🤖', '😺', '🤠', '🦊', '🥳', '👻'];
var PLAYER_COLORS = [
    '#FF3B30', '#007AFF', '#34C759', '#FFCC00', '#AF52DE', 
    '#FF9500', '#00E5FF', '#FF2D55', '#30D158', '#E040FB'
];

function isSafeImageSrc(src) {
    if (!src || typeof src !== 'string') return false;
    return src.indexOf('data:image/') === 0 || src.indexOf('https://') === 0;
}

function getSortedStandings(playersObj) {
    var list = [];
    if (playersObj) {
        for (var k in playersObj) {
            if (Object.prototype.hasOwnProperty.call(playersObj, k)) {
                list.push(playersObj[k]);
            }
        }
    }
    return list.sort(function(a, b) {
        var posDiff = (b.position || 0) - (a.position || 0);
        if (posDiff !== 0) return posDiff;
        return (b.score || 0) - (a.score || 0);
    });
}

// Смещение фишек для поддержки до 10 игроков на одной клетке
function getPawnOffset(indexInCell, totalInCell) {
    if (totalInCell <= 1) return { x: 0, y: 0, scale: 1 };
    if (totalInCell === 2) {
        return { x: indexInCell === 0 ? -18 : 18, y: 0, scale: 0.85 };
    }
    if (totalInCell === 3) {
        var offsets3 = [
            { x: -18, y: -10 },
            { x: 18, y: -10 },
            { x: 0, y: 14 }
        ];
        var item3 = offsets3[indexInCell] || { x: 0, y: 0 };
        return { x: item3.x, y: item3.y, scale: 0.8 };
    }
    if (totalInCell === 4) {
        var offsets4 = [
            { x: -18, y: -14 },
            { x: 18, y: -14 },
            { x: -18, y: 14 },
            { x: 18, y: 14 }
        ];
        var item4 = offsets4[indexInCell] || { x: 0, y: 0 };
        return { x: item4.x, y: item4.y, scale: 0.75 };
    }

    var angle = (indexInCell / totalInCell) * 2 * Math.PI;
    var radius = 24;
    return {
        x: Math.round(Math.cos(angle) * radius),
        y: Math.round(Math.sin(angle) * radius),
        scale: totalInCell > 6 ? 0.6 : 0.7
    };
}

function Pawn(props) {
    var color = props.color || '#FF3B30';
    var selfie = props.selfie;
    var isWalking = Boolean(props.isWalking);
    var position = (props.position !== undefined && props.position !== null) ? props.position : 0;
    var offsetIndex = (props.offsetIndex !== undefined && props.offsetIndex !== null) ? props.offsetIndex : 0;
    var totalOnCell = (props.totalOnCell !== undefined && props.totalOnCell !== null) ? props.totalOnCell : 1;

    var pos = getGridPos(position);
    var offset = getPawnOffset(offsetIndex, totalOnCell);
    var playerColor = color;

    var headContent;
    if (isSafeImageSrc(selfie)) {
        headContent = h('img', {
            src: selfie,
            alt: 'head',
            className: 'w-full h-full object-cover rounded-full'
        });
    } else {
        headContent = h('span', { className: 'text-3xl select-none' }, selfie || '👤');
    }

    var wrapperClasses = 'pawn-wrapper ' + (isWalking ? 'pawn-walking ' : '') + 'absolute pointer-events-none transition-all duration-300 flex flex-col items-center justify-center';

    return h('div', {
        className: wrapperClasses,
        style: {
            gridRow: pos.row,
            gridColumn: pos.col,
            '--player-color': playerColor,
            transform: 'translate(' + offset.x + 'px, ' + offset.y + 'px) scale(' + offset.scale + ')',
            zIndex: isWalking ? 999 : (20 + offsetIndex)
        }
    },
        h('div', {
            className: 'pawn-selfie-head',
            style: {
                backgroundColor: playerColor,
                borderColor: playerColor,
                '--player-color': playerColor
            }
        }, headContent),
        h('div', {
            className: 'pawn-body',
            style: {
                backgroundColor: playerColor,
                '--player-color': playerColor
            }
        })
    );
}

function CameraModal(props) {
    var isOpen = props.isOpen;
    var onClose = props.onClose;
    var onSave = props.onSave;

    var videoRef = useRef(null);
    var onCloseRef = useRef(onClose);
    var photoState = useState(null);
    var photo = photoState[0];
    var setPhoto = photoState[1];
    var videoReadyState = useState(false);
    var isVideoReady = videoReadyState[0];
    var setIsVideoReady = videoReadyState[1];

    useEffect(function() {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(function() {
        var stream = null;
        var isCancelled = false;

        if (isOpen && !photo) {
            setIsVideoReady(false);
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }
                }).then(function(s) {
                    if (isCancelled) {
                        s.getTracks().forEach(function(track) { track.stop(); });
                        return;
                    }
                    stream = s;
                    if (videoRef.current) {
                        videoRef.current.srcObject = s;
                    }
                }).catch(function(err) {
                    console.error("Camera access error:", err);
                    alert("Ошибка доступа к камере. Пожалуйста, выберите эмодзи.");
                    if (onCloseRef.current) onCloseRef.current();
                });
            } else {
                alert("Камера не поддерживается вашим браузером. Выберите эмодзи.");
                if (onCloseRef.current) onCloseRef.current();
            }
        }

        return function() {
            isCancelled = true;
            if (stream) {
                stream.getTracks().forEach(function(track) { track.stop(); });
            }
        };
    }, [isOpen, photo]);

    if (!isOpen) return null;

    function handleTake() {
        var videoEl = videoRef.current;
        if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0) {
            return;
        }
        try {
            if (window.captureSelfie) {
                window.captureSelfie(videoEl).then(function(base64) {
                    setPhoto(base64);
                }).catch(function(e) {
                    console.error(e);
                    alert("Не удалось сделать снимок");
                });
            } else {
                var canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 256;
                var ctx = canvas.getContext('2d');
                var minDim = Math.min(videoEl.videoWidth, videoEl.videoHeight);
                var startX = (videoEl.videoWidth - minDim) / 2;
                var startY = (videoEl.videoHeight - minDim) / 2;
                ctx.drawImage(videoEl, startX, startY, minDim, minDim, 0, 0, 256, 256);
                setPhoto(canvas.toDataURL('image/jpeg', 0.85));
            }
        } catch (e) {
            console.error(e);
            alert("Не удалось сделать снимок");
        }
    }

    function handleRetake() {
        setPhoto(null);
    }

    function handleSave() {
        onSave(photo);
        onClose();
    }

    var previewElement;
    if (!photo) {
        previewElement = h('video', {
            ref: videoRef,
            autoPlay: true,
            playsInline: true,
            muted: true,
            onLoadedData: function() { setIsVideoReady(true); },
            onCanPlay: function() { setIsVideoReady(true); },
            className: 'w-full h-full object-cover'
        });
    } else {
        previewElement = h('img', {
            src: photo,
            alt: 'captured',
            className: 'w-full h-full object-cover'
        });
    }

    var controlsElement;
    if (!photo) {
        controlsElement = h('button', {
            onClick: handleTake,
            disabled: !isVideoReady,
            className: 'primary-btn w-full ' + (!isVideoReady ? 'opacity-50 cursor-wait' : '')
        }, isVideoReady ? '📸 Сфотографировать' : 'Запуск камеры...');
    } else {
        controlsElement = h('div', { className: 'flex gap-3 w-full' },
            h('button', {
                onClick: handleRetake,
                className: 'primary-btn w-1/2 !bg-gray-500 hover:!bg-gray-600'
            }, 'Переснять'),
            h('button', {
                onClick: handleSave,
                className: 'primary-btn w-1/2'
            }, 'Сохранить')
        );
    }

    return h('div', { className: 'camera-modal fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4' },
        h('div', { className: 'glass-card p-5 flex flex-col items-center max-w-sm w-full relative' },
            h('button', {
                onClick: onClose,
                className: 'absolute top-3 right-4 text-white text-3xl font-bold'
            }, '\u00D7'),
            h('h3', { className: 'text-xl font-bold mb-4 text-white' }, 'Сделайте селфи'),
            h('div', { className: 'camera-video-preview w-60 h-60 bg-black rounded-3xl overflow-hidden mb-5 border-4 border-yellow-400 relative flex items-center justify-center' },
                previewElement
            ),
            h('div', { className: 'camera-controls flex gap-3 w-full' }, controlsElement)
        )
    );
}

function StartScreen() {
    var storedUrl = safeStorage.getItem('firebaseDbUrl');
    var defaultUrl = 'https://quiz-c032b-default-rtdb.europe-west1.firebasedatabase.app';
    var dbUrlState = useState(storedUrl || defaultUrl);
    var dbUrl = dbUrlState[0];
    var setDbUrl = dbUrlState[1];

    var countdownState = useState(30);
    var countdown = countdownState[0];
    var setCountdown = countdownState[1];

    var handleHost = useCallback(function() {
        safeStorage.setItem('firebaseDbUrl', dbUrl);
        var room = generateRoomId();
        var baseUrl = window.location.origin + window.location.pathname;
        window.location.href = baseUrl + '?role=host&room=' + room + '&db=' + encodeURIComponent(dbUrl);
    }, [dbUrl]);

    useEffect(function() {
        var timer = setInterval(function() {
            setCountdown(function(prev) {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleHost();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return function() { clearInterval(timer); };
    }, [handleHost]);

    function handlePlayer() {
        safeStorage.setItem('firebaseDbUrl', dbUrl);
        var room = prompt('Введите 4-значный код комнаты:');
        if (room) {
            var baseUrl = window.location.origin + window.location.pathname;
            window.location.href = baseUrl + '?role=player&room=' + room.trim().toUpperCase() + '&db=' + encodeURIComponent(dbUrl);
        }
    }

    return h('div', { className: 'flex flex-col items-center justify-center h-full p-4 tv-container' },
        h('div', { className: 'glass-card p-8 max-w-md w-full text-center space-y-6' },
            h('h1', { className: 'text-5xl font-black mb-4 text-yellow-300 drop-shadow-md' }, 'Пати Квиз'),
            h('div', { className: 'auto-timer-badge text-sm font-bold text-yellow-300 bg-black/40 border-2 border-black px-4 py-2 rounded-full inline-block' },
                'Автоматическое создание комнаты через: ' + countdown + ' сек...'
            ),
            h('div', { className: 'text-left' },
                h('label', { className: 'block text-sm mb-2 text-white font-bold' }, 'Firebase Realtime DB URL:'),
                h('input', {
                    type: 'text',
                    value: dbUrl,
                    onChange: function(e) { setDbUrl(e.target.value); },
                    placeholder: 'https://your-project.firebaseio.com',
                    className: 'w-full p-3 rounded-xl bg-white border-2 border-black text-black font-bold outline-none'
                })
            ),
            h('div', { className: 'space-y-4 pt-4' },
                h('button', {
                    onClick: handleHost,
                    className: 'primary-btn w-full py-4 text-xl shadow-lg'
                }, 'Экран ТВ (Хост)'),
                h('button', {
                    onClick: handlePlayer,
                    className: 'w-full py-4 rounded-xl text-xl font-bold bg-white/20 hover:bg-white/30 border-2 border-black transition-colors'
                }, 'Телефон (Игрок)')
            )
        )
    );
}

function TVApp(props) {
    var roomId = props.roomId;
    var dbUrl = props.dbUrl;

    var gameStateState = useState(null);
    var gameState = gameStateState[0];
    var setGameState = gameStateState[1];

    var visualPositionsState = useState({});
    var visualPositions = visualPositionsState[0];
    var setVisualPositions = visualPositionsState[1];

    var walkingPlayerIdState = useState(null);
    var walkingPlayerId = walkingPlayerIdState[0];
    var setWalkingPlayerId = walkingPlayerIdState[1];

    var isAnimatingRoundMovesState = useState(false);
    var isAnimatingRoundMoves = isAnimatingRoundMovesState[0];
    var setIsAnimatingRoundMoves = isAnimatingRoundMovesState[1];

    var timeLeftState = useState(0);
    var timeLeft = timeLeftState[0];
    var setTimeLeft = timeLeftState[1];

    var lobbyCountdownState = useState(60);
    var lobbyCountdown = lobbyCountdownState[0];
    var setLobbyCountdown = lobbyCountdownState[1];

    var qrRef = useRef(null);
    var lobbyAudioRef = useRef(null);

    var roundCorrectRef = useRef({});
    var currentQuestionsRef = useRef([]);
    var nextPhaseTimeoutRef = useRef(null);
    var lobbyEndTimeRef = useRef(null);
    var startNewRoundRef = useRef(null);

    var baseUrl = window.location.origin + window.location.pathname;
    var joinUrl = baseUrl + '?role=player&room=' + roomId + (dbUrl ? ('&db=' + encodeURIComponent(dbUrl)) : '');

    var stopLobbyMusic = useCallback(function() {
        if (lobbyAudioRef.current) {
            try {
                lobbyAudioRef.current.pause();
                lobbyAudioRef.current.currentTime = 0;
            } catch (e) {
                console.log("Audio stop error", e);
            }
        }
    }, []);

    useEffect(function() {
        var audio = new Audio('music/start.mp3');
        audio.loop = true;
        lobbyAudioRef.current = audio;

        var playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(function(err) {
                console.log("start.mp3 autoplay policy waiting for user interaction or file not found:", err);
            });
        }

        return function() {
            if (lobbyAudioRef.current) {
                lobbyAudioRef.current.pause();
                lobbyAudioRef.current.currentTime = 0;
                lobbyAudioRef.current = null;
            }
        };
    }, []);

    var startNewRound = useCallback(function() {
        stopLobbyMusic();
        if (nextPhaseTimeoutRef.current) clearTimeout(nextPhaseTimeoutRef.current);

        var currentPlayed = [];
        var syncState = window.GameSync ? window.GameSync._getState() : null;
        if (syncState && syncState.playedCategories) {
            currentPlayed = syncState.playedCategories;
        } else if (gameState && gameState.playedCategories) {
            currentPlayed = gameState.playedCategories;
        }

        var allCategories = (window.QuestionBank && window.QuestionBank.categories) ? window.QuestionBank.categories : [];
        var availableCategories = allCategories.filter(function(c) {
            return currentPlayed.indexOf(c.id) === -1;
        });
        if (availableCategories.length < 6) {
            availableCategories = allCategories;
        }
        var categories = availableCategories.slice().sort(function() {
            return 0.5 - Math.random();
        }).slice(0, 6);

        roundCorrectRef.current = {};
        var players = (gameState && gameState.players) ? gameState.players : {};
        for (var pid in players) {
            if (Object.prototype.hasOwnProperty.call(players, pid)) {
                roundCorrectRef.current[pid] = 0;
            }
        }

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
    }, [gameState && gameState.playedCategories, gameState && gameState.players, stopLobbyMusic]);

    useEffect(function() {
        startNewRoundRef.current = startNewRound;
    }, [startNewRound]);

    useEffect(function() {
        try {
            window.GameSync.onStateChange(function(newState) {
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
        return function() {
            if (nextPhaseTimeoutRef.current) clearTimeout(nextPhaseTimeoutRef.current);
        };
    }, [roomId, dbUrl]);

    var hasPlayersInLobby = Object.keys((gameState && gameState.players) || {}).length >= 1;

    // Авто-таймер лобби на ТВ: зависимость ТОЛЬКО [gameState && gameState.phase, hasPlayersInLobby]
    // без сброса таймера при пуллинге Firebase
    useEffect(function() {
        var timerInterval = null;

        if (gameState && gameState.phase === 'lobby' && hasPlayersInLobby) {
            if (!lobbyEndTimeRef.current) {
                lobbyEndTimeRef.current = Date.now() + 60000;
            }

            var tick = function() {
                var remainingMs = lobbyEndTimeRef.current - Date.now();
                var remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
                setLobbyCountdown(remainingSec);

                if (remainingSec <= 0) {
                    if (timerInterval) clearInterval(timerInterval);
                    lobbyEndTimeRef.current = null;
                    if (startNewRoundRef.current) {
                        startNewRoundRef.current();
                    }
                }
            };

            tick();
            timerInterval = setInterval(tick, 250);
        } else {
            lobbyEndTimeRef.current = null;
            setLobbyCountdown(60);
        }

        return function() {
            if (timerInterval) clearInterval(timerInterval);
        };
    }, [gameState && gameState.phase, hasPlayersInLobby]);

    useEffect(function() {
        if (!gameState || !gameState.players || isAnimatingRoundMoves) return;
        var positions = {};
        for (var pid in gameState.players) {
            if (Object.prototype.hasOwnProperty.call(gameState.players, pid)) {
                positions[pid] = gameState.players[pid].position || 0;
            }
        }
        setVisualPositions(positions);
    }, [gameState && gameState.players, isAnimatingRoundMoves]);

    useEffect(function() {
        if (gameState && gameState.phase === 'lobby' && qrRef.current) {
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
    }, [gameState && gameState.phase, joinUrl]);

    useEffect(function() {
        var timerInterval = null;
        var syncTime = function() {
            if (gameState && gameState.timerEndTime && gameState.timerEndTime > 0) {
                var diff = gameState.timerEndTime - Date.now();
                setTimeLeft(Math.max(0, Math.ceil(diff / 1000)));
            } else {
                setTimeLeft(0);
            }
        };

        syncTime();
        timerInterval = setInterval(syncTime, 250);
        return function() { clearInterval(timerInterval); };
    }, [gameState && gameState.timerEndTime, gameState && gameState.phase, gameState && gameState.currentQuestionIndex]);

    var handleVoteFinished = useCallback(function() {
        if (!gameState) return;
        var votes = gameState.categoryVotes || {};
        var voteCounts = {};
        for (var vKey in votes) {
            if (Object.prototype.hasOwnProperty.call(votes, vKey)) {
                var cat = votes[vKey];
                voteCounts[cat] = (voteCounts[cat] || 0) + 1;
            }
        }

        var chosenCat = 'cinema';
        if (gameState.categoriesToVote && gameState.categoriesToVote.length > 0 && gameState.categoriesToVote[0]) {
            chosenCat = gameState.categoriesToVote[0].id || 'cinema';
        }
        var maxCount = -1;
        for (var cId in voteCounts) {
            if (Object.prototype.hasOwnProperty.call(voteCounts, cId)) {
                var cnt = voteCounts[cId];
                if (cnt > maxCount) {
                    maxCount = cnt;
                    chosenCat = cId;
                }
            }
        }

        var questions = [];
        if (window.QuestionBank && window.QuestionBank.getQuestions) {
            questions = window.QuestionBank.getQuestions(chosenCat, 4);
        } else if (window.QuestionBank && window.QuestionBank.getQuestionsByCategory) {
            questions = window.QuestionBank.getQuestionsByCategory(chosenCat, 4);
        }

        currentQuestionsRef.current = questions;

        var prevPlayed = (gameState.playedCategories || []).slice();
        if (prevPlayed.indexOf(chosenCat) === -1) {
            prevPlayed.push(chosenCat);
        }

        window.GameSync.updateState({
            phase: 'question',
            timerEndTime: Date.now() + 15000,
            playedCategories: prevPlayed,
            categoryVotes: {},
            playerAnswers: {},
            currentQuestionIndex: 0,
            currentQuestions: questions
        });
    }, [gameState]);

    function executeRoundMovement() {
        setIsAnimatingRoundMoves(true);

        window.GameSync.updateState({ phase: 'board_move', timerEndTime: 0 }).then(function() {
            var playersCopy = JSON.parse(JSON.stringify((gameState && gameState.players) || {}));
            var initialPositions = {};
            var playerIds = Object.keys(playersCopy);
            playerIds.forEach(function(pid) {
                initialPositions[pid] = playersCopy[pid].position || 0;
            });

            function animatePlayerSteps(playerIndex) {
                if (playerIndex >= playerIds.length) {
                    var sorted = getSortedStandings(playersCopy);
                    var roundMoves = {};
                    sorted.forEach(function(p, index) {
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
                        roundMoves: roundMoves,
                        players: playersCopy
                    });
                }

                var pid = playerIds[playerIndex];
                var steps = roundCorrectRef.current[pid] || 0;
                var currentPos = playersCopy[pid].position || 0;

                if (steps > 0 && playersCopy[pid].cheerAudio) {
                    try {
                        var cheer = new Audio(playersCopy[pid].cheerAudio);
                        cheer.play().catch(function(e) {
                            console.log("Cheer audio playback prevented or failed:", e);
                        });
                    } catch (err) {
                        console.log("Cheer audio play error:", err);
                    }
                }

                function stepOneByOne(s) {
                    if (s >= steps || currentPos >= TOTAL_CELLS - 1) {
                        playersCopy[pid].position = currentPos;
                        playersCopy[pid].score = (playersCopy[pid].score || 0) + steps;
                        return animatePlayerSteps(playerIndex + 1);
                    }

                    setWalkingPlayerId(pid);
                    currentPos += 1;
                    setVisualPositions(function(prev) {
                        var nextPos = Object.assign({}, prev);
                        nextPos[pid] = currentPos;
                        return nextPos;
                    });

                    return new Promise(function(res) { setTimeout(res, 500); })
                        .then(function() {
                            setWalkingPlayerId(null);
                            return new Promise(function(res) { setTimeout(res, 150); });
                        })
                        .then(function() {
                            return stepOneByOne(s + 1);
                        });
                }

                return stepOneByOne(0);
            }

            return animatePlayerSteps(0);
        }).catch(function(err) {
            console.error("Movement animation error:", err);
            setIsAnimatingRoundMoves(false);
        });
    }

    var handleShowResultPhase = useCallback(function() {
        if (!gameState) return;
        var currentQIndex = gameState.currentQuestionIndex || 0;
        var questionsList = currentQuestionsRef.current.length ? currentQuestionsRef.current : (gameState.currentQuestions || []);
        var currentQ = questionsList[currentQIndex];
        var correctIndex = 0;
        if (currentQ) {
            if (currentQ.correctIndex !== undefined && currentQ.correctIndex !== null) {
                correctIndex = currentQ.correctIndex;
            } else if (currentQ.correct !== undefined && currentQ.correct !== null) {
                correctIndex = currentQ.correct;
            }
        }

        var playerAnswers = gameState.playerAnswers || {};
        for (var pid in playerAnswers) {
            if (Object.prototype.hasOwnProperty.call(playerAnswers, pid)) {
                if (playerAnswers[pid] === correctIndex) {
                    roundCorrectRef.current[pid] = (roundCorrectRef.current[pid] || 0) + 1;
                }
            }
        }

        window.GameSync.updateState({
            phase: 'answer_reveal',
            timerEndTime: 0
        });

        if (nextPhaseTimeoutRef.current) clearTimeout(nextPhaseTimeoutRef.current);
        nextPhaseTimeoutRef.current = setTimeout(function() {
            var nextQIndex = currentQIndex + 1;
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

    useEffect(function() {
        if (!gameState) return;
        var phase = gameState.phase;
        var timerEndTime = gameState.timerEndTime;
        var players = gameState.players;
        var categoryVotes = gameState.categoryVotes;
        var playerAnswers = gameState.playerAnswers;
        var isTimeUp = timerEndTime > 0 && Date.now() >= timerEndTime;

        if (phase === 'category_vote') {
            var numPlayers = Object.keys(players || {}).length;
            var numVotes = Object.keys(categoryVotes || {}).length;
            if (isTimeUp || (numPlayers > 0 && numVotes >= numPlayers)) {
                handleVoteFinished();
            }
        } else if (phase === 'question') {
            var numPlayersQ = Object.keys(players || {}).length;
            var numAnswersQ = Object.keys(playerAnswers || {}).length;
            if (isTimeUp || (numPlayersQ > 0 && numAnswersQ >= numPlayersQ)) {
                handleShowResultPhase();
            }
        } else if (phase === 'round_summary') {
            if (isTimeUp) {
                var winner = null;
                var pList = players ? Object.values(players) : [];
                for (var i = 0; i < pList.length; i++) {
                    if ((pList[i].position || 0) >= TOTAL_CELLS - 1) {
                        winner = pList[i];
                        break;
                    }
                }
                if (winner) {
                    window.GameSync.updateState({ phase: 'finish', winnerId: winner.id });
                } else {
                    startNewRound();
                }
            }
        }
    }, [gameState, handleVoteFinished, handleShowResultPhase, startNewRound]);

    if (!gameState) {
        return h('div', { className: 'flex items-center justify-center h-full text-3xl font-black' }, 'Загрузка игры...');
    }

    var phase = gameState.phase;
    var categoriesToVote = gameState.categoriesToVote;
    var currentQuestionIndex = gameState.currentQuestionIndex || 0;
    var players = gameState.players || {};
    var winnerId = gameState.winnerId;
    var categoryVotes = gameState.categoryVotes || {};
    var playerAnswers = gameState.playerAnswers || {};
    var roundMoves = gameState.roundMoves || {};

    var playersList = [];
    for (var pKey in players) {
        if (Object.prototype.hasOwnProperty.call(players, pKey)) {
            playersList.push(players[pKey]);
        }
    }

    var questionsList = currentQuestionsRef.current.length ? currentQuestionsRef.current : (gameState.currentQuestions || []);
    var currentQ = questionsList[currentQuestionIndex] || null;
    var currentQCorrectIndex = 0;
    if (currentQ) {
        if (currentQ.correctIndex !== undefined && currentQ.correctIndex !== null) {
            currentQCorrectIndex = currentQ.correctIndex;
        } else if (currentQ.correct !== undefined && currentQ.correct !== null) {
            currentQCorrectIndex = currentQ.correct;
        }
    }

    // Группировка игроков по клеткам
    var cellOccupantsMap = {};
    playersList.forEach(function(p) {
        var cellPos = visualPositions[p.id] !== undefined ? visualPositions[p.id] : (p.position !== undefined ? p.position : 0);
        if (!cellOccupantsMap[cellPos]) cellOccupantsMap[cellPos] = [];
        cellOccupantsMap[cellPos].push(p.id);
    });

    function triggerUserGestureAudio() {
        if (gameState && gameState.phase === 'lobby' && lobbyAudioRef.current && lobbyAudioRef.current.paused) {
            lobbyAudioRef.current.play().catch(function() {});
        }
    }

    // Построение 25 клеток настольного поля
    var cellElements = [];
    for (var i = 0; i < TOTAL_CELLS; i++) {
        (function(cellIndex) {
            var pos = getGridPos(cellIndex);
            var isStart = cellIndex === 0;
            var isFinish = cellIndex === TOTAL_CELLS - 1;
            var hasPawns = playersList.some(function(p) {
                var cPos = visualPositions[p.id] !== undefined ? visualPositions[p.id] : (p.position !== undefined ? p.position : 0);
                return cPos === cellIndex;
            });

            var cellClasses = 'board-cell ' + 
                (isStart ? 'board-cell-start ' : '') + 
                (isFinish ? 'board-cell-finish ' : '') + 
                (hasPawns ? 'board-cell-active ' : '');

            cellElements.push(h('div', {
                key: cellIndex,
                className: cellClasses,
                style: { gridRow: pos.row, gridColumn: pos.col }
            },
                h('span', { className: 'board-cell-number' }, cellIndex + 1),
                h('span', { className: 'font-mono text-2xl font-black' },
                    isStart ? 'СТАРТ' : (isFinish ? 'ФИНИШ 🏆' : cellIndex)
                )
            ));
        })(i);
    }

    var pawnElements = playersList.map(function(p) {
        var cellPos = visualPositions[p.id] !== undefined ? visualPositions[p.id] : (p.position !== undefined ? p.position : 0);
        var occupants = cellOccupantsMap[cellPos] || [p.id];
        var offsetIndex = occupants.indexOf(p.id);

        return h(Pawn, {
            key: p.id,
            color: p.color,
            selfie: p.selfie,
            position: cellPos,
            isWalking: walkingPlayerId === p.id,
            offsetIndex: offsetIndex >= 0 ? offsetIndex : 0,
            totalOnCell: occupants.length
        });
    });

    var boardGridClass = 'board-grid w-full h-full absolute inset-0 z-0 p-4 transition-all duration-500 ' +
        (phase === 'board_move' ? 'opacity-100 scale-100' : 'opacity-25 filter blur-[1px]');

    var phaseContent = null;

    if (phase === 'lobby') {
        var lobbyAvatars = playersList.length === 0 
            ? h('p', { className: 'text-yellow-100 self-center' }, 'Ожидание подключения с телефона...')
            : playersList.map(function(p) {
                var avatarInner = isSafeImageSrc(p.selfie)
                    ? h('img', { src: p.selfie, className: 'w-full h-full object-cover' })
                    : h('span', { className: 'text-3xl text-black' }, p.selfie || '👤');

                return h('div', { key: p.id, className: 'flex flex-col items-center' },
                    h('div', {
                        className: 'w-16 h-16 rounded-full overflow-hidden border-4 border-black mb-2 flex items-center justify-center shadow-lg',
                        style: { backgroundColor: p.color || '#FF3B30', borderColor: p.color || '#000000' }
                    }, avatarInner),
                    h('span', { className: 'font-bold text-sm max-w-[80px] truncate' }, p.name)
                );
            });

        phaseContent = h('div', { className: 'glass-card p-8 text-center max-w-2xl w-full' },
            h('h2', { className: 'text-5xl font-black mb-4' },
                'Код комнаты: ',
                h('span', { className: 'text-yellow-300 tracking-widest' }, roomId)
            ),
            h('div', { className: 'flex flex-col items-center justify-center mb-6' },
                h('div', {
                    ref: qrRef,
                    className: 'bg-white p-3 rounded-2xl inline-block border-4 border-black min-w-[240px] min-h-[240px] flex items-center justify-center'
                }),
                h('div', { className: 'mt-4 w-full bg-black/50 p-3 rounded-xl border-2 border-black' },
                    h('p', { className: 'text-xs text-gray-300 uppercase tracking-wider mb-1' }, 'Или откройте ссылку:'),
                    h('a', {
                        href: joinUrl,
                        className: 'text-yellow-300 hover:text-yellow-200 underline font-mono text-xs break-all'
                    }, joinUrl)
                )
            ),
            playersList.length >= 1 ? h('div', {
                className: 'auto-timer-badge text-sm font-bold text-black bg-yellow-300 border-2 border-black px-4 py-2 rounded-xl mb-4 animate-pulse'
            }, 'Игра начнется автоматически через ' + lobbyCountdown + ' сек (или подключите еще игроков)') : null,
            h('h3', { className: 'text-xl mb-3 font-bold text-yellow-200' }, 'Игроки (' + playersList.length + '/10):'),
            h('div', { className: 'flex flex-wrap justify-center gap-4 mb-6 min-h-[90px] max-w-xl mx-auto' }, lobbyAvatars),
            h('button', {
                onClick: startNewRound,
                disabled: playersList.length === 0,
                className: 'primary-btn px-10 py-4 text-2xl w-full'
            }, 'Начать игру')
        );
    } else if (phase === 'category_vote') {
        var categoryCards = (categoriesToVote || []).map(function(cat, idx) {
            var voters = playersList.filter(function(p) { return categoryVotes[p.id] === cat.id; });
            var voterBadges = voters.map(function(p) {
                var head = isSafeImageSrc(p.selfie)
                    ? h('img', { src: p.selfie, className: 'w-full h-full object-cover' })
                    : h('span', { className: 'text-xs font-bold text-black' }, p.selfie || '👤');

                return h('div', {
                    key: p.id,
                    className: 'w-8 h-8 rounded-full border-2 border-black overflow-hidden flex items-center justify-center shadow-md',
                    style: { backgroundColor: p.color || '#FF3B30', borderColor: p.color || '#000000' }
                }, head);
            });

            return h('div', {
                key: idx,
                className: 'glass-card p-4 bg-indigo-900/60 flex flex-col items-center justify-between rounded-2xl border-4 border-black min-h-[140px]'
            },
                h('span', { className: 'text-4xl md:text-5xl mb-2' }, cat.icon),
                h('h3', { className: 'category-card-title text-xl md:text-2xl font-bold mb-2 text-center' }, cat.name),
                h('div', { className: 'flex gap-1.5 min-h-[36px] items-center justify-center flex-wrap' }, voterBadges)
            );
        });

        phaseContent = h('div', { className: 'glass-card p-6 text-center max-w-4xl w-full' },
            h('h2', { className: 'text-4xl font-extrabold mb-2' }, 'Выбор категории'),
            h('p', { className: 'text-lg text-yellow-100 mb-4' }, 'Голосуйте с телефонов прямо сейчас!'),
            h('div', { className: 'timer-track mb-6' },
                h('div', {
                    className: 'timer-bar',
                    style: { width: ((timeLeft / 10) * 100) + '%' }
                })
            ),
            h('div', { className: 'grid grid-cols-3 gap-4 mb-6' }, categoryCards),
            h('div', { className: 'text-4xl font-mono font-black text-yellow-300' }, timeLeft + ' сек')
        );
    } else if ((phase === 'question' || phase === 'answer_reveal') && currentQ) {
        var isResultPhase = phase === 'answer_reveal';
        var optionButtons = (currentQ.options || []).map(function(opt, optIdx) {
            var isCorrect = isResultPhase && optIdx === currentQCorrectIndex;
            var isWrong = isResultPhase && optIdx !== currentQCorrectIndex;
            var letterClass = optIdx === 0 ? 'quiz-btn-a' : (optIdx === 1 ? 'quiz-btn-b' : (optIdx === 2 ? 'quiz-btn-c' : 'quiz-btn-d'));
            var playersChosenThis = playersList.filter(function(p) { return playerAnswers[p.id] === optIdx; });

            var badges = null;
            if (isResultPhase) {
                var badgeItems = playersChosenThis.map(function(p) {
                    var head = isSafeImageSrc(p.selfie)
                        ? h('img', { src: p.selfie, className: 'w-full h-full object-cover' })
                        : h('span', { className: 'text-lg text-black font-bold' }, p.selfie || '👤');

                    return h('div', {
                        key: p.id,
                        className: 'w-11 h-11 rounded-full border-3 border-black overflow-hidden flex items-center justify-center shadow-lg',
                        style: { backgroundColor: p.color || '#FF3B30' }
                    }, head);
                });

                badges = h('div', { className: 'absolute -bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-30' }, badgeItems);
            }

            var btnClass = 'quiz-btn ' + letterClass + ' ' + (isCorrect ? 'quiz-btn-correct ' : '') + (isWrong ? 'opacity-40 ' : '') + 'relative !cursor-default';

            return h('div', {
                key: optIdx,
                className: btnClass,
                style: { justifyContent: 'center' }
            },
                h('div', { className: 'quiz-btn-text text-center text-2xl font-bold' }, opt),
                badges
            );
        });

        var imageElement = null;
        if (currentQ.imageUrl && isSafeImageSrc(currentQ.imageUrl)) {
            imageElement = h('div', { className: 'mb-5 flex justify-center' },
                h('img', {
                    src: currentQ.imageUrl,
                    alt: 'question',
                    className: 'max-h-56 max-w-full rounded-2xl border-4 border-black object-contain bg-black/40 shadow-xl'
                })
            );
        }

        phaseContent = h('div', { className: 'glass-card p-8 text-center max-w-4xl w-full' },
            h('div', { className: 'flex justify-between items-center mb-4' },
                h('span', { className: 'text-2xl text-yellow-300 font-black uppercase' }, 'Вопрос ' + (currentQuestionIndex + 1) + ' из 4'),
                h('span', { className: 'text-4xl font-mono font-black bg-black text-yellow-300 px-6 py-1.5 rounded-xl border-2 border-black' },
                    phase === 'answer_reveal' ? '✓ Ответ' : (timeLeft + 's')
                )
            ),
            imageElement,
            h('h2', { className: 'text-3xl md:text-4xl font-black mb-6 leading-snug' }, currentQ.text || currentQ.q),
            h('div', { className: 'grid grid-cols-2 gap-5' }, optionButtons)
        );
    } else if (phase === 'round_summary') {
        var standings = getSortedStandings(players);
        var summaryRows = standings.map(function(p, idx) {
            var moveData = roundMoves[p.id] || {
                rank: idx + 1,
                stepsGained: roundCorrectRef.current[p.id] || 0,
                currentPos: p.position || 0
            };
            var badgeClass = moveData.rank === 1 ? 'bg-yellow-400 text-black' : (moveData.rank === 2 ? 'bg-slate-300 text-black' : (moveData.rank === 3 ? 'bg-amber-600 text-white' : 'bg-indigo-700 text-white'));
            var stepsText = '+' + moveData.stepsGained + ' ' + (moveData.stepsGained === 1 ? 'клетка' : ((moveData.stepsGained >= 2 && moveData.stepsGained <= 4) ? 'клетки' : 'клеток'));

            var head = isSafeImageSrc(p.selfie)
                ? h('img', { src: p.selfie, className: 'w-full h-full object-cover' })
                : h('span', { className: 'text-2xl text-black' }, p.selfie || '👤');

            return h('div', {
                key: p.id,
                className: 'round-summary-item flex items-center justify-between p-3 rounded-2xl bg-indigo-900/80 border-3 border-black'
            },
                h('div', { className: 'flex items-center gap-4' },
                    h('div', { className: 'round-summary-badge w-10 h-10 rounded-full flex items-center justify-center font-black text-xl border-2 border-black ' + badgeClass },
                        moveData.rank
                    ),
                    h('div', {
                        className: 'w-12 h-12 rounded-full border-3 border-black overflow-hidden flex items-center justify-center',
                        style: { backgroundColor: p.color || '#FF3B30' }
                    }, head),
                    h('div', { className: 'text-left' },
                        h('div', { className: 'font-black text-xl text-white' }, p.name),
                        h('div', { className: 'text-xs text-yellow-200 font-bold' },
                            'Клетка: ' + Math.min(TOTAL_CELLS, (moveData.currentPos || 0) + 1) + ' / ' + TOTAL_CELLS
                        )
                    )
                ),
                h('div', { className: 'round-summary-steps text-xl font-black px-4 py-1.5 rounded-xl border-2 border-black bg-lime-400 text-black' },
                    stepsText
                )
            );
        });

        phaseContent = h('div', { className: 'round-summary-modal fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6' },
            h('div', { className: 'glass-card max-w-2xl w-full p-8 text-center max-h-[90vh] overflow-y-auto' },
                h('h2', { className: 'text-4xl font-black mb-2 text-yellow-300' }, 'Итоги раунда'),
                h('p', { className: 'text-lg text-yellow-100 mb-4' }, 'Фигурки продвинулись вперед!'),
                h('div', { className: 'timer-track mb-6' },
                    h('div', {
                        className: 'timer-bar',
                        style: { width: ((timeLeft / 6) * 100) + '%' }
                    })
                ),
                h('div', { className: 'space-y-3 mb-6' }, summaryRows),
                h('div', { className: 'text-2xl font-mono font-black text-yellow-300' }, 'Следующий раунд через ' + timeLeft + ' сек')
            )
        );
    } else if (phase === 'finish' && players && winnerId && players[winnerId]) {
        var winnerP = players[winnerId];
        var winnerHead = isSafeImageSrc(winnerP.selfie)
            ? h('img', { src: winnerP.selfie, className: 'w-full h-full object-cover' })
            : h('span', { className: 'text-7xl text-black' }, winnerP.selfie || '👤');

        phaseContent = h('div', { className: 'glass-card p-12 text-center border-4 border-black max-w-xl' },
            h('h1', { className: 'text-6xl font-black mb-6 text-yellow-300 drop-shadow-lg' }, 'ПОБЕДИТЕЛЬ!'),
            h('div', { className: 'flex flex-col items-center' },
                h('div', {
                    className: 'w-48 h-48 rounded-full border-8 border-black mb-4 overflow-hidden flex items-center justify-center',
                    style: { backgroundColor: winnerP.color || '#FF3B30' }
                }, winnerHead),
                h('h2', { className: 'text-5xl font-black text-white' }, winnerP.name)
            ),
            h('button', {
                onClick: function() {
                    window.location.href = window.location.origin + window.location.pathname;
                },
                className: 'mt-8 primary-btn text-2xl px-8 py-3'
            }, 'В главное меню')
        );
    }

    var moveToast = null;
    if (phase === 'board_move') {
        moveToast = h('div', { className: 'move-info-toast z-50' },
            h('span', { className: 'text-3xl animate-bounce' }, '🎲'),
            h('div', null, 'Игроки делают ходы! 1 верный ответ = 1 шаг вперед')
        );
    }

    return h('div', {
        onClick: triggerUserGestureAudio,
        className: 'tv-container relative w-screen h-screen flex flex-col p-0 m-0 overflow-hidden'
    },
        h('div', { className: boardGridClass }, cellElements.concat(pawnElements)),
        moveToast,
        h('div', { className: 'relative z-10 flex-1 flex flex-col items-center justify-center p-6' }, phaseContent)
    );
}

function MobileApp(props) {
    var roomId = props.roomId;
    var dbUrl = props.dbUrl;

    var gameStateState = useState(null);
    var gameState = gameStateState[0];
    var setGameState = gameStateState[1];

    var initialPlayerId = safeStorage.getItem('tv_game_player_id') || safeStorage.getItem('playerId') || null;
    var playerIdState = useState(initialPlayerId);
    var playerId = playerIdState[0];
    var setPlayerId = playerIdState[1];

    var isJoinedState = useState(false);
    var isJoined = isJoinedState[0];
    var setIsJoined = isJoinedState[1];

    var nameState = useState('');
    var name = nameState[0];
    var setName = nameState[1];

    var colorState = useState(PLAYER_COLORS[0]);
    var color = colorState[0];
    var setColor = colorState[1];

    var selfieState = useState(null);
    var selfie = selfieState[0];
    var setSelfie = selfieState[1];

    var showCameraModalState = useState(false);
    var showCameraModal = showCameraModalState[0];
    var setShowCameraModal = showCameraModalState[1];

    var timeLeftState = useState(0);
    var timeLeft = timeLeftState[0];
    var setTimeLeft = timeLeftState[1];

    var cheerAudioState = useState(null);
    var cheerAudio = cheerAudioState[0];
    var setCheerAudio = cheerAudioState[1];

    var isRecordingCheerState = useState(false);
    var isRecordingCheer = isRecordingCheerState[0];
    var setIsRecordingCheer = isRecordingCheerState[1];

    var cheerCountdownState = useState(3);
    var cheerCountdown = cheerCountdownState[0];
    var setCheerCountdown = cheerCountdownState[1];

    var mediaRecorderRef = useRef(null);
    var audioChunksRef = useRef([]);
    var recordTimerRef = useRef(null);
    var cheerPreviewRef = useRef(null);

    var handleCloseCamera = useCallback(function() {
        setShowCameraModal(false);
    }, []);

    useEffect(function() {
        try {
            window.GameSync.onStateChange(function(newState) {
                if (newState) {
                    setGameState(newState);
                    if (playerId && newState.players && newState.players[playerId]) {
                        setIsJoined(true);
                    }
                }
            });
            window.GameSync.init('player', roomId, dbUrl);
        } catch (err) {
            console.error("Player sync init error", err);
        }

        return function() {
            if (recordTimerRef.current) clearInterval(recordTimerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                try { mediaRecorderRef.current.stop(); } catch(e) {}
            }
        };
    }, [roomId, dbUrl, playerId]);

    useEffect(function() {
        var timerInterval = null;
        var syncTime = function() {
            if (gameState && gameState.timerEndTime && gameState.timerEndTime > 0) {
                var diff = gameState.timerEndTime - Date.now();
                setTimeLeft(Math.max(0, Math.ceil(diff / 1000)));
            } else {
                setTimeLeft(0);
            }
        };

        syncTime();
        timerInterval = setInterval(syncTime, 250);
        return function() { clearInterval(timerInterval); };
    }, [gameState && gameState.timerEndTime, gameState && gameState.phase, gameState && gameState.currentQuestionIndex]);

    var usedColors = useMemo(function() {
        if (!gameState || !gameState.players) return [];
        var res = [];
        for (var pId in gameState.players) {
            if (Object.prototype.hasOwnProperty.call(gameState.players, pId)) {
                res.push(gameState.players[pId].color);
            }
        }
        return res;
    }, [gameState && gameState.players]);

    useEffect(function() {
        if (!color || usedColors.indexOf(color) !== -1) {
            var firstFree = null;
            for (var ci = 0; ci < PLAYER_COLORS.length; ci++) {
                if (usedColors.indexOf(PLAYER_COLORS[ci]) === -1) {
                    firstFree = PLAYER_COLORS[ci];
                    break;
                }
            }
            if (firstFree) setColor(firstFree);
        }
    }, [usedColors, color]);

    function startRecordingCheer() {
        if (isRecordingCheer) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Ваш браузер не поддерживает запись аудио.");
            return;
        }

        navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
            audioChunksRef.current = [];

            var mimeType = '';
            if (window.MediaRecorder) {
                if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
                else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
                else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
            }

            var options = mimeType ? { mimeType: mimeType } : {};
            var mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = function(event) {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = function() {
                stream.getTracks().forEach(function(t) { t.stop(); });
                var blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
                var reader = new FileReader();
                reader.onloadend = function() {
                    setCheerAudio(reader.result);
                    setIsRecordingCheer(false);
                };
                reader.readAsDataURL(blob);
            };

            mediaRecorder.start();
            setIsRecordingCheer(true);
            setCheerCountdown(3);

            var remaining = 3;
            if (recordTimerRef.current) clearInterval(recordTimerRef.current);
            recordTimerRef.current = setInterval(function() {
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
        }).catch(function(err) {
            console.error("Microphone error:", err);
            alert("Не удалось получить доступ к микрофону. Клич можно пропустить.");
            setIsRecordingCheer(false);
        });
    }

    function playCheerPreview() {
        if (!cheerAudio) return;
        if (cheerPreviewRef.current) {
            cheerPreviewRef.current.pause();
        }
        var audio = new Audio(cheerAudio);
        cheerPreviewRef.current = audio;
        audio.play().catch(function(e) { console.log("Audio play error", e); });
    }

    var isRoomFull = useMemo(function() {
        var count = Object.keys((gameState && gameState.players) || {}).length;
        var isSelfIn = Boolean(gameState && gameState.players && gameState.players[playerId]);
        return count >= 10 && !isSelfIn;
    }, [gameState && gameState.players, playerId]);

    function handleJoin() {
        if (isRoomFull) {
            alert("Комната заполнена (максимум 10 игроков)");
            return;
        }
        var fallbackColor = null;
        for (var i = 0; i < PLAYER_COLORS.length; i++) {
            if (usedColors.indexOf(PLAYER_COLORS[i]) === -1) {
                fallbackColor = PLAYER_COLORS[i];
                break;
            }
        }
        var assignedColor = color || fallbackColor || '#FF3B30';
        if (!name.trim() || !selfie || !assignedColor || usedColors.indexOf(assignedColor) !== -1) {
            alert("Заполните имя, выберите селфи и свободный цвет!");
            return;
        }

        var newId = playerId || generatePlayerId();
        setPlayerId(newId);
        safeStorage.setItem('playerId', newId);
        safeStorage.setItem('tv_game_player_id', newId);

        var existingPlayers = Object.assign({}, (gameState && gameState.players) || {});
        existingPlayers[newId] = {
            id: newId,
            name: name.trim().slice(0, 12),
            color: assignedColor,
            selfie: selfie,
            cheerAudio: cheerAudio || null,
            position: 0,
            score: 0
        };

        window.GameSync.updateState({
            players: existingPlayers
        });
        setIsJoined(true);
    }

    function sendVote(catId) {
        if (!playerId) return;
        if (gameState && gameState.categoryVotes && gameState.categoryVotes[playerId]) return;
        var existingVotes = Object.assign({}, (gameState && gameState.categoryVotes) || {});
        existingVotes[playerId] = catId;
        window.GameSync.updateState({
            categoryVotes: existingVotes
        });
    }

    function sendAnswer(optionIndex) {
        if (!playerId) return;
        if (!gameState || gameState.phase !== 'question') return;
        if (gameState.playerAnswers && gameState.playerAnswers[playerId] !== undefined) return;
        var existingAnswers = Object.assign({}, (gameState && gameState.playerAnswers) || {});
        existingAnswers[playerId] = optionIndex;
        window.GameSync.updateState({
            playerAnswers: existingAnswers
        });
    }

    if (!isJoined || !gameState || !gameState.players || !gameState.players[playerId]) {
        var selfieInner = null;
        if (!selfie) {
            selfieInner = h('div', { className: 'absolute inset-0 flex items-center justify-center text-2xl' }, '👤');
        } else if (isSafeImageSrc(selfie)) {
            selfieInner = h('img', { src: selfie, className: 'w-full h-full object-cover' });
        } else {
            selfieInner = h('div', { className: 'w-full h-full bg-white flex items-center justify-center text-3xl text-black' }, selfie);
        }

        var emojiButtons = EMOJI_AVATARS.map(function(em) {
            return h('button', {
                key: em,
                onClick: function() { setSelfie(em); },
                className: 'text-xl p-1 rounded-lg border-2 border-black ' + (selfie === em ? 'bg-yellow-400' : 'bg-white/20')
            }, em);
        });

        var colorButtons = PLAYER_COLORS.map(function(c) {
            var isTaken = usedColors.indexOf(c) !== -1;
            var isSelected = color === c;
            return h('button', {
                key: c,
                type: 'button',
                onClick: function() { if (!isTaken) setColor(c); },
                disabled: isTaken,
                className: 'color-select-btn w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-base transition-transform ' + (isSelected ? 'selected' : ''),
                style: { backgroundColor: c }
            }, isSelected ? '✓' : '');
        });

        var cheerControls = null;
        if (!cheerAudio) {
            cheerControls = h('button', {
                type: 'button',
                onClick: startRecordingCheer,
                disabled: isRecordingCheer,
                className: 'primary-btn audio-record-btn w-full !py-2 text-sm ' + (isRecordingCheer ? 'audio-record-active !bg-red-600 animate-pulse text-white' : '!bg-amber-400')
            }, isRecordingCheer ? ('🔴 Запись клича... (' + cheerCountdown + ' сек)') : '🎤 Записать победный клич');
        } else {
            cheerControls = h('div', { className: 'flex gap-2 w-full' },
                h('button', {
                    type: 'button',
                    onClick: playCheerPreview,
                    className: 'primary-btn flex-1 !py-2 text-sm !bg-emerald-500 hover:!bg-emerald-600'
                }, '▶️ Прослушать'),
                h('button', {
                    type: 'button',
                    onClick: function() {
                        setCheerAudio(null);
                        startRecordingCheer();
                    },
                    className: 'primary-btn flex-1 !py-2 text-sm !bg-gray-600 hover:!bg-gray-700'
                }, '🔄 Переписать')
            );
        }

        return h('div', { className: 'mobile-container !py-2 !px-3 overflow-y-auto flex items-center justify-center' },
            h(CameraModal, {
                isOpen: showCameraModal,
                onClose: handleCloseCamera,
                onSave: setSelfie
            }),
            h('div', { className: 'glass-card w-full max-w-sm !p-4 space-y-2.5 my-auto max-h-[96dvh] overflow-y-auto' },
                h('h2', { className: 'text-2xl font-black text-center text-yellow-300 leading-tight' }, 'Вход в игру'),
                h('div', { className: 'flex flex-col items-center gap-2' },
                    h('div', {
                        className: 'camera-preview-container relative w-16 h-16 rounded-full overflow-hidden flex items-center justify-center border-3 border-black shrink-0 shadow-md',
                        style: { backgroundColor: color || '#FF3B30', borderColor: color || '#000000' }
                    }, selfieInner),
                    h('button', {
                        onClick: function() { setShowCameraModal(true); },
                        className: 'primary-btn w-full !py-2 text-sm'
                    }, '📸 Сделать селфи'),
                    h('div', { className: 'flex gap-1.5 flex-wrap justify-center' }, emojiButtons)
                ),
                h('input', {
                    type: 'text',
                    value: name,
                    onChange: function(e) { setName(e.target.value); },
                    placeholder: 'Ваше имя',
                    maxLength: '12',
                    className: '!py-2 !px-3 !text-base'
                }),
                h('div', { className: 'color-picker-grid grid grid-cols-5 gap-2 pt-1 justify-items-center w-full' }, colorButtons),
                h('div', { className: 'w-full bg-black/30 p-2.5 rounded-xl border-2 border-black flex flex-col items-center gap-2' },
                    h('div', { className: 'text-xs font-black text-yellow-300 uppercase tracking-wide' }, 'Победный клич (3 сек)'),
                    cheerControls
                ),
                isRoomFull ? h('div', { className: 'text-red-400 font-bold text-center text-sm' }, 'Комната заполнена (максимум 10 игроков)') : null,
                h('button', {
                    onClick: handleJoin,
                    disabled: isRoomFull,
                    className: 'primary-btn w-full !mt-2 text-lg !py-2.5'
                }, isRoomFull ? 'Комната заполнена' : 'Войти в игру')
            )
        );
    }

    var phase = gameState.phase;
    var categoriesToVote = gameState.categoriesToVote;
    var currentQuestionIndex = gameState.currentQuestionIndex || 0;
    var currentQuestions = gameState.currentQuestions;
    var players = gameState.players || {};
    var categoryVotes = gameState.categoryVotes || {};
    var playerAnswers = gameState.playerAnswers || {};
    var roundMoves = gameState.roundMoves || {};

    var myPlayer = players[playerId];
    var standings = getSortedStandings(players);
    var myRank = 0;
    for (var ri = 0; ri < standings.length; ri++) {
        if (standings[ri].id === playerId) {
            myRank = ri + 1;
            break;
        }
    }

    var hasVoted = Boolean(categoryVotes[playerId]);
    var hasAnswered = playerAnswers[playerId] !== undefined;
    var currentQ = (currentQuestions || [])[currentQuestionIndex] || null;

    var myHead = isSafeImageSrc(myPlayer.selfie)
        ? h('img', { src: myPlayer.selfie, className: 'w-full h-full object-cover' })
        : h('span', { className: 'text-xl text-black' }, myPlayer.selfie || '👤');

    var mobilePhaseContent = null;

    if (phase === 'lobby') {
        mobilePhaseContent = h('div', { className: 'text-center glass-card p-8' },
            h('h2', { className: 'text-2xl font-black mb-2' }, 'Вы в игре!'),
            h('p', { className: 'text-yellow-100 font-bold' }, 'Ожидайте запуска партии на экране ТВ.')
        );
    } else if (phase === 'category_vote') {
        var voteButtons = (categoriesToVote || []).map(function(cat) {
            var isChosen = categoryVotes[playerId] === cat.id;
            var catBtnClasses = 'glass-card flex flex-col items-center justify-center text-center p-3 transition-all min-h-[90px] ' +
                (isChosen ? '!bg-yellow-400 !text-black !border-black font-black ' : '') +
                (hasVoted && !isChosen ? 'opacity-40 grayscale ' : '');

            return h('button', {
                key: cat.id,
                onClick: function() { sendVote(cat.id); },
                disabled: hasVoted,
                className: catBtnClasses
            },
                h('span', { className: 'text-3xl mb-1' }, cat.icon),
                h('span', { className: 'category-card-title text-sm font-bold line-clamp-2' }, cat.name)
            );
        });

        mobilePhaseContent = h('div', { className: 'flex flex-col gap-2 h-full justify-center overflow-y-auto py-2' },
            h('h2', { className: 'text-xl font-black text-center mb-1 text-yellow-300' }, 'Выберите тему (из 6):'),
            h('div', { className: 'grid grid-cols-2 gap-2' }, voteButtons)
        );
    } else if (phase === 'question') {
        var answerLetters = ['A', 'B', 'C', 'D'];
        var answerButtons = answerLetters.map(function(lbl, i) {
            var isSelected = playerAnswers[playerId] === i;
            var optionText = (currentQ && currentQ.options && currentQ.options[i]) ? currentQ.options[i] : ('Вариант ' + lbl);
            var btnClasses = 'quiz-btn quiz-btn-' + lbl.toLowerCase() + ' py-3 px-3 ' +
                (isSelected ? 'quiz-btn-selected ' : '') +
                (hasAnswered && !isSelected ? 'opacity-40 ' : '');

            return h('button', {
                key: i,
                onClick: function() { sendAnswer(i); },
                disabled: hasAnswered,
                className: btnClasses
            },
                h('div', { className: 'quiz-btn-letter font-black shrink-0' }, lbl),
                h('div', { className: 'quiz-btn-text text-base sm:text-lg font-black leading-snug text-left break-words flex-1' },
                    optionText + (isSelected ? ' ✓' : '')
                )
            );
        });

        mobilePhaseContent = h('div', { className: 'flex flex-col h-full justify-between pb-2' },
            h('div', { className: 'text-center mb-2' },
                h('div', { className: 'text-sm text-yellow-300 font-black uppercase' }, 'Вопрос ' + (currentQuestionIndex + 1) + ' из 4'),
                h('div', { className: 'text-3xl font-mono font-black' }, timeLeft)
            ),
            h('div', { className: 'grid grid-cols-1 gap-2.5 flex-1 justify-center my-auto' }, answerButtons)
        );
    } else if (phase === 'answer_reveal') {
        mobilePhaseContent = h('div', { className: 'text-center glass-card p-8 border-4 border-black' },
            h('h2', { className: 'text-2xl font-black mb-2 text-yellow-300' }, 'Внимание на экран!'),
            h('p', { className: 'text-lg font-bold' }, 'Подсчитываем правильные ответы...')
        );
    } else if (phase === 'board_move') {
        mobilePhaseContent = h('div', { className: 'text-center glass-card p-8 border-4 border-black' },
            h('div', { className: 'text-6xl mb-4 animate-bounce' }, '🏃‍♂️'),
            h('h2', { className: 'text-2xl font-black mb-2 text-yellow-300' }, 'Фигурки шагают!')
        );
    } else if (phase === 'round_summary') {
        var myMoveData = roundMoves[playerId];
        var summaryBody = null;
        if (myMoveData) {
            var stepLabel = myMoveData.stepsGained === 1 ? 'шаг' : 'шага';
            summaryBody = h('div', { className: 'w-full space-y-3' },
                h('div', { className: 'round-summary-badge inline-flex items-center justify-center px-4 py-2 rounded-xl text-xl font-black bg-yellow-400 text-black border-2 border-black mb-2' },
                    myMoveData.rank + ' место'
                ),
                h('div', { className: 'round-summary-steps text-2xl font-black py-2 px-4 rounded-xl border-2 border-black bg-lime-400 text-black' },
                    '+' + myMoveData.stepsGained + ' ' + stepLabel
                ),
                h('div', { className: 'text-lg font-bold text-white bg-indigo-900/70 p-3 rounded-xl border-2 border-black' },
                    'Текущая клетка: ',
                    h('span', { className: 'text-yellow-300 font-black' }, Math.min(TOTAL_CELLS, (myMoveData.currentPos || 0) + 1)),
                    ' из ' + TOTAL_CELLS
                )
            );
        } else {
            summaryBody = h('p', { className: 'text-lg font-bold' }, 'Подведение итогов...');
        }

        mobilePhaseContent = h('div', { className: 'round-summary-modal flex flex-col justify-center items-center text-center glass-card p-6 border-4 border-black my-auto' },
            h('div', { className: 'text-5xl mb-3 animate-bounce' }, '📊'),
            h('h2', { className: 'text-3xl font-black mb-4 text-yellow-300' }, 'Итоги раунда'),
            summaryBody
        );
    } else if (phase === 'finish') {
        var isWinner = gameState.winnerId === playerId;
        mobilePhaseContent = h('div', { className: 'text-center glass-card p-8 border-4 border-black' },
            h('div', { className: 'text-7xl mb-4 animate-bounce' }, '🏆'),
            h('h2', { className: 'text-3xl font-black mb-3 text-yellow-300' }, 'Игра окончена'),
            h('p', { className: 'text-2xl font-black' }, isWinner ? 'ВЫ ПОБЕДИЛИ! 🎉' : 'Смотрите результаты на ТВ')
        );
    }

    return h('div', { className: 'mobile-container select-none' },
        h('div', { className: 'glass-card p-3 mb-2 flex items-center justify-between !py-2 !px-4 !rounded-2xl shrink-0' },
            h('div', { className: 'flex items-center gap-3' },
                h('div', {
                    className: 'w-10 h-10 rounded-full border-2 border-black overflow-hidden flex items-center justify-center',
                    style: { backgroundColor: myPlayer.color || '#FF3B30' }
                }, myHead),
                h('div', null,
                    h('div', { className: 'font-black text-lg leading-tight' }, myPlayer.name),
                    h('div', { className: 'text-xs text-yellow-300 font-bold' }, myRank > 0 ? (myRank + ' место') : '')
                )
            )
        ),
        h('div', { className: 'flex-1 flex flex-col justify-center overflow-hidden' }, mobilePhaseContent)
    );
}

function App() {
    var params = null;
    var search = window.location.search || '';
    if (window.URLSearchParams) {
        params = new URLSearchParams(search);
    }

    var role = null;
    var room = null;
    var db = '';

    if (params) {
        role = params.get('role');
        room = params.get('room');
        var rawDb = params.get('db');
        if (rawDb) {
            db = rawDb;
        }
    } else {
        var matchRole = search.match(/[?&]role=([^&]+)/);
        if (matchRole) role = decodeURIComponent(matchRole[1]);
        var matchRoom = search.match(/[?&]room=([^&]+)/);
        if (matchRoom) room = decodeURIComponent(matchRoom[1]);
        var matchDb = search.match(/[?&]db=([^&]+)/);
        if (matchDb) db = decodeURIComponent(matchDb[1]);
    }

    if (role === 'host' && room) {
        return h(TVApp, { roomId: room, dbUrl: db });
    }
    if (role === 'player' && room) {
        return h(MobileApp, { roomId: room, dbUrl: db });
    }
    return h(StartScreen, null);
}

var rootContainer = document.getElementById('root');
if (ReactDOM.createRoot) {
    ReactDOM.createRoot(rootContainer).render(h(App));
} else {
    ReactDOM.render(h(App), rootContainer);
}