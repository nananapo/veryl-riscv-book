= CPUの合成

これまでの章では、RV64IのCPUを作成してパイプライン化しました。
動作確認とテストはシミュレータで行いましたが、
本章では実機(FPGA)でCPUを動かします。

//image[pynq_z1][PYNQ-Z1][width=30%]
//image[tangmega138k][TangMega138K][width=30%]

== FPGAとは何か？

集積回路を製造するには手間と時間とお金が必要です。
FPGAを使うと、少しの手間と少しの時間、安価に集積回路の実現をお試しすることができます。

@<b>{FPGA}(Field Programmable Gate Array)は、
任意の論理回路を実現することができる集積回路のことです。
ハードウェア記述言語で設計した論理回路をFPGA上に設定することで、
実際に集積回路を製造しなくても実機で論理回路を再現できます。

「任意の論理回路を実現することができる集積回路」は、
主にプロダクトターム方式、またはルックアップ・テーブル方式で構成されています。
本書では@<b>{ルックアップ・テーブル}(Lookup Table, @<b>{LUT})方式のFPGAを利用します。

//table[lut_sample_truth][真理値表の例]{
X	Y	A
==============================
0	0	0
0	1	1
1	0	1
1	1	0
//}

//image[lut][@<table>{lut_sample_truth}を実現するLUT][width=40%]

LUTとは、真理値表を記憶素子に保存しておいて、
入力によって記憶された真理値を選択して出力する回路のことです。
例えば、2つの入力@<code>{X}と@<code>{Y}を受け取って@<code>{A}を出力する論理回路(@<table>{lut_sample_truth})は、
@<img>{lut}の回路で実現することができます。
ここでマルチプレクサ(multiplexer, MUX)とは、複数の入力を選択信号によって選択して出力する回路のことです。

@<img>{lut}では、記憶素子のデータを@<code>{Y}によって選択し、さらに@<code>{X}によって選択することで2入力1出力の真理値表の論理回路を実現しています。
入力がN個で出力がM個のLUTのことをN入力M出力LUTと呼びます。

ルックアップ・テーブル方式のFPGAは、多数のLUT、入出力装置、これらを相互接続するための配線によって構成されています。
また、乗算回路やメモリなどの部品はFPGAよりも専用の回路で実現した方が良い@<fn>{memory.fpga}ので、
メモリや乗算回路の部品が内蔵されていることがあります。

//footnote[memory.fpga][例えばメモリは同じパターンの論理回路の繰り返しで大きな面積を要します。メモリはよく利用される回路であるため、専用の回路を用意した方が空間的な効率が改善される上に、遅延が少なくなるという利点があります]

本書では2つのFPGA(TangMega138K、PYNQ-Z1)を使用して実機でCPUを動作させます。
2024年11月12日時点ではTangMega138KはAliExpressで30000円くらい、
PYNQ-Z1は秋月電子通商で50000円くらいで入手できます。

//info[もう少し安いFPGA]{
数万円もするFPGAはなかなか手が出せません。
本章の範囲では
TangNano9K(3000円くらい)、
TangPrimer20K(7000円くらい)、
TangPrimer25K(6000円くらい)などの少し小規模で安価なFPGAでも動作させることができます。
手始めにTangNano9Kを選ぶのも良いでしょう。
//}

== LEDの制御

大抵のFPGAボードにはLEDがついています。
本章では簡単なテストプログラムによってLEDを点滅させた後、
riscv-testsの結果をLEDによって確認します。

LEDはトップモジュールのポートを経由して制御します。
ポートとLEDの接続方法は合成系によって異なるため、
それらの接続は後で考えます。

CPUからLEDを制御するには、メモリ経由で制御する、CSRによって制御するなどの方法が考えられます。
本書ではLEDを制御する用のCSRを作成して、トップモジュールのポートに接続することでLEDを制御します。

//warning[執筆中!!!]{
未完成
//}


=== CSRにLED制御用レジスタを実装する

csrunitモジュールにLEDの制御用レジスタを実装します。
RISC-VのCSRには、カスタムなCSRを定義するためのアドレス空間が用意されています(表)

表

表中のTODOをLEDのためのレジスタに割り当てることにします。

まず、CsrAddr型にLED制御用レジスタのアドレスを追加します。

//list[][]{
TODO
//}

書き込みマスクはすべて書き込み可にします。

//list[][]{
TODO
//}

XLENビットのレジスタを定義します。

//list[][]{
TODO
//}

読み込みデータ、書き込みマスクを変数に割り当てます。

//list[][]{
TODO
//}

レジスタへの書き込み処理を実装します。

//list[][]{
TODO
//}

csrunitモジュールのLED制御用レジスタは、最終的にトップモジュールのポートと接続します。
そのために、
csrunitモジュールのポートに@<code>{led}レジスタの値を露出させ、
さらにcoreモジュールのポートに@<code>{led}レジスタの値を露出させます。

//list[][]{
TODO
//}

//list[][]{
TODO
//}

=== トップモジュールにポートを実装する

トップモジュールにLEDを制御するためのポートを追加します。
LEDの個数はFPGAによって異なるため、とりあえずXLEN(=64)ビットのポートを用意します。

//list[][]{
TODO
//}

ledポートとcsrunitモジュールのレジスタを接続します。

//list[][]{
TODO
//}

CSRの読み書きでLED制御用のポートを制御することができるようになりました。

== FPGAへの合成① (TangMega138K)


== FPGAへの合成② (PYNQ-Z1)

