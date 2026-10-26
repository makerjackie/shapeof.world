/** Original, zero-delay Boolean teaching netlist. Not extracted from alu_top. */
export type Gate = { id: string; kind: 'NAND' | 'NOT'; inputs: string[]; value: boolean; depth: number; bit: number }
export type Circuit = { gates: Gate[]; values: Record<string, boolean>; depths: Record<string, number>; sums: string[]; carry: string; result: number; maxDepth: number }
export const bitValue = (value: number) => Math.max(0, Math.min(15, Math.trunc(Number.isFinite(value) ? value : 0)))
export function buildAdder(a: number, b: number, bits = 4, carryIn = false): Circuit {
  const values: Record<string,boolean> = { C0: carryIn }, depths: Record<string,number> = { C0: 0 }
  const gates: Gate[] = [], sums: string[] = []
  const nand = (id: string, inputs: string[], bit: number) => {
    values[id] = !inputs.every(input => values[input]); depths[id] = 1 + Math.max(...inputs.map(input => depths[input]))
    gates.push({ id, inputs, bit, kind: 'NAND', value: values[id], depth: depths[id] }); return id
  }
  for (let bit=0;bit<bits;bit++) {
    const A=`A${bit}`, B=`B${bit}`, C=`C${bit}`
    values[A]=!!(bitValue(a)&(1<<bit)); values[B]=!!(bitValue(b)&(1<<bit)); depths[A]=depths[B]=0
    const n=nand(`b${bit}n`,[A,B],bit)
    const x=nand(`b${bit}x`,[A,n],bit), y=nand(`b${bit}y`,[B,n],bit)
    const p=nand(`b${bit}p`,[x,y],bit) // XOR from four NAND gates
    const q=nand(`b${bit}q`,[p,C],bit)
    const r=nand(`b${bit}r`,[p,q],bit), s=nand(`b${bit}s`,[C,q],bit)
    sums.push(nand(`S${bit}`,[r,s],bit)); nand(`C${bit+1}`,[n,q],bit)
  }
  const carry=`C${bits}`
  const result=sums.reduce((n,key,i)=>n+(values[key]?2**i:0),0)+(values[carry]?2**bits:0)
  return { gates, values, depths, sums, carry, result, maxDepth: Math.max(...gates.map(g=>g.depth)) }
}
export function primitiveCircuit(kind: 'not'|'nand', a: boolean, b: boolean): Circuit {
  const id='Y', gate: Gate={id, kind:kind==='not'?'NOT':'NAND', inputs:kind==='not'?['A']:['A','B'], value:kind==='not'?!a:!(a&&b), depth:1,bit:0}
  return {gates:[gate], values:{A:a,B:b,Y:gate.value},depths:{A:0,B:0,Y:1},sums:['Y'],carry:'',result:Number(gate.value),maxDepth:1}
}
