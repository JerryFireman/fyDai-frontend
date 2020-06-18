import React from 'react';
import {
  Anchor, 
  Button,
  Box,
  Image,
  Sidebar,
  Text,
  ThemeContext,
  Nav,
  Drop,
} from 'grommet';

import logoDark from '../assets/images/yield.svg';
import logoLight from '../assets/images/yield_light.svg';

import { Spinner } from './LoadingSpinner';

import { IYieldSeries } from '../types';
import { YieldContext } from '../contexts/YieldContext';
import YieldSeriesMenuItem from './YieldSeriesMenuItem';

// import YieldSeries from './YieldSeries';

const YieldSidebar = ({ activeSeries, setActiveSeries, setShowSeriesLayer }:{activeSeries:IYieldSeries|null, setActiveSeries:any, setShowSeriesLayer:any}) => {
  const { state } = React.useContext( YieldContext );
  const [seriesList, setSeriesList] = React.useState<IYieldSeries[]>([]);
  const [showMore, setShowMore] = React.useState<boolean>(false);
  const [openIndex, setOpenIndex] = React.useState<number | null >(null);

  // const handleSelectSeries = (ind: number | null) => {
  //   openIndex !== ind ?
  //     // setOpenIndex(ind) :
  //     // setOpenIndex(null);
  //     setActiveSeries(ind) :
  //     setOpenIndex(null);
  // };

  React.useEffect(() => {
    !state.isLoading && setSeriesList(state.deployedSeries);
  }, [ state.isLoading ]);

  return (
    
    <Sidebar
      // overflow="auto"
      background="background"
      // header={<SidebarHeader />}
      // footer={<SidebarFooter />}
      pad="none"
      gap='small'
      // align='center'
    >
      <Box margin={{ left: 'small', vertical:'none' }} pad='small'>
        <Text size='large'> Series Available </Text>
      </Box>
      
      {state.isLoading && <Spinner />}
      {seriesList.map((x:any, i:number) => {
        return (
          <YieldSeriesMenuItem
            key={x.symbol}
            series={x}
            seriesAction={() => setActiveSeries(x)}
            selected={activeSeries === x}
          />
        );
      })}
      <Box pad='small'>
        <Button 
          color='background-frontheader'
          hoverIndicator='background-frontheader'
          onClick={()=>setShowSeriesLayer(true)}
          label={<Text size='xsmall'>Discover more</Text>}
        />
      </Box>
    </Sidebar>
  );
};

export default YieldSidebar;