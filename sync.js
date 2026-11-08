// filename: sync.js
// Весь код строго в стандарте ES5 для гарантированной работы на LG Smart TV (webOS) и старых мобильных устройствах
window.GameSync = (function() {
    var stateChangeCallback = null;
    var currentRoomCode = null;
    var databaseUrl = null;
    var currentRole = null;
    var bc = null; // BroadcastChannel для параллельной синхронизации соседних вкладок одного ПК
    var firebaseInterval = null;
    var activePushCount = 0;

    var isFetching = false;
    var lastPushTimestamp = 0;
    var lastTriggeredJson = '';
    var roomCheersCache = {};

    function safeGetStorage(key) {
        try {
            return window.localStorage ? window.localStorage.getItem(key) : null;
        } catch (e) {
            return null;
        }
    }

    function safeSetStorage(key, value) {
        try {
            if (window.localStorage) {
                window.localStorage.setItem(key, value);
            }
        } catch (e) {}
    }

    function safeParse(str) {
        try {
            return JSON.parse(str);
        } catch (e) {
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

    function shallowClone(obj) {
        var clone = {};
        if (obj && typeof obj === 'object') {
            for (var key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    clone[key] = obj[key];
                }
            }
        }
        return clone;
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
        activeQuestion: null,
        timerDuration: 0,
        timerKey: '',
        roundMoves: {},
        winnerId: null
    };

    function triggerCallback() {
        if (!stateChangeCallback) return;
        var currentJson = JSON.stringify(localState);
        // Отсечение холостых ререндеров
        if (currentJson === lastTriggeredJson) {
            return;
        }
        lastTriggeredJson = currentJson;
        stateChangeCallback(JSON.parse(currentJson));
    }

    function isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    var RESET_KEYS = ['playerAnswers', 'categoryVotes', 'roundMoves'];

    function mergeDeep(target, source) {
        if (!isObject(target) || !isObject(source)) return;

        for (var key in source) {
            if (!Object.prototype.hasOwnProperty.call(source, key)) continue;

            if (RESET_KEYS.indexOf(key) !== -1) {
                if (source[key] === null || (isObject(source[key]) && Object.keys(source[key]).length === 0)) {
                    target[key] = {};
                } else if (isObject(source[key])) {
                    if (!target[key] || typeof target[key] !== 'object') {
                        target[key] = {};
                    }
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

    function syncFromRemote(remoteData) {
        if (!remoteData || typeof remoteData !== 'object') return;

        // Защита Хоста: если пуш был недавно, игнорируем старый эхо-ответ сервера
        if (Date.now() - lastPushTimestamp < 1200) {
            return;
        }

        // Хост во время раунда является единственным источником правды для состояния игры
        if (currentRole === 'host' && localState.phase !== 'lobby') {
            if (remoteData.players) {
                mergeDeep(localState.players, remoteData.players);
            }
            if (remoteData.categoryVotes) {
                localState.categoryVotes = remoteData.categoryVotes;
            } else {
                localState.categoryVotes = {};
            }
            if (remoteData.playerAnswers) {
                localState.playerAnswers = remoteData.playerAnswers;
            } else {
                localState.playerAnswers = {};
            }
            return;
        }

        // Для телефона игрока: сохраняем локальную запись своего профиля от случайного затирания
        var myPlayerId = safeGetStorage('tv_game_player_id') || safeGetStorage('playerId');
        var myLocalPlayerBackup = (myPlayerId && localState.players && localState.players[myPlayerId]) ? localState.players[myPlayerId] : null;

        mergeDeep(localState, remoteData);

        if (myPlayerId && myLocalPlayerBackup && (!localState.players || !localState.players[myPlayerId])) {
            if (!localState.players) localState.players = {};
            localState.players[myPlayerId] = myLocalPlayerBackup;
        }

        RESET_KEYS.forEach(function(key) {
            if (!(key in remoteData) || remoteData[key] === null) {
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
                    if (incoming.type === 'cheer_audio') {
                        if (incoming.playerId && incoming.audio) {
                            roomCheersCache[incoming.playerId] = incoming.audio;
                        }
                        return;
                    }
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
        if (!databaseUrl || activePushCount > 0 || isFetching) return;

        isFetching = true;
        var url = getFirebaseUrl(roomCode) + '?t=' + Date.now();

        fetch(url, { method: 'GET', cache: 'no-store' })
            .then(function(res) {
                return res.json();
            })
            .then(function(data) {
                isFetching = false;
                if (data && typeof data === 'object' && activePushCount === 0) {
                    syncFromRemote(data);
                    triggerCallback();
                }
            })
            .catch(function() {
                isFetching = false;
            });
    }

    function pushStateToFirebase(roomCode, stateToPush) {
        if (!databaseUrl) return Promise.resolve();

        lastPushTimestamp = Date.now();
        var firebasePayload = shallowClone(stateToPush);
        var resetPromises = [];

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(firebasePayload)
        })
        .then(function(res) {
            activePushCount = Math.max(0, activePushCount - 1);
            return res;
        }, function(err) {
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
                try { bc.postMessage(partialState); } catch (e) {}
            }

            triggerCallback();

            if (currentRoomCode && databaseUrl) {
                return pushStateToFirebase(currentRoomCode, partialState);
            }
            return Promise.resolve();
        },

        patchVote: function(roomCode, playerId, categoryId) {
            var targetRoom = roomCode || currentRoomCode;
            if (!playerId) return Promise.resolve();

            if (!localState.categoryVotes) localState.categoryVotes = {};
            localState.categoryVotes[playerId] = categoryId;

            var updateObj = { categoryVotes: {} };
            updateObj.categoryVotes[playerId] = categoryId;

            if (bc) {
                try { bc.postMessage(updateObj); } catch (e) {}
            }
            triggerCallback();

            if (targetRoom && databaseUrl) {
                activePushCount++;
                lastPushTimestamp = Date.now();
                var payload = {};
                payload[playerId] = categoryId;
                return fetch(getFirebaseUrl(targetRoom, 'categoryVotes'), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(function(res) {
                    activePushCount = Math.max(0, activePushCount - 1);
                    return res;
                }).catch(function() {
                    activePushCount = Math.max(0, activePushCount - 1);
                });
            }
            return Promise.resolve();
        },

        patchAnswer: function(roomCode, playerId, answerIndex) {
            var targetRoom = roomCode || currentRoomCode;
            if (!playerId) return Promise.resolve();

            if (!localState.playerAnswers) localState.playerAnswers = {};
            localState.playerAnswers[playerId] = answerIndex;

            var updateObj = { playerAnswers: {} };
            updateObj.playerAnswers[playerId] = answerIndex;

            if (bc) {
                try { bc.postMessage(updateObj); } catch (e) {}
            }
            triggerCallback();

            if (targetRoom && databaseUrl) {
                activePushCount++;
                lastPushTimestamp = Date.now();
                var payload = {};
                payload[playerId] = answerIndex;
                return fetch(getFirebaseUrl(targetRoom, 'playerAnswers'), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(function(res) {
                    activePushCount = Math.max(0, activePushCount - 1);
                    return res;
                }).catch(function() {
                    activePushCount = Math.max(0, activePushCount - 1);
                });
            }
            return Promise.resolve();
        },

        // Сохранение игрока без тяжелого Base64 аудио (сохраняется только флаг hasCheer)
        patchPlayer: function(roomCode, playerId, playerData) {
            var targetRoom = roomCode || currentRoomCode;
            if (!playerId) return Promise.resolve();

            var cleanPlayerData = shallowClone(playerData);
            var hadCheer = Boolean(cleanPlayerData.cheerAudio || cleanPlayerData.hasCheer);
            delete cleanPlayerData.cheerAudio;
            cleanPlayerData.hasCheer = hadCheer;

            if (!localState.players) localState.players = {};
            localState.players[playerId] = cleanPlayerData;

            var updateObj = { players: {} };
            updateObj.players[playerId] = cleanPlayerData;

            if (bc) {
                try { bc.postMessage(updateObj); } catch (e) {}
            }
            triggerCallback();

            if (targetRoom && databaseUrl) {
                activePushCount++;
                lastPushTimestamp = Date.now();
                var payload = {};
                payload[playerId] = cleanPlayerData;
                return fetch(getFirebaseUrl(targetRoom, 'players'), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(function(res) {
                    activePushCount = Math.max(0, activePushCount - 1);
                    return res;
                }).catch(function() {
                    activePushCount = Math.max(0, activePushCount - 1);
                });
            }
            return Promise.resolve();
        },

        // Отдельная ветка для аудио клича: /room_audio/{roomCode}/{playerId}.json
        uploadCheerAudio: function(roomCode, playerId, base64Audio) {
            var targetRoom = roomCode || currentRoomCode;
            if (!playerId || !base64Audio) return Promise.resolve();

            roomCheersCache[playerId] = base64Audio;
            if (bc) {
                try {
                    bc.postMessage({ type: 'cheer_audio', playerId: playerId, audio: base64Audio });
                } catch (e) {}
            }

            if (targetRoom && databaseUrl) {
                var audioUrl = databaseUrl + '/room_audio/' + encodeURIComponent(targetRoom) + '/' + encodeURIComponent(playerId) + '.json';
                return fetch(audioUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(base64Audio)
                }).catch(function() {});
            }
            return Promise.resolve();
        },

        // Подгрузка аудио кличей комнаты Хостом один раз перед анимацией ходов
        fetchRoomCheers: function(roomCode, callback) {
            var targetRoom = roomCode || currentRoomCode;
            if (!targetRoom || !databaseUrl) {
                if (typeof callback === 'function') callback(roomCheersCache);
                return;
            }

            var audioUrl = databaseUrl + '/room_audio/' + encodeURIComponent(targetRoom) + '.json?t=' + Date.now();
            fetch(audioUrl, { method: 'GET', cache: 'no-store' })
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    if (data && typeof data === 'object') {
                        for (var pid in data) {
                            if (Object.prototype.hasOwnProperty.call(data, pid) && data[pid]) {
                                roomCheersCache[pid] = data[pid];
                            }
                        }
                    }
                    if (typeof callback === 'function') callback(roomCheersCache);
                })
                .catch(function() {
                    if (typeof callback === 'function') callback(roomCheersCache);
                });
        },

        getCheerAudio: function(playerId) {
            return roomCheersCache[playerId] || null;
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

// Сжатие квадратного селфи для сохранения легкого трафика
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
            var minDim = Math.min(videoWidth, videoHeight);
            var startX = (videoWidth - minDim) / 2;
            var startY = (videoHeight - minDim) / 2;

            ctx.drawImage(videoElement, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);
            resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
            resolve(null);
        }
    });
};