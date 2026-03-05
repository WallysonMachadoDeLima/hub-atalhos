// Content Script - Injeta em TODAS as páginas para remover proteções
// Executa antes do carregamento da página (document_start)

(function() {
  'use strict';
  
  console.log('🔥 Hub de Atalhos Ultra - Content Script ativo');
  
  // Remove atributos sandbox de TODOS os iframes existentes e futuros
  const removeSandbox = () => {
    document.querySelectorAll('iframe').forEach(iframe => {
      if (iframe.hasAttribute('sandbox')) {
        console.log('🚫 Removendo sandbox de iframe:', iframe.src);
        iframe.removeAttribute('sandbox');
      }
      
      // Adiciona permissões máximas
      iframe.setAttribute('allow', 
        'accelerometer; autoplay; camera; clipboard-write; encrypted-media; fullscreen; ' +
        'geolocation; gyroscope; microphone; midi; payment; picture-in-picture; ' +
        'usb; web-share; xr-spatial-tracking; serial; idle-detection; ' +
        'display-capture; document-domain; gamepad; magnetometer; ' +
        'notifications; push; screen-wake-lock; web-share'
      );
      
      // Permite tudo
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('credentialless', 'false');
    });
  };
  
  // Executa imediatamente
  removeSandbox();
  
  // Observa novos iframes sendo adicionados
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'IFRAME') {
          console.log('🆕 Novo iframe detectado:', node.src);
          node.removeAttribute('sandbox');
          node.setAttribute('allow', 'fullscreen *; autoplay *; encrypted-media *;');
        }
        if (node.querySelectorAll) {
          node.querySelectorAll('iframe').forEach(iframe => {
            iframe.removeAttribute('sandbox');
          });
        }
      });
    });
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  
  // Remove proteções de meta tags
  const removeMetaRestrictions = () => {
    document.querySelectorAll('meta').forEach(meta => {
      const httpEquiv = meta.getAttribute('http-equiv');
      if (httpEquiv) {
        const equiv = httpEquiv.toLowerCase();
        if (equiv === 'content-security-policy' || 
            equiv === 'x-frame-options' ||
            equiv === 'frame-options') {
          console.log('🗑️ Removendo meta tag:', equiv);
          meta.remove();
        }
      }
    });
  };
  
  removeMetaRestrictions();
  
  // Override de funções de bloqueio
  try {
    // Previne window.open de ser bloqueado
    const originalOpen = window.open;
    window.open = function(url, target, features) {
      console.log('🪟 window.open chamado:', url);
      if (window.frameElement) {
        // Se estamos em um iframe, trocar location do iframe pai
        window.frameElement.src = url;
        return window;
      }
      return originalOpen.apply(this, arguments);
    };
    
    // Previne beforeunload
    window.addEventListener('beforeunload', (e) => {
      if (window.frameElement) {
        // Cancela se estiver em iframe
        e.stopImmediatePropagation();
        return undefined;
      }
    }, true);
    
  } catch(e) {
    console.log('Nota: Não foi possível sobrescrever funções:', e);
  }
  
  // Remove event listeners de segurança
  window.addEventListener = function(type, listener, options) {
    if (type === 'beforeunload') {
      console.log('⚠️ beforeunload bloqueado');
      return;
    }
    return EventTarget.prototype.addEventListener.call(this, type, listener, options);
  };
  
  console.log('✅ Content Script aplicado com sucesso');
})();