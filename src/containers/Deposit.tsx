import React, { useState, useContext, useEffect } from 'react';
import ethers, { BigNumber } from 'ethers';

import { 
  Box,
  Keyboard,
  TextInput, 
  Text,
  ResponsiveContext,
} from 'grommet';

import {
  FiArrowRight as ArrowRight,
  FiArrowLeft as ArrowLeft,
} from 'react-icons/fi';
import { FaBullseye } from 'react-icons/fa';
import EthMark from '../components/logos/EthMark';

import { cleanValue } from '../utils';

import { UserContext } from '../contexts/UserContext';

import { 
  useProxy, 
  useTxActive, 
  useMath, 
  useSignerAccount, 
  useDebounce,
  useIsLol
} from '../hooks';

import WithdrawEth from './WithdrawEth';

import InfoGrid from '../components/InfoGrid';
import InputWrap from '../components/InputWrap';
import ApprovalPending from '../components/ApprovalPending';
import TxStatus from '../components/TxStatus';
import RaisedButton from '../components/RaisedButton';
import ActionButton from '../components/ActionButton';
import FlatButton from '../components/FlatButton';
import Authorization from '../components/Authorization';
import SeriesDescriptor from '../components/SeriesDescriptor';
import CollateralDescriptor from '../components/CollateralDescriptor';

interface DepositProps {
  /* deposit amount prop is for quick linking into component */
  setActiveView: any;
  modalView?:boolean;
  depositAmount?:string|BigNumber;
}

const Deposit = ({ setActiveView, modalView, depositAmount }:DepositProps) => {
  const { state: userState, actions: userActions } = useContext(UserContext);
  const {
    ethBalance,
    ethPosted,
    ethPosted_,
    maxDaiAvailable_,
    collateralPercent_,
    debtValue,
  } = userState.position;

  const screenSize = useContext(ResponsiveContext);

  const { postEth, postEthActive }  = useProxy();
  const { estCollRatio: estimateRatio, collValue } = useMath();
  const [ txActive ] = useTxActive(['DEPOSIT', 'WITHDRAW']);
  const { account } = useSignerAccount();

  const [ inputValue, setInputValue ] = useState<any>(depositAmount || undefined);
  const debouncedInput = useDebounce(inputValue, 500);

  const [inputRef, setInputRef] = useState<any>(null);

  const [ estRatio, setEstRatio ] = useState<any>(0);
  const [ estPower, setEstPower ] = useState<any>(0);

  const [ withdrawOpen, setWithdrawOpen ] = useState<boolean>(false);
  const [ depositPending, setDepositPending ] = useState<boolean>(false);
  const [ depositDisabled, setDepositDisabled ] = useState<boolean>(true);

  const [ warningMsg, setWarningMsg] = useState<string|null>(null);
  const [ errorMsg, setErrorMsg] = useState<string|null>(null);
  const isLol = useIsLol(inputValue);

  /* Steps required to deposit and update values */
  const depositProcedure = async () => {
    if (inputValue && !depositDisabled ) {
      setDepositPending(true);
      await postEth(inputValue);
      setInputValue(undefined);
      await userActions.updatePosition();
      setDepositPending(false);
    }
  };

  /* Handle debounced input value changes */
  useEffect(()=>{
    /* 1. Adjust estimated ratio based on input changes */
    if (debouncedInput && ethPosted && debtValue) {
      const newRatio = estimateRatio((ethPosted.add(ethers.utils.parseEther(debouncedInput) )), debtValue); 
      newRatio && setEstRatio(cleanValue(newRatio, 0));
    }
    /* 2. Roughly estimate the new borrowing power */
    if (debouncedInput) {
      const val = collValue(ethers.utils.parseEther(debouncedInput));
      const newPower = parseFloat(ethers.utils.formatEther(val))/2;
      if (maxDaiAvailable_) {
        const pl = parseFloat(maxDaiAvailable_)+newPower;
        setEstPower( pl.toFixed(2));
      } else {
        setEstPower(newPower.toFixed(2));
      }
    }

  }, [debouncedInput]);

  /* Handle deposit disabling deposits */
  useEffect(()=>{
    (
      (account && ethBalance?.eq(ethers.constants.Zero)) ||
      (account && inputValue && ethBalance && ethers.utils.parseEther(inputValue).gt(ethBalance)) ||
      (ethBalance && inputValue && (parseFloat(inputValue)<= 0.05) ) ||
      txActive ||
      !account ||
      !inputValue ||
      parseFloat(inputValue) <= 0    
    ) ? setDepositDisabled(true) : setDepositDisabled(false);
  }, [inputValue]);

  /* Handle input exceptions and warnings */
  useEffect(()=>{ 
     
    if ( ethBalance && debouncedInput && ( ethers.utils.parseEther(debouncedInput).gt(ethBalance) ) ) {
      setWarningMsg(null);
      setErrorMsg('That amount exceeds your available ETH balance'); 
    } else if (ethBalance && debouncedInput && (ethers.utils.parseEther(debouncedInput).eq(ethBalance)) ) {
      setErrorMsg(null);
      setWarningMsg('If you deposit all your ETH you may not be able to make any further transactions!');
    } else if (debouncedInput && debouncedInput<=0.05) {
      setErrorMsg('Initial collateral balance must be larger than 0.05 ETH.');
      setWarningMsg(null);
    } else {
      setWarningMsg(null);
      setErrorMsg(null);
    }
  }, [debouncedInput]);

  return (
    <Keyboard 
      onEsc={() => setInputValue(undefined)}
      onEnter={()=> depositProcedure()}
      onBackspace={()=> inputValue && (document.activeElement !== inputRef) && setInputValue(debouncedInput.slice(0, -1))}
      target='document'
    >
      <CollateralDescriptor>
        <InfoGrid
          entries={[
            {
              label: 'Current Collateral',
              visible: !!account,
              active: true,
              loading: depositPending || txActive?.type ==='WITHDRAW',     
              value: ethPosted_ ? `${ethPosted_} Eth` : '0 Eth',
              valuePrefix: null,
              valueExtra: null,
            },
            {
              label: 'Collateralization Ratio',
              visible: !!account && collateralPercent_ > 0,
              active: collateralPercent_ > 0,
              loading: !ethPosted_ && depositPending && ethPosted_ !== 0,            
              value: (collateralPercent_ && (collateralPercent_ !== 0))? `${collateralPercent_}%`: '',
              valuePrefix: null,
              valueExtra: null, 
            },
            {
              label: 'Did you know?',
              visible: true,
              active: true,
              loading: false,            
              value: '',
              valuePrefix: null,
              valueExtra: ()=> ( 
                <Box>
                  <Text size='xxsmall'>Collateral posted here can be used to borrow Dai from any Yield series.</Text>                 
                </Box>
              ), 
            },

          ]}
        />
      </CollateralDescriptor>
      
      { withdrawOpen && <WithdrawEth close={()=>setWithdrawOpen(false)} /> }    
      { (!txActive || txActive?.type === 'WITHDRAW') &&
        <Box
          alignSelf="center"
          fill
          background="background-front"
          round='small'
          pad='large'
          gap='medium'
        >
          <Text alignSelf='start' size='xlarge' color='brand' weight='bold'>Amount to deposit</Text>

          <InputWrap errorMsg={errorMsg} warningMsg={warningMsg} disabled={depositDisabled}>
            <TextInput
              ref={(el:any) => {el && !withdrawOpen && el.focus(); setInputRef(el);}} 
              type='number'
              placeholder={(screenSize !== 'small' && !modalView) ? 'Enter the ETH amount to deposit': 'ETH'}
              value={inputValue || ''}
              disabled={postEthActive}
              plain
              onChange={(event:any) => setInputValue( cleanValue(event.target.value) )}
              icon={isLol ? <span role='img' aria-label='lol'>😂</span> : <EthMark />}
            />
            <RaisedButton
              label={(screenSize !== 'small' && !modalView) ? 'Deposit Maximum': 'Max'}
              onClick={()=>account && setInputValue(ethers.utils.formatEther(ethBalance))}
            />
          </InputWrap>

          <InfoGrid entries={[

            {
              label: 'Ratio after Deposit',
              visible: !!account,
              active: inputValue,
              loading: !ethPosted_ && depositPending && ethPosted_ !== 0,           
              value: (estRatio && estRatio !== 0)? `${estRatio}%`: `${collateralPercent_}%` || '',
              valuePrefix: '~',
              valueExtra: () => (
                <Text color='green' size='medium'> 
                  {/* { inputValue && collateralPercent_ && ( (estRatio-collateralPercent_) !== 0) && `(+ ${(estRatio-collateralPercent_).toFixed(0)}%)` } */}
                </Text>
              )
            },
            {
              label: 'Borrowing Power after deposit',
              visible: !!account,
              active: debouncedInput,
              loading: !ethPosted_ && depositPending && ethPosted_ !== 0,
              value: estPower? `${estPower} DAI`: '0 DAI',           
              valuePrefix: '~',
              valueExtra: null,
            },
            {
              label: 'First connect a wallet!',
              visible: !account && inputValue,
              active: inputValue,
              loading: false,            
              value: '',
              valuePrefix: null,
              valueExtra: () => (
                <RaisedButton
                  label={<Text size='small'>Connect a wallet</Text>}
                  onClick={()=>console.log('still to implement')}
                /> 
              )
            },
          ]}
          />

          {account &&  
            <ActionButton
              onClick={()=>depositProcedure()}
              label={`Deposit ${inputValue || ''} Eth`}
              disabled={depositDisabled}
              hasDelegatedPool={true}
            /> }

          { ethPosted_ > 0 &&

          <Box 
            direction='row'
            fill='horizontal'
            justify='between' 
            margin={{ top:'medium' }}
          >
            <FlatButton 
              onClick={()=>setActiveView(1)}
              label={
                <Box direction='row' gap='small' align='center'>
                  <ArrowLeft color='text-weak' />
                  <Box><Text size='xsmall' color='text-weak'>back to borrow</Text></Box>   
                </Box>
}
            />
            <FlatButton 
              onClick={()=>setWithdrawOpen(true)}
              label={
                <Box direction='row' gap='small' align='center'>
                  <Box><Text size='xsmall' color='text-weak'><Text weight='bold'>withdraw</Text> collateral</Text></Box>
                  <ArrowRight color='text-weak' />
                </Box>
}
            />
          </Box>}
       
        </Box>}
      { postEthActive && !txActive && <ApprovalPending /> } 
      { txActive && txActive.type !== 'WITHDRAW' && <TxStatus msg={`You are depositing ${inputValue} ETH`} tx={txActive} /> }
    </Keyboard>
  );
};

Deposit.defaultProps = { depositAmount: null, modalView: false };

export default Deposit;
