import {Audio} from '@remotion/media';
import React from 'react';
import {Sequence, staticFile, Track} from 'remotion';
import {AboutInputs, AboutLayers, AboutWhat} from './scenes/AboutScenes';
import {ChartScene} from './scenes/ChartScene';
import {ClosingScene} from './scenes/ClosingScene';
import {LessonsScene} from './scenes/LessonsScene';
import {MapScene} from './scenes/MapScene';
import {PolicyScene} from './scenes/PolicyScene';
import {TitleScene} from './scenes/TitleScene';
import {
  ABOUT1_FROM, ABOUT1_LEN, ABOUT2_FROM, ABOUT2_LEN, ABOUT3_FROM, ABOUT3_LEN, CHART_FROM, CHART_LEN, CLIPS, clipStarts,
  CLOSING_FROM, CLOSING_LEN, LESSONS_FROM, LESSONS_LEN, MAP_FROM, MAP_SCENE_LEN, N, POLICY_FROM, POLICY_LEN, segStart, TITLE_LEN,
} from './timing';

const PAD = 8;
const voice = (id: string) => staticFile(`narration/${id}.wav`);

// 解説・教訓・政策のシーンは、ナレーションを数本に分けて頭を絵に合わせている
const ClipVoices: React.FC<{scene: keyof typeof CLIPS; from: number}> = ({scene, from}) => {
  const st = clipStarts(scene);
  return (
    <>
      {CLIPS[scene].map((id, i) => (
        <Audio key={id} name={`N ${id}`} src={voice(id)} from={from + st[i]} durationInFrames={N[id]} />
      ))}
    </>
  );
};

export const EvacuationVideo: React.FC = () => (
  <>
    <Track name="Scenes">
      <Sequence name="タイトル" from={0} durationInFrames={TITLE_LEN}><TitleScene /></Sequence>
      <Sequence name="解説：何を確かめるか" from={ABOUT1_FROM} durationInFrames={ABOUT1_LEN}><AboutWhat /></Sequence>
      <Sequence name="解説：三段階の輸送" from={ABOUT2_FROM} durationInFrames={ABOUT2_LEN}><AboutLayers /></Sequence>
      <Sequence name="解説：入力と結果" from={ABOUT3_FROM} durationInFrames={ABOUT3_LEN}><AboutInputs /></Sequence>
      <Sequence name="地図：全県の避難" from={MAP_FROM} durationInFrames={MAP_SCENE_LEN}><MapScene /></Sequence>
      <Sequence name="シナリオの比較" from={CHART_FROM} durationInFrames={CHART_LEN}><ChartScene /></Sequence>
      <Sequence name="教訓" from={LESSONS_FROM} durationInFrames={LESSONS_LEN}><LessonsScene /></Sequence>
      <Sequence name="求められる備え" from={POLICY_FROM} durationInFrames={POLICY_LEN}><PolicyScene /></Sequence>
      <Sequence name="結び" from={CLOSING_FROM} durationInFrames={CLOSING_LEN}><ClosingScene /></Sequence>
    </Track>
    <Track name="ナレーション">
      <Audio name="N タイトル" src={voice('title')} from={15} durationInFrames={N.title} />
      <ClipVoices scene="about1" from={ABOUT1_FROM} />
      <ClipVoices scene="about2" from={ABOUT2_FROM} />
      <ClipVoices scene="about3" from={ABOUT3_FROM} />
      <Audio name="N 人口" src={voice('introA')} from={MAP_FROM + segStart('introA') + PAD} durationInFrames={N.introA} />
      <Audio name="N 4つの空港" src={voice('introB')} from={MAP_FROM + segStart('introB') + PAD} durationInFrames={N.introB} />
      <Audio name="N 1〜7日目" src={voice('days1')} from={MAP_FROM + segStart('days1') + PAD} durationInFrames={N.days1} />
      <Audio name="N 8〜25日目" src={voice('days8')} from={MAP_FROM + segStart('days8') + PAD} durationInFrames={N.days8} />
      <Audio name="N 攻撃開始" src={voice('attack')} from={MAP_FROM + segStart('attack') + PAD} durationInFrames={N.attack} />
      <Audio name="N 26〜51日目" src={voice('days26')} from={MAP_FROM + segStart('days26', 'days') + PAD} durationInFrames={N.days26} />
      <Audio name="N シナリオ比較" src={voice('chart')} from={CHART_FROM + 15} durationInFrames={N.chart} />
      <ClipVoices scene="lessons" from={LESSONS_FROM} />
      <ClipVoices scene="policy" from={POLICY_FROM} />
      <Audio name="N 結び" src={voice('closing')} from={CLOSING_FROM + 10} durationInFrames={N.closing} />
    </Track>
  </>
);
