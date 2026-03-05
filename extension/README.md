# 🔓 Extensão Hub de Atalhos

## O que faz?

Esta extensão remove os bloqueios que impedem sites de abrir em iframes dentro do seu **Hub de Atalhos**.

### Problema que resolve:

Sites como Instagram, Facebook, YouTube, etc. enviam headers HTTP que bloqueiam abertura em iframe:
```
X-Frame-Options: DENY
Content-Security-Policy: frame-ancestors 'none'
```

### Solução:

A extensão intercepta as respostas e **remove esses headers**, permitindo que o site carregue normalmente no seu Hub.

---

## 🛠️ Instalação

### Chrome / Edge / Brave

1. **Abra a página de extensões:**
   - Digite `chrome://extensions` na barra de endereço
   - Ou vá em Menu → Mais ferramentas → Extensões

2. **Ative o Modo Desenvolvedor:**
   - No canto superior direito, ligue "Modo do desenvolvedor"

3. **Carregue a extensão:**
   - Clique em "Carregar sem compactação"
   - Selecione a pasta `extension/`
   - Pronto! A extensão aparecerá na lista

4. **Fixe na barra:**
   - Clique no ícone de quebra-cabeça 🧩
   - Clique no 📌 ao lado de "Hub de Atalhos"

### Firefox

1. Digite `about:debugging` na barra de endereço
2. Clique em "Este Firefox"
3. Clique em "Carregar extensão temporária"
4. Selecione o arquivo `manifest.json` dentro da pasta `extension/`

---

## ✅ Como usar

1. **Instale a extensão** (passos acima)
2. **Acesse seu Hub:** https://wallysonmachadodelima.github.io/hub-atalhos/
3. **Clique em qualquer link** - agora vai funcionar em iframe!
4. A extensão funciona **automaticamente** - não precisa fazer nada

---

## 🔒 Segurança

- ✅ A extensão só funciona no **seu navegador**
- ✅ Não envia dados para lugar nenhum
- ✅ Código aberto - você pode verificar
- ✅ Uso pessoal - não afeta outros usuários

---

## 🐛 Problemas?

### Extensão não aparece:
- Verifique se o "Modo do desenvolvedor" está ativado
- Recarregue a página do Hub (F5)

### Site ainda não abre:
- Alguns sites (Netflix, Spotify) usam **DRM** que não pode ser burlado
- Tente recarregar a página do Hub

### Quero desativar:
- Vá em `chrome://extensions`
- Desative a extensão

---

## 📁 Arquivos

```
extension/
├── manifest.json      # Configuração da extensão
├── background.js      # Lógica principal
├── popup.html         # Interface do popup
├── popup.js           # Script do popup
├── icon16.png         # Ícone pequeno
├── icon48.png         # Ícone médio
└── icon128.png        # Ícone grande
```

---

## 🎯 Sites testados

| Site | Funciona? | Observação |
|------|-----------|------------|
| Instagram | ✅ Sim | Feed funciona |
| Twitter/X | ✅ Sim | Timeline funciona |
| Facebook | ✅ Sim | Páginas funcionam |
| LinkedIn | ✅ Sim | Perfil funciona |
| YouTube | ⚠️ Parcial | Player pode ter limitações |
| Netflix | ❌ Não | DRM impede |
| TikTok | ✅ Sim | Feed funciona |

---

**Versão:** 1.0  
**Criado em:** 2026-03-05  
**Para uso com:** Hub de Atalhos