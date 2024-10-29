import React, { useState, useEffect } from 'react';
import { Input, Button, Spin, Tooltip } from 'antd';
import { ethers } from "ethers";
import WalletView from "./WalletView";


//const Premium = ({ buyPremium, isPremium, checkIfPremiumUser, setIsPremium, wallet, contract, stake, stakeAmountInput, setStakeAmountInput }) => {
const Premium = ({ buyPremium, isPremium, checkIfPremiumUser, setIsPremium, wallet, contractPremium, stake, stakeAmountInput, setStakeAmountInput }) => { 
  const [loading, setLoading] = useState(false);
  const [stakedAmount, setStakedAmount] = useState(0);
  const [stakeStartTime, setStakeStartTime] = useState(0);
  const [rewards, setRewards] = useState(0);

  const stakingAPR = 10; // 10% APR

  /*useEffect(() => {
    checkIfPremiumUser();
    fetchStakingInfo();
  }, []); */

  useEffect(() => {
    if (wallet && contractPremium) {
      checkIfPremiumUser();
      fetchStakingInfo();
    }
  }, [wallet, contractPremium]); // Dependencias para asegurar que se ejecuta cuando estén disponibles
  

  const handleBuyPremium = async () => {
    setLoading(true);
    try {
      await buyPremium(); // Esta es la función que interactúa con el contrato para comprar el premium
      alert('¡Compra realizada con éxito!');
      //checkIfPremiumUser();
    } catch (error) {
      console.error(error);
      alert('Error al realizar la compra');
    } finally {
      setLoading(false);
    }
  };

  const handleStake = async () => {
    setLoading(true);
    try {
      await stake(); // Esta es la función que interactúa con el contrato para comprar el premium
      alert('Staking succeded');
      //fetchh staking info
      await checkIfPremiumUser();
      await fetchStakingInfo();
    } catch (error) {
      console.error(error);
      alert('Unable to Stake');
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener la información de staking
  /*const fetchStakingInfo = async () => {
    if (wallet && contract) {
      const staked = await contract.getStakedTokens(wallet);
      const stakingTime = await contract.getStakingStartTime(wallet);
      const accumulatedRewards = await contract.getAccumulatedRewards(wallet);
      

      setStakedAmount(ethers.formatEther(staked));
      setStakeStartTime(stakingTime);
      setRewards(ethers.formatEther(accumulatedRewards));
    }
  }; */

  const fetchStakingInfo = async () => {
    //if (wallet && contract) {
    if (wallet && contractPremium) {
      //const staked = await contract.getStakedTokens(wallet);
      //const stakingTime = await contract.getStakingStartTime(wallet); // Esto devuelve un BigInt
      //const accumulatedRewards = await contract.getAccumulatedRewards(wallet);
      const staked = await contractPremium.getStakedTokens(wallet);
      const stakingTime = await contractPremium.getStakingStartTime(wallet); // Esto devuelve un BigInt
      const accumulatedRewards = await contractPremium.getAccumulatedRewards(wallet);
  
      // Formatear el stakingTime para mostrar días, horas, minutos (con conversión de BigInt a número)
      const formatStakingTime = (bigIntSeconds) => {
        const seconds = Number(bigIntSeconds); // Convertir BigInt a número
        const days = Math.floor(seconds / (24 * 60 * 60));
        const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((seconds % (60 * 60)) / 60);
        const remainingSeconds = Math.floor(seconds % 60);
  
        return `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
      };
  
      setStakedAmount(ethers.formatEther(staked));
      setStakeStartTime(formatStakingTime(stakingTime)); // Formatear y asignar el tiempo formateado
      //setRewards(ethers.formatEther(accumulatedRewards));
      //setRewards(ethers.formatUnits(accumulatedRewards, 18));
      const formattedRewards = parseFloat(ethers.formatUnits(accumulatedRewards, 18)).toFixed(4);
      setRewards(formattedRewards);
    }
  };
  
  

  // Función para hacer unstake
  const handleUnstakeTokens = async () => {
    setLoading(true);
    try {
      //const tx = await contract.unstakeTokens();
      const tx = await contractPremium.unstakeTokens();
      await tx.wait();
      alert('¡Unstake realizado con éxito!');
      fetchStakingInfo(); // Actualiza la información de staking
    } catch (error) {
      console.error(error);
      alert('Error al realizar el unstake');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ marginTop: '-10px' }}>Become a Premium User</h3>
      {/*<p>Valor de premiumStatus: {isPremium ? "Es premium" : "No es premium"}</p>*/}

      {isPremium ? (
        <div>
          <p>You are already a premium user</p>
          {stakedAmount === 0 && ( // Verificación para mostrar el staking solo si no hay amount estakeado
          <>
          <p>Stake DPT for 10% APR</p>
          <Input
            placeholder="Enter amount of DPT to stake"
            value={stakeAmountInput}
            onChange={(e) => setStakeAmountInput(e.target.value)}
          />
          <button onClick={handleStake} disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? 'Processing...' : 'Stake DPT'}
          </button>
          </>
          )}
        </div>

      ) : (
        <div>
          <p>Get unlimited creation of passwords & vaults, and be able to share them!</p>
          <button onClick={handleBuyPremium} disabled={loading}>
            {loading ? 'Procesando...' : 'Become Premium for 20 DPT'}
          </button>
          <p>Stake 200 or more DPT to become Premium + 10% APR</p>
          <Input
            placeholder="Enter amount of DPT to stake"
            value={stakeAmountInput}
            onChange={(e) => setStakeAmountInput(e.target.value)}
          />
          <button onClick={handleStake} disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? 'Processing...' : 'Stake DPT'}
          </button>
        </div>
      )}
      {stakedAmount > 0 && (
        <div>
          <p>Staked tokens: {parseFloat(stakedAmount).toFixed(2)} DPT</p>
          <p>Time staked: {stakeStartTime} </p>
          <p>Accumulated rewards: {rewards} DPT</p>

          <button onClick={handleUnstakeTokens} disabled={loading}>
            {loading ? 'Processing...' : `Unstake`}
          </button>
        </div>
      )}
      {/* Mostrar el APR del staking alineado a la derecha y con tamaño reducido */}
      <div style={{ marginTop: '30px', textAlign: 'right' }}>
        <p style={{ fontSize: '9px', display: 'inline-block' }}>
          *El APR del staking es del {stakingAPR}% anual con un bloqueo de 6 meses.
        </p>
      </div>
    </div>
  );
};

export default Premium;
