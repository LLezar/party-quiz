// filename: sync.js
window.GameSync = (function() {
    let stateChangeCallback = null;
    let currentRoomCode = null;
    let databaseUrl = null;
    let currentRole = null;
    let bc = null; // BroadcastChannel
    let firebaseInterval = null;

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
        const trimmed = url.trim().replace(/\/+$/, '');
        if (!trimmed.startsWith('https://')) return null;
        if (!trimmed.includes('firebaseio.com') && !trimmed.includes('firebasedatabase.app')) return null;
        return trimmed;
    }

    let localState = {
        phase: 'lobby',
        players: {},
        categoryVotes: {},
        playerAnswers: {},
        currentRound: 0,
        currentQuestionIndex: 0,
        timerEndTime: 0
    };

    function triggerCallback() {
        if (stateChangeCallback) {
            stateChangeCallback(JSON.parse(JSON.stringify(localState)));
        }
    }

    function isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    function mergeDeep(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (isObject(target) && isObject(source)) {
            for (const key in source) {
                if (isObject(source[key])) {
                    if (!target[key]) target[key] = {};
                    mergeDeep(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
        return mergeDeep(target, ...sources);
    }

    function mergeState(partialState) {
        if (!partialState || typeof partialState !== 'object') return;
        mergeDeep(localState, partialState);
    }

    function initBroadcastChannel(roomCode) {
        if (window.BroadcastChannel) {
            if (bc) {
                try { bc.close(); } catch (e) {}
            }
            bc = new BroadcastChannel('tv_game_sync_' + roomCode);
            bc.onmessage = (event) => {
                const incoming = typeof event.data === 'string' ? safeParse(event.data) : event.data;
                if (incoming) {
                    mergeState(incoming);
                    triggerCallback();
                }
            };
        }
    }

    function getFirebaseUrl(roomCode, subPath = '') {
        const safeRoom = encodeURIComponent(roomCode);
        const pathPart = subPath ? `/${subPath}` : '';
        return `${databaseUrl}/rooms/${safeRoom}${pathPart}.json`;
    }

    function fetchStateFromFirebase(roomCode) {
        if (!databaseUrl) return;
        fetch(getFirebaseUrl(roomCode))
            .then(res => res.json())
            .then(data => {
                if (data && typeof data === 'object') {
                    mergeState(data);
                    triggerCallback();
                }
            })
            .catch(() => {});
    }

    function pushStateToFirebase(roomCode, stateToPush) {
        if (!databaseUrl) return;
        fetch(getFirebaseUrl(roomCode), {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(stateToPush)
        }).catch(err => console.error("GameSync Firebase Push Error:", err));
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
        firebaseInterval = setInterval(() => {
            fetchStateFromFirebase(roomCode);
        }, 1200);
    }

    return {
        // Поддержка обеих сигнатур вызова:
        // 1) init(role, roomCode, dbUrl, callback)
        // 2) init(roomCode, dbUrl, callback)
        init: function(arg1, arg2, arg3, arg4) {
            let roomCode = '';
            let dbUrl = '';
            let callback = null;

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
            if (!partialState || typeof partialState !== 'object') return;

            mergeState(partialState);

            if (bc) {
                bc.postMessage(partialState);
            }

            if (currentRoomCode && databaseUrl) {
                pushStateToFirebase(currentRoomCode, partialState);
            }

            triggerCallback();
        },

        patchPlayer: function(roomCode, playerId, playerData) {
            const playerUpdate = {
                players: {
                    [playerId]: playerData
                }
            };
            this.updateState(playerUpdate);
        },

        getPlayerId: function() {
            let playerId = localStorage.getItem('tv_game_player_id');
            if (!playerId) {
                playerId = 'player_' + Math.random().toString(36).substring(2, 9);
                localStorage.setItem('tv_game_player_id', playerId);
            }
            return playerId;
        },

        _getState: () => JSON.parse(JSON.stringify(localState))
    };
})();

// Захват квадратного селфи без искажения пропорций
window.captureSelfie = function(videoElement) {
    if (!videoElement) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const targetSize = 120;
    canvas.width = targetSize;
    canvas.height = targetSize;

    const videoWidth = videoElement.videoWidth || 0;
    const videoHeight = videoElement.videoHeight || 0;

    if (videoWidth === 0 || videoHeight === 0) return null;

    const minDim = Math.min(videoWidth, videoHeight);
    const startX = (videoWidth - minDim) / 2;
    const startY = (videoHeight - minDim) / 2;

    ctx.drawImage(
        videoElement,
        startX, startY, minDim, minDim,
        0, 0, targetSize, targetSize
    );

    return canvas.toDataURL('image/jpeg', 0.65);
};