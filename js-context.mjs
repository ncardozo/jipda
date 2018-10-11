import {createAst, StringResource} from "./ast";
import {ArraySet, assert} from "./common";
import {createMachine, explore, isSuccessState} from "./abstract-machine";


export function JsContext(semantics, explorer, alloc, kalloc, store, kont)
{
  this.semantics = semantics;
  this.explorer = explorer;
  this.alloc = alloc;
  this.kalloc = kalloc;
  this.store = store;
  assert(kont);
  this.kont0 = kont;
  this.managedValues = ArraySet.empty();
}

JsContext.prototype.explore =
    function (S)
    {
      const resultStates = new Set();
      const initialStates = [...S];
      assert(initialStates.length > 0);
      this.explorer.explore(initialStates, s => resultStates.add(s));
      let value = this.semantics.lat.bot();
      let store = this.semantics.lat.bot();
      //let kont = null;
      if (resultStates.size === 0)
      {
        throw new Error("TODO: no result states");
      }
      for (const s of resultStates)
      {
        if (isSuccessState(s))
        {
          value = value.join(s.value);
          store = store.join(s.store);
          // if (kont)
          // {
          //   if (s.kont !== kont)
          //   {
          //     throw new Error("?");
          //   }
          // }
          // else
          // {
          //   kont = s.kont;
          // }
        }
        else if (s.isThrowState)
        {
          this.managedValues = this.managedValues.add(s.value);
          store = store.join(s.store);
          // if (kont)
          // {
          //   if (s.kont !== kont)
          //   {
          //     throw new Error("?");
          //   }
          // }
          // else
          // {
          //   kont = s.kont;
          // }
          // warning: NESTING JsContexts!
          // cannot wrap jsValue here, because context store doesn't match; therefore: new JsValue(..., new JsC(...))
          console.warn("Uncaught exception: " + new JsValue(s.value, new JsContext(this.semantics, this.explorer, this.alloc, this.kalloc, s.store, this.kont0)).introspectiveToString());
          console.warn(s.stackTrace());
        }
        else
        {
          console.warn("warning: ignoring non-success state " + s)
        }
      }
      assert(store);
      //assert(kont);
      this.store = store;
      //this.kont = kont;
      this.managedValues = this.managedValues.add(value);
      assert(typeof value.addresses === 'function');
      //console.log("managing " + s.value.addresses());
      return new JsValue(value, this);
    }

JsContext.prototype.globalObject =
    function ()
    {
      return new JsValue(this.kont0.realm.GlobalObject, this);
    }

JsContext.prototype.createArray =
    function ()
    {
      return this.evaluateScript(new StringResource("[]"));
    }

// JsContext.prototype.createFunction =
//     function (f)
//     {
//       // Call, store, kont, lkont, machine
// //      ObjClosureCall.prototype.applyFunction =
//   //        function (application, operandValues, thisValue, TODO_REMOVE, store, lkont, kont, states)
//
// //      ObjClosureCall.prototype.applyConstructor =
//   //        function (application, operandValues, protoRef, TODO_REMOVE, store, lkont, kont, states)
//       const semantics = this.semantics;
//       const machine = this.createMachine();
//       const applyFunction = function (application, operandValues, thisValue, TODO_REMOVE, store, lkont, kont, states)
//       {
//
//       };
//       const S = semantics.createFunction(ast, benv, store, lkont, kont, machine);
//       return this.explore(S);
//     }

JsContext.prototype.evaluateScript =
    function (resource)
    {
      const semantics = this.semantics;
      const ast = createAst(typeof resource === "string" ? new StringResource(resource) : resource);
      const benv = this.kont0.realm.GlobalEnv;
      const store = this.store;
      const lkont = [];
      const kont = this.kont0;
      const machine = this.createMachine();
      const S = [machine.evaluate(ast, benv, store, lkont, kont, machine)];
      return this.explore(S);
    }

JsContext.prototype.createMachine =
  function ()
  {
    const rootSet = this.managedValues.reduce(
        function (acc, d)
        {
          return acc.join(d.addresses())
        }, ArraySet.empty());
    return createMachine(this.semantics, this.alloc, this.kalloc, {rootSet});
  }

JsContext.prototype.wrapValue =
  function (d)
  {
    const type = typeof d;
    if (type === 'string' || type === 'null' || type === 'undefined' || type === 'number' || type === 'boolean')
    {
      return new JsValue(this.semantics.lat.abst1(d), this);
    }
    else
    {
      return new JsValue(d, this);
    }
  }


function JsValue(d, context)
{
  this.d = d;
  this.context = context;
}

JsValue.prototype.isNonUndefined =
    function ()
    {
      return this.d.isNonUndefined();
    }

JsValue.prototype.isNonNull =
    function ()
    {
      return this.d.isNonNull();
    }

JsValue.prototype.getProperty =
    function (name)
    {
      const semantics = this.context.semantics;
      const nameValue = typeof name === "string" ? semantics.lat.abst1(name) : name.d;
      const obj = this.d;
      const store = this.context.store;
      const lkont = [];
      const kont = this.context.kont0;
      const machine = this.context.createMachine();
      const S = semantics.$getProperty(obj, nameValue, store, lkont, kont, machine);
      return this.context.explore(S);
    }

JsValue.prototype.assignProperty =
    function (name, value)
    {
      const semantics = this.context.semantics;
      const dName = name instanceof JsValue ? name.d : semantics.lat.abst1(name);
      const dValue = value instanceof JsValue ? value.d : semantics.lat.abst1(value);
      const obj = this.d;
      const store = this.context.store;
      const lkont = [];
      const kont = this.context.kont0;
      const machine = this.context.createMachine();
      const S = semantics.$assignProperty(obj, dName, dValue, store, lkont, kont, machine);
      return this.context.explore(S);
    }

JsValue.prototype.construct =
    function (args)
    {
      const semantics = this.context.semantics;
      const obj = this.d;
      const operandValues = args.map(v => v.d);
      const store = this.context.store;
      const benv = this.context.kont0.realm.GlobalEnv;
      const lkont = [];
      const kont = this.context.kont0;
      const machine = this.context.createMachine();
      const S = semantics.$construct(obj, operandValues, benv, store, lkont, kont, machine);
      return this.context.explore(S);
    }

JsValue.prototype.push =
  function (v)
  {
    const semantics = this.context.semantics;
    const obj = this.d;
    const operandValues = [v.d];
    const store = this.context.store;
    const benv = this.context.kont0.realm.GlobalEnv;
    const lkont = [];
    const kont = this.context.kont0;
    const machine = this.context.createMachine();
    const S = semantics.$getProperty(obj, semantics.lat.abst1("push"), store, lkont, kont, machine);
    const pushMethod = this.context.explore(S);
    const S2 = semantics.$call(pushMethod.d, obj, operandValues, benv, this.context.store, lkont, this.context.kont0, machine);
    return this.context.explore(S2);
  }

// JsValue.prototype[Symbol.iterator] =
//     function* ()
//     {
//       const semantics = this.context.semantics;
//       const obj = this.d;
//       const store = this.context.store;
//       const benv = this.context.kont.realm.GlobalEnv;
//       const lkont = [];
//       const kont = this.context.kont;
//       const machine = this.context.createMachine();
//     }


JsValue.prototype.call =
  function (thisArg, ...args)
  {
    const semantics = this.context.semantics;
    const benv = this.context.kont0.realm.GlobalEnv;
    const lkont = [];
    const machine = this.context.createMachine();
    const S = semantics.$call(this.d, thisArg.d, args.map(x => x.d), benv, this.context.store, lkont, this.context.kont0, machine);
    return this.context.explore(S);
  }

JsValue.prototype.String =
    function ()
    {
      const rator = this.context.globalObject().getProperty("String").d;
      const semantics = this.context.semantics;
      const benv = this.context.kont0.realm.GlobalEnv;
      const lkont = [];
      const machine = this.context.createMachine();
      const thisArg = semantics.lat.abst1(null);
      const S = semantics.$call(rator, thisArg, [this.d], benv, this.context.store, lkont, this.context.kont0, machine);
      return this.context.explore(S);
    }


JsValue.prototype.introspectiveToString =
    function ()
    {
      return introspectiveToString(this.d, this.context.store, this.context.semantics);
    }
function introspectiveToString(d, store, semantics)
{
  const BOT = semantics.lat.bot();
  let str = [];
  if (d.projectObject() !== BOT)
  {
    let sb = "";
    for (const a of d.addresses())
    {
      const obj = store.lookupAval(a);
      sb += a + ":";
      for (const entry of obj.frame.entries())
      {
        sb += "(" + entry[0] + "=>" + entry[1].value + ")";
      }
    }
    str.push(sb);
  }
  if (d.projectUndefined() !== BOT)
  {
    str.push("undefined");
  }
  if (d.projectNull() !== BOT)
  {
    str.push("null");
  }
  if (d.isTrue())
  {
    str.push("true");
  }
  if (d.isFalse())
  {
    str.push("true");
  }
  if (d.projectNumber() !== BOT)
  {
    str.push(d.projectNumber());
  }
  if (d.projectString() !== BOT)
  {
    str.push(d.projectString());
  }
  return "<" + str.join(",") + ">";
}
