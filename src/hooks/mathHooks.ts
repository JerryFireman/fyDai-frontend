import React from 'react';
import { ethers, BigNumber }  from 'ethers';
import * as utils from '../utils';
import { YieldContext } from '../contexts/YieldContext'; // TODO sort out this cyclic ref (not critical)


/**
 * Hook for Yield maths functions
 * 
 * ( not really 'hooks' - but beneficial to keep app logic together.)
 * 
 * @returns { function } addEventListner
 * @returns { function } removeEventListener
 * @returns { function } getEvents
 */
export const useMath = () => {

  const { state: { feedData, userData } } = React.useContext(YieldContext);
  const { ilks } = feedData;
  const ethPosted = userData?.ethPosted || BigNumber.from('0');
  // const { seriesRates, seriesData } = React.useContext(SeriesContext);

  /**
   * Gets the amount of collateral posted in Wei
   * @returns {BigNumber}
   */
  const collAmount = (): BigNumber => {
    return ethPosted;
  };

  /**
   * Calculates the USD value per unit collateral
   * @returns {BigNumber} USD in Ray precision
   */
  const collPrice = (): BigNumber => {
    // TODO: Update this to use ETH-A Oracle - not ilks.spot for market price USD
    console.log('ETH price:', ethers.utils.formatEther(utils.mulRay(utils.toWad(1.5), (ilks.spot)).toString()));
    return utils.mulRay(utils.toRay(1.5), (ilks.spot));
  };

  /**
   * Calculates the total value of collateral at the current unit price
   * @returns {BigNumber} USD value (in wad/wei precision)
   */
  const collValue = (): BigNumber => {
    console.log('Collateral Value USD:', ethers.utils.formatEther( utils.mulRay(collAmount(), collPrice()) ) );
    return utils.mulRay(collAmount(), collPrice());
  };

  /**
   * Calculates value of debt (yDaiDebt at maturity or Dai) at current DAI price
   * the rate used is the rate and spot price of Dai.
   * @param {BigNumber} _amount yDai amount (= amount of Dai at maturity)
   * @returns
   */
  const debtValAdj = (_amount:BigNumber ) => {
    // this would require a DAI/USD (ratio fluctuations? ) but maybe just assume it will be 1 at maturity?
    return _amount;
  };

  /**
   * Calculates the collateralisation ratio 
   * ETH collat value and DAI debt value (in USD)
   *
   * @param {BigNumber} _collateralValue (wei/wad precision)
   * @param {BigNumber} _debtValue (wei/wad precision)
   * @returns {BigNumber} in Ray
   */
  const collRatio = (_collateralValue:BigNumber, _debtValue:BigNumber) => {
    if (_debtValue.eq(0) ) {
      // handle this case better
      return BigNumber.from(0);
    }
    console.log('colRatio in RAY :', utils.divRay(_collateralValue, _debtValue).toString());
    return utils.divRay(_collateralValue, _debtValue);
  };

  /**
   * Calculates the collateralisation percentage from a RAY ratio
   *
   * @param {BigNumber} _collateralizationRate(Ray precision)
   * @returns {BigNumber} percentage as a big number
   */
  const collPercent = ( _collateralizationRate:BigNumber ) => {
    console.log('collat %:', utils.mulRay(BigNumber.from('100'), _collateralizationRate).toString());
    return utils.mulRay(BigNumber.from('100'), _collateralizationRate);
  };

  /**
   * Calculates an ESTIMATE of the collateralisation ratio 
   * ETH collat value and DAI debt value (in USD) using 
   * normal numbers
   *
   * @param {number} _collateralAmount  amount of collateral (eg. 10ETH)
   * @param {number} _debtValue value of dai debt (in USD)
   * @returns {number}
   */
  // TODO merge this in to the 'collateralization ratio function' above.
  const estCollRatio = (_collateralAmount:Number, _debtValue:Number) => {
    if (!_collateralAmount || _debtValue === 0 ) {
      // TODO handle this better
      return undefined;
    }
    const _colAmnt = ethers.utils.parseEther(_collateralAmount.toString());
    const _debtVal = ethers.utils.parseEther(_debtValue.toString());
    const _colVal = utils.mulRay(_colAmnt, collPrice());
    const _ratio = utils.divRay(_colVal, _debtVal);
    console.log( parseFloat(utils.mulRay(BigNumber.from('100'), _ratio).toString()) );
    return parseFloat(utils.mulRay(BigNumber.from('100'), _ratio).toString());
  };

  /**
   * Minimum amount of collateral required to stay above liquidation point
   *
   * @param {BigNumber} _debtValue (wei/wad precision)
   * @param {number} _liquidationRatio eg. 1.5
   * @param { BigNumber } _collateralPrice (in Ray precision)
   * @returns {BigNumber} (wad/wei precision)
   */
  const minSafeColl=(_debtValue:BigNumber, _liquidationRatio:number, _collateralPrice:BigNumber)=> {
    const _s = utils.divRay( utils.toRay(_liquidationRatio), _collateralPrice);
    const _msc = utils.mulRay(_debtValue, _s);
    console.log('minSafeColl:', ethers.utils.formatEther(_msc).toString());
    return _msc;
  };

  /**
   *  Calculates the liquidation price
   *
   * @param {BigNumber} _collateralAmount
   * @param {BigNumber} _debtValue
   * @param {number} _liquidationRatio eg. 150
   * @returns
   */
  const liquidationPrice = (
    _collateralAmount:BigNumber,
    _debtValue:BigNumber,
    _liquidationRatio:number
  ) => {
    if (_collateralAmount.eq(0)) {
      // // Do something here to handle 0 collateral
      // const ratio = createCurrencyRatio(USD, _collateralAmount.type);
      // handle this case better
      return BigNumber.from(0);
    }
    return _debtValue.mul(_liquidationRatio).div(_collateralAmount);
  };

  /**
   * Max amount of Dai that can be borrowed
   *
   * @param {BigNumber} _collateralValue in wei wad precision
   * @param {BigNumber} _debtValue in wei wad precision
   * @param {number} _liquidationRatio eg. 1.5
   * @returns {BigNumber} in wei/wad precision
   */
  const daiAvailable =(_collateralValue:BigNumber, _debtValue:BigNumber, _liquidationRatio:number) =>{
    const maxSafeDebtValue = utils.divRay(_collateralValue, utils.toRay(_liquidationRatio));
    const _max = _debtValue.lt(maxSafeDebtValue) ? maxSafeDebtValue.sub(_debtValue) : BigNumber.from('0');
    console.log('max debt:', ethers.utils.formatEther(_max).toString());
    return _max;
  };

  /**
   * Annualised Yield Rate
   *
   * @param { BigNumber } _rate // current [Dai] price per unit y[Dai]
   * @param { number } _maturity  // date of maturity 
   * @returns { number }
   */
  const yieldAPR =(_rate: BigNumber, _maturity:number)=> {
    const secsToMaturity = _maturity - (Math.round(new Date().getTime() / 1000));
    const propOfYear = secsToMaturity/utils.SECONDS_PER_YEAR;
    const priceRatio = 1 / parseFloat(ethers.utils.formatEther(_rate));
    const powRatio = 1 / propOfYear;
    const apr = Math.pow(priceRatio, powRatio) - 1;
    // console.log('series:', _maturity, 'APR:', apr);
    return apr;
  };

  return {
    yieldAPR,
    collAmount,
    collValue,
    collPrice,
    debtValAdj,
    collRatio,
    collPercent,
    estCollRatio,
    minSafeColl,
    daiAvailable
  } as const;

};
