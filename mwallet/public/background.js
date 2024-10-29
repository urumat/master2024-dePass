
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

  if (changeInfo.status === 'complete' && tab.url) {
    const activeUrl = new URL(tab.url);
    console.log('Cambio pagina:', tab.url);
    // Recuperar las credenciales desde chrome.storage
    chrome.storage.local.get(['credentials'], (result) => {
      if(!result.credentials) {
        // If storage is not initialized we wait for user to click on button to call popup()
        return;
      }

      const allCredentials = result.credentials;
      const filteredCredentials = allCredentials; //allCredentials.filter((cred) => activeUrl.href.includes(cred.site));
      
      if (filteredCredentials.length > 0) {
        console.log('Credenciales encontradas para el sitio:', filteredCredentials);
      } else {
        console.log('No se encontraron credenciales para este sitio');
      }

      // Enviar las credenciales al content.js de la pestaña
      // We always send credentials even if we do not find any
      chrome.tabs.sendMessage(
        tabId, 
        { type: 'SEND_CREDENTIALS', credentials: filteredCredentials },
        (response) => {
          console.log('Respuesta desde content.js:', response);
        }
      );
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'OPEN_POPUP') {
    console.log('Solicitud para abrir el popup recibida.');
    chrome.action.openPopup(); // Abre el popup de la extensión
    sendResponse({ success: true });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'NEW_CREDENTIALS') {
    console.log('Nuevas credenciales recibidas, enviando a las pestañas abiertas.');

    // Recuperar las credenciales desde chrome.storage
    chrome.storage.local.get(['credentials'], (result) => {
      const credentials = result.credentials; // Should be initialized

      // Buscar todas las pestañas abiertas
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.url) {
            const activeUrl = new URL(tab.url);
            // Filtrar credenciales que coinciden con la URL actual
            const filteredCredentials = credentials; //credentials.filter((cred) => activeUrl.href.includes(cred.site));

            // We always send credentials even if we do not find any
            chrome.tabs.sendMessage(
              tab.id, 
              { type: 'SEND_CREDENTIALS', credentials: filteredCredentials },
              (response) => {
                console.log('Respuesta desde content.js:', response);
              }
            );
          }
        });
      });
    });

    sendResponse({ success: true });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'NEW_CREDENTIALS_DETECTED') {
    console.log('Nuevas credenciales detectadas:', request.credentials);

    // Guardar las credenciales temporalmente en chrome.storage
    chrome.storage.local.set({ tempCredentials: request.credentials }, () => {
      console.log('Credenciales de login (sin encriptar) guardadas temporalmente');

      // Abrir el popup de la extensión para que el usuario pueda confirmar el guardado
      chrome.action.openPopup();
    });

    sendResponse({ success: true });
  }
});