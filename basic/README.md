# 基本編

「Verylで作るCPU 基本編」では、ハードウェア記述言語の基礎から、OSを実行できる程度のCPUの実装方法までを解説します。

PDF版 : [veryl-riscv-book.pdf](https://github.com/nananapo/veryl-riscv-book/blob/main/basic/veryl-riscv-book.pdf)  
Web版 : https://nananapo.github.io/veryl-riscv-book/


### 目次

```
第I部 RV32I/RV64Iの実装
1 環境構築
2 ハードウェア記述言語 Veryl
3 RV32Iの実装
4 Zicsr拡張の実装
5 riscv-testsによるテスト
6 RV64Iの実装
7 CPUのパイプライン化
8 CPUの合成

第II部 RV64IMACの実装
9  M拡張の実装
10 例外の実装
11 Memory-mapped I/Oの実装
12 A拡張の実装
13 C拡張の実装

第II部 特権/割り込みの実装
14 M-modeの実装 (1. CSRの実装)
15 M-modeの実装 (2. 割り込みの実装)
16 U-modeの実装
17 S-modeの実装 (1. CSRの実装)
18 S-modeの実装 (2. 仮想記憶システム)

-- ここから執筆中 --
19 PLICの実装
20 Linuxを動かす
```

## Contribution

提案やリクエストを受け付けています。
質問などがある場合も、お気軽にissueを作成してください。

執筆は [nananapo/bluecore](https://github.com/nananapo/bluecore) の実装と同時に行っています。

#### htmlをビルドする

```sh
$ cd basic
$ git clone https://github.com/nananapo/bluecore
$ make preproc
$ make md
$ cd vitepress
$ make import build
```