import React from 'react';
import { Box, Button, Image, Heading, Text } from 'grommet';

import DashBorrow from '../components/DashBorrow';
import DashLend from '../components/DashLend';
import TipButton from '../components/TipButtons';

const Dashboard = () => {

  const [activeView, setActiveView] = React.useState<string>('borrow');

  return (
    <Box gap='small' pad={{ vertical:'large', horizontal:'small' }} fill='horizontal' justify='between'>
      <Box direction='row' fill='horizontal' pad={{ bottom:'large', horizontal:'none' }} justify='between' align='center'>
        <Box>
          <Box direction='row' gap='small'>
            <Heading level='3' margin='none' color='text-strong'>Your dashboard</Heading>
            {/* <Heading level='3' margin='none' onClick={()=>(activeView==='borrow')? setActiveView('lend'):setActiveView('borrow')}><a>{activeView}</a></Heading> */}
          </Box>
          <Box direction='row'> 
            <Text size='xsmall' color='text-weak' >
              Dashboard description · Learn more
            </Text>
          </Box>
        </Box>

        <Box direction='row' gap='small' pad='small'>
          <TipButton text="Tip: Convert your Maker vault" />
        </Box>
      </Box>

      <Box direction='row' pad={{ bottom :'large' }}>
        <Box round='xsmall' direction='row' background='brand-transparent' pad='xxsmall' gap='small'> 
          <Box 
            round='xsmall'
            pad={{ horizontal:'large', vertical:'xxsmall' }}
            background={(activeView === 'borrow')? 'background-front' : undefined}
            elevation={(activeView === 'borrow')? 'small' : undefined}
            onClick={()=>setActiveView('borrow')}
          >
            <Text size='xsmall'> Borrow view </Text>
          </Box>
          <Box 
            round='xsmall'
            pad={{ horizontal:'large', vertical:'xxsmall' }}
            background={(activeView === 'lend') ? 'background-front' : undefined}
            elevation={(activeView === 'lend')? 'small' : undefined}
            onClick={()=>setActiveView('lend')}
          >
            <Text size='xsmall'> Lend view </Text>
          </Box>
        </Box>
      </Box>

      { activeView === 'borrow' && <DashBorrow /> }
      { activeView === 'lend' && <DashLend /> }
    </Box>
  );
};

export default Dashboard;
