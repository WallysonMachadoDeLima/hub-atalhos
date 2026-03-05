// Background script - remove headers de bloqueio

// Regras para remover X-Frame-Options e CSP
const RULES = [
  {
    id: 1,
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        {
          header: "X-Frame-Options",
          operation: "remove"
        },
        {
          header: "Content-Security-Policy",
          operation: "remove"
        },
        {
          header: "Frame-Options",
          operation: "remove"
        }
      ]
    },
    condition: {
      urlFilter: "*",
      resourceTypes: ["main_frame", "sub_frame"]
    }
  }
];

// Instala regras quando a extensão é instalada/atualizada
chrome.runtime.onInstalled.addListener(async () => {
  console.log('🚀 Extensão Hub de Atalhos instalada!');
  
  // Remove regras antigas e adiciona novas
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingRuleIds = existingRules.map(rule => rule.id);
  
  if (existingRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRuleIds
    });
  }
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: RULES
  });
  
  console.log('✅ Regras aplicadas - iframes liberados!');
});

// Listener para mensagens do popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    sendResponse({ status: 'active', message: 'Extensão ativa - iframes liberados' });
  }
  return true;
});