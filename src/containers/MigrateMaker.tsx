import React, { useState, useContext, useEffect } from 'react';
import { BigNumber, ethers } from 'ethers';
import { NavLink } from 'react-router-dom';
import { Box, Keyboard, TextInput, Text, ResponsiveContext, Collapsible } from 'grommet';
import styled, { css } from 'styled-components';
import { 
  FiArrowLeft as ArrowLeft,
  FiChevronLeft as ChevronLeft, 
  FiChevronRight as ChevronRight,
  FiSearch as Search,
  FiX as Close,
} from 'react-icons/fi';

import { cleanValue, modColor, BN_RAY } from '../utils';

import { UserContext } from '../contexts/UserContext';
import { SeriesContext } from '../contexts/SeriesContext';
import { YieldContext } from '../contexts/YieldContext';

import { useDebounce, useIsLol } from '../hooks/appHooks';
import { useMath } from '../hooks/mathHooks';
import { useTxActive } from '../hooks/txHooks';
import { usePool } from '../hooks/poolHook';
import { useImportProxy } from '../hooks/importProxyHook';
import { useMaker } from '../hooks/makerHook';

import InfoGrid from '../components/InfoGrid';
import InputWrap from '../components/InputWrap';
import RaisedButton from '../components/RaisedButton';
import ActionButton from '../components/ActionButton';
import FlatButton from '../components/FlatButton';
import EthMark from '../components/logos/EthMark';
import YieldMobileNav from '../components/YieldMobileNav';
import DaiMark from '../components/logos/DaiMark';
import SeriesDescriptor from '../components/SeriesDescriptor';
import MakerMark from '../components/logos/MakerMark';

interface IMigrateMakerProps {
  close?: any;
}

const InsetBox = styled(Box)`
border-radius: 8px;
${(props:any) => props.background && css`
    background: ${props.background};
    box-shadow: inset 6px 6px 11px ${modColor(props.background, -20)}, 
            inset -6px -6px 11px ${modColor(props.background, 10)};
`}
`;

const makerTextColor = '#48495f';
const makerBackColor = '#f6f8f9';

const MigrateMaker = ({ close }:IMigrateMakerProps) => {

  const mobile:boolean = ( useContext<any>(ResponsiveContext) === 'small' );

  /* context imports */
  const { state: { makerVaults }, actions: userActions } = useContext(UserContext);
  const { state: { activeSeriesId, seriesData }, actions: seriesActions } = useContext(SeriesContext);
  const activeSeries = seriesData.get(activeSeriesId);
  const { state:{ feedData } } = useContext(YieldContext);
  const { ilks:{ dust } } = feedData;

  /* hooks */
  const { previewPoolTx }  = usePool();
  const { importPosition, importVault,  } = useImportProxy();
  const { minWethForAmount } = useMaker();
  const { calcAPR } = useMath();
  const [ txActive ] = useTxActive(['WITHDRAW']);

  /* vaults and selected vaults variables */
  const [ selectedVaultIndex, setSelectedVaultIndex ] = useState<number>(0);
  const [ selectedVault, setSelectedVault ] = useState<any>(null);
  const [ filteredMakerVaults, setFilteredMakerVaults ] = useState<any>(makerVaults);
  
  /* component flags */ 
  const [ searchOpen, setSearchOpen ] = useState<boolean>(false);
  const [ importDisabled, setImportDisabled ] = useState<boolean>(true);

  /* input variables and aux hooks */
  const [ collInputValue, setCollInputValue ] = useState<any>();
  const [ debtInputValue, setDebtInputValue ] = useState<any>();
  const [ searchInputValue, setSearchInputValue ] = useState<any>();
  const debouncedCollInput = useDebounce(collInputValue, 500);
  const debouncedDebtInput = useDebounce(debtInputValue, 500);
  const debouncedSearchInput = useDebounce(searchInputValue, 1000);
  const [collInputRef, setCollInputRef] = useState<any>(null);
  const [debtInputRef, setDebtInputRef] = useState<any>(null);
  const isCollLol = useIsLol(collInputValue);
  const isDebtLol = useIsLol(debtInputValue);

  /* token balances and calculated values */
  const [ fyDaiValue, setFYDaiValue ] = useState<number>(0);
  const [ APR, setAPR ] = useState<number>();

  const [ maxAPR, setMaxAPR ] = useState<number>();

  const [ minCollateral, setMinCollateral ] = useState<string>();
  const [ minSafeCollateral, setMinSafeCollateral ] = useState<string>();
  const [ daiDust, setDaiDust ] = useState<BigNumber>();

  /* warning and error variables */
  const [ warningMsg, setWarningMsg] = useState<string|null>(null);
  const [ collErrorMsg, setCollErrorMsg] = useState<string|null>(null);
  const [ debtErrorMsg, setDebtErrorMsg] = useState<string|null>(null);

  /* action prcedures */ 
  const importProcedure = async () => {
    if (collInputValue || debtInputValue && !importDisabled) {
      await importPosition(
        activeSeries,
        /* if there is no dai, but there is collateral left, the collateral value needs to be exact */ 
        parseFloat(selectedVault.vaultMakerDebt_)===0 ? selectedVault.vaultCollateral : debouncedCollInput,
        /* if the value approximates the max value OR there appears to be no Dai, use the EXACT value of the MakerDebt */
        ( parseFloat(debouncedDebtInput) === parseFloat(selectedVault.vaultDaiDebt_ ) || 
        parseFloat(selectedVault.vaultDaiDebt_)===0 ) ? 
          selectedVault.vaultMakerDebt :
          debouncedDebtInput,

        selectedVault.vaultId);
      setCollInputValue(undefined);
      setDebtInputValue(undefined);
      await Promise.all([
        userActions.updateUser(),
        seriesActions.updateSeries([activeSeries]),
      ]);
    }
  };
  
  const importAllProcedure = async (id:number) => {
    if (!debouncedCollInput || !debouncedDebtInput && !importDisabled) {
      await importVault(activeSeries, id);
      await Promise.all([
        userActions.updateUser(),
        seriesActions.updateSeries([activeSeries]),
      ]);
    }
  };

  // const exportProcedure = async () => {
  //   if ( true ) {
  //     await exportPosition(
  //       activeSeries,
  //       activeSeries.fyDaiBalance,
  //       await minWethForAmount(activeSeries.fyDaiBalance),
  //       selectedVault.vaultId);
  //   }
  // };

  const selectVault = (prevOrNext:'next'|'prev') => {
    prevOrNext === 'prev' && selectedVaultIndex > 0 && setSelectedVaultIndex( selectedVaultIndex-1 );
    prevOrNext === 'next' && selectedVaultIndex < filteredMakerVaults.length-1 && setSelectedVaultIndex( selectedVaultIndex+1 );
    setDebtInputValue(undefined);
    setDebtErrorMsg(null);
    setCollErrorMsg(null);
  };

  /*
  * Handle  debt Input (debounced debt input) changes:
  */
  useEffect(()=>{
    activeSeries && 
    debouncedDebtInput>0 && 
    (async () => {

      if (
        debtInputValue &&
        parseFloat(debouncedDebtInput) > 0 &&
        parseFloat(debouncedDebtInput) < parseFloat(selectedVault.vaultDaiDebt_) &&    
        parseFloat(debouncedDebtInput) !== parseFloat(selectedVault.vaultDaiDebt_) &&
        selectedVault.vaultDaiDebt.sub(ethers.utils.parseEther(debouncedDebtInput)).lt(daiDust)
      ) {
        setDebtErrorMsg(`You cannot leave a vault with less Dai than the current Maker CDP minimum limit (${ daiDust && ethers.utils.formatEther(daiDust)} Dai). However, you can remove it ALL with max`);
      } else if (
        debtInputValue &&
        parseFloat(debouncedDebtInput) > parseFloat(selectedVault.vaultDaiDebt_)
      ) {
        setDebtErrorMsg('Amount exceeds the debt in the maker vault');
      } else (setDebtErrorMsg(null));

      setCollInputValue('');
      setMinCollateral(ethers.utils.formatEther(await minWethForAmount(debouncedDebtInput)));

      const preview = await previewPoolTx('buyDai', activeSeries, debouncedDebtInput);     
      if (!(preview instanceof Error)) {
        setFYDaiValue( parseFloat(ethers.utils.formatEther(preview)) );
        setAPR(calcAPR( ethers.utils.parseEther(debouncedDebtInput.toString()), preview, activeSeries.maturity ) );
      } else {
        /* if the market doesnt have liquidity just estimate from rate */
        const rate = await previewPoolTx('buyDai', activeSeries, 1);
        !(rate instanceof Error) && setFYDaiValue(debouncedDebtInput*parseFloat((ethers.utils.formatEther(rate))));
        (rate instanceof Error) && setFYDaiValue(0);
        setImportDisabled(true);
        setDebtErrorMsg('The Pool doesn\'t have the liquidity to support a transaction of that size just yet.');
      }
    })();
  }, [debouncedDebtInput, activeSeries]);

  /*
  * Handle collateral Input (debounced debt input) changes:
  */
  useEffect(()=>{
    if ( selectedVault && debouncedCollInput > parseFloat(selectedVault.vaultCollateral_) ) {
      setCollErrorMsg('Not enough collateral in the maker vault');
    } else (setCollErrorMsg(''));
    activeSeries && debouncedCollInput>0 && ( async () => { 
      if (minCollateral && (debouncedCollInput < parseFloat(minCollateral)) ) {
        setCollErrorMsg('That is not enough collateral to cover the debt you wish to migrate');
      }
    })();

  }, [debouncedCollInput, activeSeries]);

  /* Filter vaults and set selected */ 
  useEffect(()=>{
    let _filteredVaults = [];
    if ( debouncedSearchInput ) { 
      _filteredVaults = makerVaults.filter((x:any)=> x.vaultId === debouncedSearchInput);
      setFilteredMakerVaults(_filteredVaults);
      setSelectedVault(_filteredVaults[0]);
    } else {
      _filteredVaults = makerVaults;
      setFilteredMakerVaults(_filteredVaults);
      setSelectedVault(_filteredVaults[selectedVaultIndex]);
    }
  }, [ makerVaults, debouncedSearchInput, selectedVaultIndex ]);

  useEffect(()=>{
    filteredMakerVaults.length>0 && setSelectedVaultIndex(0);
  }, [filteredMakerVaults]);

  /* Handle minSafe calc */
  useEffect(()=>{
    minCollateral && 
    setMinSafeCollateral( ((parseFloat(minCollateral)/3)*5).toString() );
  }, [ minCollateral ]);
  
  /* Handle dust watch */
  useEffect(()=>{
    dust && setDaiDust(dust.div(BN_RAY));
  }, [ dust ]);


  useEffect(()=>{

    selectedVault?.vaultDaiDebt_ && (async ()=>{
      const preview = await previewPoolTx('buyDai', activeSeries, selectedVault.vaultDaiDebt_);
      console.log(preview);
      
      if (!(preview instanceof Error)) {
        setMaxAPR( calcAPR( ethers.utils.parseEther(selectedVault?.vaultDaiDebt_), preview, activeSeries.maturity) );
      } else {
        setMaxAPR(undefined);
      }
    })();
  }, [selectedVault]);
  
  /* Handle import/export disabling deposits */
  useEffect(()=>{
    (debtInputValue > 0  && collInputValue > 0)
      ? setImportDisabled(false): setImportDisabled(true);
  }, [ collInputValue, debtInputValue ]);

  return (
    <Keyboard 
      onEsc={() => {
        if (collInputValue || debtInputValue) {
          document.activeElement === collInputRef && setCollInputValue(undefined);
          document.activeElement === debtInputRef && setDebtInputValue(undefined);
        } else close();
      }}
      onEnter={()=> importProcedure()}
      target='document'
    >
      <SeriesDescriptor activeView='borrow' minimized />

      { !txActive &&
      <Box 
        width={!mobile?{ min:'620px', max:'620px' }: undefined}
        alignSelf='center'
        fill
        background='background'
        round='small'
        pad='large'
        gap='medium'
        justify='between'
      > 
        <Box direction='row' gap='small' align='center' justify='between'>
          <Text size='large' color='text' weight='bold'> Import Maker vault </Text>
          { !mobile && 
          <Box direction='row' align='center' gap='small'> 
            <Search onClick={()=>{if(!searchOpen){setSearchOpen(true);} else {setSearchInputValue(undefined); setSearchOpen(false);}}} />
            <Collapsible open={searchOpen} direction='horizontal'>
              <InsetBox
                background={makerBackColor}
                justify='between'
                direction='row'
                align='center'
              >
                <TextInput
                  type='number'
                  placeholder='Vault Id'
                  value={searchInputValue || ''}
                  plain
                  onChange={(event:any) => setSearchInputValue(event.target.value)}
                />
                <Close onClick={()=>{setSearchInputValue(undefined); setSearchOpen(false);}} />
              </InsetBox>       
            </Collapsible>
          </Box>}
        </Box>

        <InsetBox background={makerBackColor} direction='row' justify='between'>   
          <Box onClick={()=>selectVault('prev')} justify='center' align='center' hoverIndicator={modColor(makerBackColor, -25)}>
            <ChevronLeft size='30px' color={selectedVaultIndex===0?makerBackColor:makerTextColor} />
          </Box>
          {
            filteredMakerVaults.length>0 ?         
              filteredMakerVaults.map( (x:any, i:number) => {
                if (selectedVaultIndex === i) {
                  return (
                    <Box animation='fadeIn' key={x.vaultId} gap='small' pad='medium' fill>
                      <Box direction='row-responsive' justify='between' align='center' fill='horizontal'> 
                        <Box pad={{ horizontal:'medium' }} direction='row' gap='small'>
                          <MakerMark />
                          <Text color='text' size='small' weight='bold'> ETH-A Vault</Text>
                          <Text size='small'> #{x.vaultId}</Text>
                        </Box>

                        { 
                        maxAPR &&
                        <RaisedButton 
                          onClick={()=>importAllProcedure(x.vaultId)}
                          background={makerBackColor}
                          label={ 
                            <Box pad='small'>
                              <Text size='xxsmall'> 1-Click RateLock {`@ ${maxAPR.toFixed(2)}%`}</Text>
                            </Box>
                            }
                        />
                        }
                
                      </Box>
                      <Box pad='medium' border background='#ffffff' fill='horizontal'>
                        <Box pad='small' border='bottom' justify='between' direction='row'> 
                          <Text size='small' color={makerTextColor}>Eth Locked</Text> 
                          <Text size='small' color={makerTextColor}> {x.vaultCollateral_} ETH</Text>            
                        </Box>
                        <Box pad='small' justify='between' direction='row'> 
                          <Text size='small' color={makerTextColor}>Outstanding Dai debt</Text> 
                          <Text size='small' color={makerTextColor}> {x.vaultDaiDebt_} DAI</Text>            
                        </Box>
                      </Box>
                    </Box>
                  );
                }
              })
              : 
              <Box pad='large'>No matching vault ids found</Box>
            }

          <Box onClick={()=>selectVault('next')} justify='center' align='center' hoverIndicator={modColor(makerBackColor, -25)}>
            <ChevronRight size='30px' color={selectedVaultIndex===filteredMakerVaults.length-1?makerBackColor:makerTextColor} />
          </Box>
        </InsetBox>

        { 
        /* Show only if current vault dai is greater than the current dust level */
        daiDust &&
        selectedVault?.vaultMakerDebt.gt(daiDust) && 
        <Box gap='medium'>
          <Box direction='row'>
            <Box basis='50%' direction='row' align='center' gap='small' justify='start'>
              <MakerMark /> Debt to Import: 
            </Box>
            <InputWrap errorMsg={debtErrorMsg} warningMsg={warningMsg}>
              <TextInput
                ref={(el1:any) => setDebtInputRef(el1)} 
                type='number'
                placeholder='DAI'
                value={debtInputValue || ''}
                plain
                onChange={(event:any) => setDebtInputValue(cleanValue(event.target.value))}
                icon={isDebtLol ? <span role='img' aria-label='lol'>😂</span> : <DaiMark />}
              />
              <FlatButton
                label='max debt'
                onClick={()=>selectedVault && setDebtInputValue(cleanValue(selectedVault.vaultDaiDebt_))}
              />
            </InputWrap>
          </Box>
        
          <Box direction='row'>
            <Box basis='50%' justify='center'>
              Collateral to Import: 
            </Box>
            <InputWrap errorMsg={collErrorMsg} warningMsg={warningMsg}>
              <TextInput
                ref={(el2:any)=>setCollInputRef(el2)} 
                type='number'
                placeholder='ETH'
                value={collInputValue || ''}
                plain
                onChange={(event:any) => setCollInputValue(cleanValue(event.target.value))}
                icon={isCollLol ? <span role='img' aria-label='lol'>😂</span> : <EthMark />}
              />
              {
                minSafeCollateral && 
                collInputValue !== cleanValue(minSafeCollateral||'', 6) ? 
                  <FlatButton
                    label='use suggested collateral'
                    onClick={() => setCollInputValue( cleanValue(minSafeCollateral||'', 6))}
                  /> :
                  <FlatButton 
                    label='clear'
                    onClick={() => setCollInputValue('')}
                  />
                } 
            </InputWrap>
          </Box>
        </Box>
        }

        { 
        /* Show if current vault collateral is less than the current dust level */
        selectedVault?.vaultMakerDebt.lt(daiDust) &&
        <Box gap='medium'>
          <Box>
            <Text size='xsmall'> Due to a minimum size limit imposed on Maker vaults, we can't split your vault any further. However, you can still migrate your entire vault to Yield.</Text>
          </Box>
          {
            maxAPR &&
            <RaisedButton 
              onClick={()=>importAllProcedure(selectedVault.vaultId)}
              label={ 
                <Box pad='small'>
                  <Text size='xxsmall'> RateLock vault {`@ ${maxAPR.toFixed(2)}%`} APR </Text>
                </Box>
              }
            />
          }

        </Box>
        }

        <Box fill>
          <Collapsible open={!!debtInputValue&&debtInputValue>0}>
            <InfoGrid entries={[
              {
                label: 'Fixed Rate',
                labelExtra: `if migrating ${debouncedDebtInput} debt`,
                visible: !!debtInputValue,
                active: true,
                loading: false, 
                value: APR?`${APR.toFixed(2)}%`: `${activeSeries? activeSeries.yieldAPR_: ''}%`,
                valuePrefix: null,
                valueExtra: null, 
              },
              {
                label: 'Mimimal Collateral',
                labelExtra: `required for ${debouncedDebtInput} debt`,
                visible: !!debtInputValue,
                active: true,
                loading: false,           
                value: minCollateral ? `${minCollateral && cleanValue(minCollateral, 4)} Eth` : '',
                valuePrefix: null,
                valueExtra: null,
              },
              {
                label: 'Suggested Collateral',
                labelExtra: 'ratio of ~250%',
                visible: !!debtInputValue,
                active: true,
                loading: false,           
                value: minSafeCollateral ? `${minSafeCollateral && cleanValue(minSafeCollateral, 4)} Eth` : '',
                valuePrefix: null,
                valueExtra: null,
              },
            ]}
            />
          </Collapsible>
        </Box>

        <ActionButton
          onClick={() => importProcedure()}
          label={`RateLock ${debouncedDebtInput} Dai @ ${APR && APR.toFixed(2)} %`}
          disabled={importDisabled}
          hasPoolDelegatedProxy={true}
          clearInput={()=>{setCollInputValue(undefined); setDebtInputValue(undefined);}}
        />

        <Box direction='row' fill justify='between'>
          <Box alignSelf='start' margin={{ top:'medium' }}>
            <FlatButton 
              onClick={()=>close()}
              label={
                <Box direction='row' gap='medium' align='center'>
                  <ArrowLeft color='text-weak' />
                  <Text size='xsmall' color='text-weak'> go back </Text>
                </Box>
                }
            />
          </Box>       
        </Box>
      </Box>}

      {mobile && 
        <YieldMobileNav noMenu={true}>
          <NavLink 
            to="/borrow"
            style={{ textDecoration: 'none' }}
          >
            <Box direction='row' gap='small'>
              <Text size='xxsmall' color='text-weak'><ArrowLeft /></Text>
              <Text size='xxsmall' color='text-weak'>back</Text>
            </Box>
          </NavLink>
        </YieldMobileNav>}

    </Keyboard>
  );
};

MigrateMaker.defaultProps={ close:null };

export default MigrateMaker;
