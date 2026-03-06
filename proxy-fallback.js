// URLs alternativas de proxy públicos (caso o nosso falhe)
const PUBLIC_PROXIES = [
    'https://r.jina.ai/http://',  // Extrai conteúdo
    'https://r.jina.ai/http://',  // Repetir se necessário
];

// Se o proxy próprio falhar, tenta alternativas
function getAlternativeProxy(url) {
    // Por enquanto, retorna o nosso mesmo
    // Mas se quisermos, podemos adicionar fallbacks
    return `http://5.189.139.117/proxy?url=${encodeURIComponent(url)}&t=${Date.now()}`;
}