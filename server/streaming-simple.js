#!/usr/bin/env node
/**
 * Servidor de Streaming - Browser Real no Servidor
 * 
 * Funcionamento:
 * 1. Usuário clica em um link no Hub
 * 2. Redireciona para: http://servidor:3001/stream?url=SITE
 * 3. Abre Chrome real no servidor
 * 4. Mostra tela do site para o usuário
 */

const puppeteer = require('puppeteer');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

class StreamingServer {
    constructor() {
        this.browser = null;
        this.pages = new Map();
        this.init();
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
                '--window-size=1280,720'
            ]
        });
        
        console.log('✅ Chrome iniciado no servidor');
        
        // Cria servidor HTTP
        const server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });
        
        server.listen(PORT, () => {
            console.log(`📡 Streaming disponível em:`);
            console.log(`   http://localhost:${PORT}/stream?url=https://instagram.com`);
            console.log(`   http://SEU-IP:${PORT}/stream?url=https://facebook.com`);
        });
    }

    async handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        const query = parsedUrl.query;

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (pathname === '/stream' && query.url) {
            await this.handleStream(query.url, res);
        } else if (pathname === '/screenshot' && query.url) {
            await this.handleScreenshot(query.url, res);
        } else {
            // Página inicial com lista de streams
            this.handleHome(res);
        }
    }

    async handleStream(targetUrl, res) {
        try {
            console.log(`🎬 Novo stream: ${targetUrl}`);
            
            // Cria nova página
            const page = await this.browser.newPage();
            await page.setViewport({ width: 1280, height: 720 });
            
            // Navega para URL
            await page.goto(targetUrl, { 
                waitUntil: 'networkidle2',
                timeout: 60000 
            });
            
            // Gera ID único
            const streamId = Date.now().toString();
            this.pages.set(streamId, { page, url: targetUrl });
            
            // Retorna página HTML que mostra o stream
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(this.getStreamHTML(streamId, targetUrl));
            
        } catch (error) {
            console.error('Erro:', error);
            res.writeHead(500);
            res.end(`Erro: ${error.message}`);
        }
    }

    async handleScreenshot(targetUrl, res) {
        try {
            const page = await this.browser.newPage();
            await page.setViewport({ width: 1280, height: 720 });
            await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Aguarda um pouco para carregar
            await page.waitForTimeout(3000);
            
            // Captura screenshot
            const screenshot = await page.screenshot({ 
                type: 'jpeg',
                quality: 80,
                encoding: 'base64'
            });
            
            await page.close();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                image: `data:image/jpeg;base64,${screenshot}`,
                url: targetUrl 
            }));
            
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    handleHome(res) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Streaming Server</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        background: #0d1117; 
                        color: #fff;
                        padding: 40px;
                    }
                    h1 { color: #f78166; }
                    .stream { 
                        background: #161b22; 
                        padding: 20px; 
                        margin: 10px 0;
                        border-radius: 8px;
                    }
                </style>
            </head>
            <body>
                <h1>🎬 Servidor de Streaming</h1>
                <p>Chrome rodando no servidor.</p>
                <div class="stream">
                    <a href="/stream?url=https://instagram.com" style="color: #f78166;">
                        📷 Instagram
                    </a>
                </div>
                <div class="stream">
                    <a href="/stream?url=https://facebook.com" style="color: #f78166;">
                        📘 Facebook
                    </a>
                </div>
            </body>
            </html>
        `);
    }

    getStreamHTML(streamId, targetUrl) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Streaming - ${targetUrl}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        background: #0d1117; 
                        color: #fff;
                        font-family: Arial, sans-serif;
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                    }
                    .toolbar {
                        background: #161b22;
                        padding: 10px 20px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 1px solid #30363d;
                    }
                    .toolbar h1 { 
                        font-size: 16px; 
                        color: #f78166;
                    }
                    .refresh-btn {
                        background: #f78166;
                        color: #0d1117;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 600;
                    }
                    #screen {
                        flex: 1;
                        background: #000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    #screen img {
                        max-width: 100%;
                        max-height: 100%;
                        object-fit: contain;
                    }
                    .loading {
                        text-align: center;
                        color: #8b949e;
                    }
                </style>
            </head>
            <body>
                <div class="toolbar">
                    <h1>🎬 ${targetUrl}</h1>
                    <button class="refresh-btn" onclick="location.reload()">🔄 Atualizar</button>
                </div>
                <div id="screen">
                    <div class="loading">
                        <p>🚀 Carregando Chrome no servidor...</p>
                        <p style="margin-top: 20px; font-size: 12px;">Stream ID: ${streamId}</p>
                    </div>
                </div>
                
                <script>
                    // Atualiza screenshot a cada 2 segundos
                    async function updateScreen() {
                        try {
                            const res = await fetch('/screenshot?url=${encodeURIComponent(targetUrl)}');
                            const data = await res.json();
                            if (data.image) {
                                document.getElementById('screen').innerHTML = 
                                    '\u003cimg src="' + data.image + '" alt="Screen"\u003e';
                            }
                        } catch(e) {
                            console.error('Erro:', e);
                        }
                    }
                    
                    // Primeira atualização
                    setTimeout(updateScreen, 5000);
                    
                    // Atualiza periodicamente
                    setInterval(updateScreen, 5000);
                </script>
            </body>
            </html>
        `;
    }
}

// Inicia
new StreamingServer();

console.log('\n📖 Para usar no Hub de Atalhos:');
console.log('Adicione links assim:');
console.log('http://SEU-IP:3001/stream?url=https://instagram.com');
console.log('http://SEU-IP:3001/stream?url=https://facebook.com');
console.log('');