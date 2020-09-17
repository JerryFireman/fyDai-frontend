import { useEffect, useState, useContext } from 'react';
import { ethers, BigNumber }  from 'ethers';
import { signDaiPermit, signERC2612Permit } from 'eth-permit';
import * as utils from '../utils';

import { IYieldSeries } from '../types';

import YieldProxy from '../contracts/YieldProxy.json';

import { NotifyContext } from '../contexts/NotifyContext';
import { YieldContext } from '../contexts/YieldContext';
import { UserContext } from '../contexts/UserContext';

import { useSignerAccount } from './connectionHooks';
import { usePool } from './poolHook';
import { useMath } from './mathHooks';
import { useToken } from './tokenHook';
import { useEDai } from './eDaiHook';
import { useTxHelpers } from './appHooks';


/**
 * Hook for interacting with the Yield Proxy Contract.
 * 
 * @returns { function } postEth
 * @returns { function } withdrawEth
 * @returns { function } borrowDai
 * @returns { function } repayDaiDebt
 * @returns { function } buyDai
 * @returns { function } sellDai
 * @returns { function } addDaiLiquidity
 * @returns { function } removeDaiLiquidity
 * 
 * @returns { boolean } postActive
 * @returns { boolean } withdrawActive
 * @returns { boolean } borrowActive
 * @returns { boolean } repayActive
 * @returns { boolean } addLiquidityActive
 * @returns { boolean } removeLiquidityActive
 * @returns { boolean } buyActive
 * @returns { boolean } sellActive
 * 
 */
export const useProxy = () => {

  /* contexts */
  const  { dispatch }  = useContext<any>(NotifyContext);
  const  { state: { deployedContracts } }  = useContext<any>(YieldContext);
  const  { state: { preferences: { slippage } } }  = useContext<any>(UserContext);

  /* hooks */ 
  const { signer, provider, account } = useSignerAccount();
  const { previewPoolTx } = usePool();
  const { splitDaiLiquidity } = useMath();
  const { getBalance } = useToken();
  const { isMature } = useEDai();
  const { handleTx, handleTxError } = useTxHelpers();
  
  /* Activity flags */
  const [ postEthActive, setPostEthActive ] = useState<boolean>(false);
  const [ withdrawEthActive, setWithdrawEthActive ] = useState<boolean>(false);
  const [ borrowActive, setBorrowActive ] = useState<boolean>(false);
  const [ repayActive, setRepayActive ] = useState<boolean>(false);
  const [ removeLiquidityActive, setRemoveLiquidityActive ] = useState<boolean>(false);
  const [ addLiquidityActive, setAddLiquidityActive ] = useState<boolean>(false);
  const [ buyActive, setBuyActive ] = useState<boolean>(false);
  const [ sellActive, setSellActive ] = useState<boolean>(false);

  const { abi: yieldProxyAbi } = YieldProxy;
  /* Temporary signing messages */
  const auths = new Map([
    [1, { id: 1, desc:'Dai > treasury authenticate ' }],
    [2, { id: 2, desc:'eDai > pool authenticate ' }],
  ]);
  

  // TODO: deal with big number rather also, put this out in a hook
  const valueWithSlippage = (value:BigNumber, minimise:boolean=false ) => {
    const slippageAsRay = utils.toRay(slippage);
    const slippageAmount = utils.mulRay(value, slippageAsRay);
    if (minimise) {
      return value.sub(slippageAmount);
    } 
    return value.add(slippageAmount);
  };

  /* Preset the yieldProxy contract to be used with all fns */
  const [ proxyContract, setProxyContract] = useState<any>();
  useEffect(()=>{
    deployedContracts.YieldProxy && signer &&
    setProxyContract( new ethers.Contract( 
      ethers.utils.getAddress(deployedContracts.YieldProxy), 
      yieldProxyAbi,
      signer
    ));
  }, [signer, deployedContracts]);

  /**
   * @dev Post ETH collateral via yieldProxy
   * @param {number | BigNumber} amount amount of ETH to post (in normal human numbers or in Wei as a BigNumber)
   * @note if BigNumber is used make sure it is in WEI
   */
  const postEth = async (
    amount:number | BigNumber,
  ) => {

    /* Processing and/or sanitizing input */
    const parsedAmount = BigNumber.isBigNumber(amount)? amount : ethers.utils.parseEther(amount.toString());
    const toAddr = account && ethers.utils.getAddress(account); /* 'to' in this case represents the vault to be depositied into within controller */  
    
    /* Contract interaction */
    let tx:any;
    setPostEthActive(true);
    try {
      tx = await proxyContract.post(toAddr, { value: parsedAmount }); 
    } catch (e) {
      handleTxError('Error depositing ETH', tx, e ); 
      setPostEthActive(false);
      return;
    }
    dispatch({ type: 'txPending', payload:{ tx, message: `Deposit of ${amount} ETH pending...`, type:'DEPOSIT' } } );
    await handleTx(tx);
    setPostEthActive(false);
  };

  /**
   * @dev Withdraw ETH collateral via YieldProxy
   * @param {number|BigNumber} amount amount of ETH to withdraw (in normal human numbers or in Wei as a BigNumber)
   * @note if BigNumber is used make sure it is in WEI
   */
  const withdrawEth = async (
    amount:number|BigNumber
  ) => {

    /* Processing and sanitizing input */
    const parsedAmount = BigNumber.isBigNumber(amount)? amount : ethers.utils.parseEther(amount.toString());
    const toAddr = account && ethers.utils.getAddress(account);

    /* Contract interaction */
    let tx:any;
    setWithdrawEthActive(true);
    try {
      tx = await proxyContract.withdraw(toAddr, parsedAmount);
    } catch (e) {
      handleTxError('Error Withdrawing ETH', tx, e);
      setWithdrawEthActive(false);
      return;
    }
    dispatch({ type: 'txPending', payload:{ tx, message: `Withdraw of ${amount} ETH pending...`, type:'WITHDRAW' } } );
    await handleTx(tx);
    setWithdrawEthActive(false);
  };


  /**
   * @dev Borrow eDai from Controller and sell it immediately for Dai, for a maximum eDai debt.
   * Must have approved the operator with `controller.addDelegate(controllerDai.address)`.
   * 
   * @param {IYieldSeries} series the yield series to interact with.
   * @param {string} collateralType type of collateral eg. 'ETH-A'
   * @param {number} daiToBorrow Exact amount of Dai that should be obtained.
   * 
   * @return Amount of eDai that will be taken from `from` wallet
   *
   */
  const borrowDai = async (
    series:IYieldSeries,
    collateralType: string,
    daiToBorrow: number,
  ) => {
    const dai = ethers.utils.parseEther(daiToBorrow.toString());
    const poolAddr = ethers.utils.getAddress(series.poolAddress);
    const toAddr = account && ethers.utils.getAddress(account);
    const parsedMaturity = series.maturity.toString();

    const collatType = ethers.utils.formatBytes32String(collateralType);
    // const maxEDai = ethers.utils.parseEther(maximumEDai.toString());

    const overrides = { 
      gasLimit: BigNumber.from('1000000')
    };

    setBorrowActive(true);
    let tx:any;
    let maxEDai:BigNumber;
    try {
      /* Calculate expected trade values and factor in slippage */
      const preview = await previewPoolTx('buydai', series, daiToBorrow); 
      if ( !(preview instanceof Error) ) {
        maxEDai = valueWithSlippage(preview);
      } else {
        // minEDai = ethers.utils.parseEther('1000000');
        throw(preview);
      }

      tx = await proxyContract.borrowDaiForMaximumEDai( 
        poolAddr, 
        collatType,
        parsedMaturity, 
        toAddr, 
        maxEDai, 
        dai, 
        overrides 
      );

    } catch (e) {
      handleTxError('Error Borrowing Dai', tx, e);
      setBorrowActive(false);
      return;
    }
    dispatch({ type: 'txPending', payload:{ tx, message: `Borrowing ${daiToBorrow} Dai pending...`, type:'BORROW' } } );
    await handleTx(tx);
    setBorrowActive(false);
  };


  /**
   * @dev Repay an amount of eDai debt in Controller using a given amount of Dai exchanged for eDai at pool rates, with a minimum of eDai debt required to be paid.
   * Post maturity the user is asked for a signature allowing the treasury access to dai
   * 
   * @param {IYieldSeries} series the yield series to interact with.
   * @param {string} collateralType type of collateral eg. 'ETH-A'
   * @param {number} repaymentInDai Exact amount of Dai that should be spent on the repayment.
   * 
   * @return Amount 
   *
   */
  const repayDaiDebt = async (
    series: IYieldSeries,
    collateralType: string,
    repaymentInDai: number,
  ) => {
    const dai = ethers.utils.parseEther(repaymentInDai.toString());   
    const collatType = ethers.utils.formatBytes32String(collateralType);
    const toAddr = account && ethers.utils.getAddress(account);
    const fromAddr = account && ethers.utils.getAddress(account);
    const poolAddr = ethers.utils.getAddress(series.poolAddress);
    const eDaiAddr = ethers.utils.getAddress(series.eDaiAddress);
    const parsedMaturity = series.maturity.toString();
    // const minEDai = ethers.utils.parseEther(minimumEDaiRepayment.toString());

    const overrides = {
    // nonce: signer.getTransactionCount().then( (nonce:any) => nonce + queue),
      gasLimit: BigNumber.from('1000000')
    };

    setRepayActive(true);
    let tx:any;
    let daiPermitSig:any;
    let minEDai:BigNumber;
    try {
      console.log( await series.isMature() );

      if ( await isMature(series.eDaiAddress) ) {  
        try {
          console.log('repay with sig- after maturity');
          /* Repay using a signature authorizing treasury */
          dispatch({ type: 'requestSigs', payload:[ auths.get(1) ] });

          const result = await signDaiPermit( 
            provider.provider, 
            deployedContracts.Dai, 
            // @ts-ignore
            fromAddr,
            deployedContracts.Treasury
          );
          daiPermitSig = ethers.utils.joinSignature(result);
          dispatch({ type: 'signed', payload: auths.get(1) });
          dispatch({ type: 'requestSigs', payload: [] });
        } catch (e) { 
          handleTxError('Signing error', tx, e);
          dispatch({ type: 'requestSigs', payload: [] });
          setRepayActive(false);
          return;
        }

        tx = await proxyContract.repayDaiWithSignature(
          collatType,
          parsedMaturity,
          toAddr,
          dai,
          daiPermitSig,
          overrides
        );

      } else {
        console.log('repay with no signature - before maturity');
        /* calculate expected trade values and factor in slippage */
        const preview = await previewPoolTx('selldai', series, repaymentInDai);
        if ( !(preview instanceof Error) ) {
          minEDai = valueWithSlippage(preview, true);
        } else {
          // testing
          minEDai = ethers.utils.parseEther('0');
          // throw(preview);
        }

        tx = await proxyContract.repayMinimumEDaiDebtForDai(
          poolAddr,
          collatType,
          parsedMaturity,
          toAddr,
          minEDai,
          dai,
          overrides
        );
      }      
      
    } catch (e) {
      console.log(e);
      handleTxError('Error Repaying Dai', tx, e);
      setRepayActive(false);
      return;
    }
    dispatch({ type: 'txPending', payload:{ tx, message: `Repaying ${repaymentInDai} Dai pending...`, type:'REPAY' } } );
    await handleTx(tx);
    setRepayActive(false);
  };


  /**
   * LIQUIDITY SECTION
   */
  
  /**
   * @dev Add liquidity to a pool 
   * 
   * @param {IYieldSeries} series series to act on.
   * @param {number|BigNumber} daiUsed amount of Dai to use to mint liquidity. 
   * @note if BigNumber is used make sure it is in WEI
   */
  const addLiquidity = async (
    series:IYieldSeries,
    daiUsed:number|BigNumber,
  ) => {
    /* Processing and sanitizing input */
    const poolAddr = ethers.utils.getAddress(series.poolAddress);
    const parsedDaiUsed = BigNumber.isBigNumber(daiUsed)? daiUsed : ethers.utils.parseEther(daiUsed.toString());

    const overrides = { 
      gasLimit: BigNumber.from('1000000'),
      value: ethers.utils.parseEther('0')
    };

    /* calculate minimum expected eDai value and factor in slippage */
    const daiReserves = await getBalance(deployedContracts.Dai, 'Dai', poolAddr);
    const eDaiReserves = await getBalance(series.eDaiAddress, 'EDai', poolAddr);
    const [ , eDaiSplit ] = splitDaiLiquidity( parsedDaiUsed, daiReserves, eDaiReserves );

    /* Contract interaction */
    let tx:any;
    let maxEDai:BigNumber;
    setAddLiquidityActive(true);
    try {
      /* Calculate expected trade values and factor in slippage */
      const preview = await previewPoolTx('sellDai', series, eDaiSplit);
      if ( !(preview instanceof Error) ) {
        maxEDai = valueWithSlippage(preview);
      } else {
        // testing
        maxEDai = ethers.utils.parseEther('1000000');
        // throw(preview);
      }

      tx = await proxyContract.addLiquidity(poolAddr, parsedDaiUsed, maxEDai, overrides);
    } catch (e) {
      handleTxError('Error Adding liquidity', tx, e);
      setAddLiquidityActive(false);
      return;
    }
    dispatch({ type: 'txPending', payload:{ tx, message: `Adding ${daiUsed} DAI liquidity pending...`, type:'ADD_LIQUIDITY' } } );
    await handleTx(tx);
    setAddLiquidityActive(false);
  };

  /**
   * @dev removes liquidity from a pool
   * 
   * @param {IYieldSeries} series series to act on.
   * @param {number|BigNumber} tokens amount of tokens to remove. 
   * 
   * @note if BigNumber is used make sure it is in WEI
   */
  const removeLiquidity = async (
    // removeLiquidityEarly(address from, uint256 poolTokens, uint256 DaiLimit)
    // removeLiquidityMature(address from, uint256 poolTokens)
    series: IYieldSeries,  
    tokens:number|BigNumber,
  ) => {
    /* Processing and sanitizing input */
    const poolAddr = ethers.utils.getAddress(series.poolAddress);
    const parsedTokens = BigNumber.isBigNumber(tokens)? tokens : ethers.utils.parseEther(tokens.toString());

    const overrides = { 
      gasLimit: BigNumber.from('1000000')
    };

    /* Contract interaction */
    let tx:any;
    let minDai:BigNumber;
    let minEDai:BigNumber;
    setRemoveLiquidityActive(true);
    try {
      if ( !(await isMature(series.eDaiAddress)) ) {
        console.log('removing liquidity BEFORE maturity'); 
        /* calculate expected trade values and factor in slippage */
        // const preview = await previewPoolTx('selldai', series, daiUsed);
        // if ( !(preview instanceof Error) ) {
        //   minDai = valueWithSlippage(preview, true);
        // } else {
        //   // testing with slippage etc. 
        //   // minDai = ethers.utils.parseEther('0');
        //   throw(preview);
        // }

        // TODO dont use this testing with slippage etc. 
        minDai = ethers.utils.parseEther('0');
        minEDai = ethers.utils.parseEther('0');
        tx = await proxyContract.removeLiquidityEarlyDaiPool(poolAddr, parsedTokens, minDai, minEDai, overrides );

      } else {
        console.log('removing liquidity AFTER maturity');
        tx = await proxyContract.removeLiquidityMature(poolAddr, parsedTokens, overrides );
      }
    } catch (e) {
      handleTxError('Error Removing liquidity', tx, e);
      setRemoveLiquidityActive(false);
      return;
    }
    dispatch({ type: 'txPending', payload:{ tx, message: `Removing ${tokens} DAI liquidity pending...`, type:'REMOVE_LIQUIDITY' } } );
    await handleTx(tx);
    setRemoveLiquidityActive(false);
  };


  /**
   * LIMITPOOL SECTION
   */

  /**
   * @dev Sell Dai for eDai
   * 
   * @param {IYieldSeries} series series to act on.
   * @param daiIn Amount of dai being bought (if in BigNumber make sure its in Wei. )
   * */
  const sellDai = async (  
    series: IYieldSeries,
    daiIn: number| BigNumber, 
  ) => {
    /* Processing and/or sanitizing input */
    const poolAddr = ethers.utils.getAddress(series.poolAddress);
    const parsedDaiIn = BigNumber.isBigNumber(daiIn)? daiIn : ethers.utils.parseEther(daiIn.toString());
    const toAddr = account && ethers.utils.getAddress(account);

    const overrides = { 
      gasLimit: BigNumber.from('1000000')
    };

    /* Contract interaction */
    let tx:any;
    let minEDaiOut:BigNumber;
    setSellActive(true);
    try {
      /* calculate expected trade values and factor in slippage */
      const preview = await previewPoolTx('selldai', series, daiIn);
      if ( !(preview instanceof Error) ) {
        minEDaiOut = valueWithSlippage(preview, true);
      } else {
      // temp min for testing */
        minEDaiOut = ethers.utils.parseEther('0');
        // throw(preview);
      }

      tx = await proxyContract.sellDai(poolAddr, toAddr, parsedDaiIn, minEDaiOut, overrides);

    } catch (e) {
      handleTxError('Error selling', tx, e );   
      setSellActive(false);
      return;
    }
    dispatch({ type: 'txPending', payload:{ tx, message: `Selling ${daiIn} DAI pending...`, type:'SELL_DAI' } } );
    await handleTx(tx);
    setSellActive(false);
  };

  /**
   * @dev LEGACY Buy Dai with eDai - USE BUY DAI WITH SIGNATURE
   * @param {IYieldSeries} series yield series to act on.
   * @param daiOut Amount of dai being bought
   * */ 
  const buyDaiNoSignature= async ( 
    series: IYieldSeries, 
    daiOut:number,
  ) => {
    /* Processing and/or sanitizing input */
    const poolAddr = ethers.utils.getAddress(series.poolAddress);
    const parsedDaiOut = BigNumber.isBigNumber(daiOut)? daiOut : ethers.utils.parseEther(daiOut.toString());
    const toAddr = account && ethers.utils.getAddress(account);

    const overrides = { 
      gasLimit: BigNumber.from('1000000')
    };

    /* Contract interaction */
    let tx:any;
    let maxEDaiIn:BigNumber;
    setBuyActive(true);
    try {
      /* calculate expected trade values and factor in slippage */
      const preview = await previewPoolTx('buydai', series, daiOut);
      if ( !(preview instanceof Error) ) {
        maxEDaiIn = valueWithSlippage(preview);
      } else {

        // temp max bignumber for testing */
        maxEDaiIn = ethers.utils.parseEther('1000000');
        // throw(preview);
      }
      // temp max bignumber for testing */
      // const maxEDaiIn = ethers.utils.parseEther('1000000');
      tx = await proxyContract.buyDai(poolAddr, toAddr, parsedDaiOut, maxEDaiIn);
    } catch (e) {
      console.log(e);
      handleTxError('Error buying Dai', tx, e );   
      setBuyActive(false);
      return;
    }
    dispatch({ type: 'txPending', payload:{ tx, message: `Buying back ${daiOut} DAI pending...`, type:'BUY_DAI' } } );
    await handleTx(tx);
    setBuyActive(false);
  };

  /**
   * @dev Buy Dai with eDai
   * @param {IYieldSeries} series yield series to act on.
   * @param daiOut Amount of dai being bought
   * */ 
  const buyDai = async ( 
    series: IYieldSeries, 
    daiOut:number,
  ) => {
    /* Processing and/or sanitizing input */
    const poolAddr = ethers.utils.getAddress(series.poolAddress);
    const eDaiAddr = ethers.utils.getAddress(series.eDaiAddress);
    const parsedDaiOut = BigNumber.isBigNumber(daiOut)? daiOut : ethers.utils.parseEther(daiOut.toString());
    const toAddr = account && ethers.utils.getAddress(account);
    const fromAddr = account && ethers.utils.getAddress(account);

    const overrides = { 
      gasLimit: BigNumber.from('1000000')
    };

    /* Contract interaction */
    let tx:any;
    let maxEDaiIn:BigNumber;
    let eDaiPermitSig:any;
    setBuyActive(true);
    try { 
      /* calculate expected trade values and factor in slippage */
      const preview = await previewPoolTx('buydai', series, daiOut);
      if ( !(preview instanceof Error) ) {
        maxEDaiIn = valueWithSlippage(preview);
      } else {
        // temp max bignumber for testing */
        maxEDaiIn = ethers.utils.parseEther('1000000');
        // throw(preview);
      }

      /* Get the user signature authorizing eDai to interact with Dai */
      try {
        dispatch({ type: 'requestSigs', payload:[ auths.get(2) ] });
        const result = await signERC2612Permit(
          provider.provider, 
          eDaiAddr,
          // @ts-ignore 
          fromAddr, 
          poolAddr
        );
        eDaiPermitSig = ethers.utils.joinSignature(result);
        dispatch({ type: 'signed', payload: auths.get(2) });
        dispatch({ type: 'requestSigs', payload: [] });
      } catch (e) { 
        handleTxError('Signing error', tx, e);
        dispatch({ type: 'requestSigs', payload: [] });
        setRepayActive(false);
        return;
      }

      tx = await proxyContract.buyDaiWithSignature(
        poolAddr, 
        toAddr, 
        parsedDaiOut, 
        maxEDaiIn, 
        eDaiPermitSig,
        overrides
      );
    } catch (e) {
      console.log(e);
      handleTxError('Error buying back Dai', tx, e );   
      setBuyActive(false);
      return;
    }
    dispatch({ type: 'txPending', payload:{ tx, message: `Buying back ${daiOut} DAI pending...`, type:'BUY_DAI' } } );
    await handleTx(tx);
    setBuyActive(false);
  };

  // buyDaiWithSignature(address pool, address to, uint128 daiOut, uint128 maxEDaiIn, bytes memory signature)

  // TODO Add these two ONLY if required
  const sellEDai = () => {};
  const buyEDai = () => {};

  /**
   * SPLITTER SECTION
   *  */
  // Splitter: Maker to Yield proxy
  // @dev Transfer debt and collateral from MakerDAO to Yield
  // Needs vat.hope(splitter.address, { from: user });
  // Needs controller.addDelegate(splitter.address, { from: user });
  // @param pool The pool to trade in (and therefore eDai series to borrow)
  // @param user Vault to migrate.
  // @param wethAmount weth to move from MakerDAO to Yield. Needs to be high enough to collateralize the dai debt in Yield,
  // and low enough to make sure that debt left in MakerDAO is also collateralized.
  // @param daiAmount dai debt to move from MakerDAO to Yield. Denominated in Dai (= art * rate)
  const makerToYield = () => {
    // makerToYield(address pool, address user, uint256 wethAmount, uint256 daiAmount)
  };

  
  // @dev Transfer debt and collateral from Yield to MakerDAO
  // Needs vat.hope(splitter.address, { from: user });
  // Needs controller.addDelegate(splitter.address, { from: user });
  // @param pool The pool to trade in (and therefore eDai series to migrate)
  // @param user Vault to migrate.
  // @param eDaiAmount eDai debt to move from Yield to MakerDAO.
  // @param wethAmount weth to move from Yield to MakerDAO. Needs to be high enough to collateralize the dai debt in MakerDAO,
  // and low enough to make sure that debt left in Yield is also collateralized.
  const yieldToMaker = () => {
    //  yieldToMaker(address pool, address user, uint256 eDaiAmount, uint256 wethAmount)
  };

  // Splitter Views

  // @dev Minimum weth needed to collateralize an amount of dai in MakerDAO
  const wethForDai = () => {
    // wethForDai(uint256 daiAmount) public view returns (uint256)
  };
  // @dev Amount of eDai debt that will result from migrating Dai debt from MakerDAO to Yield
  const eDaiForDai = () => {
    // eDaiForDai(address pool, uint256 daiAmount)
  };
  // @dev Amount of dai debt that will result from migrating eDai debt from Yield to MakerDAO
  const daiForEDai = () => {
    // daiForEDai(address pool, uint256 eDaiAmount)
  };


  return {

    /* ethProxy eq. fns */
    postEth, postEthActive,
    withdrawEth, withdrawEthActive,

    /* daiProxy eq. fns */
    borrowDai, borrowActive,
    repayDaiDebt, repayActive,

    /* liquidityProxy eq. fns */
    addLiquidity, addLiquidityActive,
    removeLiquidity, removeLiquidityActive,

    /* limitPool fns */
    sellDai, sellActive,
    buyDai, buyActive,
    buyDaiNoSignature,
    // sellEDai,
    // buyEDai,

    /* Splitter fns */
    makerToYield,
    yieldToMaker,

    /* Splitter views */
    wethForDai,
    eDaiForDai,
    daiForEDai

  } as const;
};

