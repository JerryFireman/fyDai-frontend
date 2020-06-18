import React from 'react';
import { Box, Button, Image, Select, TextInput, Text, Heading, Collapsible } from 'grommet';
import { 
  FiCheckCircle, 
  FiInfo as Info,
  FiHelpCircle as Help,
  FiChevronDown as CaretDown,
  FiSettings as SettingsGear,
} from 'react-icons/fi';

import { IYieldSeries } from '../types';
import ethLogo from '../assets/images/tokens/eth.svg';

interface RepayActionProps {
  repayFn:any
  maxValue:number

  // activeSeries?:IYieldSeries,
  // fixedOpen?:boolean,
  // close?:any,
}

function PaybackAction({ repayFn, maxValue }:RepayActionProps) {

  const [inputValue, setInputValue] = React.useState<any>();
  const [repayType, setRepayType] = React.useState<string>('yDai');

  const TokenSelector = () => {
    return (
      <Box justify='center'>
        <Box round background='border' pad={{ horizontal:'small' }}>
          <Select
            id="select"
            name="select"
            plain
            value={repayType}
            options={['yDai', 'Dai']}
            valueLabel={
              <Box width='xsmall' direction='row' justify='center' align='baseline' gap='xsmall'>
                <Text color='brand' size='xsmall'>{ repayType }</Text>
                <Text color='brand' size='xsmall'><CaretDown /></Text>
              </Box>
          }
            icon={false}
            onChange={(e:any) => {e.stopPropagation(); setRepayType(e.option);}}
          />
        </Box>
      </Box>
    );
  };

  return (
    
    <Box flex='grow' justify='between'>
      <Box margin={{ top:'medium' }} gap='xsmall' align='center' fill='horizontal'>
        <Text alignSelf='start' size='xsmall'> Amount to repay</Text>
        <Box 
          round='small'
          border={{ color:'brand' }}
          direction='row'
          fill='horizontal'
          align='baseline'
          pad={{ horizontal:'small' }}
        >
          {/* <Box width='15px' height='15px'>
            <Image src={ethLogo} fit='contain' />
          </Box> */}
          <TextInput
            type="number"
            placeholder="0"
            value={inputValue}
            plain
            onChange={(event:any) => setInputValue(event.target.value)}
            reverse
          />
          <TokenSelector />
        </Box>
        <Box
          round
          onClick={()=>setInputValue(maxValue)}
          hoverIndicator='brandTransparent'
          border='all'
          pad={{ horizontal:'small', vertical:'none' }}
        >
          <Text alignSelf='start' size='xsmall'>Repay max</Text>
        </Box>
      </Box>

      <Box direction='row' fill='horizontal'>
        <Box pad='xsmall'>
          <Box direction='row' gap='small'>
            <Text size='xsmall'>
              Estimated Dai required:
            </Text>
          </Box>
          <Text weight='bold' size='xsmall'>
            3.45 Dai
          </Text>
        </Box>
        {/* <Box pad='xsmall'>
          <Box direction='row' gap='small'>
            <Text size='xsmall'>
              Expected Dai
            </Text>
            <Help />
          </Box>
          <Text weight='bold' size='xsmall'>
            0 Dai
          </Text>
        </Box> */}
      </Box>

      <Box direction='row' gap='small' margin={{ bottom:'medium' }}>
         
        <Text size='xxsmall'>
          <SettingsGear /> Advanced Options 
        </Text>
      </Box>

      <Box fill='horizontal' alignSelf='end'>
        <Button
          fill='horizontal'
          primary
          disabled={!(inputValue>0)}
          color='brand'
          onClick={()=>repayFn(inputValue, repayType)}
          label={`Repay ${inputValue || ''} ${repayType}`}
        />
      </Box>
    </Box>
  );
}

export default PaybackAction;