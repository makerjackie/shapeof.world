/** Visual drive integrated against the simulation clock. No catch-up rotation
 * after a power cut; rewinding the simulation returns to its initial angle. */
export interface Drive {time:number;angle:number}
export function advanceDrive(previous:Drive,time:number,powered:boolean,reduced:boolean,rate:number):Drive {
  if(time<previous.time)return {time,angle:0}
  return {time,angle:previous.angle+(powered&&!reduced?(time-previous.time)*rate:0)}
}
