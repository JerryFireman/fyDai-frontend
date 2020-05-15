import React from 'react';
import { Layer, Box, DropButton, Button, TextInput, Header, Text, Heading, Footer, Collapsible, ThemeContext } from 'grommet';
import moment from 'moment';
import {
  FaCaretDown as CaretDown,
  FaTimes as Close,
} from 'react-icons/fa';

import SlideConfirm from './SlideConfirm';
import { IYieldSeries } from '../types';

import { NotifyContext } from '../contexts/NotifyContext';

type LendConfirmLayerProps = {
  series: IYieldSeries,
  closeLayer: any,
};

function LendLayer({ series, closeLayer }:LendConfirmLayerProps) {
  const [inputValue, setInputValue] = React.useState<any>();
  const [confirmOpen, setConfirmOpen] = React.useState<boolean>(false);
  const theme = React.useContext<any>(ThemeContext);
  const { notify } = React.useContext(NotifyContext);
  const {
    maturityDate:date,
    interestRate:interest,
    currentValue:value,
  } = series;

  const handleConfirm = async () => {
    closeLayer();
    notify({ message:'Transaction pending....', type:'info', showFor:4000 });
    await setTimeout(() => {
      notify({ message:'Transaction processed', type:'success' });
    }, 3000);
  };

  return (
    <Layer>
      <Box
        pad='none'
        round='medium'
        background='background-front'
        fill
      >
        <Collapsible direction='vertical' open={!confirmOpen}>
          <Header 
            round
            fill='horizontal'
            background='background-frontheader'
            pad={{ horizontal: 'medium', vertical:'xsmall' }}
            align='center'
            direction='column'
          >
            <Heading level='4' margin={{ bottom:'none' }}> yDai-{moment(date).format('MMYY')}</Heading>
            <Box gap='xsmall' margin='small' align='center'>
              {/* <Text size='xsmall'> {`Maturation date: ${moment(date).format('MMM YYYY')}`} </Text>
              <Text size='xsmall'> {`Est. Price: ${value} DAI`} </Text> */}
            </Box>
          </Header>

          <Box margin='medium' direction='column' align='center'>

            <Box margin={{ bottom:'small' }} direction='row' justify='end' fill='horizontal'>
              <DropButton
                color='background-front'
                label={
                  <Box 
                    direction='row'
                    gap='xsmall'
                    align='center'
                  >
                    <Text color='#FF007F'><span role='img'>🦄</span> Uniswap</Text>
                    <CaretDown />
                  </Box>
                }
                dropAlign={{ top: 'bottom', right: 'right' }}
                dropContent={
                  <Box pad="medium" background="light-2" round="xsmall">
                    <Text size='xsmall'>More providers coming soon!</Text> 
                  </Box>
                  }
              />
            </Box>

            <Box gap='xsmall' direction='row' justify='end' align='baseline' fill='horizontal'>
              {/* <Text> Buy  </Text> */}
              <Box fill>
                <TextInput
                  size='large'
                  type="number"
                  placeholder="Amount"
                  value={inputValue}
                  onChange={event => setInputValue(event.target.value)}
                  icon={<Text>yDai</Text>}
                  reverse
                />
              </Box>
            </Box>

            <Box pad='small' round='small' direction='row' justify='between' fill='horizontal'>
              <Box direction='column'>
                <Text size='xsmall'>Interest @ maturity </Text>
                <Text size='8px'> (includes Uniswap fee) </Text>
              </Box>
              <Box>
                <Text size='xsmall'>{interest}%</Text>
              </Box>
            </Box>
          </Box>

          <Footer direction='row' justify='evenly' pad='medium'>
            <Button label='Cancel' color='border' onClick={()=>closeLayer()} /> 
            <Button primary label='Buy' onClick={()=>setConfirmOpen(true)} /> 
          </Footer>
        </Collapsible>

        <Collapsible direction='vertical' open={confirmOpen}>
          <Header 
            round
            fill='horizontal'
            background='background-frontheader'
            pad={{ horizontal: 'medium', vertical:'xsmall' }}
            align='baseline'
            justify='center'
            direction='row'
          >
            <Heading level='4' margin={{ bottom:'none' }}> Confirm transaction</Heading>
            <Button icon={<Close />} color='border' onClick={()=>closeLayer()} /> 
          </Header>
          <Box margin='large' gap='large' direction='column' align='center'>
            <Box>
              <Text> ** Tx Information **</Text>
              <Text>'yDai-{moment(date).format('MMYY')}' series</Text>
              <Text> {inputValue} yDai @ {value}</Text>
              <Text> some other info? </Text>
            </Box>
            <Footer direction='row' justify='evenly' pad='medium'>
              <SlideConfirm brandColor={theme.global.colors.brand.light} onConfirm={()=>handleConfirm()} />
            </Footer>
          </Box>
        </Collapsible>

      </Box>
    </Layer>
  );
}

export default LendLayer;
