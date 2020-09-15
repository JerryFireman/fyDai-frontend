import React, { useEffect, useState, useContext } from 'react';

import { Grommet, base, Grid, Main, Box, ResponsiveContext, Nav, Layer } from 'grommet';
import { deepMerge } from 'grommet/utils';
import { yieldTheme } from './themes';

import Dashboard from './views/Dashboard';
import BorrowView from './views/BorrowView';
import LendView from './views/LendView';
import PoolView from './views/PoolView';

import YieldHeader from './components/YieldHeader';
import YieldFooter from './components/YieldFooter';
import SeriesSelector from './components/SeriesSelector';
import YieldMark from './components/logos/YieldMark';

import ConnectLayer from './containers/layers/ConnectLayer';
import AccountLayer from './containers/layers/AccountLayer';
import NotifyLayer from './containers/layers/NotifyLayer';
import AuthsLayer from './containers/layers/AuthsLayer';

// TODO: remove testLayer for prod
import TestLayer from './containers/layers/TestLayer';

// const LendView = React.lazy(() => import('./views/LendView'));
// const PoolView = React.lazy(() => import('./views/PoolView'));
// const BorrowView = React.lazy(() => import('./views/BorrowView'));
// const Dashboard = React.lazy(() => import('./views/Dashboard'));

const ThemedApp = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [partyMode, setPartyMode] = useState(false);
  return (
    <Grommet
      theme={deepMerge(base, yieldTheme)}
      themeMode={darkMode ? 'dark' : 'light'}
      full
    >
      <App 
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        partyMode={partyMode}
        setPartyMode={setPartyMode}
      />     
    </Grommet>
  );
};

const App = (props:any) => {

  // TODO Switch out for react router
  const [activeView, setActiveView] = useState<string>('BORROW');
  const [accountView, setAccountView] = useState<string>('ACCOUNT');

  const [showConnectLayer, setShowConnectLayer] = useState<boolean>(false);
  const [showAccountLayer, setShowAccountLayer] = useState<boolean>(false);
  const [showAuthsLayer, setShowAuthsLayer] = useState<boolean>(false);

  const [showSeriesLayer, setShowSeriesLayer] = useState<boolean>(false);
  const [showTestLayer, setShowTestLayer] = useState<boolean>(false);

  const screenSize = useContext(ResponsiveContext);
  const [columnsWidth, setColumnsWidth] = useState<string[]>(['5%', 'auto', '5%']);

  const changeConnection = () => {
    setShowAccountLayer(false);
    setShowConnectLayer(true);
  };

  useEffect(()=> {
    if (screenSize === 'small') { 
      setColumnsWidth(['0%', 'auto', '0%']);
    } else {
      setColumnsWidth(['5%', 'auto', '5%']);
    }
  }, [screenSize]);

  return (
    <div className="App">
      <NotifyLayer />
      <AuthsLayer open={showAuthsLayer} closeLayer={() => setShowAuthsLayer(false)} />
      <ConnectLayer view={accountView} open={showConnectLayer} closeLayer={() => setShowConnectLayer(false)} />
      
      { showTestLayer  && <TestLayer closeLayer={()=>setShowTestLayer(false)} /> }
      { showSeriesLayer  && <SeriesSelector activeView='borrow' close={()=>setShowSeriesLayer(false)} /> }
      
      { showAccountLayer &&
        <AccountLayer
          view={accountView}
          closeLayer={() => setShowAccountLayer(false)}
          changeWallet={() => changeConnection()}
        />}

      <Box direction="row" height={{ min: '100%' }}>
        <Box flex height='100%'>

          <Grid fill rows={screenSize === 'small'? ['xsmall', 'auto', 'xsmall']: ['auto', 'flex', 'auto']}>                 
            <Grid fill columns={columnsWidth}>
              <Box background={{ color: 'background-front' }} />
              <YieldHeader
                openConnectLayer={() => setShowConnectLayer(true)}
                openAccountLayer={() => setShowAccountLayer(true)}
                activeView={activeView}
                setActiveView={setActiveView}
              />
              <Box background={{ color: 'background-front' }} />
            </Grid>

            <Main pad="none" direction="row" flex>
              <Grid fill columns={columnsWidth}>
                <Box background="background" />
                <Box
                  pad={{ vertical: 'large' }}
                  fill="horizontal"
                  align="center"
                >          
                  {activeView === 'DASHBOARD' && <Dashboard />}
                  {activeView === 'BORROW' && <BorrowView />}
                  {activeView === 'LEND' && <LendView />}
                  {activeView === 'POOL' && <PoolView />}
                </Box>               
                <Box background="background" />
              </Grid>
            </Main>
              
            <Grid fill columns={columnsWidth}>
              <Box background="background" />
              {screenSize !== 'small' &&
                <YieldFooter
                  showTestLayer={showTestLayer}
                  setShowTestLayer={setShowTestLayer}
                  darkMode={props.darkMode}
                  setDarkMode={props.setDarkMode}
                  changeConnection={changeConnection}
                />}                  
              <Box background="background" />      
            </Grid>

          </Grid>
        </Box>
      </Box>

      {screenSize === 'small' &&    
        <Layer
          position='bottom'
          modal={false}
          responsive={false}
          full='horizontal'
        >
          <Nav 
            direction="row"
            background="background-mid"          
            round={{ corner:'top', size:'small' }}
            elevation='small'
            pad="medium"
            justify='evenly'
          >
            <Box><YieldMark /></Box>
            <Box>Collateral</Box>
            <Box>Borrow</Box>
            <Box>Repay</Box>         
          </Nav>
        </Layer>} 
    </div>
  );
};

export default ThemedApp;
