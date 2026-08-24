async () => {
  const deleteIds = new Set(["acee1367e1e34b609e527141615ff23f", "044bf1ed6875429285d1ab771dcbf374", "bcee253dde48495cb162c8c6151c8481", "019190e3ab044eac9e2ead8acc11c89c", "3bbe62bef09f4d73b44a5188c728e1c5", "9115e517b6cb415895dfc494f3b979e5", "373e44a505f94a99835f5dee9af46444", "0183196cee654328887522cc34398d01", "b325a555ad0946f39948bcbca0b5b977", "d3aa1178cff3461f8f7e924a826ab27f", "e0f88a77064b471db4d56d3a540398e7", "b8f1f90a610943eb95493af573d33963", "93fb5668d9ff4ba8bd196b8dab350cbb", "5e3e43d22dc24300ade45f2aee0da349", "d36e9e32c4064703b8ac359566d5f71e", "1f7d4f46ed214c6cabfd2f59034c2f37", "424b894a8d5d4625b22709fabc9efe5a", "6e0b86d034aa4357a68e87a4cd229257", "51d0046fe70745afabfaa88b2fc79134", "da47f04b96034690b1347c2b8e7f3508", "46f1dcd722be46428c5fcbf207895473", "140c935d512343369655d64ed232969d", "5e45e7063eb94b00bb40c734a3714ace", "c23a8d95c8bd46f1996c5ba9fe795e20", "fdcef3eda6684152a6993bf2c0d46a4b", "4330fc28d02a43bda0c5be6ae57a6ba9", "b6fec85a47ee4223a566bfc452e07bd9", "87fa78032d4246f3af9558f5423dcebf", "21ef43983c134ea6842eb4ae30e5c078", "cda632a0d6214decbfc3c369ed56d9d3", "f7b8203e8ebd4058a1bd31269d2fe283", "c6e286d53a554684a10e0a4637f2dfd8", "ad77639d64ab4254a35d77198ed74479", "87978f5bb5234952bdceadef2cc2ab68", "93e47f66e99e48ce94d94ac0746eff59", "d5461ac0e5da40b387a00f5925a55b75", "2dad102aea094ae6aa8e3f3e6e86ecd6", "ad47425475904338b55d8c5d1bf06517", "9d2414f5954046c491439e3af825a62c", "06ee0253ca9a44d391bdd64427841c21", "2cbbf4ab65f241bc92a45a9c02b6148e", "3338dd72cfdb4a73897aa421e9a6980e", "4cab7e2a1b294cb1ae88b09156b7fe3c", "36ca7aa2737b466391510f5cd2ace86a", "6ef858891a50494ca1d216c1b98c60ca", "52692cc6294d4d97892aac78c237ffb3", "98a3322880b1453e9aa76569e06f8ac8", "006524cbf2a447d5ae96500f2c91c978", "1845cf93cc18452aa1ccc006c75e3d0f", "38209ead0808428786230c827ac20f29", "2d235a28b4184f4f94260752f2ee9455", "71cc54efc71740c48f97a7843c2b7896", "0ad41d27af854f88bc7cd56b22ebf90f", "d276a3da7f6347aaa066ca109dc51e48", "4a5726b7580f4da8bd9e93672631cdd8", "0b127c0db627432aaa8e5cd7cce58f09", "3f4adb93be504d94b7c7715e068dbf4e", "4a1c94e3ef9140a0b647ad4477c9169b", "599427a278c046fdb90c5b4e801b4f18", "39709eac342b4652829793c142444b15", "41a5e4b87f7d4f14ba4a087ded78085c", "369e32e5581b433abd5df7a62296f596", "c58611e22b1b4a299ad8f95676bec1ed", "bfa7798164154c849c6c7f08bfba8380", "af56e91273cc4eb6b7069444ef9b2fcd", "95f00396d3504140ba26b858288d576a", "cc18a933042e45c2adce510a8bad7e48", "180d709786f24588aa77d8ea394e7eed", "72bd419bdeb64de8b77179368cec535e", "b93018a65d094235bff6cc4372dfbf1d", "e6722f49cb824a36ad91e66677c9e176", "6ce3fa06457e47e4825016af31ec9d1c", "dbb0ea337c654d5aae031ce38bd96235", "03221e95fa424364b8869d0c6e6dc2f9", "6d76f308187a44a4b9323ef83d5f525f", "36722286cb3649d69c077f58744ed51e", "28dc59fc69674296a9424315135ca521", "fcd1788fad0149cf9b159442c7d950b8", "66187627521142a2bdb03891965b73d0", "3a112149a4a74bc9b61043d216639c34", "adb24c53f561412a834ae31eb8598ebc", "e625f912f89d40bebbb4162eeadd8f1f", "2bcc54a976fe43e584f9f4bc1bad5217", "14fc1c1e007e4e95a1bbcefdca48c972", "9d1bf89e99d04f2db90d92e12c1f6ad7", "edc891cbad1e441d94508ef116741301", "6217439b4cbb415d91811030044462a9", "d0b9f3bc7786477e90d071a4a1cba93b", "3fa6810b525c4d0a80cdebad5e807e42", "e06abe4c368044f9bd945c1128bfe8bb", "f96cfd46436b4a7a87ef167edd19a222", "9ed4de95f8084f0c9a6f4a0b0276eb01", "5d9e1fe4b91d4ecf85ec9d9cdf86af69", "81d465cb17be4174a900ef7bf7d9c975", "d851a90026654645bf453c95d9c92275", "b7f88cf95d9540b6af1f94f5b8bc92ab", "2fa94b2dd07a44ae8a5fdac3abfe6724", "056d812679cd4c5e85e708f4c78972e7", "ac4dd12acce549f98afef8c95abf5237", "caca3afb5cc9413fb72f8ec8df3780e0", "6bba585246b342ae8bb0f19de81213a0", "10e411a7983440dda76f7b7892855be7", "acfc82d86dfe441286f365f73b5ed354", "347f7a1e777b41858dc49e0d3ba718bc", "6a21f5c203694f5fae0ea8db03ffbff6", "4166a1fd60da4051b093051ea7b536e8", "10b251dfd00c45a4a43ff3fa4b756b8e", "0d47b98aedaa4bd589ae9c440759d162", "c4092411490f462eb6ee1988d0ede2ba"]);
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
  const beforeVisible = nodeState.nodes.filter(n=>!n.hidden).length;
  const toHide = nodeState.nodes.filter(n => deleteIds.has(n.id) && !n.hidden).map(n=>n.id);
  // also hide junk by matching remaining visible that look like banners/untitled if in delete set only
  projState.hideScreens(toHide);
  await new Promise(r=>setTimeout(r,2000));
  ({nodeState, projState} = findStates());
  const afterVisible = nodeState.nodes.filter(n=>!n.hidden).length;
  const still = nodeState.nodes.filter(n => deleteIds.has(n.id) && !n.hidden).map(n=>n.id);
  // Trigger save
  projState.applyMutations({saveStatus:'dirty'});
  await new Promise(r=>setTimeout(r,10000));
  ({nodeState} = findStates());
  return {
    beforeVisible,
    toHide: toHide.length,
    afterVisible,
    stillVisibleDeletes: still,
    hidden: nodeState.nodes.filter(n=>n.hidden).length,
    total: nodeState.nodes.length,
    finalVisible: nodeState.nodes.filter(n=>!n.hidden).length
  };
}