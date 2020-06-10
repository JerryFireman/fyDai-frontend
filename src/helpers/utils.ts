import { ethers } from 'ethers';

const { bigNumberify } = ethers.utils;

export const WETH = ethers.utils.formatBytes32String('WETH');
export const CHAI = ethers.utils.formatBytes32String('CHAI');

// / @dev Converts a number to WAD precision, for number up to 10 decimal places
export const toWad = (value:number) => {
  const exponent = bigNumberify('10').pow(bigNumberify('8'));
  return bigNumberify(value*10**10).mul(exponent);
};

// / @dev Converts a number to RAY precision, for number up to 10 decimal places
export const toRay = (value:number) => {
  const exponent = bigNumberify('10').pow(bigNumberify('17'));
  return bigNumberify(value*10**10).mul(exponent);
};

// / @dev Converts a number to RAD precision, for number up to 10 decimal places
export const toRad = (value:number) => {
  const exponent = bigNumberify('10').pow(bigNumberify('35'));
  return bigNumberify(value*10**10).mul(exponent);
};

// / @dev Adds two numbers
// / I.e. addBN(ray(x), ray(y)) = ray(x - y)
export const addBN = (x:number, y:number) => {
  return bigNumberify(x).add(bigNumberify(y));
};

// / @dev Substracts a number from another
// / I.e. subBN(ray(x), ray(y)) = ray(x - y)
export const subBN = (x:number, y:number) => {
  return bigNumberify(x).sub(bigNumberify(y));
};

// / @dev Multiplies a number in any precision by a number in RAY precision, with the output in the first parameter's precision.
// / I.e. mulRay(wad(x), ray(y)) = wad(x*y)
export const mulRay = (x:number, ray:number) => {
  const unit = bigNumberify('10').pow(bigNumberify('27'));
  return bigNumberify(x).mul(bigNumberify(ray)).div(unit);
};

// / @dev Divides a number in any precision by a number in RAY precision, with the output in the first parameter's precision.
// / I.e. divRay(wad(x), ray(y)) = wad(x/y)
export const divRay = (x:number, ray:number) => {
  const unit = bigNumberify('10').pow(bigNumberify('27'));
  return unit.mul(bigNumberify(x)).div(bigNumberify(ray));
};