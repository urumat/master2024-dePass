import React, { useEffect, useState } from "react";
import { Divider, Tooltip, List, Avatar, Spin, Tabs, Input, Button, Select, Form} from "antd";
import { LogoutOutlined, PlusOutlined, SettingOutlined, TeamOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { CHAINS_CONFIG } from "../chains";
import { ethers } from "ethers";
//import DePass_abi from '..//contracts/DePass_abiFinal10.json';
import DePassPassword_abi from '..//contracts/DePass_abiPassword.json';
import DePassPremium_abi from '..//contracts/DePass_abiPremium.json';
import tokenzep_abi from '..//contracts/tokenzep_abi.json';
import { v4 as uuidv4 } from 'uuid'; // Para generar IDs aleatorios
import Transfer from './Transfer';
import Premium from './Premium';
import { parseUnits } from 'ethers';
const { Option } = Select; // Usa Option para el selector

//const contractAddressSepolia = '0x68235F9e1d04066E3538ad39BB73c0c6CeE36C63';
const contractAddressPremium = '0xc18BadFa641a2E4FB9111D992dBaDD9d22299791';
const contractAddressPassword = '0x286A0e6eCcF4d875BD28fbf8C51044D68Ca0a477';
const tokenAddress = '0xfeF943f305D451B8C680F4e8CcBddC3aD329E461';

function WalletView({
  wallet,
  setWallet,
  seedPhrase,
  setSeedPhrase,
  selectedChain,
}) {
  const navigate = useNavigate();
  const [vaults, setVaults] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [balance, setBalance] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedVault, setSelectedVault] = useState("all");
  //const [contract, setContract] = useState(null);
  const [contractPassword, setContractPassword] = useState(null);
  const [contractPremium, setContractPremium] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [isAddingCredential, setIsAddingCredential] = useState(false);
  const [isAddingVault, setIsAddingVault] = useState(false);
  const [vaultSettings, setVaultSettings] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [searchPrompt, setSearchPrompt] = useState("");
  const [stakeAmountInput, setStakeAmountInput] = useState('');
  const [newCredential, setNewCredential] = useState({
    username: "",
    password: "",
    url: "",
  });
  const [newVault, setNewVault] = useState({
    name: "",
  });
  const [shareAddress, setShareAddress] = useState('');

  // Mock encryption/decryption functions
  const encrypt = (data) => JSON.stringify(data);;
  const decrypt = (data) => data;

  const chain = CHAINS_CONFIG[selectedChain];
  const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
  const privateKey = ethers.Wallet.fromPhrase(seedPhrase).privateKey;
  const signer = new ethers.Wallet(privateKey, provider);

  const buyPremium = async () => {
    if (!tokenContract) return;

    const premiumCost = parseUnits('20', 18); // 20 DPT con 18 decimales

    try {
      //const approvalTx = await tokenContract.approve(contractAddressSepolia, premiumCost);
      const approvalTx = await tokenContract.approve(contractAddressPremium, premiumCost);
      await approvalTx.wait();
      console.log('Aprobación de tokens completada');
      //const buyPremiumTx = await contract.buyPremiumAccess();
      const buyPremiumTx = await contractPremium.buyPremiumAccess();
      await buyPremiumTx.wait();
      console.log('Premium comprado con éxito');
      setIsPremium(true); // Cambiamos el estado a premium
    } catch (error) {
      console.error('Error al comprar premium:', error);
    }
  };

  const checkIfPremiumUser = async () => {
    try {
      //const status = await contract.isPremium(wallet);
      const status = await contractPremium.isPremium(wallet);
      console.log("Premium status desde la blockchain:", status);
      setIsPremium(status);  // Actualizamos el estado con el valor retornado
    } catch (error) {
      console.error("Error al verificar el estado premium", error);
    }
  };

  checkIfPremiumUser ();
  
  const stake = async () => {
    if (!stakeAmountInput || isNaN(stakeAmountInput) || Number(stakeAmountInput) <= 0) {
      alert('Please enter a valid amount of DPT to stake.');
      return;
    }

    if (!tokenContract) {
      alert('DPT token contract not available.');
      return;
    }

    try {
      const amountToStake = ethers.parseUnits(stakeAmountInput, 18);
      //const txApprove = await tokenContract.approve(contractAddressSepolia, amountToStake);
      const txApprove = await tokenContract.approve(contractAddressPremium, amountToStake);
      await txApprove.wait();
      //const txStake = await contract.stakeTokens(amountToStake); // función que interactúa con el contrato para hacer stake
      const txStake = await contractPremium.stakeTokens(amountToStake); 
      await txStake.wait();
      alert(`Successfully staked ${stakeAmountInput} DPT!`);
      //fetchStakingInfo(); // Actualizar la información del stake
    } catch (error) {
      console.error(error);
      alert('Error while staking DPT');
    } finally {
      setStakeAmountInput(''); // Limpiar el input
    }
  };

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

  /*const handleSaveCredential = async () => {
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
  }; */

  const handleSaveCredential = async () => {
    setFetching(true);
  
    try {
      // Llamada para obtener la cantidad de credenciales
      //const credentialCount = await contract.getCredentialCount(selectedVault.id);
      const credentialCount = await contractPassword.getCredentialCount(selectedVault.id);
  
      // Verifica si el usuario ha llegado al límite de credenciales (10 si no es premium)
      if (!isPremium && credentialCount >= 10) {
        alert("Has alcanzado el límite de 10 credenciales. Actualiza a premium para agregar más.");
        setFetching(false);
        return;
      }
  
      // Si no ha llegado al límite, procede a guardar la nueva credencial
      const credentialId = ethers.keccak256(ethers.toUtf8Bytes(uuidv4()));
      const encryptedData = encrypt(newCredential); // Cifra el JSON completo
      //const tx = await contract.addCredential(selectedVault.id, credentialId, encryptedData);
      const tx = await contractPassword.addCredential(selectedVault.id, credentialId, encryptedData);
      await tx.wait();
  
      // Actualiza el estado después de agregar la credencial
      setIsAddingCredential(false);
      setNewCredential({ username: "", password: "", url: "" });
      await fetchVaults();
    } catch (error) {
      console.error("Error al guardar la credencial:", error);
    }
  
    setFetching(false);
  };  

  /*const handleSaveVault = async () => {
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
  }; */

  const handleSaveVault = async () => {
    setFetching(true);
  
    try {
      // Llamar a la función getVaultCount del contrato
      //const vaultCount = await contract.getVaultCount();
      const vaultCount = await contractPassword.getVaultCount();
  
      // Verificar si el usuario no es premium y ya tiene una vault
      if (!isPremium && vaultCount >= 1) {
        alert("Has alcanzado el límite de 1 vault. Actualiza a premium para agregar más.");
        setFetching(false);
        return;
      }
  
      const vaultId = ethers.keccak256(ethers.toUtf8Bytes(uuidv4()));
      const symmetricKey = "symmetrickey"; // Clave simétrica ficticia
      //const tx = await contract.createVault(vaultId, newVault.name, symmetricKey);
      const tx = await contractPassword.createVault(vaultId, newVault.name, symmetricKey);
      await tx.wait();
  
      setIsAddingVault(false);
      setNewVault({ name: "" });
      setSelectedVault("all");
      await fetchVaults();
    } catch (error) {
      console.error("Error al crear la vault:", error);
    }
  
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
      //const tx = await contract.shareVault(selectedVault.id, shareAddress, "symmetrickey");
      const tx = await contractPassword.shareVault(selectedVault.id, shareAddress, "symmetrickey");
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
      
      //const tx = await contract.unshareVault(selectedVault.id, address);
      const tx = await contractPassword.unshareVault(selectedVault.id, address);
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
      
      //const tx = await contract.deleteVault(selectedVault.id);
      const tx = await contractPassword.deleteVault(selectedVault.id);
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

  const extractCredentials = (vaults, selectedVault) => 
    selectedVault === "all" 
      ? vaults.flatMap(vault => vault.credentials)
      : vaults.reduce((acc, vault) => acc.concat(vault.credentials), []);

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
    const allCredentials = extractCredentials(filteredVaults, selectedVault);
    const filteredCredentials = filterCredentials(allCredentials, searchPrompt);
    return sortCredentialsByUrl(filteredCredentials);
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
      key: "1",
      label: `Balances`,
      children: (
        <Transfer
          balance={balance}
          CHAINS_CONFIG={CHAINS_CONFIG}
          selectedChain={selectedChain}
          processing={processing}
          setProcessing={setProcessing}
          getAccountTokens={getAccountTokens}
          tokens={tokens}
          tokenContract={tokenContract}
          wallet={wallet}
          seedPhrase={seedPhrase}
          signer={signer}
        />
      ),
    },
    {
      key: "2",
      label: "Premium",
      children: (
        <Premium
        //variables a pasar
          buyPremium={buyPremium}
          isPremium={isPremium}
          setIsPremium={setIsPremium}
          wallet={wallet}
          //contract={contract}      // cambiar??
          contractPremium={contractPremium}
          checkIfPremiumUser={checkIfPremiumUser}
          //setContract={setContract} // cambiar?
          setContractPremium={setContractPremium}
          tokenContract={tokenContract}
          //contractAddressSepolia={contractAddressSepolia}
          contractAddressPremium={contractAddressPremium}
          setTokenContract={setTokenContract}
          stake={stake}
          stakeAmountInput={stakeAmountInput}
          setStakeAmountInput={setStakeAmountInput}
        />
      )
    },
  ];

  async function getAccountTokens() {
    setFetching(true);

    const chain = CHAINS_CONFIG[selectedChain];

    const provider = new ethers.JsonRpcProvider(chain.rpcUrl);

    const balance = await provider.getBalance(wallet);

    const balanceInEth = parseFloat(ethers.formatEther(balance));

    setBalance(balanceInEth);

    const tokenBalance = await tokenContract.balanceOf(wallet);
    console.log("Token Balance:", tokenBalance.toString());
    setTokens([{ tokenAddress, balance: tokenBalance }]);
    setFetching(false);
  }

  async function setContractsConfiguration() {
    setFetching(true);

    const chain = CHAINS_CONFIG[selectedChain];

    const provider = new ethers.JsonRpcProvider(chain.rpcUrl);

    const privateKey = ethers.Wallet.fromPhrase(seedPhrase).privateKey;

    const signer = new ethers.Wallet(privateKey, provider);

    //let tempContract = new ethers.Contract(contractAddressSepolia, DePass_abi, signer);
    //setContract(tempContract);
    let tempContractPremium = new ethers.Contract(contractAddressPremium, DePassPremium_abi, signer);
    setContractPremium(tempContractPremium);
    let tempContractPassword = new ethers.Contract(contractAddressPassword, DePassPassword_abi, signer);
    setContractPassword(tempContractPassword);

    const tokenContract = new ethers.Contract(tokenAddress, tokenzep_abi, signer);
    setTokenContract(tokenContract);

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

    //if (contract) {
    if (contractPassword) {
      try {
        //const retrievedVaults = await contract.getVaults();
        const retrievedVaults = await contractPassword.getVaults();

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

        //const retrievedSharedVaults = await contract.getSharedVaults();
        const retrievedSharedVaults = await contractPassword.getSharedVaults();

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
    setTokens(null);
    setBalance(0);
    navigate("/");
  }


  useEffect(() => {
    if (!wallet) return;
    setVaults(null);
    setTokens(null);
    setBalance(0);
    setContractsConfiguration();
  }, [wallet, selectedChain]);

  useEffect(() => {
    if (!tokenContract) return;
    getAccountTokens();
  }, [tokenContract]);

  useEffect(() => {
    //if (!contract) return;
    if (!contractPassword) return;
    fetchVaults()
  //}, [contract]);
  }, [contractPassword]);

  return (
    <>
      <div className="content">
        <div className="logoutButton" onClick={logout}>
          <LogoutOutlined />
        </div>
        <div className="walletName" style={{ marginTop: '-8px' }}> DePass  {isPremium && <span style={{ color: 'gold' }}> Premium</span>}</div>
        <Tooltip title={wallet}>
          <div className="walletAddress">
            {wallet.slice(0, 4)}...{wallet.slice(38)}
          </div>
        </Tooltip>
        <Divider />
        {fetching ? (
          <Spin />
        ) : (
          <Tabs defaultActiveKey="4" items={items} className="walletView" style={{ marginTop: '-30px' }} />
        )}
      </div>
    </>
  );

}

export default WalletView;