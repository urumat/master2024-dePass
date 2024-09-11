import React, { useEffect, useState } from "react";
import {
  Divider,
  Tooltip,
  List,
  Avatar,
  Spin,
  Tabs,
  Input,
  Button,
  Select,
  Form
} from "antd";
import { LogoutOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import logo from "../noImg.png";
import { CHAINS_CONFIG } from "../chains";
import { ethers } from "ethers";
import DePass_abi from '..//contracts/DePass_abi.json';
import { v4 as uuidv4 } from 'uuid'; // Para generar IDs aleatorios
const { Option } = Select; // Usa Option para el selector

const contractAddressSepolia = '0x4a02df6FE9D8d84ac933e24C7290eDcF412F3059';

function WalletView({
  wallet,
  setWallet,
  seedPhrase,
  setSeedPhrase,
  selectedChain,
}) {
  const navigate = useNavigate();
  const [vaults, setVaults] = useState([]);
  const [tokens, setTokens] = useState(null);
  const [nfts, setNfts] = useState(null);
  const [balance, setBalance] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [amountToSend, setAmountToSend] = useState(null);
  const [sendToAddress, setSendToAddress] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [hash, setHash] = useState(null);
  const [selectedVault, setSelectedVault] = useState("all");
  const [contract, setContract] = useState(null);
  const [isAddingPassword, setIsAddingPassword] = useState(false);
  const [isAddingVault, setIsAddingVault] = useState(false);
  const [newCredential, setNewCredential] = useState({
    username: "",
    password: "",
    url: "",
  });
  const [newVault, setNewVault] = useState({
    name: "",
  });

  // Use ABI to create an interface
  const DePassInterface = new ethers.Interface(DePass_abi);

  // Mock encryption/decryption functions
  const encrypt = (data) => JSON.stringify(data);;
  const decrypt = (data) => data;


  const handleAddPassword = () => {
    setIsAddingPassword(true);
  };

  const handleAddVault = () => {
    setIsAddingVault(true);
  };

  const handleSavePassword = async () => {
    setFetching(true);

    const credentialId = ethers.keccak256(ethers.toUtf8Bytes(uuidv4()));
    const encryptedData = encrypt(newCredential); // Cifra el JSON completo
    const tx = await contract.addCredential(selectedVault.id, credentialId, encryptedData);
    await tx.wait();
    
    setIsAddingPassword(false);
    setNewCredential({ username: "", password: "", url: "" });
    await fetchVaults(contract);

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
    await fetchVaults(contract);

    setFetching(false);
  };


  const handleCancelAddPassword = () => {
    setIsAddingPassword(false);
    setNewCredential({ username: "", password: "", url: "" });
    setSelectedVault("all");
  };

  const handleCancelAddVault = () => {
    setIsAddingVault(false);
    setNewVault({ name: "" });
    setSelectedVault("all");
  };

  const handleSelectVault = (value) => {
    if (value === "add-vault") {
      setSelectedVault(null);
      handleAddVault(); // Muestra el formulario para agregar un nuevo vault
    } else if (value === "all") {
      setSelectedVault("all");
    } else {
      // Busca el vault correspondiente al ID seleccionado y setéalo como el vault seleccionado
      const selectedVault = vaults.find((vault) => vault.id === value);
      setSelectedVault(selectedVault);
    }
  };

  const filterVaults = (vaults, selectedVault) => 
    vaults.filter(vault => selectedVault === "all" ? true : vault.id === selectedVault.id);
  
  const extractCredentials = (vaults, selectedVault) => 
    selectedVault === "all" 
      ? vaults.flatMap(vault => vault.credentials)
      : vaults.reduce((acc, vault) => acc.concat(vault.credentials), []);
  
  const sortCredentialsByUrl = (credentials) => 
    credentials.sort((a, b) => (a.url || '').localeCompare(b.url || ''));
  
  const getAllCredentials = () => {
    const filteredVaults = filterVaults(vaults, selectedVault);
    const allCredentials = extractCredentials(filteredVaults, selectedVault);
    return sortCredentialsByUrl(allCredentials);
  };

  const items = [
    {
      key: "4",
      label: `Passwords`,
      children: (
        <>
          {!isAddingPassword && !isAddingVault && (
            <div style={{ display: "flex", alignItems: "center" }}>
              <Select
                defaultValue="all"
                style={{ width: "100%" }}
                onChange={handleSelectVault}
              >
                <Option key="all" value="all">All Vaults</Option>
                {vaults && vaults.length > 0 ? (
                  vaults.map((vault) => (
                    <Option key={vault.id} value={vault.id}>
                      {vault.name}
                    </Option>
                  ))
                ) : (
                  <Option key="null" value="null" disabled>No vaults available</Option>
                )}
                <Option key="add-vault" value="add-vault">
                  + Add New Vault
                </Option>
              </Select>
              <Button
                icon={<PlusOutlined />}
                type="primary"
                style={{ marginLeft: "10px" }}
                onClick={handleAddPassword}
              />
            </div>
          )}
          { isAddingPassword ? (
            <Form layout="vertical">
              <Form.Item label={<span style={{ color: "#ffffff" }}>Username</span>}>
                <Input
                  value={newCredential.username}
                  onChange={(e) => setNewCredential({ ...newCredential, username: e.target.value })}
                />
              </Form.Item>
              <Form.Item label={<span style={{ color: "#ffffff" }}>Password</span>}>
                <Input.Password
                  value={newCredential.password}
                  onChange={(e) => setNewCredential({ ...newCredential, password: e.target.value })}
                />
              </Form.Item>
              <Form.Item label={<span style={{ color: "#ffffff" }}>Url</span>}>
                <Input
                  value={newCredential.url}
                  onChange={(e) => setNewCredential({ ...newCredential, url: e.target.value })}
                />
              </Form.Item>
              <Button type="primary" onClick={handleSavePassword} style={{ marginRight: "10px" }}>
                Save
              </Button>
              <Button onClick={handleCancelAddPassword}>Cancel</Button>
            </Form>
          ) : isAddingVault ? (
            <Form layout="vertical">
              <Form.Item label={<span style={{ color: "#ffffff" }}>Vault Name</span>}>
                <Input
                  value={newVault.name}
                  onChange={(e) => setNewVault({ ...newVault, name: e.target.value })}
                />
              </Form.Item>
              <Button type="primary" onClick={handleSaveVault} style={{ marginRight: "10px" }}>
                Save
              </Button>
              <Button onClick={handleCancelAddVault}>Cancel</Button>
            </Form>
          ) : (
            vaults && selectedVault ? (
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
            )
          )}
        </>
      ),
    },
    {
      key: "3",
      label: `Tokens`,
      children: (
        <>
          {tokens ? (
            <>
              <List
                bordered
                className="tokenList"
                itemLayout="horizontal"
                dataSource={tokens}
                renderItem={(item, index) => (
                  <List.Item
                    className="tokenName"
                    style={{ textAlign: "left" }}
                  >
                    <List.Item.Meta
                      avatar={<Avatar src={item.logo || logo} />}
                      title={item.symbol}
                      description={item.name}
                    />
                    <div className="tokenAmount">
                      {(
                        Number(item.balance) /
                        10 ** Number(item.decimals)
                      ).toFixed(3)}{" "}
                      Tokens
                    </div>
                  </List.Item>
                )}
              />
            </>
          ) : (
            <>
              <span>You seem to not have any tokens yet</span>
            </>
          )}
        </>
      ),
    },
    {
      key: "2",
      label: `NFTs`,
      children: (
        <>
          {nfts ? (
            <>
              {nfts.map((e, i) => {
                return (
                  <>
                    {e && (
                      <img
                        key={i}
                        className="nftImage"
                        alt="nftImage"
                        src={e}
                      />
                    )}
                  </>
                );
              })}
            </>
          ) : (
            <>
              <span>You seem to not have any NFTs yet</span>
            </>
          )}
        </>
      ),
    },
    {
      key: "1",
      label: `Transfer`,
      children: (
        <>
          <h3>Native Balance </h3>
          <h1>
            {balance.toFixed(3)} {CHAINS_CONFIG[selectedChain].ticker}
          </h1>
          <div className="sendRow">
            <p style={{ width: "90px", textAlign: "left" }}> To:</p>
            <Input
              value={sendToAddress}
              onChange={(e) => setSendToAddress(e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="sendRow">
            <p style={{ width: "90px", textAlign: "left" }}> Amount:</p>
            <Input
              value={amountToSend}
              onChange={(e) => setAmountToSend(e.target.value)}
              placeholder="Native tokens you wish to send..."
            />
          </div>
          <Button
            style={{ width: "100%", marginTop: "20px", marginBottom: "20px" }}
            type="primary"
            onClick={() => sendTransaction(sendToAddress, amountToSend)}
          >
            Send Tokens
          </Button>
          {processing && (
            <>
              <Spin />
              {hash && (
                <Tooltip title={hash}>
                  <p>Hover For Tx Hash</p>
                </Tooltip>
              )}
            </>
          )}
        </>
      ),
    },
  ];

  async function sendTransaction(to, amount) {
    const chain = CHAINS_CONFIG[selectedChain];

    const provider = new ethers.JsonRpcProvider(chain.rpcUrl);

    const privateKey = ethers.Wallet.fromPhrase(seedPhrase).privateKey;

    const wallet = new ethers.Wallet(privateKey, provider);

    const tx = {
      to: to,
      value: ethers.parseEther(amount.toString()),
    };

    setProcessing(true);
    try {
      const transaction = await wallet.sendTransaction(tx);

      setHash(transaction.hash);
      const receipt = await transaction.wait();

      setHash(null);
      setProcessing(false);
      setAmountToSend(null);
      setSendToAddress(null);

      if (receipt.status === 1) {
        getAccountTokens();
      } else {
        console.log("failed");
      }
    } catch (err) {
      setHash(null);
      setProcessing(false);
      setAmountToSend(null);
      setSendToAddress(null);
    }
  }

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

    fetchVaults()

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
        const processedVaults = await Promise.all(retrievedVaults.map(async (vault) => {
            // Desencriptar y procesar cada credencial
            const processedCredentials = await processCredentials(vault);

            return { id: vault.id, name: vault.name, credentials: processedCredentials }; // Actualizar las credenciales del vault
        }));

        setVaults(processedVaults);            
      } catch (error) {
          //setErrorMessage(error.message);
      }
    }
      
    setFetching(false);
  };

  function logout() {
    setSeedPhrase(null);
    setWallet(null);
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
          <Tabs defaultActiveKey="1" items={items} className="walletView" />
        )}
      </div>
    </>
  );
}

export default WalletView;
