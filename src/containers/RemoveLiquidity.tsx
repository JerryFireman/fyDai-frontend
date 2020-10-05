import React, { useState, useContext, useEffect } from 'react';
import { ethers } from 'ethers';
import { Box, Button, Layer, TextInput, Text, Keyboard, ThemeContext, ResponsiveContext, Collapsible } from 'grommet';
import { 
  FiArrowLeft as ArrowLeft,
} from 'react-icons/fi';
import YieldMark from '../components/logos/YieldMark';

import { cleanValue } from '../utils';

import { SeriesContext } from '../contexts/SeriesContext';
import { YieldContext } from '../contexts/YieldContext';
import { UserContext } from '../contexts/UserContext';

import { useSignerAccount, useProxy, useTxActive, useDebounce, useIsLol } from '../hooks';

import InputWrap from '../components/InputWrap';
import InfoGrid from '../components/InfoGrid';
import ApprovalPending from '../components/ApprovalPending';
import TxStatus from '../components/TxStatus';
import RaisedButton from '../components/RaisedButton';
import ActionButton from '../components/ActionButton';
import FlatButton from '../components/FlatButton';

interface IRemoveLiquidityProps {
  close?: any;
}

const RemoveLiquidity = ({ close }:IRemoveLiquidityProps) => {

  const screenSize = useContext(ResponsiveContext);

  const { state: yieldState, actions: yieldActions } = useContext(YieldContext);
  const { state: seriesState, actions: seriesActions } = useContext(SeriesContext);
  const { activeSeries  } = seriesState;
  const { state: userState, actions: userActions } = useContext(UserContext);

  const { account } = useSignerAccount();
  const { removeLiquidity } = useProxy();
  const [ txActive ] = useTxActive(['REMOVE_LIQUIDITY']);

  const [newShare, setNewShare] = useState<string>(activeSeries?.poolPercent);
  const [calculating, setCalculating] = useState<boolean>(false);

  const [ inputValue, setInputValue ] = useState<any>();
  const debouncedInput = useDebounce(inputValue, 500);
  const [inputRef, setInputRef] = useState<any>(null);

  const [ removeLiquidityDisabled, setRemoveLiquidityDisabled ] = useState<boolean>(true);
  const [ removeLiquidityPending, setRemoveLiquidityPending] = useState<boolean>(false);

  const [ warningMsg, setWarningMsg] = useState<string|null>(null);
  const [ errorMsg, setErrorMsg] = useState<string|null>(null);
  const isLol = useIsLol(inputValue);


  /* Remove Liquidity sequence */
  const removeLiquidityProcedure = async (value:number) => {
    if ( !removeLiquidityDisabled ) {
      setRemoveLiquidityPending(true);
      await removeLiquidity(activeSeries, value);
      setInputValue(undefined);
      if (activeSeries?.isMature()) {
        await Promise.all([
          userActions.updatePosition(),
          seriesActions.updateActiveSeries()
        ]);
      } else {
        userActions.updatePosition();
        seriesActions.updateActiveSeries();
      }
      setRemoveLiquidityPending(true);
      !activeSeries?.isMature() && close();
    }
  };

  const calculateNewShare = async () => {
    setCalculating(true);
    const newBalance = activeSeries.poolTokens.sub(ethers.utils.parseEther(debouncedInput));
    const percent= ( parseFloat(ethers.utils.formatEther(newBalance)) / parseFloat(ethers.utils.formatEther(activeSeries.totalSupply)) )*100;
    setNewShare(percent.toFixed(4));
    setCalculating(false);
  };

  /* handle value calculations based on input changes */
  useEffect(() => {
    debouncedInput && calculateNewShare();
  }, [debouncedInput]);

  /* handle warnings input errors */
  useEffect(() => {
    if ( debouncedInput && (activeSeries.poolTokens.sub(ethers.utils.parseEther(debouncedInput)).lt(ethers.constants.Zero)) ) {
      setWarningMsg(null);
      setErrorMsg('That amount exceeds the amount of tokens you have'); 
    } else {
      // setLendDisabled(false);
      setWarningMsg(null);
      setErrorMsg(null);
    }
  }, [ debouncedInput ]);

  /* Remove Liquidity disabling logic */
  useEffect(()=>{
    if (
      !account ||
      !inputValue ||
      (activeSeries?.poolTokens?.sub(ethers.utils.parseEther(inputValue)) < 0) ||
      parseFloat(inputValue) <= 0
    ) {
      setRemoveLiquidityDisabled(true);
    } else {
      setRemoveLiquidityDisabled(false);
    }
  }, [ inputValue ]);


  return (
    <Keyboard 
      onEsc={() => { inputValue? setInputValue(undefined): close();}}
      onEnter={()=> removeLiquidityProcedure(inputValue)}
      onBackspace={()=> inputValue && (document.activeElement !== inputRef) && setInputValue(debouncedInput.toString().slice(0, -1))}
      target='document'
    >
      {!txActive && !removeLiquidityPending && 
      <Box 
        width={screenSize!=='small'?{ min:'600px', max:'600px' }: undefined}
        alignSelf='center'
        fill
        background='background-front'
        round='small'
        pad='large'
        gap='medium'
      >
        <Text alignSelf='start' size='large' color='text' weight='bold'>Remove Liquidity Tokens</Text>
        <InputWrap errorMsg={errorMsg} warningMsg={warningMsg} disabled={removeLiquidityDisabled}>
          <TextInput
            ref={(el:any) => {el && el.focus(); setInputRef(el);}} 
            type="number"
            placeholder='Tokens to remove'
            value={inputValue || ''}
            plain
            onChange={(event:any) => setInputValue(( cleanValue(event.target.value), 6 ))}
            icon={isLol ? <span role='img' aria-label='lol'>😂</span> : <YieldMark />}
          />
          <RaisedButton 
            label='Maximum'
            onClick={()=>setInputValue( cleanValue(ethers.utils.formatEther(activeSeries?.poolTokens), 6) )}
          />
        </InputWrap>
        <Box fill>
          <Collapsible open={!!inputValue&&inputValue>0}>
            <InfoGrid entries={[
              {
                label: 'Current Token Balance',
                visible: true,
                active: true,
                loading: false,     
                value: activeSeries?.poolTokens_,
                valuePrefix: null,
                valueExtra: null, 
              },
              {
                label: 'Share of the Pool After withdraw',
                visible: true,
                active: inputValue,
                loading: calculating,           
                value: parseFloat(newShare)>=0 ? `${newShare}%`: '',
                valuePrefix: null,
                valueExtra: null, 
              },
              {
                label: 'Like what you see?',
                visible: false,
                active: inputValue,
                loading: false,            
                value: '',
                valuePrefix: null,
                valueExtra: () => (
                  <Button
                    color='brand-transparent'
                    label={<Text size='xsmall' color='brand'>Connect a wallet</Text>}
                    onClick={()=>console.log('still to implement')}
                    hoverIndicator='brand-transparent'
                  /> 
                )
              },
            ]}
            />
          </Collapsible>
        </Box>

        <ActionButton
          onClick={()=> removeLiquidityProcedure(inputValue)}
          label={`Remove ${inputValue || ''} tokens`}
          disabled={removeLiquidityDisabled}
          hasDelegatedPool={activeSeries.hasDelegatedPool}
        />

        {!activeSeries?.isMature() &&
        <Box alignSelf='start' margin={{ top:'medium' }}>
          <FlatButton 
            onClick={()=>close()}
            label={
              <Box direction='row' gap='medium' align='center'>
                <ArrowLeft color='text-weak' />
                <Text size='small' color='text-weak'> go back </Text>
              </Box>
                }
          />
        </Box>}
        
      </Box>}
      { removeLiquidityPending && !txActive && <ApprovalPending /> }   
      { txActive && 
      <Box 
        width={{ max:'600px' }}
        alignSelf='center'
        fill
        background='background-front'
        round='small'
        pad='large'
        gap='medium'
        justify='between'
      > 
        <TxStatus msg={`You are removing ${inputValue} liquidity tokens`} tx={txActive} />
                
        <Box alignSelf='start'>
          <Box
            round
            onClick={()=>close()}
            hoverIndicator='brand-transparent'
            pad={{ horizontal:'small', vertical:'small' }}
            justify='center'
          >
            <Box direction='row' gap='small' align='center'>
              <ArrowLeft color='text-weak' />
              <Text size='xsmall' color='text-weak'> { !removeLiquidityPending? 'cancel, and go back.': 'go back'}  </Text>
            </Box>
          </Box>
        </Box>
      </Box>}
    </Keyboard>
  );
};

RemoveLiquidity.defaultProps={ close:null };

export default RemoveLiquidity;
