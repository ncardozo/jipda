import {isSuccessState} from "../abstract-machine.mjs";

function stateToLabel(s)
{
  function kontLabel(s)
  {
    return " | " + s.kont._id;
  }

  if (s.isEvalState)
  {
    return s.node.toString().substring(0, 80) + kontLabel(s);// + " ~ " + s.resource;
  }
  else if (s.isKontState)
  {
    return s.value.toString() + kontLabel(s);// + " ~ " + s.resource;
  }
  else if (s.isReturnState)
  {
    return s.value.toString() + kontLabel(s);
  }
  else if (s.isBreakState)
  {
    return kontLabel(s);
  }
  else if (s.isThrowState)
  {
//    return s.value + "\n" + s.value.addresses().map(addr => s.store.lookupAval(addr).lookup(jsSemantics.lat.abst1("message")).value.Value).join() + kontLabel(s);
    return s.value + " " + kontLabel(s);
  }
  else if (s.isErrorState)
  {
    return s.node.loc.start.line + ": " + s.msg + kontLabel(s);
  }
  else
  {
    return "???" + kontLabel(s);
  }
}

function stateToTooltip(s)
{
  return String(s.kont.resource).substring(0, 40);
}

function stateToColor(s)
{
  if (isSuccessState(s))
  {
    return "yellow";
  }
  else if (s.isEvalState)
  {
    return "pink";
  }
  else if (s.isKontState)
  {
    return "palegreen";
  }
  else if (s.isReturnState)
  {
    return "lightblue";
  }
  else if (s.isBreakState)
  {
    return "lightblue";
  }
  else if (s.isThrowState)
  {
    return "red";
  }
  else if (s.isErrorState)
  {
    return "red";
  }
  else
  {
    return "???";
  }
}

function stateToVertex(s)
{
  return s._id + " [label=\"" + s._id + ": " + stateToLabel(s) + "\",tooltip=\"" + stateToTooltip(s) + "\",color=\""+ stateToColor(s) + "\"];"
}

function dotTransition(s, s2)
{
  return s._id + " -> " + s2._id + ";";
}

export function statesToDot(states)
{
  let sb = "digraph G {\nnode [style=filled,fontname=\"Roboto Condensed\"];\n";
  for (const s of states)
  {
    sb += stateToVertex(s) + "\n";
    if (s._successors)
    {
      for (const s2 of s._successors)
      {
        sb += dotTransition(s, s2) + "\n";
      }
    }
  }
  sb += "}";
  return sb;
}

export function initialStatesToDot(initialStates)
{
  let sb = "digraph G {\nnode [style=filled,fontname=\"Roboto Condensed\"];\n";

  const W = [...initialStates];
  const S = [];
  while (W.length > 0)
  {
    const s = W.pop();
    if (S[s._id])
    {
      continue;
    }
    S[s._id] = true;
    sb += stateToVertex(s) + "\n";
    for (const s2 of s._successors || [])
    {
      sb += dotTransition(s, s2) + "\n";
      W.push(s2)
    }
  }
  sb += "}";
  return sb;
}

export function visitReachableStates(initialStates, cb)
{
  const W = [...initialStates];
  const S = [];
  while (W.length > 0)
  {
    const s = W.pop();
    if (S[s._id])
    {
      continue;
    }
    S[s._id] = true;
    s._successors.forEach(s2 => W.push(s2));
    cb(s);
  }
}
