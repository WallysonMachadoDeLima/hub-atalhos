/**
 * Cliente de Streaming para o Hub de Atalhos
 * Conecta ao servidor Puppeteer e exibe sites bloqueados
 */

class StreamingClient {
  constructor(containerId, url) {
    this.container = document.getElementById(containerId);
    this.url = url;
    this.ws = null;
    this.canvas = null;
    this.ctx = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    this.init();
  }

  init() {
    // Cria canvas para exibir o stream
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 720;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.ctx = this.canvas.getContext('2d');
    
    // Limpa container e adiciona canvas
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);
    
    // Overlay de loading
    this.showLoading();
    
    // Conecta ao servidor
    this.connect();
    
    // Setup controles de interação
    this.setupInteraction();
  }

  showLoading() {
    const loading = document.createElement('div');
    loading.className = 'streaming-loading';
    loading.innerHTML = `
      <i class="fas fa-spinner fa-spin"></i>
      <span>Conectando ao servidor de streaming... (Instale o servidor primeiro)</span>
    `;
    this.container.appendChild(loading);
    this.loadingEl = loading;
  }

  hideLoading() {
    if (this.loadingEl) {
      this.loadingEl.remove();
      this.loadingEl = null;
    }
  }

  connect() {
    const wsUrl = `ws://localhost:3000/stream?url=${encodeURIComponent(this.url)}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ Conectado ao servidor de streaming');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.hideLoading();
      };
      
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'frame') {
          this.renderFrame(msg.data);
        } else if (msg.error) {
          console.error('Erro do servidor:', msg.error);
          this.showError(msg.error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('❌ Desconectado do servidor');
        this.isConnected = false;
        this.attemptReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('Erro WebSocket:', error);
        this.showError('Servidor de streaming não disponível');
      };
      
    } catch (e) {
      console.error('Erro ao conectar:', e);
      this.showError('Não foi possível conectar ao servidor');
    }
  }

  renderFrame(base64Image) {
    const img = new Image();
    img.onload = () => {
      // Ajusta canvas ao tamanho da imagem
      if (this.canvas.width !== img.width || this.canvas.height !== img.height) {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
      }
      this.ctx.drawImage(img, 0, 0);
    };
    img.src = base64Image;
  }

  setupInteraction() {
    // Mouse
    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isConnected) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      
      this.send({ type: 'mousemove', x, y });
    });
    
    this.canvas.addEventListener('click', (e) => {
      if (!this.isConnected) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      
      this.send({ type: 'click', x, y });
    });
    
    // Scroll
    this.canvas.addEventListener('wheel', (e) => {
      if (!this.isConnected) return;
      e.preventDefault();
      this.send({ type: 'scroll', deltaY: e.deltaY });
    });
    
    // Teclado
    document.addEventListener('keydown', (e) => {
      if (!this.isConnected) return;
      // Só envia se o canvas estiver em foco
      if (document.activeElement === this.canvas) {
        this.send({ type: 'keydown', key: e.key });
      }
    });
    
    // Foco no canvas quando clicado
    this.canvas.addEventListener('click', () => {
      this.canvas.focus();
    });
    this.canvas.setAttribute('tabindex', '0');
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.showError('Não foi possível reconectar ao servidor');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`🔄 Tentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => this.connect(), 2000);
  }

  showError(message) {
    this.container.innerHTML = `
      <div class="streaming-error">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Erro de Conexão</h3>
        <p>${message}</p>
        <div class="error-actions">
          <a href="${this.url}" target="_blank" class="btn-primary">
            <i class="fas fa-external-link-alt"></i> Abrir em Nova Aba
          </a>
          <button onclick="location.reload()" class="btn-secondary">
            <i class="fas fa-redo"></i> Tentar Novamente
          </button>
        </div>
        <hr>
        <p class="hint">
          💡 Para usar o streaming, instale e inicie o servidor:
          <code>cd server && npm install && node streaming-server.js</code>
        </p>
      </div>
    `;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Exporta para uso global
window.StreamingClient = StreamingClient;