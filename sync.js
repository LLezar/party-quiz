// filename: sync.js
// Firebase Realtime Database Client (REST API + Server-Sent Events)

window.GameSync = {
  dbUrl: '',
  roomId: '',
  role: 'host', // 'host' или 'player'
  eventSource: null,
  currentState: null,
  subscribers: [],

  init: function (role, roomId, dbUrl) {
    this.role = role;
    this.roomId = roomId;
    
    // Очистка и валидация URL базы данных Firebase
    let cleanUrl = (dbUrl || '').trim();
    if (!cleanUrl) {
      cleanUrl = 'https://quiz-c032b-default-rtdb.europe-west1.firebasedatabase.app';
    }
    cleanUrl = cleanUrl.replace(/\/+$/, '');
    this.dbUrl = cleanUrl;

    console.log(`[Sync] Init role=${role}, room=${roomId}, db=${cleanUrl}`);

    this.connectSSE();
  },

  onStateChange: function (callback) {
    if (typeof callback === 'function') {
      this.subscribers.push(callback);
      if (this.currentState) {
        callback(this.currentState);
      }
    }
  },

  notify: function (newState) {
    this.currentState = newState;
    this.subscribers.forEach((cb) => {
      try {
        cb(newState);
      } catch (err) {
        console.error('[Sync] Notification error:', err);
      }
    });
  },

  connectSSE: function () {
    if (this.eventSource) {
      this.eventSource.close();
    }

    const sseUrl = `${this.dbUrl}/rooms/${this.roomId}.json`;
    console.log('[Sync] Connecting SSE to', sseUrl);

    try {
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.addEventListener('put', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed && parsed.path === '/') {
            this.notify(parsed.data || {});
          } else if (parsed && parsed.path) {
            // Частичный апдейт ключа
            const key = parsed.path.replace(/^\//, '');
            const updated = Object.assign({}, this.currentState || {});
            if (key) {
              const parts = key.split('/');
              let ref = updated;
              for (let i = 0; i < parts.length - 1; i++) {
                if (!ref[parts[i]]) ref[parts[i]] = {};
                ref = ref[parts[i]];
              }
              ref[parts[parts.length - 1]] = parsed.data;
              this.notify(updated);
            }
          }
        } catch (err) {
          console.error('[Sync] SSE Parse Put Error:', err);
        }
      });

      this.eventSource.addEventListener('patch', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed && parsed.data) {
            const updated = Object.assign({}, this.currentState || {}, parsed.data);
            this.notify(updated);
          }
        } catch (err) {
          console.error('[Sync] SSE Parse Patch Error:', err);
        }
      });

      this.eventSource.onerror = (err) => {
        console.warn('[Sync] EventSource error, polling fallback active', err);
      };
    } catch (e) {
      console.error('[Sync] EventSource connection failed:', e);
    }
  },

  updateState: async function (partialState) {
    if (!this.dbUrl || !this.roomId) return;
    const url = `${this.dbUrl}/rooms/${this.roomId}.json`;
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partialState)
      });
      return await res.json();
    } catch (err) {
      console.error('[Sync] updateState error:', err);
    }
  },

  joinGame: async function (playerData) {
    if (!this.dbUrl || !this.roomId || !playerData || !playerData.id) return;
    const url = `${this.dbUrl}/rooms/${this.roomId}/players/${playerData.id}.json`;
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData)
      });
      return await res.json();
    } catch (err) {
      console.error('[Sync] joinGame error:', err);
    }
  },

  patchPlayer: async function (roomId, playerId, playerData) {
    const targetRoom = roomId || this.roomId;
    if (!this.dbUrl || !targetRoom || !playerId) return;
    const url = `${this.dbUrl}/rooms/${targetRoom}/players/${playerId}.json`;
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData)
      });
      return await res.json();
    } catch (err) {
      console.error('[Sync] patchPlayer error:', err);
    }
  },

  takePhoto: async function (videoElement, canvasElement) {
    return new Promise((resolve, reject) => {
      try {
        const width = 120;
        const height = 120;
        canvasElement.width = width;
        canvasElement.height = height;
        const ctx = canvasElement.getContext('2d');
        
        // Зеркалим изображение для фронтальной камеры
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoElement, 0, 0, width, height);

        const base64 = canvasElement.toDataURL('image/jpeg', 0.65);
        resolve(base64);
      } catch (e) {
        reject(e);
      }
    });
  }
};