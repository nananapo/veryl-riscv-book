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

//caution[注意]{
本書は2024/10/19時点のVeryl(バージョン0.13.1)について、
本書で利用する範囲の文法, 機能を解説しています。
Verylはまだ開発途上(正式版, 安定版がリリースされていない)状態の言語です。
破壊的変更が入り、記載しているコードが使えなくなる可能性があります。

本書に記載しているコードの中には、
バージョン0.13.1では不具合によって実行できないものがあります。
不具合の回避手段についてはサポートページ@<fn>{support}をご覧ください。
また、最新のVerylに対応した解説はweb版, pdf版を確認してください。
//}

//footnote[support][@<w>{support-page}]

== Verylの基本文法, 機能

それでは、Verylの書き方を簡単に学んでいきましょう。
Verylのドキュメントは@<href>{https://doc.veryl-lang.org/book/ja/}に存在します。
また、@<href>{https://doc.veryl-lang.org/playground/, Veryl Playground}では、
VerylプログラムのSystemVerilogプログラムへのトランスパイルを試すことができます。

=== コメント, 空白

Verylでは次のようにコメントを記述することができます(@<list>{code.comment})。

//list[code.comment][コメント]{
  // 1行のコメント
  /* 範囲コメント */
//}

=== 値, 数値リテラル

論理回路では、デジタルな値を扱います。
デジタルな値は@<code>{0}と@<code>{1}の二値(2-state)で表現されますが、
一般的なハードウェア記述言語では、
@<code>{0}と@<code>{1}に@<code>{x}, @<code>{z}を加えた四値(4-state)が利用されます(@<table>{table.fourstate})。

//table[table.fourstate][4-stateの値]{
値	意味						真偽
-------------------------------------------------------------
0	0				偽
1	1				真
x	unknown			偽
z	high-inpedance	偽
//}

@<b>{不定値}(unknown value)とは、0か1のどちらか分からない値です。
不定値は、
未初期化のレジスタの値の表現に利用されたり、
不定値との演算の結果として生成されます。
@<b>{ハイインピーダンス}(high-inpedance)とは、
どのレジスタ, 信号とも接続されていないことを表す値です。
物理的なハードウェア上では、全ての値は0か1の二値として解釈されます。
不定値とハイインピーダンスはシミュレーションのときにのみ利用されます。

1ビットの四値を表現するための型は@<b>{logic}です。
Nビットのlogic型は@<b>{logic<N>}のように記述することができます。
1ビットの二値を表現する型は@<b>{bit}です。
基本的に、レジスタや信号の定義にbit型は利用せず、logic型を利用します。

logic, bit型は、デフォルトで符号が無い型として扱われます。
符号付き型として扱いたいときは、
型名の前に@<b>{signed}キーワードを追加します
(@<list>{code.signed_keyword})。

//list[code.signed_keyword][符号付き型]{
signed logic<4> // 4ビットの符号付きlogic型
signed bit<2> // 2ビットの符号付きbit型
//}

32, 64ビットのbit型を表す型が定義されています(@<table>{ui3264})。

//table[ui3264][整数型]{
型名	等価な型
-------------------------------------------------------------
u32		bit<32>
u64		bit<64>
i32		signed bit<32>
i64		signed bit<64>
//}


数値は@<list>{code.num_literal}のように記述することができます。

//list[code.num_literal][数値リテラル]{
4'b0101 // 4ビットの数値 (2進数表記)
4'bxxzz // 4ビットの数値 (2進数表記)

12'o34xz // 12ビットの数値 (8進数表記)
32'h89abcdef // 32ビットの数値 (16進数表記)

123 // 10進数の数値
32'd12345 // 32ビットの数値 (10進数表記)

// 数値リテラルの好きな場所に_を挿入できる
1_2_34_567

// x, zは大文字でも良い
4'bxXzZ

// 全ビット0, 1, x, zにする
'0
'1
'x
'z

// 指定したビット幅だけ0, 1, x, zにする
8'0 // 8ビット0
8'1 // 8ビット1
8'x // 8ビットx
8'z // 8ビットz

// 幅を指定しない場合、幅が自動で推定される
'hffff // 16ビット
'h1fff // 13ビット
//}

=== module

HDLによる論理回路は@<b>{モジュール}(Module)というコンポーネントで構成されます。
例えば、半加算器のモジュールは次のように定義できます(@<list>{halfadder.veryl}).

//list[halfadder.veryl][半加算器(HalfAdder)モジュール]{
module HalfAdder (
    x: input  logic, // 1ビットのlogic型の入力
    y: input  logic, // 1ビットのlogic型の入力
    s: output logic, // 1ビットのlogic型の出力
    c: output logic, // 1ビットのlogic型の出力
) {
    always_comb {
        s = x ^ y; // sにx XOR yを割り当てる
        c = x & y; // cにx AND yを割り当てる
    }
}
//}

HaldAdderモジュールには、
入力変数として@<code>{x}, @<code>{y}、
出力変数として@<code>{s}. @<code>{c}が宣言されています。
入出力の変数のことを@<b>{接続ポート}、または単に@<b>{ポート}と呼びます。

入力ポートを定義するとき、モジュール名の後の括弧の中に、
@<code>{変数名 : input 型名}と記述します。
出力ポートを宣言するときは@<code>{input}の代わりに@<code>{output}と記述します。
複数のポートを宣言するとき、宣言の末尾にカンマ(@<code>{,})を記述します。

==== 変数の宣言, 代入

HalfAdderモジュールでは、
@<b>{always_comb}ブロックで出力変数
@<code>{s}, @<code>{c}に値を割り当てています。
変数への値の割り当ては@<code>{変数名 = 式}で行います。

always_combブロック内で値を割り当てると、
割り当てる式は組み合わせ回路になります。

always_combの中での割り当ては、
@<b>{assign}文でも記述することができます(@<list>{assign})。

//list[assign][assign文による代入]{
	// 下のalways_combと同じ意味になる
	assign s = a ^ c;
	assign c = a & c;

	// always_combによる代入
	always_comb {
		s = a ^ c;
		c = a & c;
	}
//}

モジュールの中では、
@<b>{var}文によって新しく変数を宣言することができます(@<list>{var.stmt})。

//list[var.stmt][変数の宣言]{
	// var 変数名 : 型名;
	var value : logic<32>;
//}

@<code>{var}文によって宣言した変数は、
@<code>{assign}文, または@<code>{always_comb}内での割り当てによって、
値を割り当てることができます。

変数の定義と値の

 * let, var
 * always_comb 連続代入, assign
 * always_ff, if_reset ノンブロッキング

==== モジュールのパラメータ

==== モジュールのインスタンス化

==== initial, final

=== 型

==== 配列

@<code>{[]}を利用することで、配列を定義することができます。


struct,enum,
clock,reset,
配列,多次元
type

=== 定数

const

=== 式

 * ビット選択
 * 式 (演算子)
 * if式, case式
 * 連接, repeat
 * msb. lsb

=== 文

 * 変数 (var, let)
 * if, case, for
 * function

=== interface

 * パラメータ化
 * modport
 * インスタンス化

=== package

 * import

=== ジェネリクス

 * function
 * module
 * interface
 * package

=== その他の機能

 * $sv
 * SystemVerilogの機能 (システムタスク)

 $display, readmemh, clog2, size, bits, signed, error, finish

 * 標準ライブラリ