= ハードウェア記述言語 Veryl

=={hdl} ハードウェア記述言語

CPUを記述するといっても、
いったいどうやって記述するのでしょうか?
まずは、論理回路を構成する方法から考えます。

=== 論理回路の構成

@<b>{論理回路}とは、
デジタル(例えば0と1だけ)なデータを利用して、データを加工、保持する回路のことです。
論理回路は、組み合わせ回路と順序回路に分類することができます。

@<b>{組み合わせ回路}とは、
入力に対して、一意に出力の決まる回路@<bib>{ronrikairo}のことです。
例えば、@<img>{halfadder}は半加算器です。
半加算器とは1ビットの加算を行う回路で、
入力X, Yが決まると、出力C, Sが一意に決まります(@<table>{halfadder.truth})。

//image[halfadder][半加算器 (MIL記法)][width=45%]

//table[halfadder.truth][半加算器 (真理値表)]{
X	Y	C	S
-------------------------------------------------------------
0	0	0	0
0	1	0	1
1	0	0	1
1	1	1	0
//}

@<b>{順序回路}とは、
入力と回路自身の状態によって一意に出力の決まる回路@<bib>{ronrikairo}です。
例えば、入力が1になるたびにカウントアップして値を表示するカウンタを考えます(@<img>{downcounter})。
カウントアップするためには、
今のカウンタの値(状態)を保持する必要があります。
よって、このカウンタは入力と状態によって一意に出力の決まる順序回路です。

1ビットの値はフリップフロップという回路によって保持することができます。
フロップフロップをN個並列に並べると、
Nビットの値を保持することができます。
フリップフロップを並列に並べた記憶装置のことを、@<b>{レジスタ}(register, 置数器)と呼びます。
基本的に、レジスタの値はリセット信号によって初期化し、
クロック信号に同期したタイミングで変更します。

//image[downcounter][カウンタ][width=70%]

論理回路を設計するには、真理値表を作成し、
それを実現する論理演算を構成します。
入力数や状態数が数十個ならどうにか人力で設計できるかもしれませんが、
数千, 数万の入力や状態があるとき、
手作業で設計するのはほとんど不可能です。
これを設計するために、ハードウェア記述言語を利用します。

=== ハードウェア記述言語

@<b>{ハードウェア記述言語}(Hardware Description Language, HDL)とは、
デジタル回路を設計するための言語です。

例えばHDLであるSystemVerilogを利用すると、
半加算器は@<list>{halfadder.sv}のように記述することができます。

//list[halfadder.sv][SystemVerilogによる半加算器の記述]{
module HalfAdder(
  input logic x,	// 入力値X
  input logic y,	// 入力値Y
  output logic c,	// 出力地C
  output logic s	// 出力地S
);
  assign s = x ^ y; // ^はXOR演算
  assign c = x & y; // &はAND演算
endmodule
//}

また、レジスタを利用した回路を@<list>{counter.sv}のように記述することができます。
レジスタの値を、
リセット信号@<code>{rst}が@<code>{0}になったタイミングで@<code>{0}に初期化し、
クロック信号@<code>{clk}が@<code>{1}になったタイミングでカウントアップします。

//list[counter.sv][SystemVerilogによるカウンタの記述]{
module Counter(
  input logic clk, // クロック信号
  input logic rst  // リセット信号
);
  // 32ビットのレジスタの定義
  logic [31:0] count;

  always_ff @(posedge clk, negedge rst) begin
    if (!rst) begin
      // rstが0になったとき、countを0に初期化する
      count <= 0;
    end else begin
      // clkが1になったとき、countの値をcount + 1にする
      count <= count + 1;
    end
  end
endmodule
//}

HDLを使用すると、論理回路を、
レジスタの値と入力値を使った組み合わせ回路と、
その結果をレジスタに値を格納する操作として記述できます。
このような、レジスタからレジスタに、
組み合わせ回路を通したデータを転送する抽象度のことを
@<b>{レジスタ転送レベル}(Register Transfer Level, RTL)と呼びます。

HDLで記述された論理回路は、
@<b>{合成系}によって、
RTLから実際の回路のデータに変換(@<b>{合成})されます。

=== Veryl

メジャーなHDLといえば、Verilog HDL, SystemVerilogなどが挙げられます@<fn>{vhdl}。

//footnote[vhdl][VHDLが無いじゃないかと思った方、すみません。VHDLのことを私はよく知らないので無いことにしました。]

Verilog HDL(Verilog)は1980年代に開発された言語であり、
最近のプログラミング言語と比べると機能が少なく、冗長な記述が必要です。
SystemVerilogはVerilogのスーパーセットです。
言語機能が増えて便利になっていますが、
スーパーセットであることから、
あまり推奨されない古い書き方が可能だったり、
(バグの原因となるような)良くない仕様@<fn>{nettype}を受け継いでいます。

//footnote[nettype][例えば、未定義の変数が1ビット幅の信号線として解釈される仕様があります。ヤバすぎる]

本書では、CPUの実装にVerylというHDLを使用します。
Verylは2022年12月に公開された言語です。
Verylの抽象度は、Verilogと同じくレジスタ転送レベルです。
Verylの文法や機能は、Verilog, SystemVerilogに似通ったものになっています。
しかし、
if式やcase式, 
クロックとリセットの抽象化, 
ジェネリクスなど、
痒い所に手が届く機能が提供されており、
高い生産性を発揮します。

Verylプログラムは、
コンパイラ(トランスパイラ)によって、
自然で読みやすいSystemVerilogプログラムに変換されます。
よって、Verylは旧来のSystemVerilogの環境と共存することができ、
SystemVerilogの資産を利用することができます。

== 基本

それでは、Verylの書き方を簡単に学んでいきましょう。
Verylのドキュメントは@<href>{https://doc.veryl-lang.org/book/ja/}に存在します。

TODO

 * リテラル
 * 型 (logic,リテラル,struct,enum,clock,reset)
 * type
 * const
 * 連接, repeat

 * 変数 (var, let)

 * 式 (演算子)
 * if式, case式

 * 文 (if, case, for)

 * function
 * SystemVerilogの機能(システムタスク)

== module

 * module宣言
 * ポート
 * パラメータ
 * インスタンス化
 * always_comb, assign
 * always_ff, if_reset
 * initial, final

== interface

 * パラメータ化
 * modport
 * インスタンス化

== package

 * import

== ジェネリクス

 * function
 * module
 * interface
 * package

== サンプルプログラム

 * 半加算器
 * 全加算器
 * カウンタ