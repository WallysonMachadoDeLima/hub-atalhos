# 🚀 Solução de Streaming - Hub de Atalhos

## Problema: Sites bloqueiam iframe

Muitos sites (Netflix, YouTube, Google, etc.) bloqueiam abertura em iframe por segurança usando:
- `X-Frame-Options: DENY`
- `Content-Security-Policy: frame-ancestors`

## Solução: Servidor de Streaming

Usamos **Puppeteer** (Chrome automatizado) + **WebSocket** para:
1. Abrir o site em um navegador real (servidor)
2. Capturar a tela continuamente (screenshots)
3. Transmitir para o frontend em tempo real
4. Permitir interação (cliques, teclado)

## 📁 Estrutura

```
hub-atalhos/
├── index.html              # App principal
├── styles.css              # Estilos
├── app.js                  # Lógica do app
├── streaming-client.js     # Cliente WebSocket
└── server/
    ├── package.json        # Dependências
    └── streaming-server.js # Servidor Puppeteer
```

## 🛠️ Instalação

### 1. Instalar dependências do servidor

```bash
cd server
npm install
```

Isso instala:
- `puppeteer` - Chrome automatizado
- `ws` - WebSocket server

### 2. Iniciar o servidor

```bash
npm start
# ou
node streaming-server.js
```

O servidor iniciará em:
- HTTP: http://localhost:3000
- WebSocket: ws://localhost:3000

### 3. Usar no app

O app automaticamente tentará:
1. Primeiro: abrir em iframe normal
2. Se bloqueado: tentar conectar ao servidor de streaming
3. Se servidor offline: mostrar botão "Abrir em nova aba"

## 🔧 Como funciona

```
┌─────────────┐     WebSocket      ┌──────────────────┐
│   Browser   │ ◄────────────────► │  Servidor Node   │
│   (Você)    │   Screenshots      │  + Puppeteer     │
└─────────────┘                    │  + Chrome Real   │
      │                            └────────┬─────────┘
      │                                     │
      │ Cliques/Teclado              Navegação Real
      │ (enviado via WS)             (sites bloqueados)
      ▼                                     ▼
   Canvas                              Site Real
   (exibe imagem)                    (Netflix, etc)
```

## ⚡ Requisitos

- Node.js 16+
- 2GB RAM mínimo (para rodar Chrome)
- Servidor com acesso à internet

## 🔒 Segurança

- O servidor só aceita conexões de localhost por padrão
- Para acesso externo, use HTTPS + autenticação
- Sites com DRM (Netflix, Spotify) ainda podem não funcionar por questões legais

## 📝 Notas

- **Performance**: Streaming consome mais banda que iframe, mas resolve bloqueios
- **Delay**: Há um pequeno delay (~100-200ms) devido à captura de tela
- **Interação**: Suporta clique, scroll e teclado

## 🐛 Troubleshooting

### "Servidor de streaming não disponível"
- Verifique se o servidor está rodando: `npm start`
- Verifique se a porta 3000 está liberada

### Site aparece em branco
- Alguns sites detectam Puppeteer e bloqueiam
- Tente usar modo "stealth" (ver documentação Puppeteer)

### Lentidão
- Reduza a qualidade no `streaming-server.js`: `QUALITY: 60`
- Aumente o intervalo: `SCREENSHOT_INTERVAL: 200`

## 🎯 Alternativas

Se o streaming não funcionar bem:

1. **Electron App** - App desktop nativo (melhor performance)
2. **Extensão de Navegador** - Injeta script para permitir iframe
3. **Proxy Reverso** - Modifica headers (pode violar termos de uso)

## 📞 Suporte

Para dúvidas ou problemas, verifique:
- Logs do servidor: mensagens no terminal
- Console do navegador: erros de WebSocket
- Documentação Puppeteer: https://pptr.dev

---

**Criado em:** 2026-03-05
**Versão:** 1.0.0