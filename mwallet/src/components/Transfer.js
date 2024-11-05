/*import React, { useEffect, useState } from "react";
import { Input, Button, Spin, Tooltip, Select } from 'antd';
import { ethers } from "ethers";
import Tokens from './Tokens';
import WalletView from "./WalletView";



const Transfer = ({
  balance,
  CHAINS_CONFIG,
  selectedChain,
  seedPhrase,
  processing,
  setProcessing,
  getAccountTokens,
  tokens
}) => {
  const [amountToSend, setAmountToSend] = useState(null);
  const [sendToAddress, setSendToAddress] = useState(null);
  const [hash, setHash] = useState(null);
  const [tokenType, setTokenType] = useState("ETH");

  useEffect(() => {
    const interval = setInterval(() => {
      if (!processing) { 
        getAccountTokens();
      }
    }, 30000); // Cada 30 segundos

    return () => clearInterval(interval);
  }, [processing, getAccountTokens]);

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



  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
        }}
      >
        <div>
          <h3>ETH Balance</h3>
          <h3>
            {balance.toFixed(3)} {CHAINS_CONFIG[selectedChain].ticker}
          </h3>
        </div>
        <div>
          <h3>DPT Balance</h3>
          {tokens && tokens.length > 0 ? ( // Verifica que tokens no sea null y tenga elementos
            <h3>
              {Number(ethers.formatUnits(tokens[0].balance, 18)).toFixed(2)} {"DPT"}
            </h3>
          ) : (
            <h3>No tokens available</h3>
          )}
        </div>
      </div>

      <div className="sendRow">
        <p style={{ width: "90px", textAlign: "left" }}>To:</p>
        <Input
          value={sendToAddress}
          onChange={(e) => setSendToAddress(e.target.value)}
          placeholder="0x..."
        />
      </div>
      <div className="sendRow">
        <p style={{ width: "90px", textAlign: "left" }}>Amount:</p>
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
  );
};

export default Transfer;*/

import React, { useEffect, useState } from "react";
import { Input, Button, Spin, Tooltip, Select } from 'antd';
import { ethers } from "ethers";
import tokenzep_abi from '..//contracts/tokenzep_abi.json';

const Transfer = ({
  balance,
  CHAINS_CONFIG,
  selectedChain,
  processing,
  setProcessing,
  getAccountTokens,
  tokens,
  tokenContract,
  signer
}) => {
  const [amountToSend, setAmountToSend] = useState(null);
  const [sendToAddress, setSendToAddress] = useState(null);
  const [hash, setHash] = useState(null);
  const [selectedToken, setSelectedToken] = useState("ETH");
  /*useEffect(() => {
    const interval = setInterval(() => {
      if (!processing) {
        getAccountTokens();
      }
    }, 60000); // Cada 30 segundos

    return () => clearInterval(interval);
  }, [processing, getAccountTokens]);*/

  async function sendTransaction(to, amount) {
    //console.log("Signer:", signer);
    setProcessing(true);
    try {
      if (selectedToken === "ETH") {
        const tx = {
          to: to,
          value: ethers.parseEther(amount.toString()),
        };
        const transaction = await signer.sendTransaction(tx);
        setHash(transaction.hash);
        await transaction.wait();
      } else if (selectedToken === "DPT") {
        // Enviar tokens DPT (ERC-20)
        /*const dptContract = new ethers.Contract(
          DPTContractAddress,
          ["function transfer(address to, uint amount) returns (bool)"],
          wallet
        );*/
        const transaction = await tokenContract.transfer(to, ethers.parseUnits(amount.toString(), 18));
        setHash(transaction.hash);
        await transaction.wait();
      }

      // Resetear estados después de una transacción exitosa
      setHash(null);
      setProcessing(false);
      setAmountToSend(null);
      setSendToAddress(null);
      getAccountTokens();
    } catch (err) {
      console.error("Error en la transacción:", err);
      setHash(null);
      setProcessing(false);
      setAmountToSend(null);
      setSendToAddress(null);
    }
  }

return (
  <>
    <div
      style={{
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        marginTop: "-35px",
      }}
    >
      <div style={{ marginTop: "10px" }}>
        <h3>ETH Balance</h3>
        <h3>
          {balance.toFixed(3)} {CHAINS_CONFIG[selectedChain].ticker}
        </h3>
      </div>
      <div style={{ marginTop: "10px" }}>
        <h3>DPT Balance</h3>
        {tokens && tokens.length > 0 ? (
          <h3>
            {Number(ethers.formatUnits(tokens[0].balance, 18)).toFixed(2)} {"DPT"}
          </h3>
        ) : (
          <h3>No tokens available</h3>
        )}
      </div>
    </div>

    <Select
      defaultValue="ETH"
      onChange={(value) => setSelectedToken(value)}
      style={{ width: "100%", marginBottom: "20px" }}
      options={[
        { label: "ETH", value: "ETH" },
        { label: "DPT", value: "DPT" },
      ]}
    />

    <div className="sendRow">
      <p style={{ width: "90px", marginTop: "0px", textAlign: "left" }}>To:</p>
      <Input
        value={sendToAddress}
        onChange={(e) => setSendToAddress(e.target.value)}
        placeholder="0x..."
      />
    </div>
    <div className="sendRow">
      <p style={{ width: "90px", textAlign: "left" }}>Amount:</p>
      <Input
        value={amountToSend}
        onChange={(e) => setAmountToSend(e.target.value)}
        placeholder={`Amount of ${selectedToken} to send...`}
      />
    </div>
    <Button
      style={{ width: "100%", marginTop: "5px", marginBottom: "20px" }}
      type="primary"
      onClick={() => sendTransaction(sendToAddress, amountToSend)}
      disabled={processing}
    >
      Send {selectedToken}
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
);
};

export default Transfer;


