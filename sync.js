// filename: sync.js
(function() {
    // Утилита проверки на объект
    const isObject = (item) => (item && typeof item === 'object' && !Array.isArray(item));

    // Глубокое слияние состояний
    const mergeDeep = (target, source) => {
        if (!isObject(target) || !isObject(source)) return source;
        const output = Object.assign({}, target);
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = mergeDeep(target[key], source[key]);
                }
            } else {
                output[key] = source[key];
            }
        });
        return output;
    };

    // Плоское преобразование объекта для безопасного PATCH-запроса в Firebase
    const flattenObject = (obj, prefix = '') => {
        return Object.keys(obj).reduce((acc, k) => {
            const pre = prefix.length ? prefix + '/' : '';
            if (isObject(obj[k]) && Object.keys(obj[k]).length > 0) {
                Object.assign(acc, flattenObject(obj[k], pre + k));
            } else {
                acc[pre + k] = obj[k];
            }
            return acc;
        }, {});
    };

    const sanitize = (data) => {
        if (!data) return {};
        try {
            return typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
            console.error("GameSync: Invalid JSON data received", e);
            return {};
        }
    };

    // Глобальная функция захвата селфи в высоком качестве с оптимизацией веса
    window.captureSelfie = function(videoElement) {
        if (!videoElement) return null;
        
        const canvas = document.createElement('canvas');
        const targetSize = 320; // Высокая четкость при оптимальном весе
        canvas.width = targetSize;
        canvas.height = targetSize;
        
        const ctx = canvas.getContext('2d');
        const vWidth = videoElement.videoWidth || 320;
        const vHeight = videoElement.videoHeight || 320;
        const minSide = Math.min(vWidth, vHeight);
        
        const sx = (vWidth - minSide) / 2;
        const sy = (vHeight - minSide) / 2;

        ctx.drawImage(videoElement, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);
        
        let dataUrl = canvas.toDataURL('image/webp', 0.8);
        if (!dataUrl || dataUrl.indexOf('data:image/webp') !== 0) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        }
        return dataUrl;
    };

    const DEFAULT_DB_URL = 'https://quiz-c032b-default-rtdb.europe-west1.firebasedatabase.app';

    window.GameSync = {
        roomCode: null,
        dbUrl: DEFAULT_DB_URL,
        isFirebase: false,
        channel: null,
        onStateChangeCallback: null,
        onErrorCallback: null,
        currentState: {},
        pollTimer: null,
        _firebaseErrorLogged: false,

        init: function(roomCode, dbUrl, onStateChangeCallback) {
            if (arguments[0] === 'host' || arguments[0] === 'player') {
                roomCode = arguments[1];
                dbUrl = arguments[2];
                onStateChangeCallback = arguments[3];
            }

            this.roomCode = (roomCode || '').replace(/[^a-zA-Z0-9]/g, '');
            
            const rawUrl = (dbUrl && typeof dbUrl === 'string' && dbUrl.trim()) || localStorage.getItem('firebaseDbUrl') || DEFAULT_DB_URL;
            this.dbUrl = rawUrl.trim().replace(/\/+$/, '');
            try {
                localStorage.setItem('firebaseDbUrl', this.dbUrl);
            } catch (e) {}

            this.currentState = {};
            this._firebaseErrorLogged = false;

            if (typeof onStateChangeCallback === 'function') {
                this.onStateChangeCallback = onStateChangeCallback;
            }

            if (this.pollTimer) clearInterval(this.pollTimer);
            if (this.channel) this.channel.close();

            try {
                this.channel = new BroadcastChannel(`game_room_${this.roomCode}`);
                this.channel.onmessage = (event) => {
                    const data = sanitize(event.data);
                    if (data.type === 'STATE_UPDATE') {
                        this._notify(data.state);
                    } else if (data.type === 'PLAYER_PATCH') {
                        const patch = { players: { [data.playerId]: data.playerData } };
                        this._notify(patch);
                    }
                };
            } catch (e) {
                console.error("GameSync: BroadcastChannel failed", e);
            }

            const isValidDb = this.dbUrl && 
                this.dbUrl.startsWith('https://') && 
                (this.dbUrl.includes('firebaseio.com') || this.dbUrl.includes('firebasedatabase.app'));

            if (isValidDb) {
                this.isFirebase = true;
                this._pollFirebase().catch(() => {
                    this._triggerError('Ошибка Firebase, используется локальный режим');
                });
                this.pollTimer = setInterval(() => this._pollFirebase(), 1200);
            } else {
                this.isFirebase = false;
                this._triggerError('Нет подключения к БД. Включен режим локальных вкладок.');
            }
        },

        onStateChange: function(callback) {
            this.onStateChangeCallback = callback;
        },

        onError: function(callback) {
            this.onErrorCallback = callback;
        },

        _triggerError: function(message) {
            if (!this._firebaseErrorLogged) {
                console.warn(`GameSync Warning: ${message}`);
                if (typeof this.onErrorCallback === 'function') {
                    this.onErrorCallback(message);
                }
                this._firebaseErrorLogged = true;
            }
        },

        updateState: async function(newState) {
            const safeState = sanitize(newState);
            this._notify(safeState);

            if (this.channel) {
                this.channel.postMessage({ type: 'STATE_UPDATE', state: safeState });
            }

            if (this.isFirebase) {
                try {
                    const flatState = flattenObject(safeState);
                    await fetch(`${this.dbUrl}/rooms/${this.roomCode}.json`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(flatState)
                    });
                } catch (e) {
                    this._triggerError('Ошибка Firebase при обновлении, используется локальный режим');
                }
            }
        },

        patchPlayer: async function(roomCode, playerId, playerData) {
            const safeData = sanitize(playerData);
            const cleanRoomCode = (roomCode || this.roomCode || '').replace(/[^a-zA-Z0-9]/g, '');
            
            if (!this.currentState.players) this.currentState.players = {};
            const localPatch = { players: { [playerId]: safeData } };
            this._notify(localPatch);

            if (this.channel) {
                this.channel.postMessage({ type: 'PLAYER_PATCH', playerId, playerData: safeData });
            }

            if (this.isFirebase) {
                try {
                    const flatPatch = flattenObject(safeData, `players/${playerId}`);
                    await fetch(`${this.dbUrl}/rooms/${cleanRoomCode}.json`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(flatPatch)
                    });
                } catch (e) {
                    this._triggerError('Ошибка Firebase при обновлении игрока, используется локальный режим');
                }
            }
        },

        joinGame: function(playerData) {
            if (!playerData || !playerData.id) return;
            this.patchPlayer(this.roomCode, playerData.id, playerData);
        },

        sendAction: function(actionType, payload) {
            const playerId = localStorage.getItem('party_quiz_player_id');
            if (!playerId) return;

            if (actionType === 'vote') {
                this.patchPlayer(this.roomCode, playerId, { currentVote: payload.categoryId });
            } else if (actionType === 'answer') {
                this.patchPlayer(this.roomCode, playerId, { currentAnswer: payload.answerIndex });
            }
        },

        initCamera: async function(videoElement) {
            if (!videoElement) return;
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'user',
                        width: { ideal: 640 },
                        height: { ideal: 640 }
                    } 
                });
                videoElement.srcObject = stream;
                videoElement.setAttribute('playsinline', 'true');
                videoElement.setAttribute('autoplay', 'true');
                videoElement.setAttribute('muted', 'true');
                await new Promise((resolve, reject) => {
                    videoElement.onloadedmetadata = () => {
                        videoElement.play().then(resolve).catch(reject);
                    };
                    videoElement.onerror = reject;
                });
            } catch (err) {
                console.error("GameSync: Camera init failed", err);
                throw err;
            }
        },

        takePhoto: function(videoElement, canvasElement) {
            if (!videoElement) return null;
            if (canvasElement) {
                const targetSize = 320;
                canvasElement.width = targetSize;
                canvasElement.height = targetSize;
                const ctx = canvasElement.getContext('2d');
                const vWidth = videoElement.videoWidth || 320;
                const vHeight = videoElement.videoHeight || 320;
                const size = Math.min(vWidth, vHeight);
                const startX = (vWidth - size) / 2;
                const startY = (vHeight - size) / 2;
                ctx.drawImage(videoElement, startX, startY, size, size, 0, 0, targetSize, targetSize);
                
                let dataUrl = canvasElement.toDataURL('image/webp', 0.8);
                if (!dataUrl || dataUrl.indexOf('data:image/webp') !== 0) {
                    dataUrl = canvasElement.toDataURL('image/jpeg', 0.8);
                }
                return dataUrl;
            }
            return window.captureSelfie(videoElement);
        },

        stopCamera: function(videoElement) {
            if (videoElement && videoElement.srcObject) {
                videoElement.srcObject.getTracks().forEach(track => track.stop());
                videoElement.srcObject = null;
            }
        },

        _pollFirebase: async function() {
            if (!this.isFirebase) return;
            try {
                const response = await fetch(`${this.dbUrl}/rooms/${this.roomCode}.json`);
                if (response.ok) {
                    const data = await response.json();
                    if (data) {
                        this._notify(sanitize(data));
                    }
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            } catch (e) {
                this._triggerError('Ошибка опроса Firebase, используется локальный режим');
                throw e;
            }
        },

        _notify: function(partialState) {
            this.currentState = mergeDeep(this.currentState, partialState);
            if (typeof this.onStateChangeCallback === 'function') {
                this.onStateChangeCallback(this.currentState);
            }
        }
    };
})();