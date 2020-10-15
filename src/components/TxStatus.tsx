import React, { useContext } from 'react';
import { Box, Text, ResponsiveContext, ThemeContext } from 'grommet';
import { FiCopy as Copy } from 'react-icons/fi';
import { ScaleLoader } from 'react-spinners';

import { NotifyContext } from '../contexts/NotifyContext';
import EtherscanButton from './EtherscanButton';
import { abbreviateHash } from '../utils';

interface TxStatusProps {
  msg:string;
  tx: any;
}

const TxStatus= ({ msg, tx }:TxStatusProps) => {

  const {
    state: { pendingTxs, lastCompletedTx },
  } = useContext(NotifyContext);

  const theme:any = useContext(ThemeContext);
  const mobile:boolean = ( useContext<any>(ResponsiveContext) === 'small' ); 
  const txRef = React.useRef<any>(null);

  // TODO: handle copy
  const handleCopy = () => {
    document.execCommand('copy');
  };

  return (
    <>
      { pendingTxs && pendingTxs.length > 0 &&
        <Box
          alignSelf="center"
          fill
          background="background-front"
          round='small'
          pad="large"
          align='center'
          gap='medium'
          width={!mobile?{ min:'600px', max:'600px' }: undefined}
        >
          <Text size='xlarge' color='brand' weight='bold'>Transaction pending...</Text>
          <Text>{msg}</Text>
          <ScaleLoader color={theme?.global?.colors?.brand.dark || 'grey'} height='25px' />
          <Box direction='row' gap='xsmall'>
            <Text size='xsmall' ref={txRef}> { abbreviateHash(tx.tx.hash) } </Text>
            <Box
              onClick={()=>handleCopy()}
            >
              <Copy /> 
            </Box>    
          </Box>
          <EtherscanButton txHash={tx.tx.hash} />
        </Box>}

      { pendingTxs.length === 0 && lastCompletedTx &&
      <Box
        alignSelf="center"
        fill
        background="background-front"
        round='small'
        pad="large"
        align='center'
        gap='medium'
        width={!mobile?{ min:'600px', max:'600px' }: undefined}
      >
        <Text size='xlarge' color='brand' weight='bold'>Transaction complete. </Text>
        <Text>{(lastCompletedTx.status === 1)? 'Transaction succeeded': 'Transaction failed'}</Text>
        <Box direction='row' gap='xsmall'>
          <Text size='xsmall' ref={txRef}> { abbreviateHash(lastCompletedTx.transactionHash) } </Text>
          <Box
            onClick={()=>handleCopy()}
          >
            <Copy /> 
          </Box>
        </Box>
        <EtherscanButton txHash={lastCompletedTx.transactionHash} />
      </Box>}
    </>
  );
};

export default TxStatus;