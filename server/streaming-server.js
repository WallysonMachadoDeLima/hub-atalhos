#!/usr/bin/env node
/**
 * Servidor de Streaming de Sites
 * Resolve bloqueio de iframe usando Puppeteer + WebSocket
 * 
 * Funcionamento:
 * 1. Recebe URL do site via WebSocket
 * 2. Abre no Puppeteer (Chrome real)
 * 3. Captura screenshots em tempo real
 * 4. Envia para o frontend como imagens
 */

const puppeteer = require('puppeteer');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Configurações
const CONFIG = {
  PORT: 3000,
  WS_PORT: 3001,
  SCREENSHOT_INTERVAL: 100, // ms entre screenshots (10fps)
  BROWSER_WIDTH: 1280,
  BROWSER_HEIGHT: 720,
  QUALITY: 80 // qualidade JPEG (0-100)
};

class StreamingServer {
  constructor() {
    this.browser = null;
    this.pages = new Map(); // url -> {page, clients}
    this.wss = null;
    this.httpServer = null;
  }

  async init() {
    console.log('🚀 Iniciando servidor de streaming...');
    
    // Inicia browser
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=${CONFIG.BROWSER_WIDTH},${CONFIG.BROWSER_HEIGHT}'
      ]
    });
    
    console.log('✅ Browser iniciado');
    
    // Cria servidor HTTP para imagens estáticas
    this.httpServer = http.createServer((req, res) => {
      this.handleHttpRequest(req, res);
    });
    
    // Cria WebSocket server
    this.wss = new WebSocket.Server({ server: this.httpServer });
    this.wss.on('connection', (ws, req) => {
      this.handleWebSocket(ws, req);
    });
    
    this.httpServer.listen(CONFIG.PORT, () => {
      console.log(`📡 Servidor rodando:`);
      console.log(`   HTTP: http://localhost:${CONFIG.PORT}`);
      console.log(`   WebSocket: ws://localhost:${CONFIG.PORT}`);
    });
  }

  async handleWebSocket(ws, req) {
    const url = new URL(req.url, `http://localhost:${CONFIG.PORT}`);
    const targetUrl = url.searchParams.get('url');
    
    if (!targetUrl) {
      ws.send(JSON.stringify({ error: 'URL não fornecida' }));
      ws.close();
      return;
    }

    console.log(`🔗 Nova conexão: ${targetUrl}`);
    
    // Cria ou obtém página
    let pageData = this.pages.get(targetUrl);
    if (!pageData) {
      pageData = await this.createPage(targetUrl);
      this.pages.set(targetUrl, pageData);
    }
    
    // Adiciona cliente
    pageData.clients.add(ws);
    
    // Envia frame inicial
    if (pageData.lastFrame) {
      ws.send(pageData.lastFrame);
    }
    
    // Handler de mensagens (para interação)
    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data);
        await this.handleInteraction(pageData.page, msg);
      } catch (e) {
        console.error('Erro ao processar mensagem:', e);
      }
    });
    
    // Cleanup
    ws.on('close', () => {
      pageData.clients.delete(ws);
      console.log(`❌ Cliente desconectado: ${targetUrl}`);
      
      // Se não há mais clientes, fecha página após 30s
      if (pageData.clients.size === 0) {
        setTimeout(() => {
          if (pageData.clients.size === 0) {
            this.closePage(targetUrl);
          }
        }, 30000);
      }
    });
  }

  async createPage(url) {
    console.log(`📄 Criando página: ${url}`);
    
    const page = await this.browser.newPage();
    await page.setViewport({
      width: CONFIG.BROWSER_WIDTH,
      height: CONFIG.BROWSER_HEIGHT
    });
    
    // Intercepta requests para melhor performance
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      // Bloqueia recursos pesados desnecessários
      const resourceType = req.resourceType();
      if (['image', 'media', 'font'].includes(resourceType)) {
        // Permite imagens mas pode otimizar
        req.continue();
      } else {
        req.continue();
      }
    });
    
    // Navega para URL
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    const pageData = {
      page,
      url,
      clients: new Set(),
      lastFrame: null,
      intervalId: null
    };
    
    // Inicia captura contínua
    this.startStreaming(pageData);
    
    return pageData;
  }

  startStreaming(pageData) {
    pageData.intervalId = setInterval(async () => {
      try {
        // Captura screenshot
        const screenshot = await pageData.page.screenshot({
          type: 'jpeg',
          quality: CONFIG.QUALITY,
          encoding: 'base64'
        });
        
        const frameData = `data:image/jpeg;base64,${screenshot}`;
        pageData.lastFrame = frameData;
        
        // Envia para todos os clientes conectados
        const message = JSON.stringify({
          type: 'frame',
          data: frameData,
          timestamp: Date.now()
        });
        
        pageData.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      } catch (e) {
        console.error('Erro ao capturar frame:', e);
      }
    }, CONFIG.SCREENSHOT_INTERVAL);
  }

  async handleInteraction(page, msg) {
    switch (msg.type) {
      case 'click':
        await page.mouse.click(msg.x, msg.y);
        break;
      case 'mousemove':
        await page.mouse.move(msg.x, msg.y);
        break;
      case 'scroll':
        await page.evaluate((y) => window.scrollBy(0, y), msg.deltaY);
        break;
      case 'keydown':
        await page.keyboard.press(msg.key);
        break;
      case 'type':
        await page.keyboard.type(msg.text);
        break;
    }
  }

  async closePage(url) {
    const pageData = this.pages.get(url);
    if (!pageData) return;
    
    console.log(`🗑️  Fechando página: ${url}`);
    
    clearInterval(pageData.intervalId);
    await pageData.page.close();
    this.pages.delete(url);
  }

  handleHttpRequest(req, res) {
    // Serve uma página simples de status
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h1>🚀 Servidor de Streaming de Sites</h1>
      <p>Status: ✅ Online</p>
      <p>Conexões ativas: ${this.pages.size}</p>
      <hr>
      <p>Para usar, conecte via WebSocket:</p>
      <code>ws://localhost:${CONFIG.PORT}/stream?url=https://exemplo.com</code>
    `);
  }

  async shutdown() {
    console.log('🛑 Desligando servidor...');
    
    // Fecha todas as páginas
    for (const [url, pageData] of this.pages) {
      await this.closePage(url);
    }
    
    // Fecha browser
    if (this.browser) {
      await this.browser.close();
    }
    
    // Fecha servidor
    if (this.httpServer) {
      this.httpServer.close();
    }
    
    console.log('✅ Servidor desligado');
    process.exit(0);
  }
}

// Inicia servidor
const server = new StreamingServer();
server.init().catch(console.error);

// Handlers de shutdown
process.on('SIGINT', () => server.shutdown());
process.on('SIGTERM', () => server.shutdown());

// Exporta para uso como módulo
module.exports = StreamingServer;