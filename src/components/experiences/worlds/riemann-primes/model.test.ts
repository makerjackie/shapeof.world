import { describe,it,expect } from 'vitest'
import {primesUpTo,mangoldt,psi,finitePsi,ZERO_HEIGHTS,chapterAt} from './model'
describe('Riemann visualization scientific anchors',()=>{
 it('sieves actual primes and excludes one/composites',()=>{expect(primesUpTo(30)).toEqual([2,3,5,7,11,13,17,19,23,29])})
 it('weights prime powers, not all composites or ordinary prime counts',()=>{expect(mangoldt(8)).toBeCloseTo(Math.log(2));expect(mangoldt(12)).toBe(0);expect(psi(10)).toBeCloseTo(Math.log(2520))})
 it('uses known finite zeros in their true order',()=>{expect(ZERO_HEIGHTS[0]).toBeCloseTo(14.1347251417);expect(ZERO_HEIGHTS.every((v,i)=>i===0||v>ZERO_HEIGHTS[i-1])).toBe(true)})
 it('finite explicit formula resolves weighted counts within truncation error away from jumps',()=>{for(const x of [10.5,20.5,30.5,50.5])expect(Math.abs(finitePsi(x,20)-psi(x))).toBeLessThan(2)})
 it('independently verifies every stored ordinate using Euler-transformed eta',()=>{
  for(const t of ZERO_HEIGHTS){
   const re:number[]=[],im:number[]=[];for(let n=1;n<=300;n++){const a=t*Math.log(n),m=1/Math.sqrt(n);re.push(m*Math.cos(a));im.push(-m*Math.sin(a))}
   let x=0,y=0;for(let k=0;k<280;k++){x+=re[0]*2**(-k-1);y+=im[0]*2**(-k-1);for(let j=0;j<re.length-1;j++){re[j]-=re[j+1];im[j]-=im[j+1]}re.pop();im.pop()}
   // eta(s)=(1-2^(1-s))*zeta(s); the prefactor does not vanish on Re(s)=1/2.
   expect(Math.hypot(x,y)).toBeLessThan(1e-10)
  }
 })
 it('rejects the singular endpoint and deterministically locates every film beat',()=>{expect(()=>finitePsi(1,20)).toThrow();expect([0,15,30,47,64].map(chapterAt)).toEqual([0,1,2,3,3])})
})
