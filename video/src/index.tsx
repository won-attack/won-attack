import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {HynixVideo} from './HynixVideo';
import {LandscapeVideo} from './LandscapeVideo';
import timeline from '../scenes/hynix.json';

const Root:React.FC=()=><>
  <Composition id="Hynix30" component={HynixVideo} width={timeline.width} height={timeline.height} fps={timeline.fps} durationInFrames={timeline.durationInFrames}/>
  <Composition id="SamsungLandscape30" component={LandscapeVideo} defaultProps={{kind:'samsung' as const}} width={1920} height={1080} fps={30} durationInFrames={900}/>
  <Composition id="HyundaiLandscape30" component={LandscapeVideo} defaultProps={{kind:'hyundai' as const}} width={1920} height={1080} fps={30} durationInFrames={900}/>
</>;

registerRoot(Root);
