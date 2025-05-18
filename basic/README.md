# 基本編

「Verylで作るCPU 基本編」では、ハードウェア記述言語の基礎から、OSを実行できる程度のCPUの実装方法までを解説します。

PDF版 : [veryl-riscv-book.pdf](https://github.com/nananapo/veryl-riscv-book/blob/main/basic/veryl-riscv-book.pdf)  
Web版 : https://nananapo.github.io/veryl-riscv-book/


### 目次

```
# 執筆済み

まえがき
1 環境構築
2 ハードウェア記述言語 Veryl
    2.1 ハードウェア記述言語
    2.2 Verylの基本文法、機能
3 RV32Iの実装
    3.1 CPUは何をやっているのか?
    3.2 プロジェクトの作成
    3.3 定数の定義
    3.4 メモリ
    3.5 最上位モジュールの作成
    3.6 命令フェッチ
    3.7 命令のデコードと即値の生成
    3.8 レジスタの定義と読み込み
    3.9 ALUによる計算の実装
    3.10 レジスタに結果を書き込む
    3.11 ロード命令とストア命令の実装
    3.12 ジャンプ命令、分岐命令の実装
4 Zicsr拡張の実装
    4.1 CSRとは何か?
    4.2 CSR命令のデコード
    4.3 csrunitモジュールの実装
    4.4 ECALL命令の実装
    4.5 MRET命令の実装
5 riscv-testsによるテスト
    5.1 riscv-testsとは何か?
    5.2 riscv-testsのビルド
    5.3 テスト内容の確認
    5.4 テストの終了検知
    5.5 テストの実行
    5.6 複数のテストの自動実行
6 RV64Iの実装
    6.1 XLENの変更
    6.2 ADD[I]W、SUBW命令の実装
    6.3 SLL[I]W、SRL[I]W、SRA[I]W命令の実装
    6.4 LWU命令の実装
    6.5 LD、SD命令の実装
7 CPUのパイプライン化
    7.1 CPUの速度
    7.2 パイプライン処理の実装
    7.3 データ依存の対処
8 CPUの合成
    8.1 FPGAとは何か？
    8.2 LEDの制御
    8.3 FPGAへの合成① (Tang Nano 9K)
    8.4 FPGAへの合成② (PYNQ-Z1)

<-- ここから執筆中 -->

第2部 「RV64IMACの実装」
 * M拡張の実装
    * xxx命令を実装する
 * 例外の実装
    * Instruction address misaligned (ジャンプ/分岐)
    * Illegal instruction (reserved, 未実装の命令)
    * Load address misaligned
    * Store/AMO address misaligned
 * Memory-mapped I/Oの実装
    * MMIOとは何か?
    * メモリマップを決める
    * UART TXを実装する
    * 実機でテキストを送信
    * Illegal Instruction Exceptionの実装 (範囲外)
 * CPUの可視化
    * Kanata Log Formatを出力する
    * Konataを見てみる
 * ベンチマーク(Coremark)
    * 性能を評価する
    * フォワーディングする
    * 効果を確認する
 * A拡張の実装
    * xxx命令を実装する
 * C拡張の実装
    * 同じ意味の32ビット命令に変換するモジュールを作る

第3部「CSRの実装 / OSの実行」
 * 割り込みの実装①
    * CSR
    * ソフトウェア割り込み
 * 割り込みの実装② CLINT
    * タイマ割り込み
    * Lチカ
 * CSRの実装① (ここらへんでRggenを入れる？)
    * M-modeの実装
    * S-modeの実装
 * CSRの実装② ページングの実装
    * ページングとは何か？
    * Sv32,39,48,57
 * 割り込みの実装③ PLIC
    * PLIC
    * 外部装置との接続
        * UART RX
        * VirtIO (他はどうしようか)
 * OSを動かす② : Linuxの実行
     * 設定
     * 実行
```

## Contribution

常に提案やリクエストを受け付けています。
質問などがある場合も、お気軽にissueを作成してください。

執筆は [nananapo/bluecore](https://github.com/nananapo/bluecore) の実装と同時に行っています。

#### pdfをビルドする

```sh
$ make pdf # pdfを生成
$ make html # web版を生成
```
