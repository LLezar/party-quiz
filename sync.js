// filename: sync.js
window.GameSync = (function() {
    var stateChangeCallback = null;
    var currentRoomCode = null;
    var databaseUrl = null;
    var currentRole = null;
    var bc = null; // BroadcastChannel для мгновенного обмена между вкладками одного устройства
    var firebaseInterval = null;
    var activePushCount = 0;

    function safeGetStorage(key) {
        try {
            return window.localStorage ? window.localStorage.getItem(key) : null;
        } catch (e) {
            console.warn("Storage read error:", e);
            return null;
        }
    }

    function safeSetStorage(key, value) {
        try {
            if (window.localStorage) {
                window.localStorage.setItem(key, value);
            }
        } catch (e) {
            console.warn("Storage write error:", e);
        }
    }

    function safeParse(str) {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.error("GameSync JSON Parse Error:", e);
            return null;
        }
    }

    function sanitizeDbUrl(url) {
        if (!url || typeof url !== 'string') return null;
        var trimmed = url.trim().replace(/\/+$/, '');
        if (trimmed.indexOf('https://') !== 0) return null;
        if (trimmed.indexOf('firebaseio.com') === -1 && trimmed.indexOf('firebasedatabase.app') === -1) return null;
        return trimmed;
    }

    var localState = {
        phase: 'lobby',
        players: {},
        categoriesToVote: [],
        playedCategories: [],
        categoryVotes: {},
        playerAnswers: {},
        currentRound: 0,
        currentQuestionIndex: 0,
        currentQuestions: [],
        timerEndTime: 0,
        roundMoves: {},
        winnerId: null
    };

    function triggerCallback() {
        if (stateChangeCallback) {
            stateChangeCallback(JSON.parse(JSON.stringify(localState)));
        }
    }

    function isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    // Ключи, которые при сбросе раунда/вопроса хостом должны очищаться
    var RESET_KEYS = ['playerAnswers', 'categoryVotes', 'roundMoves'];

    function mergeDeep(target, source) {
        if (!isObject(target) || !isObject(source)) return;

        for (var key in source) {
            if (!Object.prototype.hasOwnProperty.call(source, key)) continue;

            if (RESET_KEYS.indexOf(key) !== -1) {
                if (source[key] === null) {
                    target[key] = {};
                } else if (isObject(source[key])) {
                    if (!target[key] || typeof target[key] !== 'object') {
                        target[key] = {};
                    }
                    // Мягкое объединение ответов/голосов: не затираем ключи других игроков
                    for (var subKey in source[key]) {
                        if (Object.prototype.hasOwnProperty.call(source[key], subKey)) {
                            target[key][subKey] = source[key][subKey];
                        }
                    }
                } else {
                    target[key] = source[key];
                }
            } else if (source[key] === null) {
                target[key] = null;
            } else if (Array.isArray(source[key])) {
                target[key] = source[key].slice();
            } else if (isObject(source[key])) {
                if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
                    target[key] = {};
                }
                mergeDeep(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }

    function mergeState(partialState) {
        if (!partialState || typeof partialState !== 'object') return;
        mergeDeep(localState, partialState);
    }

    // Полный снимок БД из Firebase: пустые объекты {} в Firebase RTDB удаляются и возвращаются как null
    function syncFromRemote(remoteData) {
        if (!remoteData || typeof remoteData !== 'object') return;

        var remoteQIndex = remoteData.currentQuestionIndex !== undefined ? remoteData.currentQuestionIndex : localState.currentQuestionIndex;
        var remotePhase = remoteData.phase || localState.phase;
        var isNewQuestionOrPhase = (remoteQIndex !== localState.currentQuestionIndex) || (remotePhase !== localState.phase);

        mergeDeep(localState, remoteData);

        RESET_KEYS.forEach(function(key) {
            if (!(key in remoteData) || remoteData[key] === null) {
                localState[key] = {};
            } else if (isNewQuestionOrPhase && (!remoteData[key] || Object.keys(remoteData[key]).length === 0)) {
                localState[key] = {};
            }
        });
    }

    function initBroadcastChannel(roomCode) {
        if (window.BroadcastChannel) {
            if (bc) {
                try { bc.close(); } catch (e) {}
            }
            bc = new BroadcastChannel('tv_game_sync_' + roomCode);
            bc.onmessage = function(event) {
                var incoming = typeof event.data === 'string' ? safeParse(event.data) : event.data;
                if (incoming) {
                    mergeState(incoming);
                    triggerCallback();
                }
            };
        }
    }

    function getFirebaseUrl(roomCode, subPath) {
        subPath = subPath || '';
        var safeRoom = encodeURIComponent(roomCode);
        var pathPart = subPath ? ('/' + subPath) : '';
        return databaseUrl + '/rooms/' + safeRoom + pathPart + '.json';
    }

    function fetchStateFromFirebase(roomCode) {
        if (!databaseUrl) return;
        fetch(getFirebaseUrl(roomCode))
            .then(function(res) {
                return res.json();
            })
            .then(function(data) {
                if (data && typeof data === 'object') {
                    syncFromRemote(data);
                    triggerCallback();
                }
            })
            .catch(function(err) {
                // Игнорируем сетевые сбои отдельных тактов поллинга
            });
    }

    function pushStateToFirebase(roomCode, stateToPush) {
        if (!databaseUrl) return Promise.resolve();

        var firebasePayload = Object.assign({}, stateToPush);
        var resetPromises = [];

        // Если хост очищает playerAnswers или categoryVotes, заменяем на null и шлем точечный PUT
        RESET_KEYS.forEach(function(key) {
            if (key in firebasePayload && isObject(firebasePayload[key]) && Object.keys(firebasePayload[key]).length === 0) {
                firebasePayload[key] = null;
                resetPromises.push(
                    fetch(getFirebaseUrl(roomCode, key), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: 'null'
                    }).catch(function() {})
                );
            }
        });

        activePushCount++;
        var mainPush = fetch(getFirebaseUrl(roomCode), {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(firebasePayload)
        })
        .then(function(res) {
            activePushCount = Math.max(0, activePushCount - 1);
            return res;
        }, function(err) {
            console.error("GameSync Firebase Push Error:", err);
            activePushCount = Math.max(0, activePushCount - 1);
        });

        return Promise.all(resetPromises.concat([mainPush]));
    }

    function initFirebase(roomCode, dbUrl) {
        if (firebaseInterval) {
            clearInterval(firebaseInterval);
            firebaseInterval = null;
        }

        databaseUrl = sanitizeDbUrl(dbUrl);
        if (!databaseUrl) {
            console.warn("GameSync: Firebase DB URL invalid or omitted. Using local BroadcastChannel.");
            return;
        }

        fetchStateFromFirebase(roomCode);
        firebaseInterval = setInterval(function() {
            fetchStateFromFirebase(roomCode);
        }, 1000);
    }

    return {
        init: function(arg1, arg2, arg3, arg4) {
            var roomCode = '';
            var dbUrl = '';
            var callback = null;

            if (typeof arg1 === 'string' && (arg1 === 'host' || arg1 === 'player')) {
                currentRole = arg1;
                roomCode = arg2;
                dbUrl = arg3;
                callback = arg4;
            } else {
                currentRole = 'host';
                roomCode = arg1;
                dbUrl = arg2;
                callback = arg3;
            }

            currentRoomCode = roomCode;
            if (typeof callback === 'function') {
                stateChangeCallback = callback;
            }

            initBroadcastChannel(roomCode);
            initFirebase(roomCode, dbUrl);

            triggerCallback();
        },

        onStateChange: function(callback) {
            if (typeof callback === 'function') {
                stateChangeCallback = callback;
                if (localState) {
                    callback(JSON.parse(JSON.stringify(localState)));
                }
            }
        },

        updateState: function(partialState) {
            if (!partialState || typeof partialState !== 'object') return Promise.resolve();

            mergeState(partialState);

            if (bc) {
                try {
                    bc.postMessage(partialState);
                } catch (e) {}
            }

            triggerCallback();

            if (currentRoomCode && databaseUrl) {
                return pushStateToFirebase(currentRoomCode, partialState);
            }
            return Promise.resolve();
        },

        // Атомарная отправка голоса за категорию: не затирает голоса других игроков
        patchVote: function(roomCode, playerId, categoryId) {
            var targetRoom = roomCode || currentRoomCode;
            if (!playerId) return Promise.resolve();

            if (!localState.categoryVotes) {
                localState.categoryVotes = {};
            }
            localState.categoryVotes[playerId] = categoryId;

            var updateObj = { categoryVotes: {} };
            updateObj.categoryVotes[playerId] = categoryId;

            if (bc) {
                try { bc.postMessage(updateObj); } catch (e) {}
            }

            triggerCallback();

            if (targetRoom && databaseUrl) {
                activePushCount++;
                var payload = {};
                payload[playerId] = categoryId;
                return fetch(getFirebaseUrl(targetRoom, 'categoryVotes'), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(function(res) {
                    activePushCount = Math.max(0, activePushCount - 1);
                    return res;
                }).catch(function(err) {
                    activePushCount = Math.max(0, activePushCount - 1);
                    console.error("GameSync patchVote Error:", err);
                });
            }
            return Promise.resolve();
        },

        // Атомарная отправка ответа на вопрос: не затирает ответы других игроков
        patchAnswer: function(roomCode, playerId, answerIndex) {
            var targetRoom = roomCode || currentRoomCode;
            if (!playerId) return Promise.resolve();

            if (!localState.playerAnswers) {
                localState.playerAnswers = {};
            }
            localState.playerAnswers[playerId] = answerIndex;

            var updateObj = { playerAnswers: {} };
            updateObj.playerAnswers[playerId] = answerIndex;

            if (bc) {
                try { bc.postMessage(updateObj); } catch (e) {}
            }

            triggerCallback();

            if (targetRoom && databaseUrl) {
                activePushCount++;
                var payload = {};
                payload[playerId] = answerIndex;
                return fetch(getFirebaseUrl(targetRoom, 'playerAnswers'), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(function(res) {
                    activePushCount = Math.max(0, activePushCount - 1);
                    return res;
                }).catch(function(err) {
                    activePushCount = Math.max(0, activePushCount - 1);
                    console.error("GameSync patchAnswer Error:", err);
                });
            }
            return Promise.resolve();
        },

        // Атомарное обновление профиля игрока в списке players
        patchPlayer: function(roomCode, playerId, playerData) {
            var targetRoom = roomCode || currentRoomCode;
            if (!playerId) return Promise.resolve();

            if (!localState.players) {
                localState.players = {};
            }
            localState.players[playerId] = playerData;

            var updateObj = { players: {} };
            updateObj.players[playerId] = playerData;

            if (bc) {
                try { bc.postMessage(updateObj); } catch (e) {}
            }

            triggerCallback();

            if (targetRoom && databaseUrl) {
                activePushCount++;
                var payload = {};
                payload[playerId] = playerData;
                return fetch(getFirebaseUrl(targetRoom, 'players'), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(function(res) {
                    activePushCount = Math.max(0, activePushCount - 1);
                    return res;
                }).catch(function(err) {
                    activePushCount = Math.max(0, activePushCount - 1);
                    console.error("GameSync patchPlayer Error:", err);
                });
            }
            return Promise.resolve();
        },

        getPlayerId: function() {
            var playerId = safeGetStorage('tv_game_player_id') || safeGetStorage('playerId');
            if (!playerId) {
                playerId = 'player_' + Math.random().toString(36).substring(2, 9);
                safeSetStorage('tv_game_player_id', playerId);
                safeSetStorage('playerId', playerId);
            }
            return playerId;
        },

        _getState: function() {
            return JSON.parse(JSON.stringify(localState));
        }
    };
})();

// Захват квадратного селфи с фронтальной камеры: вырезает квадрат по центру, сжимает до 120x120 JPEG 0.65
window.captureSelfie = function(videoElement, customSize, customQuality) {
    return new Promise(function(resolve) {
        if (!videoElement) {
            resolve(null);
            return;
        }

        var videoWidth = videoElement.videoWidth || 0;
        var videoHeight = videoElement.videoHeight || 0;

        if (videoWidth === 0 || videoHeight === 0) {
            resolve(null);
            return;
        }

        try {
            var canvas = document.createElement('canvas');
            var targetSize = (customSize !== undefined && customSize !== null) ? customSize : 120;
            var quality = (customQuality !== undefined && customQuality !== null) ? customQuality : 0.65;

            canvas.width = targetSize;
            canvas.height = targetSize;
            var ctx = canvas.getContext('2d');

            ctx.imageSmoothingEnabled = true;
            if ('imageSmoothingQuality' in ctx) {
                ctx.imageSmoothingQuality = 'high';
            }

            var minDim = Math.min(videoWidth, videoHeight);
            var startX = (videoWidth - minDim) / 2;
            var startY = (videoHeight - minDim) / 2;

            ctx.drawImage(
                videoElement,
                startX, startY, minDim, minDim,
                0, 0, targetSize, targetSize
            );

            resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
            console.error("captureSelfie error:", e);
            resolve(null);
        }
    });
};