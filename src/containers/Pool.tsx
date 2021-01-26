import React, { useEffect, useState, useContext } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import { Box, Keyboard, TextInput, Text, ResponsiveContext, Collapsible, Layer, CheckBox } from 'grommet';
import { FiArrowRight as ArrowRight } from 'react-icons/fi';
import { VscHistory as History } from 'react-icons/vsc';

/* utils and support */
import { cleanValue, nFormatter } from '../utils';
import { divDecimal, mulDecimal, calcTokensMinted } from '../utils/yieldMath';
import { logEvent } from '../utils/analytics';

/* contexts */
import { YieldContext } from '../contexts/YieldContext';
import { SeriesContext } from '../contexts/SeriesContext';
import { UserContext } from '../contexts/UserContext';

/* hooks */ 
import { useSignerAccount } from '../hooks/connectionHooks';
import { useDebounce, useIsLol } from '../hooks/appHooks';
import { useToken } from '../hooks/tokenHook';
import { useTxActive } from '../hooks/txHooks';
import { usePoolProxy } from '../hooks/poolProxyHook';

/* containers */ 
import RemoveLiquidity from './RemoveLiquidity';

/* components */
import InfoGrid from '../components/InfoGrid';
import InputWrap from '../components/InputWrap';
import TxStatus from '../components/TxStatus';
import SeriesDescriptor from '../components/SeriesDescriptor';
import RaisedButton from '../components/RaisedButton';
import ActionButton from '../components/ActionButton';
import FlatButton from '../components/FlatButton';
import SeriesMatureBox from '../components/SeriesMatureBox';
import TxHistory from '../components/TxHistory';
import HistoryWrap from '../components/HistoryWrap';
import RaisedBox from '../components/RaisedBox';
import DaiMark from '../components/logos/DaiMark';
import YieldMobileNav from '../components/YieldMobileNav';
import Loading from '../components/Loading';


interface IPoolProps {
  openConnectLayer:any;
}

  
const Pool = ({ openConnectLayer }:IPoolProps) => {

  const { amnt }:any = useParams(); /* check if the user sent in any requested amount in the url */
  const mobile:boolean = ( useContext<any>(ResponsiveContext) === 'small' );

  /* state from contexts */
  const { state: { deployedContracts } } = useContext(YieldContext);
  const { state: { activeSeriesId, seriesData }, actions: seriesActions } = useContext(SeriesContext);
  const activeSeries = seriesData.get(activeSeriesId);
  const { state: userState, actions: userActions } = useContext(UserContext);
  const { daiBalance } = userState.position;
  const { useBuyToAddLiquidity } = userState.preferences;

  /* local state */ 
  const [ hasDelegated ] = useState<boolean>(true);
  const [ inputValue, setInputValue ] = useState<any>(amnt || undefined);
  const [inputRef, setInputRef] = useState<any>(null);
  const [ removeLiquidityOpen, setRemoveLiquidityOpen ] = useState<boolean>(false);
  const [ histOpen, setHistOpen ] = useState<boolean>(false);
  const [ addLiquidityDisabled, setAddLiquidityDisabled ] = useState<boolean>(true);
  const [ warningMsg, setWarningMsg] = useState<string|null>(null);
  const [ errorMsg, setErrorMsg] = useState<string|null>(null);

  /* init hooks */
  const { addLiquidity } = usePoolProxy();
  const { getBalance } = useToken();
  const [newPoolShare, setNewPoolShare] = useState<string>();
  const [calculating, setCalculating] = useState<boolean>(false);
  const { account } = useSignerAccount();
  const [ txActive ] = useTxActive(['ADD_LIQUIDITY', 'REMOVE_LIQUIDITY']);
  const [ removeTxActive ] = useTxActive(['REMOVE_LIQUIDITY']);
  const debouncedInput = useDebounce(inputValue, 500);
  const isLol = useIsLol(inputValue);
  
  /* execution procedure */ 
  const addLiquidityProcedure = async () => { 
    if (inputValue && !addLiquidityDisabled ) {
 
      await addLiquidity( activeSeries, inputValue );
      logEvent({
        category: 'Pool',
        action: inputValue,
        label: activeSeries.displayName || activeSeries.poolAddress,
      });
      
      /* clean up and refresh */ 
      setInputValue(undefined);
      await Promise.all([
        userActions.updateUser(),
        seriesActions.updateSeries([activeSeries]),
      ]);

    }   
  };

  // TODO move to mathHooks 
  const calculateNewPoolShare = async () => {
    setCalculating(true);
    const daiReserves = await getBalance(deployedContracts.Dai, 'Dai', activeSeries.poolAddress);
    const fyDaiReserves = await getBalance(activeSeries.fyDaiAddress, 'FYDai', activeSeries.poolAddress);
    const _newTokens = calcTokensMinted(
      daiReserves, 
      fyDaiReserves, 
      activeSeries.totalSupply, 
      ethers.utils.parseEther(debouncedInput)
    );
    const _newBalance = _newTokens.add(activeSeries.poolTokens);
    const _newTotalSupply = activeSeries.totalSupply.add(_newTokens);
    const _ratio = divDecimal( _newBalance, _newTotalSupply );
    const _percent = mulDecimal( _ratio, '100'); 
    setNewPoolShare(cleanValue(_percent, 4));
    setCalculating(false);
  };

  /* handle value calculations based on input changes */
  useEffect(()=>{
    activeSeries && debouncedInput && calculateNewPoolShare();
  }, [debouncedInput]);
  
  /* Add liquidity disabling logic */
  useEffect(()=>{
    (
      ( inputValue && daiBalance && ethers.utils.parseEther(inputValue).gt(daiBalance) ) ||  
      !account ||
      !hasDelegated ||
      !inputValue ||
      parseFloat(inputValue) <= 0
    )? setAddLiquidityDisabled(true): setAddLiquidityDisabled(false);
  }, [ account, daiBalance, inputValue, hasDelegated]);

  /* handle warnings input errors */
  useEffect(() => {
    if ( daiBalance && debouncedInput && ( ethers.utils.parseEther(debouncedInput).gt(daiBalance))) {
      setWarningMsg(null);
      setErrorMsg('That amount exceeds the amount of Dai you have'); 
    } else {
      setWarningMsg(null);
      setErrorMsg(null);
    }
  }, [ debouncedInput, daiBalance ]);

  return (
    <RaisedBox>
      <Keyboard 
        onEsc={() => setInputValue(undefined)}
        onEnter={()=> addLiquidityProcedure()}
        onBackspace={()=> {
          inputValue && 
        (document.activeElement !== inputRef) && 
        setInputValue(debouncedInput.toString().slice(0, -1));
        }}
        target='document'
      >
        { removeLiquidityOpen && 
        <Layer onClickOutside={()=>setRemoveLiquidityOpen(false)}>
          <RemoveLiquidity close={()=>setRemoveLiquidityOpen(false)} openConnectLayer={openConnectLayer} /> 
        </Layer>}

        { histOpen && 
        <HistoryWrap closeLayer={()=>setHistOpen(false)}>
          <TxHistory 
            filterTerms={[ 'Added', 'Removed' ]}
            series={activeSeries}
          />
        </HistoryWrap>}

        <SeriesDescriptor activeView='pool'> 
          <InfoGrid 
            alt
            entries={[
              {
                label: 'Your Pool Tokens',
                labelExtra: 'owned in this series',
                visible: 
                  (!!account && !activeSeries?.isMature()) || 
                  (activeSeries?.isMature() && activeSeries?.poolTokens_>0 ),
                active: true,
                loading: !activeSeries?.poolTokens_,     
                value: activeSeries?.poolTokens_,
                valuePrefix: null,
                valueExtra: null,
              },
              {
                label: 'Your Pool share',
                // labelExtra: ()=>(<Text size='xxsmall'> of the total <Text size='xxsmall' color='text'>{nFormatter(activeSeries?.totalSupply_, 0)}</Text> tokens </Text>),
                labelExtra: ()=>(<Text size='xxsmall'> of the total tokens </Text>),
                visible: 
                    (!!account && !activeSeries?.isMature()) || 
                    (activeSeries?.isMature() && activeSeries?.poolTokens_>0 ),
                active: true,
                loading: !activeSeries?.poolPercent,           
                value: activeSeries?.poolPercent ?` ${activeSeries.poolPercent}%`: '',
                valuePrefix: null,
                valueExtra: null,
              },
              {
                label: 'Total Liquidity',
                labelExtra: ' staked in this series',
                visible: !activeSeries?.isMature(),
                active: true,
                loading: !activeSeries?.totalSupply_,   
                value: activeSeries?.totalSupply_ ?` ${nFormatter(activeSeries?.totalSupply_, 2)} tokens`: '',
                valuePrefix: null,
                valueExtra: null,
              },
            ]}
          /> 
        </SeriesDescriptor>   

        { (!txActive || txActive.type === 'REMOVE_LIQUIDITY') &&
        <Box
          width={{ max:'600px' }}
          alignSelf='center'
          fill='horizontal'
          background='background'
          round='small'
          pad='large'
          gap='medium'
        >
          <Box flex='grow' gap='small' align='center' fill='horizontal'>
          
            { !(activeSeries?.isMature()) && Number.isFinite(parseFloat(activeSeries?.yieldAPR_)) &&
            <>
              <Box fill gap='medium'>
                <Text alignSelf='start' size='large' color='text' weight='bold'>Add liquidity</Text>
                <InputWrap errorMsg={errorMsg} warningMsg={warningMsg}>
                  <TextInput
                    ref={(el:any) => {el && !removeLiquidityOpen && !mobile && el.focus(); setInputRef(el);}} 
                    type="number"
                    placeholder={!mobile ? 'Enter the amount of Dai Liquidity to add': 'DAI'}
                    value={inputValue || ''}
                    plain
                    onChange={(event:any) => setInputValue( cleanValue(event.target.value, 6) )}
                    icon={isLol ? <span role='img' aria-label='lol'>😂</span> : <DaiMark />}
                  />
                  
                  {account &&
                  <FlatButton 
                    label={!mobile ? 'Add Maximum': 'Maximum'}
                    onClick={()=>setInputValue(cleanValue(ethers.utils.formatEther(daiBalance), 6))}
                  />}
                </InputWrap>

                <Box fill>
                  <Collapsible open={!!inputValue&&inputValue>0}>

                    <InfoGrid entries={[
                      {
                        label: 'Share of the Pool',
                        labelExtra: 'after adding liquidity',
                        visible: inputValue>0,
                        active: debouncedInput,
                        loading: calculating,           
                        value: newPoolShare? `${newPoolShare}%`: '',
                        valuePrefix: null,
                        valueExtra: null,
                      },
                      {
                        label: () => ( 
                          <Box direction='row' gap='small' align='center'>
                    

                            <Text size='xsmall'> Use Alternative strategy to add liquidity </Text> 
                            <CheckBox 
                              checked={!useBuyToAddLiquidity}
                              onClick={() => userActions.updatePreferences({ useBuyToAddLiquidity: !useBuyToAddLiquidity })}
                            />
                            
                          </Box>                       
                        ),
                        labelExtra: () => ( 
                          <Box direction='row' gap='small' align='center' justify='between'>
                            {/* <Box margin={{ horizontal:'small' }} /> */}
                            <Text size='xxsmall'> { useBuyToAddLiquidity ? 
                              'Currently using the most gas efficient strategy. It is reccommended for most users.': 
                              'The alternative strategy is more robust and is not limited by the reserves in the pool.' } 
                            </Text>
                          </Box>                       
                        ),
                        visible: inputValue>0,
                        active: debouncedInput,
                        loading: false,           
                        value: null,
                        valuePrefix: null,
                        valueExtra:null
                      },
                      {
                        label: 'Like what you see?',
                        visible: !account && inputValue>0,
                        active: true,
                        loading: false,            
                        value: '',
                        valuePrefix: null,
                        valueExtra: () => (
                          <Box pad={{ top:'small' }}>
                            <RaisedButton
                              label={<Box pad='xsmall'><Text size='xsmall'>Connect a wallet</Text></Box>}
                              onClick={() => openConnectLayer()}
                            /> 
                          </Box>
                        )
                      },
                    ]}
                    />
                  </Collapsible>
                </Box>
              </Box> 
            
              <Box gap='small' fill='horizontal' align='center' pad={{ vertical:'small' }}>
                <ActionButton
                  onClick={()=>addLiquidityProcedure()} 
                  label={`Supply ${inputValue || ''} DAI`}
                  disabled={addLiquidityDisabled}
                  hasPoolDelegatedProxy={activeSeries.hasPoolDelegatedProxy}
                  clearInput={()=>setInputValue(undefined)}
                />
              </Box>
            </>}

            { activeSeries?.isMature() &&
            <SeriesMatureBox />}
            
            { !txActive && 
            !!account && 
            activeSeries?.isMature() && 
            activeSeries?.poolTokens?.gt(ethers.constants.Zero) && 
            <RemoveLiquidity />}

            
            <Box direction='row' fill justify='between'>
              { activeSeries?.poolTokens?.gt(ethers.constants.Zero) && 
                !mobile &&
                <Box alignSelf='start' margin={{ top:'medium' }}>
                  <FlatButton 
                    onClick={()=>setHistOpen(true)}
                    label={
                      <Box direction='row' gap='small' align='center'>
                        <Text size='xsmall' color='text-weak'><History /></Text>                
                        <Text size='xsmall' color='text-weak'>
                          Series Pool History
                        </Text>              
                      </Box>
                }
                  />
                </Box>}

              { !activeSeries?.isMature() &&
                activeSeries?.poolTokens_>0 &&
                !mobile && 
                <Box alignSelf='end' margin={{ top:'medium' }}>
                  {
                  removeTxActive ?
                    <Box direction='row' gap='small'>
                      <Text size='xsmall' color='text-weak'>
                        <Text weight='bold' color={activeSeries?.seriesColor}>remove Liquidity</Text> pending
                      </Text>
                      <Loading condition={true} size='xxsmall'>.</Loading>
                    </Box>
                    : 
                    <FlatButton 
                      onClick={()=>setRemoveLiquidityOpen(true)}
                      label={
                        <Box direction='row' gap='small' align='center'>
                          <Text size='xsmall' color='text-weak'><Text weight='bold' color={activeSeries?.seriesColor}>remove Liquidity</Text> from this series</Text>
                          <ArrowRight color='text-weak' />
                        </Box>
                      }
                    />               
                  }

                </Box>}
            </Box>

          </Box>
        </Box>}

        { txActive && txActive.type !== 'REMOVE_LIQUIDITY' && <TxStatus tx={txActive} /> }
        
      </Keyboard>

      { mobile && 
      <YieldMobileNav>
        { !activeSeries?.isMature() &&
       activeSeries?.poolTokens_>0 &&
         <NavLink 
           to={`/removeLiquidity/${activeSeries?.maturity}`}
           style={{ textDecoration: 'none' }}
         >
           <Box direction='row' gap='small' align='center'>
             <Text weight='bold' size='xsmall' color={activeSeries?.seriesColor}>Remove Liquidity</Text>
             <ArrowRight color={activeSeries?.seriesColor} />
           </Box>
         </NavLink>}
      </YieldMobileNav>}

    </RaisedBox>
  );
};

export default Pool;