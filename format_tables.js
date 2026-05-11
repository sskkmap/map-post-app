const fs = require('fs');
const f = 'c:/Users/owner/yakuzaisinote/public/data-articles/insulin-calc.md';
let content = fs.readFileSync(f, 'utf8');

// 1. Table 1: 糖質が多い食品 / 糖質が少ない食品
content = content.replace(
/\| 糖質が多い食品 \| 糖質が少ない食品 \|\r?\n\| --- \| --- \|\r?\n\| ・穀物<br\/>・くだもの<br\/>・牛乳・チーズを除く乳製品<br\/>・みそ・みりん<br\/>・カレーのルウ<br\/>・ジュース<br\/>・菓子類 \| ・魚介類<br\/>・卵<br\/>・肉<br\/>・チーズ<br\/>・油脂類<br\/>・海藻<br\/>・きのこ<br\/>・こんにゃく \|/g,
`<div style="overflow-x: auto; margin: 1.5rem 0;">
<table style="width: 100%; min-width: 500px; border-collapse: collapse; font-size: 0.95rem;">
  <thead>
    <tr>
      <th style="border: 1px solid #cbd5e1; padding: 0.8rem; background-color: #f8fafc; text-align: left;">糖質が多い食品</th>
      <th style="border: 1px solid #cbd5e1; padding: 0.8rem; background-color: #f8fafc; text-align: left;">糖質が少ない食品</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 0.8rem; vertical-align: top;">・穀物<br/>・くだもの<br/>・牛乳・チーズを除く乳製品<br/>・みそ・みりん<br/>・カレーのルウ<br/>・ジュース<br/>・菓子類</td>
      <td style="border: 1px solid #cbd5e1; padding: 0.8rem; vertical-align: top;">・魚介類<br/>・卵<br/>・肉<br/>・チーズ<br/>・油脂類<br/>・海藻<br/>・きのこ<br/>・こんにゃく</td>
    </tr>
  </tbody>
</table>
</div>`
);

// 2. Table 2: 基礎カーボカウント / 応用カーボカウント
content = content.replace(
/\| 基礎カーボカウント \| 応用カーボカウント \|\r?\n\| --- \| --- \|\r?\n\| ・毎食の糖質を一定にする<br\/>・糖尿病の人全員が対象になる<br\/>・一日の摂取エネルギーのうち50～60%程度を糖質で摂取するよう調節する \| ・食事の糖質量を一定にする必要はない<br\/>・食前の血糖値と摂取する糖質により投与するインスリン量を決める<br\/>・1型糖尿病の方やインスリン依存状態の2型糖尿病が対象 \|/g,
`<div style="overflow-x: auto; margin: 1.5rem 0;">
<table style="width: 100%; min-width: 600px; border-collapse: collapse; font-size: 0.95rem;">
  <thead>
    <tr>
      <th style="border: 1px solid #cbd5e1; padding: 0.8rem; background-color: #f8fafc; text-align: left;">基礎カーボカウント</th>
      <th style="border: 1px solid #cbd5e1; padding: 0.8rem; background-color: #f8fafc; text-align: left;">応用カーボカウント</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 0.8rem; vertical-align: top;">・毎食の糖質を一定にする<br/>・糖尿病の人全員が対象になる<br/>・一日の摂取エネルギーのうち50～60%程度を糖質で摂取するよう調節する</td>
      <td style="border: 1px solid #cbd5e1; padding: 0.8rem; vertical-align: top;">・食事の糖質量を一定にする必要はない<br/>・食前の血糖値と摂取する糖質により投与するインスリン量を決める<br/>・1型糖尿病の方やインスリン依存状態の2型糖尿病が対象</td>
    </tr>
  </tbody>
</table>
</div>`
);

// 3. Table 3: 空打ちのタイミング
content = content.replace(
/\| インスリン製剤名 \| 空打ちのタイミング \| 空打ちに必要な量 \|\r?\n\| --- \| --- \| --- \|\r?\n\| ランタスXR \| 毎回 \| 3単位 \|\r?\n\| ゾルトファイ \| 毎回 \| 2ドーズ \|\r?\n\| ビクトーザ \| 毎回 \| 空打ちメモリあり（0\.12㎎） \|\r?\n\| バイエッタ \| 新しいペンの使い始めに1回 \| 1回分 \|\r?\n\| フォルテオ \| 新しいペンの使い始めに1回 \| 1回分 \|/g,
`<div style="overflow-x: auto; margin: 1.5rem 0;">
<table style="width: 100%; min-width: 500px; border-collapse: collapse; font-size: 0.95rem;">
  <thead>
    <tr>
      <th style="border: 1px solid #cbd5e1; padding: 0.8rem; background-color: #f8fafc; text-align: left;">インスリン製剤名</th>
      <th style="border: 1px solid #cbd5e1; padding: 0.8rem; background-color: #f8fafc; text-align: left;">空打ちのタイミング</th>
      <th style="border: 1px solid #cbd5e1; padding: 0.8rem; background-color: #f8fafc; text-align: left;">空打ちに必要な量</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="border: 1px solid #cbd5e1; padding: 0.8rem;">ランタスXR</td><td style="border: 1px solid #cbd5e1; padding: 0.8rem;">毎回</td><td style="border: 1px solid #cbd5e1; padding: 0.8rem;">3単位</td></tr>
    <tr><td style="border: 1px solid #cbd5e1; padding: 0.8rem;">ゾルトファイ</td><td style="border: 1px solid #cbd5e1; padding: 0.8rem;">毎回</td><td style="border: 1px solid #cbd5e1; padding: 0.8rem;">2ドーズ</td></tr>
    <tr><td style="border: 1px solid #cbd5e1; padding: 0.8rem;">ビクトーザ</td><td style="border: 1px solid #cbd5e1; padding: 0.8rem;">毎回</td><td style="border: 1px solid #cbd5e1; padding: 0.8rem;">空打ちメモリあり（0.12㎎）</td></tr>
    <tr><td style="border: 1px solid #cbd5e1; padding: 0.8rem;">バイエッタ</td><td style="border: 1px solid #cbd5e1; padding: 0.8rem;">新しいペンの使い始めに1回</td><td style="border: 1px solid #cbd5e1; padding: 0.8rem;">1回分</td></tr>
    <tr><td style="border: 1px solid #cbd5e1; padding: 0.8rem;">フォルテオ</td><td style="border: 1px solid #cbd5e1; padding: 0.8rem;">新しいペンの使い始めに1回</td><td style="border: 1px solid #cbd5e1; padding: 0.8rem;">1回分</td></tr>
  </tbody>
</table>
</div>`
);

fs.writeFileSync(f, content);
