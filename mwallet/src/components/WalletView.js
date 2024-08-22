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
import PasswordVault_abi from '..//contracts/PasswordVault_abi.json';
const { Option } = Select; // Usa Option para el selector

const contractAddressSepolia = '0xaF91f6b78C63956d7d0100414cb65552EC259555';

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
  const [newCredential, setNewCredential] = useState({
    username: "",
    password: "",
    url: "",
  });

  // Use ABI to create an interface
  const passwordVaultInterface = new ethers.Interface(PasswordVault_abi);

  const handleAddPassword = () => {
    setIsAddingPassword(true);
  };

  const handleSavePassword = async () => {
    setFetching(true);

    const tx = await contract.addCredential(newCredential.username, newCredential.password, newCredential.url);
    await tx.wait();
    fetchVaults();

    setIsAddingPassword(false);
    setNewCredential({ username: "", password: "", url: "" });

    setFetching(false);
  };

  const handleCancelAddPassword = () => {
    setIsAddingPassword(false);
    setNewCredential({ username: "", password: "", url: "" });
  };

  const items = [
    {
      key: "4",
      label: `Passwords`,
      children: (
        <>
          {!isAddingPassword && (
            <div style={{ display: "flex", alignItems: "center" }}>
              <Select
                defaultValue="all"
                style={{ width: "100%" }}
                onChange={(value) => setSelectedVault(value)}
              >
                <Option value="all">All Vaults</Option>
                {vaults && vaults.length > 0 ? (
                  vaults.map((vault) => (
                    <Option key={vault.name} value={vault.name}>
                      {vault.name}
                    </Option>
                  ))
                ) : (
                  <Option disabled>No vaults available</Option>
                )}
              </Select>
              <Button
                icon={<PlusOutlined />}
                type="primary"
                style={{ marginLeft: "10px" }}
                onClick={handleAddPassword}
              />
            </div>
          )}
          {isAddingPassword ? (
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
          ) : (
            vaults ? (
              <>
                {vaults
                  .filter((vault) =>
                    selectedVault === "all" ? true : vault.name === selectedVault
                  )
                  .map((vault, i) => (
                    <div key={i}>
                      {vault.credentials.length > 0 ? (
                        vault.credentials.map((credential) => (
                          <div key={credential.url}>
                            <p>
                              Username: {credential.username}, 
                              Password: {credential.password}, 
                              URL: {credential.url}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p>No credentials found</p>
                      )}
                    </div>
                  ))}
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

    let tempContract = new ethers.Contract(contractAddressSepolia, PasswordVault_abi, signer);
    setContract(tempContract);

    fetchVaults()

    setFetching(false);
  }

  const fetchVaults = async () => {
    setFetching(true);


    if (contract) {
      try {
          const retrievedVaults = await contract.getVaults();
          
          setVaults(retrievedVaults);            
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
    fetchVaults()
  }, [selectedChain]);

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
