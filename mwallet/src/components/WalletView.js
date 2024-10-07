import React, { useEffect, useState } from "react";
import { Divider, Tooltip, List, Avatar, Spin, Tabs, Input, Button, Select, Form} from "antd";
import { LogoutOutlined, PlusOutlined, SettingOutlined, TeamOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import logo from "../noImg.png";
import { CHAINS_CONFIG } from "../chains";
import { ethers } from "ethers";
import DePass_abi from '..//contracts/DePass_abi.json';
import { v4 as uuidv4 } from 'uuid'; // Para generar IDs aleatorios
import NFTs from './NFTs';
import Tokens from './Tokens';
import Transfer from './Transfer';
const { Option } = Select; // Usa Option para el selector

const contractAddressSepolia = '0x104B17bA85F06080B039bD3BEFc1BaC0d3cC19dD';

function WalletView({
  wallet,
  setWallet,
  seedPhrase,
  setSeedPhrase,
  selectedChain,
}) {
  const navigate = useNavigate();
  const [vaults, setVaults] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [tokens, setTokens] = useState(null);
  const [nfts, setNfts] = useState(null);
  const [balance, setBalance] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedVault, setSelectedVault] = useState("all");
  const [contract, setContract] = useState(null);
  const [isAddingCredential, setIsAddingCredential] = useState(false);
  const [isAddingVault, setIsAddingVault] = useState(false);
  const [vaultSettings, setVaultSettings] = useState(false);
  const [searchPrompt, setSearchPrompt] = useState("");
  const [newCredential, setNewCredential] = useState({
    username: "",
    password: "",
    url: "",
  });
  const [newVault, setNewVault] = useState({
    name: "",
  });
  const [shareAddress, setShareAddress] = useState('');

  // Use ABI to create an interface
  const DePassInterface = new ethers.Interface(DePass_abi);

  // Mock encryption/decryption functions
  const encrypt = (data) => JSON.stringify(data);
  const decrypt = (data) => data;



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
    inputElement.style.paddingRight = '40px'; // Ajustar el padding del input para no tapar los íconos
    inputElement.parentElement.style.position = 'relative'; // Asegurar que el contenedor del input permita los íconos
    inputElement.parentElement.appendChild(icon);
    icon.appendChild(chevron);

    // Agregar evento para desplegar el selector de credenciales al hacer clic en el chevron
    icon.addEventListener('click', (event) => {
      if(chevron.classList.contains('open')) {
        chevron.classList.remove('open');
        return;
      }

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
    const passwordInput = document.querySelector('input[type="password"]');

    if (usernameInput) {
      usernameInput.value = cred.username;
    }

    if (passwordInput) {
      passwordInput.value = cred.password;
    }
};

  // Nueva función para simular la funcionalidad de content.js
  const handleAutofillDetection = () => {
    console.log("Detecting password field...");
    
    // Escuchar el DOM para inyectar el ícono dinámicamente
    const usernameInput = document.querySelector('input[type="text"][name="username"], input[type="text"][id="username"]');
    const passwordInput = document.querySelector('input[type="password"]');

    if (passwordInput) {
      if (usernameInput) {
        injectIcon(usernameInput);
      }
      
      injectIcon(passwordInput);
    }


    const observer = new MutationObserver(() => {
      const usernameInput = document.querySelector('input[type="text"][name="username"], input[type="text"][id="username"]');
      if (usernameInput && !usernameInput.parentElement.querySelector('img')) {
        injectIcon(usernameInput);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  useEffect(() => {
    handleAutofillDetection();
  }, []);

  useEffect(() => {
    if(vaults) {
      const allCredentials = extractCredentials(vaults);
      const sortedCredentials = sortCredentialsByUrl(allCredentials);

      //const stringCredentials = sortedCredentials.map((cred) => JSON.stringify(cred));
      localStorage.setItem('credentials', JSON.stringify(sortedCredentials));
    }
  }, vaults);


  const handleAddCredential = () => {
    setIsAddingCredential(true);
  };

  const handleAddVault = () => {
    setIsAddingCredential(false);
    setIsAddingVault(true);
  };

  const handleVaultSettings = () => {
    setVaultSettings(true);
  };

  const handleSaveCredential = async () => {
    setFetching(true);

    const credentialId = ethers.keccak256(ethers.toUtf8Bytes(uuidv4()));
    const encryptedData = encrypt(newCredential); // Cifra el JSON completo
    const tx = await contract.addCredential(selectedVault.id, credentialId, encryptedData);
    await tx.wait();
    
    setIsAddingCredential(false);
    setNewCredential({ username: "", password: "", url: "" });
    //setSelectedVault("all");
    await fetchVaults();

    setFetching(false);
  };


  const handleSaveVault = async () => {
    setFetching(true);

    const vaultId = ethers.keccak256(ethers.toUtf8Bytes(uuidv4()));
    const symmetricKey = "symmetrickey"; // Clave simétrica ficticia
    const tx = await contract.createVault(vaultId, newVault.name, symmetricKey);
    await tx.wait();
    
    setIsAddingVault(false);
    setNewVault({ name: "" });
    setSelectedVault("all");
    await fetchVaults();

    setFetching(false);
  };

  const handleCancelForm = () => {
    setIsAddingVault(false);
    setIsAddingCredential(false);
    setVaultSettings(false);
    setNewVault({ name: "" });
    setNewCredential({ username: "", password: "", url: "" });
    setSelectedVault("all");
  };

  const handleSelectVault = (value) => {
    if (value == "add-vault") {
      setSelectedVault(null);
      handleAddVault(); // Muestra el formulario para agregar un nuevo vault
    } else if (value == "all") {
      setSelectedVault("all");
    } else {
      // Busca el vault correspondiente al ID seleccionado y setéalo como el vault seleccionado
      const selectedVault = vaults.find((vault) => vault.id == value);
      setSelectedVault(selectedVault);
    }
  };


  // Handler to share the vault with an address
  const handleShareVault = async () => {
    setFetching(true);
    if (!shareAddress) {
      //message.error('Please enter an address to share the vault.');
      return;
    }

    try {
      // Aca se debe encriptar la clave simetrica con la clave publica del usuario,
      // Que entiendo es el address
      const tx = await contract.shareVault(selectedVault.id, shareAddress, "symmetrickey");
      await tx.wait();

      //message.success(`Vault shared with ${shareAddress}`);
      setShareAddress(''); // Clear input after sharing

      fetchVaults();
    } catch (error) {
      //message.error('Failed to share vault. Please try again.');
    }
    setFetching(false);
  };

  // Handler to unshare the vault
  const handleUnshareVault = async (address) => {
    setFetching(true);
    try {
      
      const tx = await contract.unshareVault(selectedVault.id, address);
      await tx.wait();

      fetchVaults();
      //message.success(`Vault unshared with ${address}`);
    } catch (error) {
      //message.error('Failed to unshare vault. Please try again.');
    }
    setFetching(false);
  };

  // Handler to unshare the vault
  const handleDeleteVault = async () => {
    setFetching(true);
    try {
      
      const tx = await contract.deleteVault(selectedVault.id);
      await tx.wait();
      handleCancelForm();
      fetchVaults();
      //message.success(`Vault unshared with ${address}`);
    } catch (error) {
      //message.error('Failed to unshare vault. Please try again.');
    }
    setFetching(false);
  };

  const orderVaults = (vaults) => {
    // Ordenar vaults primero por shared y luego alfabéticamente por name
    return vaults.sort((a, b) => {
      // Ordenar por `shared`: false primero, true después
      if (a.sharedWithMe !== b.sharedWithMe) {
        return a.sharedWithMe - b.sharedWithMe ? 1 : -1; // `false` va antes de `true`
      }
      // Ordenar por `name` alfabéticamente
      return (a.name).localeCompare(b.name);
    });
  };


  const filterVaults = (vaults, selectedVault) => {  
    // Filtrar los vaults en base al seleccionado
    return vaults.filter(vault => 
      selectedVault === "all" ? true : vault.id === selectedVault.id
    );
  };

  const extractCredentials = (vaults) => 
    vaults.flatMap(vault => vault.credentials);

  const filterCredentials = (credentials, searchPrompt) => {  
    // Filtrar los vaults en base al seleccionado
    return credentials.filter(cred =>
      cred.url.includes(searchPrompt)
    );
  };
  
  const sortCredentialsByUrl = (credentials) => 
    credentials.sort((a, b) => (a.url || '').localeCompare(b.url || ''));
  
  const getAllCredentials = () => {
    const filteredVaults = filterVaults(vaults, selectedVault);
    const allCredentials = extractCredentials(filteredVaults);
    const filteredCredentials = filterCredentials(allCredentials, searchPrompt);
    const sortedCredentials = sortCredentialsByUrl(filteredCredentials);
    return sortedCredentials;
  };

  const renderForms = () => {
    if (isAddingCredential) {
      return (
        <Form layout="vertical" autoComplete="off">
          <Select
            defaultValue={(selectedVault == "all" 
              ? (vaults && vaults.length > 0 ? vaults[0].id : "null")
              : selectedVault.id)}
            style={{ width: "100%" }}
            onChange={handleSelectVault}
          >
            {vaults && vaults.length > 0 ? (
              vaults.map((vault) => (
                <Option key={vault.id} value={vault.id}>
                  {vault.name}
                  {vault.shared && (
                    <Button icon={<TeamOutlined />} type="secondary" style={{ padding: "0" }} />
                  )}
                </Option>
              ))
            ) : (
              <Option key="null" value="null" disabled>No vaults available</Option>
            )}
            <Option key="add-vault" value="add-vault">
              + Add New Vault
            </Option>
          </Select>
          <Form.Item label="Username">
            <Input value={newCredential.username} 
              onChange={(e) => setNewCredential({ ...newCredential, username: e.target.value })} />
          </Form.Item>
          <Form.Item label="Password">
            <Input.Password autoComplete="new-password" value={newCredential.password} 
              onChange={(e) => setNewCredential({ ...newCredential, password: e.target.value })} />
          </Form.Item>
          <Form.Item label="URL">
            <Input value={newCredential.url} 
              onChange={(e) => setNewCredential({ ...newCredential, url: e.target.value })} />
          </Form.Item>
          <Button type="primary" onClick={handleSaveCredential} style={{ marginRight: "10px" }}>Save</Button>
          <Button onClick={handleCancelForm} style={{ marginBottom: '20px' }}>Cancel</Button>
        </Form>
      );
    } else if (isAddingVault) {
      return (
        <Form layout="vertical">
          <Form.Item label="Vault Name">
            <Input value={newVault.name} onChange={(e) => setNewVault({ ...newVault, name: e.target.value })} />
          </Form.Item>
          <Button type="primary" onClick={handleSaveVault} style={{ marginRight: "10px" }}>Save</Button>
          <Button onClick={handleCancelForm}>Cancel</Button>
        </Form>
      );
    } else if (vaultSettings) {
      return (
        <Form layout="vertical">
          <Form.Item label="Vault Name">
            <Input
              value={newVault.name}
              onChange={(e) => setNewVault({ ...newVault, name: e.target.value })}
            />
          </Form.Item>

          <Form.Item label="Share with Address">
            <Input
              value={shareAddress}
              onChange={(e) => setShareAddress(e.target.value)}
              placeholder="Enter address to share vault"
            />
            <Button type="primary" onClick={handleShareVault} style={{ marginTop: '10px' }}>
              Share
            </Button>
          </Form.Item>

          <List
            header={<div style={{ color: '#ffffff' }}>Shared with:</div>}
            bordered
            dataSource={selectedVault.sharedWith}
            renderItem={(address) => (
              <List.Item
                actions={[
                  <Button type="link" danger onClick={() => handleUnshareVault(address)}>
                    Unshare
                  </Button>,
                ]}
              >
                {address.slice(0, 4)}...{address.slice(38)}
              </List.Item>
            )}
          />
          <Button type="primary" danger onClick={handleDeleteVault} style={{ margin: '10px' }}>Delete Vault</Button>
          <Button onClick={handleCancelForm} style={{ margin: '10px' }}>Close</Button>
        </Form>
      );
    }
  };

  const items = [
    {
      key: "4",
      label: `Passwords`,
      children: (
        <>
          {!isAddingCredential && !isAddingVault && !vaultSettings && (
            <div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <Select
                  defaultValue={selectedVault?.id? selectedVault.id : "all"}
                  style={{ width: "100%" }}
                  onChange={handleSelectVault}
                >
                  <Option key="all" value="all">All Vaults</Option>
                  {vaults && vaults.length > 0 ? (
                    vaults.map((vault) => (
                      <Option key={vault.id} value={vault.id}>
                        {vault.name}
                        {vault.shared && (
                          <Button icon={<TeamOutlined />} type="secondary" style={{ padding: "0" }} />
                        )}
                      </Option>
                    ))
                  ) : (
                    <Option key="null" value="null" disabled>No vaults available</Option>
                  )}
                  <Option key="add-vault" value="add-vault">
                    + Add New Vault
                  </Option>
                </Select>
                {selectedVault != 'all' && (<Button
                  icon={<SettingOutlined />}
                  type="primary"
                  style={{ marginLeft: "10px" }}
                  onClick={handleVaultSettings}
                />)}
                <Button
                  icon={<PlusOutlined />}
                  type="primary"
                  style={{ marginLeft: "10px" }}
                  onClick={handleAddCredential}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <Input.Search
                  placeholder="Search passwords"
                  onChange={(e) => setSearchPrompt(e.target.value)}
                  style={{ 'marginTop': "10px" }}
                />
              </div>
              <div>
                {vaults && selectedVault ? (
                  <>
                    {getAllCredentials().length === 0 ? (
                      <p>No credentials found</p>
                    ) : (
                      getAllCredentials().map((credential) => (
                        <div key={credential.id}>
                          <p>
                            Username: {credential.username}, 
                            Password: {credential.password}, 
                            URL: {credential.url}
                          </p>
                        </div>
                      ))
                    )}
                  </>
                ) : (
                  <span>No vaults found</span>
                )}
              </div>
            </div>
          )}
          {renderForms()}
        </>
      ),
    },
    {
      key: "3",
      label: `Tokens`,
      children: <Tokens tokens={tokens} logo={logo} />,
    },
    {
      key: "2",
      label: `NFTs`,
      children: <NFTs nfts={nfts} />,
    },
    {
      key: "1",
      label: `Transfer`,
      children: (
        <Transfer
          balance={balance}
          CHAINS_CONFIG={CHAINS_CONFIG}
          selectedChain={selectedChain}
          seedPhrase={seedPhrase}
          processing={processing}
          setProcessing={setProcessing}
          getAccountTokens={getAccountTokens}
        />
      ),
    },
    {
      key: "5",
      label: `Login`,
      children: (
        <Form layout="vertical">
          <input type="hidden" value="prayer" />
          <Form.Item label="Username">
            <Input name="username" placeholder="Enter your username" autoComplete="username" />
          </Form.Item>
          <Form.Item label="Password">
            <Input.Password name="password" placeholder="Enter your password" autoComplete="new-password"/>
          </Form.Item>
          <Button type="primary" style={{ marginRight: "10px" }}>
            Login
          </Button>
        </Form>
      ),
    },
  ];

  

  async function getAccountTokens() {
    setFetching(true);

    const chain = CHAINS_CONFIG[selectedChain];

    const provider = new ethers.JsonRpcProvider(chain.rpcUrl);

    const balance = await provider.getBalance(wallet);

    const balanceInEth = parseFloat(ethers.formatEther(balance));

    setBalance(balanceInEth);

    setFetching(false);
  }

  async function setContractsConfiguration() {
    setFetching(true);

    const chain = CHAINS_CONFIG[selectedChain];

    const provider = new ethers.JsonRpcProvider(chain.rpcUrl);

    const privateKey = ethers.Wallet.fromPhrase(seedPhrase).privateKey;

    const signer = new ethers.Wallet(privateKey, provider);

    let tempContract = new ethers.Contract(contractAddressSepolia, DePass_abi, signer);
    setContract(tempContract);

    setFetching(false);
  }

  const processCredentials = async (vault) => {
    // Procesa las credenciales y maneja los errores devolviendo null en caso de fallo
    const processedCredentials = await Promise.all(
        vault.credentials.map(async (cred) => {
            try {
                const decryptedData = decrypt(cred.encryptedData); // Llama a tu función de desencriptado
                const credential = JSON.parse(decryptedData); // Intenta convertir el string JSON a objeto
                return { id: cred.id, ...credential }; // Devuelve la combinación de credencial original y desencriptada
            } catch (error) {
                //console.error("Error decrypting or parsing JSON:", error);
                return null; // Devuelve null en caso de error
            }
        })
    );

    // Filtra los nulls y devuelve solo las credenciales válidas
    return processedCredentials.filter((cred) => cred != null && cred.id != null);
  };

  const fetchVaults = async () => {
    setFetching(true);

    if (contract) {
      try {
        const retrievedVaults = await contract.getVaults();

        // Procesar cada vault
        const processedVaults = retrievedVaults.length == 0 ? [] : await Promise.all(retrievedVaults.map(async (vault) => {
            // Desencriptar y procesar cada credencial
            const processedCredentials = await processCredentials(vault);

            return { 
              id: vault.id, 
              name: vault.name, 
              sharedWith: Array.from(vault.sharedWith),
              credentials: processedCredentials,
              shared: vault.sharedWith.length > 0 ? true : false,
              sharedWithMe: false
            }; // Actualizar las credenciales del vault
        }));

        const retrievedSharedVaults = await contract.getSharedVaults();

        // Procesar cada vault
        const processedSharedVaults = retrievedSharedVaults.length == 0 ? [] : await Promise.all(retrievedSharedVaults
          .map(async (vault) => {
            // Desencriptar y procesar cada credencial
            const processedCredentials = await processCredentials(vault);

            return { 
              id: vault.id, 
              name: vault.name, 
              sharedWith: Array.from(vault.sharedWith),
              credentials: processedCredentials,
              shared: true,
              sharedWithMe: true
            }; // Actualizar las credenciales del vault
        }));

        const orderedVaults = orderVaults(processedVaults.concat(processedSharedVaults));
        setVaults(orderedVaults);   

        if(selectedVault && selectedVault.id) {
          const matchedVault = orderedVaults.filter(vault => vault.id === selectedVault.id);

          // Si solo necesitas un elemento, puedes tomar el primer resultado del filtro
          if (matchedVault.length > 0) {
            setSelectedVault(matchedVault[0]); // Esto reasigna selectedVault, pero evita hacerlo si es un estado.
          }
        }

      } catch (error) {
          //setErrorMessage(error.message);
      }
    }
      
    setFetching(false);
  };

  function logout() {
    setSeedPhrase(null);
    setWallet(null);
    localStorage.setItem('wallet', null);
    localStorage.setItem('seedPhrase', null);

    setVaults(null);
    setNfts(null);
    setTokens(null);
    setBalance(0);
    navigate("/");
  }


  useEffect(() => {
    if (!wallet) return;
    setVaults(null);
    setNfts(null);
    setTokens(null);
    setBalance(0);
    getAccountTokens();
    setContractsConfiguration();
  }, [wallet, selectedChain]);

  useEffect(() => {
    if (!contract) return;
    fetchVaults()
  }, [contract]);

  return (
    <>
      <div className="content">
        <div className="logoutButton" onClick={logout}>
          <LogoutOutlined />
        </div>
        <div className="walletName">Wallet</div>
        <Tooltip title={wallet}>
          <div className="walletAddress">
            {wallet.slice(0, 4)}...{wallet.slice(38)}
          </div>
        </Tooltip>
        <Divider />
        {fetching ? (
          <Spin />
        ) : (
          <Tabs defaultActiveKey="4" items={items} className="walletView" />
        )}
      </div>
    </>
  );
}

export default WalletView;
