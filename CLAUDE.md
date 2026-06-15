# CLAUDE.md

## 作業対象

このプロジェクトの作業対象は以下のみ。

C:\Users\HP\neon-race-game

以下のフォルダーは確認・編集しないこと。

C:\Users\HP\my-first-project

## 出力ルール

- コード全文を長く表示しない
- 長い差分を表示しない
- API Errorを避けるため、説明は短くする
- 編集はファイルに直接反映する
- 完了後は、変更したファイル名と変更概要だけを短く説明する

## プロジェクト概要

Three.js + Vite の3Dレースゲーム。

主なファイル:

- index.html
- src/main.js
- src/style.css
- package.json

## 起動方法

```powershell
cd C:\Users\HP\neon-race-game
npm run dev
```

表示されたURLをブラウザで開く。

## ゲーム操作

* SPACE: スタート
* A / ←: 左へ移動
* D / →: 右へ移動
* W / ↑: 加速
* S / ↓: 減速
* P: ポーズ
* R: リスタート

## 開発方針

* 既存のゲーム機能を壊さない
* 操作、スコア、ブースト、コイン、障害物、ハイスコアを維持する
* Consoleに赤いエラーを出さない
* 修正後は `npm run build` または `npm run dev` で確認する

## 車の見た目に関する方針

現在の課題:

* 車が自動車に見えない
* 箱型、戦車、ホバークラフトのように見える
* スポーツカー風にしたい

方針:

* BoxGeometryを重ねた車体にこだわらない
* まず「誰が見ても車に見えること」を優先する
* 必要ならCanvasTextureやSVG風の2DイラストをPlaneGeometryに貼る方式を使う
* 2ドアスポーツカー風にする
* 右ハンドルの運転手を車内に入れる
* 参考画像のように、丸い車体、窓、タイヤ、ヘッドライト、ナンバープレートをはっきり見せる

## コスト管理方針

- 料金が高くなりすぎない方法を優先する
- 不要な外部サービス、有料API、有料素材、有料ライブラリは使わない
- まず無料で実装できる方法を検討する
- 追加コストが発生する可能性がある場合は、実装前に必ず確認する
- 大量のAPI呼び出しや、継続的に課金される仕組みは避ける
- 開発中はローカル環境で動作確認できる構成を優先する
- 外部3Dモデルや素材を使う場合は、無料利用可能か、商用利用可否、ライセンスを確認する

### セキュリティ

- APIキー、アクセストークン、パスワード、シークレットキーをコードに直接書かない
- APIキーなどの機密情報を `src/main.js`、`index.html`、`style.css` に直接入力しない
- 機密情報は `.env` などの環境変数で管理する
- `.env` は Git にコミットしない
- `.gitignore` に `.env` が含まれているか確認する
- APIキーをブラウザ側コードに露出させない
- 外部APIを使う場合は、必要最小限の権限にする
- 不明なnpmパッケージを安易に追加しない
- パッケージ追加前に、必要性・信頼性・メンテナンス状況を確認する
- `npm audit` で脆弱性が出た場合は内容を確認する
- ユーザーの個人情報や認証情報を localStorage に保存しない

## プレイヤー車両の方針

現在の基本ジオメトリや2Dプレート方式の車両は見た目が崩れやすいため、プレイヤー車両はGLB/GLTFモデル読み込み方式を優先する。

### 要件

- Three.js の `GLTFLoader` を使う
- `public/models/car.glb` を読み込む
- `car.glb` が存在する場合は、それをプレイヤー車両として使う
- `car.glb` が読み込めない場合は、簡易3D車両をフォールバック表示する
- 2D CanvasTexture / PlaneGeometry 車両方式は使わない
- フォールバック車両は、最低限「車」と分かる簡単な3D形状にする
- プレイヤーの移動、加速、減速、ブースト、当たり判定、コイン、障害物、スコア、ハイスコア、GAME OVERは維持する
- モデルの位置、回転、スケールを調整し、道路上で自然に見えるようにする
- モデルの向きが逆の場合は `rotation.y` で調整できるようにする
- モデルが大きすぎる/小さすぎる場合は `scale` で調整できるようにする
- 修正後は `npm run build` でエラー確認する

### 実装方針

- `src/main.js` で `GLTFLoader` を使う
- 読み込みパスは `/models/car.glb`
- `buildCar` またはプレイヤー車両生成処理は `Group` を返す
- `Group` の中にフォールバック車両を入れておく
- `GLTFLoader` で `/models/car.glb` を読み込む
- 読み込み成功時はフォールバック車両を非表示または削除し、GLBモデルを追加する
- 読み込み失敗時はフォールバック車両をそのまま使う

## 車両モデル方針

基本図形だけで理想のスポーツカー形状に近づけるのは難しいため、今後は無料のGLB/GLTF車両モデルを使う方針を優先する。

- プレイヤー車両の本命は `public/models/car.glb` とする
- `car.glb` が存在する場合はGLBモデルを優先表示する
- `car.glb` が存在しない場合のみ、簡易フォールバック車両を表示する
- フォールバック車両の作り込みに時間をかけすぎない
- 無料モデルを使う場合は、ライセンスと商用利用可否を確認する
- 出典不明・再配布不可・商用利用不可のモデルは使わない
- モデル導入後は `scale`、`position`、`rotation` を調整して道路上で自然に見えるようにする

### 出力ルール

- コード全文を表示しない
- 長い差分を表示しない
- buildCar関数全文など、長い関数全文を表示しない
- 編集は直接ファイルに反映する
- 完了後は、変更したファイル名と変更概要だけを短く説明する
- API Errorを避けるため、説明は簡潔にする
- 必要以上に提案を広げない

### エラー時の出力

- エラーが出た場合は、エラーの原因と修正内容を短く説明する
- エラー全文を長く貼り付けない
- 必要な部分だけ抜粋する

## 車両モデル運用

- フォールバック車両は最低限の仮表示とする
- 見た目の本命は `public/models/car.glb`
- `car.glb` がある場合はGLBモデルを優先表示する
- フォールバック車両の作り込みに時間をかけすぎない
- GLBモデルの `scale`、`position`、`rotation` は調整しやすい定数で管理する

<pre class="overflow-visible! px-0!" data-start="1291" data-end="1364"><div class="relative w-full mt-4 mb-1"><div class=""><div class="contents"><div class="relative"><div class="h-full min-h-0 min-w-0"><div class="h-full min-h-0 min-w-0"><div class="border border-token-border-light border-radius-3xl corner-superellipse/1.1 rounded-3xl"><div class="h-full w-full border-radius-3xl bg-token-bg-elevated-secondary corner-superellipse/1.1 overflow-clip rounded-3xl lxnfua_clipPathFallback"><div class="pointer-events-none absolute end-1.5 top-1 z-2 md:end-2 md:top-1"></div><div class="relative"><div class="pe-11 pt-3"><div class="relative z-0 flex max-w-full"><div id="code-block-viewer" dir="ltr" class="q9tKkq_viewer cm-editor z-10 light:cm-light dark:cm-light flex h-full w-full flex-col items-stretch ͼs ͼ16"><div class="cm-scroller"><pre class="cm-content q9tKkq_readonly m-0"></pre></div></div></div></div></div></div></div></div></div></div></div></div></div></pre>
