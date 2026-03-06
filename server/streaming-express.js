#!/usr/bin/env node
/**
 * Servidor Express para Streaming de Browser
 * Versão simplificada e estável
 */

const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = 3001;

let browser = null;

async function initBrowser() {
    if (!browser) {
        console.log('🚀 Iniciando Chrome...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1280,720'
            ]
        });
        console.log('✅ Chrome iniciado!');
    }
    return browser;
}

// Rota principal
app.get('/', (req, res) => {
    res.send(`
        <h1>🎬 Servidor de Streaming</h1>
        <p>Status: ✅ Online</p>
        <p>Use: /stream?url=https://site.com</p>
    `);
});

// Rota de streaming
app.get('/stream', async (req, res) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).send('URL não fornecida. Use: /stream?url=https://site.com');
    }
    
    console.log(`🎬 Acessando: ${targetUrl}`);
    
    try {
        const browser = await initBrowser();
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });
        
        // Aguarda carregar
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Captura screenshot
        const screenshot = await page.screenshot({
            type: 'jpeg',
            quality: 80,
            encoding: 'base64'
        });
        
        await page.close();
        
        // Retorna página HTML com a imagem
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Streaming - ${targetUrl}</title>
                <style>
                    body { margin: 0; background: #0d1117; color: #fff; font-family: Arial; }
                    .toolbar { background: #161b22; padding: 15px; display: flex; justify-content: space-between; }
                    .toolbar h1 { font-size: 16px; color: #f78166; margin: 0; }
                    .refresh-btn { background: #f78166; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
                    #screen { text-align: center; padding: 20px; }
                    #screen img { max-width: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
                </style>
            </head>
            <body>
                <div class="toolbar">
                    <h1>🎬 ${targetUrl}</h1>
                    <button class="refresh-btn" onclick="location.reload()">🔄 Atualizar</button>
                </div>
                <div id="screen">
                    <img src="data:image/jpeg;base64,${screenshot}" alt="Screenshot">
                    <p style="color: #666; margin-top: 20px;">⚠️ Esta é uma captura de tela estática. Recarregue para atualizar.</p>
                </div>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).send(`Erro ao acessar ${targetUrl}: ${error.message}`);
    }
});

// Inicia servidor
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Servidor rodando em http://0.0.0.0:${PORT}`);
    console.log(`🔗 Acesse: http://5.189.139.117:${PORT}`);
    await initBrowser();
});

// Tratamento de erros
process.on('SIGINT', async () => {
    console.log('\n🛑 Desligando...');
    if (browser) await browser.close();
    process.exit(0);
});