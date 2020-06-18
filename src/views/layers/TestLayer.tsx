import React from 'react';

import { ethers } from 'ethers';

import { useWeb3React } from '@web3-react/core';
import { Anchor, Layer, Header, Heading, Footer, Button, Box, Text } from 'grommet';

import { bigNumberify } from 'ethers/utils';
import * as utils from '../../utils';

import { getNetworkName, useMakerVault }  from '../../hooks/connectionHooks';
import ProfileButton from '../../components/ProfileButton';
import { NotifyContext } from '../../contexts/NotifyContext';

import { useSendTx, useCallTx, useDealer, useGetBalance } from '../../hooks/yieldHooks';

import { YieldContext } from '../../contexts/YieldContext';
import { PositionsContext } from '../../contexts/PositionsContext';

const TestLayer = (props:any) => {
  const { chainId, account } = useWeb3React();

  // const web3 = useWeb3React();
  const { state: yieldState, actions: yieldActions } = React.useContext( YieldContext );
  const { state: positionsState, actions: positionsActions } = React.useContext( PositionsContext );
  const [ flow, setFlow ] = React.useState<string|null>('WETH');

  
  const { positionsData } = positionsState;
  const { yieldData, deployedCore, deployedSeries, deployedExternal, extBalances } = yieldState;
  
  // const updateBalances = yieldActions.updateExtBalances(deployedExternal);
  
  const { 
    wethBalance,
    wethBalance_p,
    ethBalance_p,
    ethBalance,
    daiBalance,
    daiBalance_p,
    chaiBalance,
    chaiBalance_p
  } = extBalances;

  // const [ wethBalance, setWethBalance ] = React.useState<string|null|number>(0);
  // const [ chaiBalance, setChaiBalance ] = React.useState<string|null|number>(0);
  // const [ daiBalance, setDaiBalance ] = React.useState<string|null|number>(0);

  const [daiDebt, setDaiDebt] = React.useState<string>('');
  const [daiTokens, setDaiTokens] = React.useState<string>('');
  const [wethTokens, setWethTokens] = React.useState<string>('');
  const [chaiTokens, setChaiTokens] = React.useState<string>('');

  const { closeLayer, changeWallet } = props;
  const [ connectMakerVault ] = useMakerVault();
  const { dispatch } = React.useContext<any>(NotifyContext);

  const [ sendTx ]  = useSendTx();
  const [ callTx ]  = useCallTx();
  
  const { 
    post, 
    approveDealer,
    withdraw,
    borrow,
    repay,
    postActive,
    withdrawActive,
    repayActive,
    borrowActive,
  }  = useDealer();

  // const { getChaiBalance, getWethBalance, getDaiBalance }  = useGetBalance();

  // React.useEffect(()=>{
  //   (async () => setWethBalance( await getWethBalance(deployedExternal.Weth)) )();
  //   (async () => setChaiBalance( await getChaiBalance(deployedExternal.Chai)) )();
  //   (async () => setDaiBalance( await getDaiBalance(deployedExternal.Dai)) )();
  // }, [deployedExternal, postActive, withdrawActive]);

  React.useEffect(()=>{
    const daiD = utils.toWad(10);
    const chi  = utils.toRay(1.25);
    // setDaiDebt( parseFloat(ethers.utils.formatEther(daiD)) );
    setDaiDebt( daiD.toString() );
    if ( yieldState?.makerData?.ilks?.rate  ) {
      console.log(yieldState.makerData);
      const daiT = utils.mulRay( daiD, yieldState.makerData.ilks.rate);
      const wethT = utils.divRay( daiT, yieldState.makerData.ilks.spot);
      const chaiT = utils.divRay(daiT, chi);

      setDaiTokens(daiT.toString());
      setWethTokens(wethT.toString());
      setChaiTokens(chaiT.toString());
    }

  }, [ yieldState ] );

  // React.useEffect(() => {
  //   // (async () => setBalance( await getEthBalance()) )();
  //   // (async () => setWeiBalance( await getWeiBalance()) )();
  //   // (async () => activate(injected, console.log))();
  // }, [chainId, account]);

  const onClose = () => {
    closeLayer();
  };

  return (
    <Layer 
      animation='slide'
      position='center'
      full
      modal={true}
      onClickOutside={onClose}
      onEsc={()=>closeLayer()}
    >
      <Box 
        direction='column'
        fill='vertical'
        background='background-front'
         // alignContent='center'
        style={{ minWidth: '240px' }}
        gap='small'
      >
        <Header 
          round={{ corner:'bottom', size:'medium' }}
          fill='horizontal'
          background='background-frontheader'
          pad={{ horizontal: 'small', vertical:'medium' }}
        >
          <Heading level='6'> FOR TESTING ONLY</Heading>
          {/* <Anchor color='brand' onClick={()=>onClose()} size='xsmall' label='close' /> */}
        </Header>

        <Box direction='row' justify='evenly'>
          <Box
            pad="medium"
            align="center"
            justify="center"
            gap='small'
          >
            <ProfileButton />
            <Text size='xsmall'>Connected to:</Text> 
            <Text weight="bold">{chainId && getNetworkName(chainId) }</Text>
            <Text weight="bold">{chainId && chainId }</Text>

            <Box direction='row' gap='small'>
              <Text size='xsmall'>ETH balance:</Text>
              <Text size='xsmall'>{ extBalances.ethBalance_p || '' }</Text>
            </Box>
            {/* <Box direction='row' gap='small'>
            <Text size='xsmall'>WEI balance:</Text>
            <Text size='xsmall'>{ weiBalance }</Text>
          </Box> */}
            <Box direction='row' gap='small'>
              <Text size='xsmall'>WETH balance:</Text>
              <Text size='xsmall'>{ extBalances.wethBalance_p || '' }</Text>
            </Box>

            <Box direction='row' gap='small'>
              <Text size='xsmall'>CHAI balance:</Text>
              {/* <Text size='xsmall'>{ chaiBalance && ethers.utils.formatEther(chaiBalance.toString()) }</Text> */}
              <Text size='xsmall'>{ extBalances.chaiBalance_p || '' }</Text>

            </Box>

            <Box direction='row' gap='small'>
              <Text size='xsmall'>DAI balance:</Text>
              {/* <Text size='xsmall'>{ daiBalance && ethers.utils.formatEther(daiBalance.toString()) }</Text> */}
              <Text size='xsmall'>{ extBalances.daiBalance_p || '' }</Text>
            </Box>

            <Box direction='column' gap='small'>
              <Text size='small'>Ilk: </Text>
              <Text size='xsmall'> spot: { yieldState.makerData?.ilks?.spot_p }</Text>
              <Text size='xsmall'> rate: { yieldState.makerData?.ilks?.rate_p  }</Text>
              <Text size='xsmall'> line: { yieldState.makerData?.ilks?.line_p }</Text>
            </Box>

            <Box direction='column' gap='small'>
              <Text size='small'>Urn: </Text>
              <Text size='xsmall'>ink: { yieldState.makerData?.urns?.ink_p }</Text>
              <Text size='xsmall'>art: { yieldState.makerData?.urns?.art_p }</Text>
            </Box>

          </Box>
          <Box 
            align='center'
            gap='small'
            overflow='auto'
            margin='small'
          >
            <Box direction='row'>
              <Button primary={flow==='WETH'} label='WETH flow' onClick={()=>setFlow('WETH')} style={{ borderRadius:'24px 0px 0px 24px' }} />
              <Button primary={flow==='CHAI'} label='CHAI flow' onClick={()=>setFlow('CHAI')} style={{ borderRadius:'0px 0px 0px 0px' }} />
              <Button primary={flow==='MATURITY'} label='Maturity' onClick={()=>setFlow('MATURITY')} style={{ borderRadius:'0px 24px 24px 0px' }} />
            </Box>

            { flow === 'WETH' && 
            <Box gap='small'>

              get WETH: 
              {/* <Button label='useNotify_info' onClick={()=>dispatch( { type: 'notify', payload: { message:'Something is happening!.. ', type:'info', showFor:500 } } )} /> */}
              <Button label='1. wrap 10 eth to weth' onClick={()=> sendTx(deployedExternal.Weth, 'Weth', 'deposit', [], utils.toWei('10'))} />

              WETH deposit and borrow: 
              <Button label='2. Weth approve YieldDealer for 1.5' onClick={()=> approveDealer(deployedExternal.Weth, deployedCore.Dealer, 1.5 )} />
              <Button label='3. Post Collateral 1.5' disabled={postActive} onClick={()=> post(deployedCore.Dealer, 'WETH', 1.5)} />
              <Button label='(4. Withdraw 1.5)' onClick={()=> withdraw(deployedCore.Dealer, 'WETH', 1.5 )} />
              <Button label='5.Borrow 0.5' onClick={()=> borrow(deployedCore.Dealer, 'WETH', yieldState.deployedSeries[0].maturity, 0.5 )} />
              WETH repay:
              <Button label='6.1 Repay 0.5 wethdebt in yDai' onClick={()=> repay(deployedCore.Dealer, 'WETH', yieldState.deployedSeries[0].maturity, 0.5, 'YDAI' )} />
              <Button label='( 6.2 Repay 0.5 wethdebt in Dai) ' onClick={()=> repay(deployedCore.Dealer, 'WETH', yieldState.deployedSeries[0].maturity, 0.5, 'DAI' )} />
            </Box>}

            { flow === 'CHAI' && 
            <Box gap='small'>
              
              Get Dai:
              
              <Button label='1. Approve Wethjoin for 10weth' onClick={()=> sendTx(deployedExternal.Weth, 'Weth', 'approve', [deployedExternal.WethJoin, utils.toWei(10)], bigNumberify(0) )} />
              
              {/* <Button label='x. Vat > hope wethJoin' onClick={()=> sendTx(deployedExternal.Vat, 'Vat', 'hope', [deployedExternal.WethJoin], bigNumberify(0))} /> */}
              
              <Button label='2. wethJoin join (take 10weth)' onClick={()=> sendTx(deployedExternal.WethJoin, 'WethJoin', 'join', [account, utils.toWei(10)], bigNumberify(0) )} />

              <Button
                label='3. Vat frob (open vault?)'
                onClick={()=> sendTx(deployedExternal.Vat, 'Vat', 'frob', 
                  [
                    ethers.utils.formatBytes32String('ETH-A'),
                    account,
                    account,
                    account,
                    wethTokens,
                    daiDebt,
                  ], 
                  bigNumberify(0)
                )}
              />
              <Button label='(x. Vat hope daiJoin)' onClick={()=> sendTx(deployedExternal.Vat, 'Vat', 'hope', [deployedExternal.DaiJoin], bigNumberify(0))} />
             
              <Button label='4. daiJoin EXit (daiDebt = 10)' onClick={()=> sendTx(deployedExternal.DaiJoin, 'DaiJoin', 'exit', [account, daiTokens ], bigNumberify(0) )} />
              
              Convert Dai to Chai:
              <Button label='5. Approve chai (approx. 10)' onClick={()=> sendTx(deployedExternal.Dai, 'Dai', 'approve', [deployedExternal.Chai, daiTokens ], bigNumberify(0) )} />
              <Button label='6. Chai join (approx. 10)' onClick={()=> sendTx(deployedExternal.Chai, 'Chai', 'join', [account, daiTokens ], bigNumberify(0) )} />

  
              Chai deposit and borrow:
              {/* <Button label='5. Chai approve chaiDealer Alt' onClick={()=> sendTx(deployedCore.Dealer, 'Chai', 'approve', [deployedCore.DealerDealer, utils.divRay(daiTokens, chi) ] )} /> */}
              <Button label='2. Chai approve chaiDealer 1.5' onClick={()=> approveDealer(deployedExternal.Chai, deployedCore.Dealer, 1.5 )} />
              <Button label='3. Post Chai Collateral 1.5' disabled={postActive} onClick={()=> post(deployedCore.Dealer, 'CHAI', 1.5 )} />
              <Button label='(4. Withdraw 1.5 chai)' onClick={()=> withdraw(deployedCore.Dealer, 'CHAI', 1.5 )} />
              <Button label='5.Borrow 0.5 with chai' onClick={()=> borrow(deployedCore.Dealer, 'CHAI', deployedSeries[0].maturity, 0.5 )} />

              Chai repay; 
              <Button label='(6.1 Repay 0.5 chaidebt in yDai)' onClick={()=> repay(deployedCore.Dealer, 'CHAI', deployedSeries[0].maturity, 0.5, 'YDAI' )} />
              <Button label=' 6.2 Repay 0.5 chaidebt in Dai ' onClick={()=> repay(deployedCore.Dealer, 'CHAI', deployedSeries[0].maturity, 0.5, 'DAI' )} />
            </Box>}

            { flow === 'MATURITY' && 
            <Box gap='small'>
              {/* <Button label='useNotify_info' onClick={()=>dispatch( { type: 'notify', payload: { message:'Something is happening!.. ', type:'info', showFor:500 } } )} /> */}
              <Button label='Mature yDai' onClick={()=> account && console.log('not mature')} />
              <Button label='Redeem Dai' onClick={()=> account && console.log('not mature')} />
            </Box>}
          </Box>

          <Box
            pad="medium"
            align="center"
            justify="center"
            gap='small'
            overflow='auto'
          > 
            { positionsData.size > 0 && !positionsState.isLoading ? 
              <Box pad='small' gap='medium' fill>
                <Box direction='row'>
                  <Text weight='bold'>yDai[0]: {positionsData.get('yDai-2020-09-30').symbol}</Text>
                </Box>
                <Box gap='small'>
                  <Text weight='bold'>Posted collateral:</Text>
                  <Text>weth posted: { yieldData.wethPosted_p }</Text>
                  <Text>chai posted: { yieldData.chaiPosted_p }</Text>
                  <Text weight='bold'>yDai balance:</Text>
                  <Text>yDai Balance: { positionsData.get('yDai-2020-09-30').yDaiBalance_p }</Text>
                  <Text weight='bold'>Weth Dealer:</Text>
                  <Text>weth Debt Dai: { positionsData.get('yDai-2020-09-30').wethDebtDai_p }</Text>
                  <Text>weth Debt YDai: { positionsData.get('yDai-2020-09-30').wethDebtYDai_p }</Text>
                  <Text>weth Total Debt Dai { yieldData.wethTotalDebtDai_p }</Text>
                  <Text> weth Total Debt YDai: { yieldData.wethTotalDebtYDai_p }</Text>
                  <Text weight='bold'>ChaiDealer:</Text>
                  <Text>chai Debt Dai : { positionsData.get('yDai-2020-09-30').chaiDebtDai_p}</Text>
                  <Text>chai Debt yDai : { positionsData.get('yDai-2020-09-30').chaiDebtYDai_p}</Text>
                  <Text>chai Total Debt Dai: { yieldData.chaiTotalDebtDai_p }</Text>
                  <Text>chai Total Debt YDai: { yieldData.chaiTotalDebtYDai_p }</Text>
                </Box>
              </Box>
              :
              <Box pad='small' fill align='center' justify='center'> 
                <Text>Loading... </Text>
              </Box>}
          </Box>
        </Box>

        <Footer pad='medium' gap='xsmall' direction='row' justify='between' align='center'>
          <Box round>
            <Button
              fill='horizontal'
              size='small' 
              onClick={()=>changeWallet()}
              color='background-front'
              label='Change wallet'
              hoverIndicator='background'
            />
          </Box>
          <Button
            alignSelf='end'
            label='refresh' 
            onClick={
            ()=> {
              positionsActions.refreshPositions([yieldState.deployedSeries[0]]);
              yieldActions.updateYieldBalances(yieldState.deployedCore);
              yieldActions.updateExtBalances(yieldState.deployedExternal);
            }
          }
          />

        </Footer>
      </Box>
    </Layer>
  );
};

export default TestLayer;