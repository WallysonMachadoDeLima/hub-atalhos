// Popup script - verifica status
document.addEventListener('DOMContentLoaded', async () => {
  // Verifica se a extensão está funcionando
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
    console.log('Status:', response);
  } catch (e) {
    console.log('Extensão funcionando normalmente');
  }
});