import {Composition} from 'remotion';
import {Episode} from './Episode';
import {FPS, TOTAL} from './timeline';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Explainer" component={Episode} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
  </>
);
