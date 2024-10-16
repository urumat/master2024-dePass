 
 
 // Función para obtener y parsear el valor de localStorage
 function getLocalStorageItem(key) {
  const item = localStorage.getItem(key);
  return item && item !== 'null' ? item : null;
}

// Función para inyectar el ícono y el chevron en el campo de nombre de usuario
const injectIcon = (inputElement) => {
  console.log("Injecting icon and chevron...");

  // Verificar si el botón ya existe
  if (!inputElement || inputElement.buttonCreated) return;

  // Crear un div contenedor para el ícono y el chevron
  const iconContainer = document.createElement('div');
  iconContainer.classList.add('icon-container'); // Agrega clase al contenedor

  // Crear el ícono de la aplicación
  const icon = document.createElement('div');
  icon.classList.add('app-icon'); // Clase para el ícono de la app

  // Crear el chevron
  const chevron = document.createElement('div');
  chevron.classList.add('chevron-icon'); // Clase para el ícono del chevron

  // Insertar el ícono y el chevron dentro del input
  //inputElement.style.paddingRight = '40px'; // Ajustar el padding del input para no tapar los íconos
  inputElement.parentElement.style.position = 'relative'; // Asegurar que el contenedor del input permita los íconos
  inputElement.parentElement.appendChild(icon);
  icon.appendChild(chevron);

  // Agregar evento para desplegar el selector de credenciales al hacer clic en el chevron
  icon.addEventListener('click', (event) => {
    if(chevron.classList.contains('open')) {
      chevron.classList.remove('open');
      return;
    }

    // Obtener las credenciales almacenadas para la URL actual
    const creds = getLocalStorageItem('credentials');
    const savedCredentials = JSON.parse(creds);

    if(savedCredentials == null){
      console.log('El almacenamiento no se ha inicializado.');
      
    }

    chrome.storage.local.get(['credentials'], (result) => {
      if (!result || !result.credentials) {
        
        // Enviar mensaje al background.js para abrir el popup
        chrome.runtime.sendMessage({ type: 'OPEN_POPUP' }, (response) => {
          console.log('Respuesta del background:', response);
        });
        return;
      }
    });

    event.stopPropagation();
    toggleChevron(chevron);
    showCredentialDropdown(inputElement, chevron);
  });

  // Cerrar el dropdown al hacer clic fuera
  document.addEventListener("click", () => {
    chevron.classList.remove('open');
  });

  // Marcar el input como procesado para evitar múltiples botones
  inputElement.buttonCreated = true;
};


// Función para girar el chevron y desplegar/ocultar el dropdown
const toggleChevron = (chevron) => {
  chevron.classList.toggle('open'); // Cambia la clase 'open' para girar el chevron
};

// Función para desplegar el selector de credenciales
const showCredentialDropdown = (inputElement, chevron) => {
  // Crear el dropdown para mostrar las credenciales guardadas
  const dropdown = document.createElement('ul');
  dropdown.style.position = 'absolute';
  dropdown.style.top = `${inputElement.getBoundingClientRect().bottom}px`;
  dropdown.style.left = `${inputElement.getBoundingClientRect().left}px`;
  dropdown.style.width = `${inputElement.offsetWidth}px`;
  dropdown.style.backgroundColor = 'white';
  dropdown.style.border = '1px solid #ccc';
  dropdown.style.listStyleType = 'none';
  dropdown.style.padding = '10px';
  dropdown.style.zIndex = '9999';

  // Obtener las credenciales almacenadas para la URL actual
  const creds = getLocalStorageItem('credentials');
  const savedCredentials = JSON.parse(creds);


  if (savedCredentials.length === 0) {
    const noCreds = document.createElement('li');
    noCreds.innerText = 'No credentials found';
    dropdown.appendChild(noCreds);
    chevron.classList.remove('open');
    return; // No continuar si no hay credenciales
  } else {
    savedCredentials.forEach((cred) => {
      const listItem = document.createElement('li');
      listItem.innerText = cred.username;
      listItem.style.cursor = 'pointer';
      listItem.addEventListener('click', () => {
        fillCredentials(cred);
        dropdown.remove(); // Ocultar el dropdown después de seleccionar una credencial
        chevron.classList.remove('open');
      });
      dropdown.appendChild(listItem);
    });
  }

  // Agregar el dropdown al body
  document.body.appendChild(dropdown);

  setTimeout(() => {
    // Función para cerrar el dropdown al hacer clic en el documento
    const closeDropdown = (event) => {
      if (!dropdown.contains(event.target) && event.target !== inputElement) {
        dropdown.remove();
        chevron.classList.remove('open');
        document.removeEventListener('click', closeDropdown);
      }
    };

    // Escuchar clics en el documento para cerrar el dropdown
    document.addEventListener('click', closeDropdown);
  }, 200);
};


// Función para rellenar las credenciales en los campos de usuario y contraseña
const fillCredentials = (cred) => {
  const usernameInput = document.querySelector('input[type="text"][name="username"], input[type="text"][id="username"]');
  const emailInput = document.querySelector('input[type="text"][name="email"], input[type="text"][id="email"]');
  const passwordInput = document.querySelector('input[type="password"]');

  if (usernameInput) {
    usernameInput.value = cred.username;
  }

  if (emailInput) {
    emailInput.value = cred.username;
  }

  if (passwordInput) {
    passwordInput.value = cred.password;
  }
};


// Función que escucha el evento click globalmente
function handleClick(event) {
  if(event.target.tagName !== 'INPUT')
    return;

  // Escuchar el DOM para inyectar el ícono dinámicamente
  const usernameInput = document.querySelector('input[type="text"][name="username"], input[type="text"][id="username"]');
  const emailInput = document.querySelector('input[type="text"][name="email"], input[type="text"][id="email"]');
  const passwordInput = document.querySelector('input[type="password"]');

  if (passwordInput) {
    if (usernameInput) {
      injectIcon(usernameInput);
    }

    if (emailInput) {
      injectIcon(emailInput);
    }
    
    injectIcon(passwordInput);

    injectCustomCSS();
  }
}

document.addEventListener('click', handleClick);


// Función para inyectar el CSS con las rutas correctas de los iconos
function injectCustomCSS() {
  const style = document.createElement("style");

  // Definir el contenido del CSS, agregando las rutas correctas a los iconos
  style.textContent = `
    .app-icon {
      background-image: url(${chrome.runtime.getURL('images/icons/depass-stateful-container-right.svg')});
    }

    .chevron-icon {
      background-image: url(${chrome.runtime.getURL('images/icons/chevron.svg')});
    }

    .app-icon:hover {
      background-image: url(${chrome.runtime.getURL('images/icons/depass-stateful-container-right-hover.svg')});
    }
  `;
  document.head.appendChild(style); // Inyectar el CSS con rutas absolutas
}


// Escuchar mensajes para guardar las credenciales en localStorage
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SEND_CREDENTIALS') {
    // Guardar las credenciales en localStorage
    localStorage.setItem('credentials', JSON.stringify(request.credentials));
    console.log('Credenciales almacenadas en localStorage:', request.credentials);

    sendResponse({ success: true });
  }
});

// Función para recuperar credenciales desde localStorage
function getStoredCredentials() {
  const credentials = localStorage.getItem('credentials');
  return credentials ? JSON.parse(credentials) : [];
}
