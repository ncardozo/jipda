import fs from 'fs';

import Ast from './ast';
import concLattice from './conc-lattice';
import concAlloc from './conc-alloc';
import concKalloc from './conc-kalloc';
import createSemantics from './js-semantics';
import {createMachine, run, computeResultValue, computeInitialCeskState} from './abstract-machine';
import {} from './jipda';

const read = name => fs.readFileSync(name).toString();
const ast0src = read("prelude.js");
const jsSemantics = createSemantics(concLattice, concAlloc, concKalloc, {errors: true});
const initialCeskState = computeInitialCeskState(jsSemantics, ast0src);
const args = process.argv.slice(2);
const src = read(args[0]);

console.log(run2(src));

function run2(src)
{
  const ast = Ast.createAst(src);
  const s0 = createMachine(jsSemantics, {hardAsserts:true, initialState: initialCeskState});
  const s1 = s0.enqueueScriptEvaluation(src);
  const resultStates = new Set();
  const system = run([s1], s => resultStates.add(s));
  const result = computeResultValue(resultStates, concLattice.bot());
  result.msgs.join("\n");
  const actual = result.value;
  return actual;
}

