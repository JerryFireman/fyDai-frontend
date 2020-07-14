import React, { useEffect } from 'react';
import { Box, Button, Image, Select, TextInput, Text, Heading, Collapsible } from 'grommet';
import { 
  FiCheckCircle, 
  FiInfo as Info,
  FiHelpCircle as Help,
  FiChevronDown as CaretDown,
  FiSettings as SettingsGear,
} from 'react-icons/fi';

import SeriesSelector from './SeriesSelector';
import { SeriesContext } from '../contexts/SeriesContext';
import { YieldContext } from '../contexts/YieldContext';
import { NotifyContext } from '../contexts/NotifyContext';

import { useDealer } from '../hooks';

interface RepayActionProps {
  repayFn:any
  maxValue:number
}

function PaybackAction({ repayFn, maxValue }:RepayActionProps) {

  const { state: yieldState, actions: yieldActions } = React.useContext(YieldContext);
  const { deployedContracts } = yieldState;
  const { state: seriesState, actions: seriesActions } = React.useContext(SeriesContext);
  
  const { isLoading: positionsLoading, seriesAggregates, activeSeries, setActiveSeries } = seriesState;
  const {
    collateralAmount_,
    collateralRatio_,
    debtValue_,
    estimateRatio, // TODO << this is a function (basically just passed from hooks via context) >> 
  } = seriesAggregates;

  const { repay, repayActive }  = useDealer();
  const [inputValue, setInputValue] = React.useState<any>();
  const [repayDisabled, setRepayDisabled] = React.useState<boolean>(false);
  const [ selectorOpen, setSelectorOpen ] = React.useState<boolean>(false);

  const [ warningMsg, setWarningMsg] = React.useState<string|null>(null);
  const [ errorMsg, setErrorMsg] = React.useState<string|null>(null);

  // TODO: maybe split into a custom hook
  const { state: { pendingTxs } } = React.useContext(NotifyContext);
  const [txActive, setTxActive] = React.useState<any>(null);
  useEffect(()=>{
    setTxActive(pendingTxs.find((x:any)=> x.type === 'REPAY'));
  }, [ pendingTxs ]);

  const repayProcedure = async (value:number) => {
    await repay(deployedContracts.Dealer, 'ETH-A', activeSeries.maturity, value, 'yDai' );
    // yieldActions.updateUserData();
    seriesActions.refreshPositions([activeSeries]);
  };

  return (
    <>
      {selectorOpen && <SeriesSelector close={()=>setSelectorOpen(false)} /> }
      { !repayActive && !txActive &&
      <Box flex='grow' justify='between'>
        <Box gap='medium' align='center' fill='horizontal'>
          <Text alignSelf='start' size='xlarge' color='brand' weight='bold'>Choose a series</Text>
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
              fill
              pad='small'
              flex
            >
              { activeSeries? activeSeries.displayName : 'Loading...' }
            </Box>

            <Box justify='center'>
              <Box
                round
                onClick={()=>setSelectorOpen(true)}
                hoverIndicator='brand-transparent'
                border='all'
            // border={{ color:'brand' }}
                pad={{ horizontal:'small', vertical:'small' }}
                justify='center'
              >
                <Text size='xsmall'>Change series</Text>
              </Box>
            </Box>
          </Box>

          <Box fill gap='small' pad={{ horizontal:'medium' }}>
            <Box fill direction='row-responsive' justify='between'>
              <Box gap='small'>
                <Box direction='row' gap='small'>
                  <Text color='text-weak' size='xsmall'>Current Debt</Text>
                  <Help />
                </Box>
                <Text color='brand' weight='bold' size='large'> {activeSeries && `${activeSeries.wethDebtDai_.toFixed(2)} Dai`}  </Text>
              </Box>
            </Box>
          </Box>

          <Box fill gap='medium' margin={{ vertical:'large' }}>
            <Text alignSelf='start' size='xlarge' color='brand' weight='bold'>Amount to Repay</Text>
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
                  placeholder='Enter the amount of Dai to Repay'
                  value={inputValue}
                  disabled={repayDisabled}
                  plain
                  onChange={(event:any) => setInputValue(event.target.value)}
                />
              </Box>

              <Box justify='center'>
                <Box
                  round
                  onClick={()=>setInputValue(activeSeries.wethDebtDai_)}
                  hoverIndicator='brand-transparent'
                  border='all'
              // border={{ color:'brand' }}
                  pad={{ horizontal:'small', vertical:'small' }}
                  justify='center'
                >
                  <Text size='xsmall'>Repay max</Text>
                </Box>
              </Box>
            </Box>

          </Box>

          <Box
            fill='horizontal'
            round='medium'
            background={( !(inputValue>0) || repayDisabled) ? 'brand-transparent' : 'brand'}
            onClick={(!(inputValue>0) || repayDisabled)? ()=>{}:()=>repayProcedure(inputValue)}
            align='center'
            pad='medium'
          >
            <Text 
              weight='bold'
              size='large'
              color={( !(inputValue>0) || repayDisabled) ? 'text-weak' : 'text'}
            >
              {`Repay ${inputValue || ''} Dai`}
            </Text>
          </Box>
        </Box>
      </Box>}

      { repayActive && !txActive &&
        <Box>Awaiting transaction approval</Box>}

      { txActive &&
        <Box align='center' flex='grow' justify='between' gap='large'>
          <Box gap='medium' align='center' fill='horizontal'>
            <Text size='xlarge' color='brand' weight='bold'>Good One!</Text>
            <Box
            // direction='row-responsive'
              fill='horizontal'
              gap='large'
              align='center'
            >
              <Text>Repayment of  {inputValue} Dai</Text>
              <Text>Transaction Pending: </Text>
              <Box
                fill='horizontal'
                round='medium'
                background='brand'
                onClick={()=>console.log('Going to etherscan')}
                align='center'
                pad='medium'
              >
                <Text
                  weight='bold'
                  size='large'
                >
                  View on Etherscan
                </Text>
              </Box>
            </Box>
          </Box>
        </Box>}
    </>
  );
}

export default PaybackAction;
