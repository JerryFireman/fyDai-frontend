import React from 'react';
import { Box, Text } from 'grommet';
import { 
  FiClock as Clock,
} from 'react-icons/fi';

import { SeriesContext } from '../contexts/SeriesContext';
import { UserContext } from '../contexts/UserContext';

import { useYDai, useTxActive } from '../hooks';

import InlineAlert from '../components/InlineAlert';
import ApprovalPending from '../components/ApprovalPending';
import TransactionPending from '../components/TransactionPending';

interface IRedeemProps {
  close?:any,
}

const Redeem  = ({ close }:IRedeemProps)  => {
  const { state: seriesState, actions: seriesActions } = React.useContext(SeriesContext);
  const { activeSeries } = seriesState;
  const { actions: userActions } = React.useContext(UserContext);

  const [redeemPending, setRedeemPending] = React.useState<boolean>(false);
  const [redeemDisabled, setRedeemDisabled] = React.useState<boolean>(true);
  const [ warningMsg, setWarningMsg] = React.useState<string|null>(null);
  const [ errorMsg, setErrorMsg] = React.useState<string|null>(null);

  const { redeem, redeemActive } = useYDai();
  const [ txActive ] = useTxActive(['redeem']);

  const redeemProcedure = async () =>{
    if(!redeemDisabled) {
      setRedeemPending(true);
      await redeem(activeSeries.yDaiAddress, activeSeries.yDaiBalance);
      await Promise.all([
        userActions.updatePosition(),
        seriesActions.updateActiveSeries()
      ]);
      setRedeemPending(false);
    }
  };

  /* redeem button disabled logic */ 
  React.useEffect( () => {
    if ( activeSeries?.yDaiBalance_.toFixed(4) > 0 ){
      setRedeemDisabled(false);
    }
    setRedeemDisabled(true);
  }, [activeSeries]);

  return (
    <>
      <Box flex='grow' align='center' fill='horizontal'>
        <InlineAlert warnMsg={warningMsg} errorMsg={errorMsg} />
        { txActive?.type !== 'REDEEM' &&
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
              <Text size='small' color='brand'> This series has matured.</Text>         
            </Box>
          </Box>
          <Box
            round='xsmall'
            background={redeemDisabled ? 'brand-transparent' : 'brand'}
            onClick={()=>redeemProcedure()}  
            pad='small'
            align='center'
          >
            <Text 
              weight='bold'
              size='large'
              color={(redeemDisabled) ? 'text-xweak' : 'text'}
            >
              {`Redeem ${!activeSeries && activeSeries?.yDaiBalance_.toFixed(4) || ''} Dai`}
            </Text>
          </Box>               
        </Box>}
        { redeemActive && !txActive && <ApprovalPending /> } 
        { txActive && <TransactionPending msg={`Redeeming your ${activeSeries?.yDaiBalance_.toFixed(4)} Dai.`} tx={txActive} /> }
      </Box>
    </>
  );
};

Redeem.defaultProps={ close:null };

export default Redeem;
