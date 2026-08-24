async () => {
  const deleteIds = new Set(window.__DELETE_IDS__ || []);
  const rootEl = document.querySelector('#root');
  const fiberKey = Object.keys(rootEl).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactContainer'));
  function findStates() {
    let fiber = rootEl[fiberKey];
    let nodeState=null, projState=null;
    const seen=new WeakSet();
    (function walk(node, depth) {
      if (!node || depth>100) return;
      if (seen.has(node)) return;
      seen.add(node);
      let s=node.memoizedState, hops=0;
      while (s && hops<150) {
        const val=s.memoizedState;
        if (val && typeof val==='object') {
          if (Array.isArray(val.nodes) && val.nodes.length>50) nodeState=val;
          if (typeof val.hideScreens==='function' && val.projectId) projState=val;
        }
        s=s.next; hops++;
      }
      walk(node.child, depth+1); walk(node.sibling, depth+1);
    })(fiber.stateNode && fiber.stateNode.current || fiber.child || fiber, 0);
    return {nodeState, projState};
  }
  let {nodeState, projState} = findStates();
  if (!nodeState || !projState) return {err:'missing state'};
  const beforeVisible = nodeState.nodes.filter(n=>!n.hidden).length;
  const toHide = nodeState.nodes.filter(n => deleteIds.has(n.id) && !n.hidden).map(n=>n.id);
  projState.hideScreens(toHide);
  await new Promise(r=>setTimeout(r,2500));
  ({nodeState, projState} = findStates());
  const afterVisible = nodeState.nodes.filter(n=>!n.hidden).length;
  const still = nodeState.nodes.filter(n => deleteIds.has(n.id) && !n.hidden).map(n=>n.id);
  projState.applyMutations({saveStatus:'dirty'});
  await new Promise(r=>setTimeout(r,12000));
  ({nodeState} = findStates());
  return {
    beforeVisible,
    toHideCount: toHide.length,
    afterVisible,
    stillVisibleDeletes: still,
    hidden: nodeState.nodes.filter(n=>n.hidden).length,
    total: nodeState.nodes.length,
    finalVisible: nodeState.nodes.filter(n=>!n.hidden).length
  };
}