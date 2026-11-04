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
                Object.assign(output, { [key]: source[key] });
            }
        });
        return output;
    };

    // Очистка и валидация входящих данных
    const sanitize = (data) => {
        if (!data) return {};
        try {
            return typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
            console.error("GameSync: Invalid JSON data received", e);
            return {};
        }
    };

    // Твой дефолтный URL базы данных (Бельгия, europe-west1)
    const DEFAULT_DB_URL = 'https://quiz-c032b-default-rtdb.europe-west1.firebasedatabase.app';

    window.GameSync = {
        role: null,
        roomCode: null,
        dbUrl: DEFAULT_DB_URL,
        isFirebase: false,
        channel: null,
        onStateChangeCallback: null,
        onErrorCallback: null,
        currentState: {},
        pollTimer: null,
        _firebaseErrorLogged: false,

        // Инициализация соединения
        init: function(role, roomCode, dbUrl, onStateChangeCallback) {
            this.role = role;
            // Очистка roomCode: только буквы и цифры, защита от спецсимволов ломающих пути Firebase
            this.roomCode = (roomCode || '').replace(/[^a-zA-Z0-9]/g, '');
            
            // Если dbUrl не передан или пустой, берем из localStorage или используем твой дефолтный URL
            const rawUrl = (dbUrl && dbUrl.trim()) || localStorage.getItem('firebaseDbUrl') || DEFAULT_DB_URL;
            this.dbUrl = rawUrl.trim().replace(/\/+$/, ''); // Очистка завершающего слеша
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

            // ВСЕГДА инициализируем BroadcastChannel как железобетонный Fallback / параллельный канал
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
                console.log(`GameSync: BroadcastChannel initialized for local room [${this.roomCode}]`);
            } catch (e) {
                console.error("GameSync: BroadcastChannel failed", e);
            }

            // Поддержка и американских (firebaseio.com), и европейских (firebasedatabase.app) доменов Firebase
            const isValidDb = this.dbUrl && 
                this.dbUrl.startsWith('https://') && 
                (this.dbUrl.includes('firebaseio.com') || this.dbUrl.includes('firebasedatabase.app'));

            if (isValidDb) {
                this.isFirebase = true;
                console.log(`GameSync: Initialized via Firebase REST API [${this.dbUrl}] for room [${this.roomCode}]`);
                
                // Пробный запрос для проверки доступности БД
                this._pollFirebase().catch(() => {
                    this._triggerError('Ошибка Firebase, используется локальный режим');
                });
                
                this.pollTimer = setInterval(() => this._pollFirebase(), 1200);
            } else {
                this.isFirebase = false;
                if (this.dbUrl || role === 'player') {
                    this._triggerError('Нет подключения к БД. Включен режим локальных вкладок.');
                }
            }
        },

        // Подписка на изменения стейта
        onStateChange: function(callback) {
            this.onStateChangeCallback = callback;
        },

        // Подписка на ошибки
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

        // Обновление состояния (в основном для ТВ)
        updateState: async function(newState) {
            const safeState = sanitize(newState);
            this._notify(safeState);

            if (this.channel) {
                this.channel.postMessage({ type: 'STATE_UPDATE', state: safeState });
            }

            if (this.isFirebase) {
                try {
                    await fetch(`${this.dbUrl}/rooms/${this.roomCode}.json`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(safeState)
                    });
                } catch (e) {
                    this._triggerError('Ошибка Firebase при обновлении, используется локальный режим');
                }
            }
        },

        // Точечное обновление данных игрока
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
                    await fetch(`${this.dbUrl}/rooms/${cleanRoomCode}/players/${playerId}.json`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(safeData)
                    });
                } catch (e) {
                    this._triggerError('Ошибка Firebase при обновлении игрока, используется локальный режим');
                }
            }
        },

        // Добавление игрока в комнату
        joinGame: async function(playerData) {
            return this.patchPlayer(this.roomCode, playerData.id, playerData);
        },

        // Отправка действий от телефона к ТВ
        sendAction: async function(actionType, payload) {
            const playerId = sessionStorage.getItem('playerId') || localStorage.getItem('playerId');
            if (!playerId) return;

            if (this.channel) {
                let localPatch = {};
                if (actionType === 'answer') localPatch = { players: { [playerId]: { currentAnswer: payload.answerIndex } } };
                else if (actionType === 'vote') localPatch = { players: { [playerId]: { currentVote: payload.categoryId } } };
                else if (actionType === 'ready') localPatch = { players: { [playerId]: { isReady: payload.isReady } } };
                
                this.channel.postMessage({ type: 'STATE_UPDATE', state: localPatch });
            }

            if (this.isFirebase) {
                let flatPatch = {};
                if (actionType === 'answer') flatPatch = { [`players/${playerId}/currentAnswer`]: payload.answerIndex };
                else if (actionType === 'vote') flatPatch = { [`players/${playerId}/currentVote`]: payload.categoryId };
                else if (actionType === 'ready') flatPatch = { [`players/${playerId}/isReady`]: payload.isReady };

                try {
                    await fetch(`${this.dbUrl}/rooms/${this.roomCode}.json`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(flatPatch)
                    });
                } catch(e) {
                    this._triggerError('Ошибка Firebase при отправке действия, используется локальный режим');
                }
            }
        },

        // Опрос Firebase
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

        // Уведомление подписчиков
        _notify: function(partialState) {
            this.currentState = mergeDeep(this.currentState, partialState);
            if (typeof this.onStateChangeCallback === 'function') {
                this.onStateChangeCallback(this.currentState);
            }
        }
    };

    // Безопасный захват селфи с фронтальной камеры
    window.captureSelfie = function(existingVideoElement) {
        return new Promise(async (resolve, reject) => {
            let stream = null;
            let video = existingVideoElement;
            let createdLocally = false;

            try {
                if (!video || !video.srcObject) {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                    video = document.createElement('video');
                    video.srcObject = stream;
                    video.setAttribute('playsinline', 'true');
                    video.setAttribute('autoplay', 'true');
                    video.setAttribute('muted', 'true');
                    createdLocally = true;

                    await new Promise((res, rej) => {
                        video.onloadedmetadata = () => { video.play(); setTimeout(res, 500); };
                        video.onerror = rej;
                    });
                } else {
                    await new Promise(res => setTimeout(res, 200));
                }

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const targetSize = 120;
                canvas.width = targetSize;
                canvas.height = targetSize;

                const vWidth = video.videoWidth || 120;
                const vHeight = video.videoHeight || 120;
                const size = Math.min(vWidth, vHeight);
                
                const startX = (vWidth - size) / 2;
                const startY = (vHeight - size) / 2;

                ctx.drawImage(video, startX, startY, size, size, 0, 0, targetSize, targetSize);
                
                if (createdLocally && stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
                
                resolve(canvas.toDataURL('image/jpeg', 0.65));

            } catch (err) {
                console.error("captureSelfie: Permission denied or error", err);
                if (createdLocally && stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
                reject(err);
            }
        });
    };

})();