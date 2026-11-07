// filename: sync.js
window.GameSync = (function() {
    var stateChangeCallback = null;
    var currentRoomCode = null;
    var databaseUrl = null;
    var currentRole = null;
    var bc = null; // BroadcastChannel для мгновенного обмена между вкладками одного устройства
    var firebaseInterval = null;
    var isPushing = false;

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

    // Ключи, которые при передаче пустого объекта {} должны очищаться, а не мерджиться
    var RESET_KEYS = ['playerAnswers', 'categoryVotes', 'roundMoves'];

    function mergeDeep(target, source) {
        if (!isObject(target) || !isObject(source)) return;

        for (var key in source) {
            if (!Object.prototype.hasOwnProperty.call(source, key)) continue;

            if (RESET_KEYS.indexOf(key) !== -1) {
                // Если пришел сброс (null, пустой объект или новый список)
                target[key] = source[key] ? Object.assign({}, source[key]) : {};
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
                // Строки (включая color, selfie, cheerAudio), числа, булевы значения
                target[key] = source[key];
            }
        }
    }

    function mergeState(partialState) {
        if (!partialState || typeof partialState !== 'object') return;
        mergeDeep(localState, partialState);
    }

    // Полный снимок БД из Firebase: пустые объекты {} в Firebase удаляются и не приходят в JSON
    function syncFromRemote(remoteData) {
        if (!remoteData || typeof remoteData !== 'object') return;
        
        mergeDeep(localState, remoteData);

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
        if (!databaseUrl || isPushing) return;
        fetch(getFirebaseUrl(roomCode))
            .then(function(res) {
                return res.json();
            })
            .then(function(data) {
                if (data && typeof data === 'object' && !isPushing) {
                    syncFromRemote(data);
                    triggerCallback();
                }
            })
            .catch(function() {});
    }

    function pushStateToFirebase(roomCode, stateToPush) {
        if (!databaseUrl) return Promise.resolve();

        // Подготавливаем payload для Firebase:
        // Если в RESET_KEYS передан пустой объект {}, заменяем его на null,
        // чтобы Firebase гарантированно удалил старые вложенные ключи
        var firebasePayload = Object.assign({}, stateToPush);
        RESET_KEYS.forEach(function(key) {
            if (key in firebasePayload && isObject(firebasePayload[key]) && Object.keys(firebasePayload[key]).length === 0) {
                firebasePayload[key] = null;
            }
        });

        isPushing = true;
        return fetch(getFirebaseUrl(roomCode), {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(firebasePayload)
        })
        .then(function(res) {
            isPushing = false;
            return res;
        }, function(err) {
            console.error("GameSync Firebase Push Error:", err);
            isPushing = false;
        });
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
                bc.postMessage(partialState);
            }

            triggerCallback();

            if (currentRoomCode && databaseUrl) {
                return pushStateToFirebase(currentRoomCode, partialState);
            }
            return Promise.resolve();
        },

        patchPlayer: function(roomCode, playerId, playerData) {
            var playerUpdate = {
                players: {}
            };
            playerUpdate.players[playerId] = playerData;
            return this.updateState(playerUpdate);
        },

        getPlayerId: function() {
            var playerId = safeGetStorage('tv_game_player_id');
            if (!playerId) {
                playerId = 'player_' + Math.random().toString(36).substring(2, 9);
                safeSetStorage('tv_game_player_id', playerId);
            }
            return playerId;
        },

        _getState: function() {
            return JSON.parse(JSON.stringify(localState));
        }
    };
})();

// Захват квадратного селфи высокого качества (256x256, JPEG 0.85) на нативных промисах без async/await
window.captureSelfie = function(videoElement) {
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
            var targetSize = 256;
            canvas.width = targetSize;
            canvas.height = targetSize;
            var ctx = canvas.getContext('2d');

            // Высокое качество интерполяции при отрисовке
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            var minDim = Math.min(videoWidth, videoHeight);
            var startX = (videoWidth - minDim) / 2;
            var startY = (videoHeight - minDim) / 2;

            ctx.drawImage(
                videoElement,
                startX, startY, minDim, minDim,
                0, 0, targetSize, targetSize
            );

            resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch (e) {
            console.error("captureSelfie error:", e);
            resolve(null);
        }
    });
};