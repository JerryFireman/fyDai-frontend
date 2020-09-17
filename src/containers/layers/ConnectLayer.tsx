import React, { useEffect, useState, useContext } from 'react';

import { UnsupportedChainIdError } from '@web3-react/core';
import {
  NoEthereumProviderError,
  UserRejectedRequestError as UserRejectedRequestErrorInjected,
} from '@web3-react/injected-connector';

import {
  Anchor,
  Layer,
  Image,
  Header,
  Heading,
  Footer,
  Button,
  Box,
  Text,
  ResponsiveContext,
  Paragraph,
} from 'grommet';
import {

  useWeb3React,
  useConnection,
  useCachedState, 
  useSignerAccount,
} from '../../hooks';

import { injected, trezor, walletlink, torus, ledger } from '../../connectors';

import metamaskImage from '../../assets/images/providers/metamask.png';
import trezorImage from '../../assets/images/providers/trezor.png';
import walletlinkImage from '../../assets/images/providers/walletlink.png';
import torusImage from '../../assets/images/providers/torus.png';
// import noConnectionImage from '../assets/images/noconnection.png';

import { NotifyContext } from '../../contexts/NotifyContext';
import { UserContext } from '../../contexts/UserContext';
import ProfileButton from '../../components/ProfileButton';



const ConnectLayer = ({ view, closeLayer }: any) => {

  const { state: { position } } = useContext(UserContext);
  const screenSize = useContext(ResponsiveContext);
  const { account, provider } = useSignerAccount();
  const [ layerView, setLayerView] = useState<string>(view);
  const { handleSelectConnector } = useConnection();

  const connectorList = [
    { name: 'Metamask', image: metamaskImage, connection: injected },
    // { name: 'Tezor', image: trezorImage, connection: trezor },
    { name: 'Torus', image: torusImage, connection: torus },
  ];

  useEffect(()=>{
    setLayerView(view);
  }, [view]);

  return (
    <>
      {layerView && (
        <Layer
          onClickOutside={() => closeLayer(true)}
          animation="slide"
          onEsc={() => closeLayer(true)}
        >
          <Box
            width={screenSize!=='small'?{ min:'600px', max:'750px' }: undefined}
            background="background-front"
            direction="column"
            fill="vertical"
            style={{
              borderRadius: '0.5rem',
              padding: '2rem',
            }}
          >
            { account && layerView !== 'CONNECT' &&
              <>
                <Header 
                  fill='horizontal'
                  background='background-mid'
                  pad={{ horizontal: 'medium', vertical:'large' }}
                >
                  <ProfileButton />
                  <Anchor color='brand' onClick={()=>closeLayer()} size='xsmall' label='Close' />
                </Header>

                <Box
                  pad="medium"
                  align="center"
                  justify="center"
                  gap='small'
                >
                  <Text size='xsmall'>Connected to:</Text> 
                  <Text weight="bold"> { provider.network.name } </Text>
                  <Box direction='row' gap='small'>
                    <Text size='xsmall'>ETH balance:</Text>
                    <Text>{ position.ethBalance_ && position.ethBalance_ || '' }</Text>
                  </Box>
                  {/* <Button fill='horizontal' label='Connect to another wallet' onClick={()=>setShowConnectLayer(true)} /> */}
                </Box>

                <Box 
                  align='center'
                  overflow='auto'
                >
                  <Text>Previous TX Info</Text>
                  <Text>Previous TX Info</Text>
                  <Text>Previous TX Info</Text>
                  <Text>Previous TX Info</Text>

                </Box>
                <Footer pad='medium' gap='xsmall' direction='row' justify='center' align='center'>
                  <Box round>
                    <Button 
                      fill='horizontal'
                      size='small' 
                      onClick={()=>setLayerView('CONNECT')}
                      color='background-front'
                      label='Change wallet'
                      hoverIndicator='background'
                    />
                  </Box>
                </Footer>
              </> }

            { layerView === 'CONNECT' &&      
              <>
                <Header fill="horizontal" gap="medium">
                  <Heading
                    level="2"
                    style={{
                      textAlign: 'center',
                      margin: 'auto',
                    }}
                  >
                    Connect to a Wallet
                  </Heading>
                </Header>
                <Box align="center" pad="medium" gap="small">
                  <Paragraph>Try connecting with:</Paragraph>
                  {connectorList.map((x) => (
                    <Button
                      hoverIndicator="border"
                      onClick={() => { handleSelectConnector(x.connection); closeLayer();}}
                      label={x.name}
                      color="border"
                      fill="horizontal"
                      icon={
                        <Box
                          height="1rem"
                          width="1rem"
                          style={{
                            position: 'absolute',
                            left: '1rem',
                          }}
                        >
                          <Image src={x.image} fit="contain" />
                        </Box>
                  }
                      style={{
                        marginBottom: '1rem',
                        fontWeight: 500,
                        position: 'relative',
                        padding: '0.5rem',
                      }}
                      key={x.name}
                    />
                  ))}
                </Box>
                <Footer direction="column" pad="medium">
                  <Box gap="xsmall" direction="row">
                    <Anchor href="#" label="Help!" size="xsmall" color="brand" />
                    <Text size="xsmall"> I'm not sure what this means.</Text>
                  </Box>
                  <Box direction="row">
                    <Button
                      label="Close"
                      fill="horizontal"
                      color="border"
                      style={{
                        fontWeight: 600,
                        height: screenSize === 'small' ? '2.25rem' : 'auto',
                      }}
                      onClick={() => closeLayer()}
                    />
                  </Box>
                </Footer>
              </>}
          </Box>
        </Layer>
      )}
    </>
  );
};

export default ConnectLayer;
