/** Numerical ordinates of the first 20 conjugate pairs; NIST DLMF §25.10. */
export const ZERO_HEIGHTS = [14.134725141735,21.022039638772,25.010857580146,30.424876125860,32.935061587739,37.586178158826,40.918719012147,43.327073280915,48.005150881167,49.773832477672,52.970321477714,56.446247697063,59.347044002602,60.831778524609,65.112544048082,67.079810529494,69.546401711174,72.067157674482,75.704690699084,77.144840068875] as const
export function primesUpTo(max: number): number[] {
 const sieve = new Uint8Array(Math.max(2, Math.floor(max) + 1)); sieve.fill(1, 2)
 for (let p=2;p*p<=max;p++) if(sieve[p]) for(let n=p*p;n<=max;n+=p)sieve[n]=0
 return Array.from(sieve.entries()).filter(([,p])=>p).map(([n])=>n)
}
export function mangoldt(n: number): number {
 if (!Number.isInteger(n)||n<2) return 0
 for(let p=2;p<=n;p++)if(n%p===0){let m=n;while(m%p===0)m/=p;return m===1?Math.log(p):0}
 return 0
}
export function psi(x: number): number {let s=0;for(let n=2;n<=Math.floor(x);n++)s+=mangoldt(n);return s}
/** Pair rho=1/2+i gamma with its conjugate in the von Mangoldt formula. */
export function zeroCorrection(x: number, gamma: number): number {
 const phase=gamma*Math.log(x)
 return -2*Math.sqrt(x)*(.5*Math.cos(phase)+gamma*Math.sin(phase))/(.25+gamma*gamma)
}
export function finitePsi(x: number, count: number): number {
 if(x<=1)throw new RangeError('x must exceed one')
 let result=x-Math.log(2*Math.PI)-.5*Math.log(1-1/(x*x))
 for(let i=0;i<Math.min(ZERO_HEIGHTS.length,Math.max(0,count));i++)result+=zeroCorrection(x,ZERO_HEIGHTS[i])
 return result
}
export const FILM_SECONDS=64
export const CHAPTERS=[0,15,30,47] as const
export function smooth(a:number,b:number,x:number){const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t)}
export function chapterAt(t:number){return t<15?0:t<30?1:t<47?2:3}
