import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import Moment from 'moment';
import { Keyboard, Box, Button, TextInput, Text, ThemeContext, ResponsiveContext } from 'grommet';

import { ScaleLoader } from 'react-spinners';

import { 
  FiClock as Clock,
  FiHelpCircle as Help,
} from 'react-icons/fi';

import SeriesDescriptor from '../components/SeriesDescriptor';
import SeriesSelector from '../components/SeriesSelector';
import InlineAlert from '../components/InlineAlert';
import InputWrap from '../components/InputWrap';

import DaiMark from '../components/logos/DaiMark';

import OnceOffAuthorize from '../components/OnceOffAuthorize';
import ApprovalPending from '../components/ApprovalPending';
import TransactionPending from '../components/TransactionPending';

import { YieldContext } from '../contexts/YieldContext';
import { SeriesContext } from '../contexts/SeriesContext';
import { NotifyContext } from '../contexts/NotifyContext';

import { UserContext } from '../contexts/UserContext';

import { useController, usePool, useYDai, useMath, useProxy, useTxActive, useToken, useSignerAccount } from '../hooks';
import InfoGrid from '../components/InfoGrid';

interface IBorrowProps {
  borrowAmount?:number|null;
}

const Borrow = ({ borrowAmount }:IBorrowProps) => {

  const { state: yieldState, actions: yieldActions } = React.useContext(YieldContext);
  const { deployedContracts } = yieldState;

  const { state: seriesState, actions: seriesActions } = React.useContext(SeriesContext);
  const { activeSeries } = seriesState; 

  const { state: userState, actions: userActions } = React.useContext(UserContext);
  const { position } = userState;
  const { 
    // ethBorrowingPower_: maximumDai, 
    maxDaiAvailable_: maximumDai,
    collateralPercent_,
  } = position;

  const theme:any = React.useContext(ThemeContext);

  const screenSize = React.useContext(ResponsiveContext);

  const { 
    addControllerDelegate,
    checkControllerDelegate,
    borrow,
    borrowActive: noProxyBorrowActive,
  }  = useController();

  const { 
    previewPoolTx,
    addPoolDelegate,
    checkPoolDelegate
  }  = usePool();

  const { borrowUsingExactDai, borrowActive } = useProxy();
  const { approveToken, approveActive } = useToken();
  const { userAllowance } = useYDai();
  const { 
    yieldAPR, 
    estCollRatio: estimateRatio
  } = useMath();
  const { account } = useSignerAccount();

  /* internal component state */
  const [ borrowDisabled, setBorrowDisabled ] = React.useState<boolean>(true);

  const [ indicatorColor, setIndicatorColor ] = React.useState<string>('brand');
  const [ warningMsg, setWarningMsg] = React.useState<string|null>(null);
  const [ errorMsg, setErrorMsg] = React.useState<string|null>(null);

  /* flags */ 
  const [ hasDelegated, setHasDelegated] = React.useState<boolean>(activeSeries?.hasDelegatedController || true);

  const [ borrowPending, setBorrowPending ] = React.useState<boolean>(false);
  const [ delegationPending, setDelegationPending ] = useState<boolean>(false);

  /* token balances and values */
  const [ inputValue, setInputValue ] = React.useState<any>(borrowAmount || undefined);
  const [ yDaiValue, setYDaiValue ] = React.useState<number>(0);
  const [ APR, setAPR ] = React.useState<number>();
  const [ estRatio, setEstRatio ] = React.useState<any>(0);

  const [ approved, setApproved ] = React.useState<any>(0);
  const [ daiApproved, setDaiApproved ] = React.useState<any>(0);

  const [ txActive ] = useTxActive(['BORROW', 'BUY', 'DELEGATION']);

  const borrowProcedure = async (value:number, autoSell:boolean=true) => {

    if (account && inputValue>0 && !borrowDisabled) {
      setBorrowPending(true); 
      autoSell && await borrowUsingExactDai( activeSeries.daiProxyAddress, 'ETH-A', activeSeries.maturity, yDaiValue, value);
      !autoSell && await borrow(deployedContracts.Controller, 'ETH-A', activeSeries.maturity, value);
      setInputValue('');
      await Promise.all([
        userActions.updatePosition(),
        seriesActions.updateActiveSeries()
      ]);
      setBorrowPending(false);
    }
  };

  const delegateProcedure = async () => {
    setDelegationPending(true);
    // TODO uncomment the following lines if not using auto sell?
    // await addPoolDelegate(activeSeries.poolAddress, activeSeries.yDaiAddress);
    // const res = await checkPoolDelegate(activeSeries.poolAddress, activeSeries.yDaiAddress);
    await addControllerDelegate(deployedContracts.Controller, activeSeries.daiProxyAddress);
    const res = await checkControllerDelegate(deployedContracts.Controller, activeSeries.daiProxyAddress);
    setHasDelegated(res);
    await seriesActions.updateActiveSeries();
    setDelegationPending(false);
  };

  /* 
  * Handle input changes:
  * 1. dai to yDai conversion and get APR (yDai needed to compare with the approved allowance)
  * 2. calcalute yield APR
  * 3. calculate estimated collateralisation ration
  */
  useEffect(() => {
     
    activeSeries && inputValue > 0 && ( async () => {
      const newRatio = estimateRatio(position.ethPosted_, ( position.debtValue_+ parseFloat(inputValue)) ); 
      newRatio && setEstRatio(newRatio.toFixed(0));
      const preview = await previewPoolTx('buyDai', activeSeries.poolAddress, inputValue);
      if (!preview.isZero()) {
        setYDaiValue( parseFloat(ethers.utils.formatEther(preview)) );
        setAPR( yieldAPR( ethers.utils.parseEther(inputValue.toString()), preview, activeSeries.maturity ) );      
        setWarningMsg(null);
        setErrorMsg(null);
      } else {
        /* if the market doesnt have liquidity just estimate from rate */
        const rate = await previewPoolTx('buyDai', activeSeries.poolAddress, 1);
        setYDaiValue(inputValue* parseFloat((ethers.utils.formatEther(rate))) );
        setBorrowDisabled(true);
        setErrorMsg('The Pool doesn\'t have the liquidity to support a transaction of that size just yet.');
      }
    })();
  }, [inputValue, activeSeries]);

  /* check delegation status on series change */
  useEffect(() => {
    activeSeries && ( async ()=>{
      setHasDelegated(activeSeries.hasDelegatedController);
    })();
  }, [ activeSeries ]);
    
  /* Handle borrow disabling deposits */
  useEffect(()=>{
    (
      !account ||
      !hasDelegated || 
      (inputValue && inputValue>0)
    )? setBorrowDisabled(true): setBorrowDisabled(false);
  }, [ inputValue, hasDelegated ]);

  /* Handle collateralisation ratio exceptions and warnings */
  useEffect(()=>{
    if (estRatio && estRatio <= 1.5) {
      setBorrowDisabled(true);
      setIndicatorColor('red');
      setWarningMsg(null);
      setErrorMsg('That amount exceeds the amount of DAI you can borrow based on your collateral'); 
    } else if (estRatio > 1.5 && estRatio < 2.0 ) {
      setIndicatorColor('orange');
      setErrorMsg(null);
      setWarningMsg('Borrowing that much will put you at risk of liquidation');
    } else {
      setIndicatorColor('brand');
      setWarningMsg(null);
      setErrorMsg(null);
    }
  }, [ estRatio ]);

  /* Handle input execption logic */
  useEffect(() => {
    if ( inputValue && ( inputValue > maximumDai ) ) {
      console.log(inputValue, maximumDai);
      setWarningMsg(null);
      setErrorMsg('That amount exceeds the amount of DAI you can borrow based on your collateral'); 
    } else if (inputValue && ( inputValue > Math.round(maximumDai-1) ) ) {
      setErrorMsg(null);
      setWarningMsg('If you borrow right up to your maximum allowance, there is high probability you will be liquidated!');
    } else {
      setWarningMsg(null);
      setErrorMsg(null);
    }
  }, [ inputValue ]);


  /* ADVANCED SETTINGS setting approval limit. */
  const approveProcedure = async (value:number) => { 
    await approveToken(activeSeries.yDaiAddress, activeSeries.marketAddress, value);
    const approvedYDai = await userAllowance(activeSeries.yDaiAddress, activeSeries.marketAddress);
    setApproved( approvedYDai ); // TODO convert to Dai somehow
  };

  /* ADVANCED SETTINGS Handle yDai to Dai conversion for the approved Dai */
  useEffect(() => {
    approved && ( async () => {
      const preview = await previewPoolTx('SellYDai', activeSeries.poolAddress, approved);
      if (!preview.isZero()) {
        setDaiApproved( parseFloat(ethers.utils.formatEther(preview)) );
      } else {
        /* market doesn't have liquidity - estimate from a rate */
        const rate = await previewPoolTx('SellYDai', activeSeries.poolAddress, 1);
        setDaiApproved( approved*parseFloat(ethers.utils.formatEther(rate)) );
      }
    })();
  }, [ approved ]);



  return (
    <Keyboard 
      onEsc={() => setInputValue(undefined)}
      onEnter={()=> borrowProcedure(inputValue)}
      target='document'   
    >
      <>
        { txActive?.type !== 'BORROW' && txActive?.type !== 'BUY' &&
        <Box flex='grow' justify='between'>
          <Box gap='medium' align='center' fill='horizontal'>
            <Text alignSelf='start' size='xlarge' color='brand' weight='bold'>Selected series</Text>

            <SeriesDescriptor activeView='borrow' />

            <InfoGrid entries={[
              {
                label: 'Current Debt',
                visible: !!account && activeSeries && !activeSeries?.isMature || (activeSeries?.isMature && activeSeries?.ethDebtYDai_ > 0 ),
                active: true,
                loading: borrowPending,    
                value: activeSeries?.ethDebtYDai_? `${activeSeries.ethDebtYDai_.toFixed(2)} DAI`: '0 DAI',
                valuePrefix: null,
                valueExtra: null, 
              },
              {
                label: 'Max Borrowing Power',
                visible: activeSeries && !activeSeries.isMature  && !!account,
                active: maximumDai,
                loading: borrowPending,           
                value: maximumDai ? `${maximumDai.toFixed(2)} DAI`: '',
                valuePrefix: 'Approx.',
                valueExtra: null,
              },
              {
                label: 'Repay Debt',
                visible: !!account && activeSeries?.isMature && activeSeries?.ethDebtYDai_ > 0,
                active: true,
                loading: false,    
                value: '',
                valuePrefix: null,
                valueExtra: () => (
                  <Button
                    color='brand-transparent'
                    label={<Text size='xsmall' color='brand'>Repay debt</Text>}
                    onClick={()=>console.log('still to implement')}
                    hoverIndicator='brand-transparent'
                  /> 
                ),
              },
            ]}
            />     
            {account && !hasDelegated && !activeSeries?.isMature &&
            <OnceOffAuthorize
              authProcedure={delegateProcedure} 
              authMsg='Allow Yield trade on your behalf'
              awaitingApproval={delegationPending && !txActive}
              txPending={txActive?.type === 'DELEGATION'}  
            />}
            { activeSeries && !activeSeries.isMature? 
              <>
                <Text alignSelf='start' size='xlarge' color='brand' weight='bold'>Amount to borrow</Text>

                <InputWrap errorMsg={errorMsg} warningMsg={warningMsg} disabled={borrowDisabled}>
                  <TextInput
                    type="number"
                    placeholder={screenSize !== 'small' ? 'Enter the amount of DAI to borrow': 'DAI'} 
                    value={inputValue || ''}
                // disabled={depositDisabled}
                    plain
                    onChange={(event:any) => setInputValue(event.target.value)}
                    icon={<DaiMark />}
                  />
                </InputWrap>

                <InfoGrid entries={[
                  {
                    label: 'Estimated APR',
                    visible: true,
                    active: inputValue,
                    loading: false,     
                    value: APR?`${APR.toFixed(2)}%`: `${activeSeries? activeSeries.yieldAPR_: ''}%`,
                    valuePrefix: null,
                    valueExtra: null, 
                  },
                  {
                    label: 'Approx. DAI owed at maturity',
                    visible: true,
                    active: inputValue,
                    loading: false,           
                    value: `${yDaiValue.toFixed(2)} DAI`,
                    valuePrefix: null,
                  // valueExtra: () => (
                  //   <Text size='xxsmall'>
                  //     {activeSeries && Moment(activeSeries.maturity_).format('DD MMMM YYYY')}
                  //   </Text>
                  // ),
                  },

                  {
                    label: 'Ratio after Borrow',
                    visible: !!account,
                    active: inputValue,
                    loading: false,            
                    value: (estRatio && estRatio !== 0)? `${estRatio}%`: collateralPercent_ || '',
                    valuePrefix: 'Approx.',
                    valueExtra: () => (
                      <Text color='red' size='small'> 
                        { inputValue && estRatio && ( (collateralPercent_- estRatio) !== 0) && `(- ${(collateralPercent_- estRatio).toFixed(0)}%)` }
                      </Text>
                    )
                  },
                  {
                    label: 'Like what you see?',
                    visible: !account,
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

                { account &&          
                <Box
                  fill='horizontal'
                  round='small' 
                  background={!(inputValue>0) || borrowDisabled ? 'brand-transparent' : 'brand'} 
                  onClick={()=>borrowProcedure(inputValue)} 
            // onClick={()=>borrowProcedure(inputValue)}
                  align='center'
                  pad='small'
                >
                  <Text 
                    weight='bold'
                    size='large'
                    color={!(inputValue>0) || borrowDisabled ? 'text-xweak' : 'text'}
                  >
                    {`Borrow ${inputValue || ''} DAI`}
                  </Text>
                </Box>}

              </>
              : 

              <Box 
                gap='medium' 
                margin={{ vertical:'large' }}  
                pad='medium'     
                round='small'
                fill='horizontal'
                border='all'
              >    
                <Box direction='row' gap='small' align='center' fill>          
                  <Box>
                    <Clock />
                  </Box>
                  <Box> 
                    <Text size='xlarge' color='brand' weight='bold'>This series has matured.</Text>         
                  </Box>
                </Box>             
              </Box>}

          </Box>
        </Box> }

        { borrowActive && !txActive && <ApprovalPending /> } 
        { txActive && txActive !== 'DELEGATION' && <TransactionPending msg={`You borrowed ${inputValue} DAI.`} tx={txActive} /> }
      </>
    </Keyboard>
  );
};

Borrow.defaultProps = { borrowAmount: null };

export default Borrow;
