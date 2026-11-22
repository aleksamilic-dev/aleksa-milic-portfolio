import { Component, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { createRoot, extend, useThree } from '@react-three/fiber';
import { useFactory } from '../store.js';
import { setPage } from './page.js';
import { GL_SETTINGS, SceneContents, cameraFor, useSceneState } from './Scene.jsx';

// The scene, in its worker (worker.js). Everything the main thread's <Canvas>
// did for it is done here by hand: the root on the canvas the page handed
// over, sized from the page's messages, and the canvas state (resolution,
// whether it may draw) applied from inside the tree, since nothing outside it
// re-renders here. The page tells it what it would otherwise read from the
// document: the scroll (the store's progress and beat), the pointer, input,
// whether the tab is hidden, the canvas's size, and the scene's props.

// What <Canvas> takes as props, applied the way it applies them: only on a
// change, so a resolution step or a held draw isn't undone by anything else.
function Host({ tier, portrait, still, pointer }) {
  const state = useSceneState();
  const get = useThree((s) => s.get);
  const setDpr = useThree((s) => s.setDpr);
  const setFrameloop = useThree((s) => s.setFrameloop);
  useLayoutEffect(() => {
    if (get().viewport.dpr !== state.dpr) setDpr(state.dpr);
  }, [state.dpr, get, setDpr]);
  useLayoutEffect(() => {
    if (get().frameloop !== state.frameloop) setFrameloop(state.frameloop);
  }, [state.frameloop, get, setFrameloop]);
  return <SceneContents tier={tier} portrait={portrait} still={still} pointer={pointer} state={state} />;
}

// An error anywhere in the scene goes to the page, which then draws the
// scene itself instead (WorkerScene.jsx).
class Failsafe extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    this.props.onFail(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function start({ canvas, context, init, post }) {
  extend(THREE);

  let hidden = init.hidden;
  const inputs = new Set();
  const watchers = new Set();
  setPage({
    mark: (name, on) => post({ type: 'mark', name, on }),
    onInput(onInput) {
      inputs.add(onInput);
      return () => inputs.delete(onInput);
    },
    onVisibility(onChange) {
      watchers.add(onChange);
      return () => watchers.delete(onChange);
    },
    hidden: () => hidden,
  });

  // as usePointer keeps it: the latest target, eased toward in CameraRig
  const pointer = { current: { x: 0, y: 0, tx: 0, ty: 0 } };
  useFactory.setState({ progress: init.progress, beat: init.beat });

  let rootState = null;
  let pendingSize = null;
  const root = createRoot(canvas);
  root.configure({
    gl: (target) => {
      const gl = new THREE.WebGLRenderer({ ...GL_SETTINGS, canvas: target, context, alpha: true });
      gl.toneMappingExposure = GL_SETTINGS.toneMappingExposure;
      return gl;
    },
    size: { width: init.width, height: init.height, top: 0, left: 0, updateStyle: false },
    dpr: 1,
    frameloop: 'never',
    camera: cameraFor(init.portrait),
    onCreated: (state) => {
      rootState = state;
      if (pendingSize) state.setSize(...pendingSize);
    },
  });

  let props = { tier: init.tier, portrait: init.portrait, still: init.still };
  const onFail = (error) => post({ type: 'failed', why: String(error?.message ?? error) });
  const render = () =>
    root.render(
      <Failsafe onFail={onFail}>
        <Host {...props} pointer={pointer} />
      </Failsafe>,
    );
  render();

  return (message) => {
    switch (message.type) {
      case 'scroll':
        useFactory.setState({ progress: message.progress, beat: message.beat });
        break;
      case 'pointer':
        pointer.current.tx = message.x;
        pointer.current.ty = message.y;
        break;
      case 'input':
        inputs.forEach((onInput) => onInput());
        break;
      case 'visibility':
        hidden = message.hidden;
        watchers.forEach((onChange) => onChange());
        break;
      case 'size': {
        const size = [message.width, message.height, false, 0, 0];
        if (rootState) rootState.setSize(...size);
        else pendingSize = size;
        break;
      }
      case 'props':
        props = { ...props, ...message.props };
        render();
        break;
      default:
    }
  };
}
