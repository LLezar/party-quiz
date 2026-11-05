// filename: sync.js
/**
 * GameSync Engine & Media Capture Module
 * Обеспечивает двойную синхронизацию (Firebase REST + BroadcastChannel)
 * и надежный захват селфи с камеры без черных экранов и мерцания.
 */
(function (global) {
  'use strict';

  const DEFAULT_DB_URL = 'https://quiz-c032b-default-rtdb.europe-west1.firebasedatabase.app';

  // --- Вспомогательные утилиты ---
  const sanitizeUrl = (url) => (url ? url.trim().replace(/\/+$/, '') : '');

  const safeJsonParse = (str) => {
    try {
      return typeof str === 'string' ? JSON.parse(str) : str;
    } catch (e) {
      console.warn('[GameSync] JSON parse error:', e);
      return null;
    }
  };

  const isFrameAllBlack = (ctx, width, height) => {
    try {
      const imgData = ctx.getImageData(0, 0, width, height).data;
      for (let i = 0; i < imgData.length; i += 16) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        const a = imgData[i + 3];
        if (a > 0 && r + g + b > 10) {
          return false;
        }
      }
      return true;
    } catch (err) {
      console.warn('[GameSync] Не удалось проверить пиксели канваса:', err);
      return false;
    }
  };

  // --- Сервис синхронизации (GameSync) ---
  const GameSync = {
    roomCode: null,
    dbUrl: DEFAULT_DB_URL,
    broadcastChannel: null,
    onStateChange: null,
    pollingInterval: null,
    lastKnownEtag: null,
    lastKnownStateJson: '',

    init(roomCode, dbUrl, onStateChangeCallback) {
      this.cleanup();
      this.roomCode = String(roomCode || '').toUpperCase().trim();
      const rawUrl = sanitizeUrl(dbUrl) || sanitizeUrl(localStorage.getItem('partyquiz_dburl')) || DEFAULT_DB_URL;
      this.dbUrl = rawUrl;
      this.onStateChange = typeof onStateChangeCallback === 'function' ? onStateChangeCallback : () => {};

      if (!this.roomCode) {
        console.error('[GameSync] Не передан roomCode');
        return;
      }

      // 1. Инициализация локального канала BroadcastChannel (для вкладок одного браузера)
      if (typeof global.BroadcastChannel !== 'undefined') {
        try {
          this.broadcastChannel = new global.BroadcastChannel(`game_room_${this.roomCode}`);
          this.broadcastChannel.onmessage = (event) => {
            const data = safeJsonParse(event.data);
            if (data && typeof data === 'object') {
              this.handleIncomingState(data, 'broadcast');
            }
          };
        } catch (e) {
          console.warn('[GameSync] Ошибка инициализации BroadcastChannel:', e);
        }
      }

      // 2. Инициализация Firebase REST Polling
      if (this.dbUrl && this.dbUrl.startsWith('http')) {
        this.fetchRemoteState();
        this.pollingInterval = setInterval(() => {
          this.fetchRemoteState();
        }, 1200);
      }
    },

    handleIncomingState(state, source = 'remote') {
      const stateStr = JSON.stringify(state);
      if (stateStr === this.lastKnownStateJson) {
        return;
      }
      this.lastKnownStateJson = stateStr;

      if (this.onStateChange) {
        this.onStateChange(state, source);
      }
    },

    async fetchRemoteState() {
      if (!this.dbUrl || !this.roomCode) return;
      const endpoint = `${this.dbUrl}/rooms/${this.roomCode}.json`;

      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          cache: 'no-store'
        });

        if (!response.ok) return;

        const currentEtag = response.headers.get('ETag');
        if (currentEtag && currentEtag === this.lastKnownEtag) {
          return;
        }

        const data = await response.json();
        if (data && typeof data === 'object') {
          this.lastKnownEtag = currentEtag;
          this.handleIncomingState(data, 'firebase');
        }
      } catch (err) {
        console.debug('[GameSync] Polling fetch skipped/failed:', err.message);
      }
    },

    async updateState(newState) {
      if (!newState || typeof newState !== 'object') return;
      const stateStr = JSON.stringify(newState);
      this.lastKnownStateJson = stateStr;

      // Оповещаем локальные вкладки через BroadcastChannel
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage(stateStr);
        } catch (e) {
          console.warn('[GameSync] Ошибка отправки в BroadcastChannel:', e);
        }
      }

      // Отправляем в Firebase Realtime Database (используем PATCH, чтобы не затирать параллельно подключившихся игроков)
      if (this.dbUrl && this.roomCode) {
        const endpoint = `${this.dbUrl}/rooms/${this.roomCode}.json`;
        try {
          await fetch(endpoint, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: stateStr
          });
        } catch (err) {
          console.error('[GameSync] Ошибка сохранения состояния в Firebase:', err);
        }
      }
    },

    async patchPlayer(roomCode, playerId, playerData) {
      const code = String(roomCode || this.roomCode || '').toUpperCase().trim();
      if (!code || !playerId) return;

      // Оповещаем через BroadcastChannel как частичное обновление
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage(JSON.stringify({
            _action: 'patchPlayer',
            playerId,
            playerData
          }));
        } catch (e) {
          console.warn('[GameSync] Broadcast patch error:', e);
        }
      }

      // Сохраняем патч игрока в Firebase REST
      if (this.dbUrl) {
        const endpoint = `${this.dbUrl}/rooms/${code}/players/${playerId}.json`;
        try {
          await fetch(endpoint, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(playerData)
          });
        } catch (err) {
          console.error('[GameSync] Ошибка патча игрока в Firebase:', err);
        }
      }
    },

    cleanup() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.close();
        } catch (e) {}
        this.broadcastChannel = null;
      }
      this.lastKnownEtag = null;
      this.lastKnownStateJson = '';
      this.roomCode = null;
      this.onStateChange = null;
    }
  };

  // --- Захват селфи с камеры (защита от мерцания и черного экрана) ---
  const captureSelfie = async function (videoElement, optionalCanvas) {
    if (!videoElement) {
      throw new Error('Video элемент не передан для селфи.');
    }

    if (videoElement.readyState < 2) {
      await new Promise((resolve) => {
        const onLoaded = () => {
          videoElement.removeEventListener('loadeddata', onLoaded);
          resolve();
        };
        videoElement.addEventListener('loadeddata', onLoaded);
        setTimeout(resolve, 800);
      });
    }

    await new Promise((r) => setTimeout(r, 200));

    const canvas = optionalCanvas || document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 120;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let attempts = 0;
    const maxAttempts = 4;
    let base64Result = '';

    while (attempts < maxAttempts) {
      attempts++;

      const vw = videoElement.videoWidth || 640;
      const vh = videoElement.videoHeight || 480;

      const minSide = Math.min(vw, vh);
      const sx = (vw - minSide) / 2;
      const sy = (vh - minSide) / 2;

      ctx.clearRect(0, 0, 120, 120);

      ctx.save();
      ctx.translate(120, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, sx, sy, minSide, minSide, 0, 0, 120, 120);
      ctx.restore();

      const isBlack = isFrameAllBlack(ctx, 120, 120);
      if (!isBlack || attempts === maxAttempts) {
        base64Result = canvas.toDataURL('image/jpeg', 0.65);
        break;
      }

      await new Promise((r) => setTimeout(r, 150));
    }

    return base64Result;
  };

  global.GameSync = GameSync;
  global.captureSelfie = captureSelfie;

})(typeof window !== 'undefined' ? window : this);
