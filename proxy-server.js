/**
 * Proxy Reverso - Hub de Atalhos
 * 
 * Solução: Cria um servidor proxy que carrega sites externos
 * e remove TODAS as proteções antes de servir para você.
 * 
 * Funciona como um "espelho" do site sem bloqueios.
 */

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const app = express();

const PORT = 3456;

// Libera CORS para todas as origens
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['*']
}));

// Página inicial com interface
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Hub Proxy - Acesso a Sites Bloqueados</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          background: #0d1117; 
          color: #e6edf3;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        .container {
          text-align: center;
          padding: 40px;
          background: #161b22;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        h1 { color: #f78166; margin-bottom: 20px; }
        input {
          width: 400px;
          padding: 12px 16px;
          border: 1px solid #30363d;
          border-radius: 8px;
          background: #0d1117;
          color: #fff;
          font-size: 16px;
          margin-bottom: 12px;
        }
        button {
          padding: 12px 24px;
          background: #f78166;
          color: #0d1117;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        button:hover { background: #fa8e73; }
        .hint {
          margin-top: 20px;
          color: #8b949e;
          font-size: 14px;
        }
        .sites {
          margin-top: 30px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .site-btn {
          padding: 8px 16px;
          background: rgba(247,129,102,0.2);
          border: 1px solid #f78166;
          color: #f78166;
          border-radius: 20px;
          cursor: pointer;
          font-size: 13px;
        }
        .site-btn:hover {
          background: #f78166;
          color: #0d1117;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔓 Hub Proxy</h1>
        <p>Digite a URL do site bloqueado:</p>
        <input type="text" id="url" placeholder="https://exemplo.com" />
        <br>
        <button onclick="abrir()">Acessar Site</button>
        
        <div class="sites">
          <button class="site-btn" onclick="ir('https://instagram.com')">Instagram</button>
          <button class="site-btn" onclick="ir('https://facebook.com')">Facebook</button>
          <button class="site-btn" onclick="ir('https://twitter.com')">Twitter</button>
          <button class="site-btn" onclick="ir('https://tiktok.com')">TikTok</button>
        </div>
        
        <p class="hint">
          Este proxy remove bloqueios de iframe e permite acessar sites diretamente.
        </p>
      </div>
      
      <script>
        function abrir() {
          const url = document.getElementById('url').value;
          if (url) ir(url);
        }
        function ir(url) {
          window.location.href = '/proxy?url=' + encodeURIComponent(url);
        }
      </script>
    </body>
    </html>
  `);
});

// Proxy principal
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).send('URL não fornecida');
  }
  
  try {
    console.log(`🔓 Proxy: ${targetUrl}`);
    
    // Faz requisição para o site alvo
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.google.com/'
      },
      timeout: 30000,
      maxRedirects: 10,
      validateStatus: () => true // Aceita qualquer status
    });
    
    // Se for HTML, processa e remove proteções
    const contentType = response.headers['content-type'] || '';
    
    if (contentType.includes('text/html')) {
      let html = response.data;
      
      // Carrega no cheerio para manipulação
      const $ = cheerio.load(html);
      
      // Remove meta tags de proteção
      $('meta[http-equiv="X-Frame-Options"]').remove();
      $('meta[http-equiv="Content-Security-Policy"]').remove();
      $('meta[http-equiv="Frame-Options"]').remove();
      
      // Modifica base href para evitar problemas de links
      const baseUrl = new URL(targetUrl);
      $('head').prepend(`<base href="${baseUrl.origin}/">`);
      
      // Injeta script para remover proteções no lado do cliente
      $('head').prepend(`
        <script>
          // Remove X-Frame-Options e CSP via JavaScript
          if (window.frameElement) {
            window.frameElement.removeAttribute('sandbox');
          }
          
          // Intercepta e modifica headers (técnica avançada)
          if (window.Response) {
            const originalResponse = window.Response;
            window.Response = function(body, init) {
              if (init && init.headers) {
                delete init.headers['X-Frame-Options'];
                delete init.headers['Content-Security-Policy'];
              }
              return originalResponse.apply(this, arguments);
            };
          }
          
          // Remove sandbox de todos os iframes
          document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('iframe').forEach(function(iframe) {
              iframe.removeAttribute('sandbox');
              iframe.setAttribute('allow', 'fullscreen *; autoplay *; encrypted-media *');
            });
          });
        <\/script>
      `);
      
      // Modifica links para passar pelo proxy
      $('a[href]').each(function() {
        const href = $(this).attr('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          try {
            const absoluteUrl = new URL(href, targetUrl).href;
            $(this).attr('href', `/proxy?url=${encodeURIComponent(absoluteUrl)}`);
          } catch(e) {}
        }
      });
      
      // Modifica src de recursos (imagens, scripts, etc)
      $('img[src], script[src], link[href]').each(function() {
        const attr = $(this).is('link') ? 'href' : 'src';
        const val = $(this).attr(attr);
        if (val && !val.startsWith('data:') && !val.startsWith('blob:')) {
          try {
            const absoluteUrl = new URL(val, targetUrl).href;
            $(this).attr(attr, `/resource?url=${encodeURIComponent(absoluteUrl)}`);
          } catch(e) {}
        }
      });
      
      // Define headers de resposta sem proteções
      res.set({
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-src *; frame-ancestors *",
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      });
      
      res.send($.html());
      
    } else {
      // Se não for HTML, repassa o conteúdo original
      res.set({
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'ALLOWALL'
      });
      res.send(response.data);
    }
    
  } catch (error) {
    console.error('Erro no proxy:', error.message);
    res.status(500).send(`
      <h1>Erro ao carregar site</h1>
      <p>Não foi possível acessar: ${targetUrl}</p>
      <p>Erro: ${error.message}</p>
      <a href="/">Voltar</a>
    `);
  }
});

// Proxy para recursos (imagens, CSS, JS)
app.get('/resource', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('URL não fornecida');
  
  try {
    const response = await axios.get(targetUrl, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });
    
    res.set({
      'Content-Type': response.headers['content-type'] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400'
    });
    
    response.data.pipe(res);
    
  } catch (error) {
    res.status(500).send('Erro ao carregar recurso');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Hub Proxy rodando em http://localhost:${PORT}`);
  console.log(`🔗 Acesse: http://localhost:${PORT}`);
  console.log('');
  console.log('Para usar no Hub de Atalhos, adicione este URL:');
  console.log(`   http://SEU_SERVIDOR:${PORT}/proxy?url=`);
});

module.exports = app;