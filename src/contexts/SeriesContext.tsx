import React, { useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { ethers, BigNumber } from 'ethers';
import {  useWeb3React } from '@web3-react/core';

import * as utils from '../utils';
import { IYieldSeries } from '../types';
import { YieldContext } from './YieldContext';

import { UserContext } from './UserContext';

import { useSignerAccount } from '../hooks/connectionHooks';
import { usePool } from '../hooks/poolHook';
import { useMath } from '../hooks/mathHooks';
import { useToken } from '../hooks/tokenHook';
import { useController } from '../hooks/controllerHook';
import { useCallTx } from '../hooks/chainHooks';

const SeriesContext = React.createContext<any>({});

const initState = { 
  seriesData : new Map(),
  activeSeries: null,
  seriesLoading : true,
};

function reducer(state:any, action:any) {
  switch (action.type) {
    case 'updateSeries':
      return {
        ...state,
        seriesData: action.payload,
      };
    case 'setActiveSeries':
      return {
        ...state,
        activeSeries: action.payload,
      };
    case 'isLoading':
      return { 
        ...state,
        seriesLoading: action.payload
      };
    default:
      return state;
  }
}

const SeriesProvider = ({ children }:any) => {

  const { account, provider, fallbackProvider, chainId } = useSignerAccount();
  // const { chainId } = useWeb3React();
  const [ state, dispatch ] = React.useReducer(reducer, initState);
  const { state: yieldState } = useContext(YieldContext);
  const { yieldLoading, deployedContracts } = yieldState;

  const { state: { authorization: { dsProxyAddress } } } = useContext(UserContext);

  const { previewPoolTx, checkPoolDelegate, checkPoolState } = usePool();
  const { debtDai } = useController();
  const { getBalance, getTokenAllowance } = useToken();

  const [ callTx ] = useCallTx();
  const { calcAPR, poolPercent: calcPercent }  = useMath();

  const { pathname } = useLocation();

  const _prePopulateSeriesData = (seriesArr:IYieldSeries[]) => {
    /* preMap is for faster loading - creates an initial map from the cached data */
    const preMap= seriesArr.reduce((acc: Map<string, any>, x:any) => {
      const _x = { ...x, isMature: ()=>( x.maturity < Math.round(new Date().getTime() / 1000)) };
      return acc.set( x.maturity, { ..._x });
    }, state.seriesData);
    dispatch( { type:'updateSeries', payload: preMap });
    return preMap;
  };

  /* PRIVATE Get the data for a particular series, OR set of series  */
  const _getSeriesData = async (seriesArr:IYieldSeries[]) => {
    /* concurrently get all the series data */
    const _seriesData = await Promise.all(
      seriesArr.map( async (x:IYieldSeries, i:number) => {
        const _x = { ...x, isMature: ()=>( x.maturity < Math.round(new Date().getTime() / 1000)) };
        /* with no user */
        const [ sellFYDaiRate, totalSupply ] = await Promise.all([
          await previewPoolTx('sellFYDai', _x, 1),
          await callTx(_x.poolAddress, 'Pool', 'totalSupply', []),
        ]);

        /* with user */
        const [ poolTokens, hasPoolDelegatedProxy, hasDaiAuth, hasFyDaiAuth, ethDebtDai, ethDebtFYDai, fyDaiBalance] =  account && await Promise.all([
          getBalance(_x.poolAddress, 'Pool', account),
          checkPoolDelegate(_x.poolAddress, deployedContracts.PoolProxy),
          getTokenAllowance(deployedContracts.Dai, _x.poolAddress, 'Dai'),
          getTokenAllowance(_x.fyDaiAddress, _x.poolAddress, 'FYDai'),
          debtDai('ETH-A', _x.maturity ),
          callTx(deployedContracts.Controller, 'Controller', 'debtFYDai', [utils.ETH, _x.maturity, account]),
          getBalance(_x.fyDaiAddress, 'FYDai', account),
        ]) || [];

        return {
          ..._x,
          sellFYDaiRate: !(sellFYDaiRate instanceof Error)? sellFYDaiRate : BigNumber.from('0'),
          totalSupply,
          poolTokens: poolTokens || BigNumber.from('0'),
          hasPoolDelegatedProxy: hasPoolDelegatedProxy || false,
          hasDaiAuth: (hasDaiAuth && hasDaiAuth>0) || false, 
          hasFyDaiAuth: (hasFyDaiAuth && hasFyDaiAuth>0) || false,

          authComplete: ( !!hasDaiAuth && !!hasFyDaiAuth && !!hasPoolDelegatedProxy),
          
          ethDebtDai: ethDebtDai || BigNumber.from('0'),
          ethDebtFYDai : ethDebtFYDai || BigNumber.from('0'),
          fyDaiBalance : fyDaiBalance || BigNumber.from('0'),
        };
      })
    );

    /* Parse the data */
    const _parsedSeriesData = _seriesData.reduce((acc: Map<string, any>, x:any) => {
      const yieldAPR = calcAPR(x.sellFYDaiRate, ethers.utils.parseEther('1'), x.maturity);
      const poolPercent = calcPercent(x.totalSupply, x.poolTokens);
      const poolState = checkPoolState(x);
      return acc.set(
        x.maturity,
        { ...x,
          sellFYDaiRate_: utils.cleanValue(ethers.utils.formatEther(x.sellFYDaiRate), 2),
          totalSupply_: utils.cleanValue(ethers.utils.formatEther(x.totalSupply), 2),
          fyDaiBalance_: utils.cleanValue(ethers.utils.formatEther(x.fyDaiBalance), 2),
          ethDebtFYDai_: utils.cleanValue(ethers.utils.formatEther(x.ethDebtFYDai), 2),
          ethDebtDai_: utils.cleanValue(ethers.utils.formatEther(x.ethDebtDai), 2),
          poolTokens_: utils.cleanValue(ethers.utils.formatEther(x.poolTokens), 6),
          yieldAPR_: yieldAPR.toFixed(2),
          yieldAPR,
          poolState,
          poolPercent: poolPercent.toFixed(4),  
        }
      );
    }, state.seriesData);

    console.log(_parsedSeriesData);
    /* Update state and return  */
    dispatch( { type:'updateSeries', payload: _parsedSeriesData });
    return _parsedSeriesData;
  };

  /* PUBLIC EXPOSED (via actions) Update series from a list of series */
  const updateSeries = async (seriesArr:IYieldSeries[], firstLoad:boolean ) => {

    const seriesFromUrl = parseInt(pathname.split('/')[2], 10);

    if(!yieldLoading) {
      dispatch({ type:'isLoading', payload: true });

      /* Pre-populate info with cached data if available */
      if (firstLoad) {
        const preMap:any = _prePopulateSeriesData(seriesArr);
        const preSeries: IYieldSeries[] = Array.from(preMap.values());
        const preSelect = preSeries
          .filter((x:IYieldSeries)=>!x.isMature())
          .sort((a:IYieldSeries, b:IYieldSeries)=> a.maturity-b.maturity );
        /* check if the value in the url is a valid series date, if so, use it */
        if (preMap.get(seriesFromUrl)) {
          dispatch({ type:'setActiveSeries', payload: preMap.get(seriesFromUrl) });
        } else {
          dispatch({ type:'setActiveSeries', payload: preMap.get(preSelect[0].maturity) });
        }
      }
      
      /* Build/Re-build series map with data */ 
      const seriesMap:any = await _getSeriesData(seriesArr); 

      /* Set the active series */
      if (seriesArr.length===1 ){ 
      /* if there was only one series updated set that one as the active series */   
        dispatch({ type:'setActiveSeries', payload: seriesMap.get(seriesArr[0].maturity) }); 
      } else {
      /* if no active series or multiple updated, set it to non-mature series that is maturing soonest. */
        const unmatureSeries: IYieldSeries[] = Array.from(seriesMap.values());
        const toSelect = unmatureSeries
          .filter((x:IYieldSeries)=>!x.isMature())
          .sort((a:IYieldSeries, b:IYieldSeries)=> a.maturity-b.maturity );

        /* check if the value in the url is a valid series date, if so, use it */
        if (seriesMap.get(seriesFromUrl)) {
          dispatch({ type:'setActiveSeries', payload: seriesMap.get(seriesFromUrl) });
        } else {
          dispatch({ type:'setActiveSeries', payload: seriesMap.get(toSelect[0].maturity) });
        }
      } 
      dispatch({ type:'isLoading', payload: false });
    }
  };

  /* Init all the series once yieldState is not loading and re-init on any user and/or network change */
  useEffect( () => {
    (provider || fallbackProvider) && !yieldLoading && ( async () => {
      await updateSeries(yieldState.deployedSeries, true);
    })();
  }, [ provider, fallbackProvider, chainId, account, yieldLoading ]);

  /* Actions for updating the series Context */
  const actions = {
    updateSeries: (series:IYieldSeries[]) => updateSeries(series, false), /* updates one, or any number of series */
    updateActiveSeries: () => updateSeries([state.activeSeries], false), /* updates only the active series */
    setActiveSeries: (seriesMaturity:string) => dispatch({ type:'setActiveSeries', payload: state.seriesData.get(seriesMaturity) }),
  };

  return (
    <SeriesContext.Provider value={{ state, actions }}>
      {children}
    </SeriesContext.Provider>
  );
};

export { SeriesContext, SeriesProvider };
