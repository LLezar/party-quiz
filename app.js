// filename: app.js
// Весь код строго в стандарте ES5 для гарантии работы на webOS, старых планшетах и телефонах
var h = React.createElement;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useCallback = React.useCallback;
var useMemo = React.useMemo;

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

var TOTAL_CELLS = 25;
var GRID_SIZE = 5;

// Глобальный менеджер фоновой музыки start.mp3 с авто-разблокировкой
var StartMusicManager = (function() {
    var audio = null;
    var isStarted = false;
    var userInteracted = false;

    function init() {
        if (audio) return;
        audio = new Audio('music/start.mp3');
        audio.loop = true;
    }

    function play() {
        init();
        isStarted = true;
        if (audio) {
            var p = audio.play();
            if (p !== undefined) {
                p.catch(function() {});
            }
        }
    }

    function stop() {
        isStarted = false;
        if (audio) {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (e) {}
        }
    }

    function onUserGesture() {
        userInteracted = true;
        if (isStarted && audio && audio.paused) {
            audio.play().catch(function() {});
        }
    }

    if (typeof document !== 'undefined') {
        document.addEventListener('click', onUserGesture, false);
        document.addEventListener('touchstart', onUserGesture, false);
    }

    return {
        play: play,
        stop: stop
    };
})();

function generateRoomId() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function generatePlayerId() {
    return 'p_' + Math.random().toString(36).substring(2, 9);
}

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

function getPawnOffset(indexInCell, totalInCell) {
    if (totalInCell <= 1) return { x: 0, y: 0, scale: 1 };
    if (totalInCell === 2) {
        return { x: indexInCell === 0 ? -16 : 16, y: 0, scale: 0.85 };
    }
    if (totalInCell === 3) {
        var offsets3 = [{ x: -16, y: -8 }, { x: 16, y: -8 }, { x: 0, y: 12 }];
        var item3 = offsets3[indexInCell] || { x: 0, y: 0 };
        return { x: item3.x, y: item3.y, scale: 0.8 };
    }
    var angle = (indexInCell / totalInCell) * 2 * Math.PI;
    var radius = 20;
    return {
        x: Math.round(Math.cos(angle) * radius),
        y: Math.round(Math.sin(angle) * radius),
        scale: totalInCell > 6 ? 0.6 : 0.72
    };
}

// Фигурка: внешний контейнер для координат, внутренний .pawn-inner для анимации прыжка
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

    return h('div', {
        className: 'pawn-wrapper',
        style: {
            gridRow: pos.row,
            gridColumn: pos.col,
            '--player-color': playerColor,
            transform: 'translate(' + offset.x + 'px, ' + offset.y + 'px) scale(' + offset.scale + ')',
            zIndex: isWalking ? 999 : (20 + offsetIndex)
        }
    },
        h('div', {
            className: 'pawn-inner ' + (isWalking ? 'pawn-walking' : '')
        },
            h('div', {
                className: 'pawn-selfie-head',
                style: {
                    border: '4px solid ' + playerColor,
                    backgroundColor: playerColor,
                    boxShadow: '0 0 14px ' + playerColor + ', 3px 3px 0 #000000',
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
        )
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
                    video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } }
                }).then(function(s) {
                    if (isCancelled) {
                        s.getTracks().forEach(function(track) { track.stop(); });
                        return;
                    }
                    stream = s;
                    if (videoRef.current) {
                        videoRef.current.srcObject = s;
                    }
                }).catch(function() {
                    alert("Камера недоступна. Выберите эмодзи.");
                    if (onCloseRef.current) onCloseRef.current();
                });
            } else {
                alert("Камера не поддерживается. Выберите эмодзи.");
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
        if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0) return;

        if (window.captureSelfie) {
            window.captureSelfie(videoEl, 360, 0.85).then(function(base64) {
                setPhoto(base64);
            });
        }
    }

    function handleRetake() { setPhoto(null); }
    function handleSave() { onSave(photo); onClose(); }

    var previewElement;
    if (!photo) {
        previewElement = h('video', {
            ref: videoRef,
            autoPlay: true,
            playsInline: true,
            muted: true,
            onLoadedData: function() { setIsVideoReady(true); },
            className: 'w-full h-full object-cover'
        });
    } else {
        previewElement = h('img', {
            src: photo,
            alt: 'captured',
            className: 'w-full h-full object-cover'
        });
    }

    return h('div', { className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4' },
        h('div', { className: 'glass-card p-5 flex flex-col items-center max-w-xs w-full relative' },
            h('button', {
                onClick: onClose,
                className: 'absolute top-2 right-3 text-white text-3xl font-bold'
            }, '\u00D7'),
            h('h3', { className: 'text-xl font-bold mb-3 text-white' }, 'Селфи'),
            h('div', { className: 'w-48 h-48 bg-black rounded-full overflow-hidden mb-4 border-4 border-yellow-400 flex items-center justify-center' },
                previewElement
            ),
            !photo ? h('button', {
                onClick: handleTake,
                disabled: !isVideoReady,
                className: 'primary-btn w-full !py-2 text-base'
            }, isVideoReady ? '📸 Снять' : 'Запуск...') : h('div', { className: 'flex gap-2 w-full' },
                h('button', { onClick: handleRetake, className: 'primary-btn w-1/2 !bg-gray-600 !py-2 text-sm' }, 'Переснять'),
                h('button', { onClick: handleSave, className: 'primary-btn w-1/2 !py-2 text-sm' }, 'Готово')
            )
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

    useEffect(function() {
        StartMusicManager.play();
        return function() {};
    }, []);

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
        StartMusicManager.stop();
        safeStorage.setItem('firebaseDbUrl', dbUrl);
        var room = prompt('Введите 4-значный код комнаты:');
        if (room) {
            var baseUrl = window.location.origin + window.location.pathname;
            window.location.href = baseUrl + '?role=player&room=' + room.trim().toUpperCase() + '&db=' + encodeURIComponent(dbUrl);
        }
    }

    return h('div', { className: 'flex flex-col items-center justify-center h-full p-4 tv-container' },
        h('div', { className: 'glass-card p-6 md:p-8 max-w-md w-full text-center space-y-5' },
            h('h1', { className: 'text-4xl md:text-5xl font-black mb-2 text-yellow-300' }, 'Пати Квиз'),
            h('div', { className: 'text-xs font-bold text-yellow-300 bg-black/40 border-2 border-black px-3 py-1.5 rounded-full inline-block' },
                'Авто-создание ТВ через: ' + countdown + ' сек...'
            ),
            h('div', { className: 'text-left' },
                h('label', { className: 'block text-xs mb-1 text-white font-bold' }, 'Firebase DB URL:'),
                h('input', {
                    type: 'text',
                    value: dbUrl,
                    onChange: function(e) { setDbUrl(e.target.value); },
                    className: 'w-full p-2.5 rounded-xl bg-white border-2 border-black text-black font-bold outline-none text-sm'
                })
            ),
            h('div', { className: 'space-y-3 pt-2' },
                h('button', {
                    onClick: handleHost,
                    className: 'primary-btn w-full py-3.5 text-lg'
                }, 'Экран ТВ (Хост)'),
                h('button', {
                    onClick: handlePlayer,
                    className: 'w-full py-3 rounded-xl text-lg font-bold bg-white/20 hover:bg-white/30 border-2 border-black transition-colors'
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
    var phaseLockRef = useRef(false);
    var roundCorrectRef = useRef({});
    var currentQuestionsRef = useRef([]);
    var nextPhaseTimeoutRef = useRef(null);
    var lobbyEndTimeRef = useRef(null);
    var startNewRoundRef = useRef(null);
    var podiumAudioRef = useRef(null);

    // Независимый расчет локального таймера для предотвращения Clock Skew
    var phaseStartLocalRef = useRef(Date.now());
    var lastTimerKeyRef = useRef('');

    var baseUrl = window.location.origin + window.location.pathname;
    var joinUrl = baseUrl + '?role=player&room=' + roomId + (dbUrl ? ('&db=' + encodeURIComponent(dbUrl)) : '');

    useEffect(function() {
        StartMusicManager.play();
        return function() {
            StartMusicManager.stop();
        };
    }, []);

    useEffect(function() {
        phaseLockRef.current = false;
    }, [gameState && gameState.phase, gameState && gameState.timerKey, gameState && gameState.finishStep]);

    // Локальный расчет оставшегося времени без задержек сети
    useEffect(function() {
        if (!gameState) return;

        if (gameState.timerKey !== lastTimerKeyRef.current) {
            lastTimerKeyRef.current = gameState.timerKey || '';
            phaseStartLocalRef.current = Date.now();
        }

        var duration = gameState.timerDuration || 0;
        if (duration <= 0) {
            setTimeLeft(0);
            return;
        }

        var tick = function() {
            var elapsed = (Date.now() - phaseStartLocalRef.current) / 1000;
            var remaining = Math.max(0, Math.ceil(duration - elapsed));
            setTimeLeft(remaining);
        };

        tick();
        var timer = setInterval(tick, 200);
        return function() { clearInterval(timer); };
    }, [gameState && gameState.timerKey, gameState && gameState.timerDuration]);

    var startNewRound = useCallback(function() {
        StartMusicManager.stop();
        if (nextPhaseTimeoutRef.current) clearTimeout(nextPhaseTimeoutRef.current);

        var currentPlayed = [];
        var syncState = window.GameSync ? window.GameSync._getState() : null;
        if (syncState && syncState.playedCategories) {
            currentPlayed = syncState.playedCategories;
        }

        var allCategories = (window.QuestionBank && window.QuestionBank.categories) ? window.QuestionBank.categories : [];
        var availableCategories = allCategories.filter(function(c) {
            return currentPlayed.indexOf(c.id) === -1;
        });
        if (availableCategories.length < 6) availableCategories = allCategories;

        var categories = availableCategories.slice().sort(function() {
            return 0.5 - Math.random();
        }).slice(0, 6);

        roundCorrectRef.current = {};
        var players = (syncState && syncState.players) ? syncState.players : {};
        for (var pid in players) {
            if (Object.prototype.hasOwnProperty.call(players, pid)) {
                roundCorrectRef.current[pid] = 0;
            }
        }

        if (window.GameSync && window.GameSync.clearAnswers) {
            window.GameSync.clearAnswers(roomId);
        }

        window.GameSync.updateState({
            phase: 'category_vote',
            timerDuration: 60,
            timerKey: 'vote_' + Date.now(),
            categoriesToVote: categories,
            categoryVotes: {},
            playerAnswers: {},
            currentQuestionIndex: 0,
            currentQuestions: [],
            activeQuestion: null,
            roundMoves: {}
        });
    }, [roomId]);

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
                timerDuration: 0,
                timerKey: '',
                categoriesToVote: [],
                playedCategories: [],
                playedQuestionIds: [],
                categoryVotes: {},
                playerAnswers: {},
                currentRound: 0,
                currentQuestionIndex: 0,
                currentQuestions: [],
                activeQuestion: null,
                players: {},
                roundMoves: {},
                finishStep: 0,
                standings: []
            });
        } catch (err) {}

        return function() {
            if (nextPhaseTimeoutRef.current) clearTimeout(nextPhaseTimeoutRef.current);
            if (podiumAudioRef.current) {
                try {
                    podiumAudioRef.current.pause();
                    podiumAudioRef.current.currentTime = 0;
                } catch(e) {}
            }
        };
    }, [roomId, dbUrl]);

    var hasPlayersInLobby = Object.keys((gameState && gameState.players) || {}).length >= 1;

    useEffect(function() {
        var timerInterval = null;
        if (gameState && gameState.phase === 'lobby' && hasPlayersInLobby) {
            if (!lobbyEndTimeRef.current) {
                lobbyEndTimeRef.current = Date.now() + 60000;
            }
            var tick = function() {
                var remainingSec = Math.max(0, Math.ceil((lobbyEndTimeRef.current - Date.now()) / 1000));
                setLobbyCountdown(remainingSec);
                if (remainingSec <= 0) {
                    if (timerInterval) clearInterval(timerInterval);
                    lobbyEndTimeRef.current = null;
                    if (startNewRoundRef.current) startNewRoundRef.current();
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

    // QR-код: гарантированная очистка контейнера при смене фазы во избежание просвечивания
    useEffect(function() {
        if (gameState && gameState.phase === 'lobby') {
            if (qrRef.current) {
                qrRef.current.innerHTML = '';
                try {
                    var minDim = Math.min(window.innerWidth || 800, window.innerHeight || 600);
                    var qrSize = Math.min(220, Math.max(140, Math.floor(minDim * 0.25)));
                    new QRCode(qrRef.current, {
                        text: joinUrl,
                        width: qrSize,
                        height: qrSize,
                        colorDark : "#000000",
                        colorLight : "#ffffff",
                        correctLevel : QRCode.CorrectLevel.M
                    });
                } catch(e) {}
            }
        } else {
            if (qrRef.current) {
                qrRef.current.innerHTML = '';
                qrRef.current = null;
            }
        }
        return function() {
            if (qrRef.current) {
                qrRef.current.innerHTML = '';
            }
        };
    }, [gameState && gameState.phase, joinUrl]);

    // Аудио победного клича для призеров церемонии награждения топ-3 (на повторе 12 секунд)
    useEffect(function() {
        if (gameState && gameState.phase === 'finish') {
            window.GameSync.fetchRoomCheers(roomId, function() {
                var currentStandings = (gameState.standings && gameState.standings.length > 0)
                    ? gameState.standings
                    : getSortedStandings(gameState.players);
                var podiumList = currentStandings.slice(0, 3);
                var currentStep = gameState.finishStep || 0;

                if (currentStep < podiumList.length) {
                    var currPlayer = podiumList[currentStep];
                    if (currPlayer) {
                        if (podiumAudioRef.current) {
                            try {
                                podiumAudioRef.current.pause();
                                podiumAudioRef.current.currentTime = 0;
                            } catch(e) {}
                        }
                        var cheer = window.GameSync.getCheerAudio(currPlayer.id) || currPlayer.cheerAudio;
                        if (cheer) {
                            try {
                                var a = new Audio(cheer);
                                a.loop = true;
                                podiumAudioRef.current = a;
                                var pPromise = a.play();
                                if (pPromise !== undefined) {
                                    pPromise.catch(function() {});
                                }
                            } catch(err) {}
                        }
                    }
                }
            });
        } else {
            if (podiumAudioRef.current) {
                try {
                    podiumAudioRef.current.pause();
                    podiumAudioRef.current.currentTime = 0;
                } catch(e) {}
                podiumAudioRef.current = null;
            }
        }

        return function() {
            if (podiumAudioRef.current) {
                try {
                    podiumAudioRef.current.pause();
                    podiumAudioRef.current.currentTime = 0;
                } catch(e) {}
            }
        };
    }, [gameState && gameState.phase, gameState && gameState.finishStep, roomId]);

    // Логика выбора категории: большинство голосов, при равенстве — случайный выбор из набравших максимум
    var handleVoteFinished = useCallback(function() {
        if (phaseLockRef.current) return;
        phaseLockRef.current = true;

        var syncState = window.GameSync ? window.GameSync._getState() : {};
        var votes = syncState.categoryVotes || {};
        var categoriesToVoteList = syncState.categoriesToVote || [];

        var voteCounts = {};
        categoriesToVoteList.forEach(function(c) {
            voteCounts[c.id] = 0;
        });

        for (var vKey in votes) {
            if (Object.prototype.hasOwnProperty.call(votes, vKey)) {
                var catId = votes[vKey];
                if (catId) {
                    voteCounts[catId] = (voteCounts[catId] || 0) + 1;
                }
            }
        }

        var maxCount = 0;
        for (var cId in voteCounts) {
            if (Object.prototype.hasOwnProperty.call(voteCounts, cId)) {
                if (voteCounts[cId] > maxCount) {
                    maxCount = voteCounts[cId];
                }
            }
        }

        var tiedCategories = [];
        if (maxCount === 0) {
            tiedCategories = categoriesToVoteList.map(function(c) { return c.id; });
        } else {
            for (var cKey in voteCounts) {
                if (Object.prototype.hasOwnProperty.call(voteCounts, cKey)) {
                    if (voteCounts[cKey] === maxCount) {
                        tiedCategories.push(cKey);
                    }
                }
            }
        }

        var chosenCat = 'cinema';
        if (tiedCategories.length > 0) {
            var randomIndex = Math.floor(Math.random() * tiedCategories.length);
            chosenCat = tiedCategories[randomIndex];
        } else if (categoriesToVoteList.length > 0) {
            chosenCat = categoriesToVoteList[0].id;
        }

        var prevPlayedQIds = (syncState.playedQuestionIds || []).slice();
        var questions = window.QuestionBank.getQuestions(chosenCat, 4, prevPlayedQIds);
        currentQuestionsRef.current = questions;

        var newQIds = questions.map(function(q) { return q.id; });
        var updatedPlayedQIds = prevPlayedQIds.concat(newQIds);

        var prevPlayed = (syncState.playedCategories || []).slice();
        if (prevPlayed.indexOf(chosenCat) === -1) {
            prevPlayed.push(chosenCat);
        }

        if (window.GameSync && window.GameSync.clearAnswers) {
            window.GameSync.clearAnswers(roomId);
        }

        window.GameSync.updateState({
            phase: 'question',
            timerDuration: 30,
            timerKey: 'q_0_' + Date.now(),
            playedCategories: prevPlayed,
            playedQuestionIds: updatedPlayedQIds,
            categoryVotes: {},
            playerAnswers: {},
            currentQuestionIndex: 0,
            currentQuestions: questions,
            activeQuestion: questions[0]
        });
    }, [roomId]);

    function executeRoundMovement() {
        setIsAnimatingRoundMoves(true);

        window.GameSync.fetchRoomCheers(roomId, function(cheersMap) {
            window.GameSync.updateState({
                phase: 'board_move',
                timerDuration: 0,
                timerKey: '',
                playerAnswers: {}
            }).then(function() {
                var syncState = window.GameSync._getState();
                var playersCopy = JSON.parse(JSON.stringify(syncState.players || {}));
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
                            timerDuration: 6,
                            timerKey: 'sum_' + Date.now(),
                            roundMoves: roundMoves,
                            players: playersCopy
                        });
                    }

                    var pid = playerIds[playerIndex];
                    var steps = roundCorrectRef.current[pid] || 0;
                    var currentPos = playersCopy[pid].position || 0;

                    var cheerData = (cheersMap && cheersMap[pid]) || (playersCopy[pid] && playersCopy[pid].cheerAudio);
                    if (steps > 0 && cheerData) {
                        try {
                            var cheer = new Audio(cheerData);
                            cheer.play().catch(function() {});
                        } catch (err) {}
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
            });
        });
    }

    var handleShowResultPhase = useCallback(function() {
        if (phaseLockRef.current) return;
        phaseLockRef.current = true;

        var syncState = window.GameSync ? window.GameSync._getState() : {};
        var currentQIndex = syncState.currentQuestionIndex || 0;
        var questionsList = currentQuestionsRef.current.length ? currentQuestionsRef.current : (syncState.currentQuestions || []);
        var currentQ = questionsList[currentQIndex];
        var correctIndex = currentQ ? (currentQ.correctIndex !== undefined ? currentQ.correctIndex : currentQ.correct) : 0;

        var playerAnswers = syncState.playerAnswers || {};
        for (var pid in playerAnswers) {
            if (Object.prototype.hasOwnProperty.call(playerAnswers, pid)) {
                if (playerAnswers[pid] === correctIndex) {
                    roundCorrectRef.current[pid] = (roundCorrectRef.current[pid] || 0) + 1;
                }
            }
        }

        window.GameSync.updateState({
            phase: 'answer_reveal',
            timerDuration: 0,
            timerKey: ''
        });

        if (nextPhaseTimeoutRef.current) clearTimeout(nextPhaseTimeoutRef.current);
        nextPhaseTimeoutRef.current = setTimeout(function() {
            var nextQIndex = currentQIndex + 1;
            if (nextQIndex < 4) {
                if (window.GameSync && window.GameSync.clearAnswers) {
                    window.GameSync.clearAnswers(roomId);
                }
                window.GameSync.updateState({
                    phase: 'question',
                    timerDuration: 30,
                    timerKey: 'q_' + nextQIndex + '_' + Date.now(),
                    currentQuestionIndex: nextQIndex,
                    activeQuestion: questionsList[nextQIndex],
                    playerAnswers: {}
                });
            } else {
                executeRoundMovement();
            }
        }, 6000);
    }, [roomId]);

    // Проверка завершения фаз по таймеру и ответам игроков
    useEffect(function() {
        if (!gameState) return;
        var phase = gameState.phase;
        var players = gameState.players || {};
        var categoryVotes = gameState.categoryVotes || {};
        var playerAnswers = gameState.playerAnswers || {};

        var timeInPhase = Date.now() - phaseStartLocalRef.current;
        var isTimeUp = (gameState.timerDuration > 0 && timeInPhase >= (gameState.timerDuration * 1000));

        if (phase === 'category_vote') {
            var numPlayers = Object.keys(players).length;
            var numVotes = Object.keys(categoryVotes).length;
            if (isTimeUp || (numPlayers > 0 && numVotes >= numPlayers && timeInPhase >= 1500)) {
                if (!phaseLockRef.current) handleVoteFinished();
            }
        } else if (phase === 'question') {
            var numPlayersQ = Object.keys(players).length;
            var numAnswersQ = Object.keys(playerAnswers).length;
            if (isTimeUp || (numPlayersQ > 0 && numAnswersQ >= numPlayersQ && timeInPhase >= 1500)) {
                if (!phaseLockRef.current) handleShowResultPhase();
            }
        } else if (phase === 'round_summary') {
            if (isTimeUp) {
                if (!phaseLockRef.current) {
                    phaseLockRef.current = true;
                    var hasWinner = false;
                    for (var pid in players) {
                        if (Object.prototype.hasOwnProperty.call(players, pid)) {
                            if ((players[pid].position || 0) >= TOTAL_CELLS - 1) {
                                hasWinner = true;
                                break;
                            }
                        }
                    }
                    if (hasWinner) {
                        var standingsList = getSortedStandings(players);
                        window.GameSync.updateState({
                            phase: 'finish',
                            finishStep: 0,
                            winnerId: standingsList[0] ? standingsList[0].id : null,
                            standings: standingsList,
                            timerDuration: 12,
                            timerKey: 'podium_0_' + Date.now()
                        });
                    } else {
                        startNewRound();
                    }
                }
            }
        } else if (phase === 'finish') {
            if (isTimeUp) {
                if (!phaseLockRef.current) {
                    phaseLockRef.current = true;
                    var currentStandings = (gameState.standings && gameState.standings.length > 0)
                        ? gameState.standings
                        : getSortedStandings(gameState.players);
                    var podiumList = currentStandings.slice(0, 3);
                    var currentStep = gameState.finishStep || 0;
                    var nextStep = currentStep + 1;

                    if (nextStep < podiumList.length) {
                        window.GameSync.updateState({
                            finishStep: nextStep,
                            timerDuration: 12,
                            timerKey: 'podium_' + nextStep + '_' + Date.now()
                        });
                    } else {
                        // Церемония награждения топ-3 завершена: возврат в лобби с сохранением игроков и обнулением позиций
                        if (podiumAudioRef.current) {
                            try {
                                podiumAudioRef.current.pause();
                                podiumAudioRef.current.currentTime = 0;
                            } catch(e) {}
                            podiumAudioRef.current = null;
                        }
                        var resetPlayers = {};
                        for (var resetId in players) {
                            if (Object.prototype.hasOwnProperty.call(players, resetId)) {
                                var pClone = Object.assign({}, players[resetId]);
                                pClone.position = 0;
                                pClone.score = 0;
                                resetPlayers[resetId] = pClone;
                            }
                        }
                        StartMusicManager.play();
                        window.GameSync.updateState({
                            phase: 'lobby',
                            finishStep: 0,
                            winnerId: null,
                            standings: [],
                            players: resetPlayers,
                            timerDuration: 0,
                            timerKey: '',
                            categoriesToVote: [],
                            playedCategories: [],
                            playedQuestionIds: [],
                            categoryVotes: {},
                            playerAnswers: {},
                            currentRound: 0,
                            currentQuestionIndex: 0,
                            currentQuestions: [],
                            activeQuestion: null,
                            roundMoves: {}
                        });
                    }
                }
            }
        }
    }, [gameState, timeLeft, handleVoteFinished, handleShowResultPhase, startNewRound]);

    if (!gameState) {
        return h('div', { className: 'flex items-center justify-center h-full text-3xl font-black' }, 'Загрузка...');
    }

    var phase = gameState.phase;
    var categoriesToVote = gameState.categoriesToVote;
    var currentQuestionIndex = gameState.currentQuestionIndex || 0;
    var players = gameState.players || {};
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
    var currentQ = gameState.activeQuestion || questionsList[currentQuestionIndex] || null;
    var currentQCorrectIndex = currentQ ? (currentQ.correctIndex !== undefined ? currentQ.correctIndex : currentQ.correct) : 0;

    var cellOccupantsMap = {};
    playersList.forEach(function(p) {
        var cellPos = visualPositions[p.id] !== undefined ? visualPositions[p.id] : (p.position || 0);
        if (!cellOccupantsMap[cellPos]) cellOccupantsMap[cellPos] = [];
        cellOccupantsMap[cellPos].push(p.id);
    });

    var cellElements = [];
    for (var i = 0; i < TOTAL_CELLS; i++) {
        (function(cellIndex) {
            var pos = getGridPos(cellIndex);
            var isStart = cellIndex === 0;
            var isFinish = cellIndex === TOTAL_CELLS - 1;
            var hasPawns = playersList.some(function(p) {
                var cPos = visualPositions[p.id] !== undefined ? visualPositions[p.id] : (p.position || 0);
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
                    isStart ? 'СТАРТ' : (isFinish ? '🏆 ФИНИШ' : cellIndex)
                )
            ));
        })(i);
    }

    var pawnElements = playersList.map(function(p) {
        var cellPos = visualPositions[p.id] !== undefined ? visualPositions[p.id] : (p.position || 0);
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

    var boardGridClass = 'board-grid absolute inset-0 w-full h-full pointer-events-none transition-all duration-500 ' +
        (phase === 'board_move' ? 'opacity-100 z-10' : 'opacity-20 filter blur-[1px] z-0');

    var phaseContent = null;

    if (phase === 'lobby') {
        var lobbyAvatars = playersList.length === 0 
            ? h('p', { className: 'text-yellow-100' }, 'Ожидание игроков с телефона...')
            : playersList.map(function(p) {
                var pCol = p.color || '#FF3B30';
                var avatarInner = isSafeImageSrc(p.selfie)
                    ? h('img', { src: p.selfie, className: 'w-full h-full object-cover' })
                    : h('span', { className: 'text-3xl text-black' }, p.selfie || '👤');

                return h('div', { key: p.id, className: 'flex flex-col items-center' },
                    h('div', {
                        className: 'w-16 h-16 rounded-full overflow-hidden mb-2 flex items-center justify-center player-avatar-frame',
                        style: {
                            backgroundColor: pCol,
                            border: '4px solid ' + pCol,
                            boxShadow: '0 0 14px ' + pCol + ', 3px 3px 0 #000000',
                            '--current-player-color': pCol
                        }
                    }, avatarInner),
                    h('span', { className: 'font-bold text-sm max-w-[80px] truncate' }, p.name)
                );
            });

        phaseContent = h('div', { key: 'lobby-card', className: 'glass-card p-6 md:p-8 text-center max-w-2xl w-full my-auto' },
            h('h2', { className: 'text-4xl md:text-5xl font-black mb-3' },
                'Комната: ',
                h('span', { className: 'text-yellow-300 tracking-widest' }, roomId)
            ),
            h('div', { className: 'flex flex-col items-center justify-center mb-4' },
                h('div', {
                    key: 'lobby-qr-box',
                    ref: qrRef,
                    className: 'bg-white p-3 rounded-2xl inline-flex border-4 border-black items-center justify-center shadow-lg'
                }),
                h('div', { className: 'mt-2 text-xs text-yellow-300 font-mono break-all' }, joinUrl)
            ),
            playersList.length >= 1 ? h('div', {
                className: 'text-sm font-bold text-black bg-yellow-300 border-2 border-black px-4 py-1.5 rounded-xl mb-4 inline-block animate-pulse'
            }, 'Авто-старт через ' + lobbyCountdown + ' сек') : null,
            h('h3', { className: 'text-lg font-bold text-yellow-200 mb-2' }, 'Игроки (' + playersList.length + '/10):'),
            h('div', { className: 'flex flex-wrap justify-center gap-3 mb-4 min-h-[60px]' }, lobbyAvatars),
            h('button', {
                onClick: startNewRound,
                disabled: playersList.length === 0,
                className: 'primary-btn px-10 py-3 text-xl w-full'
            }, 'Начать игру')
        );
    } else if (phase === 'category_vote') {
        var categoryCards = (categoriesToVote || []).map(function(cat, idx) {
            var voters = playersList.filter(function(p) { return categoryVotes[p.id] === cat.id; });
            var voterBadges = voters.map(function(p) {
                var pCol = p.color || '#FF3B30';
                var head = isSafeImageSrc(p.selfie)
                    ? h('img', { src: p.selfie, className: 'w-full h-full object-cover' })
                    : h('span', { className: 'text-xs font-bold text-black' }, p.selfie || '👤');

                return h('div', {
                    key: p.id,
                    className: 'w-8 h-8 rounded-full overflow-hidden flex items-center justify-center player-avatar-frame',
                    style: {
                        backgroundColor: pCol,
                        border: '2.5px solid ' + pCol,
                        boxShadow: '0 0 8px ' + pCol + ', 2px 2px 0 #000000',
                        '--current-player-color': pCol
                    }
                }, head);
            });

            return h('div', {
                key: idx,
                className: 'glass-card p-3 bg-indigo-900/60 flex flex-col items-center justify-between rounded-2xl border-4 border-black min-h-[110px]'
            },
                h('span', { className: 'text-3xl md:text-5xl mb-1' }, cat.icon),
                h('h3', { className: 'category-card-title text-base md:text-xl font-bold mb-1' }, cat.name),
                h('div', { className: 'flex gap-1 min-h-[28px] items-center justify-center flex-wrap' }, voterBadges)
            );
        });

        phaseContent = h('div', { key: 'category-vote-card', className: 'glass-card p-6 md:p-8 text-center max-w-4xl w-full my-auto' },
            h('h2', { className: 'text-3xl md:text-4xl font-extrabold mb-1' }, 'Выбор категории'),
            h('div', { key: 'vote-timer-track', className: 'timer-track mb-4' },
                h('div', {
                    className: 'timer-bar',
                    style: { width: ((timeLeft / 60) * 100) + '%' }
                })
            ),
            h('div', { className: 'categories-grid-6 mb-3' }, categoryCards),
            h('div', { className: 'text-3xl font-mono font-black text-yellow-300' }, timeLeft + ' сек')
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
                    var pCol = p.color || '#FF3B30';
                    var head = isSafeImageSrc(p.selfie)
                        ? h('img', { src: p.selfie, className: 'w-full h-full object-cover' })
                        : h('span', { className: 'text-base text-black font-bold' }, p.selfie || '👤');

                    return h('div', {
                        key: p.id,
                        className: 'w-9 h-9 rounded-full overflow-hidden flex items-center justify-center player-avatar-frame',
                        style: {
                            backgroundColor: pCol,
                            border: '3px solid ' + pCol,
                            boxShadow: '0 0 10px ' + pCol + ', 2px 2px 0 #000000',
                            '--current-player-color': pCol
                        }
                    }, head);
                });
                badges = h('div', { className: 'absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-30' }, badgeItems);
            }

            var btnClass = 'quiz-btn ' + letterClass + ' ' + (isCorrect ? 'quiz-btn-correct ' : '') + (isWrong ? 'opacity-40 ' : '') + 'relative !cursor-default';

            return h('div', {
                key: optIdx,
                className: btnClass,
                style: { justifyContent: 'center' }
            },
                h('div', { className: 'quiz-btn-text text-center text-xl md:text-2xl font-bold' }, opt),
                badges
            );
        });

        var imageElement = null;
        if (currentQ.imageUrl && isSafeImageSrc(currentQ.imageUrl)) {
            imageElement = h('div', { className: 'question-image-container mb-3 flex justify-center w-full' },
                h('img', {
                    src: currentQ.imageUrl,
                    alt: 'question',
                    className: 'question-image-large'
                })
            );
        }

        phaseContent = h('div', { key: 'question-card-' + currentQuestionIndex, className: 'glass-card p-6 md:p-8 text-center max-w-4xl w-full my-auto' },
            h('div', { className: 'flex justify-between items-center mb-3' },
                h('span', { className: 'text-xl text-yellow-300 font-black uppercase' }, 'Вопрос ' + (currentQuestionIndex + 1) + ' из 4'),
                h('span', { className: 'text-3xl font-mono font-black bg-black text-yellow-300 px-4 py-1 rounded-xl border-2 border-black' },
                    isResultPhase ? '✓ Ответ' : (timeLeft + 's')
                )
            ),
            imageElement,
            h('h2', { className: 'text-2xl md:text-4xl font-black mb-5 leading-snug' }, currentQ.text || currentQ.q),
            h('div', { className: 'grid grid-cols-2 gap-4' }, optionButtons)
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
            var stepsText = '+' + moveData.stepsGained + ' ' + (moveData.stepsGained === 1 ? 'шаг' : 'шага');

            var pCol = p.color || '#FF3B30';
            var head = isSafeImageSrc(p.selfie)
                ? h('img', { src: p.selfie, className: 'w-full h-full object-cover' })
                : h('span', { className: 'text-2xl text-black' }, p.selfie || '👤');

            return h('div', {
                key: p.id,
                className: 'flex items-center justify-between p-3 rounded-2xl bg-indigo-900/80 border-3 border-black'
            },
                h('div', { className: 'flex items-center gap-3' },
                    h('div', { className: 'round-summary-badge ' + badgeClass }, moveData.rank),
                    h('div', {
                        className: 'w-10 h-10 rounded-full overflow-hidden flex items-center justify-center player-avatar-frame',
                        style: {
                            backgroundColor: pCol,
                            border: '3px solid ' + pCol,
                            boxShadow: '0 0 10px ' + pCol + ', 2px 2px 0 #000000',
                            '--current-player-color': pCol
                        }
                    }, head),
                    h('div', { className: 'text-left' },
                        h('div', { className: 'font-black text-lg text-white' }, p.name),
                        h('div', { className: 'text-xs text-yellow-200 font-bold' },
                            'Клетка: ' + Math.min(TOTAL_CELLS, (moveData.currentPos || 0) + 1) + ' / ' + TOTAL_CELLS
                        )
                    )
                ),
                h('div', { className: 'round-summary-steps text-lg font-black' }, stepsText)
            );
        });

        phaseContent = h('div', { key: 'round-summary-card', className: 'glass-card max-w-2xl w-full p-6 text-center my-auto' },
            h('h2', { className: 'text-3xl font-black mb-1 text-yellow-300' }, 'Итоги раунда'),
            h('div', { className: 'timer-track mb-4' },
                h('div', {
                    className: 'timer-bar',
                    style: { width: ((timeLeft / 6) * 100) + '%' }
                })
            ),
            h('div', { className: 'space-y-2 mb-4' }, summaryRows),
            h('div', { className: 'text-xl font-mono font-black text-yellow-300' }, 'Следующий раунд через ' + timeLeft + ' сек')
        );
    } else if (phase === 'finish') {
        var standingsFinish = (gameState.standings && gameState.standings.length > 0)
            ? gameState.standings
            : getSortedStandings(players);
        var podiumList = standingsFinish.slice(0, 3);
        var currentStep = gameState.finishStep || 0;
        var pItem = podiumList[currentStep] || podiumList[0];

        var stepClass = 'podium-gold';
        var rankTitle = '1 МЕСТО — ЗОЛОТО 🏆';
        var rankBadgeColor = 'bg-yellow-400 text-black';
        var rankColorHex = '#FFD700';

        if (currentStep === 1) {
            stepClass = 'podium-silver';
            rankTitle = '2 МЕСТО — СЕРЕБРО 🥈';
            rankBadgeColor = 'bg-slate-200 text-black';
            rankColorHex = '#CBD5E1';
        } else if (currentStep === 2) {
            stepClass = 'podium-bronze';
            rankTitle = '3 МЕСТО — БРОНЗА 🥉';
            rankBadgeColor = 'bg-amber-600 text-white';
            rankColorHex = '#CD7F32';
        }

        var avatarContent = null;
        if (pItem) {
            avatarContent = isSafeImageSrc(pItem.selfie)
                ? h('img', { src: pItem.selfie, className: 'w-full h-full object-cover rounded-full' })
                : h('span', { className: 'text-8xl md:text-9xl text-black select-none' }, pItem.selfie || '👤');
        }

        var playerHex = (pItem && pItem.color) || rankColorHex;

        phaseContent = h('div', {
            key: 'finish-overlay-' + currentStep,
            className: 'winner-podium-overlay'
        },
            h('div', {
                className: 'podium-card ' + stepClass + ' glass-card flex flex-col items-center justify-between p-6 md:p-8 relative overflow-hidden text-center',
                style: {
                    borderColor: playerHex,
                    boxShadow: '0 0 50px ' + playerHex + ', 8px 8px 0 #000000',
                    width: '90vw',
                    maxWidth: '900px',
                    height: '85vh',
                    maxHeight: '85vh'
                }
            },
                h('div', {
                    className: 'podium-ribbon text-2xl md:text-4xl font-black py-2.5 px-8 rounded-2xl border-4 border-black mb-2 inline-block uppercase shadow-lg ' + rankBadgeColor
                }, rankTitle),

                h('div', {
                    className: 'podium-avatar-giant rounded-full overflow-hidden flex items-center justify-center my-auto transition-transform transform hover:scale-105',
                    style: {
                        backgroundColor: playerHex,
                        border: '8px solid ' + playerHex,
                        boxShadow: '0 0 35px ' + playerHex + ', 8px 8px 0 #000000',
                        width: 'clamp(220px, 42vh, 400px)',
                        height: 'clamp(220px, 42vh, 400px)',
                        minWidth: 'clamp(220px, 42vh, 400px)',
                        minHeight: 'clamp(220px, 42vh, 400px)',
                        '--current-player-color': playerHex
                    }
                }, avatarContent),

                h('div', { className: 'mt-2 w-full flex flex-col items-center' },
                    h('h2', { className: 'text-3xl md:text-5xl font-black text-white mb-1 drop-shadow-md' }, pItem ? pItem.name : 'Игрок'),
                    h('div', { className: 'text-lg md:text-xl font-bold text-yellow-200' },
                        'Клетка: ' + Math.min(TOTAL_CELLS, (pItem ? pItem.position : 0) + 1) + ' / ' + TOTAL_CELLS
                    ),
                    h('div', { className: 'mt-2 text-base md:text-lg font-mono font-black text-yellow-300 bg-black/60 px-5 py-1 rounded-full border-2 border-black' },
                        'Смена через: ' + timeLeft + ' сек'
                    )
                )
            )
        );
    }

    var moveToast = null;
    if (phase === 'board_move') {
        moveToast = h('div', { className: 'move-info-toast z-50' },
            h('span', { className: 'text-3xl' }, '🎲'),
            h('div', null, 'Игроки делают ходы!')
        );
    }

    return h('div', { className: 'tv-container relative w-screen h-screen flex flex-col p-0 m-0 overflow-hidden' },
        h('div', { className: boardGridClass }, cellElements.concat(pawnElements)),
        moveToast,
        phaseContent ? (phase === 'finish' ? phaseContent : h('div', { className: 'tv-modal-overlay' }, phaseContent)) : null
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

    var localVoteState = useState(null);
    var localVote = localVoteState[0];
    var setLocalVote = localVoteState[1];

    var localAnswerState = useState(null);
    var localAnswer = localAnswerState[0];
    var setLocalAnswer = localAnswerState[1];

    var mediaRecorderRef = useRef(null);
    var audioChunksRef = useRef([]);
    var recordTimerRef = useRef(null);
    var cheerPreviewRef = useRef(null);

    var phaseStartLocalRef = useRef(Date.now());
    var lastTimerKeyRef = useRef('');

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
        } catch (err) {}

        return function() {
            if (recordTimerRef.current) clearInterval(recordTimerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                try { mediaRecorderRef.current.stop(); } catch(e) {}
            }
        };
    }, [roomId, dbUrl, playerId]);

    // Гарантированный сброс выбранных ответов и голосов при смене фазы или вопроса
    useEffect(function() {
        if (!gameState) return;
        if (gameState.phase !== 'category_vote') setLocalVote(null);
        if (gameState.phase !== 'question') {
            setLocalAnswer(null);
        }
    }, [gameState && gameState.phase]);

    useEffect(function() {
        setLocalAnswer(null);
    }, [gameState && gameState.timerKey, gameState && gameState.currentQuestionIndex]);

    // Локальный таймер телефона
    useEffect(function() {
        if (!gameState) return;

        if (gameState.timerKey !== lastTimerKeyRef.current) {
            lastTimerKeyRef.current = gameState.timerKey || '';
            phaseStartLocalRef.current = Date.now();
        }

        var duration = gameState.timerDuration || 0;
        if (duration <= 0) {
            setTimeLeft(0);
            return;
        }

        var tick = function() {
            var elapsed = (Date.now() - phaseStartLocalRef.current) / 1000;
            var remaining = Math.max(0, Math.ceil(duration - elapsed));
            setTimeLeft(remaining);
        };

        tick();
        var timer = setInterval(tick, 200);
        return function() { clearInterval(timer); };
    }, [gameState && gameState.timerKey, gameState && gameState.timerDuration]);

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
            alert("Запись аудио не поддерживается");
            return;
        }

        navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
            audioChunksRef.current = [];
            var mimeType = '';
            if (window.MediaRecorder) {
                if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
                else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
            }

            var recorderOptions = { audioBitsPerSecond: 16000 };
            if (mimeType) recorderOptions.mimeType = mimeType;

            var mediaRecorder = new MediaRecorder(stream, recorderOptions);
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
                    var base64 = reader.result;
                    setCheerAudio(base64);
                    setIsRecordingCheer(false);
                    if (playerId) {
                        window.GameSync.uploadCheerAudio(roomId, playerId, base64);
                    }
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
            }, 850);
        }).catch(function() {
            setIsRecordingCheer(false);
        });
    }

    function playCheerPreview() {
        if (!cheerAudio) return;
        if (cheerPreviewRef.current) cheerPreviewRef.current.pause();
        var audio = new Audio(cheerAudio);
        cheerPreviewRef.current = audio;
        audio.play().catch(function() {});
    }

    function handleJoin() {
        var count = Object.keys((gameState && gameState.players) || {}).length;
        if (count >= 10) {
            alert("Комната заполнена");
            return;
        }

        var assignedColor = color || PLAYER_COLORS[0];
        if (!name.trim() || !selfie) {
            alert("Введите имя и выберите аватар/селфи!");
            return;
        }

        var newId = playerId || generatePlayerId();
        setPlayerId(newId);
        safeStorage.setItem('playerId', newId);
        safeStorage.setItem('tv_game_player_id', newId);

        var newPlayerData = {
            id: newId,
            name: name.trim().slice(0, 12),
            color: assignedColor,
            selfie: selfie,
            hasCheer: Boolean(cheerAudio),
            position: 0,
            score: 0
        };

        if (cheerAudio) {
            window.GameSync.uploadCheerAudio(roomId, newId, cheerAudio);
        }

        window.GameSync.patchPlayer(roomId, newId, newPlayerData);
        setIsJoined(true);
    }

    function sendVote(catId) {
        if (!playerId || localVote !== null) return;
        setLocalVote(catId);
        window.GameSync.patchVote(roomId, playerId, catId);
    }

    function sendAnswer(optionIndex) {
        if (!playerId || !gameState || gameState.phase !== 'question' || hasAnswered) return;
        setLocalAnswer(optionIndex);
        window.GameSync.patchAnswer(roomId, playerId, optionIndex);
    }

    if (!isJoined || !gameState || !gameState.players || !gameState.players[playerId]) {
        var selfieInner = null;
        if (!selfie) {
            selfieInner = h('span', { className: 'text-2xl' }, '👤');
        } else if (isSafeImageSrc(selfie)) {
            selfieInner = h('img', { src: selfie, className: 'w-full h-full object-cover' });
        } else {
            selfieInner = h('span', { className: 'text-2xl text-black' }, selfie);
        }

        var emojiButtons = EMOJI_AVATARS.map(function(em) {
            return h('button', {
                key: em,
                type: 'button',
                onClick: function() { setSelfie(em); },
                className: 'text-lg p-1 rounded-md border border-black ' + (selfie === em ? 'bg-yellow-400' : 'bg-white/20')
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
                className: 'color-select-btn !w-8 !h-8 text-xs font-black ' + (isSelected ? 'selected' : ''),
                style: {
                    backgroundColor: c,
                    borderColor: isSelected ? c : '#000000',
                    boxShadow: isSelected ? ('0 0 14px ' + c + ', 3px 3px 0 #000000') : '2px 2px 0 #000000'
                }
            }, isSelected ? '✓' : '');
        });

        var cheerControls = null;
        if (!cheerAudio) {
            cheerControls = h('button', {
                type: 'button',
                onClick: startRecordingCheer,
                disabled: isRecordingCheer,
                className: 'primary-btn w-full !py-2 text-xs !bg-amber-400'
            }, isRecordingCheer ? ('🔴 Идет запись (' + cheerCountdown + 'с)') : '🎤 Записать победный клич');
        } else {
            cheerControls = h('div', { className: 'flex flex-col gap-2 w-full' },
                h('button', {
                    type: 'button',
                    onClick: playCheerPreview,
                    className: 'primary-btn w-full !py-2 text-xs !bg-emerald-500'
                }, '▶️ Прослушать'),
                h('button', {
                    type: 'button',
                    onClick: function() {
                        setCheerAudio(null);
                        startRecordingCheer();
                    },
                    className: 'primary-btn w-full !py-2 text-xs !bg-gray-600'
                }, '🔄 Перезаписать клич')
            );
        }

        var activeColor = color || '#FF3B30';

        return h('div', { className: 'mobile-container' },
            h(CameraModal, {
                isOpen: showCameraModal,
                onClose: handleCloseCamera,
                onSave: setSelfie
            }),
            h('div', { className: 'glass-card w-full max-w-sm !p-3.5 space-y-2.5 my-auto' },
                h('h2', { className: 'text-xl font-black text-center text-yellow-300' }, 'Вход в игру'),
                
                // Ряд: Аватарка с яркой подсветкой выбранным цветом + Кнопка селфи
                h('div', { className: 'flex items-center gap-3 w-full bg-black/30 p-2 rounded-xl border border-black' },
                    h('div', {
                        className: 'player-avatar-preview player-avatar-frame w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0',
                        style: {
                            backgroundColor: activeColor,
                            border: '4px solid ' + activeColor,
                            borderColor: activeColor,
                            boxShadow: '0 0 16px ' + activeColor + ', 3px 3px 0 #000000',
                            '--current-player-color': activeColor
                        }
                    }, selfieInner),
                    h('button', {
                        type: 'button',
                        onClick: function() { setShowCameraModal(true); },
                        className: 'primary-btn flex-1 !py-1.5 text-xs'
                    }, '📸 Сделать селфи')
                ),

                h('div', { className: 'flex gap-1 flex-wrap justify-center' }, emojiButtons),

                h('input', {
                    type: 'text',
                    value: name,
                    onChange: function(e) { setName(e.target.value); },
                    placeholder: 'Ваше имя',
                    maxLength: '12',
                    className: '!py-1.5 !px-3 !text-sm'
                }),

                // 10 кружков цветов
                h('div', { className: 'grid grid-cols-5 gap-1.5 justify-items-center w-full py-1' }, colorButtons),

                // Блок победного клича
                h('div', { className: 'w-full bg-black/30 p-2 rounded-xl border border-black flex flex-col items-center gap-1.5' },
                    h('div', { className: 'text-[11px] font-black text-yellow-300 uppercase' }, 'Победный клич (2.5 сек)'),
                    cheerControls
                ),

                h('button', {
                    type: 'button',
                    onClick: handleJoin,
                    className: 'primary-btn w-full !mt-1 text-base !py-2.5 shadow-lg'
                }, 'Войти в игру')
            )
        );
    }

    var phase = gameState.phase;
    var categoriesToVote = gameState.categoriesToVote;
    var currentQuestionIndex = gameState.currentQuestionIndex || 0;
    var players = gameState.players || {};
    var categoryVotes = gameState.categoryVotes || {};
    var playerAnswers = gameState.playerAnswers || {};
    var roundMoves = gameState.roundMoves || {};

    var myPlayer = players[playerId] || { name: 'Я', color: '#FF3B30' };
    var standings = getSortedStandings(players);
    var myRank = 0;
    for (var ri = 0; ri < standings.length; ri++) {
        if (standings[ri].id === playerId) {
            myRank = ri + 1;
            break;
        }
    }

    var effectiveVote = localVote !== null ? localVote : categoryVotes[playerId];
    var hasVoted = Boolean(effectiveVote);

    var remoteAnswer = (phase === 'question' || phase === 'answer_reveal') && playerAnswers ? playerAnswers[playerId] : null;
    var effectiveAnswer = localAnswer !== null ? localAnswer : (remoteAnswer !== undefined ? remoteAnswer : null);
    var hasAnswered = effectiveAnswer !== null && effectiveAnswer !== undefined;

    var currentQ = gameState.activeQuestion || (gameState.currentQuestions && gameState.currentQuestions[currentQuestionIndex]) || null;

    var myHead = isSafeImageSrc(myPlayer.selfie)
        ? h('img', { src: myPlayer.selfie, className: 'w-full h-full object-cover' })
        : h('span', { className: 'text-xl text-black' }, myPlayer.selfie || '👤');

    var myCol = myPlayer.color || '#FF3B30';

    var mobilePhaseContent = null;

    if (phase === 'lobby') {
        mobilePhaseContent = h('div', { className: 'text-center glass-card p-6' },
            h('h2', { className: 'text-xl font-black mb-1' }, 'Вы в игре!'),
            h('p', { className: 'text-yellow-100 font-bold text-sm' }, 'Ожидайте старта на экране ТВ...')
        );
    } else if (phase === 'category_vote') {
        var voteButtons = (categoriesToVote || []).map(function(cat) {
            var isChosen = effectiveVote === cat.id;
            var catBtnClasses = 'glass-card flex flex-col items-center justify-center text-center p-2 min-h-[80px] ' +
                (isChosen ? '!bg-yellow-400 !text-black !border-black font-black ' : '') +
                (hasVoted && !isChosen ? 'opacity-40 grayscale ' : '');

            return h('button', {
                key: cat.id,
                onClick: function() { sendVote(cat.id); },
                disabled: hasVoted,
                className: catBtnClasses
            },
                h('span', { className: 'text-2xl mb-1' }, cat.icon),
                h('span', { className: 'text-xs font-bold leading-tight' }, cat.name)
            );
        });

        mobilePhaseContent = h('div', { className: 'flex flex-col gap-2 h-full justify-center' },
            h('h2', { className: 'text-base font-black text-center text-yellow-300' }, 'Выберите категорию:'),
            h('div', { className: 'grid grid-cols-2 gap-2' }, voteButtons)
        );
    } else if (phase === 'question') {
        var answerLetters = ['A', 'B', 'C', 'D'];
        var answerButtons = answerLetters.map(function(lbl, i) {
            var isSelected = effectiveAnswer === i;
            var optionText = (currentQ && currentQ.options && currentQ.options[i]) ? currentQ.options[i] : ('Вариант ' + lbl);
            var btnClasses = 'quiz-btn quiz-btn-' + lbl.toLowerCase() + ' !py-2.5 !px-3 ' +
                (isSelected ? 'quiz-btn-selected ' : '') +
                (hasAnswered && !isSelected ? 'opacity-40 ' : '');

            return h('button', {
                key: i,
                onClick: function() { sendAnswer(i); },
                disabled: hasAnswered,
                className: btnClasses
            },
                h('div', { className: 'quiz-btn-letter shrink-0' }, lbl),
                h('div', { className: 'quiz-btn-text text-sm font-black' },
                    optionText + (isSelected ? ' ✓' : '')
                )
            );
        });

        mobilePhaseContent = h('div', { className: 'flex flex-col h-full justify-between pb-2' },
            h('div', { className: 'text-center mb-1' },
                h('div', { className: 'text-xs text-yellow-300 font-black uppercase' }, 'Вопрос ' + (currentQuestionIndex + 1) + ' из 4'),
                h('div', { className: 'text-2xl font-mono font-black' }, timeLeft)
            ),
            h('div', { className: 'grid grid-cols-1 gap-2 flex-1 justify-center my-auto' }, answerButtons)
        );
    } else if (phase === 'answer_reveal') {
        mobilePhaseContent = h('div', { className: 'text-center glass-card p-6 border-4 border-black' },
            h('h2', { className: 'text-xl font-black mb-1 text-yellow-300' }, 'Внимание на экран ТВ!'),
            h('p', { className: 'text-sm font-bold' }, 'Смотрим правильный ответ...')
        );
    } else if (phase === 'board_move') {
        mobilePhaseContent = h('div', { className: 'text-center glass-card p-6 border-4 border-black' },
            h('div', { className: 'text-5xl mb-2 animate-bounce' }, '🏃‍♂️'),
            h('h2', { className: 'text-xl font-black text-yellow-300' }, 'Фигурки шагают по полю!')
        );
    } else if (phase === 'round_summary') {
        var myMoveData = roundMoves[playerId];
        mobilePhaseContent = h('div', { className: 'text-center glass-card p-5 border-4 border-black' },
            h('div', { className: 'text-4xl mb-2' }, '📊'),
            h('h2', { className: 'text-2xl font-black mb-2 text-yellow-300' }, 'Итоги раунда'),
            myMoveData ? h('div', { className: 'space-y-2' },
                h('div', { className: 'text-lg font-black text-black bg-yellow-400 py-1 px-3 rounded-lg border-2 border-black inline-block' },
                    myMoveData.rank + ' место'
                ),
                h('div', { className: 'text-xl font-black text-black bg-lime-400 py-1.5 px-3 rounded-lg border-2 border-black' },
                    '+' + myMoveData.stepsGained + ' ' + (myMoveData.stepsGained === 1 ? 'шаг' : 'шага')
                )
            ) : h('p', null, 'Подсчет результатов...')
        );
    } else if (phase === 'finish') {
        var standingsF = (gameState.standings && gameState.standings.length > 0)
            ? gameState.standings
            : getSortedStandings(players);
        var currentStepF = gameState.finishStep || 0;
        var podiumListF = standingsF.slice(0, 3);
        var stepPlayer = podiumListF[currentStepF];
        var isCurrentCelebrating = stepPlayer && stepPlayer.id === playerId;

        var myPlace = 0;
        for (var mi = 0; mi < standingsF.length; mi++) {
            if (standingsF[mi].id === playerId) {
                myPlace = mi + 1;
                break;
            }
        }

        var placeTitle = myPlace === 1 ? '1 МЕСТО — ЗОЛОТО! 🏆' : (myPlace === 2 ? '2 МЕСТО — СЕРЕБРО! 🥈' : (myPlace === 3 ? '3 МЕСТО — БРОНЗА! 🥉' : (myPlace + ' МЕСТО')));
        var placeBadgeColor = myPlace === 1 ? 'bg-yellow-400 text-black' : (myPlace === 2 ? 'bg-slate-300 text-black' : (myPlace === 3 ? 'bg-amber-600 text-white' : 'bg-indigo-700 text-white'));

        mobilePhaseContent = h('div', { className: 'text-center glass-card p-6 border-4 border-black space-y-4' },
            h('div', { className: 'text-6xl animate-bounce' }, myPlace === 1 ? '👑' : (myPlace === 2 ? '🥈' : (myPlace === 3 ? '🥉' : '🎉'))),
            h('h2', { className: 'text-2xl font-black text-yellow-300 uppercase' }, 'Церемония награждения!'),
            h('div', { className: 'py-2 px-4 rounded-xl border-3 border-black text-xl font-black inline-block ' + placeBadgeColor }, placeTitle),
            h('p', { className: 'text-lg font-bold' },
                isCurrentCelebrating
                    ? 'Ваш выход на экране ТВ! 🌟'
                    : ('На экране ТВ: ' + (stepPlayer ? stepPlayer.name : ''))
            ),
            h('p', { className: 'text-xs text-yellow-100' }, 'Скоро начнется новая игра...')
        );
    }

    return h('div', { className: 'mobile-container' },
        h('div', { className: 'glass-card p-2 flex items-center justify-between shrink-0' },
            h('div', { className: 'flex items-center gap-2' },
                h('div', {
                    className: 'w-8 h-8 rounded-full overflow-hidden flex items-center justify-center player-avatar-frame',
                    style: {
                        backgroundColor: myCol,
                        border: '3px solid ' + myCol,
                        boxShadow: '0 0 10px ' + myCol + ', 2px 2px 0 #000000',
                        '--current-player-color': myCol
                    }
                }, myHead),
                h('div', null,
                    h('div', { className: 'font-black text-sm' }, myPlayer.name),
                    h('div', { className: 'text-[11px] text-yellow-300 font-bold' }, myRank > 0 ? (myRank + ' место') : '')
                )
            )
        ),
        h('div', { className: 'flex-1 flex flex-col justify-center' }, mobilePhaseContent)
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
        if (rawDb) db = rawDb;
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