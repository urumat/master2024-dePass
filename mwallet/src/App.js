import "./App.css";
import { useEffect, useState } from "react";
import logo from "./logodepass.jpg";
import { Select } from "antd";
import { Routes, Route, useNavigate } from "react-router-dom";
import Home from "./components/Home";
import CreateAccount from "./components/CreateAccount";
import RecoverAccount from "./components/RecoverAccount";
import WalletView from "./components/WalletView";

function App() {
  const navigate = useNavigate(); // Hook para redirigir

  // Función para obtener y parsear el valor de localStorage
  function getLocalStorageItem(key) {
    const item = localStorage.getItem(key);
    return item && item !== 'null' ? item : null;
  }
  
  // Cargar los valores iniciales desde localStorage de forma segura
  const [wallet, setWallet] = useState(getLocalStorageItem('wallet'));
  const [seedPhrase, setSeedPhrase] = useState(getLocalStorageItem('seedPhrase'));
  const [selectedChain, setSelectedChain] = useState(getLocalStorageItem('selectedChain') || "0x1");

  // Guardar en localStorage cada vez que cambien
  useEffect(() => {
    localStorage.setItem('wallet', wallet);
  }, [wallet]);

  useEffect(() => {
    localStorage.setItem('seedPhrase', seedPhrase);
  }, [seedPhrase]);

  useEffect(() => {
    localStorage.setItem('selectedChain', selectedChain);
  }, [selectedChain]);

  useEffect(() => {
    if (wallet && seedPhrase) {
      navigate("/yourwallet");
    }
  }, [wallet, seedPhrase]);

  return (
    <div className="App">
      <header>
        <img src={logo} className="headerLogo" alt="logo" />
        <Select
          onChange={(val) => setSelectedChain(val)}
          value={selectedChain}
          options={[
            { label: "Ethereum", value: "0x1" },
            { label: "Sepolia Testnet", value: "0xaa36a7" }
          ]}
          className="dropdown"
        ></Select>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/yourwallet"
          element={
            <WalletView
              wallet={wallet}
              setWallet={setWallet}
              seedPhrase={seedPhrase}
              setSeedPhrase={setSeedPhrase}
              selectedChain={selectedChain}
            />
          }
        />
        <Route
          path="/createaccount"
          element={
            <CreateAccount
              setSeedPhrase={setSeedPhrase}
              setWallet={setWallet}
            />
          }
        />
        <Route path="/recover"
          element={
            <RecoverAccount
              setSeedPhrase={setSeedPhrase}
              setWallet={setWallet}
            />
          }
        />
      </Routes>
    </div>
  );
}

export default App;
