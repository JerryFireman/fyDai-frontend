import React, { useState, useContext, useEffect } from 'react';
import { Box, Button, Image, TextInput, Text, Paragraph, Layer } from 'grommet';
import { 
  FiInfo as Info,
  FiArrowRight as ArrowRight,
} from 'react-icons/fi';

import { FaEthereum as Ethereum } from 'react-icons/fa';

import { SeriesContext } from '../contexts/SeriesContext';
import { YieldContext } from '../contexts/YieldContext';

import WithdrawAction from './WithdrawAction';

import { useEthProxy } from '../hooks';

interface DepositProps {
  deposit?:any
  convert?:any
  maxValue?:number
  disabled?:boolean
}

const DepositAction = ({ disabled, deposit, convert, maxValue }:DepositProps) => {

  const [ estRatio, setEstRatio ] = useState<any>(0);
  const [ estIncrease, setEstIncrease ] = useState<any>(0); 
  const [ inputValue, setInputValue ] = useState<any>();
  const [ depositDisabled, setDepositDisabled ] = useState<boolean>(false);
  const [ withdrawOpen, setWithdrawOpen ] = useState<boolean>(false);

  const [ warningMsg, setWarningMsg] = useState<string|null>(null);
  const [ errorMsg, setErrorMsg] = useState<string|null>(null);

  const { state: yieldState } = useContext(YieldContext);
  const { deployedContracts } = yieldState;

  const { state: seriesState } = useContext(SeriesContext);
  const { userData: { ethBalance_ } } = yieldState;
  const { seriesTotals } = seriesState;
  const {
    collateralAmount_,
    collateralRatio_,
    debtValue_,
    estimateRatio, // TODO << this is a function (basically just passed from hooks via context) >> 
  } = seriesTotals;

  const { postEth, postEthActive }  = useEthProxy();

  const depositProcedure = async (value:number) => {
    await postEth(deployedContracts.EthProxy, value);
    // actions.updateUserData(state.deployedContracts, state.deployedContracts);
    // actions.updateYieldBalances(state.deployedContracts);
  };

  useEffect(()=>{
    if (inputValue && collateralAmount_ && debtValue_) {
      const newRatio = estimateRatio((collateralAmount_+ parseFloat(inputValue)), debtValue_); 
      setEstRatio(newRatio.toFixed(0));
      const newIncrease = newRatio - collateralRatio_ ;
      setEstIncrease(newIncrease.toFixed(0));
    }
    if ( inputValue && ( inputValue > ethBalance_) ) {
      setDepositDisabled(true);
      setWarningMsg(null);
      setErrorMsg('That amount exceeds your available ETH balance'); 
    } else if (inputValue && (inputValue === ethBalance_) ) {
      setErrorMsg(null);
      setWarningMsg('If you deposit all your ETH you may not be able to make any further transactions!');
    } else {
      setDepositDisabled(false);
      setWarningMsg(null);
      setErrorMsg(null);
    }
  }, [inputValue]);

  return (
    <>
      { withdrawOpen && <WithdrawAction close={()=>setWithdrawOpen(false)} /> }
      <Box align='center' flex='grow' justify='between' gap='large'>
        <Box gap='medium' align='center' fill='horizontal'>
          <Text alignSelf='start' size='xlarge' color='brand' weight='bold'>Amount to deposit</Text>
          <Box
            direction='row-responsive'
            fill='horizontal'
            gap='small'
            align='center'
          >
            <Box 
              round='medium'
              background='brand-transparent'
              direction='row'
              fill='horizontal'
              pad='small'
              flex
            >
              <TextInput
                type="number"
                placeholder='Enter the amount to deposit in Eth'
                value={inputValue}
                plain
                onChange={(event:any) => setInputValue(event.target.value)}
              // icon={<Text alignSelf='start' size='xsmall'>Eth</Text>}
                icon={<Ethereum />}
              />
            </Box>

            <Box justify='center'>
              <Box
                round
                onClick={()=>setInputValue(ethBalance_)}
                hoverIndicator='brand-transparent'
                border='all'
              // border={{ color:'brand' }}
                pad={{ horizontal:'small', vertical:'small' }}
                justify='center'
              >
                <Text size='xsmall'>Use max</Text>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* <Box
        round='small'
        onClick={()=>console.log('maker vault clickced')}
        hoverIndicator='secondary-transparent'
        border='all'
        fill='horizontal'
        pad={{ horizontal:'xsmall', vertical:'xsmall' }}
        align='center'
      >
        <Text size='xsmall'>Convert a Maker vault</Text>
      </Box> */}

        <Box fill direction='row-responsive' justify='evenly'>

          <Box gap='small'>
            <Text color='text-weak' size='xsmall'>Current Collateral</Text>
            <Text color='brand' weight='bold' size='large'> {collateralAmount_? `${collateralAmount_} Eth` : '-' }</Text>
            { false && 
            <Box pad='xsmall'>
              <Text alignSelf='start' size='xxsmall'>
                <Info /> You need to deposit collateral in order to Borrow Dai.
              </Text>
            </Box>}
          </Box>

          <Box gap='small'>
            <Text color='text-weak' size='xsmall'>Collateralisation Ratio</Text>
            <Text color='brand' weight='bold' size='large'> 
              { collateralRatio_? `${collateralRatio_}%` : '-' }
            </Text>
          
            { false && 
            <Box pad='xsmall'>
              <Text alignSelf='start' size='xxsmall'>
                <Info /> Collateral value should be well above 150% to be safe from liquidation. Either increase your collateral amount or repay some existing debt. 
              </Text>
            </Box>}
          </Box>

          <Box gap='small'>
            <Text color='text-weak' size='xsmall'>Ratio after deposit</Text>
            <Box direction='row' gap='small'>
              <Text color={!inputValue? 'brand-transparent': 'brand'} weight='bold' size='large'> 
                {(estRatio && estRatio !== 0)? `~${estRatio}%`: collateralRatio_ || '-' }
              </Text>
              { true &&
              <Text color='green' size='large'> 
                { inputValue && (estIncrease !== 0) && `(+ ${estIncrease}%)` }
              </Text>}
            </Box>
            {/* <Text color='text-weak' size='xxsmall'>if you deposit {inputValue||0} Eth</Text> */}
          </Box>

        </Box>

        { warningMsg &&
        <Box 
          border={{ color:'orange' }} 
          fill
          round='small'
          pad='small'
        >
          <Text weight='bold' color='orange'>Procced with Caution:</Text>  
          <Text color='orange'>{warningMsg}</Text>
        </Box> }

        { errorMsg &&
        <Box
          border={{ color:'red' }}
          fill
          round='small'
          pad='small'
        >
          <Text weight='bold' color='red'>Wooah, Hang on</Text>  
          <Text color='red'>{errorMsg}</Text>
        </Box> }

        <Box
          fill='horizontal'
          round='medium'
          background={( !(inputValue>0) || depositDisabled) ? 'brand-transparent' : 'brand'}
          onClick={(!(inputValue>0) || depositDisabled)? ()=>{}:()=>depositProcedure(inputValue)}
          align='center'
          pad='medium'
        >
          <Text
            weight='bold'
            size='large'
            color={( !(inputValue>0) || depositDisabled) ? 'text-xweak' : 'text'}
          >
            {`Deposit ${inputValue || ''} Eth`}
          </Text>
        </Box>

        <Box alignSelf='end'>
          <Box
            round
            onClick={()=>setWithdrawOpen(true)}
            hoverIndicator='brand-transparent'
          // border='all'
            pad={{ horizontal:'small', vertical:'small' }}
            justify='center'
          >
            <Box direction='row' gap='small'>
              <Text size='xsmall' color='text-weak'> alternatively, withdraw collateral</Text>
              <ArrowRight color='text-weak' />
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default DepositAction;
