import React from 'react';
import { ethers } from 'ethers';
import moment from 'moment';

import { Box, Button, Select, Image, TextInput, Text, CheckBox, Collapsible, RangeInput, Layer } from 'grommet';
import { 
  FiPlusCircle as PlusCircle,
  FiMinusCircle as MinusCircle,
  FiChevronRight as Right,
  FiChevronLeft as Left,
  FiCheck as Check,
} from 'react-icons/fi';

import { YieldContext } from '../contexts/YieldContext';
import { SeriesContext } from '../contexts/SeriesContext';
import { UserContext } from '../contexts/UserContext';

import Deposit from './Deposit';

import TxHistory from '../components/TxHistory';
import Loading from '../components/Loading';
import InfoGrid from '../components/InfoGrid';

interface DashBorrowProps {
  // borrowFn:any
  // activeSeries?:IYieldSeries,
  // maxValue?:number
}

const DashBorrow = (props:DashBorrowProps) => {

  const [ addCollateral, setAddCollateral ] = React.useState<boolean>(false);

  const { state: seriesState, actions: seriesActions } = React.useContext(SeriesContext);
  const { activeSeries } = seriesState; 

  const { state: userState, actions: userActions } = React.useContext(UserContext);
  const { position } = userState;
  const { 
    debtValue_,
    ethPosted_,
    collateralPercent_,
    ethBorrowingPower_: maximumDai
  } = position;

  return (
    <Box gap='small' pad='xsmall'>
      { addCollateral && 
        <Layer 
          onClickOutside={()=>setAddCollateral(false)}
          onEsc={()=>setAddCollateral(false)}
        >
          <Box
            width={{ max:'750px' }}
            alignSelf='center'
            fill
            background='background-front'
            round='small'
            pad='large'
          >
            <Deposit setActiveView={()=>null} modalView={true} />
          </Box>
        </Layer>}
      <Text color='text-weak' size='xsmall'>Overview </Text>
      <Box gap='small' direction='row-responsive' fill='horizontal' justify='between' margin={{ bottom:'large' }}>  
        <Box
          background='background-front'
          fill='horizontal'
          round='small'
          pad={{ vertical:'small', horizontal:'large' }}
          // elevation='medium'
          border
          direction='row'
          justify='between'
          align='center'
          basis='2/3'
        >
          <InfoGrid entries={[
            {
              label: 'Collateral Posted',
              visible: true,
              active: true,
              loading: !ethPosted_ && ethPosted_ !== 0,     
              value: ethPosted_ ? `${ethPosted_.toFixed(4)} Eth` : '0 Eth',
              valuePrefix: null,
              valueExtra: null, 
            },

            {
              label: 'Collateralization Ratio',
              visible: true,
              active: collateralPercent_ > 0,
              loading: !ethPosted_ && ethPosted_ !== 0,            
              value: (collateralPercent_ && (collateralPercent_ !== 0))? `${collateralPercent_}%`: '',
              valuePrefix: null,
              valueExtra: null, 
            },
          ]}
          />
          {!addCollateral? <PlusCircle size='25' color='brand' onClick={()=>setAddCollateral(!addCollateral)} />
            :
          <Left size='25' color='brand' onClick={()=>setAddCollateral(!addCollateral)} />}
        </Box>

        <Box
          basis='1/3'
          background='background-front'
          round='small'
          // direction='row'
          // fill='horizontal'
          // justify='center'
          border
        >
          <InfoGrid entries={[
            {
              label: 'Current Total Debt Value',
              visible: true,
              active: true,
              loading: !ethPosted_ && ethPosted_ !== 0,     
              value: debtValue_? ` ${debtValue_.toFixed(2)} Dai`: '-',
              valuePrefix: 'Approx.',
              valueExtra: null, 
            }

          ]}
          />
        </Box>
      </Box>

      <Box direction='row-responsive' gap='small'>
        <Box basis='1/3' flex gap='small'>
          <Text color='text-weak' size='xsmall'>Your Positions </Text>
          <Box
            background='background-front'
            fill
            round='small'
            pad='none'
            // elevation='medium'
            border
          >
            <Box
              direction='row'
              gap='xsmall'
              justify='between'
              background='background-mid'
              pad='small'
              round={{ size:'medium', corner:'top' }}
            >
              <Box basis='1/2'><Text color='text-weak' size='xxsmall'>SERIES</Text></Box>
              <Box><Text color='text-weak' size='xxsmall'>DEBT</Text></Box>
              {/* <Box><Text color='text-weak' size='xsmall'>ACTION</Text></Box> */}
            </Box>
            <Box>

              {activeSeries && 
              <Box
                direction='row' 
                justify='between'
                onClick={()=>console.log(activeSeries.maturity)}
                hoverIndicator='background-mid'
                border='top'
                fill
                pad='medium'
              >
                <Box>
                  <Text alignSelf='start' size='xsmall' color='brand'>
                    {activeSeries.yieldAPR_}%
                  </Text>
                </Box>
                <Box>
                  <Text alignSelf='start' size='xsmall' color='brand'>
                    {activeSeries.displayName}
                  </Text>
                </Box>
                <Box>
                  <Text alignSelf='start' size='xsmall' color='brand'>
                    {activeSeries.ethDebtDai_.toFixed(2)}
                  </Text>
                </Box>
              </Box>}
            </Box>
          </Box>
        </Box>

        <Box basis='2/3' fill gap='small'>
          <Text color='text-weak' size='xsmall'>Your History</Text>
          <TxHistory filterTerms={['Bought', 'Repaid', 'Deposited', 'Withdrew']} view='borrow' />

        </Box>
      </Box>
    </Box>

  );
};

export default DashBorrow;
