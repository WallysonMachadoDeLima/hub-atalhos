// Background script - remove TODAS as camadas de proteção contra iframe

// Regras COMPLETAS para remover todas as proteções
const RULES = [
  {
    id: 1,
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        // Remove bloqueios de iframe principais
        { header: "X-Frame-Options", operation: "remove" },
        { header: "Frame-Options", operation: "remove" },
        { header: "Content-Security-Policy", operation: "remove" },
        { header: "Content-Security-Policy-Report-Only", operation: "remove" },
        
        // Remove proteções de referrer
        { header: "Referrer-Policy", operation: "remove" },
        
        // Remove Cross-Origin headers restritivos
        { header: "Cross-Origin-Resource-Policy", operation: "remove" },
        { header: "Cross-Origin-Embedder-Policy", operation: "remove" },
        { header: "Cross-Origin-Opener-Policy", operation: "remove" },
        
        // Remove proteções contra embed
        { header: "X-Content-Type-Options", operation: "remove" },
        
        // Remove cache-control que pode impedir carregamento
        { header: "Cache-Control", operation: "remove" },
        
        // Adiciona header permitindo iframe
        { 
          header: "Access-Control-Allow-Origin", 
          operation: "set", 
          value: "*" 
        }
      ]
    },
    condition: {
      urlFilter: "*",
      resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest"]
    }
  }
];

// Adiciona regra para modificar request headers também
const REQUEST_RULES = [
  {
    id: 2,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        // Remove SameSite de cookies no request
        { 
          header: "Cookie", 
          operation: "remove" 
        },
        // Muda User-Agent para parecer navegação normal
        {
          header: "Sec-Fetch-Dest",
          operation: "set",
          value: "document"
        },
        {
          header: "Sec-Fetch-Mode",
          operation: "set",
          value: "navigate"
        },
        {
          header: "Sec-Fetch-Site",
          operation: "set",
          value: "cross-site"
        }
      ]
    },
    condition: {
      urlFilter: "*",
      resourceTypes: ["sub_frame", "main_frame"]
    }
  }
];

// Todas as regras combinadas
const ALL_RULES = [...RULES, ...REQUEST_RULES];

// Instala regras quando a extensão é instalada/atualizada
chrome.runtime.onInstalled.addListener(async () => {
  console.log('🚀 Extensão Hub de Atalhos - Modo AGRESSIVO ativado!');
  
  try {
    // Remove regras antigas
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map(rule => rule.id);
    
    if (existingRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingRuleIds
      });
      console.log('🗑️ Regras antigas removidas');
    }
    
    // Adiciona novas regras
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: ALL_RULES
    });
    
    console.log('✅ Regras AVANÇADAS aplicadas!');
    console.log('🔓 Removendo: X-Frame-Options, CSP, CORP, COEP, COOP, Referrer-Policy');
  } catch (e) {
    console.error('❌ Erro ao aplicar regras:', e);
  }
});

// Script para injetar nas páginas (remove proteções via JavaScript)
const INJECTED_SCRIPT = `
(function() {
  'use strict';
  
  console.log('🔓 Hub de Atalhos - Injetando bypass avançado');
  
  // Remove atributos sandbox de iframes
  document.querySelectorAll('iframe').forEach(iframe => {
    iframe.removeAttribute('sandbox');
    iframe.setAttribute('allow', 'accelerometer; autoplay; camera; clipboard-write; encrypted-media; fullscreen; geolocation; gyroscope; microphone; midi; payment; picture-in-picture; usb; web-share');
  });
  
  // Sobrescreve window.open para permitir
  const originalOpen = window.open;
  window.open = function(...args) {
    console.log('🪟 window.open interceptado:', args);
    return originalOpen.apply(this, args);
  };
  
  // Remove listeners de beforeunload que podem bloquear
  window.onbeforeunload = null;
  
  // Permite pointer lock
  document.addEventListener('click', function(e) {
    if (e.target.tagName === 'IFRAME') {
      try {
        e.target.requestPointerLock();
      } catch(e) {}
    }
  }, true);
  
  console.log('✅ Bypass aplicado na página');
})();
`;

// Injeta script em todas as páginas
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Injeta em iframes também
    chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: () => {
        // Script injetado na página
        try {
          // Remove sandbox
          if (window.frameElement) {
            window.frameElement.removeAttribute('sandbox');
          }
          
          // Override de proteções
          Object.defineProperty(document, 'domain', {
            get: () => location.hostname,
            set: (v) => {}
          });
        } catch(e) {}
      }
    }).catch(() => {});
  }
});

// Listener para mensagens do popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    sendResponse({ 
      status: 'active', 
      mode: 'AGRESSIVO',
      message: 'Extensão em modo agressivo - máxima compatibilidade' 
    });
  }
  return true;
});

console.log('🔥 Extensão carregada - Modo AGRESSIVO ativo');